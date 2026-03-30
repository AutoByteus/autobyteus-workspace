export type CodexThreadStartupGateStatus = "pending" | "ready" | "failed";

export type CodexThreadStartupGate = {
  status: CodexThreadStartupGateStatus;
  waitForReady: Promise<void>;
  resolveReady: () => void;
  rejectReady: (error: Error) => void;
};

export const createCodexThreadStartupGate = (): CodexThreadStartupGate => {
  const control = {
    resolve: () => {},
    reject: (_error: Error) => {},
  };
  const state = {
    status: "pending" as CodexThreadStartupGateStatus,
    waitForReady: Promise.resolve(),
    resolveReady: () => control.resolve(),
    rejectReady: (error: Error) => control.reject(error),
  };
  state.waitForReady = new Promise<void>((resolve, reject) => {
    control.resolve = () => {
      if (state.status !== "pending") {
        return;
      }
      state.status = "ready";
      resolve();
    };
    control.reject = (error: Error) => {
      if (state.status !== "pending") {
        return;
      }
      state.status = "failed";
      reject(error);
    };
  });
  void state.waitForReady.catch(() => {});
  return state;
};
