import { gql } from 'graphql-tag'

export const RunAppDataMigration = gql`
  mutation RunAppDataMigration($migrationId: String!) {
    runAppDataMigration(migrationId: $migrationId) {
      success
      message
      migration {
        migrationId
        displayName
        description
        status
        requiredOnStartup
        canRetry
        attempts
        startedAt
        completedAt
        summary
        errorMessage
        logPath
      }
    }
  }
`
