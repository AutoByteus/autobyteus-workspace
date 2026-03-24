export function isTerminalRetryFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ((error as { retryable?: boolean }).retryable === true) {
    return false;
  }
  if ((error as { retryable?: boolean }).retryable === false) {
    return true;
  }
  if ("status" in error && typeof (error as { status?: unknown }).status === "number") {
    const status = (error as { status: number }).status;
    return status >= 400 && status < 500;
  }
  return false;
}
