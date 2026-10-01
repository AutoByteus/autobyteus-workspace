import gql from 'graphql-tag'

export const RuntimeCurrentModelDescriptors = gql`query RuntimeCurrentModelDescriptors($runtimeKind: String!, $identifiers: [String!]!) {
  runtimeCurrentModelDescriptors(runtimeKind: $runtimeKind, identifiers: $identifiers) {
    identifier model { modelIdentifier name canonicalName providerName providerType description configSchema }
  }
}`
