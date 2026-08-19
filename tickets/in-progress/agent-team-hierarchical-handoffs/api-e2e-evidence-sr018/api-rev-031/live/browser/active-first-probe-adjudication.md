# First active probe adjudication

The first correctly bound active browser execution exercised IR-037 successfully but its temporary result predicate was too strict in two ways:

- It expected exactly one record to carry the reference. The real request and exact reply each truthfully carried the same reference, producing two valid records. The acceptance requirement is exact reference availability, not exactly one reference-bearing record.
- It read the Details button label as though it were the message-count label. The real MobileTeamMessages tree contained two distinct message rows and opened the exact path/content/back lifecycle.

The product observations were Pass: desktop 2 messages with exact reference path/content; mobile 2 messages with exact reference path/content/back; selected Team config read-only; exact reply once; no console errors; clean termination. The temporary predicate was corrected without changing product source or durable coverage. A fresh active browser run follows so the canonical result file is directly passing rather than inferred.

The second temporary predicate read the summary before expanding the detail component triggered hydration. Direct post-hydration evidence was again correct: two MobileTeamMessages rows and the final screenshot visibly showed `Messages · 2` plus `2 messages; open details for full text.` The probe was moved to read that summary after hydration/back, and a fresh canonical run follows.
