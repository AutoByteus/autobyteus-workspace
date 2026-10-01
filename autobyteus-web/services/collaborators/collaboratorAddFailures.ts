/** The admission code a root returns when a mentioned collaborator cannot be added (DS-008). */
export const COLLABORATOR_ADD_FAILED = 'COLLABORATOR_ADD_FAILED'

/** The notice shown above the composer after a rejected send (the draft is kept). */
export type CollaboratorAddFailure = Readonly<{ name: string; reason: string }>

/**
 * A send rejected at admission: nothing was added and nothing was posted. Every transport
 * (agent stream ack, Team stream error, collaboration stream ack) maps its rejection to this.
 */
export class CollaboratorAddRejection extends Error {
  readonly code = COLLABORATOR_ADD_FAILED
  constructor(readonly collaboratorName: string, readonly reason: string) {
    super(reason)
    this.name = 'CollaboratorAddRejection'
  }

  get failure(): CollaboratorAddFailure {
    return Object.freeze({ name: this.collaboratorName, reason: this.reason })
  }
}

/** The rejection carried by a transport payload, or null when the payload is another failure. */
export const collaboratorAddRejectionOf = (payload: Readonly<{
  code?: string | null
  message?: string | null
  collaborator_name?: string | null
}>): CollaboratorAddRejection | null => payload.code === COLLABORATOR_ADD_FAILED && payload.collaborator_name
  ? new CollaboratorAddRejection(payload.collaborator_name, payload.message?.trim() ?? '')
  : null
