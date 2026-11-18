import { gql } from 'graphql-tag'

export const MEMORY_SEARCH = gql`
  query MemorySearch($query: String!, $limit: Int) {
    memorySearch(query: $query, limit: $limit) {
      results {
        agent
        team
        member
        org
        runId
        workspace
        firstDay
        latestDay
        subject { kind runId agentDefinitionId teamRunId orgRunId agentRunId runKey }
        matches { journalFileName lineStart lineEnd day snippet matchedBy matchedWords }
      }
      coverage
      wordsNotFound
      note
    }
  }
`

export const MEMORY_INDEX_STATUS = gql`
  query MemoryIndexStatus {
    memoryIndexStatus {
      state
      steps { step state done total unit failureMessage }
      runCount
      journalFileCount
      updatedAt
      textIndexHasContent
      activeModelId
      meaningIndexModelId
      meaningNote
    }
  }
`

const WORK_JOURNAL_FIELDS = `
  files { journalFile state sizeBytes lineCount days { day line } }
  selectedFile
  start
  end
  lineCount
  lines
`

export const GET_AGENT_RUN_WORK_JOURNAL = gql`
  query GetAgentRunWorkJournal($runId: String!, $source: MemoryExplorerSourceInput, $workJournal: WorkJournalWindowInput) {
    getAgentRunMemoryView(runId: $runId, source: $source, workJournal: $workJournal) {
      runId
      workJournal { ${WORK_JOURNAL_FIELDS} }
    }
  }
`

export const GET_TEAM_MEMBER_RUN_WORK_JOURNAL = gql`
  query GetTeamMemberRunWorkJournal($teamRunId: String!, $agentRunId: String!, $source: MemoryExplorerSourceInput, $workJournal: WorkJournalWindowInput) {
    getTeamMemberRunMemoryView(teamRunId: $teamRunId, agentRunId: $agentRunId, source: $source, workJournal: $workJournal) {
      runId
      workJournal { ${WORK_JOURNAL_FIELDS} }
    }
  }
`

export const GET_AGENT_ORG_MEMBER_RUN_WORK_JOURNAL = gql`
  query GetAgentOrgMemberRunWorkJournal($orgRunId: String!, $agentRunId: String!, $source: MemoryExplorerSourceInput, $workJournal: WorkJournalWindowInput) {
    getAgentOrgMemberRunMemoryView(orgRunId: $orgRunId, agentRunId: $agentRunId, source: $source, workJournal: $workJournal) {
      runId
      workJournal { ${WORK_JOURNAL_FIELDS} }
    }
  }
`

export const GET_RUN_FOLDER_WORK_JOURNAL = gql`
  query GetRunFolderWorkJournal($runKey: String!, $workJournal: WorkJournalWindowInput) {
    runFolderWorkJournal(runKey: $runKey, workJournal: $workJournal) { ${WORK_JOURNAL_FIELDS} }
  }
`
