import { defineApplication } from '@autobyteus/application-backend-sdk';

export default defineApplication({
  definitionContractVersion: '2',
  queries: {
    status: async (_input, context) => ({
      ok: true,
      applicationId: context.requestContext?.applicationId ?? null,
      storageRoot: context.storage.rootPath,
    }),
  },
  commands: {
    echo: async (input) => ({ input }),
  },
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: async (_request, context) => ({
        status: 200,
        body: {
          ok: true,
          applicationId: context.requestContext?.applicationId ?? null,
        },
      }),
    },
  ],
  graphql: {
    execute: async (request, context) => ({
      data: {
        operationName: request.operationName ?? null,
        applicationId: context.requestContext?.applicationId ?? null,
      },
    }),
  },
});
