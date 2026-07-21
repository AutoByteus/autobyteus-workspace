export type PendingWebSocket = {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

export const observePendingWebSocketState = (socket: PendingWebSocket): { isClosed: () => boolean } => {
  let closed = false;
  const markClosed = (): void => { closed = true; };
  socket.on("close", markClosed);
  socket.on("error", markClosed);
  return { isClosed: () => closed };
};
