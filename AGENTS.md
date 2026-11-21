# AGENTS.md — plugin-init

This repo is a cookiecutter template. It generates one agent plugin that works
in Claude Code, OpenAI Codex and OpenCode.

## Create a new plugin

Run cookiecutter non-interactively. Pass every answer you know; the others
take their defaults.

```bash
uvx cookiecutter gh:sebitcode/plugin-init --no-input -o <output-dir> \
  plugin_name="My Plugin" description="What it does" author_name="Name" \
  target_claude=y target_codex=y target_opencode=y \
  include_skill=y include_agent=y include_command=y \
  include_hooks=n include_mcp=n include_marketplace=y
```

Use `.` instead of `gh:sebitcode/plugin-init` when you work inside a clone.

Choose options from what the user needs:

- Behaviour that must work on all three platforms goes in a **skill**.
  Keep `include_skill=y` unless the user says otherwise.
- Agents and commands do not work in Codex. Hooks and MCP do not work in
  OpenCode. Turn them on only when the user needs them.
- At least one `target_*` must be `y`.

Then open the generated plugin and follow its `AGENTS.md`. It holds the rules
for writing each component so it works on every selected platform. Replace
the example components; do not keep them.

## Change this template

- `cookiecutter.json`: variables, defaults and prompts.
- `hooks/pre_gen_project.py`: input validation. Add a check here for every new
  variable that can be invalid.
- `hooks/post_gen_project.py`: the `RULES` table decides which files survive
  for each target and component. Update it when you add a file that depends
  on an option.
- `{{cookiecutter.plugin_slug}}/`: the plugin. Every file is rendered by Jinja.
  - Escape literal `{{`, `}}` and `{%` with `{% raw %}...{% endraw %}`.
  - `${VAR}` and `$ARGUMENTS` are safe; Jinja ignores them.
  - Keep JSON valid in every combination of options. Watch commas around
    `{% if %}` blocks.
- When a platform's plugin format changes, update the generated
  `AGENTS.md`, the manifests and the root `README.md` together.

## Test before you commit

Generate the combinations below. Every run must succeed, every JSON file must
parse, and only the expected files may exist.

```bash
OUT=$(mktemp -d)
uvx cookiecutter . --no-input -o "$OUT" plugin_name="Full" include_hooks=y include_mcp=y
uvx cookiecutter . --no-input -o "$OUT" plugin_name="Claude Only" target_codex=n target_opencode=n
uvx cookiecutter . --no-input -o "$OUT" plugin_name="Codex Only" target_claude=n target_opencode=n
uvx cookiecutter . --no-input -o "$OUT" plugin_name="OpenCode Only" target_claude=n target_codex=n
find "$OUT" -name '*.json' -exec node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" {} \;
cd "$OUT/full" && node scripts/install-opencode.mjs --dest ./.tmp-opencode
```

This run must fail with an error:

```bash
uvx cookiecutter . --no-input -o "$OUT" target_claude=n target_codex=n target_opencode=n
```
