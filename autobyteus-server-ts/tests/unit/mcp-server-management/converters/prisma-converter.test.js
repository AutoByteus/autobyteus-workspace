import { describe, expect, it } from "vitest";
import { StdioMcpServerConfig, StreamableHttpMcpServerConfig, McpTransportType, } from "autobyteus-ts/tools/mcp/types.js";
import { PrismaMcpServerConfigurationConverter } from "../../../../src/mcp-server-management/converters/prisma-converter.js";
const makePrismaConfig = (overrides) => {
    return {
        id: 1,
        serverId: "server",
        transportType: "stdio",
        enabled: true,
        toolNamePrefix: null,
        configDetails: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
};
describe("PrismaMcpServerConfigurationConverter", () => {
    it("converts stdio config to persistence input", () => {
        const domainObj = new StdioMcpServerConfig({
            server_id: "test-stdio-server",
            command: "node",
            args: ["run", "start"],
            cwd: "/tmp",
            env: { VAR: "value" },
            tool_name_prefix: "stdio_",
            enabled: true,
        });
        const createInput = PrismaMcpServerConfigurationConverter.toCreateInput(domainObj);
        expect(createInput.serverId).toBe("test-stdio-server");
        expect(createInput.transportType).toBe("stdio");
        expect(createInput.enabled).toBe(true);
        expect(createInput.toolNamePrefix).toBe("stdio_");
        const details = JSON.parse(createInput.configDetails);
        expect(details.command).toBe("node");
        expect(details.args).toEqual(["run", "start"]);
        expect(details.cwd).toBe("/tmp");
        expect(details.env).toEqual({ VAR: "value" });
        expect(details.server_id).toBeUndefined();
        expect(details.enabled).toBeUndefined();
    });
    it("converts stdio config to domain", () => {
        const prismaObj = makePrismaConfig({
            serverId: "test-stdio-server-2",
            transportType: "stdio",
            enabled: false,
            toolNamePrefix: "prefix_",
            configDetails: JSON.stringify({
                command: "python",
                args: ["-m", "http.server"],
                cwd: "/",
                env: {},
            }),
        });
        const domainObj = PrismaMcpServerConfigurationConverter.toDomain(prismaObj);
        expect(domainObj).toBeInstanceOf(StdioMcpServerConfig);
        const stdio = domainObj;
        expect(stdio.server_id).toBe("test-stdio-server-2");
        expect(stdio.enabled).toBe(false);
        expect(stdio.tool_name_prefix).toBe("prefix_");
        expect(stdio.transport_type).toBe(McpTransportType.STDIO);
        expect(stdio.command).toBe("python");
        expect(stdio.args).toEqual(["-m", "http.server"]);
        expect(stdio.cwd).toBe("/");
        expect(stdio.env).toEqual({});
    });
    it("converts streamable http config to persistence input", () => {
        const domainObj = new StreamableHttpMcpServerConfig({
            server_id: "test-http-server",
            url: "http://localhost:8000",
            headers: { "X-API-Key": "secret" },
            token: "jwt-token",
            enabled: true,
        });
        const createInput = PrismaMcpServerConfigurationConverter.toCreateInput(domainObj);
        expect(createInput.serverId).toBe("test-http-server");
        expect(createInput.transportType).toBe("streamable_http");
        const details = JSON.parse(createInput.configDetails);
        expect(details.url).toBe("http://localhost:8000");
        expect(details.headers).toEqual({ "X-API-Key": "secret" });
        expect(details.token).toBe("jwt-token");
    });
    it("converts streamable http config to domain", () => {
        const prismaObj = makePrismaConfig({
            serverId: "test-http-server-2",
            transportType: "streamable_http",
            configDetails: JSON.stringify({
                url: "http://remote:5000",
                headers: {},
                token: null,
            }),
        });
        const domainObj = PrismaMcpServerConfigurationConverter.toDomain(prismaObj);
        expect(domainObj).toBeInstanceOf(StreamableHttpMcpServerConfig);
        const httpConfig = domainObj;
        expect(httpConfig.server_id).toBe("test-http-server-2");
        expect(httpConfig.url).toBe("http://remote:5000");
        expect(httpConfig.headers).toEqual({});
        expect(httpConfig.token).toBeNull();
    });
});
