# Claude Haiku model-behavior observation

- The first Claude row used authenticated `claude_agent_sdk` with `haiku`.
- Product/runtime evidence succeeded through Team launch, persistent message/reply, nested Team task activation, exact task-scoped `student_one -> student_two` `send_message_to`, reference delivery, and clean termination.
- Haiku did not elect the reverse `student_two -> student_one` tool call, so the agent waited and did not submit. This is retained as a nonblocking model/prompt-behavior observation under CR-PREM-032, not a product/source failure.
- The public record proves the post-IR-035 outbound task-scoped request used the exact fresh child task-Team identity and did not fall back to persistent routing.
- A fresh authenticated Claude Sonnet row will be executed for the complete provider journey. No production fixture or operational data is changed.
