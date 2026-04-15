import gql from 'graphql-tag'

export const GET_APPLICATION_PACKAGES = gql`
  query GetApplicationPackages {
    applicationPackages {
      packageId
      displayName
      path
      sourceKind
      source
      applicationCount
      isDefault
      isRemovable
    }
  }
`

export const IMPORT_APPLICATION_PACKAGE = gql`
  mutation ImportApplicationPackage($input: ImportApplicationPackageInput!) {
    importApplicationPackage(input: $input) {
      packageId
      displayName
      path
      sourceKind
      source
      applicationCount
      isDefault
      isRemovable
    }
  }
`

export const REMOVE_APPLICATION_PACKAGE = gql`
  mutation RemoveApplicationPackage($packageId: String!) {
    removeApplicationPackage(packageId: $packageId) {
      packageId
      displayName
      path
      sourceKind
      source
      applicationCount
      isDefault
      isRemovable
    }
  }
`
