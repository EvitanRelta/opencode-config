---
name: commit-message-conventions
description: Git commit message conventions. Load this skill ONLY when drafting commit messages. DO NOT load this while planning or editing code. DO NOT load when explicitly told to use using an specific commit message.
---

# Commit messages

Use Conventional Commits:

```text
type(scope): summary

Optional body.
```

Base the message on the actual diff and known context. Do not invent rationale, behavior, or test results.

## Titles

- Use an imperative summary: `prevent`, `add`, `remove`, not `prevented` or `adds`.
- Keep the entire title at most **100 characters**, including the prefix.
- Use lowercase wording except for proper names, identifiers, filenames, and established notation.
- Describe the concrete change, not vague work such as "improve handling".
- For behavioral changes, describe the outcome rather than an internal operation.
- Name a class, struct, file, or configuration key when it is the actual subject.

The limit is a ceiling, not a target. Do not pad short titles or obscure a clear change just to shorten it.

### Examples

| Prefer | Avoid |
|---|---|
| `fix(session): prevent automatic restart after disconnect` | `fix(session): set restart_inhibited on disconnect` |
| `feat(psu): reconnect after communication failures` | `feat(psu): handle asynchronous failures better` |
| `fix(session): allow mode changes during initialization` | `fix(session): extend can_set_mode to Init states` |
| `refactor(client): nest connection settings under RemoteServiceClient` | `refactor(client): reorganize configuration` |
| `style(client): format RemoteServiceClient.cpp` | `style(client): clean up client code` |

Long titles are acceptable when the extra words identify the capability, affected subject, or relevant
condition. Put explanations of the cause, rationale, or consequences in the body instead.

```text
feat(api): publish requested state, active state, and available actions in connection updates
refactor(client): consolidate connection and retry settings under ReliableConnectionClient::Config
test(session): cover disconnect, reconnect, and explicit restart approval across saved preferences
```

## Types and scopes

Use the type matching the primary purpose:

- `fix`: correct existing behavior.
- `feat`: add a capability.
- `refactor`: restructure code without intentionally changing behavior.
- `docs`, `test`, `style`: documentation-only, test-only, or formatting-only changes.
- `build`, `ci`, `chore`: build changes, CI changes, or other maintenance.

Supporting tests and documentation do not change the type of a behavioral commit.

Choose the scope by the subject of the change, not mechanically by the edited path. Use a concise,
recognizable lowercase kebab-case name unless the repository uses another spelling. These are examples,
not mandatory scopes; existing repository conventions take precedence:

| Subject | Scope |
|---|---|
| Application | `app` |
| API | `api` |
| Client | `client` |
| Configuration | `config` |
| Agent instructions | `AGENTS.md` |
| README documentation | `README` |

Omit the scope when no single scope fits.

## Technical vocabulary

Write for a returning maintainer who knows the project but does not remember every helper or flag.

- Keep familiar, precise terms such as API, HTTP, PSU, and SCPI.
- Common shortened words such as `min`, `avg`, `max`, `dev`, `init`, `doc`, and `msg` are allowed,
  including natural plurals such as `docs` and `msgs`. Use them when the meaning remains clear;
  do not invent abbreviations or shorten words merely to fit the title limit.
- Use exact identifiers when readers need to find, configure, or depend on them.
- Keep ordinary verbs lowercase: "turn off the PSU", "disable output".
- **Describe the behavior**, not just the assignment:
  ```text
  fix(worker): stop processing jobs after shutdown
  ```
  Not: `fix(worker): set running = false after shutdown`
- **Include the exact value when it matters:**
  ```text
  fix(config): accept retry_delay_ms = 0 to disable retries
  ```

Examples:

```text
fix(session): require explicit approval before restarting after disconnect
feat(diagnostics): report per-PSU SCPI command rates
feat(config): add connection_retry_delay_ms
fix(api): preserve requested_state while disconnected
refactor(app): remove redundant session index
```

## Bodies

Include a body when important context is missing from the title:

- A non-obvious bug or its trigger.
- A meaningful safety change and the behavior being protected.
- A design rationale that matters.
- A compatibility effect or important limitation.

Otherwise, use a title only. A large diff does not automatically need a body.

### Length and structure

Keep body line width at most 100 characters per line.

Use short paragraphs separated by blank lines. Each paragraph should contain one coherent idea,
not necessarily one sentence.

When both need explaining, prefer:

```text
Brief problem or reason.

Brief change or outcome.
```

Use one paragraph when sufficient. Add another only for important context, not to make the message
look thorough. Headings are usually unnecessary.

### Content

Describe the old problem in past tense and the new behavior in present tense or imperative wording.
Include exact conditions, identifiers, or timings when they matter.

Do not repeat the title, inventory edited files, narrate routine implementation steps, or add filler
such as "updated tests and documentation".

Mention testing only when its scope, result, or limitation matters. Never claim tests passed unless
they actually ran.

### Good body examples

These illustrate the style; only use their claims when supported by the change.

**Bug fix**

```text
A stalled consumer could allow incoming messages to accumulate without limit.

Bound each receive queue to prevent unbounded memory growth.
```

**Rationale**

```text
A lifetime average could hide short request-rate spikes. Use a rolling 10-second window to
make those spikes visible.
```

**Safety change**

```text
Reconnecting could resume an operation using the previous approval. Restoring communication
alone must not authorize a restart.

Require explicit approval before restarting the operation.
```

**Test limitation**

```text
The reconnect scenario checks sustained responses rather than a single successful response.

- The mock-service case must pass.
- The live-endpoint case remains expected to fail until the server issue is resolved.
```

### When no body is needed

These titles can stand alone unless there is additional important context:

```text
docs(README): correct the Linux setup command
docs(AGENTS.md): remove obsolete build instructions
refactor(app): remove redundant session index
style(client): format RemoteServiceClient.cpp
test(config): reject negative connection retry delays
```
