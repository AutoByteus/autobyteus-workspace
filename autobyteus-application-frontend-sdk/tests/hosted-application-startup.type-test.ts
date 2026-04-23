import {
  startHostedApplication,
  type HostedApplicationBootstrappedContext,
} from '../dist/index.js';

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
  },
});

const context = null as unknown as HostedApplicationBootstrappedContext;
requireHTMLElement(context.rootElement);
