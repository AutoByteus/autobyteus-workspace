import { describe, expect, it } from "vitest";
import { toInboundHttpRequest } from "../../../../src/http/mappers/http-request-mapper.js";

describe("toInboundHttpRequest", () => {
  it("normalizes headers/query/raw body", () => {
    const mapped = toInboundHttpRequest({
      method: "POST",
      url: "/webhooks/whatsapp?token=t",
      headers: {
        "X-Test": "a",
        "x-multi": ["v1", "v2"],
        "x-ignored": 123,
      },
      query: {
        token: "abc",
        ignored: 1,
      },
      body: {
        ping: true,
      },
      rawBody: '{"ping":true}',
    } as any);

    expect(mapped).toEqual({
      method: "POST",
      path: "/webhooks/whatsapp?token=t",
      headers: {
        "x-test": "a",
        "x-multi": "v1",
      },
      query: {
        token: "abc",
      },
      body: {
        ping: true,
      },
      rawBody: '{"ping":true}',
    });
  });
});
