#!/usr/bin/env node
// ccq MCP Server 入口

const { MCPServer } = require('./build/mcp/server.js');

async function main() {
  const server = new MCPServer();
  await server.start();
}

main().catch(console.error);
