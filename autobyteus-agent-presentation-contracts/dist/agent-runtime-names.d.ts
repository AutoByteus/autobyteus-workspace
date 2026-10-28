/**
 * The agent runtimes' names: the one list the app and the server use in every view and in texts to agents
 * (`GLOSSARY.md`, "Agent runtimes"). Keyed by runtime kind; the kinds themselves are unchanged.
 */
export declare const AGENT_RUNTIME_NAMES: Readonly<{
    readonly autobyteus: "AutoByteus";
    readonly codex_app_server: "Codex App Server";
    readonly claude_agent_sdk: "Claude Agent SDK";
    readonly antigravity_cli: "Antigravity CLI";
    readonly grok_build: "Grok Build";
}>;
/** The runtime's name everywhere in the app and in texts to agents; an unknown kind is shown as given. */
export declare const agentRuntimeName: (runtimeKind: string) => string;
//# sourceMappingURL=agent-runtime-names.d.ts.map