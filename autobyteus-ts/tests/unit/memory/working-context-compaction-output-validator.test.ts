import { afterEach, describe, expect, it, vi } from 'vitest';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { WorkingContextCompactionOutputValidator, WorkingContextCompactionOutputValidationError,
  assertWorkingContextMessagesStructurallyValid } from '../../../src/memory/compaction/working-context-compaction-output-validator.js';
import { WorkingContextMessageWindowPlanner } from '../../../src/memory/compaction/working-context-message-window-planner.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { makeHarness, summary } from './direct-compaction-harness.js';
const subjects: ReturnType<typeof makeHarness>[] = [];
afterEach(() => { subjects.splice(0).forEach((s) => s.dispose()); vi.restoreAllMocks(); });
const fixture = () => {
  const h = makeHarness(); subjects.push(h);
  h.manager.beginPendingCompactionAttempt({ operationId: h.operationId, turnId: h.input.turnId });
  const baseline = h.manager.captureCompactionBaseline();
  const source = baseline.context.copy();
  const plan = new WorkingContextMessageWindowPlanner().plan({ messages: source.buildMessages(), planningBudget: h.manager.getPendingCompactionRequest()!.planningBudget });
  const accepted = h.manager.prepareCompaction(baseline, { summary, selectedNewRawTraceIds: plan.rawTraceIdsToArchive, retainedMessages: plan.retainedMessages, budgetAssessment: plan.budgetAssessment });
  return { h, baseline, source, plan, accepted,
    validate: () => new WorkingContextCompactionOutputValidator().assertValid(baseline.context, source, accepted, plan) };
};
const system = () => new Message(MessageRole.SYSTEM, { content: 'System' });
const expectCode = (action: () => void, code: string) => {
  expect(action).toThrowError(expect.objectContaining({ code }));
};
describe('WorkingContextCompactionOutputValidator', () => {
  it('accepts the planned summary with retained provenance and unchanged system head', () => { expect(fixture().validate).not.toThrow(); });
  it('rejects alias, source mutation, changed head, invalid summary count, retained content and selection', () => {
    let f = fixture(); f.accepted.finalizedContext = f.source;
    expectCode(f.validate, 'aliased-context');
    f = fixture(); f.source.appendUser('changed'); expectCode(f.validate, 'mutated-source-input');
    f = fixture(); f.accepted.finalizedContext.replaceMessage(0, new Message(MessageRole.SYSTEM, { content: 'changed' }));
    expectCode(f.validate, 'changed-required-head');
    f = fixture(); f.accepted.finalizedContext = f.baseline.context.copy(); expectCode(f.validate, 'invalid-summary-region');
    f = fixture(); const messages = f.accepted.finalizedContext.buildMessages();
    messages.at(-1)!.content = 'changed'; f.accepted.finalizedContext = new WorkingContext(messages);
    expectCode(f.validate, 'changed-retained-context');
    f = fixture(); f.accepted.selectedNewRawTraceIds = ['raw-11']; expectCode(f.validate, 'invalid-selected-traces');
  });
  it('rejects a finalized context over the parent target', () => {
    const f = fixture(); f.accepted.budgetAssessment = { ...f.accepted.budgetAssessment, estimatedFinalizedContextTokens: 100_000 };
    expectCode(f.validate, 'post_compaction_target_exceeded');
  });
  it('rejects malformed roles and payloads', () => {
    expectCode(() => assertWorkingContextMessagesStructurallyValid([new Message(MessageRole.USER, { tool_payload: new ToolCallPayload([{ id: 'x', name: 'tool', arguments: {} }]) })]), 'invalid-message-shape');
  });
  it.each([
    ['orphan result', [new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'tool', null) })]],
    ['partial batch', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([{ id: 'a', name: 'tool', arguments: {} }]) }),
    ]],
    ['duplicate call id', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([
        { id: 'a', name: 'first', arguments: {} },
        { id: 'a', name: 'second', arguments: {} },
      ]) }),
    ]],
    ['blank call id', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([
        { id: '  ', name: 'tool', arguments: {} },
      ]) }),
    ]],
    ['ordinary message before result', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([{ id: 'a', name: 'tool', arguments: {} }]) }),
      new Message(MessageRole.USER, { content: 'too soon' }),
    ]],
    ['duplicate result', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([{ id: 'a', name: 'tool', arguments: {} }]) }),
      new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'tool', null) }),
      new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'tool', null) }),
    ]],
    ['mismatched tool name', [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([{ id: 'a', name: 'tool', arguments: {} }]) }),
      new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('a', 'other', null) }),
    ]],
  ])('rejects invalid tool protocol: %s', (_label, body) => {
    expectCode(
      () => assertWorkingContextMessagesStructurallyValid([system(), ...body]),
      'invalid-tool-protocol',
    );
  });
});
