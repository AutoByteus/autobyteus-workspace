import { MessageNotDeliveredError, type MessageNotDeliveredCertainty } from '~/services/runSubmission/messageNotDelivered'

/**
 * An Org command whose answer was lost with its connection (autobyteus-533 D-W7). The Org stream gives it to a Stop
 * after the rebind's snapshot is applied, or when the stream is closed for good; the Stop then lets the run's status
 * decide instead of reporting a failure.
 */
export class AgentOrgConnectionLostError extends Error {
  constructor() {
    super('The AgentOrg stream connection was lost before the command was acknowledged.')
    this.name = 'AgentOrgConnectionLostError'
  }
}

/**
 * What an Org command rejects with when it did not reach the node (`not_sent`: the stream was not ready, the socket
 * threw) or its connection closed before the answer (`unknown`): a message is not delivered and comes back to the
 * message box (autobyteus-540 D-5); any other command keeps a plain error with the same detail. A Stop lost with its
 * connection is held instead (`AgentOrgConnectionLostError`).
 */
export const orgCommandFailure = (commandType: string, certainty: MessageNotDeliveredCertainty, detail: string): Error =>
  commandType === 'SEND_MESSAGE' ? new MessageNotDeliveredError(certainty, detail) : new Error(detail)
