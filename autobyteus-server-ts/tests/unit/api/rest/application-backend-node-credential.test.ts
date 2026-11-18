import { describe, expect, it } from "vitest";
import {
  toApplicationHeaderRecord,
  toApplicationQueryRecord,
} from "../../../../src/api/rest/application-backend-route-handlers.js";

describe("An application's backend and the node credential (node access model NA-8)", () => {
  it("NAS-18 an installed application's backend gets the owner's requests without the node credential: no Authorization header, no access_token query", () => {
    const headers = toApplicationHeaderRecord({
      Authorization: "Bearer own_owner-credential-value",
      "content-type": "application/json",
      "x-app-header": ["a", "b"],
    } as never);
    expect(headers).toEqual({ "content-type": "application/json", "x-app-header": ["a", "b"] });

    const query = toApplicationQueryRecord({ access_token: "mra_phone-credential-value", page: "2", tags: ["x", "y"] });
    expect(query).toEqual({ page: "2", tags: ["x", "y"] });
  });
});
