import { z } from "zod";
import { ChangeFeedHub } from "../../utils/change-feed-hub.js";

/**
 * The `/ws/update-notifications` change feed (server → client, one JSON message per frame). A
 * client re-reads the notifications on every message.
 */
export const UpdateNotificationChangeMessageSchema = z.union([
  z.strictObject({ type: z.literal("connected") }),
  z.strictObject({ type: z.literal("update_notifications_changed") }),
]);
export type UpdateNotificationChangeMessage = z.infer<typeof UpdateNotificationChangeMessageSchema>;

/** The exact writer: one validated JSON frame. */
export const serializeUpdateNotificationChangeMessage = (message: UpdateNotificationChangeMessage): string =>
  JSON.stringify(UpdateNotificationChangeMessageSchema.parse(message));

export type UpdateNotificationChangeHub = ChangeFeedHub<UpdateNotificationChangeMessage>;

let singleton: UpdateNotificationChangeHub | null = null;
/** The node's process hub (the websocket route connects clients; the notification service broadcasts). */
export const getUpdateNotificationChangeHub = (): UpdateNotificationChangeHub =>
  singleton ??= new ChangeFeedHub<UpdateNotificationChangeMessage>({
    serialize: serializeUpdateNotificationChangeMessage,
    connectedMessage: { type: "connected" },
  });
export const resetUpdateNotificationChangeHubForTests = (): void => { singleton = null; };
