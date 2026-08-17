import fs from 'node:fs/promises';
import path from 'node:path';

const serverUrl = 'http://127.0.0.1:60418';
const evidenceRoot = path.resolve(
  'tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-evidence/api-rev-001/live/provider',
);

const graphql = async (query, variables = {}) => {
  const response = await fetch(`${serverUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(`GRAPHQL_FAILED ${JSON.stringify(payload)}`);
  }
  return payload;
};

const importRequest = {
  query: `mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
    importAgentPackage(input: $input) {
      packageId displayName path sourceKind source sharedAgentCount teamLocalAgentCount
      agentTeamCount applicationCount isDefault isRemovable
    }
  }`,
  variables: {
    input: {
      sourceKind: 'LOCAL_PATH',
      source: '/Users/normy/autobyteus_org/autobyteus-agents',
    },
  },
};
await fs.writeFile(
  path.join(evidenceRoot, 'agent-package-import-request.json'),
  `${JSON.stringify(importRequest, null, 2)}\n`,
);
const importResult = await graphql(importRequest.query, importRequest.variables);
await fs.writeFile(
  path.join(evidenceRoot, 'agent-package-import-result.json'),
  `${JSON.stringify(importResult, null, 2)}\n`,
);

const definitionRequest = {
  query: `query GetAgentTeamDefinitions {
    agentTeamDefinitions {
      id name coordinatorMemberName ownershipScope ownerPackageId defaultLaunchConfig {
        llmModelIdentifier runtimeKind llmConfig
      }
      nodes { memberName ref refType refScope }
    }
  }`,
  variables: {},
};
const definitions = await graphql(definitionRequest.query, definitionRequest.variables);
const classroom = definitions.data.agentTeamDefinitions.find(
  (definition) => definition.id === 'classroom-simulation-team',
);
if (!classroom) throw new Error('CLASSROOM_DEFINITION_NOT_IMPORTED');
await fs.writeFile(
  path.join(evidenceRoot, 'classroom-definition.json'),
  `${JSON.stringify(classroom, null, 2)}\n`,
);

console.log(JSON.stringify({
  importedPackage: importResult.data.importAgentPackage.find(
    (entry) => entry.source === '/Users/normy/autobyteus_org/autobyteus-agents',
  ),
  classroom,
}, null, 2));
