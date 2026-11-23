export type NativeToolResultCall = {
  name: string;
  args: Record<string, unknown>;
  summary: Record<string, unknown>;
  /** What the CLI's stream says for the finished step. */
  streamOutput: string | null;
  /** The text of the step's transcript row. */
  content: string;
};
export function nativeToolResultCalls(workspace: string): NativeToolResultCall[];
