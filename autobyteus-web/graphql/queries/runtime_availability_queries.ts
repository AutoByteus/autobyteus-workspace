import { gql } from 'graphql-tag';

export const GET_RUNTIME_AVAILABILITY_KINDS = gql`
  query GetRuntimeAvailabilityKinds { runtimeAvailabilityKinds }
`;

export const GET_RUNTIME_AVAILABILITY = gql`
  query GetRuntimeAvailability($runtimeKind: String!) {
    runtimeAvailability(runtimeKind: $runtimeKind) { runtimeKind enabled reason }
  }
`;
