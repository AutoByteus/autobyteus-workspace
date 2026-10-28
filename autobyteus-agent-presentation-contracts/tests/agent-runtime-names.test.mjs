import test from "node:test";
import assert from "node:assert/strict";
import { AGENT_RUNTIME_NAMES, agentRuntimeName } from "../dist/index.js";

test("each runtime kind has its full name (autobyteus-320, AC-005)", () => {
  assert.deepEqual({ ...AGENT_RUNTIME_NAMES }, {
    autobyteus: "AutoByteus",
    codex_app_server: "Codex App Server",
    claude_agent_sdk: "Claude Agent SDK",
    antigravity_cli: "Antigravity CLI",
    grok_build: "Grok Build",
  });
  for (const [kind, name] of Object.entries(AGENT_RUNTIME_NAMES)) assert.equal(agentRuntimeName(kind), name);
  assert.ok(Object.isFrozen(AGENT_RUNTIME_NAMES));
});

test("an unknown kind is shown as given, including object keys", () => {
  assert.equal(agentRuntimeName("future_runtime"), "future_runtime");
  assert.equal(agentRuntimeName(""), "");
  assert.equal(agentRuntimeName("toString"), "toString");
  assert.equal(agentRuntimeName("__proto__"), "__proto__");
});
