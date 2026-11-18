## Improvements

- Long-running manager runs stay light. When a Task is closed (DONE or CANCELLED), the agents and teams that were delegated for it leave the tree of the run that delegated them once they have stopped. Opening that run no longer reads the conversations and files of finished work, so a run that has delegated many Tasks over weeks opens as quickly as one with few.
- Finished work comes back when needed. When a closed Task is reopened and its assigner messages the delegated run, or the same run is given a follow-up Task, the run continues with its conversation and appears in the tree again, also in a view that was already open or opened after a restart.
- Nothing you see is lost. The Team tab keeps every message with finished runs, under the other agent's name. The Memory page keeps listing finished delegated runs, and token totals and earlier attachments are unchanged.

## Upgrade Notes

- No data migration runs. Saved runs open unchanged; the old lists of delegated runs in saved files are ignored and left out the next time each file is saved.
- Delegated runs from builds before mid-October 2026 that belong to no Task are no longer shown under the run that started them. Their conversations stay on disk and on the Memory page.

## What you need to do

- After updating, do not go back to an older version on the same data: an older build would not see agents delegated after the update. If you need to go back, contact support instead of installing an older build.
