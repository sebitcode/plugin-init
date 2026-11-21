"""Remove the optional plugin parts the user did not select."""

import shutil
from pathlib import Path

ROOT = Path.cwd()

# Each answer is "y" or "n"; pair it with the paths it controls.
CHOICES = [
    ("{{ cookiecutter.include_agent }}", ["agents"]),
    ("{{ cookiecutter.include_skill }}", ["skills"]),
    ("{{ cookiecutter.include_command }}", ["commands"]),
    ("{{ cookiecutter.include_hooks }}", ["hooks"]),
    ("{{ cookiecutter.include_mcp }}", [".mcp.json", "servers"]),
    ("{{ cookiecutter.include_marketplace }}", [".claude-plugin/marketplace.json"]),
]


def remove(rel: str) -> None:
    path = ROOT / rel
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()


for answer, paths in CHOICES:
    if answer.lower() != "y":
        for rel in paths:
            remove(rel)

print(f"Plugin created at {ROOT}")
print("Test it with: claude --plugin-dir " + str(ROOT))
