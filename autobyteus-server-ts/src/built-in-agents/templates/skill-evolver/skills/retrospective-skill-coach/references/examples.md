# Retrospective Skill Coaching Examples

## Example 1: Browser Exploration Becomes SOP

Trace signal:
- The worker tries several browser operations.
- It eventually discovers that inspecting the DOM snapshot first and using a stable label or selector works reliably.

Good update:
- Add a generalized browser-operation SOP: inspect visible state, identify stable selectors, perform action, verify state.

Bad update:
- Copy the exact private URL, transient HTML, or task-specific selector into durable guidance.

## Example 2: User Correction Becomes Skill Rule

Trace signal:
- User says stable policy belongs in agent or skill guidance, while the user message should carry dynamic paths only.

Good update:
- Add a rule distinguishing static guidance from dynamic task packet content.

Bad update:
- Paste the user's whole complaint verbatim into the skill.

## Example 3: No Durable Improvement

Trace signal:
- The worker failed because an external site was temporarily unavailable.
- No repeated mistake or reusable process gap is visible.

Good outcome:
- Make no file changes and explain why.

Bad update:
- Add a permanent warning about that specific temporary outage.

## Example 4: Package Structure Improvement

Trace signal:
- The worker missed relevant guidance because `SKILL.md` was too long and did not route to examples.

Good update:
- Keep `SKILL.md` concise.
- Move detailed examples into `references/examples.md`.
- Add a clear routing bullet in `SKILL.md`.

Bad update:
- Append another long section to the already overloaded entry file.

## Example 5: Durable SOP From Command Discovery

Trace signal:
- The worker runs several commands before finding the correct test command or setup path.

Good update:
- Add a generalized command discovery checklist or known command in the relevant skill reference.

Bad update:
- Copy absolute local one-off paths that only existed in that run.
