import { afterEach, describe, expect, it } from "vitest";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
  buildInternalServerBaseUrl,
  getInternalServerBaseUrlOrThrow,
  seedInternalServerBaseUrlFromListenAddress,
} from "../../../src/config/server-runtime-endpoints.js";

describe("server-runtime-endpoints", () => {
  const originalInternalBaseUrl =
    process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];

  afterEach(() => {
    if (originalInternalBaseUrl === undefined) {
      delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
      return;
    }
    process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] =
      originalInternalBaseUrl;
  });

  it.each([
    { host: "0.0.0.0", port: 8000, expected: "http://127.0.0.1:8000" },
    { host: "::", port: 8000, expected: "http://127.0.0.1:8000" },
    { host: "localhost", port: 29695, expected: "http://127.0.0.1:29695" },
    { host: "127.0.0.1", port: 60634, expected: "http://127.0.0.1:60634" },
    {
      host: "server.internal",
      port: 8000,
      expected: "http://server.internal:8000",
    },
    { host: "[2001:db8::10]", port: 9090, expected: "http://[2001:db8::10]:9090" },
  ])(
    "buildInternalServerBaseUrl normalizes $host:$port",
    ({ host, port, expected }) => {
      expect(buildInternalServerBaseUrl({ host, port })).toBe(expected);
    },
  );

  it("seeds the internal base url from the actual listen address port", () => {
    const seeded = seedInternalServerBaseUrlFromListenAddress({
      requestedHost: "0.0.0.0",
      listenAddress: {
        address: "0.0.0.0",
        family: "IPv4",
        port: 29695,
      },
    });

    expect(seeded).toBe("http://127.0.0.1:29695");
    expect(process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR]).toBe(
      "http://127.0.0.1:29695",
    );
  });

  it("rejects socket listen addresses for managed messaging", () => {
    expect(() =>
      seedInternalServerBaseUrlFromListenAddress({
        requestedHost: "localhost",
        listenAddress: "/tmp/autobyteus.sock",
      }),
    ).toThrow(/TCP host\/port binding/);
  });

  it("throws when the runtime internal base url env var is missing", () => {
    delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];

    expect(() => getInternalServerBaseUrlOrThrow()).toThrow(
      /AUTOBYTEUS_INTERNAL_SERVER_BASE_URL/,
    );
  });

  it("rejects runtime internal base urls with path segments", () => {
    process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] =
      "http://127.0.0.1:8000/graphql";

    expect(() => getInternalServerBaseUrlOrThrow()).toThrow(
      /must not include a path/,
    );
  });
});
