export default {
  async install(ctx) { ctx.log('install: nothing to download') },
  async status() { throw new Error('the status probe of Broken Status failed on purpose') },
  async stop() {},
  actions: {},
}
