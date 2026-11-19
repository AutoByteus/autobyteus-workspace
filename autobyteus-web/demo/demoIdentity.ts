/**
 * The demo node's identity (autobyteus-279): an origin no network resolves, the name the phone shows, and the session
 * token only the demo node accepts. None of it is a node credential; nothing here reaches a real node.
 */
export const DEMO_ORIGIN = 'https://demo.autobyteus.invalid';
export const DEMO_NODE_NAME = 'Demo';
/** A non-secret token: the demo session's credential, accepted by the demo node only. */
export const DEMO_SESSION_TOKEN = 'demo-session';
export const DEMO_DEVICE_ID = 'demo-device';
/** The demo node's id, as `/rest/remote-access/status` reports a node's. */
export const DEMO_NODE_ID = 'demo-node';
