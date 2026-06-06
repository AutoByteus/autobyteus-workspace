# Design Spec

## Current-State Read

The frontend Terminal tab renders `autobyteus-web/components/workspace/tools/Terminal.vue`, which owns the xterm.js instance and delegates backend I/O to `autobyteus-web/composables/useTerminalSession.ts`.

Current terminal I/O flow:

`User / xterm -> Terminal.vue onData -> useTerminalSession.sendInput -> JSON WebSocket input with base64 data -> autobyteus-server-ts TerminalHandler -> TerminalSession / PTY -> TerminalHandler read loop -> JSON WebSocket output with base64 data -> useTerminalSession.onmessage -> Terminal.vue output callback -> xterm.write`

Backend terminal streaming currently preserves bytes correctly: `TerminalHandler.handleMessage` decodes input using `Buffer.from(data.data, "base64")`, and `TerminalHandler.encodeOutput` serializes PTY output using `data.toString("base64")`.

The defect is isolated to the browser terminal session codec:

- inbound output currently uses `atob(message.data)` and writes that binary string directly to xterm.
- outbound input currently uses `btoa(data)` directly on JavaScript strings.

`atob` and `btoa` operate on binary strings, not UTF-8 text. A UTF-8 byte sequence for `┌` (`e2 94 8c`) becomes browser string code units that render as `â...` mojibake. Multi-byte UTF-8 sequences can also be split across WebSocket output chunks, so output decoding must be streaming, not independent per message.

Constraints the target design must respect:

- Keep backend terminal byte transport as base64-encoded bytes.
- Preserve xterm's ANSI/control-sequence behavior by writing normal decoded terminal text to xterm.
- Preserve existing WebSocket message shapes: `{ type: "input", data: "<base64>" }`, `{ type: "output", data: "<base64>" }`, resize messages, error messages, and closed messages.
- Keep the change local to frontend terminal transport unless implementation discovers new contradictory evidence.

## Intended Change

Replace the frontend terminal transport codec with explicit UTF-8 byte conversion:

1. Decode inbound base64 output into `Uint8Array` bytes.
2. Feed output bytes into one session-scoped streaming `TextDecoder("utf-8")`.
3. Forward only decoded text chunks to `Terminal.vue`'s output callback and xterm.
4. Encode outbound terminal input strings with `TextEncoder` before base64 transport.
5. Add regression tests for Unicode output, split UTF-8 output chunks, ANSI preservation, and non-ASCII input.
6. Update terminal protocol documentation to state that `data` is base64-encoded terminal bytes and the frontend decodes output as a streaming UTF-8 byte stream.

No backend API or PTY lifecycle change is intended.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: `useTerminalSession.ts` is already the frontend boundary that owns WebSocket terminal transport. Backend `TerminalHandler` already owns byte-preserving base64 transport. Runtime reproduction through the correct frontend and Electron-started backend confirms arbitrary UTF-8 terminal output is misdecoded in the frontend.
- Design response: Keep existing ownership and message protocol. Tighten the codec inside the frontend terminal transport boundary with explicit byte/string conversion and streaming UTF-8 decode.
- Refactor rationale: No broad refactor is needed because the current owner, boundary, API shape, and file placement remain healthy. A small codec utility is acceptable for testability and semantic clarity; it is not a subsystem refactor.
- Intentional deferrals and residual risk, if any: No backend redesign is included. Residual risk is limited to browser/runtime compatibility for `TextEncoder`/`TextDecoder`; Nuxt/Vitest and modern Electron browser contexts should provide them, and tests must verify the chosen implementation environment.

## Terminology

- `Terminal bytes`: bytes emitted by the backend PTY or sent to the backend PTY.
- `Binary string`: browser string returned by `atob`, where each code unit represents one byte. This is not decoded UTF-8 text.
- `Terminal text`: JavaScript string produced by UTF-8 decoding terminal bytes and suitable for `xterm.write`.
- `Terminal transport envelope`: JSON WebSocket message carrying base64 terminal bytes.

## Design Reading Order

This design should be read in this order:

1. terminal data-flow spines
2. ownership and boundary allocation
3. codec extraction and file responsibilities
4. validation and documentation mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove direct `atob(message.data) -> outputCallback` and direct `btoa(data)` for terminal transport data.
- Decision rule: do not keep dual ASCII-only and UTF-8 paths. The clean target is one byte-correct UTF-8 codec for all terminal traffic.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User keyboard input in xterm | Backend PTY input bytes | `useTerminalSession` for frontend transport conversion; backend `TerminalHandler` for server byte envelope | Ensures user input, including non-ASCII, is encoded to bytes before PTY write. |
| DS-002 | Return-Event | Backend PTY output bytes | xterm rendered output | `useTerminalSession` for frontend UTF-8 decode; `Terminal.vue` for rendering handoff | This is the defective path producing mojibake. |
| DS-003 | Bounded Local | WebSocket output message handling | Output callback dispatch | `useTerminalSession` | Streaming decoder state must live across output messages in one session. |

## Primary Execution Spine(s)

Input spine DS-001:

`User keystroke -> xterm onData -> Terminal.vue -> useTerminalSession.sendInput -> terminal UTF-8/base64 codec -> WebSocket input envelope -> TerminalHandler.handleMessage -> PTY write`

Output spine DS-002:

`PTY output bytes -> TerminalHandler read loop -> WebSocket output envelope -> useTerminalSession.onmessage -> streaming terminal UTF-8/base64 codec -> Terminal.vue output callback -> xterm.write`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | xterm emits a browser string for typed data. `useTerminalSession` converts that string into UTF-8 bytes, base64-encodes those bytes, and sends the unchanged existing JSON input envelope. Backend decodes base64 into bytes and writes them to the PTY. | xterm, Terminal component, terminal session composable, backend handler, PTY session | `useTerminalSession` for browser-side string-to-byte conversion; `TerminalHandler` for backend envelope-to-PTY conversion | target cwd resolution, WebSocket endpoint selection, resize handling, connection status |
| DS-002 | Backend PTY output is read as bytes, base64-encoded into JSON, and delivered to the browser. `useTerminalSession` converts base64 back to bytes and uses one streaming UTF-8 decoder per connection/session before dispatching decoded terminal text to xterm. | PTY session, backend handler, terminal session composable, Terminal component, xterm | `useTerminalSession` for browser-side byte-to-string conversion | xterm ANSI parsing/rendering, output callback registration, terminal lifecycle |
| DS-003 | Each WebSocket output message advances the same decoder state. If a multi-byte UTF-8 code point is split across messages, the first decode may produce no visible text and the later decode completes the glyph without replacement characters. | WebSocket output message, session decoder, output callback | `useTerminalSession` | decoder reset/flush on connect/disconnect, malformed message handling |

## Spine Actors / Main-Line Nodes

- `Terminal.vue`: owns xterm lifecycle, input event hookup, resize event hookup, and output write handoff.
- `useTerminalSession.ts`: owns frontend terminal WebSocket session lifecycle and browser-side terminal transport conversion.
- Terminal transport codec utility: owns base64 <-> bytes and UTF-8 encode/decode primitives used by `useTerminalSession`.
- `TerminalHandler`: owns backend WebSocket message parsing, base64 byte envelope, and read/write loop to the PTY session.
- PTY session implementations: own shell/PTY process lifecycle and raw terminal I/O.

## Ownership Map

| Owner | Owns | Does Not Own |
| --- | --- | --- |
| `Terminal.vue` | xterm instance lifecycle, DOM mounting, fit/resize wiring, forwarding xterm `onData` to session, forwarding session output to `xterm.write` | Base64, UTF-8 decoding, backend byte envelope, PTY lifecycle |
| `useTerminalSession.ts` | Browser WebSocket lifecycle, endpoint selection, message dispatch, session-scoped output decoder lifecycle, input/output codec use | xterm rendering internals, backend PTY creation, server cwd validation |
| `utils/terminalTransportCodec.ts` | Pure terminal transport conversions: base64 to bytes, bytes to base64, UTF-8 input encode, streaming output chunk decode helpers | WebSocket lifecycle, output callback storage, connection status, xterm writes |
| `TerminalHandler` | Backend JSON envelope parse, base64-to-Buffer input, Buffer-to-base64 output, PTY read loop coordination | Browser UTF-8 decoding, xterm rendering |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `Terminal.vue` output callback registration | `useTerminalSession` owns transport; xterm owns rendering | Lets the UI component connect terminal output to xterm without knowing transport details | Base64/UTF-8 transport conversion |
| WebSocket JSON message envelope | `TerminalHandler` and `useTerminalSession` jointly enforce protocol on their sides | Carries typed terminal messages between browser and backend | Text decoding policy based on browser binary strings |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Direct `atob(message.data)` output forwarding in `useTerminalSession.ts` | Produces binary strings and mojibake for UTF-8 output | `decodeTerminalOutputChunk` using base64-to-bytes + streaming `TextDecoder` | In This Change | Clean-cut replacement; no ASCII fallback branch. |
| Direct `btoa(data)` input encoding in `useTerminalSession.ts` | Throws/corrupts non-ASCII input because `btoa` expects a binary string | `encodeTerminalInput` using `TextEncoder` + bytes-to-base64 | In This Change | Clean-cut replacement; keeps protocol unchanged. |
| Any test expectation that treats `btoa(nonAsciiText)` or `atob(nonAsciiBase64)` as terminal text | Encodes the historical bug into tests | Test helpers that compare UTF-8 bytes and decoded text explicitly | In This Change | Existing ASCII test can remain conceptually but should use codec helper expectation. |

## Return Or Event Spine(s) (If Applicable)

DS-002 is the relevant return/event spine: backend PTY output returns asynchronously to the frontend and is rendered in xterm. The key design requirement is that the browser session treats output as a byte stream and maintains decoder state across WebSocket messages.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `useTerminalSession`

`WebSocket output event -> parse JSON envelope -> base64-to-bytes -> streaming UTF-8 decoder -> output callback if decoded text is non-empty`

This bounded local spine matters because UTF-8 code points can cross WebSocket message boundaries. The decoder must be reset when a new connection/session starts and flushed/reset when the connection is closed or explicitly disconnected.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Endpoint/root path resolution | DS-001, DS-002 | `useTerminalSession` | Build WebSocket URL with explicit `cwd` or server-home default | Existing session setup concern | Mixing it with codec logic would obscure the byte/string defect. |
| Terminal resize events | DS-001, DS-002 | `Terminal.vue` and `useTerminalSession` | Send `{ type: "resize", rows, cols }` messages | Maintains PTY size | Treating resize as encoded terminal bytes would corrupt protocol semantics. |
| xterm ANSI/control parsing | DS-002 | xterm | Interpret ANSI/control sequences in decoded terminal text | Existing terminal rendering behavior | Decoding ANSI separately from text would risk breaking terminal emulation. |
| Connection status and errors | DS-001, DS-002 | `useTerminalSession` | Expose connected/disconnected/error state | UI feedback and retry behavior | Coupling status with codec helpers would make pure codec tests harder. |
| Documentation | DS-001, DS-002 | Terminal module docs | State byte-level protocol and frontend streaming decode responsibility | Prevents future atob/btoa regressions | If undocumented, future maintainers may reintroduce binary-string assumptions. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Browser terminal WebSocket lifecycle | Frontend Terminal module (`useTerminalSession.ts`) | Reuse | It already owns connection lifecycle, endpoint selection, input, output, resize, and callback dispatch. | N/A |
| Pure terminal byte/text/base64 conversion | Frontend terminal utilities | Create New small utility | Conversion should be tested independently and reused by input and output paths without bloating the composable. | Generic shared utilities are too broad; this is terminal transport-specific and should not become a general encoding dumping ground. |
| Backend byte envelope | Backend terminal streaming service (`TerminalHandler`) | Reuse | It already preserves bytes via Buffers and base64. | N/A |
| xterm rendering | Existing `Terminal.vue` xterm ownership | Reuse | xterm can render correct Unicode strings and parse ANSI sequences once the frontend sends correct strings. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Terminal module | xterm UI, frontend terminal session, browser transport codec | DS-001, DS-002, DS-003 | `Terminal.vue`, `useTerminalSession` | Extend | Add codec utility and tests inside frontend terminal scope. |
| Backend Terminal Streaming | PTY session bridge and byte-preserving WebSocket protocol | DS-001, DS-002 | `TerminalHandler`, PTY session manager | Reuse | No code change expected. |
| Terminal documentation | Protocol and architecture docs | DS-001, DS-002 | Terminal module maintainers | Extend | Clarify data is base64 terminal bytes, not base64 JavaScript text. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/terminalTransportCodec.ts` | Frontend Terminal module | Terminal transport codec | Pure base64/byte/UTF-8 conversions and streaming decode helpers | Keeps codec semantics isolated and directly testable | N/A |
| `autobyteus-web/composables/useTerminalSession.ts` | Frontend Terminal module | Browser terminal session boundary | Use codec helpers; own decoder lifecycle; dispatch decoded output | Existing owner for WebSocket session and callbacks | Yes, codec utility |
| `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts` | Frontend Terminal module tests | Composable behavior tests | Verify WebSocket messages use UTF-8-safe encoding/decoding through the session boundary | Existing test file for this owner | Yes, codec utility/test helpers as needed |
| `autobyteus-web/utils/__tests__/terminalTransportCodec.spec.ts` | Frontend Terminal module tests | Pure codec tests | Verify Unicode, split chunks, ANSI bytes, and non-ASCII input conversion | Keeps root codec regression independent of WebSocket mocks | Yes, codec utility |
| `autobyteus-web/docs/terminal.md` | Terminal documentation | Terminal module docs | Document byte-level protocol and streaming frontend decode | Existing docs for terminal frontend | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Base64 <-> bytes conversion and UTF-8 terminal encode/decode | `autobyteus-web/utils/terminalTransportCodec.ts` | Frontend Terminal module | Input and output paths both need byte-correct conversion; tests need the same behavior directly | Yes | Yes | A generic app-wide encoding helper or WebSocket lifecycle owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| WebSocket terminal `data` field | Yes: base64-encoded terminal bytes | Yes | Low after docs/tests | Document byte meaning and remove binary-string assumptions. |
| Codec helper API | Yes: bytes, base64, input text, output byte stream are distinct concepts | Yes | Low | Name helpers by conversion direction; avoid accepting ambiguous `string` except for base64 and terminal input/output text. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/terminalTransportCodec.ts` | Frontend Terminal module | Terminal transport codec | Export `base64ToBytes`, `bytesToBase64`, `encodeTerminalInput`, `createTerminalOutputDecoder`, `decodeTerminalOutputChunk`, and optional `flushTerminalOutputDecoder` | One file owns one conversion concern and has no WebSocket/UI lifecycle | N/A |
| `autobyteus-web/composables/useTerminalSession.ts` | Frontend Terminal module | Browser terminal session boundary | Replace direct `atob`/`btoa`; instantiate/reset decoder per connection; decode output chunks with stream semantics; send UTF-8 encoded input | Existing correct owner for session lifecycle and message routing | `terminalTransportCodec.ts` |
| `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts` | Frontend Terminal module tests | Session boundary tests | Verify session sends UTF-8 base64 input, decodes Unicode output, preserves split chunks through callback accumulation, and preserves existing URL/resize/status behavior | Existing test suite for composable behavior | `terminalTransportCodec.ts` |
| `autobyteus-web/utils/__tests__/terminalTransportCodec.spec.ts` | Frontend Terminal module tests | Codec unit tests | Verify pure conversion with box drawing, checkmark/CJK input, ANSI-containing output, and split multibyte sequences | Direct guard for the defect class | `terminalTransportCodec.ts` |
| `autobyteus-web/docs/terminal.md` | Terminal documentation | Frontend Terminal docs | Update WebSocket protocol summary to say base64 payloads are terminal bytes; output is streaming UTF-8 decoded in frontend | Existing canonical frontend terminal docs | N/A |

## Ownership Boundaries

`Terminal.vue` must continue to treat session output as terminal text and must not know how base64 or UTF-8 transport works. `useTerminalSession` remains the authoritative frontend boundary for terminal transport and owns decoder lifecycle because the decoder state is connection/session-scoped. The codec utility is internal to the frontend Terminal module and pure; it must not own WebSocket state, callbacks, or xterm writes. Backend `TerminalHandler` remains authoritative for server-side terminal WebSocket envelopes and PTY byte I/O.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useTerminalSession` | WebSocket instance, output decoder state, terminal codec calls, connection status | `Terminal.vue` | `Terminal.vue` manually decoding base64 or maintaining `TextDecoder` | Add/adjust session methods or callbacks, not UI-side codec logic |
| `terminalTransportCodec.ts` | base64/binary-string conversion loops, `TextEncoder`, `TextDecoder` chunk decode | `useTerminalSession` and tests | Scattered `atob`/`btoa` in session code for terminal data | Add named codec helper for the missing direction |
| `TerminalHandler` | backend JSON message parse, Buffer base64 encode/decode, PTY read/write loop | WebSocket route/server terminal streaming | Browser/frontend trying to change backend byte protocol to JavaScript text | Keep protocol byte-based; fix browser codec instead |

## Dependency Rules

Allowed:

- `Terminal.vue` may depend on `useTerminalSession` and xterm.
- `useTerminalSession.ts` may depend on `utils/terminalTransportCodec.ts`.
- Tests may depend on `terminalTransportCodec.ts` for expected payload construction and direct codec validation.
- Backend terminal streaming may continue to depend on Node `Buffer` for byte/base64 conversion.

Forbidden:

- Do not use `atob(message.data)` as terminal text.
- Do not use `btoa(data)` directly on terminal input text.
- Do not move UTF-8 browser decoding into `Terminal.vue`.
- Do not change backend base64 payloads into JSON text strings as a compatibility workaround.
- Do not create a second protocol path for ASCII vs non-ASCII terminal data.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useTerminalSession.sendInput(data: string)` | Terminal input text from xterm | Encode terminal input text as UTF-8 bytes and send input envelope | session implicit in composable instance | Public API shape remains unchanged. |
| `useTerminalSession.onOutput(callback)` | Terminal output text callback | Register decoded terminal text consumer | callback receives decoded terminal text strings | Callback should never receive binary strings. |
| `decodeTerminalOutputChunk(decoder, base64Data)` | One output byte-stream chunk | Convert base64 bytes into streaming decoded text | decoder object is explicit stream identity | Keeps split UTF-8 sequences correct. |
| `encodeTerminalInput(data: string)` | One terminal input text chunk | Convert text to UTF-8 bytes and base64 | string text chunk | Must support non-ASCII input. |
| Backend `{ type: "output", data }` envelope | PTY output bytes | Carry base64 terminal bytes | WebSocket session ID/path owns session identity | Protocol shape unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `sendInput(data)` | Yes | Yes, composable session instance | Low | Encode with terminal codec. |
| `onOutput(callback)` | Yes | Yes, composable session instance | Low | Ensure callback receives decoded text only. |
| `decodeTerminalOutputChunk(decoder, base64Data)` | Yes | Yes, decoder parameter is stream identity | Low | Keep decoder state in `useTerminalSession`. |
| WebSocket terminal envelope | Yes | Yes, URL/session ID | Low | Document byte semantics. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Browser terminal session | `useTerminalSession` | Yes | Low | Keep. |
| Terminal transport codec | `terminalTransportCodec.ts` | Yes | Low | Name helpers by conversion direction. |
| Backend terminal handler | `TerminalHandler` | Yes | Low | Keep. |
| Terminal renderer component | `Terminal.vue` | Yes | Low | Keep. |

## Applied Patterns (If Any)

- Adapter-like codec utility: `terminalTransportCodec.ts` adapts browser base64/binary APIs and UTF-8 encoder/decoder APIs into a terminal-specific byte/text contract.
- Bounded local stream decoder: `useTerminalSession` keeps one decoder per connection/session so output chunks are decoded as a continuous byte stream.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/terminalTransportCodec.ts` | File | Frontend Terminal transport codec | Pure byte/base64/UTF-8 conversion helpers | Existing frontend utilities location; terminal-specific name avoids generic shared misuse | WebSocket lifecycle, xterm writes, connection status |
| `autobyteus-web/utils/__tests__/terminalTransportCodec.spec.ts` | File | Codec test suite | Direct tests for Unicode, ANSI bytes, split chunks, non-ASCII input | Existing utility test location | Browser UI/runtime setup |
| `autobyteus-web/composables/useTerminalSession.ts` | File | Browser terminal session boundary | Use codec helpers and maintain decoder lifecycle | Existing authoritative session owner | Manual binary-string conversion, xterm rendering |
| `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts` | File | Session boundary test suite | Regression tests for session-level message behavior | Existing composable tests | Full browser E2E beyond composable scope |
| `autobyteus-web/docs/terminal.md` | File | Frontend terminal documentation | Document byte protocol and streaming decode | Existing frontend terminal docs | Backend lifecycle details already covered by linked backend docs |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/composables` | Main-Line Domain-Control | Yes | Low | `useTerminalSession` already owns terminal session lifecycle. |
| `autobyteus-web/utils` | Off-Spine Concern | Yes | Low | Single terminal-specific codec file is clearer than adding a folder for one file. If more terminal utilities accumulate later, a `utils/terminal/` grouping can be considered separately. |
| `autobyteus-web/docs` | Documentation | Yes | Low | Existing module docs live here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Output decode | `const text = decoder.decode(base64ToBytes(message.data), { stream: true }); if (text) outputCallback(text);` | `outputCallback(atob(message.data));` | Shows why bytes must become UTF-8 text before xterm. |
| Input encode | `data: bytesToBase64(new TextEncoder().encode(input))` | `data: btoa(input)` | Shows non-ASCII input must be encoded to bytes first. |
| Split chunk handling | chunk 1 decodes to `""`, chunk 2 completes `"┌"` with same decoder | decoding each chunk with a fresh decoder, producing `�` | Captures the stream nature of terminal output. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `atob` for ASCII output and use `TextDecoder` only for non-ASCII | Could appear to minimize change | Rejected | One streaming UTF-8 decoder handles ASCII and non-ASCII correctly. |
| Change backend to emit decoded text instead of base64 bytes | Could avoid browser byte decoding | Rejected | Backend byte protocol is correct and preserves ANSI/control bytes; fix frontend codec. |
| Add a compatibility flag for old terminal codec | Could preserve old behavior | Rejected | Old behavior is objectively defective for UTF-8; remove direct binary-string codec. |
| Let `Terminal.vue` decode output before xterm | Could localize visible rendering fix | Rejected | Would bypass `useTerminalSession` as the frontend transport owner. |

## Derived Layering (If Useful)

- UI/rendering layer: `Terminal.vue` and xterm.
- Frontend session/transport layer: `useTerminalSession.ts`.
- Frontend codec utility: `terminalTransportCodec.ts` as an off-spine mechanism serving the session owner.
- Backend transport/PTY layer: `TerminalHandler` and terminal session implementations.

Layering is explanatory only; ownership remains governed by the terminal data-flow spines above.

## Migration / Implementation Sequence

1. Add `autobyteus-web/utils/terminalTransportCodec.ts` with pure byte/base64/UTF-8 helpers.
2. Add codec unit tests covering:
   - box drawing `┌─┐` output bytes decode correctly;
   - ANSI-containing output preserves escape sequences around Unicode;
   - one multibyte UTF-8 character split across chunks decodes without replacement glyphs;
   - input text such as `✓你好` encodes to base64 bytes that round-trip through UTF-8.
3. Update `useTerminalSession.ts` to:
   - create/reset a `TextDecoder("utf-8")` for each connection;
   - decode output messages through the codec with `{ stream: true }`;
   - avoid calling the output callback for empty partial-decoder chunks;
   - flush/reset decoder on close/disconnect as appropriate;
   - encode input through `TextEncoder` before base64.
4. Update `useTerminalSession.spec.ts` to assert session-level behavior for Unicode output, split output chunks, and non-ASCII input.
5. Update `autobyteus-web/docs/terminal.md` protocol summary.
6. Run focused tests: `pnpm --filter` is not required from this folder; from `autobyteus-web`, run `pnpm test:nuxt composables/__tests__/useTerminalSession.spec.ts utils/__tests__/terminalTransportCodec.spec.ts` or the equivalent Vitest focused command supported by the repo.
7. Run a browser/runtime smoke check against Electron-started backend:
   - open `http://localhost:3000/workspace`;
   - run `printf '\342\224\214\342\224\200\342\224\220\n'` and verify `┌─┐`;
   - run `codex` and verify the prompt/UI no longer displays `â...` mojibake.

## Validation Plan

- Unit/codec tests prove base64-to-bytes and UTF-8 streaming behavior independent of WebSocket mocks.
- Composable tests prove `useTerminalSession` sends/receives correct protocol envelopes and preserves existing connect, resize, status, and error behavior.
- Browser smoke validates the actual user path: correct frontend served from the task worktree plus Electron-started backend on `127.0.0.1:29695`.

## Documentation Plan

Update `autobyteus-web/docs/terminal.md`:

- WebSocket protocol summary: `data` is base64-encoded terminal bytes.
- Input flow: xterm text is UTF-8 encoded before base64 input transport.
- Output flow: backend base64 output is decoded to bytes and then streaming UTF-8 decoded before xterm rendering.
- Mention that streaming decode is required because UTF-8 code points may span WebSocket messages.
