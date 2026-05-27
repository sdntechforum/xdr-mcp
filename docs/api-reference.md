# Cisco XDR REST API — Reference

The authoritative API reference for the Cisco XDR REST API lives on Cisco DevNet:

- **Live reference (HTML)**: <https://developer.cisco.com/docs/cisco-xdr-api/>
- **Raw OpenAPI v1.0.0 spec (JSON)**: <https://pubhub.devnetcloud.com/media/cisco-xdr-api-docs/docs/reference/automation/rest_api_1_0_0.json>

The live source is updated by the Cisco XDR API team and is the single source of truth. We do not vendor a copy of the spec or a printed PDF in this repository; doing so would create a stale artifact every time Cisco publishes an update and would also bloat the git history with a 1+ MB binary.

## Working with the spec locally

If you want a local copy for offline reference (for example when working on flights or in a lab without external connectivity):

```bash
curl -L \
  https://pubhub.devnetcloud.com/media/cisco-xdr-api-docs/docs/reference/automation/rest_api_1_0_0.json \
  -o rest_api_1_0_0.json
```

You can render this into HTML or load it in Swagger UI / Redoc for browsing:

```bash
# Swagger UI via Docker
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/spec/rest_api_1_0_0.json \
  -v "$(pwd):/spec" \
  swaggerapi/swagger-ui

# Or use Redoc CLI
npx @redocly/cli preview-docs rest_api_1_0_0.json
```

## How this MCP server uses the spec

`xdr-mcp` does not consume the OpenAPI spec at runtime — it implements its tool surface against a hand-curated subset of XDR endpoints (Inspect, Investigate, Incidents, Response, Casebooks, Intel, Workflows, Admin). Refer to:

- [`README.md`](../README.md) — for the tool catalog this server exposes.
- The live API reference (linked above) — for the underlying request/response shapes the server wraps.
