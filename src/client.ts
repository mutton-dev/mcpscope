import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface McpCapabilities {
  tools: Array<{ name: string; description?: string; inputSchema: object }>;
  resources: Array<{ uri: string; name?: string; description?: string; mimeType?: string }>;
  prompts: Array<{ name: string; description?: string; arguments?: unknown[] }>;
}

export async function connectStdio(command: string, args: string[]): Promise<Client> {
  const transport = new StdioClientTransport({ command, args });
  const client = new Client(
    { name: 'mcpscope', version: '0.1.0' },
    { capabilities: {} },
  );
  await client.connect(transport);
  return client;
}

async function safeList<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function listCapabilities(client: Client): Promise<McpCapabilities> {
  const [toolsRes, resourcesRes, promptsRes] = await Promise.all([
    safeList(() => client.listTools(), { tools: [] } as { tools: McpCapabilities['tools'] }),
    safeList(
      () => client.listResources(),
      { resources: [] } as { resources: McpCapabilities['resources'] },
    ),
    safeList(
      () => client.listPrompts(),
      { prompts: [] } as { prompts: McpCapabilities['prompts'] },
    ),
  ]);

  return {
    tools: toolsRes.tools ?? [],
    resources: resourcesRes.resources ?? [],
    prompts: promptsRes.prompts ?? [],
  };
}
