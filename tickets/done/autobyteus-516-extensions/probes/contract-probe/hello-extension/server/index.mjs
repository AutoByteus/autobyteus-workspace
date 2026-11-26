export default {
  async install(ctx) { ctx.progress({ message: 'Nothing to download', percent: 100 }); },
  async status() { return { ready: true, message: 'Ready' }; },
  async stop() {},
  actions: { async hello() { return { hello: 'world' }; } },
};
