import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright-core';

export type DevelopmentBrowserSession = {
  reload: (hostUrl: string) => Promise<void>;
  close: () => Promise<void>;
};

type DevelopmentBrowserLaunchInput = {
  executablePath?: string | null;
  channel?: string | null;
  headless?: boolean;
};

const normalizeHostUrl = (url: string): string => new URL(url).toString().replace(/\/$/, '');

export class PlaywrightDevelopmentBrowserSession implements DevelopmentBrowserSession {
  private hostUrl: string;
  private closePromise: Promise<void> | null = null;

  constructor(
    private readonly browser: Pick<Browser, 'close'>,
    private readonly context: Pick<BrowserContext, 'close'>,
    private readonly page: Pick<Page, 'goto' | 'isClosed' | 'reload'>,
    hostUrl: string,
  ) {
    this.hostUrl = normalizeHostUrl(hostUrl);
  }

  async reload(hostUrl: string): Promise<void> {
    if (this.page.isClosed()) {
      throw new Error(
        'The controlled development browser was closed. Restart pnpm dev or use --no-open.',
      );
    }
    const nextHostUrl = normalizeHostUrl(hostUrl);
    if (nextHostUrl === this.hostUrl) {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      return;
    }
    await this.page.goto(nextHostUrl, { waitUntil: 'domcontentloaded' });
    this.hostUrl = nextHostUrl;
  }

  close(): Promise<void> {
    this.closePromise ??= (async () => {
      try {
        await this.context.close();
      } finally {
        await this.browser.close();
      }
    })();
    return this.closePromise;
  }
}

const launchControlledBrowser = async (
  input: DevelopmentBrowserLaunchInput,
): Promise<Browser> => {
  if (input.executablePath?.trim()) {
    return chromium.launch({
      executablePath: input.executablePath.trim(),
      headless: input.headless ?? false,
    });
  }

  const channels = input.channel?.trim()
    ? [input.channel.trim()]
    : ['chrome', 'msedge'];
  const failures: unknown[] = [];
  for (const channel of channels) {
    try {
      return await chromium.launch({
        channel,
        headless: input.headless ?? false,
      });
    } catch (error) {
      failures.push(error);
    }
  }
  throw new AggregateError(
    failures,
    'Unable to launch a controlled Chrome or Edge development browser. '
      + 'Install one of those browsers, set AUTOBYTEUS_DEVELOPMENT_BROWSER_EXECUTABLE, '
      + 'or run pnpm dev -- --no-open.',
  );
};

export const openDevelopmentBrowserSession = async (
  url: string,
  input: DevelopmentBrowserLaunchInput = {},
): Promise<DevelopmentBrowserSession> => {
  const browser = await launchControlledBrowser({
    executablePath:
      input.executablePath ?? process.env.AUTOBYTEUS_DEVELOPMENT_BROWSER_EXECUTABLE,
    channel: input.channel ?? process.env.AUTOBYTEUS_DEVELOPMENT_BROWSER_CHANNEL,
    headless: input.headless,
  });
  try {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(normalizeHostUrl(url), { waitUntil: 'domcontentloaded' });
      return new PlaywrightDevelopmentBrowserSession(browser, context, page, url);
    } catch (error) {
      await context.close();
      throw error;
    }
  } catch (error) {
    await browser.close();
    throw error;
  }
};
