# DR-012 stable release evidence — v1.4.71

Recorded: 2026-09-21 (Europe/Berlin)

## Authority and release scope

After accepting and finalizing the complete flat AgentOrg feature line to
`origin/personal`, the user explicitly requested a new release. Delivery used
the repository-standard release helper and the existing public release
workflows. This round publishes the already accepted feature line; it does not
reclassify or re-review the implementation.

- Classification: **Large / High / Reviewed**.
- Pre-release `personal` tip:
  `f80645a202ba6c17bc18c92ba10e9539fc487d69`.
- Release notes commit:
  `6655d1682d0434963624d38f573332e0cab83639`.
- Published release commit:
  `e8b6c3b41f54de4226c98662b6c040ef1e125edf`.
- Annotated tag: `v1.4.71`; tag object
  `7a6125fa285d91efe201ca3f6571b290a7c6a904`.
- Public release:
  <https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.71>.
- Published at: `2026-09-21T10:03:58Z`.
- Draft: false. Prerelease: false.

At the tagged commit, the desktop package and messaging-gateway package both
declare `1.4.71`, and the checked-in managed messaging manifest points to
`v1.4.71` / artifact `1.4.71`.

## Unpublished v1.4.70 attempt

The first canonical helper invocation targeted `1.4.70`. It created and pushed
annotated tag `v1.4.70` (tag object
`fdc8d0144c450add4325c319b2373b9898af5cd6`, commit
`d68fc0f7ba354dcad9d486dc39458feab7f77088`) before the Desktop workflow's
artifact-hygiene gate found 1,110 tracked checkout-hostile paths longer than 200
characters. Delivery did not publish or advertise that version:

- Desktop run `35585845210`: Failure;
- Android run `35585845198`: Failure;
- iOS run `35585845143`: Cancelled;
- Messaging Gateway run `35585845139`: Cancelled;
- Server Docker run `35585845137`: Cancelled;
- GitHub reports `release not found` for `v1.4.70`;
- Docker Hub reports HTTP 404 for server tag `1.4.70`.

The failed tag remains an audit marker and was not moved or force-rewritten.

## Artifact-hygiene recovery

The checkout-hostile material was raw validation evidence rather than product
source. Delivery archived it before removing it from the Git tree:

| Archive | Contents | SHA-256 |
| --- | --- | --- |
| `/Users/normy/.codex/delivery-archives/AORG-FLAT-TEAM-001-v1.4.70-20260921T095333Z/flat-agent-org-api-e2e-evidence.tar.gz` | 3,556 files; 66,045,353 uncompressed bytes | `194f5b061cccc3138b5b82b64ce647a845af7aaf04bd942e14e7434d3b24e98f` |
| `/Users/normy/.codex/delivery-archives/AORG-FLAT-TEAM-001-v1.4.70-20260921T095333Z/retain-activity-final-memory.tar.gz` | 18 files; 121,337 uncompressed bytes | `9224c37c98ae9786cd596c5be117e8ad4608b3edb0091231410a1ce819dc4ee9` |

Per-file SHA-256 manifests are stored beside the archives. Commit
`35a1fb816a72a28353bb29fe204008ba098513e9` removes the raw directories and
adds durable archive notices. The local release hygiene gate then passed across
31,360 tracked files; the longest tracked path was 199 characters.

## v1.4.71 workflow results

| Surface | Initial/recovery run | Result | Source SHA |
| --- | --- | --- | --- |
| Desktop multi-platform release | [35586415979](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586415979) | Success | `e8b6c3b41f54de4226c98662b6c040ef1e125edf` |
| iOS App Store Connect | [35586415950](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586415950) | Success | `e8b6c3b41f54de4226c98662b6c040ef1e125edf` |
| Messaging Gateway | [35586415751](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586415751) | Success | `e8b6c3b41f54de4226c98662b6c040ef1e125edf` |
| Android initial | [35586415916](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586415916) | Failure — obsolete SDK `tools` default in `setup-android@v3` | `e8b6c3b41f54de4226c98662b6c040ef1e125edf` |
| Android recovery | [35586707639](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586707639) | Success | `83e213174b75a5d3d666e70fb03f4a3486cd83ba` |
| Server Docker initial | [35586415837](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586415837) | Failure — new contract workspaces absent from Docker build context | `e8b6c3b41f54de4226c98662b6c040ef1e125edf` |
| Server Docker recovery | [35586953949](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586953949) | Success | `2a11ed7aaac45128276820a570206df2df9c8bfe` |

Android recovery commit `83e213174b75a5d3d666e70fb03f4a3486cd83ba`
updates `android-actions/setup-android` from v3 to v4. Server recovery commit
`2a11ed7aaac45128276820a570206df2df9c8bfe` includes the presentation and
collaboration-stream contract workspaces in the monorepo Docker build/runtime
stages. Both are packaging-only recovery changes after the tagged product
commit. The Docker recovery therefore used `personal` at the latter commit
while publishing version tag `1.4.71`; tagged production application source was
otherwise unchanged.

The iOS workflow completed archive/upload to App Store Connect. That is not a
claim of App Store review approval or storefront availability.

## Published assets and checks

The GitHub release is stable and contains 21 nonempty uploaded assets.

| Primary asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `autobyteus-message-gateway-1.4.71-node-generic.tar.gz` | 47,787,618 | `b346f6e0dfa9cfcf0cc216350d12b95b32b6016befa921752ac6079592eca9d9` |
| `AutoByteus_personal_android-1.4.71-release.apk` | 1,846,691 | `e1932391d845d2c351128ccbb7eb9cb2e1d7998f6b94d53071d0530d54a775f2` |
| `AutoByteus_personal_linux-arm64-1.4.71.AppImage` | 432,268,793 | `7b467207eb31c1b6a07b930ebee7408a9ff95775cef617e6f67a37f8cd947649` |
| `AutoByteus_personal_linux-x64-1.4.71.AppImage` | 444,719,770 | `3ed799fa3b0915048a2e933ebf3d4ac3a80fbf8a02fc2aead8f00833d1eb9f28` |
| `AutoByteus_personal_macos-arm64-1.4.71.dmg` | 501,750,303 | `00b8afc2e61a703a0758740b018b7116f896c58a9bc0c1357e71ab4d3e59a9ca` |
| `AutoByteus_personal_macos-arm64-1.4.71.zip` | 496,611,070 | `882c9152cac488a38dfedde310ceffd0f38c86fc2b8c7554d72a416ad5e8441a` |
| `AutoByteus_personal_macos-x64-1.4.71.dmg` | 523,756,517 | `69db8239a24850a08554523a7964de5aa322589effb97e76f15d5e3b6f597bae` |
| `AutoByteus_personal_macos-x64-1.4.71.zip` | 518,250,730 | `b672b58b643bbbd9f16bc8046f5411dee3dd32265cdf5c9b7684bab1e76c3a59` |
| `AutoByteus_personal_windows-1.4.71.exe` | 320,665,816 | `baaff4d1706023de3660e42e9e776d5c98a5d201fc1592d5f7c186525fbc5f37` |

The four updater YAML files all declare `1.4.71`; every referenced artifact
exists and every declared size matches its release asset. Downloaded metadata
digests matched GitHub's recorded digests. The Android and gateway checksum
files match their assets, the gateway metadata names version `1.4.71`, and the
managed release manifest names tag `v1.4.71` with the correct URLs.

Docker Hub verification:

- `autobyteus/autobyteus-server:1.4.71` digest
  `sha256:d6710356c74c6c36286738d09eba48d55af883c4600e35985c65329a4796bedb`;
- `autobyteus/autobyteus-server:latest` has the same digest;
- linux/amd64 digest
  `sha256:1027287c3f218df332a3eddf610806e974a22fb9d9c254082a9b51f2d6f76ef3`;
- linux/arm64 digest
  `sha256:fe65bcfd48005316d365b1a8ee0b9439f2382b495fd3986504a1399efcdb6199`.

## Preservation and deployment boundary

Before releasing, Delivery protected the unrelated main-worktree state in named
stash `delivery-preserve-before-v1.4.70-release-20260921` and in external backup
`/Users/normy/.codex/delivery-archives/AORG-FLAT-TEAM-001-v1.4.70-20260921T095333Z/unrelated-main-worktree-state.tar.gz`
(SHA-256
`e007fe87b109104a0428d8c4e966707a5b426c6461db6c3287f727c5e87708e6`).
The exact pre-release `package.json` modification and three unrelated untracked
directories are restored only after the final release documentation push, so no
unrelated content can enter the release commits.

This round published GitHub assets, the messaging-gateway package, a signed
Android APK, an iOS build to App Store Connect, and the multi-architecture server
container. It did **not** install the desktop app, deploy the server into a user
environment, alter user data, execute a migration against a user profile, or
claim App Store storefront approval.
