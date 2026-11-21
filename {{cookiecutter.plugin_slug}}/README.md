# {{ cookiecutter.plugin_name }}

{{ cookiecutter.description }}

## Contents
{% if cookiecutter.include_skill == 'y' %}
- `skills/` — skills (SKILL.md), shared by every target
{%- endif %}
{%- if cookiecutter.include_agent == 'y' and (cookiecutter.target_claude == 'y' or cookiecutter.target_opencode == 'y') %}
- `agents/` — subagents (Claude Code format; converted for OpenCode on install)
{%- endif %}
{%- if cookiecutter.include_command == 'y' and (cookiecutter.target_claude == 'y' or cookiecutter.target_opencode == 'y') %}
- `commands/` — slash commands (Claude Code format; converted for OpenCode on install)
{%- endif %}
{%- if cookiecutter.include_hooks == 'y' and (cookiecutter.target_claude == 'y' or cookiecutter.target_codex == 'y') %}
- `hooks/hooks.json` — hooks (Claude Code, Codex)
{%- endif %}
{%- if cookiecutter.include_mcp == 'y' and (cookiecutter.target_claude == 'y' or cookiecutter.target_codex == 'y') %}
- `.mcp.json` — MCP servers (Claude Code, Codex)
{%- endif %}
{%- if cookiecutter.target_claude == 'y' %}
- `.claude-plugin/` — Claude Code manifest{% if cookiecutter.include_marketplace == 'y' %} and marketplace{% endif %}
{%- endif %}
{%- if cookiecutter.target_codex == 'y' %}
- `.codex-plugin/plugin.json` — Codex manifest
{%- if cookiecutter.include_marketplace == 'y' %}
- `.agents/plugins/marketplace.json` — Codex marketplace
{%- endif %}
{%- endif %}
{%- if cookiecutter.target_opencode == 'y' %}
- `scripts/install-opencode.mjs` — installer for OpenCode
{%- endif %}

## Compatibility

| Component | Claude Code | Codex | OpenCode |
|-----------|-------------|-------|----------|
| Skills    | yes         | yes   | yes (via installer) |
| Agents    | yes         | no    | yes (via installer) |
| Commands  | yes         | no    | yes (via installer) |
| Hooks     | yes         | yes   | no (needs a JS plugin) |
| MCP       | yes         | yes   | no (add it to `opencode.json`) |

## Requirements

- Node.js 18+ on `PATH`. Hooks, local MCP servers and the scripts in `scripts/` run with `node`.

Check the plugin with:

```bash
node scripts/validate.mjs
```
{% if cookiecutter.target_claude == 'y' %}
## Claude Code

Test locally:

```bash
claude --plugin-dir ./
```
{% if cookiecutter.include_marketplace == 'y' %}
Install from GitHub:

```bash
/plugin marketplace add <owner>/<repo>
/plugin install {{ cookiecutter.plugin_slug }}@{{ cookiecutter.plugin_slug }}-marketplace
```
{% endif %}
{%- endif %}
{%- if cookiecutter.target_codex == 'y' %}
## Codex
{% if cookiecutter.include_marketplace == 'y' %}
Add the marketplace, then install the plugin from the Codex plugin directory:

```bash
codex plugin marketplace add <owner>/<repo>
```
{% else %}
Add this folder to a marketplace file (`.agents/plugins/marketplace.json`) and install it from the Codex plugin directory.
{% endif %}
Hooks in Codex run only after the user trusts the plugin.
{% endif %}
{%- if cookiecutter.target_opencode == 'y' %}
## OpenCode

Requires Node.js. From a clone of this repo:

```bash
node scripts/install-opencode.mjs --dest /path/to/project/.opencode   # one project
node scripts/install-opencode.mjs --global                            # all projects
node scripts/install-opencode.mjs --global --uninstall                # remove
```

Items are namespaced under `{{ cookiecutter.plugin_slug }}/`, for example the command `/{{ cookiecutter.plugin_slug }}/hello`.
{% endif %}
## License

{{ cookiecutter.license }}
