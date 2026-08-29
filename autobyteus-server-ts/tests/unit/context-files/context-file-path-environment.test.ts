import { describe, expect, it } from "vitest";
import { createContextFilePathEnvironment } from "../../../src/context-files/domain/context-file-path-environment.js";

describe("createContextFilePathEnvironment", () => {
  it("returns the exact frozen trimmed two-field value", () => {
    const value = createContextFilePathEnvironment({
      appDataDir: "  /tmp/app-data  ",
      baseUrl: "  https://studio.example.test:8443/base  ",
    });
    expect(value).toEqual({
      appDataDir: "/tmp/app-data",
      baseUrl: "https://studio.example.test:8443/base",
    });
    expect(Object.keys(value)).toEqual(["appDataDir", "baseUrl"]);
    expect(Object.isFrozen(value)).toBe(true);
  });

  it.each([
    [{ appDataDir: "", baseUrl: "http://localhost:8000" }, "appDataDir"],
    [{ appDataDir: "/tmp/app", baseUrl: "" }, "baseUrl"],
    [{ appDataDir: "/tmp/app", baseUrl: "/relative" }, "absolute HTTP(S)"],
    [{ appDataDir: "/tmp/app", baseUrl: "file:///tmp/server" }, "absolute HTTP(S)"],
    [{ appDataDir: "/tmp/app", baseUrl: "not a url" }, "absolute HTTP(S)"],
  ] as const)("rejects invalid required input %j", (input, message) => {
    expect(() => createContextFilePathEnvironment(input)).toThrow(message);
  });

  it.each(["appDataDir", "baseUrl"] as const)(
    "rejects omitted, null, and undefined %s",
    (field) => {
      for (const value of ["omitted", null, undefined] as const) {
        const input: Record<string, unknown> = {
          appDataDir: "/tmp/app",
          baseUrl: "http://localhost:8000",
        };
        if (value === "omitted") delete input[field];
        else input[field] = value;
        expect(() => createContextFilePathEnvironment(input as never)).toThrow();
      }
    },
  );
});
