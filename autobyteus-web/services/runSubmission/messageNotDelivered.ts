/**
 * A message the node does not have, or may not have (autobyteus-540 D-4): `not_sent` when the page knows the node does
 * not have it (the stream was not ready, the socket was not open, or the rebind's snapshot shows it missing);
 * `unknown` when the connection was lost while sending and the page cannot tell. The shared failure owner
 * (`failLocalSubmission`) returns the draft and shows one plain notice for it; `detail` is for the console only.
 */
export type MessageNotDeliveredCertainty = 'not_sent' | 'unknown';

export class MessageNotDeliveredError extends Error {
  constructor(readonly certainty: MessageNotDeliveredCertainty, detail: string) {
    super(detail);
    this.name = 'MessageNotDeliveredError';
  }
}
