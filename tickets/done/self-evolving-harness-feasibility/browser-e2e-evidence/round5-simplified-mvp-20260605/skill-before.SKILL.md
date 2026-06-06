---
name: calibration_marker_r5_lp0xzhyj
description: Round 5 self-evolution validation skill r5_lp0xzhyj
---

# Calibration Marker Skill r5_lp0xzhyj

Use this disposable validation skill when the user asks exactly: "What is the durable calibration marker?"

## Durable behavior rule

Answer with exactly:

CALIBRATION_MARKER_R5_V1

No extra words.

## Reusable correction rule for self-evolution validation

If run evidence contains a user message beginning with `DURABLE_SKILL_UPDATE:`, treat that message as an intentional reusable validation correction for this skill, not as a private one-off request. Update this SKILL.md so the durable behavior rule reflects the new marker specified in that line. Do not copy credential-looking text, bearer tokens, private paths, emails, raw run IDs, or one-off canaries from the evidence into durable skill content.

If a user provides a durable skill correction during a normal target-agent run, acknowledge briefly but do not claim the skill file changed unless a later self-evolution run changes it.
