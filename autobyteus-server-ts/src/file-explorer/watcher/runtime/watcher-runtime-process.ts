import { ChokidarWatcherRuntime } from "./chokidar-watcher-runtime.js";
import {
  isWatcherRuntimeCommand,
  type WatcherRuntimeMessage,
} from "./watcher-runtime-protocol.js";

const sendMessage = (message: WatcherRuntimeMessage): void => {
  if (!process.connected || typeof process.send !== "function") {
    return;
  }
  try {
    process.send(message);
  } catch {
    // Parent is gone; disconnect handling will stop the runtime.
  }
};

const runtime = new ChokidarWatcherRuntime(sendMessage);
let shutdownStarted = false;

const shutdown = async (reason: string, exitCode = 0): Promise<void> => {
  if (shutdownStarted) {
    return;
  }
  shutdownStarted = true;
  try {
    await runtime.stop(reason);
  } catch (error) {
    console.error(`[WatcherRuntimeProcess] stop failed during ${reason}:`, error);
    exitCode = exitCode === 0 ? 1 : exitCode;
  } finally {
    process.exit(exitCode);
  }
};

process.on("message", (rawMessage: unknown) => {
  void (async () => {
    if (!isWatcherRuntimeCommand(rawMessage)) {
      console.error("[WatcherRuntimeProcess] Ignoring malformed command");
      return;
    }

    if (rawMessage.type === "start") {
      await runtime.start(rawMessage);
      return;
    }

    await shutdown(rawMessage.reason ?? rawMessage.type);
  })().catch((error: unknown) => {
    console.error("[WatcherRuntimeProcess] command failed:", error);
    void shutdown("command-failed", 1);
  });
});

process.on("disconnect", () => {
  void shutdown("parent-disconnect");
});

process.once("SIGTERM", () => {
  void shutdown("sigterm");
});

process.once("SIGINT", () => {
  void shutdown("sigint");
});

process.on("uncaughtException", (error) => {
  console.error("[WatcherRuntimeProcess] uncaught exception:", error);
  void shutdown("uncaught-exception", 1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[WatcherRuntimeProcess] unhandled rejection:", reason);
  void shutdown("unhandled-rejection", 1);
});
