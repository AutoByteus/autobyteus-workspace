import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient'
import { GET_TOOLS, GET_TOOLS_GROUPED_BY_CATEGORY } from '~/graphql/queries/toolQueries';
import { GET_MCP_SERVERS, PREVIEW_MCP_SERVER_TOOLS } from '~/graphql/queries/mcpServerQueries';
import { 
  CONFIGURE_MCP_SERVER, 
  DELETE_MCP_SERVER,
  DISCOVER_AND_REGISTER_MCP_SERVER_TOOLS,
  IMPORT_MCP_SERVER_CONFIGS
} from '~/graphql/mutations/mcpServerMutations';
import { RELOAD_TOOL_SCHEMA } from '~/graphql/mutations/toolMutations';
import type {
  GetToolsQuery,
  GetToolsQueryVariables,
  GetToolsGroupedByCategoryQuery,
  GetToolsGroupedByCategoryQueryVariables,
  GetMcpServersQuery,
  PreviewMcpServerToolsQuery,
  PreviewMcpServerToolsQueryVariables,
  ReloadToolSchemaMutation,
  ReloadToolSchemaMutationVariables,
} from '~/generated/graphql';

// --- Interfaces ---

export interface ToolParameter {
  name: string;
  paramType: string;
  description: string;
  required: boolean;
  defaultValue: string | null;
  enumValues: string[] | null;
}

export interface Tool {
  name: string;
  description: string;
  origin: 'LOCAL' | 'MCP';
  category: string;
  argumentSchema: {
    parameters: ToolParameter[];
  } | null;
}

export interface ToolCategoryGroup {
  categoryName: string;
  tools: Tool[];
}

export interface McpServer {
  __typename: 'StdioMcpServerConfig' | 'StreamableHttpMcpServerConfig';
  serverId: string;
  transportType: 'STDIO' | 'STREAMABLE_HTTP';
  enabled: boolean;
  toolNamePrefix: string;
  // Stdio
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  // HTTP
  url?: string;
  token?: string;
  headers?: Record<string, string>;
}

interface PreviewResult {
  tools: Tool[];
  isError: boolean;
  message: string;
}

interface ToolManagementState {
  localTools: Tool[];
  localToolsByCategory: ToolCategoryGroup[];
  mcpServers: McpServer[];
  toolsByServerId: Record<string, Tool[]>;
  loading: boolean;
  error: any;
  previewResult: PreviewResult | null;
}

export const useToolManagementStore = defineStore('toolManagement', {
  state: (): ToolManagementState => ({
    localTools: [],
    localToolsByCategory: [],
    mcpServers: [],
    toolsByServerId: {},
    loading: false,
    error: null,
    previewResult: null,
  }),

  getters: {
    getLocalTools: (state): Tool[] => state.localTools,
    getLocalToolsByCategory: (state): ToolCategoryGroup[] => state.localToolsByCategory,
    getMcpServers: (state): McpServer[] => state.mcpServers,
    getLoading: (state): boolean => state.loading,
    getError: (state): any => state.error,
    getPreviewResult: (state): PreviewResult | null => state.previewResult,

    // Getter that accepts an argument
    getToolsForServer: (state) => {
      return (serverId: string): Tool[] => state.toolsByServerId[serverId] || [];
    },
  },

  actions: {
    async fetchLocalTools() {
      // This now delegates to the grouped fetcher to ensure data consistency
      return this.fetchLocalToolsGroupedByCategory();
    },

    async fetchLocalToolsGroupedByCategory() {
      this.loading = true;
      this.error = null;
      try {
        const client = getApolloClient()
        const { data, errors } = await client.query<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables>({
          query: GET_TOOLS_GROUPED_BY_CATEGORY,
          variables: { origin: 'LOCAL' },
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        const groups = (data?.toolsGroupedByCategory ?? []) as ToolCategoryGroup[];
        this.localToolsByCategory = groups;
        this.localTools = groups.flatMap(group => group.tools);
      } catch (e) {
        this.error = e;
        console.error("Failed to fetch grouped local tools:", e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async fetchMcpServers() {
      this.loading = true;
      this.error = null;
      try {
        const client = getApolloClient()
        const { data, errors } = await client.query<GetMcpServersQuery>({
          query: GET_MCP_SERVERS,
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        const servers = (data?.mcpServers ?? []) as McpServer[];
        this.mcpServers = servers;
      } catch (e) {
        this.error = e;
        console.error("Failed to fetch MCP servers:", e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async fetchToolsForServer(serverId: string) {
      this.loading = true;
      this.error = null;
      try {
        const client = getApolloClient()
        const { data, errors } = await client.query<GetToolsQuery, GetToolsQueryVariables>({
          query: GET_TOOLS,
          variables: { sourceServerId: serverId },
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        const tools = (data?.tools ?? []) as Tool[];
        // Use Vue's $patch for reactive updates to nested properties
        this.$patch(state => {
          state.toolsByServerId[serverId] = tools;
        });
      } catch (e) {
        this.error = e;
        console.error(`Failed to fetch tools for server ${serverId}:`, e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
    
    async previewMcpServer(input: any) {
        this.loading = true;
        this.previewResult = null;
        this.error = null;
        try {
            const client = getApolloClient()
            const { data, errors } = await client.query<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables>({
                query: PREVIEW_MCP_SERVER_TOOLS,
                variables: { input },
                fetchPolicy: 'network-only',
            });

            if (errors && errors.length > 0) {
                const message = errors.map(e => e.message).join(', ');
                throw new Error(message);
            }

            this.previewResult = {
                tools: (data?.previewMcpServerTools ?? []) as Tool[],
                isError: false,
                message: ''
            };
        } catch(e) {
            this.error = e;
            const graphQlMessage = (e as any)?.graphQLErrors?.[0]?.message;
            this.previewResult = {
                tools: [],
                isError: true,
                message: graphQlMessage || (e instanceof Error ? e.message : 'An unknown error occurred.')
            };
            throw e;
        } finally {
            this.loading = false;
        }
    },
    
    async configureMcpServer(input: any) {
        this.loading = true;
        this.error = null;
        try {
            const client = getApolloClient()
            const { data, errors } = await client.mutate({
                mutation: CONFIGURE_MCP_SERVER,
                variables: { input },
            });

            if (errors && errors.length > 0) {
                throw new Error(errors.map(e => e.message).join(', '));
            }

            if (data?.configureMcpServer) {
                await this.fetchMcpServers();
                // We no longer expect discovered_tools here
                return data.configureMcpServer;
            }
            throw new Error('Failed to configure MCP server: No data returned');
        } catch (e) {
            this.error = e;
            throw e;
        } finally {
            this.loading = false;
        }
    },

    async deleteMcpServer(serverId: string) {
      this.loading = true;
      this.error = null;
      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate({
          mutation: DELETE_MCP_SERVER,
          variables: { serverId },
        });
        
        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }
        
        if (data?.deleteMcpServer) {
          if (data.deleteMcpServer.success) {
            await this.fetchMcpServers();
          }
          return data.deleteMcpServer;
        }
        throw new Error('Failed to delete MCP server: No data returned');
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async discoverAndRegisterMcpServerTools(serverId: string) {
      this.loading = true;
      this.error = null;
      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate({
          mutation: DISCOVER_AND_REGISTER_MCP_SERVER_TOOLS,
          variables: { serverId },
        });
        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }
        if (data?.discoverAndRegisterMcpServerTools) {
          if (data.discoverAndRegisterMcpServerTools.success) {
            // On success, refresh the tools for this server
            await this.fetchToolsForServer(serverId);
          }
          // Return the full result so the UI can show messages
          return data.discoverAndRegisterMcpServerTools;
        }
        throw new Error('Failed to discover tools: No data returned');
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async importMcpServerConfigs(jsonString: string) {
      this.loading = true;
      this.error = null;
      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate({
          mutation: IMPORT_MCP_SERVER_CONFIGS,
          variables: { jsonString },
        });
        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }
        if (data?.importMcpServerConfigs) {
          // Refresh the list of servers if at least one was successfully imported.
          if (data.importMcpServerConfigs.imported_count > 0) {
            await this.fetchMcpServers();
          }
          return data.importMcpServerConfigs;
        }
        throw new Error('Failed to import configs: No data returned');
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.loading = false;
      }
    },
    
    async reloadToolSchema(toolName: string) {
      this.loading = true;
      this.error = null;
      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate<ReloadToolSchemaMutation, ReloadToolSchemaMutationVariables>({
          mutation: RELOAD_TOOL_SCHEMA,
          variables: { name: toolName },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }
        
        const result = data?.reloadToolSchema;
        if (!result) {
          throw new Error("No response from server on schema reload.");
        }

        if (result.success && result.tool) {
          const updatedTool = result.tool as Tool;
          
          // 1. Update in localTools (flat list) using immutable pattern
          const localToolIndex = this.localTools.findIndex(t => t.name === toolName);
          if (localToolIndex !== -1) {
            const newLocalTools = [...this.localTools];
            newLocalTools[localToolIndex] = updatedTool;
            this.localTools = newLocalTools;
          }

          // 2. Update in localToolsByCategory (grouped list) using immutable pattern
          this.localToolsByCategory = this.localToolsByCategory.map(group => {
            const toolIndex = group.tools.findIndex(t => t.name === toolName);
            if (toolIndex !== -1) {
              const newTools = [...group.tools];
              newTools[toolIndex] = updatedTool;
              return { ...group, tools: newTools };
            }
            return group;
          });
          
          // 3. Update in toolsByServerId (for MCP tools) using immutable pattern
          for (const serverId in this.toolsByServerId) {
            const tools = this.toolsByServerId[serverId];
            const toolIndex = tools.findIndex(t => t.name === toolName);
            if (toolIndex !== -1) {
              const newTools = [...tools];
              newTools[toolIndex] = updatedTool;
              this.toolsByServerId[serverId] = newTools;
              break;
            }
          }
        }
        
        return {
          success: result.success,
          message: result.message,
          tool: result.tool as Tool | null,
        };

      } catch (e) {
        this.error = e;
        console.error(`Failed to reload schema for tool ${toolName}:`, e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },
    
    clearPreviewResult() {
        this.previewResult = null;
    }
  },
});
