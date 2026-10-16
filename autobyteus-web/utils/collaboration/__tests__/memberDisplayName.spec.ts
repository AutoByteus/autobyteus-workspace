import { describe, expect, it } from 'vitest'
import { memberDisplayName, memberTitleName } from '../memberDisplayName'
import { parseInterAgentDelivery } from '../interAgentDelivery'

describe('shared member display name (F-03)', () => {
  it('reads the last address segment with spaces, for rows and tab senders in every root', () => {
    expect(memberDisplayName('/product_team/product_prototyper')).toBe('product prototyper')
    expect(memberDisplayName('/code-reviewer')).toBe('code reviewer')
    expect(memberDisplayName('researcher')).toBe('researcher')
    expect(memberDisplayName('/')).toBe('/')
  })

  it('title-cases it for "From <Sender>:"', () => {
    expect(memberTitleName('/product_team/product_prototyper')).toBe('Product Prototyper')
    expect(memberTitleName('research assistant')).toBe('Research Assistant')
  })
})

describe('agent-to-agent delivery content (RD-004)', () => {
  it('reads the current header (the sender run ID only; no name, no address)', () => {
    expect(parseInterAgentDelivery('You received a message from the agent with sender run ID "researcher_r-1".\nmessage:\nHello\n\nReference files:\n- /a.md'))
      .toEqual({ senderAgentRunId: 'researcher_r-1', body: 'Hello\n\nReference files:\n- /a.md' })
    expect(parseInterAgentDelivery('plain text')).toEqual({ senderAgentRunId: null, body: 'plain text' })
  })

  it('still splits the earlier header (sender name and sender id) from the message and reads only the run ID', () => {
    expect(parseInterAgentDelivery('You received a message from sender name: researcher, sender id: r-1\nmessage:\nHello\n\nReference files:\n- /a.md'))
      .toEqual({ senderAgentRunId: 'r-1', body: 'Hello\n\nReference files:\n- /a.md' })
    expect(parseInterAgentDelivery('plain text')).toEqual({ senderAgentRunId: null, body: 'plain text' })
  })

  it('still reads stored headers with and without the sender address', () => {
    expect(parseInterAgentDelivery('You received a message from sender name: lead, sender address: /eng/lead, sender id: lead_9a\nmessage:\nStatus?'))
      .toEqual({ senderAgentRunId: 'lead_9a', body: 'Status?' })
    expect(parseInterAgentDelivery('You received a message from sender name: lead, sender id: lead_9a\nmessage:\nStatus?'))
      .toEqual({ senderAgentRunId: 'lead_9a', body: 'Status?' })
  })
})
