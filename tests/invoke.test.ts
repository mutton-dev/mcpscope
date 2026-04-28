import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invokeTool } from '../src/invoke.js';

const mockClient = {
  callTool: vi.fn(),
};

beforeEach(() => {
  mockClient.callTool.mockReset();
});

describe('invokeTool', () => {
  it('returns content and trace on success', async () => {
    mockClient.callTool.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      isError: false,
    });

    const result = await invokeTool(mockClient as any, 'echo', { msg: 'hi' });

    expect(result.isError).toBe(false);
    expect(result.content).toEqual([{ type: 'text', text: 'ok' }]);
    expect(result.trace.toolName).toBe('echo');
    expect(result.trace.args).toEqual({ msg: 'hi' });
    expect(result.trace.request).toEqual({ name: 'echo', arguments: { msg: 'hi' } });
    expect(result.trace.response).toBeDefined();
    expect(typeof result.trace.durationMs).toBe('number');
    expect(result.trace.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('flags isError when server returns isError true', async () => {
    mockClient.callTool.mockResolvedValue({
      content: [{ type: 'text', text: 'fail' }],
      isError: true,
    });

    const result = await invokeTool(mockClient as any, 'broken', {});
    expect(result.isError).toBe(true);
  });

  it('captures thrown errors as isError trace entries', async () => {
    mockClient.callTool.mockRejectedValue(new Error('boom'));

    const result = await invokeTool(mockClient as any, 'crash', { x: 1 });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: 'text', text: 'boom' }]);
    expect(result.trace.toolName).toBe('crash');
    expect(result.trace.response).toMatchObject({ error: 'boom' });
  });
});
