# AGENTS.md – Cisco XDR MCP Server

Guidance for AI coding agents (VS Code, GitHub Copilot, Cursor, Codex, Gemini CLI, etc.) working with this repository.

## API Documentation

- **Cisco XDR APIs**: https://developer.cisco.com/docs/cisco-xdr/
- **Authentication**: https://developer.cisco.com/docs/cisco-xdr/authentication/
- **Getting Started**: https://developer.cisco.com/docs/cisco-xdr/getting-started/
- **Automation API (OpenAPI)**: https://pubhub.devnetcloud.com/media/cisco-xdr-api-docs/docs/reference/automation/rest_api_1_0_0.json
- **Enrich API**: https://developer.cisco.com/docs/cisco-xdr/enrich-api-guide/
- **Inspect API**: https://developer.cisco.com/docs/cisco-xdr/inspect-api-guide/
- **Incident Management API**: https://developer.cisco.com/docs/cisco-xdr/incident-management-api-guide/

## MCP Server

This project is an **MCP (Model Context Protocol) server** that exposes Cisco XDR APIs as tools. It runs on stdio transport and requires:

- **Node.js**: 18+ (20 recommended)
- **Credentials**: `XDR_CLIENT_ID` and `XDR_CLIENT_PASSWORD` from environment or `.env` (never in `mcp.json`)

### Quick run

```bash
npm install
cp .env.example .env
# Edit .env with XDR_CLIENT_ID and XDR_CLIENT_PASSWORD
npm run build
npm start
```

### Docker

```bash
docker build -t cisco-xdr-mcp .
docker run -it --rm -e XDR_CLIENT_ID=xxx -e XDR_CLIENT_PASSWORD=xxx -e XDR_REGION=us cisco-xdr-mcp
```

## Testing

- **Cisco DevNet Sandbox**: Visit https://devnetsandbox.cisco.com/DevNet to book a related sandbox for testing.
- **Security**: Do not commit real credentials or tokens. Use placeholders and document required env vars.

## PR Instructions

- **Security**: Do not commit real credentials or tokens. Use placeholders and document required env vars or files.
- **Backward compatibility**: Do not change existing tool behavior unless clearly improving or fixing a bug; document changes.

## Contribution Conventions

- Follow [CONTRIBUTING.md](CONTRIBUTING.md) for pull requests and issues.
- All interactions are subject to [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
