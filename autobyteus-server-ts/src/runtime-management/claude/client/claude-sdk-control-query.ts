import { raceDeadline, type ReadDeadline } from "../../read-deadline.js";
import { asObject } from "../../../agent-execution/backends/claude/claude-runtime-shared.js";
import { resolveClaudeCodeExecutablePath } from "./claude-sdk-executable-path.js";
import { getClaudeCatalogSettingSources } from "./claude-sdk-setting-sources.js";

export type ClaudeSdkQueryFunction = (...args: unknown[]) => unknown;

/** The control requests the short query offers, as the SDK's `Query` names them. */
export type ClaudeSdkControlQuery = Record<string, unknown>;

/**
 * An input stream that never yields a message and completes when `end()` is called. A string prompt would be written
 * to the CLI as a user turn at once (the SDK drops `maxTurns: 0`), so a control query that must not start a model turn
 * opens the CLI with this instead (autobyteus-303 C-15).
 */
const createIdleInput = (): { input: AsyncIterable<never>; end: () => void } => {
  let end!: () => void;
  const ended = new Promise<void>((resolve) => { end = resolve; });
  async function* idle(): AsyncGenerator<never> {
    await ended;
  }
  return { input: idle(), end };
};

/**
 * One short Claude CLI for control requests only (model list, usage): opened with an idle input, so no message is
 * ever sent and no tokens are spent; closed when `use` settles or at the deadline, whichever comes first. Without a
 * deadline (launch paths' model discovery) `use` is not bounded here, as before.
 */
export const withClaudeControlQuery = async <T>(
  input: Readonly<{
    queryFn: ClaudeSdkQueryFunction;
    env?: Record<string, string | undefined>;
    deadline?: ReadDeadline;
  }>,
  use: (query: ClaudeSdkControlQuery) => Promise<T>,
): Promise<T> => {
  const idle = createIdleInput();
  const opening = Promise.resolve(input.queryFn({
    prompt: idle.input,
    options: {
      permissionMode: "plan",
      cwd: process.cwd(),
      pathToClaudeCodeExecutable: resolveClaudeCodeExecutablePath(),
      settingSources: getClaudeCatalogSettingSources(),
      ...(input.env ? { env: input.env } : {}),
    },
  }));
  let control: ClaudeSdkControlQuery | null = null;
  try {
    control = asObject(await raceDeadline(opening, input.deadline));
    if (!control) throw new Error("Claude SDK query is unavailable.");
    return await raceDeadline(use(control), input.deadline);
  } finally {
    idle.end();
    if (control) closeControlQuery(control);
    // Opened only after the deadline: closed as soon as it exists.
    else void opening.then((late) => closeControlQuery(asObject(late)), () => undefined);
  }
};

/** Nothing runs on a control query, so there is nothing to interrupt: closing stops the CLI. */
const closeControlQuery = (control: ClaudeSdkControlQuery | null): void => {
  if (!control || typeof control.close !== "function") return;
  try {
    (control.close as () => unknown).call(control);
  } catch {
    // the process is already gone
  }
};
