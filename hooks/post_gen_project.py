"""Remove the files for targets and components the user did not select."""

import shutil
from pathlib import Path

ROOT = Path.cwd()


def yes(value: str) -> bool:
    return value.strip().lower() == "y"


claude = yes("{{ cookiecutter.target_claude }}")
codex = yes("{{ cookiecutter.target_codex }}")
opencode = yes("{{ cookiecutter.target_opencode }}")
marketplace = yes("{{ cookiecutter.include_marketplace }}")

# (keep?, paths). Each component is kept only if a selected target uses it.
RULES = [
    (yes("{{ cookiecutter.include_skill }}"), ["skills"]),
    (yes("{{ cookiecutter.include_agent }}") and (claude or opencode), ["agents"]),
    (yes("{{ cookiecutter.include_command }}") and (claude or opencode), ["commands"]),
    (yes("{{ cookiecutter.include_hooks }}") and (claude or codex), ["hooks"]),
    (yes("{{ cookiecutter.include_mcp }}") and (claude or codex), [".mcp.json", "servers"]),
    (claude, [".claude-plugin"]),
    (claude and marketplace, [".claude-plugin/marketplace.json"]),
    (codex, [".codex-plugin"]),
    (codex and marketplace, [".agents"]),
    (opencode, ["scripts"]),
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

print(f"Plugin created at {ROOT}")
