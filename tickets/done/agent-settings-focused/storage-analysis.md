# Where a team member's settings live: analysis and recommendation (autobyteus-366)

Evidence IDs (E-*, M-*) are in `investigation-notes.md`. Nothing has been changed.

## Short answer

1. **The Settings problem does not depend on storage.** The app already knows who is focused and already has that agent's settings loaded (E-10, E-11). Settings can show one agent with no stored-data change.
2. **Recommendation: keep members' settings in the team's tree for now.** The idea is sound as a model, but today it would bring a migration of the user's data, slower listings and a weaker save, with no change he could see. Revisit it when members need to live independently of their team.

## What the team's tree holds today for each member

| Field | Where it would go if moved |
| --- | --- |
| `platformAgentRunId` (the runtime's session) | member's own file |
| `launchConfiguration`: runtime, model, model settings, tool approval, workspace | member's own file |
| `pendingRuntimeSwitch` (autobyteus-348, not merged yet) | member's own file |
| `agentDefinitionId` | member's own file (also needed in the team, to rebuild its layout) |
| `agentRunId` | stays: the link |
| `address`, `role`, `description` | stays: the member's place in this team |

**The team keeps in any case:** definition and name, coordinator, default settings, handoff rules, delegated-run links, application binding, dates.

A member's own folder already holds its memory (traces, file changes, journal). It has **no** `run_metadata.json` (E-03). So the user's picture is right: a member is nearly an agent run already, and only its settings live elsewhere.

## The same facts are stored in four shapes today

| Who | Where its settings are | Shape |
| --- | --- | --- |
| Standalone run | its own `run_metadata.json` | `AgentRunMetadata` |
| Delegated Agent copy | its own `run_metadata.json` | `TaskAgentRunMetadata`: started launch plus a user choice beside it |
| Team / Org member | the team's or org's tree | `ConfiguredAgentExecutionNode` |
| Member of a delegated Team copy | the copy's own tree | `source.members[]` plus `userLaunchSelection` plus a team-level selection |

This is the real cost of today's design: autobyteus-348 needed 78 source files to carry one pending switch across these kinds (M-03). Moving Team and Org members alone would **not** end it: the delegated-copy shapes would stay different, because they keep "started with" and "user's choice" apart on purpose.

## Why copies got their own files, and whether that applies to members

| Reason for copies (E-06) | Team / Org member |
| --- | --- |
| Started one by one over a hub's lifetime of months; the hub's tree would keep growing | Fixed when the team starts: 4–25 members; trees are small (median 5 KB, max 31 KB; M-01) |
| Independent lifetime: stopped, woken and closed on its own | Stopped and started with its team |
| Can run on another node | A member stays with its team |
| The project's rule: "a run owns its own content" for a **delegated** run (CM-8) | The model calls a member a **part** of one run (CM-9) |

So the reasons that justified own files for copies do not carry over today. They **would** carry over if members become independent.

## The options

| | A. Keep the tree (recommended) | B. Each member gets its own `run_metadata.json`; the tree keeps links |
| --- | --- | --- |
| Settings shows one agent | Yes | Yes, the same work: no easier |
| What the user sees change | Settings only | Settings only: storage adds nothing visible |
| Stored data | None | Migration: 721 team and 26 org trees, about 3,190 new files on his install, and every other node. Backup and his approval first. An older build could not read migrated runs |
| Saving a whole-team change | One atomic file (E-09) | Many files: a crash can leave some members changed and some not, so it needs new handling |
| A damaged file | The team is unavailable, with the reason | A member's file can be damaged alone. For a copy the rest loads without it (E-07), but a team cannot run without a member: more failure cases, no fewer |
| Loading | One file per team | One plus one per member: listing's file reads go from 42 ms to 152 ms (3.6×, synthetic, M-02), and open and resume read more. This goes against autobyteus-358. Small at today's size, but it grows with every run kept |
| Runtime switch (autobyteus-348) | Merges as built | Its pending switch moves to the member's file. Its rule is unaffected; its record adapters and `switch-member-record-contract.md` change. Must follow 348, not run alongside it |
| Code | Web only | Team and Org tree stores and schemas, the split and compose layer (reusable, E-07), a sealed migration with its tests. Readers can stay as they are if the tree is composed at load. Estimate from the code, not built: Large, High risk |
| Gain | The user's complaint is solved | One clean rule ("every run owns its settings"), a smaller tree, a save of one member writes one small file. Still two shapes unless delegated Team copies move too |

## What would change the recommendation

Choose B when members need to live on their own: for example stopping or resuming one member while the rest of the team runs, moving one member to another node, or teams that grow over time. Those are the same reasons copies got their own files.

Editing one member while its team runs is today blocked by a rule ("the Team/Org must be stopped for the edit", E-12), not by storage. So it can be built with or without B.

If B is ever chosen, it comes after autobyteus-348 merges, as its own ticket, with a backup.

## Effect of the recommendation

- **Settings:** this ticket's build. No stored data changes.
- **autobyteus-348:** nothing changes in its design. The Settings work overlaps six of its web files, so it starts after 348 merges.
- **autobyteus-358:** its loading gains stay as they are.
- **Stored data:** none.
