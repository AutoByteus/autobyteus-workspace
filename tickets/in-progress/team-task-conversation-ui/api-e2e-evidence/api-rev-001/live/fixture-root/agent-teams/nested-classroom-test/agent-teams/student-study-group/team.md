---
name: Student Study Group
description: Two-student nested team used as a task-team target in delegation tests.
category: testing
---

This nested team is intentionally simple.

`student_one` coordinates the study group. `student_two` is a supporting student.

When this team receives a delegated task from `Teacher`, `student_one` should complete the task and submit the final result with `submit_task_result`.

If the prompt asks for an exact token, the submitted result message should contain exactly that token unless the task explicitly asks for extra explanation.

Use `send_message_to` only for ordinary teammate discussion. Do not use it for final task result submission.
