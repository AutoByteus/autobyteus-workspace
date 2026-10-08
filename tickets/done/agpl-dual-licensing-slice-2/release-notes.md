## License change
- AutoByteus is now dual-licensed. It is open source under the **GNU Affero General Public License v3.0 only (AGPL-3.0-only)**, and a **commercial license** is available for closed-source products or services (contact ryan.zheng.work@gmail.com).
- If you distribute AutoByteus or a modified version, or let others use a modified version over a network, you must publish your complete source code under AGPL-3.0, unless you have a commercial license.
- The application SDKs, devkit, contract packages and sample applications keep their existing permissive license, so applications built on them may use any license.
- Releases up to and including v1.4.97 remain available under the license they were published with.
- See `LICENSING.md` in the repository for the component map and details.
- The desktop app now ships `LICENSE`, `LICENSING.md` and `NOTICE`. The macOS About panel shows the copyright and license line.
- The Docker image contains the same files under `/app/` and declares `org.opencontainers.image.licenses=AGPL-3.0-only`.
- Contributions now require accepting the AutoByteus Contributor License Agreement (`CLA.md`). See `CONTRIBUTING.md`.

## Added
- **Archive all runs** from a group header in the Workspaces sidebar, for every agent, agent team and Agent Org group. A confirmation is shown first, and nothing is archived while a run in the group is still running.
- Agents can attach files to a Project Task. `create_or_update_task` takes an optional `context_files` list. The files appear in the Task's Context Files and are passed to the worker as reference files when the Task is delegated.

## Fixes
- Restored the people-group icon for all Teams in the workspace history, Agent Org rows, Project Task workers and Memory views.
