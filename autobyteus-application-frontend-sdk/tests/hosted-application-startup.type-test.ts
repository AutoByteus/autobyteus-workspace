import {
  startHostedApplication,
  type ApplicationClient,
  type HostedApplicationBootstrappedContext,
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

const exactApplicationCapabilityGroups: ExactApplicationCapabilityGroups = true;
const backendNotificationAliasAbsent: BackendNotificationAliasAbsent = true;
void exactApplicationCapabilityGroups;
void backendNotificationAliasAbsent;

const requireHTMLElement = (element: HTMLElement): void => {
  element.querySelector('#mounted');
  element.dataset.boundary = 'hosted-application';
};

const rootElement = document.createElement('div');

startHostedApplication({
  rootElement,
  window,
  onBootstrapped: ({ bootstrap, applicationClient, rootElement }) => {
    requireHTMLElement(rootElement);
    rootElement.dataset.applicationId = bootstrap.application.applicationId;
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

const context = null as unknown as HostedApplicationBootstrappedContext;
requireHTMLElement(context.rootElement);
