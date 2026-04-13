import { ReceiptWorkflowRuntime } from "./receipt-workflow-runtime.js";

let cachedReceiptWorkflowRuntime: ReceiptWorkflowRuntime | null = null;

export const getReceiptWorkflowRuntime = (): ReceiptWorkflowRuntime => {
  if (!cachedReceiptWorkflowRuntime) {
    cachedReceiptWorkflowRuntime = new ReceiptWorkflowRuntime();
  }
  return cachedReceiptWorkflowRuntime;
};

export const startReceiptWorkflowRuntime = (): void => {
  getReceiptWorkflowRuntime().start();
};

export const stopReceiptWorkflowRuntime = async (): Promise<void> => {
  if (!cachedReceiptWorkflowRuntime) {
    return;
  }
  await cachedReceiptWorkflowRuntime.stop();
  cachedReceiptWorkflowRuntime = null;
};
