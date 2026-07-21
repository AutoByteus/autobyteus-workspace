// Default tests are deliberately credential-free. Real-provider execution uses
// the tracked live-E2E manifest and the separate read-only Local Store.
process.env.APP_ENV = 'test';
