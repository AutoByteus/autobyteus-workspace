# autobyteus-305 — Docker nodes update their server in place: options, recommended design, build order, questions

Status: presented to the user for approval (SR-002, 2026-10-30: re-analysed on the latest `origin/personal` @ `9d59ab82ec`, numbers re-measured, feasibility proven). Nothing is built yet.
Evidence: `investigation-notes.md` (same folder). Requirements: `requirements-doc.md`.

## 1. Answer in short

Yes, it works and it is worth it. Think of the container as a machine. The machine (Ubuntu, Node, Chromium, the
agent CLIs) stays. Only the AutoByteus server inside it is replaced. A small, stable **starter** in the image
runs the server build kept in a volume. On your click, the node downloads the new build, checks its signature,
prepares it while the old version keeps working, then switches with a short restart. If anything goes wrong,
the old version keeps running, or is brought back. A new image is needed only when the machine itself changes,
and the node then says so.

## 2. What happens today (measured)

- Every release builds one image holding the system and the server together. `autobyteus-docker upgrade --all`
  pulls it and recreates each container. Named volumes are kept; anything else installed in the container is lost.
- **23 releases in 8 days** (1.5.9-beta.1 on 10-23 to 1.5.11-beta.5 on 10-30).
- **Download per upgrade: 1.38–1.40 GB on arm64, 1.41–1.44 GB on amd64** (measured from the registry on the six
  newest releases). Of that:
  - **0.85–0.89 GB is the agent CLIs**, and growing. The build reinstalls them at "latest" every release (a
    cache-buster forces it).
  - **0.53 GB is a node_modules folder for the whole workspace.** It includes desktop build tools the server never
    loads: app-builder 206 MB, Monaco 99 MB, Mermaid 82 MB and others.
  - **About 7 MB is the server's own new code.**
- **The machine part never changed.** Ubuntu, Chromium and the desktop base (1.16 GB) were byte-identical in all 23
  releases. Your premise is right.
- **A production server build on its own is 313 MB compressed** (measured: built from a clean clone on Linux,
  arm64). Trimming leftovers like TypeScript and esbuild can make it smaller.
- **That build runs on today's image unchanged.** Mounted read-only into the published image, it started and was
  healthy in 7 seconds. The in-place idea works on the real system, not only on paper.
- The node does not know or report its release version, and the desktop shows none.

**Is this common?** Yes. VS Code Remote does exactly this: the desktop downloads the server build matching its own
version into the remote machine or container. WordPress and Nextcloud update their own code inside their
containers. Phones and ChromeOS keep the old copy so a failed update falls back. The counterpoint is that Docker
practice prefers never changing a running image. That is why this design uses only signed builds, has each node
report exactly what it runs, and keeps the image as the way to change the machine itself.

## 3. The options

| | A. In-place update (your idea) | B. Middle way: smaller images plus an "upgrade this node" button |
| --- | --- | --- |
| Download per release | 0.31 GB (server build only, measured; shared by the nodes on one machine) | About the same, if we stop reinstalling the CLIs per build and put a server-only node_modules in the image |
| Container | Kept: nothing installed in it is lost | Recreated every release (306's losses remain) |
| Who can do it | Anyone at the desktop, for any node it can reach, including a friend's machine | Only someone with Docker on that machine. The desktop could do it only for nodes on its own machine, and only by driving Docker from the app (a new, privileged ability) |
| A bad release | The node brings the old version back by itself | Manual: pin an older image tag |
| Agent CLIs | Stay at the image's versions between image upgrades | Same, once we stop reinstalling them per build |
| Cost to build | Starter, signed builds, a builds volume, one small update contract kept stable across versions | Dockerfile changes plus a desktop button that runs Docker |

**Recommendation: A.** Its real wins are three things B cannot give: the container is kept, a failed update
undoes itself, and the desktop can update a node on another machine. A also includes B's cheap part (a
server-only node_modules), so images get smaller for everyone too.

## 4. Recommended design (proposal; the binding design follows your approval)

**Layout**
- **Image (the machine):** Ubuntu, Node, Chromium, apt tools, agent CLIs; the **starter**; the AutoByteus
  **public key**; a note of the **system layer** it provides; and a **built-in server build**. The built-in build
  is the same signed build published for that release, so a new node starts current.
- **Builds volume (new, shared by the launcher's nodes on one machine):** downloaded server builds. Each node runs
  its own choice (current and previous). Your data volume is not touched by this.

**Who does what**
- The **starter** owns the update from start to finish: download, verify, prepare, switch, health check, fallback.
  It is the parent of the server process (supervisord runs the starter instead of the server).
  - It is small and changes only with the image. A broken server release therefore cannot break its own way back.
- The **server** only passes the request on and reports status: its version, update progress, last result, and
  "new image needed".

**An update, step by step**
1. **Request.** Either you click "Update to this app's version" in the desktop, or the owner runs
   `autobyteus-docker update [--name <node> | --all] [--version X]` on the host. Without `--version`, the command
   takes the newest version on the node's track. The command runs inside the container through Docker, not over
   the network.
2. **Checks.** X must be newer than the running version. Phones are refused. No agent tool exists. The request is
   logged with where it came from.
3. **Description and signature.** The node downloads the build description for X and its architecture, and the
   signature, from the GitHub release, then checks the signature with the key in the image.
4. **Fit.** The description says what the build needs: the Node module version, the architecture, and the system
   layer. If the image cannot run it, the node refuses here: "this update needs a new Docker image: run
   `autobyteus-docker upgrade --all`".
5. **Download and unpack.** The node downloads the archive (or reuses the copy another node on the machine already
   fetched). Its SHA-256 must match the signed description. It unpacks into a temporary folder; only a complete
   unpack is usable.
6. **Self-check.** The new build starts in a check-only mode. It loads every module, native addon and the Prisma
   engine without opening your data. It must pass.

   Up to here the old version keeps serving. Any failure in steps 1–6 changes nothing.
7. **Stop.** The old version stops within a bounded time (autobyteus-284). The runs that were mid-turn are recorded
   for resume (restart-and-resume).
8. **Data copy, only when needed (Q5).** If the new version brings a data migration the running one does not have (3 of the last 23 releases did), the node copies the data volume. Otherwise no copy is taken.
9. **Start and confirm.** The new version starts. It must start listening, finish its startup and stay up for a
   short window.
   - **Success:** the new version is current. The previous build is kept; older builds and any data copy are removed.
   - **Failure:** the new version is stopped, the data copy is put back, and the old version starts. The result
     reads "failed after switch; old version restored". The failed version is not retried by itself.
10. **Resume.** Mid-turn runs continue by themselves, with no prompt and no click: your decision for app-update restarts (2026-10-30) applies here too.

**The system-layer check.** One number in the repository, the system-layer level, is raised when the server
starts to need something new from the image. CI fails if the image's system part changed without raising it. The
image records the level it provides and each build the level it needs. Together with the Node module version and
the architecture, this is how a node knows that a build needs a new image.

**A partial release.** If the requested version has no published server build (a release whose Docker workflow
failed), the node refuses with "no server build was published for X" and nothing changes.

**Release.** The Server Docker Release workflow also takes the server build out of each architecture's image,
writes its description, signs it, and uploads three files per architecture to the GitHub release. A release then
has 23 assets instead of 17.

**Moving to a new image later** (the machine changed). `upgrade --all` works as today. A node never moves back:
if its installed version is newer than the image's built-in one, it keeps the installed version, as long as the
new image can run it.

**First time.** The first image with the starter is installed the old way, with one last `upgrade --all`. That
run also adds the builds volume.

## 5. Build order (each step is reviewed and merged on its own)

| Step | What | Useful alone | Waits for |
| --- | --- | --- | --- |
| 1 | **Signed server build.** Separate the server build in the Dockerfile with production-only node_modules. The release workflow publishes build, description and signature per architecture. The image carries the same build, the public key and its system-layer level. Includes the CI check of that level | Smaller images; signed builds exist | Your signing key (Q3) for real releases; tests use a test key |
| 2 | **Starter and builds volume.** The image starts the server through the starter. The launcher (bash and PowerShell) adds the volume. The node reports its version | Nodes report their version | Step 1 |
| 3 | **In-place update by command.** Steps 1–9 above, the data copy, the fallback and the status. Proven on a real Docker node built from a clean clone, with two locally built signed versions: success, tampered build, wrong key, needs a new image, fails at start, fails after migrations | You can stop pulling images | Step 2 |
| 4 | **Desktop.** Each node's version beside the app's, "Update to this app's version", progress, result, "new image needed" | One click per node | Step 3 |
| 5 | **Mid-turn runs come back.** The update uses the bounded stop and passes the resume choice | The full done-when demo | autobyteus-284 (code review passed 2026-10-30, not merged yet), autobyteus-285 and autobyteus-287 (not started) |

Then the done-when demo on a real Docker node: it updates to the desktop's version without a new image, a failed
update leaves the old version running, and mid-turn runs come back. No public release unless you ask.

Size and risk: large and high risk (it downloads and runs code), so it goes through independent architecture review.

## 6. Questions for you (each with my recommendation)

1. **In-place (A) or the middle way (B)?** Recommend **A**, for the three reasons in §3.
2. **Who triggers?** Recommend **only you**: a click in the desktop or the host command. The desktop shows when a
   node is behind but never updates it by itself. There is no automatic option, the same as your rule that the
   app itself is never updated automatically.
3. **Source and verification?** Recommend **GitHub release assets, signed with an AutoByteus Ed25519 key.** You
   create the private key once as a GitHub Actions secret (we give you the command). The public key goes into the
   image, and the node checks with Node's built-in crypto (already tested in today's image). A SHA-256 alone
   would only prove the file matches what the same server says.
4. **Your node vs a friend's node?** Decided (2026-10-30): **the same for every node, no extra switch.** Phones can never
   update a node; each request is logged with where it came from. (Real sign-in between nodes is autobyteus-300's job.)
5. **If the new version starts, changes data, then fails?** Recommend **a copy only when the update brings a data
   migration** (3 of the last 23 releases). That copy is taken after a free-space check, put back only if the new
   version does not come up, and deleted as soon as the new version is confirmed working; it exists only during the switch. All other updates
   take no copy: without a migration the old version runs fine on the data as left.
6. **Agent CLIs stay at the image's versions on in-place nodes.** Recommend accepting that here and opening a
   separate Task: let Settings → Agent Runtimes update CLIs on Docker nodes (into a volume; fits with 306). Until
   then, an image upgrade refreshes them.
7. **Exception to DESIGN.md rule 9.** A newer desktop must be able to ask an older node to update. Recommend
   **one narrow exception, written into rule 9**: the node-update contract (version, status, update request) and
   the build description stay unchanged across versions. Everything else stays clean-cut.

## 7. Not in this ticket

- 306: software and logins across image upgrades. The Chromium profile and `/root` are already volumes today, so
  what is lost is software installed outside them (FU-001).
- CLI updates on Docker nodes (Q6).
- The desktop's embedded server, which its own updater handles.
- Authentication between nodes (300).
