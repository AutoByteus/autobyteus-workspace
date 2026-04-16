## Improvements
- Settings → Application Packages now hides empty platform-owned built-in sources and labels non-empty built-ins as `Platform Applications` instead of exposing raw internal filesystem paths by default.
- Application package rows now distinguish platform-owned, linked local, and GitHub-imported sources more clearly, with raw/internal package-location data moved behind explicit details.
- Agent and Agent Team definition editors now use the shared launch-preferences runtime/model/config UX for optional preferred launch settings.

## Fixes
- Team definitions, including application-owned teams, now persist their own `defaultLaunchConfig` and use those team-owned defaults when preparing direct launches and team-targeted application launches.
- Team-targeted application launches no longer synthesize global launch defaults by aggregating leaf agent defaults upward.
