import { createTestOwnerCredential } from "../../../test-support/node-access/owner-credential-attachment.mjs";

/**
 * Every test file's process starts as the desktop app starts its own node: with a launch owner credential in its
 * environment (node access model NA-5, NA-15). A server composed in-process takes it through the launch credential
 * intake, which removes it from `process.env` when it loads; `testLaunchCredential()` keeps it for the test, which
 * attaches it to its requests (`attachOwnerCredential`). Runs after the environment isolation, before any test file
 * imports code under test.
 */
const LAUNCH_CREDENTIAL_KEY = Symbol.for("autobyteus.test.launchOwnerCredential");

type GlobalWithLaunchCredential = typeof globalThis & { [LAUNCH_CREDENTIAL_KEY]?: string };

const credential = createTestOwnerCredential();
process.env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL = credential;
(globalThis as GlobalWithLaunchCredential)[LAUNCH_CREDENTIAL_KEY] = credential;

/** The launch owner credential this test file's in-process servers accept. */
export const testLaunchCredential = (): string => {
  const value = (globalThis as GlobalWithLaunchCredential)[LAUNCH_CREDENTIAL_KEY];
  if (!value) throw new Error("tests/setup/test-launch-credential.ts did not run.");
  return value;
};
