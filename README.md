# Claude Code plugin cookiecutter

Cookiecutter template that scaffolds a new Claude Code plugin.

## Usage

With [uv](https://docs.astral.sh/uv/) (no install needed):

```bash
uvx cookiecutter path/to/agents-crew
```

Or with pip:

```bash
pip install cookiecutter
cookiecutter path/to/agents-crew
```

Non-interactive example:

```bash
uvx cookiecutter path/to/agents-crew --no-input plugin_name="My Plugin" include_mcp=y
```

## Options

| Variable              | Default            | Effect                                              |
|-----------------------|--------------------|-----------------------------------------------------|
| `plugin_name`         | My Claude Plugin   | Human-readable name                                 |
| `plugin_slug`         | derived from name  | Plugin id, must be kebab-case                       |
| `description`         | A Claude Code plugin. | Goes into `plugin.json` and README              |
| `author_name`         | Your Name          | Author in `plugin.json`                             |
| `author_email`        | (empty)            | Omitted from `plugin.json` when empty               |
| `version`             | 0.1.0              | Plugin version                                      |
| `license`             | MIT                | MIT, Apache-2.0 or Proprietary                      |
| `include_agent`       | y                  | `agents/example-agent.md`                           |
| `include_skill`       | y                  | `skills/example-skill/SKILL.md`                     |
| `include_command`     | y                  | `commands/hello.md`                                 |
| `include_hooks`       | n                  | `hooks/hooks.json`                                  |
| `include_mcp`         | n                  | `.mcp.json` and `servers/`                          |
| `include_marketplace` | y                  | `.claude-plugin/marketplace.json` (repo installable as a marketplace) |

## Generated layout

```
<plugin_slug>/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json   # optional
├── agents/                # optional
├── skills/                # optional
├── commands/              # optional
├── hooks/hooks.json       # optional
├── .mcp.json              # optional
├── servers/               # optional, with .mcp.json
└── README.md
```

## Template internals

- `cookiecutter.json`: variables and prompts.
- `hooks/pre_gen_project.py`: rejects a slug that is not kebab-case.
- `hooks/post_gen_project.py`: deletes the parts you answered `n` to.
- `{{cookiecutter.plugin_slug}}/`: the plugin template itself.

Test a generated plugin with:

```bash
claude --plugin-dir ./<plugin_slug>
```
