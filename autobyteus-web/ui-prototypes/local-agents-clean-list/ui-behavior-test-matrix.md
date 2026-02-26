# UI Behavior Test Matrix

| flow | screen | trigger | expected next state image | acceptance check | open question / risk |
| --- | --- | --- | --- | --- | --- |
| local-agents-management | local-agents-list-clean (default) | User scans page after load | `images/web/local-agents-management/local-agents-list-clean-default.png` | Header, search/filter row, summary strip, and card grid are visually tiered and non-competing. | Should summary strip remain if users have fewer than 4 agents? |
| local-agents-management | local-agents-list-clean (default) | User compares two adjacent cards | `images/web/local-agents-management/local-agents-list-clean-default.png` | Card heights and internal alignment remain consistent; scanning left-to-right is effortless. | Is one-line description enough for all agent categories? |
| local-agents-management | local-agents-list-clean (default) | User decides to run an agent | `images/web/local-agents-management/local-agents-list-clean-default.png` | Primary Run action is immediately discoverable and clearly dominant over Details. | Should Run become icon+label for faster recognition? |
