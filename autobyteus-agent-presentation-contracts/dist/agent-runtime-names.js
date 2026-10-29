/**
 * The agent runtimes' names: the one list the app and the server use in every view and in texts to agents
 * (`GLOSSARY.md`, "Agent runtimes"). Keyed by runtime kind; the kinds themselves are unchanged.
 */
export const AGENT_RUNTIME_NAMES = Object.freeze({
    autobyteus: "AutoByteus",
    codex_app_server: "Codex App Server",
    claude_agent_sdk: "Claude Agent SDK",
    antigravity_cli: "Antigravity CLI",
    grok_build: "Grok Build",
});
/** The runtime's name everywhere in the app and in texts to agents; an unknown kind is shown as given. */
export const agentRuntimeName = (runtimeKind) => Object.prototype.hasOwnProperty.call(AGENT_RUNTIME_NAMES, runtimeKind)
    ? AGENT_RUNTIME_NAMES[runtimeKind]
    : runtimeKind;
//# sourceMappingURL=agent-runtime-names.js.map