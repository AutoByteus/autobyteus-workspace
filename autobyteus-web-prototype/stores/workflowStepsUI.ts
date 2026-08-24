import { defineStore } from 'pinia'

export const useWorkflowStepsUIStore = defineStore('workflowStepsUI', {
  state: () => ({
    isWorkflowStepsVisible: false
  }),
  
  actions: {
    toggleWorkflowSteps() {
      this.isWorkflowStepsVisible = !this.isWorkflowStepsVisible
    },
    
    showWorkflowSteps() {
      this.isWorkflowStepsVisible = true
    },
    
    hideWorkflowSteps() {
      this.isWorkflowStepsVisible = false
    }
  }
})
