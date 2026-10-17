/** Optional host-supplied per-execution environment. Never serialized or installed
 * in process.env. The embedding server owns policy; core only passes it to children. */
export type TerminalEnvironmentContext = {
  customData?: { terminalChildEnvironment?: () => NodeJS.ProcessEnv };
};
export function terminalChildEnvironment(context: TerminalEnvironmentContext | null | undefined): NodeJS.ProcessEnv | undefined {
  return context?.customData?.terminalChildEnvironment?.();
}
