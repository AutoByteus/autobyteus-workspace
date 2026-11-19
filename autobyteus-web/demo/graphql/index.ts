/** The demo node's GraphQL answers, one file per subject (autobyteus-279). */
import { definitionHandlers } from './definitions';
import type { DemoGraphqlHandlers } from './operations';
import { runHistoryHandlers } from './runHistory';

export const demoGraphqlHandlers: Partial<DemoGraphqlHandlers> = {
  // The phone's credential check (`mobileNodeSessionStore`): the demo session is valid.
  PhoneCredentialCheck: () => ({ __typename: 'Query' }),
  ...runHistoryHandlers,
  ...definitionHandlers,
};
