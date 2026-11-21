"""Remove unselected targets and components, then check the environment."""

import platform
import shutil
import subprocess
import sys
from pathlib import Path

# Flush each line so our output stays in order with the validator's.
sys.stdout.reconfigure(line_buffering=True)

ROOT = Path.cwd()
WINDOWS = platform.system() == "Windows"


def yes(value: str) -> bool:
    return value.strip().lower() == "y"


claude = yes("{{ cookiecutter.target_claude }}")
codex = yes("{{ cookiecutter.target_codex }}")
opencode = yes("{{ cookiecutter.target_opencode }}")
marketplace = yes("{{ cookiecutter.include_marketplace }}")
hooks = yes("{{ cookiecutter.include_hooks }}") and (claude or codex)
mcp = yes("{{ cookiecutter.include_mcp }}") and (claude or codex)

# (keep?, paths). Each component is kept only if a selected target uses it.
RULES = [
    (yes("{{ cookiecutter.include_skill }}"), ["skills"]),
    (yes("{{ cookiecutter.include_agent }}") and (claude or opencode), ["agents"]),
    (yes("{{ cookiecutter.include_command }}") and (claude or opencode), ["commands"]),
    (hooks, ["hooks", "scripts/hooks"]),
    (mcp, [".mcp.json", "servers"]),
    (claude, [".claude-plugin"]),
    (claude and marketplace, [".claude-plugin/marketplace.json"]),
    (codex, [".codex-plugin"]),
    (codex and marketplace, [".agents"]),
    (opencode, ["scripts/install-opencode.mjs"]),
]


def remove(rel: str) -> None:
    path = ROOT / rel
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()


for keep, paths in RULES:
    if not keep:
        for rel in paths:
            remove(rel)

# ---------- environment check (never fails generation) ----------

INSTALL = {
    "node": (
        "winget install OpenJS.NodeJS.LTS"
        if WINDOWS
        else "install Node.js 18+ from https://nodejs.org"
    ),
    "claude": (
        "irm https://claude.ai/install.ps1 | iex"
        if WINDOWS
        else "curl -fsSL https://claude.ai/install.sh | bash"
    ),
    "pnpm": (
        "Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression"
        if WINDOWS
        else "curl -fsSL https://get.pnpm.io/install.sh | sh -"
    ),
    "codex": "pnpm add -g @openai/codex",
    "opencode": "pnpm add -g opencode-ai",
}

needed = [
    ("node", "Node.js 18+ (hooks, MCP servers, scripts)", True),
    ("pnpm", "pnpm (package manager for this project)", True),
]
needed += [
    ("claude", "Claude Code CLI", claude),
    ("codex", "Codex CLI", codex),
    ("opencode", "OpenCode CLI", opencode),
]

print(f"\nPlugin created at {ROOT}\n")
missing = []
for cmd, label, wanted in needed:
    if not wanted:
        continue
    found = shutil.which(cmd)
    print(f"  [{'ok' if found else '--'}] {label}")
    if not found:
        missing.append(cmd)

if missing:
    print("\nInstall what is missing to test every target:")
    for cmd in missing:
        print(f"  {cmd}: {INSTALL[cmd]}")
    if any(cmd in missing for cmd in ("codex", "opencode")):
        print("  (run `pnpm setup` once before `pnpm add -g` if pnpm has no global bin dir)")

pnpm = shutil.which("pnpm")
node = shutil.which("node")
if pnpm and node:
    print("\nRunning pnpm validate ...\n")
    result = subprocess.run([pnpm, "validate"], cwd=ROOT)
elif node:
    print("\npnpm not found; running node scripts/validate.mjs ...\n")
    result = subprocess.run([node, "scripts/validate.mjs"], cwd=ROOT)
else:
    result = None
    print("\nSkipped validation: Node.js not found. Run `pnpm validate` after installing it.")

if result is not None and result.returncode != 0:
    print("\nThe validator reported errors. Fix them before you publish.")

print("\nNext: read AGENTS.md, then replace the example components.")
