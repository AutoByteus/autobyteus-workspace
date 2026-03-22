import type { TerminalSession, TerminalSessionFactory } from './terminal-session.js';

export type SessionStartupAttempt = {
  backendName: string;
  error: unknown;
};

export type SessionStartupResult = {
  session: TerminalSession;
  selectedFactory: TerminalSessionFactory;
  attempts: SessionStartupAttempt[];
};

type StartTerminalSessionOptions = {
  sessionId: string;
  cwd: string;
  primaryFactory: TerminalSessionFactory;
  fallbackFactories?: TerminalSessionFactory[];
};

const backendNameOf = (factory: TerminalSessionFactory): string =>
  factory.name || 'UnknownSessionBackend';

const uniqueFactories = (factories: TerminalSessionFactory[]): TerminalSessionFactory[] => {
  const unique: TerminalSessionFactory[] = [];
  for (const factory of factories) {
    if (!unique.includes(factory)) {
      unique.push(factory);
    }
  }
  return unique;
};

const safeClose = async (session: TerminalSession): Promise<void> => {
  try {
    await session.close();
  } catch {
    // Ignore cleanup errors while recovering startup failures.
  }
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export async function startTerminalSessionWithFallback(
  options: StartTerminalSessionOptions,
): Promise<SessionStartupResult> {
  const candidates = uniqueFactories([
    options.primaryFactory,
    ...(options.fallbackFactories ?? []),
  ]);
  const attempts: SessionStartupAttempt[] = [];

  for (const factory of candidates) {
    const session = new factory(options.sessionId);
    try {
      await session.start(options.cwd);
      if (!session.isAlive) {
        throw new Error(
          `Session backend '${backendNameOf(factory)}' exited during startup.`,
        );
      }
      return {
        session,
        selectedFactory: factory,
        attempts,
      };
    } catch (error) {
      attempts.push({
        backendName: backendNameOf(factory),
        error,
      });
      await safeClose(session);
    }
  }

  if (attempts.length === 1) {
    const onlyError = attempts[0]?.error;
    if (onlyError instanceof Error) {
      throw onlyError;
    }
    throw new Error(toErrorMessage(onlyError));
  }

  const summary = attempts
    .map(({ backendName, error }) => `${backendName}: ${toErrorMessage(error)}`)
    .join(' | ');
  throw new Error(`Failed to start terminal session. ${summary}`);
}
