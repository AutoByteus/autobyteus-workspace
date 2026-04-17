# Release Notes

- Fixed release packaging so desktop and server build pipelines correctly resolve shared workspace packages used by bundled runtime components.
- Fixed Windows desktop packaging for scoped workspace dependencies required by the bundled server.
- Fixed server Docker packaging to include the shared application SDK artifacts required by the bundled server runtime.
