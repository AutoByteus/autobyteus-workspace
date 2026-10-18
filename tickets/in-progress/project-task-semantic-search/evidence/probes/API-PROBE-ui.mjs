// API/E2E probe (ticket evidence, not product code): user-level actions and DOM reads on the Projects board of an
// isolated AutoByteus desktop instance, over its CDP control port (see API-PROBE-cdp.mjs). The board is found by its test ids;
// `scope` is `page` (the Projects page Tasks board) or `panel` (the compact board in the right panel).
// Usage: node API-PROBE-ui.mjs <controlPort> <command> [...args]
//   nav <hashPath>                         e.g. /projects/<projectId>
//   type <scope> <text>                    types like a user (one input event per character, 40 ms apart)
//   clear <scope>                          clears the box like a user (select all + delete)
//   click <scope> <testid>                 clicks an element inside the board (e.g. project-tasks-refresh)
//   state <scope>                          status line, no-match, lanes with Task ids/titles and counts
//   wait <scope> <jsCondition> <timeoutMs> polls state until the condition (over `s`) holds; prints elapsed and state
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const [port, command, ...args] = process.argv.slice(2)
const evalIn = (fn) => {
  const out = spawnSync(process.execPath, [path.join(here, 'API-PROBE-cdp.mjs'), port, 'eval', fn], { encoding: 'utf8' })
  if (out.status !== 0) throw new Error(out.stderr || out.stdout)
  return JSON.parse(out.stdout)
}
const BOARD = (scope) => `(() => {
  const boards = [...document.querySelectorAll('[data-testid="project-task-board"]')]
  const inPanel = (b) => Boolean(b.closest('[data-testid*="right-panel"], [data-testid*="projects-panel"], aside'))
  const board = ${JSON.stringify(scope)} === 'panel' ? boards.find(inPanel) : boards.find((b) => !inPanel(b))
  if (!board) throw new Error('board not found: ${scope} (' + boards.length + ' boards)')
  return board
})()`
const STATE = (scope) => `(() => {
  const board = ${BOARD(scope)}
  const lanes = {}
  for (const section of board.querySelectorAll('[data-testid^="project-task-column-"]')) {
    const status = section.getAttribute('data-testid').replace('project-task-column-', '')
    if (!['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'].includes(status)) continue
    lanes[status] = {
      count: Number(section.querySelector('[data-testid="project-task-column-count"]')?.textContent ?? 'NaN'),
      tasks: [...section.querySelectorAll('[data-testid^="project-task-row-project_task"]')].map((row) => ({
        taskId: row.getAttribute('data-testid').replace('project-task-row-', ''),
        title: row.querySelector('[data-testid="project-task-row-text"]')?.textContent?.trim().slice(0, 80),
        located: row.hasAttribute('data-located'),
      })),
    }
  }
  return {
    query: board.querySelector('[data-testid="project-tasks-search-input"]')?.value,
    placeholder: board.querySelector('[data-testid="project-tasks-search-input"]')?.getAttribute('placeholder'),
    status: board.querySelector('[data-testid="project-tasks-meaning-status"]')?.textContent?.trim() ?? null,
    retry: Boolean(board.querySelector('[data-testid="project-tasks-meaning-retry"]')),
    noMatch: Boolean(board.querySelector('[data-testid="project-tasks-no-match"]')),
    cancelledToggle: board.querySelector('[data-testid="project-tasks-cancelled-toggle"]')?.textContent?.trim() ?? null,
    lanes,
  }
})()`

if (command === 'nav') {
  console.log(JSON.stringify(evalIn(`async () => { location.hash = ${JSON.stringify('#' + args[0])}; await new Promise((r) => setTimeout(r, 1500)); return location.hash }`)))
} else if (command === 'type') {
  const [scope, text] = args
  console.log(JSON.stringify(evalIn(`async () => {
    const input = ${BOARD(scope)}.querySelector('[data-testid="project-tasks-search-input"]')
    input.focus()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    for (const ch of ${JSON.stringify(text)}) {
      setter.call(input, input.value + ch)
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }))
      await new Promise((r) => setTimeout(r, 40))
    }
    return { typed: input.value, at: Date.now() }
  }`)))
} else if (command === 'clear') {
  console.log(JSON.stringify(evalIn(`async () => {
    const input = ${BOARD(args[0])}.querySelector('[data-testid="project-tasks-search-input"]')
    input.focus(); input.select()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '')
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
    return { value: input.value }
  }`)))
} else if (command === 'click') {
  const [scope, testid] = args
  console.log(JSON.stringify(evalIn(`async () => {
    const el = ${BOARD(scope)}.querySelector('[data-testid="${testid}"]')
    if (!el) throw new Error('not found: ${testid}')
    el.click(); await new Promise((r) => setTimeout(r, 300)); return { clicked: '${testid}', at: Date.now() }
  }`)))
} else if (command === 'state') {
  console.log(JSON.stringify(evalIn(`async () => ${STATE(args[0])}`), null, 1))
} else if (command === 'wait') {
  const [scope, condition, timeoutMs] = args
  console.log(JSON.stringify(evalIn(`async () => {
    const started = Date.now()
    const seen = []
    for (;;) {
      const s = ${STATE(scope)}
      if (seen.at(-1) !== s.status) seen.push(s.status)
      if (${condition}) return { elapsedMs: Date.now() - started, statusesSeen: seen, state: s }
      if (Date.now() - started > ${Number(timeoutMs)}) return { timeout: true, elapsedMs: Date.now() - started, statusesSeen: seen, state: s }
      await new Promise((r) => setTimeout(r, 100))
    }
  }`), null, 1))
} else {
  throw new Error(`unknown command ${command}`)
}
