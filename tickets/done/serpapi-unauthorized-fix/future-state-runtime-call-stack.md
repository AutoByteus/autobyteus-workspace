# Future-State Runtime Call Stack - SerpApi Unauthorized Fix

## Use Cases

### UC-1: User configures SerpApi key in the web settings
**Requirement ID**: `R-001`
**Source Type**: `Requirement`

- `autobyteus-server-ts/src/api/graphql/types/server-settings.ts:ServerSettingsResolver.setSearchConfig(...)`
  - `autobyteus-server-ts/src/config/app-config.ts:AppConfig.set("SERPAPI_API_KEY", "new-key")`
    - Updates `process.env.SERPAPI_API_KEY = "new-key"`
    - Updates `.env` file

### UC-2: Agent executes `search_web` tool after key update
**Requirement ID**: `R-001`, `R-002`
**Source Type**: `Requirement`

- `autobyteus-ts/src/tools/search-tool.ts:Search.constructor(...)`
  - `autobyteus-ts/src/tools/search/factory.ts:SearchClientFactory.createSearchClient()`
    - (New behavior: Does NOT use cached `this.client`)
    - Reads `process.env.SERPAPI_API_KEY` (returns "new-key")
    - Reads `process.env.DEFAULT_SEARCH_PROVIDER` (returns "serpapi")
    - `new SerpApiSearchStrategy()`
      - Constructor reads `process.env.SERPAPI_API_KEY` (gets "new-key")
    - `new SearchClient(strategy)`
- `autobyteus-ts/src/tools/base-tool.ts:Search.execute(...)`
  - `autobyteus-ts/src/tools/search-tool.ts:Search._execute(...)`
    - `autobyteus-ts/src/tools/search/client.ts:SearchClient.search(...)`
      - `autobyteus-ts/src/tools/search/serpapi-strategy.ts:SerpApiSearchStrategy.search(...)`
        - Uses `this.apiKey` (which is "new-key")
        - Makes HTTP GET to `https://serpapi.com/search.json?api_key=new-key&...`
        - Returns results (Success)

### UC-3: Provider change propagation (e.g. switch to Serper)
**Requirement ID**: `R-002`
**Source Type**: `Requirement`

- `autobyteus-server-ts/src/api/graphql/types/server-settings.ts:ServerSettingsResolver.setSearchConfig(provider="serper", ...)`
  - `autobyteus-server-ts/src/config/app-config.ts:AppConfig.set("DEFAULT_SEARCH_PROVIDER", "serper")`
- `autobyteus-ts/src/tools/search-tool.ts:Search.constructor(...)`
  - `autobyteus-ts/src/tools/search/factory.ts:SearchClientFactory.createSearchClient()`
    - (New behavior: Does NOT use cached `this.client`)
    - Reads `process.env.DEFAULT_SEARCH_PROVIDER` (returns "serper")
    - `new SerperSearchStrategy()`
    - `new SearchClient(strategy)`
- `autobyteus-ts/src/tools/base-tool.ts:Search.execute(...)`
  - (Continues with Serper search)
