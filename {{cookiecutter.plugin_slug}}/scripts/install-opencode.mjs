#!/usr/bin/env node
// Install this plugin's skills, agents and commands into OpenCode.
//
// The plugin's files are written in Claude Code format. This script copies
// them into OpenCode's discovery folders, namespaced under the plugin slug,
// and converts agent/command frontmatter to OpenCode's fields.
//
// Usage:
//   pnpm opencode:install --global      # into ~/.config/opencode
//   pnpm opencode:install --dest DIR    # into DIR (for example <project>/.opencode)
//   pnpm opencode:uninstall --global    # remove what was installed (also accepts --dest)
// With no option, it installs into ./.opencode of the current directory.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SLUG = "{{ cookiecutter.plugin_slug }}";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
let dest = resolve(".opencode");
if (args.includes("--global")) dest = join(homedir(), ".config", "opencode");
const destIndex = args.indexOf("--dest");
if (destIndex !== -1) {
  if (!args[destIndex + 1]) {
    console.error("--dest needs a directory");
    process.exit(1);
  }
  dest = resolve(args[destIndex + 1]);
}
const uninstall = args.includes("--uninstall");

// Each kind is installed into <dest>/<kind>/<SLUG>/, so ids become "<SLUG>/<name>".
const KINDS = ["skills", "agents", "commands"];

// Claude Code frontmatter keys that OpenCode does not use or reads differently, per kind.
const DROP = {
  agents: new Set(["name", "tools", "model", "color"]),
  commands: new Set(["argument-hint", "allowed-tools", "model", "disable-model-invocation"]),
};

// Frontmatter keys added when missing, per kind.
const ADD = {
  agents: [["mode", "subagent"]],
  commands: [],
};

function convert(text, kind) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return text;
  const [, header, body] = match;
  // Drop a key together with its continuation lines (indented or YAML list items).
  const lines = [];
  let dropping = false;
  for (const line of header.split(/\r?\n/)) {
    const key = line.match(/^([A-Za-z0-9_-]+):/)?.[1];
    if (key) dropping = DROP[kind].has(key);
    else if (!/^(\s|-\s)/.test(line)) dropping = false;
    if (!dropping) lines.push(line);
  }
  for (const [key, value] of ADD[kind]) {
    if (!lines.some((line) => line.startsWith(`${key}:`))) lines.push(`${key}: ${value}`);
  }
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

for (const kind of KINDS) {
  const source = join(ROOT, kind);
  const target = join(dest, kind, SLUG);

  if (uninstall) {
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
      console.log(`removed ${target}`);
    }
    continue;
  }

  if (!existsSync(source)) continue;
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  if (kind === "skills") {
    cpSync(source, target, { recursive: true });
  } else {
    for (const file of readdirSync(source).filter((name) => name.endsWith(".md"))) {
      const text = readFileSync(join(source, file), "utf8");
      writeFileSync(join(target, file), convert(text, kind));
    }
  }
  console.log(`installed ${kind} -> ${target}`);
}
