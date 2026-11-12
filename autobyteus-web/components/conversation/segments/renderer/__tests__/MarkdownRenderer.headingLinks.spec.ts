import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';

// autobyteus-480: heading anchors (REQ-001 / AC-001), same-document links scroll in place (REQ-002 / AC-002..AC-004),
// links with no scheme do nothing (REQ-003 / AC-004), external and other links as before (REQ-004 / AC-005).

vi.mock('~/components/conversation/segments/renderer/MermaidDiagram.vue', () => ({
  default: { name: 'MermaidDiagram', template: '<div class="mermaid-diagram-mock"></div>', props: ['content'] },
}));

const fixture = readFileSync(path.resolve(process.cwd(), 'utils/__tests__/fixtures/design-principles.md'), 'utf8');

let pinia: Pinia;
let wrappers: VueWrapper[];
let scrollIntoView: ReturnType<typeof vi.fn>;
let openExternalLink: ReturnType<typeof vi.fn>;
const priorElectronApi = window.electronAPI;

const render = (content: string, props: Record<string, unknown> = {}) => {
  const wrapper = mount(MarkdownRenderer, { props: { content, ...props }, global: { plugins: [pinia] }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
};

/** Dispatches a real, cancelable click; returns whether the browser default was prevented. */
const click = (element: Element): boolean => !element.dispatchEvent(
  new MouseEvent('click', { bubbles: true, cancelable: true }),
);

const link = (wrapper: VueWrapper, href: string): Element => {
  const found = [...wrapper.element.querySelectorAll('a')].find((a) => a.getAttribute('href') === href);
  if (!found) throw new Error(`no link ${href}`);
  return found;
};

describe('MarkdownRenderer heading links', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    wrappers = [];
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as Element['scrollIntoView'];
    openExternalLink = vi.fn();
    window.electronAPI = { ...priorElectronApi, openExternalLink } as typeof window.electronAPI;
  });

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    window.electronAPI = priorElectronApi;
  });

  it('gives each heading its GitHub anchor id, numbering repeats, from the text as written', () => {
    const wrapper = render([
      '# Hello World', '## Notes', '## Notes', '## A -- B', "## What's **new** in `v2`", '## See [the docs](https://example.com)',
    ].join('\n\n'));

    expect([...wrapper.element.querySelectorAll('h1, h2')].map((heading) => heading.id)).toEqual([
      'user-content-hello-world',
      'user-content-notes',
      'user-content-notes-1',
      'user-content-a----b',
      'user-content-whats-new-in-v2',
      'user-content-see-the-docs',
    ]);
  });

  it('renders design-principles.md so every Contents entry has exactly one heading', () => {
    const wrapper = render(fixture);
    const anchors = [...wrapper.element.querySelectorAll('a')]
      .map((a) => a.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('#'));

    expect(anchors.length).toBeGreaterThan(20);
    for (const anchor of anchors) {
      expect(wrapper.element.querySelectorAll(`[id="user-content-${anchor.slice(1)}"]`), anchor).toHaveLength(1);
    }
  });

  it('scrolls a Contents entry to its heading without leaving the page', () => {
    const wrapper = render(fixture);
    const before = window.location.href;

    const prevented = click(link(wrapper, '#the-approach-spine-first-practices-in-context'));

    expect(prevented).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect((scrollIntoView.mock.contexts[0] as Element).id).toBe('user-content-the-approach-spine-first-practices-in-context');
    expect(window.location.href).toBe(before);
    expect(openExternalLink).not.toHaveBeenCalled();
  });

  it('decodes an encoded anchor', () => {
    const wrapper = render('[Über](#%C3%BCber-uns)\n\n## Über uns');

    click(link(wrapper, '#%C3%BCber-uns'));

    expect((scrollIntoView.mock.contexts[0] as Element).id).toBe('user-content-über-uns');
  });

  it('scrolls within its own message when two messages share a heading', () => {
    const content = '[Go](#details)\n\n## Details';
    const first = render(content);
    const second = render(content);

    click(link(second, '#details'));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    const scrolled = scrollIntoView.mock.contexts[0] as Element;
    expect(second.element.contains(scrolled)).toBe(true);
    expect(first.element.contains(scrolled)).toBe(false);
  });

  it.each(['#no-such-heading', 'other.md', 'other.md#x', '/x.md', './x.md', '../docs/x.md'])(
    'does nothing for %s, without navigating',
    (href) => {
      const wrapper = render(`[target](${href})\n\n## Heading`);
      const before = window.location.href;

      expect(click(link(wrapper, href))).toBe(true);

      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(openExternalLink).not.toHaveBeenCalled();
      expect(window.location.href).toBe(before);
    },
  );

  it('keeps external and other-scheme links as they were', () => {
    const wrapper = render('[site](https://example.com/page) [mail](mailto:hello@example.com)');

    expect(click(link(wrapper, 'https://example.com/page'))).toBe(true);
    expect(openExternalLink).toHaveBeenCalledWith('https://example.com/page');

    expect(click(link(wrapper, 'mailto:hello@example.com'))).toBe(false);
    expect(openExternalLink).toHaveBeenCalledTimes(1);
  });

  it('keeps file-action links opening their file', () => {
    const wrapper = render('[notes](/Users/test/notes.md)', { enableEventMonitorFileActions: true });

    const action = wrapper.element.querySelector('[data-event-monitor-file-action-id]');
    expect(action).not.toBeNull();
    expect(click(action!)).toBe(true);

    expect(wrapper.emitted('file-path-action')).toHaveLength(1);
    expect(openExternalLink).not.toHaveBeenCalled();
  });
});
