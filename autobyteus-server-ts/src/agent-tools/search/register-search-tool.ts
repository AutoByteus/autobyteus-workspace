import { Search } from 'autobyteus-ts';
import { ToolDefinition } from 'autobyteus-ts/tools/registry/tool-definition.js';
import { defaultToolRegistry } from 'autobyteus-ts/tools/registry/tool-registry.js';
import { ToolOrigin } from 'autobyteus-ts/tools/tool-origin.js';
import { getSearchProvisioningService } from './search-provisioning-service.js';

export const registerProvisionedSearchTool = (): void => {
  defaultToolRegistry.registerTool(new ToolDefinition(
    Search.getName(),
    Search.getDescription(),
    ToolOrigin.LOCAL,
    Search.CATEGORY,
    () => Search.getArgumentSchema(),
    () => Search.getConfigSchema(),
    {
      customFactory: (config) => new Search(config, getSearchProvisioningService()),
      descriptionProvider: () => Search.getDescription(),
    },
  ));
};
