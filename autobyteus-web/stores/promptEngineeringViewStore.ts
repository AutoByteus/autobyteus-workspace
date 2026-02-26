import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';

type ViewMode = 'marketplace' | 'create' | 'details' | 'drafts';
type MarketplaceViewMode = 'grid' | 'compact';
type SectionContext = 'marketplace' | 'drafts';

export interface PromptDraft {
  id: string;
  name: string;
  category: string;
  description: string;
  promptContent: string;
  suitableForModels: string[];
  updatedAt: number;
}

interface PromptEngineeringViewState {
  currentView: ViewMode;
  selectedPromptId: string | null;
  sectionContext: SectionContext;

  marketplaceSearchQuery: string;
  marketplaceCategoryFilter: string;
  marketplaceNameFilter: string;
  marketplaceViewMode: MarketplaceViewMode;

  drafts: PromptDraft[];
  activeDraftId: string | null;
}

export const usePromptEngineeringViewStore = defineStore('promptEngineeringView', {
  state: (): PromptEngineeringViewState => {
    let savedDrafts: PromptDraft[] = [];
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('prompt_drafts');
      if (stored) {
        try {
          savedDrafts = JSON.parse(stored);
        } catch (error) {
          console.error('Failed to parse drafts from localStorage', error);
        }
      }
    }

    return {
      currentView: 'marketplace',
      selectedPromptId: null,
      sectionContext: 'marketplace',

      marketplaceSearchQuery: '',
      marketplaceCategoryFilter: '',
      marketplaceNameFilter: '',
      marketplaceViewMode: 'grid',

      drafts: savedDrafts,
      activeDraftId: null,
    };
  },

  actions: {
    showMarketplace() {
      this.currentView = 'marketplace';
      this.sectionContext = 'marketplace';
      this.selectedPromptId = null;
      this.activeDraftId = null;
    },

    showDraftsList() {
      this.currentView = 'drafts';
      this.sectionContext = 'drafts';
      this.selectedPromptId = null;
      this.activeDraftId = null;
    },

    showCreatePromptView() {
      this.startNewDraft('marketplace');
    },

    showPromptDetails(promptId: string) {
      this.selectedPromptId = promptId;
      this.activeDraftId = null;
      this.currentView = 'details';
      if (!this.sectionContext) {
        this.sectionContext = 'marketplace';
      }
    },

    closePromptDetails() {
      this.selectedPromptId = null;
      this.currentView = 'marketplace';
      this.sectionContext = 'marketplace';
    },

    startNewDraft(origin: SectionContext = 'marketplace') {
      const newDraft: PromptDraft = {
        id: uuidv4(),
        name: '',
        category: '',
        description: '',
        promptContent: '',
        suitableForModels: [],
        updatedAt: Date.now(),
      };
      this.drafts.unshift(newDraft);
      this.activeDraftId = newDraft.id;
      this.currentView = 'create';
      this.sectionContext = origin;
      this.persistDrafts();
    },

    duplicateDraft(prompt: {
      name: string;
      category: string;
      description?: string | null;
      promptContent: string;
      suitableForModels?: string | null;
    }) {
      const newDraft: PromptDraft = {
        id: uuidv4(),
        name: prompt.name,
        category: prompt.category,
        description: prompt.description || '',
        promptContent: prompt.promptContent,
        suitableForModels: prompt.suitableForModels
          ? prompt.suitableForModels
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
        updatedAt: Date.now(),
      };

      this.drafts.unshift(newDraft);
      this.activeDraftId = newDraft.id;
      this.currentView = 'create';
      this.persistDrafts();
    },

    openDraft(id: string) {
      const draft = this.drafts.find((item) => item.id === id);
      if (!draft) return;
      this.activeDraftId = id;
      this.currentView = 'create';
      this.sectionContext = 'drafts';
    },

    updateActiveDraft(updates: Partial<Omit<PromptDraft, 'id' | 'updatedAt'>>) {
      if (!this.activeDraftId) return;

      const index = this.drafts.findIndex((item) => item.id === this.activeDraftId);
      if (index === -1) return;

      this.drafts[index] = {
        ...this.drafts[index],
        ...updates,
        updatedAt: Date.now(),
      };
      this.persistDrafts();
    },

    deleteDraft(id: string) {
      this.drafts = this.drafts.filter((draft) => draft.id !== id);
      this.persistDrafts();

      if (this.activeDraftId !== id) return;

      this.activeDraftId = null;
      if (this.currentView !== 'create') return;

      if (this.sectionContext === 'drafts') {
        this.showDraftsList();
        return;
      }
      this.showMarketplace();
    },

    persistDrafts() {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem('prompt_drafts', JSON.stringify(this.drafts));
    },

    resetMarketplaceFilters() {
      this.marketplaceSearchQuery = '';
      this.marketplaceCategoryFilter = '';
      this.marketplaceNameFilter = '';
      this.marketplaceViewMode = 'grid';
    },
  },

  getters: {
    isMarketplaceView: (state): boolean => state.currentView === 'marketplace' && !state.selectedPromptId,
    isCreateView: (state): boolean => state.currentView === 'create',
    isDetailsView: (state): boolean => state.selectedPromptId !== null,
    isDraftsView: (state): boolean => state.currentView === 'drafts',

    activeDraft: (state) => state.drafts.find((draft) => draft.id === state.activeDraftId) || null,
    draftCount: (state) => state.drafts.length,
    currentSectionContext: (state) => state.sectionContext,

    isDraftEmpty: () => (draft: Partial<PromptDraft>) => {
      return (
        !draft.name?.trim() &&
        !draft.category?.trim() &&
        !draft.description?.trim() &&
        !draft.promptContent?.trim()
      );
    },

    nonEmptyDrafts: (state): PromptDraft[] => {
      return state.drafts.filter((draft) => {
        return (
          draft.name?.trim() ||
          draft.category?.trim() ||
          draft.description?.trim() ||
          draft.promptContent?.trim()
        );
      });
    },
  },
});
