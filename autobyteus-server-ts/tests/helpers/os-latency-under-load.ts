/**
 * Wait limits for tests whose latency is the operating system's, not AutoByteus's (autobyteus-517 FU-002).
 *
 * A file event (chokidar over FSEvents on macOS) or an in-process server's start and close (which closes its folder
 * watchers on the main thread) takes milliseconds on a quiet machine and many seconds on a busy one: under load average
 * 53–95, with `fseventsd` at 130–140% CPU, events arrived after up to ~14.5 s (TESTING.md, "File watching on a busy
 * Mac"). vitest's defaults (5 s per test, 10 s per hook) and 3–5 s waits then fail while the feature works.
 *
 * - A wait returns as soon as its condition holds, so a long limit does not slow a passing run.
 * - A test that proves an event does NOT happen keeps its own short quiet window; never use these limits there.
 * - Only the tests that wait for such latency use these; every other test keeps vitest's defaults.
 */

/** The longest a test waits for one OS file event to reach the code under test (about 2× the slowest measured). */
export const OS_FILE_EVENT_WAIT_MS = 30_000;

/**
 * vitest hook timeout for a hook that starts or closes an in-process server or its folder watchers. Every file that imports
 * `tests/e2e/helpers/studio-runtime-test-server.ts` gets it from that helper, which owns it; a file may still pass it explicitly.
 */
export const IN_PROCESS_SERVER_HOOK_TIMEOUT_MS = 60_000;

/** vitest test timeout for a test that waits for one or more OS file events. */
export const FILE_EVENT_TEST_TIMEOUT_MS = OS_FILE_EVENT_WAIT_MS + 15_000;

/**
 * vitest test timeout for a test that waits only for the answers of a running server (in-process or built) that runs folder
 * watchers. With `fseventsd` at 99–170% CPU, those servers' requests that answer in 5–120 ms took over 5 s, so vitest's 5 s
 * default failed while the feature worked (autobyteus-576 API-08b at load 8–12, autobyteus-583 API-07b at load 45–55;
 * autobyteus-579 I-2). CPU load alone does not do it: at load 127 with `fseventsd` at 60% the same tests took at most 0.7 s.
 * A passing test still ends as soon as its last answer arrives.
 */
export const SERVER_UNDER_FSEVENTS_LOAD_TEST_TIMEOUT_MS = 30_000;
