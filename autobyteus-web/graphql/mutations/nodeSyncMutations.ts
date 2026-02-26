import { gql } from 'graphql-tag';

export const RunNodeSync = gql`
  mutation RunNodeSync($input: RunNodeSyncInput!) {
    runNodeSync(input: $input) {
      status
      sourceNodeId
      error
      report {
        sourceNodeId
        scope
        exportByEntity {
          entityType
          exportedCount
          sampledKeys
          sampleTruncated
        }
        targets {
          targetNodeId
          status
          message
          failureCountTotal
          failureSampleTruncated
          failureSamples {
            entityType
            key
            message
          }
          summary {
            processed
            created
            updated
            deleted
            skipped
          }
        }
      }
      targetResults {
        targetNodeId
        status
        message
        summary {
          processed
          created
          updated
          deleted
          skipped
        }
      }
    }
  }
`;
