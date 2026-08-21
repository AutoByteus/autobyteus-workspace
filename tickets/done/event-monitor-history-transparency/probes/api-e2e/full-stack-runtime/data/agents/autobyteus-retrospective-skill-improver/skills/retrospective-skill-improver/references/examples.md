# Retrospective Skill Improvement Examples

## Example 1: Browser Exploration Becomes SOP

Trace signal:
- The target run shows several browser-operation attempts.
- It eventually shows that inspecting observable page state first and using a stable label or selector works reliably.

Durable update:
- Add a generalized browser-operation SOP: inspect visible state, identify stable selectors, perform action, verify state. Use placeholders for site-specific URLs or selectors.

## Example 2: User Correction Becomes Skill Rule

Trace signal:
- User explains a stable policy for future tasks, such as keeping static guidance in agent/skill files while task messages carry dynamic paths.

Durable update:
- Add the generalized policy in the owning skill guidance, using reusable wording.

## Example 3: Context-Only Event

Trace signal:
- The target run encountered temporary external site unavailability.
- The trace shows temporary environment context rather than a reusable process gap.

Outcome:
- Explain that current guidance stands and note the temporary context.

## Example 4: Package Structure Improvement

Trace signal:
- Package structure made relevant guidance hard to find because `SKILL.md` was too long and lacked clear routing to examples.

Durable update:
- Keep `SKILL.md` concise.
- Move detailed examples into `references/examples.md`.
- Add a clear routing bullet in `SKILL.md`.

## Example 5: Durable SOP From Command Discovery

Trace signal:
- The target run shows several command attempts before finding the correct test command or setup path.

Durable update:
- Add a generalized command discovery checklist or known command in the relevant skill reference, using repo-relative commands or placeholders for local paths.
