import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import NodeSyncReportPanel from '../NodeSyncReportPanel.vue';

describe('NodeSyncReportPanel', () => {
  it('renders export and target summary blocks', () => {
    const wrapper = mount(NodeSyncReportPanel, {
      props: {
        report: {
          sourceNodeId: 'embedded-local',
          scope: ['prompt', 'agent_definition'],
          exportByEntity: [
            {
              entityType: 'prompt',
              exportedCount: 2,
              sampledKeys: ['prompt-1', 'prompt-2'],
              sampleTruncated: false,
            },
            {
              entityType: 'agent_definition',
              exportedCount: 1,
              sampledKeys: ['agent-1'],
              sampleTruncated: false,
            },
          ],
          targets: [
            {
              targetNodeId: 'remote-1',
              status: 'success',
              summary: {
                processed: 3,
                created: 3,
                updated: 0,
                deleted: 0,
                skipped: 0,
              },
              failureCountTotal: 0,
              failureSamples: [],
              failureSampleTruncated: false,
            },
          ],
        },
      },
    });

    expect(wrapper.text()).toContain('Source: embedded-local');
    expect(wrapper.text()).toContain('Prompts');
    expect(wrapper.text()).toContain('Agents');
    expect(wrapper.text()).toContain('2 exported');
    expect(wrapper.text()).toContain('remote-1');
    expect(wrapper.text()).toContain('processed 3');
  });

  it('shows failure samples when expanded and truncation hints when present', async () => {
    const wrapper = mount(NodeSyncReportPanel, {
      props: {
        report: {
          sourceNodeId: 'embedded-local',
          scope: ['prompt'],
          exportByEntity: [
            {
              entityType: 'prompt',
              exportedCount: 60,
              sampledKeys: ['prompt-1'],
              sampleTruncated: true,
            },
          ],
          targets: [
            {
              targetNodeId: 'remote-1',
              status: 'failed',
              failureCountTotal: 2,
              failureSamples: [
                { entityType: 'prompt', key: 'prompt-1', message: 'conflict' },
              ],
              failureSampleTruncated: true,
              message: 'Import failed with 2 issue(s).',
            },
          ],
        },
      },
    });

    expect(wrapper.text()).toContain('Key sample truncated.');
    expect(wrapper.text()).toContain('Failure sample truncated.');
    expect(wrapper.text()).not.toContain('[Prompts] prompt-1: conflict');

    expect(wrapper.text()).toContain('Show failure samples (1)');
  });
});
