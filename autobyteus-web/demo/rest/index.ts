/** The demo node's REST answers (autobyteus-279), by method and path. */
import type { DemoWorld } from '../world/DemoWorld';

export type DemoRestRoute = {
  method: 'GET' | 'POST';
  match(url: URL): boolean;
  answer(url: URL, request: Request, world: DemoWorld): Response | Promise<Response>;
};

export const demoRestRoutes: DemoRestRoute[] = [];
