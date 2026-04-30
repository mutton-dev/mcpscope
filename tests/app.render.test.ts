import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from 'ink-testing-library';

const mocks = vi.hoisted(() => ({
  invokeTool: vi.fn(),
  isPro: vi.fn(),
}));

vi.mock('../src/invoke.js', () => ({ invokeTool: mocks.invokeTool }));

vi.mock('../src/history.js', () => ({
  isPro: mocks.isPro,
  openHistoryDb: vi.fn(),
  saveHistory: vi.fn(),
  getHistory: vi.fn(),
}));

import { App } from '../src/app.js';
import type { McpCapabilities } from '../src/client.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

// VT100 sequences that Ink's parseKeypress recognises
const KEY = {
  TAB: '\t',
  ENTER: '\r',
  ESC: '',
  UP: '[A',
  DOWN: '[B',
  BACKSPACE: '',
};

// Wait for React effects (useEffect is async — scheduled after render)
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

const sampleCaps: McpCapabilities = {
  tools: [
    { name: 'echo', description: 'echoes input', inputSchema: {} },
    {
      name: 'greet',
      description: 'greet',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } } },
    },
  ],
  resources: [{ uri: 'file://test', name: 'test file' }],
  prompts: [],
};

const fakeClient = {} as unknown as Client;

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

async function mount() {
  mocks.isPro.mockReturnValue(false);
  const instance = render(
    React.createElement(App, { client: fakeClient, caps: sampleCaps, serverLabel: 'test' }),
  );
  await tick(); // let useEffect run so stdin listener is registered
  return instance;
}

async function mountPro() {
  mocks.isPro.mockReturnValue(true);
  const instance = render(
    React.createElement(App, { client: fakeClient, caps: sampleCaps, serverLabel: 'test' }),
  );
  await tick();
  return instance;
}

describe('App keybindings', () => {
  it('initial frame shows TOOLS tab active', async () => {
    const { lastFrame } = await mount();
    expect(lastFrame()).toContain('[TOOLS]');
  });

  it('Tab cycles from tools to resources', async () => {
    const { stdin, lastFrame } = await mount();
    stdin.write(KEY.TAB);
    expect(lastFrame()).toContain('[RESOURCES]');
  });

  it('↓ moves cursor down', async () => {
    const { stdin, lastFrame } = await mount();
    const before = lastFrame();
    stdin.write(KEY.DOWN);
    expect(lastFrame()).not.toBe(before);
  });

  it('↑ at top does not change frame', async () => {
    const { stdin, lastFrame } = await mount();
    const before = lastFrame();
    stdin.write(KEY.UP);
    expect(lastFrame()).toBe(before);
  });

  it('Enter on no-args tool invokes immediately', async () => {
    mocks.invokeTool.mockResolvedValue({
      content: [],
      isError: false,
      trace: { toolName: 'echo', args: {}, request: {}, response: {}, durationMs: 1 },
    });
    const { stdin } = await mount();
    stdin.write(KEY.ENTER);
    await new Promise((r) => setTimeout(r, 50));
    expect(mocks.invokeTool).toHaveBeenCalledWith(fakeClient, 'echo', {});
  });

  it('Enter on args tool enters input mode', async () => {
    const { stdin, lastFrame } = await mount();
    stdin.write(KEY.DOWN); // move to 'greet' (has properties)
    await tick(); // flush cursor state before Enter
    stdin.write(KEY.ENTER);
    expect(lastFrame()).toContain('JSON args');
  });

  it('Esc in input mode returns to normal mode', async () => {
    const { stdin, lastFrame } = await mount();
    stdin.write(KEY.DOWN);
    await tick();
    stdin.write(KEY.ENTER);
    await tick(); // flush inputMode state before Esc
    expect(lastFrame()).toContain('JSON args');
    stdin.write(KEY.ESC);
    expect(lastFrame()).not.toContain('JSON args');
  });

  it('h toggles history panel when pro', async () => {
    const { stdin, lastFrame } = await mountPro();
    expect(lastFrame()).not.toContain('History');
    stdin.write('h');
    expect(lastFrame()).toContain('History');
  });

  it('h does nothing when not pro', async () => {
    const { stdin, lastFrame } = await mount();
    stdin.write('h');
    expect(lastFrame()).not.toContain('History');
  });
});
