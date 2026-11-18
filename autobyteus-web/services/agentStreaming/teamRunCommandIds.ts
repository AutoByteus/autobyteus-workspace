import { createRandomId } from '~/utils/randomId';

/** A Team stream command's client id: a message's, or an interrupt's. */
export const buildClientMessageId = (): string => `client_${createRandomId()}`;

export const buildClientInterruptCommandId = (): string =>
  buildClientMessageId().replace(/^client_/, 'client_interrupt_');
