# Ticket Request

## Title

Restore Electron agent-input submission, voice transcription, and context-file controls

## Requested Base

Bootstrap from the latest tracked `origin/codex/agent-team-universal-task-delegation` state.

## User-Observed Regressions

The user is running the Electron application built from the AgentTeam universal-task-delegation branch and reports four related input-area regressions:

1. After entering a message and pressing Enter, the message appears correctly in the event monitor, but the submitted text remains in the input box and must be deleted manually.
2. Voice input enters the recording state when **Speak** is clicked, but after **Stop** the recognized text does not appear in the input box.
3. After pasting an image into the context-file area, neither the individual remove control nor **Clear all** removes it.
4. A pasted context image is not shown in the event monitor after submission, and it is unknown whether the attachment is delivered to the backend at all.

The user then confirmed that standalone Agent text submission clears normally and standalone Agent voice input works. The text-clearing and voice-transcript failures are therefore AgentTeam-only. The user expects these behaviors to match the released `origin/personal` application and suspects they were broken during the AgentTeam universal-task-delegation refactor. Compare the ticket base with `origin/personal`, locate the actual regression paths, and fix them as one bounded AgentTeam composer-state ticket unless investigation proves a backend contract regression is also involved.

## Investigation Safety

- Do not stop, replace, or interfere with the Electron instance the user is currently running.
- Do not run automated validation against the user's production data profile.
- Use isolated fixtures/test profiles for later executable validation.
