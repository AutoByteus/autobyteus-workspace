# API-18 Docker before/after comparison (compare.mjs over the Docker-profile harness results; servers the image can start or reach: server-filesystem v1/v2 via node, instrument HTTP servers via host.docker.internal; no uv in the image); 2026-10-20T09:23:18Z
# before = http://127.0.0.1:48170 (before), after = http://127.0.0.1:48180 (after); side-specific markers, folders and ports are normalized (<SIDE>, <side>, <port>) before comparing

## Servers: preview and discover (API-10)

| Server | Preview before | Preview after | Discover before | Discover after | stdio starts per preview b/a | Preview ms b/a | Discover ms b/a | Same? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fs_v1 | 14 tools | 14 tools | 14 tools | 14 tools | —/— | 345/458 | 274/259 | Same |
| fs_v2 | 14 tools | 14 tools | 14 tools | 14 tools | —/— | 190/240 | 186/173 | Same |
| token_http | 2 tools | 2 tools | 2 tools | 2 tools | —/— | 72/74 | 17/17 | Same |
| same_origin_redirect_http | 2 tools | 2 tools | 2 tools | 2 tools | —/— | 26/37 | 25/25 | Same |
| paging_http | 2 tools | 4 tools | 2 tools | 4 tools | —/— | 21/27 | 14/15 | Different |
| unauthorized_http | Error: Streamable HTTP error: Error POSTing to endpoint: unauthorized-parity | SdkHttpError: Error POSTing to endpoint: unauthorized-parity | Error: Streamable HTTP error: Error POSTing to endpoint: unauthorized-parity | SdkHttpError: Error POSTing to endpoint: unauthorized-parity | —/— | 10/9 | 6/6 | Different |
| cross_origin_redirect_http | Error: Streamable HTTP error: Error POSTing to endpoint: Redirect to http://host.docker.internal:47313/mcp not followed (redirectPolicy: 'same-origin') | SdkHttpError: Error POSTing to endpoint: Redirect to http://host.docker.internal:47413/mcp not followed; use that URL as the endpoint if it is the intended server (redirectPolicy: 'same-origin') | Error: Streamable HTTP error: Error POSTing to endpoint: Redirect to http://host.docker.internal:47313/mcp not followed (redirectPolicy: 'same-origin') | SdkHttpError: Error POSTing to endpoint: Redirect to http://host.docker.internal:47413/mcp not followed; use that URL as the endpoint if it is the intended server (redirectPolicy: 'same-origin') | —/— | 10/10 | 8/6 | Different |
| exit_at_start | McpError: MCP error -32000: Connection closed | SdkError: Connection closed | McpError: MCP error -32000: Connection closed | SdkError: Connection closed | —/— | 32/23 | 25/21 | Different |

- stdio starts in total (preview + discover): before {"python_fixture":0,"fs_v1":0,"fs_v2":0}, after {"python_fixture":0,"fs_v1":0,"fs_v2":0}
- requests that reached the other origin of the cross-origin redirect: before 0, after 0
- app responsiveness during the hang-at-start preview: before undefined, after undefined
- bulk import: before {"success":true,"message":"Import complete. Imported: 8, Failed: 0","importedCount":8,"failedCount":0}, after {"success":true,"message":"Import complete. Imported: 8, Failed: 0","importedCount":8,"failedCount":0}
- HTTP requests seen by the instrument during preview of token_http:
  - before: token POST initialize pv=- auth=expected path=/mcp ; token POST notifications/initialized pv=2025-11-25 auth=expected path=/mcp ; token GET - pv=2025-11-25 auth=expected path=/mcp ; token POST tools/list pv=2025-11-25 auth=expected path=/mcp
  - after:  token POST initialize pv=- auth=expected path=/mcp ; token POST notifications/initialized pv=2025-11-25 auth=expected path=/mcp ; token GET - pv=2025-11-25 auth=expected path=/mcp ; token POST tools/list pv=2025-11-25 auth=expected path=/mcp
- HTTP requests seen by the instrument during preview of same_origin_redirect_http:
  - before: token POST initialize pv=- auth=expected path=/mcp-old ; token POST initialize pv=- auth=expected path=/mcp ; token POST notifications/initialized pv=2025-11-25 auth=expected path=/mcp-old ; token POST notifications/initialized pv=2025-11-25 auth=expected path=/mcp ; token GET - pv=2025-11-25 auth=expected path=/mcp-old ; token POST tools/list pv=2025-11-25 auth=expected path=/mcp-old ; token GET - pv=2025-11-25 auth=expected path=/mcp ; token POST tools/list pv=2025-11-25 auth=expected path=/mcp
  - after:  token POST initialize pv=- auth=expected path=/mcp-old ; token POST initialize pv=- auth=expected path=/mcp ; token POST notifications/initialized pv=2025-11-25 auth=expected path=/mcp-old ; token POST notifications/initialized pv=2025-11-25 auth=expected path=/mcp ; token GET - pv=2025-11-25 auth=expected path=/mcp-old ; token POST tools/list pv=2025-11-25 auth=expected path=/mcp-old ; token GET - pv=2025-11-25 auth=expected path=/mcp ; token POST tools/list pv=2025-11-25 auth=expected path=/mcp
- HTTP requests seen by the instrument during preview of paging_http:
  - before: paging POST initialize pv=- auth=none path=/mcp ; paging POST notifications/initialized pv=2025-11-25 auth=none path=/mcp ; paging GET - pv=2025-11-25 auth=none path=/mcp ; paging POST tools/list pv=2025-11-25 auth=none path=/mcp
  - after:  paging POST initialize pv=- auth=none path=/mcp ; paging POST notifications/initialized pv=2025-11-25 auth=none path=/mcp ; paging GET - pv=2025-11-25 auth=none path=/mcp ; paging POST tools/list pv=2025-11-25 auth=none path=/mcp ; paging POST tools/list pv=2025-11-25 auth=none path=/mcp

## /mcp/gateway (API-11)

### client v1_1_32_1
- tools listed: before 34, after 36; only after: paging_page_two_a, paging_page_two_b; only before: none
- negotiated: before null (null), after null (null); errors: none / none
- first requests before: POST initialize pv=- -> 200 ; POST notifications/initialized pv=2025-03-26 -> 202 ; GET - pv=2025-03-26 -> 200 ; POST tools/list pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200
- first requests after:  POST initialize pv=- -> 200 ; POST notifications/initialized pv=2025-03-26 -> 202 ; GET - pv=2025-03-26 -> 200 ; POST tools/list pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200
| Tool call | Before | After | ms b/a | Same? |
| --- | --- | --- | --- | --- |
| parity_http_auth_probe | MARKER-PARITY-HTTP-<SIDE> | MARKER-PARITY-HTTP-<SIDE> | 13/13 | Same |
| moved_http_auth_probe | MARKER-PARITY-HTTP-<SIDE> | MARKER-PARITY-HTTP-<SIDE> | 23/20 | Same |
| video_editing_get_media_duration | not registered | not registered | —/— | Same |
| fsv1_read_text_file | hello from the parity fsroot\n + structured | hello from the parity fsroot\n + structured | 292/269 | Same |
| fsv2_read_text_file | hello from the parity fsroot\n + structured | hello from the parity fsroot\n + structured | 209/178 | Same |
| fsv2_list_allowed_directories | Allowed directories:\n/tmp/mcp182/servers/fsroot + structured | Allowed directories:\n/tmp/mcp182/servers/fsroot + structured | 5/6 | Same |
| pyfix_echo | not registered | not registered | —/— | Same |
| pyfix_add | not registered | not registered | —/— | Same |
| pyfix_fail | not registered | not registered | —/— | Same |
| pyfix_report_env_and_cwd | not registered | not registered | —/— | Same |

### client v2_default
- tools listed: before 34, after 36; only after: paging_page_two_a, paging_page_two_b; only before: none
- negotiated: before 2025-03-26 (legacy), after 2025-03-26 (legacy); errors: none / none
- first requests before: POST initialize pv=- -> 200 ; POST notifications/initialized pv=2025-03-26 -> 202 ; GET - pv=2025-03-26 -> 200 ; POST tools/list pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200
- first requests after:  POST initialize pv=- -> 200 ; POST notifications/initialized pv=2025-03-26 -> 202 ; GET - pv=2025-03-26 -> 200 ; POST tools/list pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200
| Tool call | Before | After | ms b/a | Same? |
| --- | --- | --- | --- | --- |
| parity_http_auth_probe | MARKER-PARITY-HTTP-<SIDE> | MARKER-PARITY-HTTP-<SIDE> | 8/7 | Same |
| moved_http_auth_probe | MARKER-PARITY-HTTP-<SIDE> | MARKER-PARITY-HTTP-<SIDE> | 6/6 | Same |
| video_editing_get_media_duration | not registered | not registered | —/— | Same |
| fsv1_read_text_file | hello from the parity fsroot\n + structured | hello from the parity fsroot\n + structured | 4/6 | Same |
| fsv2_read_text_file | hello from the parity fsroot\n + structured | hello from the parity fsroot\n + structured | 6/6 | Same |
| fsv2_list_allowed_directories | Allowed directories:\n/tmp/mcp182/servers/fsroot + structured | Allowed directories:\n/tmp/mcp182/servers/fsroot + structured | 5/4 | Same |
| pyfix_echo | not registered | not registered | —/— | Same |
| pyfix_add | not registered | not registered | —/— | Same |
| pyfix_fail | not registered | not registered | —/— | Same |
| pyfix_report_env_and_cwd | not registered | not registered | —/— | Same |

### client v2_auto
- tools listed: before 34, after 36; only after: paging_page_two_a, paging_page_two_b; only before: none
- negotiated: before 2025-03-26 (legacy), after 2025-03-26 (legacy); errors: none / none
- first requests before: POST server/discover pv=2026-07-28 -> 400 ; POST initialize pv=- -> 200 ; POST notifications/initialized pv=2025-03-26 -> 202 ; GET - pv=2025-03-26 -> 200 ; POST tools/list pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200
- first requests after:  POST server/discover pv=2026-07-28 -> 400 ; POST initialize pv=- -> 200 ; POST notifications/initialized pv=2025-03-26 -> 202 ; GET - pv=2025-03-26 -> 200 ; POST tools/list pv=2025-03-26 -> 200 ; POST tools/call pv=2025-03-26 -> 200
| Tool call | Before | After | ms b/a | Same? |
| --- | --- | --- | --- | --- |
| parity_http_auth_probe | MARKER-PARITY-HTTP-<SIDE> | MARKER-PARITY-HTTP-<SIDE> | 4/7 | Same |
| moved_http_auth_probe | MARKER-PARITY-HTTP-<SIDE> | MARKER-PARITY-HTTP-<SIDE> | 7/8 | Same |
| video_editing_get_media_duration | not registered | not registered | —/— | Same |
| fsv1_read_text_file | hello from the parity fsroot\n + structured | hello from the parity fsroot\n + structured | 3/5 | Same |
| fsv2_read_text_file | hello from the parity fsroot\n + structured | hello from the parity fsroot\n + structured | 6/6 | Same |
| fsv2_list_allowed_directories | Allowed directories:\n/tmp/mcp182/servers/fsroot + structured | Allowed directories:\n/tmp/mcp182/servers/fsroot + structured | 4/5 | Same |
| pyfix_echo | not registered | not registered | —/— | Same |
| pyfix_add | not registered | not registered | —/— | Same |
| pyfix_fail | not registered | not registered | —/— | Same |
| pyfix_report_env_and_cwd | not registered | not registered | —/— | Same |

