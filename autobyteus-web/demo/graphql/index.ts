/** The demo node's GraphQL answers, one file per subject (autobyteus-279). */
import { collaborationHandlers } from './collaboration';
import { definitionHandlers } from './definitions';
import { fileHandlers } from './files';
import { modelHandlers } from './models';
import type { DemoGraphqlHandlers } from './operations';
import { runHistoryHandlers } from './runHistory';
import { runControlHandlers } from './runControl';
import { runHandlers } from './runs';
import { taskHandlers } from './tasks';

/** Every operation of the inventory has its answer: a missing one fails the demo's type check. */
export const demoGraphqlHandlers: DemoGraphqlHandlers = {
  // The phone's credential check (`mobileNodeSessionStore`): the demo session is valid.
  PhoneCredentialCheck: () => ({ __typename: 'Query' }),
  ...runHistoryHandlers,
  ...definitionHandlers,
  ...fileHandlers,
  ...modelHandlers,
  ...runHandlers,
  ...runControlHandlers,
  ...taskHandlers,
  ...collaborationHandlers,
};
