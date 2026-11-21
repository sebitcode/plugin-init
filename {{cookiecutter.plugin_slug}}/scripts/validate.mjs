#!/usr/bin/env node
// Validate this plugin for Claude Code, Codex and OpenCode.
// Usage: node scripts/validate.mjs
// Exit code 1 when there are errors. Warnings do not fail the run.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];
const info = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);
const rel = (p) => relative(ROOT, p).replaceAll("\\", "/");
const has = (p) => existsSync(join(ROOT, p));

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Hook events, from each platform's docs. Keep in sync with AGENTS.md.
const CODEX_EVENTS = new Set([
  "SessionStart", "SessionEnd", "SubagentStart", "SubagentStop", "PreToolUse",
  "PermissionRequest", "PostToolUse", "PreModelRequest", "PostModelRequest",
  "PreCompact", "PostCompact", "UserPromptSubmit", "Stop", "Interrupt",
]);
const CLAUDE_EVENTS = new Set([
  "SessionStart", "SessionEnd", "SubagentStart", "SubagentStop", "PreToolUse",
  "PermissionRequest", "PostToolUse", "PostToolUseFailure", "PreCompact",
  "PostCompact", "UserPromptSubmit", "Stop", "Notification",
]);

const targets = {
  claude: has(".claude-plugin/plugin.json"),
  codex: has(".codex-plugin/plugin.json"),
  opencode: has("scripts/install-opencode.mjs"),
};

// ---------- helpers ----------

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    err(`${rel(path)}: invalid JSON (${e.message})`);
    return null;
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".tmp-opencode") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function frontmatter(path) {
  const text = readFileSync(path, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return data;
}

function onPath(cmd) {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [cmd], { stdio: "ignore", shell: false }).status === 0;
}

// Resolve ${CLAUDE_PLUGIN_ROOT}/x and ${PLUGIN_ROOT}/x references to files.
function pluginPaths(str) {
  const re = /\$\{(?:CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT)\}\/([^\s"']+)/g;
  return [...str.matchAll(re)].map((m) => m[1]);
}

// ---------- JSON files ----------

const jsonFiles = walk(ROOT).filter((f) => f.endsWith(".json"));
const parsed = new Map(jsonFiles.map((f) => [rel(f), readJson(f)]));
const json = (p) => parsed.get(p) ?? null;

// ---------- manifests ----------

const claudeManifest = json(".claude-plugin/plugin.json");
const codexManifest = json(".codex-plugin/plugin.json");
const manifests = [
  [".claude-plugin/plugin.json", claudeManifest],
  [".codex-plugin/plugin.json", codexManifest],
].filter(([, m]) => m);

if (!targets.claude && !targets.codex && !targets.opencode) {
  err("no target found: expected .claude-plugin/, .codex-plugin/ or scripts/install-opencode.mjs");
}

const slug = manifests[0]?.[1]?.name;
const version = manifests[0]?.[1]?.version;

for (const [path, m] of manifests) {
  if (!m.name) err(`${path}: missing "name"`);
  else if (!KEBAB.test(m.name) || m.name.length > 64) err(`${path}: name "${m.name}" must be kebab-case, max 64 chars`);
  if (slug && m.name !== slug) err(`${path}: name "${m.name}" differs from "${slug}"`);
  if (version && m.version !== version) err(`${path}: version "${m.version}" differs from "${version}"`);
}

if (codexManifest) {
  const p = ".codex-plugin/plugin.json";
  for (const key of ["version", "description"]) if (!codexManifest[key]) err(`${p}: missing "${key}"`);
  if (!codexManifest.author?.name) err(`${p}: missing "author.name"`);
  const iface = codexManifest.interface;
  if (!iface) err(`${p}: missing "interface"`);
  else {
    for (const key of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
      if (!iface[key]) err(`${p}: missing "interface.${key}"`);
    }
  }
  if (has("skills") && !codexManifest.skills) err(`${p}: skills/ exists but "skills" is not set (use "./skills/")`);
  if (!has("skills") && codexManifest.skills) err(`${p}: "skills" is set but skills/ does not exist`);
  if (has(".mcp.json") && !codexManifest.mcpServers) err(`${p}: .mcp.json exists but "mcpServers" is not set (use "./.mcp.json")`);
  if (!has(".mcp.json") && codexManifest.mcpServers) err(`${p}: "mcpServers" is set but .mcp.json does not exist`);
}

// Marketplaces
const claudeMarket = json(".claude-plugin/marketplace.json");
if (claudeMarket) {
  const entry = claudeMarket.plugins?.find((p) => p.name === slug);
  if (!entry) err(`.claude-plugin/marketplace.json: no plugin entry named "${slug}"`);
  else if (entry.version && entry.version !== version) err(`.claude-plugin/marketplace.json: version "${entry.version}" differs from "${version}"`);
}
const codexMarket = json(".agents/plugins/marketplace.json");
if (codexMarket) {
  const entry = codexMarket.plugins?.find((p) => p.name === slug);
  if (!entry) err(`.agents/plugins/marketplace.json: no plugin entry named "${slug}"`);
  else {
    if (!entry.policy?.installation) err(`.agents/plugins/marketplace.json: missing "policy.installation"`);
    if (!entry.category) err(`.agents/plugins/marketplace.json: missing "category"`);
  }
}

// ---------- skills ----------

if (has("skills")) {
  for (const name of readdirSync(join(ROOT, "skills"))) {
    const dir = join(ROOT, "skills", name);
    if (!statSync(dir).isDirectory()) continue;
    const file = join(dir, "SKILL.md");
    if (!existsSync(file)) {
      err(`skills/${name}: missing SKILL.md`);
      continue;
    }
    if (!KEBAB.test(name) || name.length > 64) err(`skills/${name}: folder name must be kebab-case, max 64 chars`);
    const fm = frontmatter(file);
    if (!fm) {
      err(`skills/${name}/SKILL.md: missing frontmatter`);
      continue;
    }
    if (fm.name !== name) err(`skills/${name}/SKILL.md: name "${fm.name ?? ""}" must equal folder name "${name}"`);
    if (!fm.description) err(`skills/${name}/SKILL.md: missing description`);
    else if (fm.description.length > 1024) err(`skills/${name}/SKILL.md: description longer than 1024 chars`);
    const extra = Object.keys(fm).filter((k) => !["name", "description"].includes(k));
    if (extra.length) warn(`skills/${name}/SKILL.md: non-portable keys: ${extra.join(", ")}`);
  }
}

// ---------- agents and commands ----------

if (has("agents")) {
  if (targets.codex && !targets.claude && !targets.opencode) warn("agents/: Codex does not load agents; move the behaviour to a skill");
  for (const file of readdirSync(join(ROOT, "agents")).filter((f) => f.endsWith(".md"))) {
    const id = file.slice(0, -3);
    const fm = frontmatter(join(ROOT, "agents", file));
    if (!fm) {
      err(`agents/${file}: missing frontmatter`);
      continue;
    }
    if (!KEBAB.test(id)) err(`agents/${file}: file name must be kebab-case`);
    if (fm.name !== id) err(`agents/${file}: name "${fm.name ?? ""}" must equal file name "${id}"`);
    if (!fm.description) err(`agents/${file}: missing description`);
    if (targets.opencode) {
      for (const key of ["model", "color"]) if (key in fm) warn(`agents/${file}: "${key}" is dropped for OpenCode`);
    }
  }
}

if (has("commands")) {
  if (targets.codex && !targets.claude && !targets.opencode) warn("commands/: Codex does not load commands; move the behaviour to a skill");
  for (const file of readdirSync(join(ROOT, "commands")).filter((f) => f.endsWith(".md"))) {
    const id = file.slice(0, -3);
    const fm = frontmatter(join(ROOT, "commands", file));
    if (!KEBAB.test(id)) err(`commands/${file}: file name must be kebab-case`);
    if (!fm?.description) err(`commands/${file}: missing description`);
    const body = readFileSync(join(ROOT, "commands", file), "utf8");
    if (/!`/.test(body)) warn(`commands/${file}: shell injection (!\`...\`) is not portable`);
  }
}

// ---------- hooks ----------

let needsNode = false;
const hooks = json("hooks/hooks.json");
if (hooks) {
  if (targets.opencode && !targets.claude && !targets.codex) warn("hooks/hooks.json: OpenCode does not load hooks.json");
  for (const [event, groups] of Object.entries(hooks.hooks ?? {})) {
    if (targets.claude && !CLAUDE_EVENTS.has(event)) warn(`hooks.json: "${event}" is not a known Claude Code event; check the docs`);
    if (targets.codex && !CODEX_EVENTS.has(event)) warn(`hooks.json: "${event}" is not a Codex event; it will not run in Codex`);
    for (const group of groups ?? []) {
      for (const hook of group.hooks ?? []) {
        if (hook.type !== "command" || !hook.command) continue;
        const cmd = hook.command;
        if (/^\s*node\b/.test(cmd)) needsNode = true;
        if (/^\s*(bash|sh)\b/.test(cmd) || /\.sh\b/.test(cmd)) warn(`hooks.json (${event}): shell scripts do not run on Windows; use a node script`);
        if (/\$\{CLAUDE_PLUGIN_ROOT\}[^"]*$/.test(cmd) && !/"\$\{CLAUDE_PLUGIN_ROOT\}/.test(cmd)) {
          warn(`hooks.json (${event}): quote "\${CLAUDE_PLUGIN_ROOT}/..." because paths can contain spaces`);
        }
        for (const p of pluginPaths(cmd)) if (!has(p)) err(`hooks.json (${event}): ${p} does not exist`);
      }
    }
  }
}

// ---------- MCP ----------

const mcp = json(".mcp.json");
if (mcp) {
  for (const [name, server] of Object.entries(mcp.mcpServers ?? {})) {
    if (server.command && server.type) warn(`.mcp.json (${name}): remove "type" from stdio servers; Codex's format omits it`);
    if (server.command === "node") needsNode = true;
    for (const arg of [server.command ?? "", ...(server.args ?? [])]) {
      for (const p of pluginPaths(String(arg))) if (!has(p)) warn(`.mcp.json (${name}): ${p} does not exist yet`);
    }
    const env = JSON.stringify(server.env ?? {});
    if (/(sk-|ghp_|xox[bp]-|AKIA)[A-Za-z0-9]/.test(env)) err(`.mcp.json (${name}): env looks like it contains a secret`);
  }
  if (targets.opencode) info.push("OpenCode does not load .mcp.json; document the opencode.json setup in the README");
}

// ---------- environment ----------

const major = Number(process.versions.node.split(".")[0]);
if (major < 18) err(`Node.js ${process.versions.node} is too old; use 18 or newer`);
if (needsNode) info.push("hooks or MCP run `node`: users need Node.js 18+ on PATH");

const clis = [
  ["claude", targets.claude, "Claude Code"],
  ["codex", targets.codex, "Codex"],
  ["opencode", targets.opencode, "OpenCode"],
];
for (const [cmd, wanted, label] of clis) {
  if (wanted && !onPath(cmd)) info.push(`${label} CLI (\`${cmd}\`) not found on PATH; install it to test this target`);
}

// ---------- report ----------

const enabled = Object.entries(targets).filter(([, v]) => v).map(([k]) => k).join(", ") || "none";
console.log(`Targets: ${enabled}`);
for (const m of info) console.log(`info:  ${m}`);
for (const m of warnings) console.log(`warn:  ${m}`);
for (const m of errors) console.log(`error: ${m}`);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
