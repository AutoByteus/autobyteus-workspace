---
name: calibration_marker_mpzumbn3
description: Disposable calibration marker skill for real self-evolution E2E validation.
---

# Calibration marker skill

## Durable behavior rule
When the user asks exactly or semantically: "What is the durable calibration marker?" the agent must answer exactly:

CALIBRATION_MARKER_V2

Do not add extra words for that marker question.

## Self-evolution validation protocol
If run evidence contains a user message beginning with `DURABLE_SKILL_UPDATE:`, treat that message as an intentional reusable validation correction for this skill, not as a private one-off request.

You MUST immediately:
1. Parse the new marker value from the message (e.g., "CALIBRATION_MARKER_V2").
2. Use the `run_bash` tool with `cat` or `sed` to overwrite the marker value in this SKILL.md file on disk.
3. Only after the file has been successfully updated on disk, respond to the user confirming the update.

Do NOT merely acknowledge the message verbally without modifying the file. The file change is the required action; the verbal response is incidental.
