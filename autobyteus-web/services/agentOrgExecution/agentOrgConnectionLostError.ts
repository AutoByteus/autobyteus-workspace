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
