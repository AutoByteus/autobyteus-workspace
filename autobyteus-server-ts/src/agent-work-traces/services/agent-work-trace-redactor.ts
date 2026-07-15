const MAX_VISIBLE_TEXT_LENGTH = 20_000;

export class AgentWorkTraceRedactor {
  redact(value: string): string {
    return value
      .replace(/\b(Authorization\s*[:=]\s*)(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]+/gi, "$1$2 <redacted-token>")
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer <redacted-token>")
      .replace(/\b([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|PASSWORD|SECRET)[A-Z0-9_]*\b["']?\s*[:=]\s*)(["']?)[^\s'",;}]+\2?/gi, "$1<redacted-secret>")
      .replace(/\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\b["']?\s*[:=]\s*)(["']?)[^\s'",;}]+\2?/gi, "$1<redacted-secret>")
      .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|sk-ant-[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/g, "<redacted-secret>")
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "<redacted-email>")
      .replace(/\b(?:turn_id|seq|source_event|correlation_id|tool_call_id|provider_event_id|provider_session_id)\b\s*[:=]\s*[^\n,}]+/gi, "<redacted-backend-field>")
      .slice(0, MAX_VISIBLE_TEXT_LENGTH);
  }
}
