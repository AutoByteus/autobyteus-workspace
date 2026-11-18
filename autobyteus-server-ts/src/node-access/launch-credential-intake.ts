/**
 * The launch credential's intake (NA-15, design M-1). The desktop app puts the owner credential it created for this
 * start in this node process's environment only. This module is the first import of `src/app.ts`: ES modules
 * evaluate in import order, so its body runs before any other module, takes the value and deletes it from
 * `process.env`. Every program the node starts later (runtimes, terminal shells, application workers) inherits an
 * environment without it. Imports nothing.
 */
export const LAUNCH_OWNER_CREDENTIAL_ENV_VAR = "AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL";

const held: string | null = process.env[LAUNCH_OWNER_CREDENTIAL_ENV_VAR]?.trim() || null;
delete process.env[LAUNCH_OWNER_CREDENTIAL_ENV_VAR];

/** The launch credential this process was started with (`null` without one), for the owner credential service. */
export const launchCredential = (): string | null => held;
