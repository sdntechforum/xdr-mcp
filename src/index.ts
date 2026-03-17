/*
 * Cisco XDR MCP Server - Entry Point
 * Load .env before anything else (credentials from env, never mcp.json)
 */

import 'dotenv/config';
import { CiscoXdrMCPServer } from './server.js';

const server = new CiscoXdrMCPServer();
server.run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
