#!/usr/bin/env node
// SessionStart hook for Claude Code and Codex.
// Both platforms send one JSON object on stdin and accept the same
// hookSpecificOutput.additionalContext shape on stdout.

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input = {};
  try {
    input = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    // Never fail the session because of bad input.
  }

  const context = [
    "The {{ cookiecutter.plugin_name }} plugin is active.",
    `Session source: ${input.source ?? "unknown"}.`,
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: context,
      },
    }),
  );
});
