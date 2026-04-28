import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClientInstance = {
  connect: vi.fn().mockResolvedValue(undefined),
  listTools: vi.fn(),
  listResources: vi.fn(),
  listPrompts: vi.fn(),
};

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => mockClientInstance),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({})),
}));

import { connectStdio, listCapabilities } from '../src/client.js';

beforeEach(() => {
  mockClientInstance.connect.mockClear();
  mockClientInstance.listTools.mockReset();
  mockClientInstance.listResources.mockReset();
  mockClientInstance.listPrompts.mockReset();
});

describe('connectStdio', () => {
  it('returns a connected Client', async () => {
    const client = await connectStdio('node', ['server.js']);
    expect(client).toBe(mockClientInstance);
    expect(mockClientInstance.connect).toHaveBeenCalledOnce();
  });
});

describe('listCapabilities', () => {
  it('aggregates tools, resources and prompts', async () => {
    mockClientInstance.listTools.mockResolvedValue({
      tools: [{ name: 'echo', description: 'd', inputSchema: { type: 'object' } }],
    });
    mockClientInstance.listResources.mockResolvedValue({
      resources: [{ uri: 'file:///a', name: 'a' }],
    });
    mockClientInstance.listPrompts.mockResolvedValue({
      prompts: [{ name: 'p1' }],
    });

    const caps = await listCapabilities(mockClientInstance as any);

    expect(caps.tools).toHaveLength(1);
    expect(caps.tools[0].name).toBe('echo');
    expect(caps.resources).toHaveLength(1);
    expect(caps.resources[0].uri).toBe('file:///a');
    expect(caps.prompts).toHaveLength(1);
    expect(caps.prompts[0].name).toBe('p1');
  });

  it('returns empty arrays when capability is unsupported', async () => {
    mockClientInstance.listTools.mockRejectedValue(new Error('not supported'));
    mockClientInstance.listResources.mockRejectedValue(new Error('not supported'));
    mockClientInstance.listPrompts.mockRejectedValue(new Error('not supported'));

    const caps = await listCapabilities(mockClientInstance as any);
    expect(caps.tools).toEqual([]);
    expect(caps.resources).toEqual([]);
    expect(caps.prompts).toEqual([]);
  });
});
