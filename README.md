# plugin-init

Cookiecutter template that scaffolds one agent plugin for **Claude Code**, **OpenAI Codex** and **OpenCode** from a single source.

## Usage

With [uv](https://docs.astral.sh/uv/) (no install needed):

```bash
uvx cookiecutter gh:sebitcode/plugin-init
```

Or with pip:

```bash
pip install cookiecutter
cookiecutter gh:sebitcode/plugin-init
```

Non-interactive example:

```bash
uvx cookiecutter gh:sebitcode/plugin-init --no-input plugin_name="My Plugin" target_codex=n include_mcp=y
```

## How it works

Components are written once, in Claude Code format:

- **Skills** (`skills/<name>/SKILL.md`) use the shared SKILL.md format that all three tools read.
- **Agents and commands** are read natively by Claude Code. For OpenCode, `scripts/install-opencode.mjs` copies them into OpenCode's folders and converts the frontmatter.
- **Hooks** (`hooks/hooks.json`) and **MCP** (`.mcp.json`) use the same files for Claude Code and Codex.

Each target adds only its own manifest:

| Target      | Files                                                                    |
|-------------|--------------------------------------------------------------------------|
| Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`          |
| Codex       | `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`          |
| OpenCode    | `scripts/install-opencode.mjs`                                           |

### Compatibility

| Component | Claude Code | Codex | OpenCode            |
|-----------|-------------|-------|---------------------|
| Skills    | yes         | yes   | yes (via installer) |
| Agents    | yes         | no    | yes (via installer) |
| Commands  | yes         | no    | yes (via installer) |
| Hooks     | yes         | yes   | no                  |
| MCP       | yes         | yes   | no                  |

## Options

| Variable              | Default               | Effect                                          |
|-----------------------|-----------------------|-------------------------------------------------|
| `plugin_name`         | My Agent Plugin       | Human-readable name                             |
| `plugin_slug`         | derived from name     | Plugin id, kebab-case, max 64 chars             |
| `description`         | An agent plugin ...   | Manifests and README                            |
| `author_name`         | Your Name             | Author in manifests                             |
| `author_email`        | (empty)               | Omitted when empty                              |
| `version`             | 0.1.0                 | Plugin version                                  |
| `license`             | MIT                   | MIT, Apache-2.0 or Proprietary                  |
| `target_claude`       | y                     | Claude Code manifest                            |
| `target_codex`        | y                     | Codex manifest                                  |
| `target_opencode`     | y                     | OpenCode installer                              |
| `include_skill`       | y                     | `skills/example-skill/SKILL.md`                 |
| `include_agent`       | y                     | `agents/example-agent.md`                       |
| `include_command`     | y                     | `commands/hello.md`                             |
| `include_hooks`       | n                     | `hooks/hooks.json`                              |
| `include_mcp`         | n                     | `.mcp.json` and `servers/`                      |
| `include_marketplace` | y                     | Marketplace files for each selected target      |
| `codex_category`      | Coding                | `category` in the Codex manifest                |

At least one target must be selected. Components that no selected target can use are removed.

## After generation

The template checks your environment and runs the plugin's validator:

- Reports whether Node.js and the CLI of each selected target (`claude`, `codex`, `opencode`) are on `PATH`, with the install command for each missing one.
- Runs `node scripts/validate.mjs`, which checks manifests, versions, skills, agents, commands, hook events per platform, referenced script paths and MCP config.

Every generated plugin includes an `AGENTS.md` with the rules for keeping it compatible with all three platforms.

## Template internals

- `cookiecutter.json`: variables and prompts.
- `hooks/pre_gen_project.py`: validates the slug and that a target is selected.
- `hooks/post_gen_project.py`: removes unselected targets and components.
- `{{cookiecutter.plugin_slug}}/`: the plugin template.
