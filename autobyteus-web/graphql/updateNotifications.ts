import gql from 'graphql-tag'

export const UPDATE_NOTIFICATION_FIELDS = gql`
  fragment UpdateNotificationFields on UpdateNotification {
    kind
    sourceId
    name
    repositoryUrl
    defaultBranch
    installedRevision
    latestRevision
    foundAt
    read
    state
    handledRevision
    handledAt
  }
`

export const GET_UPDATE_NOTIFICATIONS = gql`
  query GetUpdateNotifications {
    updateNotifications {
      ...UpdateNotificationFields
    }
  }
  ${UPDATE_NOTIFICATION_FIELDS}
`

export const MARK_UPDATE_NOTIFICATIONS_READ = gql`
  mutation MarkUpdateNotificationsRead {
    markUpdateNotificationsRead {
      ...UpdateNotificationFields
    }
  }
  ${UPDATE_NOTIFICATION_FIELDS}
`

export const CLEAR_UPDATE_NOTIFICATION = gql`
  mutation ClearUpdateNotification($kind: UpdateNotificationKind!, $sourceId: String!) {
    clearUpdateNotification(kind: $kind, sourceId: $sourceId) {
      ...UpdateNotificationFields
    }
  }
  ${UPDATE_NOTIFICATION_FIELDS}
`

export const GET_UPDATE_CHECKS_CAPABILITY = gql`
  query GetUpdateChecksCapability {
    updateChecksCapability {
      enabled
      settingKey
      source
    }
  }
`

export const SET_UPDATE_CHECKS_ENABLED = gql`
  mutation SetUpdateChecksEnabled($enabled: Boolean!) {
    setUpdateChecksEnabled(enabled: $enabled) {
      enabled
      settingKey
      source
    }
  }
`
