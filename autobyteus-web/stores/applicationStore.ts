import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { ListApplications } from '~/graphql/queries/applicationQueries'
import { RunApplication } from '~/graphql/mutations/applicationMutations'
import type {
  ListApplicationsQuery,
  RunApplicationMutation
} from '~/generated/graphql'

// Define the shape of an application from the query result for easier use
export type ApplicationManifest = ListApplicationsQuery['listApplications'][0]

export const useApplicationStore = defineStore('application', {
  state: () => ({
    applications: [] as ApplicationManifest[],
    loading: false,
    error: null as Error | null,
    isRunLoading: false,
    runError: null as Error | null,
    // A simple way to store the last run result. Could be more complex if needed.
    lastRunResult: null as any | null,
  }),
  getters: {
    getApplicationById: (state) => (appId: string) => {
      return state.applications.find(app => app.id === appId)
    }
  },
  actions: {
    async fetchApplications() {
      // Avoid re-fetching if we already have the data and are not in an error state
      if (this.applications.length > 0 && !this.error) {
        return
      }
      this.loading = true
      this.error = null

      const client = getApolloClient()
      try {
        const { data } = await client.query<ListApplicationsQuery>({
          query: ListApplications,
          fetchPolicy: 'network-only' // Ensure we always get the latest list
        })
        this.applications = data.listApplications || []
      } catch (e: any) {
        console.error('Failed to fetch applications:', e)
        this.error = e
      } finally {
        this.loading = false
      }
    },

    async runApplication(appId: string, input: any) {
      this.isRunLoading = true
      this.runError = null
      this.lastRunResult = null

      const client = getApolloClient()
      try {
        const { data, errors } = await client.mutate<RunApplicationMutation>({
          mutation: RunApplication,
          variables: { appId, input }
        })

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '))
        }

        const runResult = data?.runApplication
        this.lastRunResult = runResult
        return runResult
      } catch (error: any) {
        this.runError = error
        console.error(`Error running application ${appId}:`, error)
        throw error
      } finally {
        this.isRunLoading = false
      }
    },

    // fetchApplicationConfiguration and setApplicationConfiguration actions have been removed.
  }
})
