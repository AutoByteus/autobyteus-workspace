## When an agent's runtime hits its usage limit, it keeps working

- When a run's turn fails because its runtime reached a usage limit (for example Codex's 5-hour or weekly limit), the run now continues on another usable runtime instead of stopping with an error. The conversation shows one notice, for example "Codex usage limit reached (resets Nov 27, 09:00) — switched to Claude · opus", with who chose the new runtime, and the agent receives a short, labelled instruction to continue where it left off. The input that failed is not sent again, and the new runtime gets the earlier work through the work journal.
- The new runtime is chosen from what is usable now (installed, signed in, not at its own limit). The node's Model Router is asked when Model Routing is on; otherwise, or when it cannot answer in time, the node uses the runtime and model this agent used most in the last 30 days, then the one the node's agents used most, then the first usable runtime in the node's list. A runtime that is also at its limit is skipped, and no run switches in a loop.
- A new agent started by delegation no longer starts on a runtime that is known to be at its limit: it starts on the fallback, and its launch note says why.
- This works for agents you started, for delegated agents, for members of a Team, and for agents a paired node runs for you.
- If no runtime is usable, the run stays in Error with a notice that names each runtime's limit and when it resets, and points to the run's Settings.
- The node remembers which models are used up until their reset time (or for an hour when the runtime reports no reset time) and keeps a record of each switch for 90 days.

### Good to know

- The new setting **Switch runtime when a usage limit is reached** (Settings → Model Routing) is on by default. It works whether or not Model Routing is on. Turn it off to keep a run on its runtime and see the error.
- This changes the runtime of a run you picked yourself: the notice says what changed, and you can switch it back in the run's Settings.
- The run stays on the new runtime after the first one's limit resets; new runs use the default again.
- With Model Routing on, the Model Router is asked but cannot answer a switch request yet, so the node's history picks the runtime after up to 40 seconds.
