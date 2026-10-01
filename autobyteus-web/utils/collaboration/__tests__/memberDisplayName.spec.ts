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
  it('splits the delivery header from the message', () => {
    expect(parseInterAgentDelivery('You received a message from sender name: researcher, sender id: r-1\nmessage:\nHello\n\nReference files:\n- /a.md'))
      .toEqual({ senderName: 'researcher', senderAgentRunId: 'r-1', body: 'Hello\n\nReference files:\n- /a.md' })
    expect(parseInterAgentDelivery('plain text')).toEqual({ senderName: null, senderAgentRunId: null, body: 'plain text' })
  })
})
