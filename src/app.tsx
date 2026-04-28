import React, { useReducer, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { McpCapabilities } from './client.js';
import { invokeTool } from './invoke.js';
import { initialState, reduce, type AppState, type AppAction } from './appState.js';
import { isPro } from './history.js';

interface AppProps {
  client: Client;
  caps: McpCapabilities;
  serverLabel: string;
}

export function listForTab(state: AppState): Array<{ name: string; description?: string }> {
  switch (state.tab) {
    case 'tools':
      return state.caps.tools.map((t) => ({ name: t.name, description: t.description }));
    case 'resources':
      return state.caps.resources.map((r) => ({
        name: r.uri,
        description: r.name ?? r.description,
      }));
    case 'prompts':
      return state.caps.prompts.map((p) => ({ name: p.name, description: p.description }));
  }
}

export function App({ client, caps, serverLabel }: AppProps) {
  const { exit } = useApp();
  const [state, dispatch] = useReducer<React.Reducer<AppState, AppAction>>(
    reduce,
    initialState(caps),
  );
  const [argsInput, setArgsInput] = useState('');
  const [inputMode, setInputMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pro = isPro();

  const items = listForTab(state);

  const runTool = async (toolName: string, rawArgs: string) => {
    let parsed: Record<string, unknown> = {};
    if (rawArgs.trim()) {
      try {
        parsed = JSON.parse(rawArgs);
      } catch (e) {
        setError(`invalid JSON: ${(e as Error).message}`);
        return;
      }
    }
    setError(null);
    setBusy(true);
    const result = await invokeTool(client, toolName, parsed);
    setBusy(false);
    dispatch({ type: 'invoke-result', toolName, result });
  };

  useInput((input, key) => {
    if (inputMode) {
      if (key.return) {
        const tool = state.caps.tools[state.cursor];
        setInputMode(false);
        if (tool) void runTool(tool.name, argsInput);
        setArgsInput('');
        return;
      }
      if (key.escape) {
        setInputMode(false);
        setArgsInput('');
        return;
      }
      if (key.backspace || key.delete) {
        setArgsInput((s) => s.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) setArgsInput((s) => s + input);
      return;
    }

    if (input === 'q') {
      exit();
      return;
    }
    if (key.tab) {
      dispatch({ type: 'next-tab' });
      return;
    }
    if (key.upArrow) {
      dispatch({ type: 'cursor-up' });
      return;
    }
    if (key.downArrow) {
      dispatch({ type: 'cursor-down' });
      return;
    }
    if (key.return) {
      if (state.tab === 'tools') {
        const tool = state.caps.tools[state.cursor];
        if (!tool) return;
        const hasProps =
          tool.inputSchema &&
          typeof tool.inputSchema === 'object' &&
          'properties' in (tool.inputSchema as Record<string, unknown>);
        if (hasProps) {
          setInputMode(true);
          setArgsInput('');
        } else {
          void runTool(tool.name, '');
        }
      }
      return;
    }
    if (input === 'h' && pro) {
      dispatch({ type: 'toggle-history' });
    }
  });

  const last = state.lastResult;
  const tabsLine = (['tools', 'resources', 'prompts'] as const)
    .map((t) => (t === state.tab ? `[${t.toUpperCase()}]` : t))
    .join('  ');

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>mcpscope</Text>
        <Text> — {serverLabel}{pro ? ' (Pro)' : ''}</Text>
      </Box>
      <Box>
        <Text>{tabsLine}   Tab: switch · ↑↓: nav · Enter: invoke · q: quit{pro ? ' · h: history' : ''}</Text>
      </Box>
      <Box flexDirection="row" marginTop={1}>
        <Box flexDirection="column" width={32} borderStyle="single" paddingX={1}>
          <Text underline>{state.tab}</Text>
          {items.length === 0 && <Text dimColor>(empty)</Text>}
          {items.map((it, i) => (
            <Text key={`${it.name}-${i}`} inverse={i === state.cursor}>
              {i === state.cursor ? '>' : ' '} {it.name}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column" flexGrow={1} borderStyle="single" paddingX={1}>
          {inputMode && (
            <Box flexDirection="column">
              <Text>JSON args (Enter to invoke, Esc cancel):</Text>
              <Text>{argsInput || ' '}</Text>
            </Box>
          )}
          {busy && <Text color="yellow">running...</Text>}
          {error && <Text color="red">{error}</Text>}
          {!inputMode && state.showHistory && (
            <Box flexDirection="column">
              <Text underline>History</Text>
              {state.history.slice().reverse().map((h) => (
                <Text key={h.id}>
                  #{h.id} {h.toolName} ({h.durationMs}ms) {h.isError ? 'ERR' : 'OK'}
                </Text>
              ))}
            </Box>
          )}
          {!inputMode && !state.showHistory && last && (
            <Box flexDirection="column">
              <Text underline>Result {last.isError ? '(error)' : ''}</Text>
              <Text>{JSON.stringify(last.content, null, 2)}</Text>
              <Text> </Text>
              <Text underline>Trace</Text>
              <Text>request: {JSON.stringify(last.trace.request)}</Text>
              <Text>response: {JSON.stringify(last.trace.response)}</Text>
              <Text>duration: {last.trace.durationMs}ms</Text>
            </Box>
          )}
          {!inputMode && !state.showHistory && !last && <Text dimColor>(no invocation yet)</Text>}
        </Box>
      </Box>
    </Box>
  );
}
