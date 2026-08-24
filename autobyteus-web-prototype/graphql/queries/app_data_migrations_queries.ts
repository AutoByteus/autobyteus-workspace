import { gql } from 'graphql-tag'

export const GetAppDataMigrations = gql`
  query GetAppDataMigrations {
    getAppDataMigrations {
      migrationId
      displayName
      description
      status
      requiredOnStartup
      recoveryAction
      canRetry
      attempts
      startedAt
      completedAt
      summary
      errorMessage
      logPath
    }
  }
`
