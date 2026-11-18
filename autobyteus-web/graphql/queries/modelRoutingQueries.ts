import gql from 'graphql-tag'

/** Model Routing (autobyteus-32): the switch, the router's launch and whether it is active (one JSON value). */
export const ModelRoutingStatusQuery = gql`
  query ModelRoutingStatus {
    modelRoutingStatus
  }
`

/** This node's decisions as Task groups, newest first; the source filter applies before paging. */
export const ModelRoutingDecisionsQuery = gql`
  query ModelRoutingDecisions($limit: Int!, $before: String, $source: String) {
    modelRoutingDecisions(limit: $limit, before: $before, source: $source)
  }
`

/** The Overview for a period (DAYS_7, DAYS_30, ALL). */
export const ModelRoutingStatisticsQuery = gql`
  query ModelRoutingStatistics($period: String!) {
    modelRoutingStatistics(period: $period)
  }
`
