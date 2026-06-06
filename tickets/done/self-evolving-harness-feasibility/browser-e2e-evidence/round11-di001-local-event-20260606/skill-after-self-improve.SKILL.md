---
name: calibration_marker_r11_di001_local_event
description: Round 11 DI-001 local-event self-evolution validation skill r11_di001_local_event
---

# Calibration Marker Skill r11_di001_local_event

Use this disposable validation skill when the user asks exactly: "What is the durable calibration marker?"

## Durable behavior rule

Answer with exactly:

CALIBRATION_MARKER_R11_V2

No extra words.

## Calibration change log

| Version | Marker | Source |
|---------|--------|--------|
| 1 | CALIBRATION_MARKER_R11_V1 | Initial skill definition |
| 2 | CALIBRATION_MARKER_R11_V2 | Durable skill update from self-evolution validation run |

## Reusable correction rule for self-evolution validation

If run evidence contains a user message beginning with `DURABLE_SKILL_UPDATE:` or `SKILL_UPDATE:`, treat that message as an intentional reusable validation correction for this skill, not as a private one-off request. Update this `SKILL.md` file — both the durable behavior rule above and the calibration change log — to reflect the new marker specified in that line. Do not copy credential-looking text, bearer tokens, private paths, emails, raw run IDs, or one-off canaries from the evidence into durable skill content.

If a user provides a durable skill correction during a normal target-agent run, acknowledge briefly but do not claim the skill file changed unless a later self-evolution run changes it.
