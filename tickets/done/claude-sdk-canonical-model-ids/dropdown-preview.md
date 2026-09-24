# Claude Agent SDK Model Dropdown — Proposed Preview

Status: Illustrative proposal for approval (not yet approved). Model IDs and
descriptions come live from the Claude SDK; the values below are what the SDK
reported on this machine on 2026-09-24 (Claude Code CLI 2.1.281).

---

## 1. Today (for comparison)

**Dropdown list**

```
ANTHROPIC
┌──────────────────────────────────────────────────────────────────────┐
│ Default (recommended)                                            ✓   │
│ Opus 5.5 with 1M context · Best for everyday, complex tasks          │
├──────────────────────────────────────────────────────────────────────┤
│ Fable                                                                │
│ Fable 5 · Most capable for your hardest and longest-running tasks    │
├──────────────────────────────────────────────────────────────────────┤
│ Haiku                                                                │
│ Haiku 4.5 · Fastest for quick answers                                │
├──────────────────────────────────────────────────────────────────────┤
│ Opus (1M context)                                                    │
│ Opus 5.5 with 1M context · Best for everyday, complex tasks          │
├──────────────────────────────────────────────────────────────────────┤
│ Sonnet                                                               │
│ Sonnet 5 · Efficient for routine tasks                               │
└──────────────────────────────────────────────────────────────────────┘
```

**Selected field**

```
Default LLM Model (Global)
┌──────────────────────────────────────────────────┐
│ Anthropic / Default (recommended)             ⌄  │
└──────────────────────────────────────────────────┘
```

Problems: no exact model ID anywhere; "Default (recommended)" and
"Opus (1M context)" look like two different models but are the same one.

---

## 2. Proposed: dropdown list

One row per real model. **Main line = exact model ID.** Second line = Claude's
own name + description, so the user still recognises it.

```
ANTHROPIC
┌──────────────────────────────────────────────────────────────────────┐
│ claude-opus-5-5[1m]                        [Recommended]         ✓   │
│ Opus (1M context) · Opus 5.5 with 1M context · Best for everyday,    │
│ complex tasks                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ claude-fable-5                                                       │
│ Fable · Fable 5 · Most capable for your hardest and longest-running  │
│ tasks                                                                │
├──────────────────────────────────────────────────────────────────────┤
│ claude-haiku-4-5-20251001                                            │
│ Haiku · Haiku 4.5 · Fastest for quick answers                        │
├──────────────────────────────────────────────────────────────────────┤
│ claude-sonnet-5                                                      │
│ Sonnet · Sonnet 5 · Efficient for routine tasks                      │
└──────────────────────────────────────────────────────────────────────┘
```

Notes:
- 4 rows instead of 5 — the separate "Default (recommended)" row is merged into
  the Opus row because both run `claude-opus-5-5[1m]`.
- The "Recommended" tag goes on whichever row Claude's `default` currently
  points to (today: Opus).
- New configs start from the definition's saved default model, same as today.
  When that saved value is `default` (as in the screenshot), the field shows
  the Recommended row. (SR-003 correction: today's "Default" pre-selection
  comes from the definition's saved default, not an automatic pick.)

### Search

| User types | Rows shown |
| --- | --- |
| `opus` | `claude-opus-5-5[1m]` |
| `claude-haiku` | `claude-haiku-4-5-20251001` |
| `haiku` | `claude-haiku-4-5-20251001` (matches name too) |
| `recommended` | `claude-opus-5-5[1m]` |

---

## 3. Proposed: after the user selects

**User picks Sonnet**

```
Default LLM Model (Global)
┌──────────────────────────────────────────────────┐
│ Anthropic / claude-sonnet-5                   ⌄  │
└──────────────────────────────────────────────────┘
```

**User picks the recommended Opus row**

```
Default LLM Model (Global)
┌──────────────────────────────────────────────────┐
│ Anthropic / claude-opus-5-5[1m]               ⌄  │
└──────────────────────────────────────────────────┘
```

Same format everywhere a Claude Agent SDK model is shown in run config:
agent run config, team run config (global default), and team member override.

---

## 4. Special cases

### 4a. Opening a config saved before this change as "Default"

The saved value `default` is matched to the row it points to. No warning.

```
Default LLM Model (Global)
┌──────────────────────────────────────────────────┐
│ Anthropic / claude-opus-5-5[1m]               ⌄  │
└──────────────────────────────────────────────────┘
```

### 4b. After a Claude CLI upgrade moves Opus to a newer model

A saved Opus choice follows the new Opus, and the label shows the new ID —
the user always sees what will actually run.

```
Before upgrade:   Anthropic / claude-opus-5-5[1m]
After upgrade:    Anthropic / claude-opus-6[1m]      (example)
```

### 4c. Claude SDK gives no exact ID for a model

Label falls back to Claude's own model value — never blank, never a guess.

```
│ sonnet                                                               │
│ Sonnet · Sonnet 5 · Efficient for routine tasks                      │
```

---

## 5. Unchanged

- What is actually sent to Claude (Claude's own value, e.g. `opus[1m]`,
  `sonnet`, `claude-fable-5[1m]`) and what is saved.
- Codex, AutoByteus and other runtime dropdowns.
- Token-usage / analytics screens.
