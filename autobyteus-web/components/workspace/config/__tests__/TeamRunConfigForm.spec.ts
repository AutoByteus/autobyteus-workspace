import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TeamRunConfigForm from '../TeamRunConfigForm.vue';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';

vi.mock('~/stores/llmProviderConfig', () => ({
    useLLMProviderConfigStore: vi.fn()
}));

const mockTeamDef = {
    id: 'team-1',
    name: 'Test Team',
    nodes: [
        { memberName: 'Member A', referenceType: 'AGENT', referenceId: 'agent-a' },
        { memberName: 'Member B', referenceType: 'AGENT', referenceId: 'agent-b' }
    ],
    coordinatorMemberName: 'Member A'
};

const mockConfig = {
    llmModelIdentifier: '',
    autoExecuteTools: false,
    isLocked: false,
    workspaceId: null,
    memberOverrides: {}
};

describe('TeamRunConfigForm', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        (useLLMProviderConfigStore as any).mockReturnValue({
            providersWithModels: [
                { provider: 'OpenAI', models: [{ modelIdentifier: 'gpt-4', name: 'GPT-4' }] }
            ],
            fetchProvidersWithModels: vi.fn(),
            modelConfigSchemaByIdentifier: vi.fn().mockReturnValue(null) // Mock the schema getter
        });
    });

    it('renders correctly', () => {
        const config = { ...mockConfig };
        const wrapper = mount(TeamRunConfigForm, {
            props: {
                config,
                teamDefinition: mockTeamDef as any,
                workspaceLoadingState: { isLoading: false, error: null, loadedPath: null }
            },
            global: {
                stubs: {
                    WorkspaceSelector: true,
                    SearchableGroupedSelect: true,
                    MemberOverrideItem: {
                        name: 'MemberOverrideItem',
                        template: '<div class="member-override-item-stub"></div>',
                        props: ['memberName', 'override', 'isCoordinator', 'options', 'disabled', 'globalLlmModel'],
                        emits: ['update:override']
                    }
                }
            }
        });

        expect(wrapper.text()).toContain('Test Team'); // Team name
        
        // Members list should NOT exist anymore
        expect(wrapper.findAll('li').length).toBe(0);

        const overrideToggle = wrapper.findAll('button').find(button => button.text().includes('Team Members Override'));
        expect(overrideToggle).toBeTruthy();
        const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' });
        expect(items).toHaveLength(2);
        
        // Check props passed to items
        expect(items[0].props('memberName')).toBe('Member A');
        expect(items[0].props('isCoordinator')).toBe(true);
        expect(items[1].props('memberName')).toBe('Member B');
        expect(items[1].props('isCoordinator')).toBe(false);
    });

    it('passes global model to member overrides', () => {
        const config = { ...mockConfig, llmModelIdentifier: 'gpt-4' };
        const wrapper = mount(TeamRunConfigForm, {
            props: {
                config,
                teamDefinition: mockTeamDef as any,
                workspaceLoadingState: { isLoading: false, error: null, loadedPath: null }
            },
            global: {
                stubs: {
                    WorkspaceSelector: true,
                    SearchableGroupedSelect: true,
                    MemberOverrideItem: {
                        name: 'MemberOverrideItem',
                        template: '<div class="member-override-item-stub"></div>',
                        props: ['memberName', 'override', 'isCoordinator', 'options', 'disabled', 'globalLlmModel'],
                        emits: ['update:override']
                    }
                }
            }
        });

        const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' });
        expect(items[0].props('globalLlmModel')).toBe('gpt-4');
    });

    it('updates model', async () => {
        const config = { ...mockConfig };
        const wrapper = mount(TeamRunConfigForm, {
            props: {
                config,
                teamDefinition: mockTeamDef as any,
                workspaceLoadingState: { isLoading: false, error: null, loadedPath: null }
            },
            global: {
                stubs: { 
                    WorkspaceSelector: true,
                    SearchableGroupedSelect: {
                        name: 'SearchableGroupedSelect',
                        template: '<div class="searchable-select-stub"></div>',
                        props: ['modelValue', 'disabled', 'options'],
                        emits: ['update:modelValue']
                    }
                }
            }
        });

        const selectStub = wrapper.findComponent({ name: 'SearchableGroupedSelect' });
        await selectStub.vm.$emit('update:modelValue', 'gpt-4');
        expect(config.llmModelIdentifier).toBe('gpt-4');
    });

    it('handles auto-execute toggle', async () => {
        const config = { ...mockConfig };
        const wrapper = mount(TeamRunConfigForm, {
            props: {
                config,
                teamDefinition: mockTeamDef as any,
                workspaceLoadingState: { isLoading: false, error: null, loadedPath: null }
            },
            global: {
                stubs: { WorkspaceSelector: true }
            }
        });

        await wrapper.find('button#team-auto-execute').trigger('click');
        expect(config.autoExecuteTools).toBe(true);
    });
});
