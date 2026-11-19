/** The demo node's GraphQL answers, one file per subject (autobyteus-279). */
import type { DemoGraphqlHandlers } from './operations';

export const demoGraphqlHandlers: Partial<DemoGraphqlHandlers> = {
  PhoneCredentialCheck: () => ({ __typename: 'Query' }),
};
