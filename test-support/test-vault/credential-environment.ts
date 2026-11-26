/**
 * Credential variables never reach code under test (REQ-006): every
 * `*_API_KEY` name and the Claude login token (`CLAUDE_CODE_OAUTH_TOKEN`,
 * autobyteus-581 C9), which cover all importer credential aliases.
 */
export const CREDENTIAL_ENVIRONMENT_NAME = /(_API_KEY|^CLAUDE_CODE_OAUTH_TOKEN)$/i;

export const isCredentialEnvironmentName = (name: string): boolean =>
  CREDENTIAL_ENVIRONMENT_NAME.test(name);

/** Deletes inherited credential variables; returns the removed names (never values). */
export const stripCredentialEnvironment = (env: NodeJS.ProcessEnv = process.env): string[] => {
  const removed = Object.keys(env).filter(isCredentialEnvironmentName).sort();
  for (const name of removed) delete env[name];
  return removed;
};
