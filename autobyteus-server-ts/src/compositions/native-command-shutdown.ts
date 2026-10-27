import { NativeCommandProcessScope } from 'autobyteus-ts';
import type { FastifyInstance } from 'fastify';
/** Shared early drain and late aggregate; native failure never skips host cleanup. */
export class NativeCommandShutdown {
  readonly scope = new NativeCommandProcessScope();
  private completion?: Promise<void>;
  install(app: FastifyInstance): void {
    app.addHook('preClose', async () => { await this.scope.close(); });
  }
  close(cleanup: () => Promise<void>): Promise<void> {
    return this.completion ??= (async () => {
      const errors: unknown[] = [];
      try {
        const report = await this.scope.close();
        for (const result of report.outcomes) if (result.outcome === 'unconfirmed') errors.push(new Error(result.reason));
      } catch (error) { errors.push(error); }
      try { await cleanup(); } catch (error) { errors.push(error); }
      if (errors.length) throw new AggregateError(errors, 'Host shutdown incomplete');
    })();
  }
}
