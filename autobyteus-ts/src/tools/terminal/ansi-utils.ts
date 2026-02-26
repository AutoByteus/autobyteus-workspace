const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[=>]/g;

export function stripAnsiCodes(text: string): string {
  if (!text) {
    return text;
  }
  return text.replace(ANSI_ESCAPE_PATTERN, '');
}
