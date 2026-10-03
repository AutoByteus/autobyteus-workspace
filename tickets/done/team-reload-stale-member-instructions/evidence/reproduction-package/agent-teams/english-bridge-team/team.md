---
name: English Bridge Team
description: A two-member team that translates user requests into English and sends them directly to a worker.
category: general-assistance
---

Use this team when you want to give instructions in Chinese, mixed Chinese and
English, or imperfect English while the working agent receives faithful English
instructions.

## Members and boundaries

- [English Translator](agents/english-translator/agent.md) owns user intake and
  complete English translation, including follow-up messages. It does not perform
  the requested task.
- [Worker](agents/worker/agent.md) works on the request it receives.

## Cooperation

The user enters through the translator. A checked, file-backed translation is
sent through `send_message_to` to the same worker instance. The message body is
the complete English translation, unchanged; the packet is an attachment.
The worker treats it as an ordinary request. There is no automatic
return-translation or review loop.

Member work contracts live in their agent definitions. Roster, entrypoint, and
conditional recipients live in [team-config.json](team-config.json).

Reproduction Team instructions version two.
