# Release Notes

- Restores Windows desktop release packaging by removing generated validation artifacts that blocked Windows checkout.
- Adds a repository artifact-hygiene guard so raw Xcode result bundles and checkout-hostile generated evidence cannot break future desktop release builds.
