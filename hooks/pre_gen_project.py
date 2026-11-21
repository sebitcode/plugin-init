import re
import sys

slug = "{{ cookiecutter.plugin_slug }}"

if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug) or len(slug) > 64:
    print(f"ERROR: plugin_slug '{slug}' must be kebab-case (a-z, 0-9, '-'), max 64 chars.")
    sys.exit(1)

targets = [
    "{{ cookiecutter.target_claude }}",
    "{{ cookiecutter.target_codex }}",
    "{{ cookiecutter.target_opencode }}",
]
if "y" not in targets:
    print("ERROR: select at least one target (Claude Code, Codex or OpenCode).")
    sys.exit(1)
