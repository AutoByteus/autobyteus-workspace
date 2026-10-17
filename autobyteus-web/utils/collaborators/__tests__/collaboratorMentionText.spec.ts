import { describe, expect, it } from 'vitest'
import { composeCollaboratorMentionNote } from '@autobyteus/agent-presentation-contracts'
import {
  presentSentUserMessage,
  splitMentionText,
  textHasMention,
  toCollaboratorMentionDtos,
} from '../collaboratorMentionText'
import { skillRequestInstruction } from '~/utils/skills/skillRequestInstruction'
import { resolveFirstUserMessageSummary } from '~/utils/runTreeSummary'

const reviewer = { kind: 'agent' as const, definitionId: 'code-reviewer', name: 'Code Reviewer' }
const team = { kind: 'agent_team' as const, definitionId: 'product-team', name: 'Product Team' }

describe('collaborator mention text', () => {
  it('matches whole mentions only', () => {
    expect(textHasMention('ask @Code Reviewer now', 'Code Reviewer')).toBe(true)
    expect(textHasMention('ask @Code Reviewers now', 'Code Reviewer')).toBe(false)
    expect(textHasMention('mail@Code Reviewer', 'Code Reviewer')).toBe(false)
  })

  it('sends only the mentions still in the text, and nothing when none are', () => {
    expect(toCollaboratorMentionDtos('ask @Product Team', [reviewer, team])).toEqual([{ kind: 'agent_team', definition_id: 'product-team' }])
    expect(toCollaboratorMentionDtos('no mentions', [reviewer])).toBeUndefined()
  })

  it('splits known mentions for inline chips, longest names first', () => {
    expect(splitMentionText('ask @Product Team Lead or @Product Team', ['Product Team', 'Product Team Lead'])).toEqual([
      { kind: 'text', value: 'ask ' },
      { kind: 'mention', value: 'Product Team Lead' },
      { kind: 'text', value: ' or ' },
      { kind: 'mention', value: 'Product Team' },
    ])
  })

  it('reads a sent message without the skill instruction or the server mention note', () => {
    const content = composeCollaboratorMentionNote(
      skillRequestInstruction.compose(['writer'], 'ask @Product Team to fix it'),
      [{ name: 'Product Team', kind: 'agent_team', address: '/product_team', presence: 'not_in_run' }],
    )
    expect(presentSentUserMessage(content)).toEqual({
      skillNames: ['writer'], text: 'ask @Product Team to fix it', mentionNames: ['Product Team'],
    })
    expect(presentSentUserMessage('plain @Code Reviewer', ['Code Reviewer']).mentionNames).toEqual(['Code Reviewer'])
  })

  it('reads a message whose note marks an agent already in the run as chips, without the note (AC-005)', () => {
    const content = composeCollaboratorMentionNote('ask @Agent Package Creator', [
      { name: 'Agent Package Creator', kind: 'agent', address: '/agent_package_creator', presence: 'in_run' },
    ])
    expect(content).toContain('- Agent Package Creator (agent) at /agent_package_creator: talk with it using send_message_to, or delegate a task to it')
    expect(presentSentUserMessage(content)).toEqual({
      skillNames: [], text: 'ask @Agent Package Creator', mentionNames: ['Agent Package Creator'],
    })
  })

  it('reads every per-viewer note form as chips without the note (AC-006)', () => {
    const content = composeCollaboratorMentionNote('ask @Lead @Designer @Host', [
      { name: 'Lead', kind: 'agent', address: '/lead', presence: 'own_team' },
      { name: 'Designer', kind: 'agent', address: '/designer', presence: 'self' },
      { name: 'Host', kind: 'agent', address: '/host', presence: 'run_agent' },
    ])
    expect(content).toContain('- Lead (agent) at /lead, in your team: ')
    expect(presentSentUserMessage(content)).toEqual({
      skillNames: [], text: 'ask @Lead @Designer @Host', mentionNames: ['Lead', 'Designer', 'Host'],
    })
  })

  it('still reads a saved message that carries the earlier [Mentioned collaborators] note', () => {
    const saved = 'ask @Product Team\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nDelegate the work with delegate_task to its address; it returns a run ID to follow up with.'
    expect(presentSentUserMessage(saved)).toEqual({ skillNames: [], text: 'ask @Product Team', mentionNames: ['Product Team'] })
    expect(resolveFirstUserMessageSummary({ messages: [{ type: 'user', text: saved } as never] })).toBe('ask @Product Team')
  })

  it('run summaries drop the note; a mention-only message reads as its mentions', () => {
    const summary = (text: string) => resolveFirstUserMessageSummary({ messages: [{ type: 'user', text } as never] })
    expect(summary(composeCollaboratorMentionNote('ask @Code Reviewer', [{ name: 'Code Reviewer', kind: 'agent', address: '/code_reviewer', presence: 'not_in_run' }])))
      .toBe('ask @Code Reviewer')
    expect(summary(composeCollaboratorMentionNote('', [{ name: 'Code Reviewer', kind: 'agent', address: '/code_reviewer', presence: 'not_in_run' }])))
      .toBe('@Code Reviewer')
  })
})
