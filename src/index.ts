#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { connectStdio, listCapabilities } from './client.js';
import { App } from './app.js';

async function main() {
  const [, , ...serverArgs] = process.argv;
  if (!serverArgs.length) {
    console.error('Usage: mcpscope <command> [args...]');
    process.exit(1);
  }
  const [command, ...args] = serverArgs;
  const client = await connectStdio(command, args);
  const caps = await listCapabilities(client);
  const label = `${command} ${args.join(' ')}`.trim();
  const { waitUntilExit } = render(React.createElement(App, { client, caps, serverLabel: label }));

  const cleanup = async () => {
    try { await client.close(); } catch {}
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  await waitUntilExit();
  await cleanup();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
