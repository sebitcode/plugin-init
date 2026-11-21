import re
import sys

slug = "{{ cookiecutter.plugin_slug }}"

if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
    print(f"ERROR: plugin_slug '{slug}' must be kebab-case (a-z, 0-9, '-').")
    sys.exit(1)
