import { describe, expect, it } from "vitest";
import { createServerSignature } from "../../../../src/infrastructure/server-api/server-signature.js";

describe("createServerSignature", () => {
  it("creates deterministic hash for timestamp and body", () => {
    const signature = createServerSignature('{"hello":"world"}', "1707350400", "secret-1");
    expect(signature).toBe("ac9d003806412379110f2e9b31cd56f56981cc340e53f9152afccd098d9fd0ea");
  });
});
