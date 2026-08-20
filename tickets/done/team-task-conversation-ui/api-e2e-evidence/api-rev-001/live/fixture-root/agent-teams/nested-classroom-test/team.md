---
name: Nested Classroom Test Team
description: Minimal nested-team fixture for testing delegate_task to an agent-team target.
category: testing
---

This is a deliberately tiny nested-team package for validating task-team delegation.

## Members

- `/Teacher` is the top-level coordinator.
- `/StudentStudyGroup` is a nested agent team with two students.
  - Its coordinator is `/StudentStudyGroup/student_one`.
  - `/StudentStudyGroup/student_two` is available for ordinary teammate communication inside the nested team.

## Intended Test Flow

Use a prompt like:

> Please test nested team delegation. Delegate one task to `/StudentStudyGroup` and ask the students to return exactly NESTED_CLASSROOM_OK. Accept the result if it matches.

Expected behavior:

1. `/Teacher` calls `delegate_task` with the exact rooted team address:
   `delegate_task({"recipient_address":"/StudentStudyGroup","description":"..."})`.
2. The runtime creates a task-team execution for `/StudentStudyGroup`.
3. `/StudentStudyGroup/student_one`, as the nested team coordinator, submits the result with `submit_task_result`.
4. `/Teacher` reviews the result with `review_task_result` and accepts it when the expected token is present.

## Tool Contract Notes

- `/Teacher` has `delegate_task`, `review_task_result`, and `send_message_to`.
- `/StudentStudyGroup/student_one` has `submit_task_result` and `send_message_to`.
- `/StudentStudyGroup/student_two` has `send_message_to` only.
- Do not use `send_message_to` for task result submission, revision requests, acceptance, or finalization. Task lifecycle must use `delegate_task`, `submit_task_result`, and `review_task_result`.
