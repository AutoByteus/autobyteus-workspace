import { describe, expect, it } from "vitest";
import {
  DEFAULT_RUNTIME_KIND,
  isRuntimeKind,
  normalizeRuntimeKind,
} from "../../../src/runtime-management/runtime-kind.js";

describe("runtime-kind", () => {
  it("validates known runtime kinds", () => {
    expect(isRuntimeKind("autobyteus")).toBe(true);
    expect(isRuntimeKind("codex_app_server")).toBe(true);
    expect(isRuntimeKind("claude_agent_sdk")).toBe(true);
    expect(isRuntimeKind("unknown")).toBe(false);
    expect(isRuntimeKind(null)).toBe(false);
  });

  it("normalizes unknown runtime kinds to default", () => {
    expect(normalizeRuntimeKind("unknown")).toBe(DEFAULT_RUNTIME_KIND);
    expect(normalizeRuntimeKind(undefined, "codex_app_server")).toBe("codex_app_server");
  });
});
