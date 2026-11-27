/** The server image sandboxes start from (advanced setting; validation builds use a locally built image). */
export const SANDBOX_IMAGE_SETTING = "AUTOBYTEUS_SANDBOX_IMAGE";
/** The release this node runs, given by the desktop app that started it (DESIGN rule 9: a sandbox runs the same). */
export const RELEASE_VERSION_SETTING = "AUTOBYTEUS_RELEASE_VERSION";

/** Limits per host node (REQ-014, DEC-106). */
export const SANDBOX_LIMITS = Object.freeze({
  maxSandboxes: 4,
  defaultLifetimeMinutes: 120,
  maxLifetimeMinutes: 480,
  memory: "6g",
  cpus: "4",
});

/**
 * The image a new sandbox starts from: the setting when set, else the published server image of this node's own
 * release; `null` when neither is known (a development build without a release refuses `SANDBOX_IMAGE_UNKNOWN`).
 */
export const sandboxImageFor = (read: (key: string) => string | undefined): string | null => {
  const configured = read(SANDBOX_IMAGE_SETTING)?.trim();
  if (configured) return configured;
  const version = read(RELEASE_VERSION_SETTING)?.trim();
  return version ? `autobyteus/autobyteus-server:${version}` : null;
};
