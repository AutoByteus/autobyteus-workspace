import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ArtifactList from '../ArtifactList.vue';
import type { AgentArtifact } from '~/stores/agentArtifactsStore';

describe('ArtifactList.vue', () => {
    const mockArtifacts: AgentArtifact[] = [
        { id: '1', agentId: 'a1', path: 'test.txt', type: 'file', status: 'persisted', createdAt: '', updatedAt: '' },
        { id: '2', agentId: 'a1', path: 'image.png', type: 'file', status: 'persisted', createdAt: '', updatedAt: '' },
        { id: '3', agentId: 'a1', path: 'script.py', type: 'file', status: 'streaming', createdAt: '', updatedAt: '' },
        { id: '4', agentId: 'a1', path: 'video.mp4', type: 'file', status: 'pending_approval', createdAt: '', updatedAt: '' },
    ];

    it('renders empty state when no artifacts', () => {
        const wrapper = mount(ArtifactList, {
            props: { artifacts: [] }
        });
        expect(wrapper.text()).toContain('No artifacts created yet');
    });

    it('categorizes artifacts correctly into Files and Media', () => {
        const wrapper = mount(ArtifactList, {
            props: { artifacts: mockArtifacts }
        });

        // "Assets" header should exist
        expect(wrapper.text()).toContain('Assets');
        // "Files" header should exist
        expect(wrapper.text()).toContain('Files');

        // Check if items are rendered
        // We can check identifying text
        expect(wrapper.text()).toContain('test.txt');
        expect(wrapper.text()).toContain('image.png');
        expect(wrapper.text()).toContain('script.py');
        expect(wrapper.text()).toContain('video.mp4');
    });

    it('emits select event when item is clicked', async () => {
         const wrapper = mount(ArtifactList, {
            props: { artifacts: mockArtifacts }
        });
        
        const items = wrapper.findAllComponents({ name: 'ArtifactItem' });
        // Media comes first in the list, so the first item should be image.png (mockArtifacts[1])
        await items[0].trigger('click');
        
        expect(wrapper.emitted('select')).toBeTruthy();
        expect(wrapper.emitted('select')?.[0][0]).toEqual(mockArtifacts[1]);
    });

    it('navigates artifacts using arrow keys', async () => {
        const wrapper = mount(ArtifactList, {
            props: { 
                artifacts: mockArtifacts,
                selectedArtifactId: mockArtifacts[1].id // image.png (index 0 in flattened list: Assets -> Files)
            }
        });

        // Current order: 
        // Assets: image.png (id 2), video.mp4 (id 4)
        // Files: test.txt (id 1), script.py (id 3)
        // Flattened: [image.png, video.mp4, test.txt, script.py]
        
        // Initial selection is image.png (index 0)
         
        // KeyDown Down -> Should select video.mp4 (index 1)
        await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowDown' });
        
        expect(wrapper.emitted('select')).toBeTruthy();
        const event1 = wrapper.emitted('select')?.[0] as unknown as [AgentArtifact];
        expect(event1[0].id).toBe('4');

        // Update props to simulate selection change
        await wrapper.setProps({ selectedArtifactId: '4' });

        // KeyDown Down -> Should select test.txt (index 2)
        await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowDown' });
        const event2 = wrapper.emitted('select')?.[1] as unknown as [AgentArtifact];
        expect(event2[0].id).toBe('1');

        // Update props
        await wrapper.setProps({ selectedArtifactId: '1' });

        // KeyDown Up -> Should select video.mp4 (index 1)
        await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowUp' });
        const event3 = wrapper.emitted('select')?.[2] as unknown as [AgentArtifact];
        expect(event3[0].id).toBe('4');
    });
});
