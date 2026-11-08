import { attachOwnerCredentialToLoopback } from "../../../../test-support/node-access/owner-credential-attachment.mjs";
import { testLaunchCredential } from "../../setup/test-launch-credential.js";

/**
 * The environment entry a built server (`dist/app.js`) that a suite spawns needs to serve the suite (node access model
 * NA-1, NA-5): the suite's launch owner credential, as the desktop app starts its own node. The credential is attached
 * to this process's requests to every loopback port, so the suite's requests to its servers carry it.
 */
export const builtServerLaunchEnvironment = (): Readonly<{ AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: string }> => {
  const credential = testLaunchCredential();
  attachOwnerCredentialToLoopback(credential);
  return Object.freeze({ AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: credential });
};
