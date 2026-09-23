- When editing code, preserve existing comments in the file if they're still relevant.
- Before reading a file, use grep/glob to locate the relevant lines, then call read with offset/limit to fetch only that range. Default to ≤200 lines per read. Only omit offset/limit when you genuinely need the whole file.
- When running commands, use head/tail to truncate the output unless you need the full output.
- When running multiple commands, chain them into 1 command using &&, || or ; (and with head/tail).
- AVOID using curved apostrophes/quotes (i.e. ’“”)
- When web-searching, call the web search tool one at a time, thinking between each call. DO NOT make parallel search calls.
- If explicitly told to Git commit, write commit messages in Conventional Commits style: `type(scope): lowercase imperative summary` with no trailing period, e.g. `fix(parser): drop stale tokens on reconnect`. The scope is the affected subsystem; omit it when none fits, e.g. `docs: ...`. Prefer `fix(...)` type if the changes fixed existing problems. However, use `git commit --fixup` if explicitly told.
- NEVER rewrite/amend Git history.

# Implementation Style
- PREFER direct, readable code and the fewest interfaces/classes/types needed to keep responsibilities clear. DO NOT introduce helper-heavy abstractions, result wrappers, adapters, or interface hierarchies without a demonstrated practical benefit. DO NOT abstract solely to satisfy DRY; limited duplication is acceptable when it keeps control flow or API usage clear.
- INLINE short logic used in only one or two places when doing so keeps related control flow together and reduces file or section jumps. Limited duplication is acceptable. Extract only for frequent reuse, substantial logic, cleanup, safety policy, or independent testing.
- PREFER LEAN DOCUMENTATION that helps readers locate the relevant implementation and understand essential rationale or safety invariants. DO NOT restate detailed mechanics already documented in code. USE concise code maps and references instead.

# C++ Convention Workflow
For C++ changes:
1. DO NOT load either convention skill during planning.
2. Immediately before editing code, load `code-conventions` and apply it only to code touched by the current task. Do not retrofit unrelated existing code.
3. After code changes are complete, load `docstring-conventions` and add or update docstrings only for code touched by the current task. Do not retrofit unrelated existing code.

CRITICAL: DO NOT re-load either skill if you've already loaded them previously

# The User's Preference
The user prioritises readability over abstraction.

LESS ABSTRACTION means they want code kept simple and prefer to avoid adding classes, structs, functions, methods, or files unless they provide a clear, substantial benefit.

READABILITY means they prefer minimising function-call depth and the number of places a reader must visit to understand a piece of code. It also means to keep short, related logic inline, accompanied by a brief comment when its purpose is not obvious. They accept some duplication if it makes the code easier to follow. They strictly follow YAGNI: do not build abstractions or features for hypothetical future needs.

DOCUMENTATION wise, the user prefers README files and doc files to be LEAN. They want just enough context to help future readers get started and navigate to the relevant code, avoiding exhaustive explanations of details the code already makes clear. Less is more.

# Installing tools
If installing tools/packages (e.g. Python package to read PDF) can help with your work but is unavailable, simply use the `question` tool to ask if its ok to install.
