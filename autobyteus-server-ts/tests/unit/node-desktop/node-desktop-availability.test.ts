import { describe, expect, it } from "vitest";
import { resolveNodeDesktop } from "../../../src/node-desktop/node-desktop-availability.js";
import { STARTER_SOCKET_ENV } from "../../../src/node-update/starter-client.js";

describe("resolveNodeDesktop", () => {
  it("is the node desktop at 127.0.0.1:5900 when the Docker starter runs this server", () => {
    expect(resolveNodeDesktop({ [STARTER_SOCKET_ENV]: "/run/autobyteus/starter.sock" }))
      .toEqual({ host: "127.0.0.1", port: 5900 });
  });

  it("is none for an embedded or development server (no starter socket)", () => {
    expect(resolveNodeDesktop({})).toBeNull();
    expect(resolveNodeDesktop({ [STARTER_SOCKET_ENV]: "" })).toBeNull();
  });
});
