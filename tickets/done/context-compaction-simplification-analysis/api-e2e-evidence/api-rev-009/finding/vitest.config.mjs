export default {
 test: { environment: 'node', include: [new URL('./reconnect-identity.probe.test.ts', import.meta.url).pathname] },
 resolve: { alias: { '~': new URL('../../../../../../autobyteus-web/', import.meta.url).pathname } }
}
