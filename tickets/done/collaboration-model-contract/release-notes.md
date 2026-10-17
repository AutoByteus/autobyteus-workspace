## What's New
- Collaboration now follows one rule: inside your run you message with `send_message_to`; outside your run you delegate with `delegate_task`, then message the copy by its run ID. A single Collaboration Model document describes it.

## Improvements
- An agent that tries to delegate to itself, a teammate or its own Team is refused with guidance to message instead.
- Messaging an address that is not in the run returns "not found" with `delegate_task` guidance. It no longer starts a collaborator or a helper copy.
- The prompts and tool descriptions on all runtimes state the same model.

## Fixes
- Runs that earlier releases recorded as collaborators are converted at startup into ordinary delegated runs. Their conversations and memory are kept, and a second start changes nothing.

## Upgrade Notes
- An agent that messages a converted collaborator by address now gets "not found". Reach converted runs by run ID.
- Memory Sync imports are not converted. Collaborators of Team runs already imported from another node (for example a Docker node) are not listed in the imported Memory explorer until that node runs this release and syncs again. No file is lost.
