import { computed, ref, type ComputedRef } from 'vue';
import type { TeamMemberInput } from '~/stores/agentTeamDefinitionStore';

type ReferenceType = 'AGENT' | 'AGENT_TEAM';
type RefScope = 'SHARED' | 'TEAM_LOCAL' | null;

type NamedDefinition = {
  id: string;
  name: string;
};

type TeamFormData = {
  name: string;
  category: string;
  description: string;
  instructions: string;
  avatarUrl: string;
  coordinatorMemberName: string;
  nodes: TeamMemberInput[];
};

type FormStateOptions = {
  formData: TeamFormData;
  formErrors: Record<string, string>;
  currentTeamDefinitionId: ComputedRef<string | null>;
  agentDefinitions: ComputedRef<NamedDefinition[]>;
  teamDefinitions: ComputedRef<NamedDefinition[]>;
  getAgentDefinitionById: (id: string) => NamedDefinition | null | undefined;
  getAgentTeamDefinitionById: (id: string) => NamedDefinition | null | undefined;
};

export interface LibraryItem {
  id: string;
  name: string;
  refType: ReferenceType;
  refScope?: Exclude<RefScope, null>;
}

export const createInitialFormData = (): TeamFormData => ({
  name: '',
  category: '',
  description: '',
  instructions: '',
  avatarUrl: '',
  coordinatorMemberName: '',
  nodes: [],
});

export const mapInitialTeamNodes = (nodes: any[] = []): TeamMemberInput[] =>
  nodes.map((node: any) => ({
    memberName: node.memberName,
    refType: node.refType,
    ref: node.ref,
    refScope: node.refType === 'AGENT' ? node.refScope ?? 'SHARED' : null,
  }));

export const buildSubmitNodes = (nodes: TeamMemberInput[]): TeamMemberInput[] =>
  nodes.map((node) => ({
    memberName: node.memberName.trim(),
    refType: node.refType,
    ref: node.ref,
    refScope: node.refType === 'AGENT' ? node.refScope ?? 'SHARED' : null,
  }));

export const useAgentTeamDefinitionFormState = ({
  formData,
  formErrors,
  currentTeamDefinitionId,
  agentDefinitions,
  teamDefinitions,
  getAgentDefinitionById,
  getAgentTeamDefinitionById,
}: FormStateOptions) => {
  const librarySearch = ref('');
  const selectedNodeIndex = ref<number | null>(null);
  const isCanvasDragOver = ref(false);

  const clearErrors = () => {
    Object.keys(formErrors).forEach((key) => delete formErrors[key]);
  };

  const agentLibraryItems = computed<LibraryItem[]>(() =>
    agentDefinitions.value.map((agent) => ({
      id: agent.id,
      name: agent.name,
      refType: 'AGENT',
      refScope: 'SHARED',
    })),
  );

  const teamLibraryItems = computed<LibraryItem[]>(() =>
    teamDefinitions.value
      .filter((team) => team.id !== currentTeamDefinitionId.value)
      .map((team) => ({
        id: team.id,
        name: team.name,
        refType: 'AGENT_TEAM',
      })),
  );

  const filteredAgentItems = computed(() => {
    const query = librarySearch.value.trim().toLowerCase();
    if (!query) {
      return agentLibraryItems.value;
    }
    return agentLibraryItems.value.filter((item) => item.name.toLowerCase().includes(query));
  });

  const filteredTeamItems = computed(() => {
    const query = librarySearch.value.trim().toLowerCase();
    if (!query) {
      return teamLibraryItems.value;
    }
    return teamLibraryItems.value.filter((item) => item.name.toLowerCase().includes(query));
  });

  const selectedNode = computed(() => {
    if (selectedNodeIndex.value === null) {
      return null;
    }
    return formData.nodes[selectedNodeIndex.value] || null;
  });

  const getReferenceName = (node: TeamMemberInput): string => {
    if (node.refType === 'AGENT') {
      if (node.refScope === 'TEAM_LOCAL') {
        return `Local Agent (${node.ref})`;
      }
      return getAgentDefinitionById(node.ref)?.name || node.ref;
    }
    return getAgentTeamDefinitionById(node.ref)?.name || node.ref;
  };

  const buildMemberBaseName = (rawName: string): string => {
    const normalized = rawName
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    return normalized || 'member';
  };

  const buildUniqueMemberName = (rawName: string): string => {
    const baseName = buildMemberBaseName(rawName);
    const used = new Set(formData.nodes.map((node) => node.memberName));
    if (!used.has(baseName)) {
      return baseName;
    }

    let counter = 2;
    while (used.has(`${baseName}_${counter}`)) {
      counter += 1;
    }
    return `${baseName}_${counter}`;
  };

  const addNodeFromLibrary = (item: LibraryItem) => {
    const newNode: TeamMemberInput = {
      memberName: buildUniqueMemberName(item.name),
      refType: item.refType,
      ref: item.id,
      refScope: item.refType === 'AGENT' ? item.refScope ?? 'SHARED' : null,
    };

    formData.nodes.push(newNode);
    selectedNodeIndex.value = formData.nodes.length - 1;

    if (!formData.coordinatorMemberName && newNode.refType === 'AGENT') {
      formData.coordinatorMemberName = newNode.memberName;
    }
  };

  const onLibraryDragStart = (event: DragEvent, item: LibraryItem) => {
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleCanvasDrop = (event: DragEvent) => {
    isCanvasDragOver.value = false;
    const payload = event.dataTransfer?.getData('application/json');
    if (!payload) {
      return;
    }

    try {
      const item = JSON.parse(payload) as LibraryItem;
      if (!item?.id || !item?.name || !item?.refType) {
        return;
      }
      addNodeFromLibrary(item);
    } catch (error) {
      console.error('Failed to parse dropped team member payload:', error);
    }
  };

  const selectNode = (index: number) => {
    selectedNodeIndex.value = index;
  };

  const removeNode = (index: number) => {
    const removedNodeName = formData.nodes[index]?.memberName;
    formData.nodes.splice(index, 1);

    if (formData.coordinatorMemberName === removedNodeName) {
      formData.coordinatorMemberName = '';
    }

    if (selectedNodeIndex.value === null) {
      return;
    }
    if (formData.nodes.length === 0) {
      selectedNodeIndex.value = null;
    } else if (selectedNodeIndex.value >= formData.nodes.length) {
      selectedNodeIndex.value = formData.nodes.length - 1;
    } else if (selectedNodeIndex.value === index) {
      selectedNodeIndex.value = Math.max(0, index - 1);
    }
  };

  const isCoordinator = (node: TeamMemberInput) =>
    formData.coordinatorMemberName === node.memberName;

  const toggleCoordinator = (node: TeamMemberInput) => {
    if (node.refType !== 'AGENT') {
      return;
    }
    formData.coordinatorMemberName = isCoordinator(node) ? '' : node.memberName;
  };

  const updateSelectedMemberName = (nextNameRaw: string) => {
    if (!selectedNode.value) {
      return;
    }
    const nextName = nextNameRaw.trim();
    const oldName = selectedNode.value.memberName;
    selectedNode.value.memberName = nextName;

    if (formData.coordinatorMemberName === oldName) {
      formData.coordinatorMemberName = nextName;
    }
  };

  const validateForm = () => {
    clearErrors();
    let valid = true;

    if (!formData.name.trim()) {
      formErrors.name = 'Team name is required.';
      valid = false;
    }

    if (!formData.description.trim()) {
      formErrors.description = 'Team description is required.';
      valid = false;
    }

    if (formData.nodes.length === 0) {
      formErrors.nodes = 'Add at least one member.';
      valid = false;
    }

    const memberNames = new Set<string>();
    for (const node of formData.nodes) {
      if (!node.memberName.trim()) {
        formErrors.nodes = 'Each member needs a name.';
        valid = false;
        break;
      }
      if (!node.ref) {
        formErrors.nodes = 'Each member needs a source reference.';
        valid = false;
        break;
      }
      if (node.refType === 'AGENT' && !node.refScope) {
        formErrors.nodes = 'Each agent member needs a scope.';
        valid = false;
        break;
      }
      if (node.refType === 'AGENT_TEAM' && node.refScope) {
        formErrors.nodes = 'Nested team members must not include an agent scope.';
        valid = false;
        break;
      }
      if (memberNames.has(node.memberName)) {
        formErrors.nodes = 'Member names must be unique.';
        valid = false;
        break;
      }
      memberNames.add(node.memberName);

      if (
        currentTeamDefinitionId.value &&
        node.refType === 'AGENT_TEAM' &&
        node.ref === currentTeamDefinitionId.value
      ) {
        formErrors.nodes = 'A team cannot include itself as a nested team member.';
        valid = false;
        break;
      }
    }

    if (!formData.coordinatorMemberName) {
      formErrors.coordinatorMemberName = 'Coordinator is required.';
      valid = false;
    } else {
      const coordinatorExists = formData.nodes.some(
        (node) => node.refType === 'AGENT' && node.memberName === formData.coordinatorMemberName,
      );
      if (!coordinatorExists) {
        formErrors.coordinatorMemberName = 'Coordinator must be one of the AGENT members.';
        valid = false;
      }
    }

    return valid;
  };

  return {
    addNodeFromLibrary,
    clearErrors,
    filteredAgentItems,
    filteredTeamItems,
    getReferenceName,
    handleCanvasDrop,
    isCanvasDragOver,
    isCoordinator,
    librarySearch,
    onLibraryDragStart,
    removeNode,
    selectNode,
    selectedNode,
    selectedNodeIndex,
    toggleCoordinator,
    updateSelectedMemberName,
    validateForm,
  };
};
