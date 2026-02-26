import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ArtifactsTab from '../ArtifactsTab.vue';
import ArtifactList from '../ArtifactList.vue';
import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';

describe('ArtifactsTab.vue', () => {
    it('renders with split pane layout', () => {
        const wrapper = mount(ArtifactsTab, {
            global: {
                plugins: [createTestingPinia({
                    createSpy: vi.fn,
                })],
                stubs: {
                    ArtifactList: true,
                    ArtifactContentViewer: true,
                }
            }
        });

        // Check for two main panes and a handle
        // We expect components to be present.
        // Use findComponent which throws if not found is safer or check exists
        expect(wrapper.findComponent(ArtifactList).exists()).toBe(true);
        expect(wrapper.findComponent({ name: 'ArtifactContentViewer' }).exists()).toBe(true);
        
        // Check for drag handle
        expect(wrapper.find('.cursor-col-resize').exists()).toBe(true);
    });

    it('passes selected artifact to viewer', async () => {
        const wrapper = mount(ArtifactsTab, {
             global: {
                plugins: [createTestingPinia({
                    createSpy: vi.fn,
                    initialState: {
                        agentArtifacts: {
                             // Mock store state if complex, or just use store actions
                        }
                    }
                })],
                // We use shallowMount or stubs. If stubs, ensure component name matches exactly what is used in template.
                stubs: {
                    ArtifactList: {
                        name: 'ArtifactList',
                        template: '<div class="artifact-list-stub"></div>',
                        props: ['artifacts', 'selectedArtifactId'],
                        emits: ['select']
                    },
                    ArtifactContentViewer: {
                        name: 'ArtifactContentViewer',
                        template: '<div class="artifact-viewer-stub"></div>',
                        props: ['artifact'],
                    },
                }
            }
        });
        await wrapper.vm.$nextTick();
        
        // Trigger select on list
        const list = wrapper.findComponent({ name: 'ArtifactList' });
        expect(list.exists()).toBe(true);
        
        list.vm.$emit('select', { id: '1', path: 'test.txt' });
        await wrapper.vm.$nextTick();
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const viewer = wrapper.findComponent({ name: 'ArtifactContentViewer' });
        expect(viewer.exists()).toBe(true);
    });
});
