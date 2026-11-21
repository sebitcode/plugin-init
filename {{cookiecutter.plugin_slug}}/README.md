# {{ cookiecutter.plugin_name }}

{{ cookiecutter.description }}

## Contents
{% if cookiecutter.include_agent == 'y' %}
- `agents/` — subagents
{%- endif %}
{%- if cookiecutter.include_skill == 'y' %}
- `skills/` — skills
{%- endif %}
{%- if cookiecutter.include_command == 'y' %}
- `commands/` — slash commands (`/{{ cookiecutter.plugin_slug }}:hello`)
{%- endif %}
{%- if cookiecutter.include_hooks == 'y' %}
- `hooks/hooks.json` — hooks
{%- endif %}
{%- if cookiecutter.include_mcp == 'y' %}
- `.mcp.json` — MCP servers
{%- endif %}

## Local testing

```bash
claude --plugin-dir ./
```
{% if cookiecutter.include_marketplace == 'y' %}
## Install

```bash
/plugin marketplace add <owner>/<repo>
/plugin install {{ cookiecutter.plugin_slug }}@{{ cookiecutter.plugin_slug }}-marketplace
```
{% endif %}
## License

{{ cookiecutter.license }}
