#!/usr/bin/env node
// Generate every relevant option combination and validate each plugin.
// Usage: pnpm test   (needs uv for `uvx cookiecutter`)

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = mkdtempSync(join(tmpdir(), "plugin-init-"));

const CASES = [
  { name: "full", args: ["include_hooks=y", "include_mcp=y"], expect: ["package.json", "hooks/hooks.json", ".mcp.json", "scripts/install-opencode.mjs"] },
  { name: "claude-only", args: ["target_codex=n", "target_opencode=n"], expect: [".claude-plugin/plugin.json"], absent: [".codex-plugin", "scripts/install-opencode.mjs"] },
  { name: "codex-only", args: ["target_claude=n", "target_opencode=n", "include_hooks=y"], expect: [".codex-plugin/plugin.json", "hooks/hooks.json"], absent: [".claude-plugin", "agents", "commands"] },
  { name: "opencode-only", args: ["target_claude=n", "target_codex=n", "include_hooks=y", "include_mcp=y"], expect: ["scripts/install-opencode.mjs"], absent: ["hooks", ".mcp.json", ".claude-plugin", ".codex-plugin"] },
  { name: "minimal", args: ["include_agent=n", "include_command=n", "include_marketplace=n"], expect: ["skills"], absent: ["agents", "commands", ".agents", ".claude-plugin/marketplace.json"] },
];

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};

function generate(args) {
  return spawnSync("uvx", ["cookiecutter", ROOT, "--no-input", "-o", OUT, ...args], {
    encoding: "utf8",
  });
}

try {
  for (const c of CASES) {
    console.log(`case ${c.name}`);
    const gen = generate([`plugin_name=${c.name}`, ...c.args]);
    if (gen.error) {
      console.error(`cannot run uvx: ${gen.error.message}. Install uv first.`);
      process.exit(1);
    }
    if (gen.status !== 0) {
      fail(`generation failed\n${gen.stdout}\n${gen.stderr}`);
      continue;
    }
    const dir = join(OUT, c.name);
    for (const p of c.expect ?? []) if (!existsSync(join(dir, p))) fail(`missing ${p}`);
    for (const p of c.absent ?? []) if (existsSync(join(dir, p))) fail(`unexpected ${p}`);

    const val = spawnSync(process.execPath, ["scripts/validate.mjs"], { cwd: dir, encoding: "utf8" });
    if (val.status !== 0) fail(`validator failed\n${val.stdout}`);

    if (existsSync(join(dir, "scripts/install-opencode.mjs"))) {
      const dest = join(dir, ".tmp-opencode");
      const inst = spawnSync(process.execPath, ["scripts/install-opencode.mjs", "--dest", dest], { cwd: dir, encoding: "utf8" });
      if (inst.status !== 0) fail(`OpenCode installer failed\n${inst.stderr}`);
      else if (!existsSync(join(dest, "skills", c.name))) fail("OpenCode installer did not copy skills");
    }
  }

  console.log("case no-target (must fail)");
  const none = generate(["plugin_name=none", "target_claude=n", "target_codex=n", "target_opencode=n"]);
  if (none.status === 0) fail("generation succeeded without a target");

  console.log("case bad-slug (must fail)");
  const bad = generate(["plugin_slug=Bad Slug"]);
  if (bad.status === 0) fail("generation succeeded with an invalid slug");
} finally {
  rmSync(OUT, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} failure(s)` : "\nall cases passed");
process.exit(failures ? 1 : 0);
