import { describe, expect, it } from "vitest";
import {
  compareRuntimeVersions,
  extractRuntimeVersion,
} from "../../../../src/runtime-management/agent-runtimes/runtime-version.js";

describe("extractRuntimeVersion (AC-001)", () => {
  it.each([
    ["0.2.2-rc.1", "0.2.2-rc.1"],
    ["2.1.318 (Claude Code)", "2.1.318"],
    ["codex-cli 0.167.0", "0.167.0"],
    ["grok 1.0.77 (50ca579fa996) [stable]", "1.0.77"],
    ["1.5.2", "1.5.2"],
    ["rust-v0.167.0", "0.167.0"],
    ["1.2.3+build.5", "1.2.3"],
    ["1.0.0-alpha.beta+exp.sha.5114f85\n", "1.0.0-alpha.beta"],
    ["agy version 1.2.16\n", "1.2.16"],
  ])("reads %j as %j", (text, version) => {
    expect(extractRuntimeVersion(text)).toBe(version);
  });

  it.each([[""], ["no version here"], ["1.2"], [null], [undefined]])("reads no version from %j", (text) => {
    expect(extractRuntimeVersion(text)).toBeNull();
  });
});

describe("compareRuntimeVersions (SemVer 2.0.0 precedence)", () => {
  it("orders a prerelease before its release, and equal versions as equal (AC-002)", () => {
    expect(compareRuntimeVersions("0.2.2-rc.1", "0.2.2")).toBeLessThan(0);
    expect(compareRuntimeVersions("0.2.2", "0.2.2-rc.1")).toBeGreaterThan(0);
    expect(compareRuntimeVersions("0.2.2", "0.2.2")).toBe(0);
    expect(compareRuntimeVersions("0.2.2-rc.1", "0.2.2-rc.1")).toBe(0);
  });

  it("follows the SemVer precedence chain, each step in both directions (AC-003)", () => {
    const chain = [
      "1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-beta", "1.0.0-beta.2", "1.0.0-beta.11", "1.0.0-rc.1", "1.0.0",
    ];
    for (let index = 0; index + 1 < chain.length; index += 1) {
      expect(compareRuntimeVersions(chain[index]!, chain[index + 1]!), `${chain[index]} < ${chain[index + 1]}`).toBeLessThan(0);
      expect(compareRuntimeVersions(chain[index + 1]!, chain[index]!), `${chain[index + 1]} > ${chain[index]}`).toBeGreaterThan(0);
    }
  });

  it("ignores build metadata (AC-003)", () => {
    expect(compareRuntimeVersions("1.0.0+a", "1.0.0")).toBe(0);
    expect(compareRuntimeVersions("1.0.0-rc.1+a", "1.0.0-rc.1+b")).toBe(0);
  });

  it("compares core numbers numerically before any prerelease", () => {
    expect(compareRuntimeVersions("1.10.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareRuntimeVersions("2.0.0-alpha", "1.99.99")).toBeGreaterThan(0);
    expect(compareRuntimeVersions("0.163.0", "0.167.0")).toBeLessThan(0);
  });
});
