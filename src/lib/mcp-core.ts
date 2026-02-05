/**
 * MCP Core - Inlined utilities for standalone MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

export type ToolInput<T = Record<string, unknown>> = T;

/**
 * Base Tool class for MCP tools
 */
export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract get inputSchema(): Record<string, unknown>;
  abstract execute(input: ToolInput): Promise<ToolResult>;

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
      handler: (args) => this.execute(args),
    };
  }
}

/**
 * Create and configure an MCP server with tools
 */
export function createMCPServer(
  config: MCPServerConfig,
  tools: (Tool | ToolDefinition)[]
): Server {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Convert tools to definitions
  const toolDefs = tools.map(tool => 
    'toDefinition' in tool ? tool.toDefinition() : tool
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefs.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = toolDefs.find((t) => t.name === toolName);

    if (!tool) {
      return {
        content: [{ type: "text" as const, text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
    }

    try {
      const args = request.params.arguments ?? {};
      return await tool.handler(args as Record<string, unknown>);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start MCP server with stdio transport
 */
export async function startMCPServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[MCP] Server started`);
}

/**
 * Helper to create a successful tool result
 */
export function success(text: string): ToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

/**
 * Helper to create a JSON tool result
 */
export function json(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Helper to create an error tool result
 */
export function error(message: string): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}