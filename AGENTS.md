- When editing code, preserve existing comments in the file if they're still relevant.
- Before reading a file, use grep/glob to locate the relevant lines, then call read with offset/limit to fetch only that range. Default to ≤200 lines per read. Only omit offset/limit when you genuinely need the whole file.
- DO NOT rely on Git to view staged/unstaged changes.
- When running commands, use head/tail to truncate the output unless you need the full output.
- When running multiple commands, chain them into 1 command using &&, || or ; (and with head/tail).
- AVOID using curved apostrophes/quotes (i.e. ’“”)
- When web-searching, call the web search tool one at a time, thinking between each call. DO NOT make parallel search calls.
- If explicitly told to Git commit, write commit messages in Conventional Commits style: `type(scope): lowercase imperative summary` with no trailing period, e.g. `fix(parser): drop stale tokens on reconnect`. The scope is the affected subsystem; omit it when none fits, e.g. `docs: ...`.

# Implementation Style
- PREFER direct, readable code over helper-heavy abstractions and result wrappers. DO NOT abstract solely to satisfy DRY; limited duplication is acceptable when it keeps control flow or API usage clear.
- INLINE short, one-use logic instead of creating tiny 1–3 lines helpers; introduce the block with a brief descriptive comment. Extract only for meaningful reuse, substantial logic, cleanup, safety, or independent testing.
- PREFER familiar standard C++ where practical. USE platform-specific mechanisms when required for correctness or safe failure handling; DO NOT trade safety for superficial simplicity.

# C++ Convention Workflow
For C++ changes:
1. DO NOT load either convention skill during planning.
2. Immediately before editing code, load `code-conventions` and apply it only to code touched by the current task. Do not retrofit unrelated existing code.
3. After code changes are complete, load `docstring-conventions` and add or update docstrings only for code touched by the current task. Do not retrofit unrelated existing code.

CRITICAL: DO NOT re-load either skill if you've already loaded them previously
