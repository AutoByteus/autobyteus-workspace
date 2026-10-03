/** Investigation-only controlled renderer probe. No durable test or product mutation.
 * Runs worktree production TS/SFC source in memory with installed Vue/Pinia,
 * a custom Vue renderer, fake microphone/AudioContext and surrounding stores.
 * Does not launch Electron, access user data, open a real mic, or contact a model.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const {pathToFileURL} = require('node:url');
const {execFileSync} = require('node:child_process');
const baselineRef = process.env.PROBE_BASELINE_REF || null;
const repo = path.resolve(__dirname, '../../../../');
const shared = process.env.PROBE_DEPENDENCY_ROOT || '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo';
const sharedRequire = createRequire(path.join(shared, 'autobyteus-web/package.json'));
const pinia = sharedRequire('pinia');
const piniaRequire = createRequire(sharedRequire.resolve('pinia'));
const vue = piniaRequire('vue');
const ts = sharedRequire('typescript');
const compiler = createRequire(piniaRequire.resolve('vue'))('@vue/compiler-sfc');
const zodRequire = createRequire(path.join(shared, 'autobyteus-team-stream-contracts/package.json'));
const nodes = vue.reactive({bindingRevision: 0});
const extensions = {voiceInput: {status: 'installed', enabled: true, settings: {}}, initialize: async () => {}};
const toasts = [];
const upstream = {};
const stubSchema = {parse() {throw new Error('Unused snapshot/tree mutation schema called unexpectedly');}};
const mocks = {
  'vue': vue, 'pinia': pinia, 'vue-router': {useRoute: () => ({query: {}})},
  '@autobyteus/team-stream-contracts': {teamExecutionViewSnapshotPayloadSchema: stubSchema, teamRunExecutionTreeDtoSchema: stubSchema},
  '@iconify/vue': {Icon: {render: () => vue.h('span')}},
  '~/composables/useLocalization': {useLocalization: () => ({t: (key) => key})},
  '~/localization/runtime/localizationRuntime': {localizationRuntime: {translate: (key) => key}},
  '~/composables/useToasts': {useToasts: () => ({addToast: (...args) => toasts.push(args)})},
  '~/stores/extensionsStore': {useExtensionsStore: () => extensions},
  '~/stores/windowNodeContextStore': {useWindowNodeContextStore: () => nodes},
  '~/services/runHydration/teamMemberProjectionHydrationService': {isTeamMemberProjectionAuthoritative: () => true},
  '~/services/agentStreaming/handlers/agentInputStateHandler': {handleAgentInputState: () => {throw new Error('Unexpected input snapshot handler');}},
};
for (const [filename, factory] of Object.entries({
  agentSelectionStore: 'useAgentSelectionStore', agentContextsStore: 'useAgentContextsStore',
  agentTeamContextsStore: 'useAgentTeamContextsStore', agentRunStore: 'useAgentRunStore',
  agentTeamRunStore: 'useAgentTeamRunStore', contextFileUploadStore: 'useContextFileUploadStore',
  agentOrgContextsStore: 'useAgentOrgContextsStore', agentRunCollaborationStore: 'useAgentRunCollaborationStore',
})) mocks[path.join(repo, 'autobyteus-web/stores', filename + '.ts')] = {[factory]: () => upstream[filename] || {}};
let tracksStopped = 0, contextsClosed = 0, transcriptionCalls = 0;
const browser = {electronAPI: {transcribeVoiceInput: async () => {transcriptionCalls++; return {ok: true, text: 'text', noSpeech: false};}}};
const navigatorMock = {permissions: {query: async () => ({state: 'granted'})}, mediaDevices: {
  enumerateDevices: async () => [{kind: 'audioinput', deviceId: 'probe-mic', label: 'Probe fake microphone'}],
  addEventListener: () => {}, getUserMedia: async () => ({getTracks: () => [{stop: () => {tracksStopped++;}}]}),
}};
class FakeAudioContext {constructor() {this.state = 'running'; this.audioWorklet = {addModule: async () => {}}; this.destination = {};} createMediaStreamSource() {return {connect: () => {}};} async close() {contextsClosed++;}}
class FakeAudioWorkletNode {constructor() {this.port = {onmessage: null, postMessage: () => {throw new Error('No explicit Stop/FLUSH expected');}};} connect() {}}
const loaded = new Map();
function resolveLocal(id, from) {
  let file = id.startsWith('~/') ? path.join(repo, 'autobyteus-web', id.slice(2)) : path.resolve(path.dirname(from), id);
  if (file.endsWith('.js') && !fs.existsSync(file)) file = file.slice(0, -3) + '.ts';
  if (!path.extname(file)) file += '.ts';
  return file;
}
function load(file) {
  if (mocks[file]) return mocks[file];
  if (loaded.has(file)) return loaded.get(file).exports;
  let src = baselineRef ? execFileSync('git', ['show', `${baselineRef}:${path.relative(repo, file)}`], {cwd: repo, encoding: 'utf8'}) : fs.readFileSync(file, 'utf8');
  if (file.endsWith('.vue')) {
    const parsed = compiler.parse(src, {filename: file});
    src = compiler.compileScript(parsed.descriptor, {id: 'investigation-probe', inlineTemplate: true}).content;
  }
  // This metadata rewrite only permits CJS in-memory execution; no source edit.
  src = src.replace(/import\.meta\.url/g, JSON.stringify(pathToFileURL(file).href));
  const js = ts.transpileModule(src, {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const module = {exports: {}};
  loaded.set(file, module);
  const localRequire = (id) => {
    if (mocks[id]) return mocks[id];
    if (id === 'zod') return zodRequire(id);
    if (id.startsWith('~/') || id.startsWith('.')) return load(resolveLocal(id, file));
    throw new Error(`Unprovided external ${id} from ${file}`);
  };
  const context = {module, exports: module.exports, require: localRequire, console, window: browser,
    navigator: navigatorMock, AudioContext: FakeAudioContext, AudioWorkletNode: FakeAudioWorkletNode,
    structuredClone, URL, setTimeout, clearTimeout, queueMicrotask};
  vm.runInNewContext(js, context, {filename: file});
  return module.exports;
}
const source = (name) => path.join(repo, 'autobyteus-web', name);
const {createTeamExecutionViewState} = load(source('services/teamExecution/teamExecutionViewState.ts'));
const {useActiveContextStore} = load(source('stores/activeContextStore.ts'));
const {useComposerTarget} = load(source('composables/agentInput/useComposerTarget.ts'));
const useComposerVoiceTarget = baselineRef ? null : load(source('composables/voiceInput/useComposerVoiceTarget.ts')).useComposerVoiceTarget;
const {useVoiceInputStore} = load(source('stores/voiceInputStore.ts'));
const Button = load(source(baselineRef ? 'components/agentInput/VoiceInputButton.vue' : 'components/voiceInput/VoiceInputButton.vue')).default;
const dto = load(path.join(repo, 'autobyteus-team-stream-contracts/src/team-collaboration-message-dtos.ts'));
const createdAt = '2026-10-03T12:00:00.000Z';
const members = [['designer-run', '/solution_designer'], ['reviewer-run', '/code_reviewer'], ['engineer-run', '/implementation_engineer']];
const tree = {root_team: {team_run_id: 'probe-team', team_definition_name: 'Software Team', coordinator_address: '/solution_designer', members: members.map(([id, address]) => ({kind: 'configured_agent', address, agent_run_id: id})), task_executions: [], collaborators: []}};
const view = createTeamExecutionViewState({rootTeamRunId: 'probe-team', rootActive: true, executionTree: tree,
  configuration: {}, initialFocusedAgentRunId: 'designer-run', agentContexts: members.map(([agentRunId, memberAddress]) => ({agentRunId, memberAddress, agentContext: {state: {runId: agentRunId, currentStatus: 'offline'}, requirement: 'existing draft', conversation: {messages: []}}})),
  createAgentContext: () => {throw new Error('No new contexts expected');}});
upstream.agentSelectionStore = vue.reactive({selectedType: 'team'});
upstream.agentTeamContextsStore = {activeTeamContext: {view}};
upstream.agentRunCollaborationStore = {childTargetFor: () => null, hostMessagesView: () => null};
const host = {createElement: (tag) => ({tag, children: [], props: {}}), createText: (text) => ({text}), createComment: (text) => ({comment: text}),
  insert: (child, parent) => {child.parent = parent; parent.children ||= []; parent.children.push(child);},
  remove: (child) => {if(child.parent) child.parent.children = child.parent.children.filter((x) => x !== child);},
  setElementText: (node, text) => {node.text = text;}, setText: (node, text) => {node.text = text;},
  parentNode: (node) => node.parent, nextSibling: () => null, patchProp: (node, key, old, value) => {node.props[key] = value;}};
const renderer = vue.createRenderer(host);
const p = pinia.createPinia();
pinia.setActivePinia(p);
let composer, voice, active;
const rerender = vue.ref(0);
const app = renderer.createApp({setup() {active = useActiveContextStore(); composer = useComposerTarget(); voice = baselineRef ? composer : useComposerVoiceTarget(() => composer.value); return () => vue.h('section', {version: rerender.value}, [vue.h(Button, {target: voice.value})]);}});
app.use(p);
const root = {children: []}; app.mount(root);
const store = useVoiceInputStore();
const actionTrace = [];
store.$onAction(({name, args}) => actionTrace.push({name, args: name === 'cancelOperationForTarget' ? args : undefined}));
const buttonNode = () => {const find = (n) => n.tag === 'button' ? n : (n.children || []).map(find).find(Boolean); return find(root);};
async function start() {await buttonNode().props.onClick(); assert.equal(store.isRecording, true); store.audioWorklet.port.onmessage({data: {type: 'capture-stats', level: .25}}); assert.equal(store.hasReceivedCaptureStats, true);}
const report = {sourceRef: baselineRef || 'worktree HEAD', mode: 'Controlled production-source renderer probe, not Electron/microphone/transport E2E', dependencyVersions: {vue: vue.version, pinia: piniaRequire('./package.json').version}, cases: []};
(async () => {
  await start();
  const stableVoice = voice.value;
  rerender.value++; await vue.nextTick();
  assert.equal(voice.value, stableVoice); assert.equal(store.isRecording, true);
  report.cases.push({scenario: 'Ordinary render with unchanged dependencies', remainsRecording: store.isRecording, unchangedVoiceTarget: voice.value === stableVoice});
  view.getFocusedAgentContext().state.currentStatus = 'running'; await vue.nextTick();
  assert.equal(store.isRecording, true); assert.equal(voice.value, stableVoice);
  report.cases.push({scenario: 'Context status mutation without publication replacement', remainsRecording: store.isRecording, unchangedVoiceTarget: voice.value === stableVoice});
  const oldComposer = composer.value, oldContext = composer.value.context, oldVoice = voice.value;
  const msg = {type: 'TEAM_COMMUNICATION_MESSAGE', payload: dto.teamCommunicationMessagePayloadSchema.parse({change_sequence: 1, message: {message_id: 'probe-message', sender_agent_run_id: 'engineer-run', receiver_agent_run_id: 'reviewer-run', content: 'Review is ready', message_type: 'result', reference_files: [], created_at: createdAt}})};
  const applied = view.applyMessage(msg); assert.equal(applied.disposition, 'applied'); await vue.nextTick(); await Promise.resolve();
  assert.equal(composer.value.context, oldContext); assert.equal(view.getFocusedAgentRunId(), 'designer-run');
  assert.notEqual(composer.value, oldComposer);
  if (baselineRef) {
    assert.equal(voice.value.key, oldVoice.key); assert.equal(store.isRecording, true); assert.equal(tracksStopped, 0); assert.equal(contextsClosed, 0); assert.equal(transcriptionCalls, 0);
    report.cases.push({scenario: 'Valid Team communication between OTHER members while recording before Projects merge', applied: applied.disposition, sameContext: composer.value.context === oldContext, sameRunId: composer.value.key === oldComposer.key, regeneratedComposerWrapper: composer.value !== oldComposer, unchangedTargetKey: voice.value.key === oldVoice.key, remainsRecording: store.isRecording, tracksStopped, contextsClosed, transcriptionCalls, toasts: toasts.length});
    app.unmount(); await Promise.resolve(); console.log(JSON.stringify(report, null, 2)); return;
  }
  assert.notEqual(voice.value.key, oldVoice.key); assert.equal(oldVoice.isCurrent(), true);
  assert.equal(store.isRecording, false); assert.equal(tracksStopped, 1); assert.equal(contextsClosed, 1); assert.equal(transcriptionCalls, 0); assert.equal(toasts.length, 0);
  report.cases.push({scenario: 'Valid Team communication between OTHER members while recording', applied: applied.disposition, sameContext: composer.value.context === oldContext, sameRunId: composer.value.key === oldComposer.key, oldSinkStillCurrent: oldVoice.isCurrent(), sameNodeBinding: nodes.bindingRevision === 0, regeneratedComposerWrapper: composer.value !== oldComposer, changedVoiceKey: voice.value.key !== oldVoice.key, remainsRecording: store.isRecording, tracksStopped, contextsClosed, transcriptionCalls, toasts: toasts.length, latestResult: store.latestResult.outcome, cancellationActions: actionTrace.filter((a) => ['cancelOperationForTarget', 'cleanup', 'disposeCapture', 'stopRecording'].includes(a.name))});
  await start(); const beforeSwitch = view.getFocusedAgentRunId(); const selection = view.focusAgent('reviewer-run'); assert.equal(selection.disposition, 'applied'); await vue.nextTick();
  assert.equal(store.isRecording, false); assert.equal(tracksStopped, 2);
  report.cases.push({scenario: 'Genuine supported member switch', beforeSwitch, afterSwitch: view.getFocusedAgentRunId(), remainsRecording: store.isRecording, totalTracksStopped: tracksStopped});
  app.unmount();
  console.log(JSON.stringify(report, null, 2));
})().catch(async (e) => {await store.cleanup(); app.unmount(); console.error(e); process.exitCode = 1;});
