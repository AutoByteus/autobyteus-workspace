import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GROK_ACP_FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/grok-acp",
);

export const grokAcpFixturePath = (name: string): string => path.join(GROK_ACP_FIXTURES, `${name}.jsonl`);

export type FakeGrokCommand = Readonly<{ command: string; dir: string }>;

/**
 * Executable `grok` stand-in for `GROK_BUILD_COMMAND`: runs the recorded-fixture fake CLI
 * (`tests/fixtures/grok-acp/fake-grok-cli.mjs`) under the current Node binary. It reads
 * `FAKE_GROK_VERSION`, `FAKE_ACP_FIXTURE` and the other fake-agent switches from the
 * server environment it inherits, so it costs no Grok credits.
 */
export const createFakeGrokCommand = async (): Promise<FakeGrokCommand> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fake-grok-cli-"));
  const command = path.join(dir, "grok");
  const script = path.join(GROK_ACP_FIXTURES, "fake-grok-cli.mjs");
  await fs.writeFile(command, `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`, { mode: 0o755 });
  return { command, dir };
};

/** Sets environment variables for one test and returns a function restoring the previous values. */
export const overrideEnv = (values: Record<string, string | undefined>): (() => void) => {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  const apply = (entries: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(entries)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  apply(values);
  return () => apply(previous);
};
