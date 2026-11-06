import { STARTER_SOCKET_ENV } from "../node-update/starter-client.js";

/**
 * Where this node's node desktop listens: Xvnc display :99, RFB on 127.0.0.1:5900 in the
 * server's own network namespace.
 */
export type NodeDesktopTarget = Readonly<{ host: string; port: number }>;

const DOCKER_NODE_DESKTOP: NodeDesktopTarget = Object.freeze({ host: "127.0.0.1", port: 5900 });

/**
 * The one rule for "this node has a node desktop": a server run by the Docker starter (C4 puts
 * AUTOBYTEUS_STARTER_SOCKET into its environment) is a Docker node, and every Docker node image
 * runs Xvnc there. An embedded or development server has no starter and no node desktop.
 */
export const resolveNodeDesktop = (env: NodeJS.ProcessEnv): NodeDesktopTarget | null =>
  env[STARTER_SOCKET_ENV] ? DOCKER_NODE_DESKTOP : null;
