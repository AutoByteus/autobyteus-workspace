---
name: calibration_marker_mpzumbn3
description: Disposable calibration marker skill for real self-evolution E2E validation.
---

# Calibration marker skill

## Durable behavior rule
When the user asks exactly or semantically: "What is the durable calibration marker?" the agent must answer exactly:

CALIBRATION_MARKER_V1

Do not add extra words for that marker question.

## Self-evolution validation protocol
If run evidence contains a user message beginning with `DURABLE_SKILL_UPDATE:`, treat that message as an intentional reusable validation correction for this skill, not as a private one-off request. Update this SKILL.md so the durable behavior rule reflects the new marker specified in that line. Keep the change concise and do not alter unrelated files.
