import gql from 'graphql-tag'

export const ApplicationPackageListFields = gql`
  fragment ApplicationPackageListFields on ApplicationPackage {
    packageId
    displayName
    sourceKind
    sourceSummary
    applicationCount
    isPlatformOwned
    isRemovable
  }
`

export const ApplicationPackageDetailsFields = gql`
  fragment ApplicationPackageDetailsFields on ApplicationPackageDetails {
    packageId
    displayName
    sourceKind
    sourceSummary
    rootPath
    source
    managedInstallPath
    bundledSourceRootPath
    applicationCount
    isPlatformOwned
    isRemovable
  }
`

export const GET_APPLICATION_PACKAGES = gql`
  query GetApplicationPackages {
    applicationPackages {
      ...ApplicationPackageListFields
    }
  }
  ${ApplicationPackageListFields}
`

export const GET_APPLICATION_PACKAGE_DETAILS = gql`
  query GetApplicationPackageDetails($packageId: String!) {
    applicationPackageDetails(packageId: $packageId) {
      ...ApplicationPackageDetailsFields
    }
  }
  ${ApplicationPackageDetailsFields}
`

export const IMPORT_APPLICATION_PACKAGE = gql`
  mutation ImportApplicationPackage($input: ImportApplicationPackageInput!) {
    importApplicationPackage(input: $input) {
      ...ApplicationPackageListFields
    }
  }
  ${ApplicationPackageListFields}
`

export const REMOVE_APPLICATION_PACKAGE = gql`
  mutation RemoveApplicationPackage($packageId: String!) {
    removeApplicationPackage(packageId: $packageId) {
      ...ApplicationPackageListFields
    }
  }
  ${ApplicationPackageListFields}
`
