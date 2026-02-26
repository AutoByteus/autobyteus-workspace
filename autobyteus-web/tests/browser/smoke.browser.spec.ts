import { describe, expect, it } from 'vitest'

describe('browser smoke', () => {
  it('renders and mutates real DOM in browser mode', () => {
    document.body.innerHTML = '<button id="go">Start</button>'
    const button = document.getElementById('go')
    expect(button).toBeTruthy()
    expect(button?.textContent).toBe('Start')

    button?.setAttribute('data-state', 'ready')
    expect(button?.getAttribute('data-state')).toBe('ready')
  })
})
