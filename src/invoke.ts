import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface InvokeResult {
  content: unknown[];
  isError: boolean;
  trace: {
    toolName: string;
    args: Record<string, unknown>;
    request: unknown;
    response: unknown;
    durationMs: number;
  };
}

export async function invokeTool(
  client: Client,
  toolName: string,
  args: Record<string, unknown>,
): Promise<InvokeResult> {
  const request = { name: toolName, arguments: args };
  const start = Date.now();
  try {
    const response = (await client.callTool(request)) as {
      content: unknown[];
      isError?: boolean;
    };
    const durationMs = Date.now() - start;
    return {
      content: response.content ?? [],
      isError: Boolean(response.isError),
      trace: { toolName, args, request, response, durationMs },
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
      trace: { toolName, args, request, response: { error: message }, durationMs },
    };
  }
}
