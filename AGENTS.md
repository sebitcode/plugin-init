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
- `{{cookiecutter.plugin_slug}}/scripts/validate.mjs` is copied without
  rendering (`_copy_without_render`). Do not put Jinja in it.
- When a platform's plugin format changes, update the generated
  `AGENTS.md`, `scripts/validate.mjs` (event lists, required fields), the
  manifests and the root `README.md` together.

## Package manager

This repo and every generated plugin use **pnpm** only. Never write `npm`,
`npx` or `yarn` in scripts or docs; use `pnpm`, `pnpm dlx` and `pnpm add -g`.
The generated `package.json` pins `packageManager`; update the pnpm version in
both `package.json` files together.

Cookiecutter itself is a Python tool, so generation runs with
`uvx cookiecutter`.

## Test before you commit

```bash
pnpm test
```

`scripts/test-template.mjs` generates every option combination, checks which
files exist, runs each plugin's validator and the OpenCode installer, and
checks that a missing target and an invalid slug fail. Add a case there for
every new option.
