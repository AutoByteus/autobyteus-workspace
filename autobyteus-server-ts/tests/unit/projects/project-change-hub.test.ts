import { describe, expect, it, vi } from "vitest";
import { projectWire } from "../../../src/projects/changes/project-change-messages.js";
import { ProjectChangeHub } from "../../../src/projects/changes/project-change-hub.js";

describe("ProjectChangeHub", () => {
  it("broadcasts exact path views and rejects obsolete link keys", () => {
    const hub = new ProjectChangeHub(), client = {send: vi.fn(), close: vi.fn()};
    hub.connect(client);
    const link = {workspaceRootPath: "/work/#? 文件夹", description: "Source", displayName: "#? 文件夹", availability: "UNREGISTERED" as const};
    const project = {projectId: "p", name: "Paths", description: "", createdAt: "1", updatedAt: "2", workspaces: [link], taskCount: 0, openTaskCount: 0};
    hub.broadcast({type: "project_upserted", project: projectWire(project)});
    const frame = JSON.parse(client.send.mock.calls.at(-1)![0]);
    expect(frame.project.workspaces).toEqual([link]);
    expect(Object.keys(frame.project.workspaces[0]).sort()).toEqual(["availability", "description", "displayName", "workspaceRootPath"]);
    for (const extra of [{workspaceId: "old"}, {addedAt: "1"}]) {
      expect(() => hub.broadcast({type: "project_upserted", project: {...project, workspaces: [{...link, ...extra}]}} as never)).toThrow();
    }
    hub.closeAll();
  });

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
