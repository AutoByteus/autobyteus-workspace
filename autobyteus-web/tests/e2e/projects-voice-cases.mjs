// Opt-in journeys for projects-feature-probe.mjs --voice-input.
// Production routes/components/stores/native media/worklet/HTTP/database are real.
// Only extension discovery and transcription IPC are deterministic fixtures.
// Chrome synthetic input and permission grant are NOT physical mic/OS/model proof.
import assert from 'node:assert/strict'

export async function runProjectVoiceCases({ page, context, goto, api, node, runCase, waitFor, screenshot }) {
  await context.addInitScript(() => {
    localStorage.setItem('autobyteus.localization.preference-mode', 'en')
    const streams = []
    const native = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await native(constraints); streams.push(stream); return stream
    }
    const probe = window.__projectVoice = { mode: 'success', calls: 0, pending: false, wavs: [],
      tracks: () => streams.flatMap(s => s.getTracks().map(t => t.readyState)), release: null }
    probe.install = () => { window.electronAPI = {
      getExtensionsState: async () => [{ id: 'voice-input', status: 'installed', enabled: true, settings: { audioInputDeviceId: null } }],
      transcribeVoiceInput: async ({ audioData }) => {
        probe.calls++
        const header = new DataView(audioData)
        probe.wavs.push({ riff: header.getUint32(0, false), samples: header.getUint32(40, true) / 2 })
        if (probe.mode === 'pending') await new Promise(resolve => { probe.pending = true; probe.release = () => { probe.pending = false; resolve() } })
        if (probe.mode === 'error') return { ok: false, error: 'Controlled provider failure' }
        return { ok: true, text: probe.mode === 'no-speech' ? '' : 'dictated words', noSpeech: probe.mode === 'no-speech', detectedLanguage: 'en' }
      },
    } }
  })
  // Install only after browser endpoint bootstrap: this is a voice IPC fixture, not a shell.
  const open = async url => {
    await goto(url)
    await page.getByTestId('project-editor-page').or(page.getByTestId('project-task-page')).waitFor()
    await page.evaluate(async () => {
      window.__projectVoice.install()
      const { useExtensionsStore } = await import('/_nuxt/stores/extensionsStore.ts')
      const { useVoiceInputStore } = await import('/_nuxt/stores/voiceInputStore.ts')
      const extensions = useExtensionsStore(), voice = useVoiceInputStore()
      extensions.initialized = false; voice.initialized = false
      await voice.initialize()
      delete window.electronAPI
    })
  }
  const state = () => page.evaluate(() => {
    const p = window.__projectVoice
    return { calls: p.calls, pending: p.pending, tracks: p.tracks(), wavs: p.wavs }
  })
  const mode = value => page.evaluate(v => { window.__projectVoice.mode = v }, value)
  const input = () => page.getByTestId('project-description-input')
  const save = () => page.getByTestId('project-form-submit')
  const mic = () => page.getByRole('button', { name: 'Start voice input', exact: true })
  async function start() {
    await page.evaluate(() => window.__projectVoice.install())
    await mic().click()
    await page.getByRole('button', { name: 'Stop recording', exact: true }).waitFor()
    await waitFor('native live track', async () => (await state()).tracks.includes('live'))
    // Let production worklet collect nonempty frames before user Stop.
    await page.waitForTimeout(700)
  }
  async function stop() {
    const before = (await state()).calls
    await page.getByRole('button', { name: 'Stop recording', exact: true }).press('Enter')
    await waitFor('transcription IPC entered', async () => (await state()).calls > before)
    // Browser endpoint policy must stay browser-owned for actual HTTP persistence/navigation.
    // The in-flight IPC promise retains its fixture independently of global bridge discovery.
    await page.evaluate(() => { delete window.electronAPI })
  }
  async function quiet(id) {
    await mic().waitFor()
    assert.equal(await page.getByTestId(id).count(), 0, 'No success node or reserved status gap')
    const s = await state()
    assert(s.tracks.every(t => t === 'ended'), 'Native tracks released')
    assert(s.wavs.length > 0 && s.wavs.every(w => w.riff === 0x52494646 && w.samples > 0), 'Actual worklet WAV reached IPC')
    return s
  }
  let projectId, taskId
  await runCase('B-001', 'Project create: native dictation into latest typed draft; review and explicit real save', async obs => {
    const before = (await api.projects(node)).length
    await open('/projects/new')
    await page.getByTestId('project-name-input').fill('Voice integration project')
    assert.match(await page.locator('label[for="project-editor-description"]').innerText(), /optional/i)
    await input().fill('Initial')
    await start(); assert(await save().isDisabled()); await screenshot('B-001-recording')
    await input().fill('Typed during capture')
    await stop()
    await waitFor('append', async () => await input().inputValue() === 'Typed during capture dictated words')
    obs.native = await quiet('project-voice-status'); await screenshot('B-001-quiet-success')
    assert.equal((await api.projects(node)).length, before, 'No automatic create')
    await input().fill('Reviewed dictated words'); await save().click()
    await page.getByTestId('project-detail-name').waitFor()
    const p = (await api.projects(node)).find(p => p.name === 'Voice integration project')
    assert.equal(p.description, 'Reviewed dictated words'); projectId = p.projectId; obs.project = p
  })
  await runCase('B-002', 'Project edit at 390px: native append/manual save, blank optional update and current reader', async obs => {
    assert(projectId)
    await page.setViewportSize({ width: 390, height: 844 })
    await open('/projects/' + projectId + '/edit')
    assert.equal(await input().inputValue(), 'Reviewed dictated words')
    const box = await mic().boundingBox(); assert(box && box.x >= 0 && box.x + box.width <= 390)
    await start(); await stop()
    await waitFor('edit append', async () => (await input().inputValue()).endsWith('words dictated words'))
    await quiet('project-voice-status')
    assert.equal((await api.project(node, projectId)).description, 'Reviewed dictated words', 'No automatic update')
    await save().click(); await page.getByTestId('project-detail-name').waitFor()
    assert.equal((await api.project(node, projectId)).description, 'Reviewed dictated words dictated words')
    await open('/projects/' + projectId + '/edit'); await input().fill('   '); await save().click()
    await page.getByTestId('project-detail-name').waitFor()
    assert.equal((await api.project(node, projectId)).description, '')
    await open('/projects/' + projectId + '/edit'); assert.equal(await input().inputValue(), '')
    obs.blankCurrentReader = true; await screenshot('B-002-narrow-optional')
    await page.setViewportSize({ width: 1512, height: 862 })
  })
  await runCase('B-003', 'Task create/edit: native dictation, no success node, attachments retained and explicit save', async obs => {
    assert(projectId)
    await open('/projects/' + projectId + '/tasks/new')
    const text = page.locator('#task-page-description')
    await text.fill('Task draft'); await start()
    assert(await page.getByTestId('task-page-save').isDisabled())
    await stop(); await waitFor('task append', async () => await text.inputValue() === 'Task draft dictated words')
    await quiet('task-voice-status')
    assert.equal((await api.tasks(node, projectId)).length, 0)
    assert.equal(await page.locator('input[type=file]').count(), 1)
    await page.getByTestId('task-page-save').click(); await page.getByTestId('project-task-columns').waitFor()
    const t = (await api.tasks(node, projectId))[0]; taskId = t.taskId; assert.equal(t.description, 'Task draft dictated words')
    await open('/projects/' + projectId + '/tasks/' + taskId + '/edit')
    await start(); await stop()
    await waitFor('task edit append', async () => await text.inputValue() === 'Task draft dictated words dictated words')
    await quiet('task-voice-status')
    assert.equal((await api.tasks(node, projectId))[0].description, t.description)
    await page.getByTestId('task-page-save').click()
    await waitFor('task persisted', async () => (await api.tasks(node, projectId))[0].description.endsWith('words dictated words'))
    obs.taskId = taskId
  })
  await runCase('B-004', 'Project no-speech/error feedback retained then successful retry clears without saving', async obs => {
    await open('/projects/' + projectId + '/edit'); await input().fill('Keep')
    for (const outcome of ['no-speech', 'error']) {
      await mode(outcome); await start(); await stop(); await mic().waitFor()
      const status = page.getByTestId('project-voice-status'); await status.waitFor()
      assert.equal(await status.getAttribute('role'), outcome === 'error' ? 'alert' : 'status')
      assert.equal(await input().inputValue(), 'Keep')
    }
    await mode('success'); await start(); await stop()
    await waitFor('retry append', async () => await input().inputValue() === 'Keep dictated words')
    obs.native = await quiet('project-voice-status')
    assert.equal((await api.project(node, projectId)).description, '')
  })
  await runCase('B-005', 'Recording Cancel releases native tracks without insertion or persistence', async obs => {
    await open('/projects/' + projectId + '/edit'); await input().fill('Keep')
    await start(); await page.getByTestId('project-voice-cancel').click(); await mic().waitFor()
    await page.evaluate(() => { delete window.electronAPI })
    await waitFor('cancel disposal', async () => (await state()).tracks.every(t => t === 'ended'))
    assert.equal((await state()).calls, 0); assert.equal(await input().inputValue(), 'Keep')
    assert.equal(await page.getByTestId('project-voice-status').count(), 0)
    assert(await save().isEnabled()); obs.native = await state()
  })
  await runCase('B-006', 'Cancel navigation during pending transcription rejects late text in next editor', async obs => {
    await open('/projects/' + projectId + '/edit'); await input().fill('Abandoned')
    await mode('pending'); await start(); await stop()
    await waitFor('pending transcription', async () => (await state()).pending)
    assert(await save().isDisabled())
    await page.getByTestId('project-editor-cancel').click(); await page.getByTestId('project-detail-name').waitFor()
    // Real SPA navigation mounts a fresh draft while uncancellable provider work settles.
    await page.getByTestId('project-edit-button').click()
    await input().waitFor(); assert.equal(await input().inputValue(), '')
    await page.evaluate(() => window.__projectVoice.release())
    await mic().waitFor(); assert.equal(await input().inputValue(), '')
    assert.equal((await api.project(node, projectId)).description, '')
    obs.native = await state()
  })
}
