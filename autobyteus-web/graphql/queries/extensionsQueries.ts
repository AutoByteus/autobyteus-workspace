import gql from 'graphql-tag'

export const ExtensionItemFields = gql`
  fragment ExtensionItemFields on ExtensionItemGql {
    id
    name
    description
    translations
    platforms
    state
    catalogVersion
    notAvailableReason
    progress { message percent }
    installedVersion
    enabled
    ready
    message
    starting
    update
    failureMessage
  }
`

/** The extensions of a node; `refreshCatalog` fetches the catalog first (page open), otherwise the node's copy. */
export const GetExtensions = gql`
  query GetExtensions($refreshCatalog: Boolean = false) {
    extensions(refreshCatalog: $refreshCatalog) {
      catalog
      platform
      extensions { ...ExtensionItemFields }
    }
  }
  ${ExtensionItemFields}
`

export const GetExtensionLog = gql`
  query GetExtensionLog($id: String!) {
    extensionLog(id: $id)
  }
`
