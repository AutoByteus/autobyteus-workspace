import gql from 'graphql-tag'
import { ExtensionItemFields } from '~/graphql/queries/extensionsQueries'

export const InstallExtension = gql`
  mutation InstallExtension($id: String!) {
    installExtension(id: $id) { ...ExtensionItemFields }
  }
  ${ExtensionItemFields}
`

export const UpdateExtension = gql`
  mutation UpdateExtension($id: String!) {
    updateExtension(id: $id) { ...ExtensionItemFields }
  }
  ${ExtensionItemFields}
`

export const RemoveExtension = gql`
  mutation RemoveExtension($id: String!) {
    removeExtension(id: $id) { ...ExtensionItemFields }
  }
  ${ExtensionItemFields}
`

export const SetExtensionEnabled = gql`
  mutation SetExtensionEnabled($id: String!, $enabled: Boolean!) {
    setExtensionEnabled(id: $id, enabled: $enabled) { ...ExtensionItemFields }
  }
  ${ExtensionItemFields}
`
