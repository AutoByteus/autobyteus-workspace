import { describe, expect, it } from 'vitest'
import {
  TASK_CARD_TEXT_MAX_CHARS, TASK_LABEL_MAX_CHARS, boundTaskText, descriptionFirstLine, descriptionFirstLineLabel, taskCardPreview,
  taskCardTitle, taskTitleLabel, taskWorkerTaskLabel,
} from '../taskText'

const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(' ')

describe('descriptionFirstLine (a Temp task\'s one-line text)', () => {
  it('uses the first non-empty line, trimmed', () => {
    expect(descriptionFirstLine('Write release notes for 1.4.87\nInclude Projects and Tasks')).toBe('Write release notes for 1.4.87')
    expect(descriptionFirstLine('\n\n   \n  Second paragraph first  \r\nmore')).toBe('Second paragraph first')
  })
  it('returns an empty string for blank input', () => {
    expect(descriptionFirstLine('   \n\t')).toBe('')
  })
})

describe('boundTaskText', () => {
  it('returns text that fits unchanged', () => {
    expect(boundTaskText('Short enough', 12)).toBe('Short enough')
  })
  it('cuts at the last word boundary and ends with "…", within the limit', () => {
    expect(boundTaskText('alpha beta gamma delta', 13)).toBe('alpha beta…')
    expect(boundTaskText('alpha beta gamma delta', 12)).toBe('alpha beta…')
    expect(boundTaskText('alpha beta gamma', 11)).toBe('alpha beta…')
  })
  it('hard-cuts a single word longer than the limit', () => {
    expect(boundTaskText('x'.repeat(50), 10)).toBe(`${'x'.repeat(9)}…`)
  })
  it('never ends on half of a surrogate pair', () => {
    expect(boundTaskText(`${'a'.repeat(8)}😀😀😀`, 10)).toBe(`${'a'.repeat(8)}…`)
  })
})

describe('card title and preview (REQ-006, DEC-018 (3))', () => {
  it('shows the title as the main line and the description\'s start as the preview', () => {
    const task = { title: 'Release the desktop app', description: 'Build the ARM64 image first.\nThen Intel.' }
    expect(taskCardTitle(task.title)).toBe('Release the desktop app')
    expect(taskCardPreview(task)).toBe('Build the ARM64 image first. Then Intel.')
  })

  it('skips a first description line that repeats the title (Tasks titled at upgrade from that line)', () => {
    expect(taskCardPreview({ title: 'Fix login', description: 'Fix login\nThe session is lost.' })).toBe('The session is lost.')
    expect(taskCardPreview({ title: 'Only line', description: '  Only line  ' })).toBe('')
    // A title cut with "…" at upgrade: the line starts with the title before its "…".
    const line = `${'Long first line '.repeat(20)}end`
    expect(taskCardPreview({ title: `${line.slice(0, 199)}…`, description: `${line}\nDetails.` })).toBe('Details.')
  })

  it('keeps a first line that only begins like the title', () => {
    expect(taskCardPreview({ title: 'Fix', description: 'Fix the login page\nDetails' })).toBe('Fix the login page Details')
  })

  it('bounds a ~10,000-word title and preview to the card limit at a word boundary', () => {
    const huge = words(10_000)
    const title = taskCardTitle(huge)
    expect(title.length).toBeLessThanOrEqual(TASK_CARD_TEXT_MAX_CHARS)
    expect(title.endsWith('…')).toBe(true)
    expect(title.slice(0, -1)).toMatch(/word\d+$/)
    const preview = taskCardPreview({ title: 'Short', description: `${words(400)}\n${words(3000)}` })
    expect(preview.length).toBeLessThanOrEqual(TASK_CARD_TEXT_MAX_CHARS)
    expect(preview.endsWith('…')).toBe(true)
  })
})

describe('one-line labels', () => {
  it('shortens a long title for labels and keeps a short one whole', () => {
    const label = taskTitleLabel(words(10_000))
    expect(label.length).toBeLessThanOrEqual(TASK_LABEL_MAX_CHARS)
    expect(label.endsWith('…')).toBe(true)
    expect(taskTitleLabel('Review the docs site.')).toBe('Review the docs site.')
  })

  it('labels a Temp task by its description\'s first line', () => {
    expect(descriptionFirstLineLabel('Review the docs site.\nDetails')).toBe('Review the docs site.')
  })

  it('chooses a Task worker\'s label by the Task\'s kind: a Project Task\'s title, a Temp task\'s first line', () => {
    expect(taskWorkerTaskLabel({ taskId: 't', projectId: 'p', title: 'Release it', description: 'First line\nmore', status: 'TODO' })).toBe('Release it')
    expect(taskWorkerTaskLabel({ taskId: 'x', projectId: null, title: null, description: 'First line\nmore', status: 'TODO' })).toBe('First line')
  })
})
