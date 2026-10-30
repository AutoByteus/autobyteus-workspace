import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RecordBuilder, entryLines, render } from "../journal-record-fixtures.js";

/** Entry lines of one call and its result, times and links removed. */
const lines = (name: string, args: Record<string, unknown>, result: unknown, error: string | null = null, runtime: RuntimeKind | null = RuntimeKind.CODEX_APP_SERVER) =>
  entryLines(render(runtime, new RecordBuilder().tool(name, args, result, error)).markdown)
    .map((line) => line.replace(/^\[\d\d:\d\d:\d\d\] /, "").replace(/ \[↗\]\([^)]*\)$/, ""));
const I = " ".repeat(11);
const ACCEPTED = JSON.stringify({ accepted: true, code: "DELIVERED", message: "Message delivered." });
const REFUSED = JSON.stringify({ accepted: false, code: "TARGET_NOT_FOUND", message: "No agent matches that recipient." });

describe("messages (AC-001, AC-004)", () => {
  it("names the recipient as the call gave it: address, name, run, team run", () => {
    expect(lines("send_message_to", { recipient_address: "/reviewer", message_type: "task_result", content: "done", reference_files: ["/a.ts", "/b.ts"] }, ACCEPTED))
      .toEqual(["Message to /reviewer (task_result) → delivered", `${I}done`, `${I}Files: /a.ts, /b.ts`]);
    expect(lines("send_message_to", { recipient_name: "reviewer", content: "x" }, ACCEPTED)[0]).toBe("Message to reviewer → delivered");
    expect(lines("send_message_to", { target_agent_run_id: "run_9", content: "x" }, ACCEPTED)[0]).toBe("Message to run run_9 → delivered");
    expect(lines("delegate_task", { target_team_run_id: "team_1", task_id: "t-1" }, "{}")[0]).toBe("Delegate task t-1 to team run team_1 → ok");
    expect(lines("send_message_to", { content: "x" }, ACCEPTED)[0]).toBe("Message to (recipient not recorded) → delivered");
  });

  it("a refused message is a failure with the platform's own words, not ok", () => {
    expect(lines("send_message_to", { recipient_address: "/nobody", content: "hello" }, REFUSED))
      .toEqual(["Message to /nobody → failed: No agent matches that recipient.", `${I}hello`]);
  });

  it("a refusal that arrives as the call's error (Antigravity) gives the same words; other errors keep their text", () => {
    expect(lines("send_message_to", { content: "x" }, null, REFUSED)[0])
      .toBe("Message to (recipient not recorded) → failed: No agent matches that recipient.");
    expect(lines("send_message_to", { recipient_address: "/a", content: "x" }, null, "network down")[0]).toBe("Message to /a → failed: network down");
  });

  it("a result that says nothing about acceptance is ok; no result is said so", () => {
    expect(lines("send_message_to", { recipient_address: "/a", content: "x" }, "sent")[0]).toBe("Message to /a → ok");
    const builder = new RecordBuilder();
    const out = entryLines(render(RuntimeKind.CODEX_APP_SERVER, [builder.call("send_message_to", { recipient_address: "/a", content: "x" })]).markdown);
    expect(out[0]).toContain("Message to /a → no result in this file");
  });

  it("shows a long message as far as the argument limit and links to the call", () => {
    const text = Array.from({ length: 60 }, (_v, index) => `line ${index + 1}`).join("\n");
    const out = entryLines(render(RuntimeKind.CODEX_APP_SERVER, new RecordBuilder().tool("send_message_to", { recipient_address: "/a", content: text }, ACCEPTED)).markdown);
    expect(out).toContain(`${I}line 40`);
    expect(out.join("\n")).not.toContain("line 41\n");
    expect(out.join("\n")).toMatch(/\[raw#rt_001\]\(\.\.\/raw_traces_active\.jsonl#rt_001\)/);
  });

  it("a description-only delegation shows the description; handoff rules show the rules", () => {
    expect(lines("delegate_task", { recipient_address: "/dev", description: "Fix the bug\nsee a.ts" }, "{}"))
      .toEqual(["Delegate task to /dev → ok", `${I}Fix the bug`, `${I}see a.ts`]);
    expect(lines("get_handoff_rules", {}, "[]")).toEqual(["Check handoff rules → ok", `${I}[]`]);
  });
});

describe("project board (AC-001, AC-005)", () => {
  it("current tools", () => {
    expect(lines("create_task", { project_id: "p", title: "T1", description: "Body\nmore" }, "{}")).toEqual(["Create project task: T1 → ok", `${I}Body`, `${I}more`]);
    expect(lines("create_task", { project_id: "p", description: "Only a description" }, "{}")[0]).toBe("Create project task: Only a description → ok");
    expect(lines("update_task", { task_id: "p-1", status: "DONE", title: "New" }, "{}")[0]).toBe("Update project task p-1: status DONE, title \"New\" → ok");
    expect(lines("update_task", { task_id: "p-1", add_comment: "looks fine" }, "{}")).toEqual(["Update project task p-1 → ok", `${I}Comment: looks fine`]);
    expect(lines("get_project_task", { project_id: "p", task_id: "p-1" }, "{\"a\":1}")).toEqual(["Read project task p-1 → ok", `${I}{"a":1}`]);
    expect(lines("list_project_tasks", {}, "[]")[0]).toBe("List project tasks → ok");
    expect(lines("list_project_tasks", { project_id: "p", status: "TODO" }, "[]")[0]).toBe("List project tasks (project p) → ok");
    expect(lines("search_project_tasks", { project_id: "p", query: "round" }, "[]")[0]).toBe("Search project tasks \"round\" → ok");
    expect(lines("create_project", { name: "Ship" }, "{}")).toEqual(["Create project: Ship → ok"]);
    expect(lines("update_project", { project_id: "p" }, "{}")).toEqual(["Update project p → ok"]);
    expect(lines("list_projects", {}, "[]")).toEqual(["List projects → ok", `${I}[]`]);
  });

  it("recorded-history names keep their lines", () => {
    expect(lines("create_or_update_task", { description: "First line\nsecond" }, "{}")).toEqual(["Create or update project task: First line → ok"]);
    expect(lines("create_or_update_project", { name: "Ship" }, "{}")).toEqual(["Create or update project: Ship → ok"]);
    expect(lines("manage_task", { Action: "update", TaskId: "p-7" }, "ok")).toEqual(["Project task: update p-7 → ok"]);
    expect(lines("manage_task", {}, "ok")).toEqual(["Project task: (not recorded) → ok"]);
  });

  it("a failure keeps its text", () => {
    expect(lines("update_task", { task_id: "p-1", status: "DONE" }, null, "TASK_NOT_FOUND")).toEqual(["Update project task p-1: status DONE → failed: TASK_NOT_FOUND"]);
  });
});

describe("browser, media, discovery (AC-001)", () => {
  it("browser", () => {
    expect(lines("open_tab", { url: "http://a" }, "{\"tab_id\":\"t\"}")).toEqual(["Browser: open http://a → ok", `${I}{"tab_id":"t"}`]);
    expect(lines("navigate_to", { tab_id: "t", url: "http://b" }, "{}")).toEqual(["Browser: go to http://b (tab t) → ok"]);
    expect(lines("navigate_to", { url: "http://b" }, "{}")).toEqual(["Browser: go to http://b (tab not recorded) → ok"]);
    expect(lines("close_tab", { tab_id: "t" }, "{}")).toEqual(["Browser: close tab t → ok"]);
    expect(lines("run_script", { tab_id: "t", javascript: "1+1" }, "2")).toEqual(["Browser: run script (tab t) → ok", `${I}1+1`, `${I}2`]);
    expect(lines("set_device_emulation", { tab_id: "t", mode: "mobile" }, "{}")).toEqual(["Browser: set device emulation mobile (tab t) → ok"]);
    expect(lines("dom_snapshot", { tab_id: "t" }, "- a")).toEqual(["Browser: page snapshot (tab t) → ok", `${I}- a`]);
  });

  it("media", () => {
    expect(lines("generate_image", { prompt: "a cat", output_file_path: "c.png" }, "{}")).toEqual(["Generate image: \"a cat\" → ok", `${I}File: c.png`]);
    expect(lines("edit_image", { prompt: "white", input_images: ["a", "b"], output_file_path: "c.png" }, "{}")[0]).toBe("Edit image: \"white\" (2 input images) → ok");
    expect(lines("generate_speech", { prompt: "Hello", output_file_path: "h.mp3" }, "{}")).toEqual(["Generate speech → ok", `${I}Hello`, `${I}File: h.mp3`]);
    expect(lines("generate_video", { prompt: "belt" }, "{}")).toEqual(["Generate video: \"belt\" → ok"]);
  });

  it("discovery, memory search, artifacts, routing answer", () => {
    expect(lines("list_available_agents", {}, "[]")[0]).toBe("List available agents → ok");
    expect(lines("list_available_agent_runtimes", {}, "[]")[0]).toBe("List available agent runtimes → ok");
    expect(lines("search_memory", { query: "fees" }, "[]")).toEqual(["Search memory \"fees\" → ok", `${I}[]`]);
    expect(lines("publish_artifacts", { artifacts: [{ path: "/a.md" }, { path: "/b.md", description: "d" }] }, "{}")).toEqual(["Publish artifacts: /a.md, /b.md → ok"]);
    expect(lines("publish_artifacts", {}, "{}")[0]).toBe("Publish artifacts: (paths not recorded) → ok");
    expect(lines("submit_launch_choices", { requestId: "r", choices: [
      { address: "/a", runtime: "codex_app_server", model: "m1", taskKind: "build" }, { address: "/b", runtime: "autobyteus", model: "m2" }] }, "{}"))
      .toEqual(["Submit launch choices (2 agents) → ok", `${I}/a: codex_app_server / m1, build`, `${I}/b: autobyteus / m2`]);
  });
});

describe("the same line on every runtime and a user's own tool of the same name (AC-001, AC-006)", () => {
  it("every runtime and no runtime give one line for one platform call", () => {
    const results = [...Object.values(RuntimeKind), null].map((kind) =>
      lines("search_project_tasks", { project_id: "p", query: "q" }, "[]", null, kind));
    for (const result of results) expect(result).toEqual(results[0]);
  });

  it("a server-qualified tool with a platform tool's name is the user's tool", () => {
    expect(lines("acme.list_projects", {}, "x", null, RuntimeKind.CODEX_APP_SERVER)[0]).toBe("Tool: list_projects (via acme) → ok");
    expect(lines("mcp__acme__list_projects", {}, "x", null, RuntimeKind.ANTIGRAVITY_CLI)[0]).toBe("Tool: list_projects (via acme) → ok");
  });
});
