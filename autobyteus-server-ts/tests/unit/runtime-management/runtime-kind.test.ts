import { describe, expect, it } from "vitest";
import {
  DEFAULT_RUNTIME_KIND,
  isRuntimeKind,
  normalizeRuntimeKind,
} from "../../../src/runtime-management/runtime-kind.js";

describe("runtime-kind", () => {
  it("validates non-empty runtime ids", () => {
    expect(isRuntimeKind("autobyteus")).toBe(true);
    expect(isRuntimeKind("codex_app_server")).toBe(true);
    expect(isRuntimeKind("unknown")).toBe(true);
    expect(isRuntimeKind("  custom-runtime  ")).toBe(true);
    expect(isRuntimeKind("")).toBe(false);
    expect(isRuntimeKind("   ")).toBe(false);
    expect(isRuntimeKind(null)).toBe(false);
  });

  it("normalizes runtime ids and falls back on empty values", () => {
    expect(normalizeRuntimeKind("unknown")).toBe("unknown");
    expect(normalizeRuntimeKind("  codex_app_server  ")).toBe("codex_app_server");
    expect(normalizeRuntimeKind("")).toBe(DEFAULT_RUNTIME_KIND);
    expect(normalizeRuntimeKind(undefined, "codex_app_server")).toBe("codex_app_server");
  });
});
