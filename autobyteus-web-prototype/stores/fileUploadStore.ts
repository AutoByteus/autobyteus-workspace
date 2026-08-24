import { defineStore } from 'pinia';
import apiService from '~/services/api';

interface FileUploadState {
  isUploading: boolean;
  error: string | null;
}

export const useFileUploadStore = defineStore('fileUpload', {
  state: (): FileUploadState => ({
    isUploading: false,
    error: null,
  }),
  actions: {
    async uploadFile(file: File): Promise<string> {
      this.isUploading = true;
      this.error = null;
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await apiService.post<{ fileUrl: string }>('/upload-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.fileUrl;
      } catch (error: any) {
        console.error('Error uploading file:', error);
        this.error = error.message || 'An unknown error occurred during file upload.';
        throw error;
      } finally {
        this.isUploading = false;
      }
    },
  },
});
