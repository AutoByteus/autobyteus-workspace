import { describe, expect, it } from 'vitest'
import {
  COLLABORATOR_ADD_FAILED,
  CollaboratorAddRejection,
  collaboratorAddRejectionOf,
} from '../collaboratorAddFailures'

describe('collaborator add rejection (DS-008)', () => {
  it('maps a COLLABORATOR_ADD_FAILED payload of any transport to a rejection with the name and reason', () => {
    const rejection = collaboratorAddRejectionOf({
      code: COLLABORATOR_ADD_FAILED, message: 'Its model is not available. ', collaborator_name: 'Marketing Team',
    })
    expect(rejection).toBeInstanceOf(CollaboratorAddRejection)
    expect(rejection?.failure).toEqual({ name: 'Marketing Team', reason: 'Its model is not available.' })
    expect(rejection?.message).toBe('Its model is not available.')
  })

  it('leaves every other failure to the transport', () => {
    expect(collaboratorAddRejectionOf({ code: 'RUNTIME_REJECTED', message: 'x' })).toBeNull()
    expect(collaboratorAddRejectionOf({ code: COLLABORATOR_ADD_FAILED, message: 'no name' })).toBeNull()
  })
})
