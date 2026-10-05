export declare const APPLICATION_AGENT_TOOL_NAME_PATTERN: RegExp;
export type ApplicationAgentToolPrimitiveSchema = Readonly<{
    type: "string" | "integer" | "number" | "boolean";
    description?: string;
    enum?: readonly string[];
    pattern?: string;
    minimum?: number;
    maximum?: number;
}>;
export type ApplicationAgentToolObjectSchema = Readonly<{
    type: "object";
    description?: string;
    properties: Readonly<Record<string, ApplicationAgentToolPropertySchema>>;
    required: readonly string[];
}>;
export type ApplicationAgentToolArraySchema = Readonly<{
    type: "array";
    description?: string;
    items: ApplicationAgentToolPropertySchema;
}>;
export type ApplicationAgentToolPropertySchema = ApplicationAgentToolPrimitiveSchema | ApplicationAgentToolObjectSchema | ApplicationAgentToolArraySchema;
export type ApplicationAgentToolInputSchema = Readonly<{
    type: "object";
    properties: Readonly<Record<string, ApplicationAgentToolPropertySchema>>;
    required: readonly string[];
}>;
export type ApplicationAgentToolDeclaration = Readonly<{
    name: string;
    description: string;
    inputSchema: ApplicationAgentToolInputSchema;
}>;
export type ApplicationAgentToolCaller = Readonly<{
    applicationId: string;
    bindingId: string;
    agentRunId: string;
    memberAddress?: string;
}>;
export type ApplicationAgentToolTextContent = Readonly<{
    type: "text";
    text: string;
}>;
export type ApplicationAgentToolBinaryContent = Readonly<{
    type: "image" | "audio";
    data: string;
    mimeType: string;
}>;
export type ApplicationAgentToolEmbeddedResourceContent = Readonly<{
    type: "resource";
    resource: Readonly<{
        uri: string;
        mimeType?: string;
        text: string;
    }> | Readonly<{
        uri: string;
        mimeType?: string;
        blob: string;
    }>;
}>;
export type ApplicationAgentToolResourceLinkContent = Readonly<{
    type: "resource_link";
    name: string;
    uri: string;
    description?: string;
    mimeType?: string;
    size?: number;
}>;
export type ApplicationAgentToolContent = ApplicationAgentToolTextContent | ApplicationAgentToolBinaryContent | ApplicationAgentToolEmbeddedResourceContent | ApplicationAgentToolResourceLinkContent;
export type ApplicationAgentToolResult = Readonly<{
    content: readonly ApplicationAgentToolContent[];
    structuredContent?: Readonly<Record<string, unknown>>;
    isError?: boolean;
}>;
export type ApplicationAgentToolHandlerContext = Readonly<{
    caller: ApplicationAgentToolCaller;
}>;
export declare class ApplicationAgentToolDeclarationParseError extends Error {
    constructor(message: string);
}
export declare const parseApplicationAgentToolInputSchema: (value: unknown, fieldName?: string) => ApplicationAgentToolInputSchema;
export declare const parseApplicationAgentToolDeclarations: (value: unknown, fieldName?: string) => readonly ApplicationAgentToolDeclaration[];
//# sourceMappingURL=application-agent-tools.d.ts.map