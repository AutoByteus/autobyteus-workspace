import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Agent } from '../../agent/agent.js';
import { AgentInputUserMessage } from '../../agent/message/agent-input-user-message.js';
import { AgentEventStream } from '../../agent/streaming/streams/agent-event-stream.js';
import { InteractiveCliDisplay, type CliWriter } from './cli-display.js';

export interface InputReader {
  readLine(prompt?: string): Promise<string>;
  close(): void;
}

class DefaultInputReader implements InputReader {
  private rl = readline.createInterface({ input, output });

  async readLine(prompt: string = ''): Promise<string> {
    return this.rl.question(prompt);
  }

  close(): void {
    this.rl.close();
  }
}

class TurnCompletionSignal {
  private resolver: (() => void) | null = null;
  private promise: Promise<void> | null = null;

  reset(): void {
    this.promise = new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  signal(): void {
    if (this.resolver) {
      this.resolver();
      this.resolver = null;
    }
  }

  async wait(timeoutMs?: number): Promise<void> {
    if (!this.promise) {
      this.reset();
    }

    if (!timeoutMs || timeoutMs <= 0) {
      await this.promise;
      return;
    }

    await Promise.race([
      this.promise,
      new Promise<void>((_resolve, reject) => {
        const handle = setTimeout(() => {
          clearTimeout(handle);
          reject(new Error('Timed out waiting for agent turn completion.'));
        }, timeoutMs);
      })
    ]);
  }
}

export async function run(
  agent: Agent,
  options: {
    showToolLogs?: boolean;
    showTokenUsage?: boolean;
    initialPrompt?: string;
    inputReader?: InputReader;
    writer?: CliWriter;
    idleTimeoutSeconds?: number;
  } = {}
): Promise<void> {
  const showToolLogs = options.showToolLogs ?? true;
  const showTokenUsage = options.showTokenUsage ?? false;
  const initialPrompt = options.initialPrompt ?? null;
  const inputReader = options.inputReader ?? new DefaultInputReader();
  const writer = options.writer;
  const promptWriter: CliWriter = writer ?? {
    write: (text: string) => {
      output.write(text);
    }
  };
  const idleTimeoutMs = Math.max(0, (options.idleTimeoutSeconds ?? 30) * 1000);

  const turnSignal = new TurnCompletionSignal();
  const display = new InteractiveCliDisplay({
    writer,
    showToolLogs,
    showTokenUsage,
    onTurnComplete: () => turnSignal.signal()
  });
  const streamer = new AgentEventStream(agent);

  const eventTask = (async () => {
    try {
      for await (const event of streamer.allEvents()) {
        await display.handleStreamEvent(event);
      }
    } catch (error) {
      console.error(`Error in CLI event processing loop: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      turnSignal.signal();
    }
  })();

  try {
    if (!agent.isRunning) {
      agent.start();
    }

    turnSignal.reset();
    try {
      await turnSignal.wait(idleTimeoutMs);
    } catch (error) {
      console.error(`Agent did not become idle within ${idleTimeoutMs / 1000} seconds. Exiting.`);
      return;
    }

    if (initialPrompt) {
      promptWriter.write(`You: ${initialPrompt}\n`);
      turnSignal.reset();
      display.resetTurnState();
      await agent.postUserMessage(new AgentInputUserMessage(initialPrompt));
      await turnSignal.wait();
    }

    while (true) {
      turnSignal.reset();

      const pendingApproval = display.getPendingApprovalData();
      if (pendingApproval) {
        const approvalPrompt = display.getApprovalPrompt();
        if (approvalPrompt) {
          const approvalInputRaw = await inputReader.readLine(approvalPrompt);
          const approvalInput = approvalInputRaw.trim().toLowerCase();

          display.clearPendingApproval();

          const isApproved = approvalInput === 'y' || approvalInput === 'yes';
          let reason = 'User approved via CLI';

          if (!isApproved) {
            const reasonInput = await inputReader.readLine('Reason (optional): ');
            reason = reasonInput.trim() || 'User denied via CLI';
          }

          await agent.postToolExecutionApproval(pendingApproval.invocation_id, isApproved, reason);
        }
      } else {
        const userInputRaw = await inputReader.readLine('You: ');
        const userInput = userInputRaw.replace(/\r?\n$/, '');
        const trimmed = userInput.trim();

        if (trimmed.toLowerCase() === '/quit' || trimmed.toLowerCase() === '/exit') {
          break;
        }
        if (!trimmed) {
          continue;
        }

        display.resetTurnState();
        await agent.postUserMessage(new AgentInputUserMessage(userInput));
      }

      await turnSignal.wait();
    }
  } catch (error) {
    console.error(`An unexpected error occurred in the CLI main loop: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (inputReader instanceof DefaultInputReader) {
      inputReader.close();
    }

    if (agent.isRunning) {
      await agent.stop();
    }

    await streamer.close();
    await eventTask;
  }
}
