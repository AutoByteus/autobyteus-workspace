/**
 * Credential variables never reach code under test (REQ-006): every
 * `*_API_KEY` name, which covers all importer credential aliases.
 */
export const CREDENTIAL_ENVIRONMENT_NAME = /_API_KEY$/i;

export const isCredentialEnvironmentName = (name: string): boolean =>
  CREDENTIAL_ENVIRONMENT_NAME.test(name);

/** Deletes inherited credential variables; returns the removed names (never values). */
export const stripCredentialEnvironment = (env: NodeJS.ProcessEnv = process.env): string[] => {
  const removed = Object.keys(env).filter(isCredentialEnvironmentName).sort();
  for (const name of removed) delete env[name];
  return removed;
};
