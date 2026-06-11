import { randomUUID } from "node:crypto";

type SocketLike = {
  send(data: string): void;
};

export const buildE2eClientCommandIds = (): { message_id: string; dedupe_key: string } => {
  const messageId = `e2e-${randomUUID()}`;
  return {
    message_id: messageId,
    dedupe_key: `agent_run_input:e2e:${messageId}`,
  };
};

export const sendE2eSendMessageCommand = (
  socket: SocketLike,
  payload: Record<string, unknown>,
): void => {
  socket.send(
    JSON.stringify({
      type: "SEND_MESSAGE",
      payload: {
        ...buildE2eClientCommandIds(),
        ...payload,
      },
    }),
  );
};
