- When editing code, preserve existing comments in the file if they're still relevant.
- DO NOT rely on Git to view staged/unstaged changes.
- When running commands, prefer using head/tail to truncate the output unless you need the full output.
- When running multiple commands, prefer chaining them into 1 command using && or || (and with head/tail).
- When reading files, read conservatively and prefer reading line ranges unless you need the full file.
- Prefer inlining over tiny helpers. Avoid creating helper functions that are short (1–3 lines) and only called from one place — they force the reader to jump around and break the flow of reading a function. Instead, keep the logic inline and precede the block with a short comment describing what the section does (e.g. `// Parse query parameters`, `// Remove stale tracklets`). Extract a helper only when it's reused, substantial enough to warrant its own unit, or needs to be independently testable.
- AVOID using curved apostrophes/quotes (i.e. ’“”)

# C++ Convention Workflow
For C++ changes:
1. Do not load either convention skill during planning.
2. Immediately before editing code, load `code-conventions` and apply it only to code touched by the current task. Do not retrofit unrelated existing code.
3. After code changes are complete, load `docstring-conventions` and add or update docstrings only for code touched by the current task. Do not retrofit unrelated existing code.
