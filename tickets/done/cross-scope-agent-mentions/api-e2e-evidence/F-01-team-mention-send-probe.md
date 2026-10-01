# F-01 temporary reproduction (web unit level)

Copy the harness (`createHarness`) from
`autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.execution-address.spec.ts`
into a spec next to it and add:

```ts
it('settles a mention send from the server echo of the composed content', async () => {
  const { callbacks, service } = createHarness();
  let settled = false;
  void service.sendMessage('please ask @Product Team to help', 'worker-run', [], [], {
    messageId: 'm-1', dedupeKey: 'd-1', mentions: [{ kind: 'agent_team', definition_id: 'product-team' }],
  }).then(() => { settled = true; });
  // Server echo: user text + the server-composed mention note (agent-team-stream-handler posts admission.content).
  callbacks.get('onMessage')?.(JSON.stringify({ type: 'MEMBER_INPUT_MESSAGE', payload: {
    change_sequence: 1, recipient_agent_run_id: 'worker-run', message_id: 'm-1', dedupe_key: 'd-1',
    content: 'please ask @Product Team to help\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nUse delegate_task ...',
    input_origin: 'user_message', received_at: '2026-10-01T00:00:00.000Z', context_file_paths: [],
    sender_agent_run_id: null, parent_communication_message_id: null } }));
  await Promise.resolve(); await Promise.resolve();
  expect(settled).toBe(true);                       // observed: false
  expect(() => service.sendMessage('also ask', 'worker-run', [], [], { messageId: 'm-2', dedupeKey: 'd-2' }))
    .not.toThrow();                                 // observed: "AgentRun 'worker-run' already has a pending Team message admission."
});
```

Run: `NUXT_TEST=true npx vitest run <spec>` in `autobyteus-web`.
Observed on `5dcc5dc82`: `{"observedSettled":false,"nextSendError":"AgentRun 'worker-run' already has a pending Team message admission."}`
