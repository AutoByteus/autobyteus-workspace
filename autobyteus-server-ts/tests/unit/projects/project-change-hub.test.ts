import { describe, expect, it, vi } from "vitest";
import { ProjectChangeHub } from "../../../src/projects/changes/project-change-hub.js";

describe("ProjectChangeHub", () => {
  it("greets each connection, broadcasts validated frames to all, and drops a connection whose send fails", () => {
    const hub = new ProjectChangeHub();
    const a = { send: vi.fn(), close: vi.fn() };
    const b = { send: vi.fn(() => { throw new Error("closed"); }), close: vi.fn() };
    hub.connect(a);
    expect(a.send).toHaveBeenCalledWith(JSON.stringify({ type: "connected" }));
    hub.connect(b);
    expect(b.close).toHaveBeenCalledWith(1011);
    hub.broadcast({ type: "project_removed", projectId: "p1" });
    expect(a.send).toHaveBeenLastCalledWith(JSON.stringify({ type: "project_removed", projectId: "p1" }));
    expect(b.send).toHaveBeenCalledTimes(1);
    // The exact writer refuses shapes outside the contract.
    expect(() => hub.broadcast({ type: "project_removed", projectId: "" } as never)).toThrow();
    const id = hub.connect({ send: vi.fn(), close: vi.fn() });
    hub.disconnect(id);
    hub.closeAll();
    expect(a.close).toHaveBeenCalledWith(1001);
  });
});
