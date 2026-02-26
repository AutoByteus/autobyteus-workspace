import { defineStore } from 'pinia';
import apiService from '~/services/api';
import { useToasts } from '~/composables/useToasts';

export interface MediaFile {
  filename: string;
  category: string;
  url: string;
  createdAt: number;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalFiles: number;
  limit: number;
}

interface MediaLibraryState {
  files: MediaFile[];
  pagination: PaginationState;
  loading: boolean;
  error: string | null;
  selectedCategory: string;
}

export const useMediaLibraryStore = defineStore('mediaLibrary', {
  state: (): MediaLibraryState => ({
    files: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalFiles: 0,
      limit: 20,
    },
    loading: false,
    error: null,
    selectedCategory: 'all',
  }),

  actions: {
    async fetchMedia(page: number = 1) {
      this.loading = true;
      this.error = null;
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: this.pagination.limit.toString(),
        });

        if (this.selectedCategory !== 'all') {
          params.append('category', this.selectedCategory);
        }

        const response = await apiService.get(`/media?${params.toString()}`);
        
        this.files = response.data.files;
        this.pagination = response.data.pagination;

      } catch (err: any) {
        console.error('Failed to fetch media files:', err);
        this.error = 'Failed to load media files. Please try again later.';
      } finally {
        this.loading = false;
      }
    },

    async deleteMediaFile(file: MediaFile) {
      const { addToast } = useToasts();
      try {
        await apiService.delete(`/media/${file.category}/${file.filename}`);
        addToast(`Successfully deleted '${file.filename}'.`, 'success');
        
        // If the deleted item was the last one on the page, and it's not the first page, go back one page.
        if (this.files.length === 1 && this.pagination.currentPage > 1) {
          await this.fetchMedia(this.pagination.currentPage - 1);
        } else {
          await this.fetchMedia(this.pagination.currentPage);
        }
      } catch (err: any) {
        console.error('Failed to delete media file:', err);
        const errorMessage = err.response?.data?.detail || 'An unexpected error occurred.';
        addToast(`Failed to delete file: ${errorMessage}`, 'error');
        throw err; // Re-throw to let the component know about the failure
      }
    },

    setCategory(category: string) {
      if (this.selectedCategory !== category) {
        this.selectedCategory = category;
        this.fetchMedia(1); // Reset to first page when category changes
      }
    },

    changePage(page: number) {
      if (page > 0 && page <= this.pagination.totalPages) {
        this.fetchMedia(page);
      }
    },
  },

  getters: {
    getCategories: (state) => {
      // These are the physical directories on the backend
      return ['all', 'images', 'video', 'audio', 'documents', 'others'];
    },
  },
});
