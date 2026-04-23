export type HostedApplicationStartupState = "unsupported_entry" | "waiting_for_bootstrap" | "starting_app" | "startup_failed" | "handoff_complete";
export declare const renderDefaultStartupScreen: (input: {
    rootElement: HTMLElement;
    state: HostedApplicationStartupState;
    errorMessage?: string | null;
}) => void;
//# sourceMappingURL=default-startup-screen.d.ts.map