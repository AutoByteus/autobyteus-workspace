## What you need to do
- **The first start removes two retired built-in agents: the Skill Self-Evolver and the Memory Compactor.** Their installed agent folders are deleted and no copy is kept. Your other agents, every run and its history (the old Memory Compactor runs included) and all memory files stay as they are. If you want a copy of the two agents, back up your agents folder before you update.
- **If a Team or Org you made lists the Skill Self-Evolver or the Memory Compactor as a member, replace that member.** After the update that Team or Org no longer works as it did, because the member's definition is gone.
- **Update this desktop app and every paired node to this release** to message running agents on another node: a paired node on an older release does not know the new requests, and its agents cannot be listed or messaged by run ID.
- **Docker nodes:** run `autobyteus-docker upgrade --all`. Nodes on the beta track get this beta; nodes on the stable track stay on 1.5.13 (switch a node to the beta track once with `autobyteus-docker upgrade --all --tag beta`).
- **Desktop:** with **Settings > Updates > Receive beta updates** on, the app updates itself to this beta.

## Good to know
- Going back to an older version after this update has not been checked. If you need to go back, contact support instead of installing an older version. The two removed agents do not come back.
- `list_running_agents` is given to no agent until you select it in that agent's tool list.
