import {
  startApplication,
  type ApplicationAgentEvent,
  type ApplicationAgentStreamEvent,
  type ApplicationBootstrappedContext,
  type ApplicationClient,
} from '../dist/index.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Assert<Condition extends true> = Condition;
type ApplicationCapabilityGroup = Exclude<keyof ApplicationClient, 'getApplicationInfo'>;
type ExactApplicationCapabilityGroups = Assert<Equal<
  ApplicationCapabilityGroup,
  'backend' | 'notifications' | 'agentCommunication'
>>;
type BackendNotificationAliasAbsent = Assert<Equal<
  Extract<keyof ApplicationClient['backend'], 'subscribeNotifications'>,
  never
>>;
type ExactApplicationAgentStreamEvent = Assert<Equal<
  ApplicationAgentStreamEvent,
  | { type: 'TURN_STARTED' }
  | { type: 'TEXT_DELTA'; delta: string }
  | { type: 'TURN_COMPLETED' }
  | { type: 'TURN_INTERRUPTED' }
  | { type: 'ERROR'; message: string }
>>;
type ApplicationAgentProducerIsRequired = Assert<Equal<
  Extract<ApplicationAgentEvent['producer'], null>,
  never
>>;

const exactApplicationCapabilityGroups: ExactApplicationCapabilityGroups = true;
const backendNotificationAliasAbsent: BackendNotificationAliasAbsent = true;
const exactApplicationAgentStreamEvent: ExactApplicationAgentStreamEvent = true;
const applicationAgentProducerIsRequired: ApplicationAgentProducerIsRequired = true;
void exactApplicationCapabilityGroups;
void backendNotificationAliasAbsent;
void exactApplicationAgentStreamEvent;
void applicationAgentProducerIsRequired;

const rootElement = document.createElement('div');

startApplication({
  rootElement,
  onBootstrapped: ({ runtimeBootstrap, applicationClient, rootElement }) => {
    rootElement.dataset.applicationId = runtimeBootstrap.application.applicationId;
    applicationClient.getApplicationInfo();
    applicationClient.backend.query('sample.query');
    applicationClient.notifications.subscribe(() => undefined);
    applicationClient.agentCommunication.connect({
      bindingId: 'binding-1',
      target: { kind: 'AGENT_RUN' },
    });
    // @ts-expect-error the current notification capability exposes only subscribe
    applicationClient.notifications.subscribeNotifications(() => undefined);
  },
});

const context = null as unknown as ApplicationBootstrappedContext;
context.rootElement.querySelector('#mounted');
