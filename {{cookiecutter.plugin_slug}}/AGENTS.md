{%- set t = [] %}
{%- if cookiecutter.target_claude == 'y' %}{% set _ = t.append('Claude Code') %}{% endif %}
{%- if cookiecutter.target_codex == 'y' %}{% set _ = t.append('OpenAI Codex') %}{% endif %}
{%- if cookiecutter.target_opencode == 'y' %}{% set _ = t.append('OpenCode') %}{% endif -%}
# AGENTS.md — {{ cookiecutter.plugin_name }}

This repository is an agent plugin. One set of source files must work in
**{{ t | join(', ') }}**. Read this file before you add or change anything.

Plugin id (slug): `{{ cookiecutter.plugin_slug }}`

## Core rule: write once, in Claude Code format

- Every component has exactly one source file. Never create per-platform copies.
- Write agents and commands in Claude Code format. Platform adapters (manifests,
  the OpenCode installer) map them to the other platforms.
- Use only the portable subset of each format, described below. A feature that
  exists on one platform only must degrade safely on the others.

## Layout

```
{{ cookiecutter.plugin_slug }}/
├── skills/<skill-id>/SKILL.md      # all platforms
├── agents/<agent-id>.md            # Claude Code; OpenCode via installer
├── commands/<command-id>.md        # Claude Code; OpenCode via installer
├── hooks/hooks.json                # Claude Code, Codex
├── .mcp.json                       # Claude Code, Codex
├── servers/                        # code for local MCP servers
├── scripts/validate.mjs            # checks the plugin for every target
├── scripts/hooks/                  # Node scripts that hooks.json runs
├── scripts/install-opencode.mjs    # OpenCode installer
├── .claude-plugin/plugin.json      # Claude Code manifest
├── .claude-plugin/marketplace.json # Claude Code marketplace (also read by Codex desktop)
├── .codex-plugin/plugin.json       # Codex manifest
└── .agents/plugins/marketplace.json# Codex marketplace
```

Some of these may be missing because the template removed what this plugin
did not need. Re-create them from this file when you add that component.

Rules for paths:

- Component folders live at the plugin root, never inside `.claude-plugin/`
  or `.codex-plugin/`.
- Use relative paths that start with `./` in manifests.
- Never hard-code absolute paths. In hooks and MCP config, use
  `${CLAUDE_PLUGIN_ROOT}`; Codex also sets this variable.

## Support matrix

| Component | Claude Code | Codex | OpenCode                 |
|-----------|-------------|-------|--------------------------|
| Skills    | native      | native| installer copies them    |
| Agents    | native      | none  | installer converts them  |
| Commands  | native      | none  | installer converts them  |
| Hooks     | native      | native (user must trust plugin) | none |
| MCP       | native      | native| manual `opencode.json`   |

Put behaviour that must work everywhere in a **skill**. Skills are the only
component every platform loads. Agents and commands are optional extras.

## Skills (all platforms)

Path: `skills/<skill-id>/SKILL.md`

```markdown
---
name: <skill-id>
description: What the skill does and when to use it. The agent decides from this line alone.
---

# Title

Instructions in Markdown.
```

Rules:

- `<skill-id>`: lowercase letters, digits and single hyphens, max 64 chars.
  The folder name and `name` must be identical.
- `description` is required in practice: without it, OpenCode does not advertise
  the skill and the other platforms cannot decide when to use it. Keep it under
  1024 characters and state both *what* and *when*.
- Only `name` and `description` are portable frontmatter keys. Do not rely on
  any other key.
- Supporting files (scripts, references, templates) go inside the skill folder.
  Reference them with paths relative to `SKILL.md`.
- Keep `SKILL.md` focused. Move long reference material to separate files in
  the skill folder and tell the agent when to read them.

## Agents (Claude Code, OpenCode)

Path: `agents/<agent-id>.md`

```markdown
---
name: <agent-id>
description: When to delegate to this agent.
tools: Read, Grep, Glob
---

System prompt for the agent.
```

Rules:

- `name` must equal the file name without `.md`.
- Portable keys: `name`, `description`, `tools`. The OpenCode installer drops
  `name`, `tools`, `model` and `color`, and adds `mode: subagent`.
- `tools` limits tools in Claude Code only. In OpenCode the agent gets the
  default tools. Never depend on `tools` for safety; say the limits in the
  prompt too.
- Do not set `model`. Model names differ between platforms.
- Codex plugins have no agents. If Codex users need the behaviour, put it in
  a skill.

## Commands (Claude Code, OpenCode)

Path: `commands/<command-id>.md`

```markdown
---
description: One line shown in the command list.
argument-hint: [file]
---

Prompt template. Use $ARGUMENTS for the user's arguments.
```

Rules:

- Use `$ARGUMENTS` for arguments. Both platforms support it.
- Portable keys: `description`, `argument-hint`. The OpenCode installer drops
  `argument-hint`, `allowed-tools`, `model` and `disable-model-invocation`.
- Invocation names differ: Claude Code `/{{ cookiecutter.plugin_slug }}:<command-id>`,
  OpenCode `/{{ cookiecutter.plugin_slug }}/<command-id>`.
- Do not use shell-injection syntax in commands; it is not portable.
- Codex plugins have no commands. If Codex users need the behaviour, put it
  in a skill.

## Hooks (Claude Code, Codex)

Path: `hooks/hooks.json`. Both platforms read the same file and format.
Hook logic lives in Node scripts under `scripts/hooks/`.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/hooks/session-start.mjs\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### Events

Use only events that exist on every selected platform:

| Event              | Claude Code | Codex |
|--------------------|-------------|-------|
| SessionStart       | yes         | yes   |
| SessionEnd         | yes         | yes   |
| UserPromptSubmit   | yes         | yes   |
| PreToolUse         | yes         | yes   |
| PostToolUse        | yes         | yes   |
| PermissionRequest  | yes         | yes   |
| Stop               | yes         | yes   |
| SubagentStart      | yes         | yes   |
| SubagentStop       | yes         | yes   |
| PreCompact         | yes         | yes   |
| Notification       | yes         | no    |
| PreModelRequest, PostModelRequest, Interrupt | no | yes |

### Input and output contract (same on both platforms)

- The hook gets **one JSON object on stdin**. Common fields: `session_id`,
  `cwd`, `hook_event_name`. Event fields: `source` (SessionStart), `prompt`
  (UserPromptSubmit), `tool_name` and `tool_input` (PreToolUse/PostToolUse).
- To add context for the model, print JSON on stdout:
  `{"hookSpecificOutput": {"hookEventName": "<Event>", "additionalContext": "..."}}`.
  This works for SessionStart, UserPromptSubmit and SubagentStart on both.
- To block a tool in PreToolUse, print
  `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "..."}}`.
- Exit 0 with no output means success. Never print plain text from Stop or
  SubagentStop hooks; Codex treats it as an error.
- Tool names differ in matchers: shell is `Bash` on both, but file edits are
  `Edit`/`Write` in Claude Code and `apply_patch` in Codex. Match both when you
  filter edits.

### Rules

- Write hook scripts in Node (`.mjs`, no dependencies). Never use bash or
  PowerShell scripts: Claude Code and Codex use different shells on Windows,
  and Codex does not document which one.
- Start every command with `node` and quote the path:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/<name>.mjs"`.
- Set `timeout` (seconds). Keep hooks fast; SessionStart runs on every session.
- A hook must never crash the session: catch errors, exit 0 when unsure.
- Codex runs plugin hooks only after the user trusts the plugin, and plugins
  with hooks cannot go in the public Codex directory. Hooks must never be
  required for the plugin to work.
- OpenCode does not read `hooks.json`. Document hook behaviour as optional.

## MCP servers (Claude Code, Codex)

Path: `.mcp.json`. Both platforms read the same file.

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/server.js"],
      "env": {}
    }
  }
}
```

Rules:

- Prefer local stdio servers (`command` + `args`) like the example. Do not add a
  `type` key to stdio servers; Codex's format omits it.
- Put server code in `servers/`. Pin dependencies.
- Never put secrets in `.mcp.json`. Read them from environment variables.
{%- if cookiecutter.target_codex == 'y' %}
- When you add `.mcp.json`, also add `"mcpServers": "./.mcp.json"` to
  `.codex-plugin/plugin.json`.
{%- endif %}
{%- if cookiecutter.target_opencode == 'y' %}
- OpenCode does not load `.mcp.json`. Tell OpenCode users in the README to add
  the server to their `opencode.json`. Check the current OpenCode docs for the
  exact shape before you write the snippet.
{%- endif %}

## Manifests

The `name` is `{{ cookiecutter.plugin_slug }}` in every manifest and marketplace entry.
`version` must be the same in every file. Bump it in all of them together.
{% if cookiecutter.target_claude == 'y' %}
### Claude Code — `.claude-plugin/plugin.json`

- Required: `name`. Also keep `version`, `description`, `author`, `license`.
- Claude Code finds `skills/`, `agents/`, `commands/`, `hooks/hooks.json` and
  `.mcp.json` at their default paths. Do not list them in the manifest.
- `.claude-plugin/marketplace.json` lists this repo as one plugin with
  `"source": "./"`.
{% endif %}
{%- if cookiecutter.target_codex == 'y' %}
### Codex — `.codex-plugin/plugin.json`

- Required: `name`, `version`, `description`, `author.name`, `interface`.
- `interface` needs `displayName`, `shortDescription`, `longDescription`,
  `developerName` and `category`.
- Components are referenced explicitly:
  - `"skills": "./skills/"` when `skills/` exists.
  - `"mcpServers": "./.mcp.json"` when `.mcp.json` exists.
  - `hooks/hooks.json` is found at its default path.
- `.agents/plugins/marketplace.json` lists this repo as a `local` source with
  `"path": "./"`, plus `policy` and `category`.
{% endif %}
{%- if cookiecutter.target_opencode == 'y' %}
### OpenCode — `scripts/install-opencode.mjs`

OpenCode has no manifest for file-based components. The installer copies
`skills/`, `agents/` and `commands/` into OpenCode's folders under
`<dest>/<kind>/{{ cookiecutter.plugin_slug }}/`, and converts frontmatter.

- When you add a frontmatter key that OpenCode does not accept, add it to the
  `DROP` table in the installer.
- Do not add dependencies to the installer. It must run with plain `node`.
{% endif %}
## Requirements

- Node.js 18+ on `PATH`. The validator, the OpenCode installer, the hooks and
  local MCP servers all run with `node`. Tell users this in the README.
- To test a target, its CLI must be installed: `claude`, `codex` or `opencode`.
  The validator reports which ones are missing.

## Checklist for every change

1. The component lives in its single source file, at the path above.
2. Frontmatter uses only portable keys.
3. Ids are kebab-case and match their file or folder name.
4. Every manifest still lists the right components, and versions match.
5. The README component list and compatibility table are still true.
6. `node scripts/validate.mjs` exits with 0 errors. Fix warnings unless you
   have a reason to keep them.

## Checks

```bash
# Validates JSON, manifests, versions, skills, agents, commands, hooks events,
# referenced script paths and MCP config, and lists missing CLIs.
node scripts/validate.mjs
```

When you add a check rule to `AGENTS.md`, add it to `scripts/validate.mjs` too.
{%- if cookiecutter.target_claude == 'y' %}

```bash
# Claude Code: load the plugin from this folder
claude --plugin-dir .
```
{%- endif %}
{%- if cookiecutter.target_opencode == 'y' %}

```bash
# OpenCode: install into a scratch folder, inspect the output, then remove it
node scripts/install-opencode.mjs --dest ./.tmp-opencode
node scripts/install-opencode.mjs --dest ./.tmp-opencode --uninstall
```
{%- endif %}
{%- if cookiecutter.target_codex == 'y' %}

Codex: add the marketplace with `codex plugin marketplace add <path-or-owner/repo>`,
then install and test the plugin in the Codex app.
{%- endif %}

## Do not

- Create platform-specific copies of a skill, agent or command.
- Put Claude-only or OpenCode-only features in a skill.
- Add secrets, tokens or absolute paths to any file.
- Make hooks or MCP required for the core behaviour.
- Rename the plugin slug in one manifest only.
