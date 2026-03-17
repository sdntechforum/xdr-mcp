/*
 * Cisco XDR MCP Server
 * Exposes XDR APIs as MCP tools: Automation, Enrich, Inspect, Incidents, and more
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { XdrApiService } from './services/xdrApi.js';
import { loadConfig } from './utils/config.js';

export class CiscoXdrMCPServer {
  private server: Server;
  private api: XdrApiService;

  constructor() {
    const config = loadConfig();
    this.api = new XdrApiService(config);

    this.server = new Server(
      {
        name: 'cisco-xdr-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: { listChanged: false },
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getAllTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        const result = await this.handleToolCall(name, args || {});
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    });
  }

  private getAllTools(): Tool[] {
    return [
      // === Inspect (Platform) - Extract observables from text ===
      {
        name: 'xdr_inspect',
        description: 'Extract observables (IPs, domains, hashes, emails, etc.) from a text string. Use for threat hunting and IOC extraction.',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Text to inspect (e.g., email body, log line, URL)' },
          },
          required: ['content'],
        },
      },

      // === Enrich (Platform) - Threat intelligence ===
      {
        name: 'xdr_enrich_observe',
        description: 'Get in-depth threat context for observables. Returns verdicts, judgements, and investigation data from integrated modules.',
        inputSchema: {
          type: 'object',
          properties: {
            observables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Observable type: ip, domain, url, sha256, md5, email, etc.' },
                  value: { type: 'string', description: 'Observable value' },
                },
                required: ['type', 'value'],
              },
              description: 'Array of {type, value} observables to enrich',
            },
          },
          required: ['observables'],
        },
      },
      {
        name: 'xdr_enrich_deliberate',
        description: 'Quickly get verdicts (malicious/benign/unknown) for observables from all integrated modules.',
        inputSchema: {
          type: 'object',
          properties: {
            observables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  value: { type: 'string' },
                },
                required: ['type', 'value'],
              },
            },
          },
          required: ['observables'],
        },
      },
      {
        name: 'xdr_enrich_refer',
        description: 'Get reference links for observables to pivot investigation in product interfaces.',
        inputSchema: {
          type: 'object',
          properties: {
            observables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  value: { type: 'string' },
                },
                required: ['type', 'value'],
              },
            },
          },
          required: ['observables'],
        },
      },

      // === Incident Management (Private Intel) ===
      {
        name: 'xdr_incident_summary',
        description: 'Get incident summary with related threat context, linked incidents, observables, and severity.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'Incident ID (GUID or short-id)' },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'xdr_incident_worklog',
        description: 'Get worklog notes for an incident.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string' },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'xdr_incident_create',
        description: 'Create a custom incident in XDR.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'number', description: 'Severity 1-100' },
            status: { type: 'string', description: 'e.g. New, Open, Stalled, Closed' },
          },
          required: ['title'],
        },
      },

      // === Automation - Workflows ===
      {
        name: 'xdr_workflows_list',
        description: 'List workflows with optional filters. Supports search, state, limit, start.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of workflows (required, 1-100)', default: 20 },
            start: { type: 'number', description: 'Pagination offset' },
            search: { type: 'string', description: 'Search term for workflow names' },
            state: { type: 'string', description: 'Filter by state (comma-separated)' },
            is_atomic: { type: 'boolean', description: 'Filter atomic vs non-atomic workflows' },
          },
          required: ['limit'],
        },
      },
      {
        name: 'xdr_workflow_get',
        description: 'Get a workflow by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: { type: 'string' },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'xdr_workflow_start',
        description: 'Start a workflow execution. Use workflow_id or unique_name.',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: { type: 'string' },
            unique_name: { type: 'string' },
            sync: { type: 'boolean', description: 'If true, wait for completion (up to ~28s)' },
            async: { type: 'boolean', description: 'If true, run asynchronously' },
          },
        },
      },

      // === Automation - Workflow Instances ===
      {
        name: 'xdr_instances_list',
        description: 'List workflow instances with filters (state, search, date range).',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', required: true },
            date_from: { type: 'string', description: 'ISO date e.g. 2024-01-01T00:00:00Z', required: true },
            date_to: { type: 'string', description: 'ISO date' },
            state: { type: 'string' },
            search: { type: 'string' },
            start: { type: 'number' },
          },
          required: ['limit', 'date_from'],
        },
      },
      {
        name: 'xdr_instance_get',
        description: 'Get workflow instance details by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            instance_id: { type: 'string' },
          },
          required: ['instance_id'],
        },
      },
      {
        name: 'xdr_instance_cancel',
        description: 'Cancel a running workflow instance.',
        inputSchema: {
          type: 'object',
          properties: {
            instance_id: { type: 'string' },
          },
          required: ['instance_id'],
        },
      },

      // === Automation - Calendars, Schedules, Targets ===
      {
        name: 'xdr_calendars_list',
        description: 'List all calendars.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'xdr_schedules_list',
        description: 'List all schedules.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'xdr_targets_list',
        description: 'List all targets (XDR targets for workflows).',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number' },
            start: { type: 'number' },
          },
        },
      },

      // === Automation - Variables, Webhooks ===
      {
        name: 'xdr_variables_list',
        description: 'List workflow variables.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'xdr_webhooks_list',
        description: 'List webhooks.',
        inputSchema: { type: 'object', properties: {} },
      },

      // === Profile & Users (Platform) ===
      {
        name: 'xdr_profile_get',
        description: 'Get current user profile.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  private async handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'xdr_inspect': {
        const content = args.content as string;
        if (!content) throw new Error('content is required');
        return this.api.post('platform', '/iroh/iroh-inspect/inspect', { content });
      }

      case 'xdr_enrich_observe': {
        const obs1 = args.observables as Array<{ type: string; value: string }>;
        if (!Array.isArray(obs1) || obs1.length === 0) throw new Error('observables array is required');
        return this.api.post('platform', '/iroh/iroh-enrich/observe/observables', obs1);
      }

      case 'xdr_enrich_deliberate': {
        const obs2 = args.observables as Array<{ type: string; value: string }>;
        if (!Array.isArray(obs2) || obs2.length === 0) throw new Error('observables array is required');
        return this.api.post('platform', '/iroh/iroh-enrich/deliberate/observables', obs2);
      }

      case 'xdr_enrich_refer': {
        const obs3 = args.observables as Array<{ type: string; value: string }>;
        if (!Array.isArray(obs3) || obs3.length === 0) throw new Error('observables array is required');
        return this.api.post('platform', '/iroh/iroh-enrich/refer/observables', obs3);
      }

      case 'xdr_incident_summary': {
        const incId = args.incident_id as string;
        if (!incId) throw new Error('incident_id is required');
        return this.api.get('platform', `/iroh/private-intel/incident/${encodeURIComponent(incId)}/summary`);
      }

      case 'xdr_incident_worklog': {
        const incId2 = args.incident_id as string;
        if (!incId2) throw new Error('incident_id is required');
        return this.api.get('platform', `/iroh/private-intel/incident/${encodeURIComponent(incId2)}/worklog`);
      }

      case 'xdr_incident_create': {
        const title = args.title as string;
        if (!title) throw new Error('title is required');
        const body = {
          title,
          description: (args.description as string) || '',
          severity: (args.severity as number) ?? 50,
          status: (args.status as string) || 'New',
        };
        return this.api.post('platform', '/iroh/private-intel/incident', body);
      }

      case 'xdr_workflows_list': {
        const limit = (args.limit as number) ?? 20;
        const params: Record<string, string | number | boolean> = { limit };
        if (args.start != null) params.start = args.start as number;
        if (args.search) params.search = args.search as string;
        if (args.state) params.state = args.state as string;
        if (args.is_atomic != null) params.is_atomic = args.is_atomic as boolean;
        return this.api.post('automate', '/v1.2/workflows', {}, params);
      }

      case 'xdr_workflow_get': {
        const wfId = args.workflow_id as string;
        if (!wfId) throw new Error('workflow_id is required');
        return this.api.get('automate', `/v1/workflows/${encodeURIComponent(wfId)}`);
      }

      case 'xdr_workflow_start': {
        const wfId2 = args.workflow_id as string;
        const uniqueName = args.unique_name as string;
        if (!wfId2 && !uniqueName) throw new Error('workflow_id or unique_name is required');
        const params: Record<string, string | boolean> = {};
        if (wfId2) params.workflow_id = wfId2;
        if (uniqueName) params.unique_name = uniqueName;
        if (args.sync === true) params.sync = true;
        if (args.async === true) params.async = true;
        return this.api.post('automate', '/v1.1/workflows/start', undefined, params);
      }

      case 'xdr_instances_list': {
        const limit2 = args.limit as number;
        const dateFrom = args.date_from as string;
        if (limit2 == null || !dateFrom) throw new Error('limit and date_from are required');
        const params2: Record<string, string | number> = { limit: limit2, date_from: dateFrom };
        if (args.date_to) params2.date_to = args.date_to as string;
        if (args.state) params2.state = args.state as string;
        if (args.search) params2.search = args.search as string;
        if (args.start != null) params2.start = args.start as number;
        return this.api.post('automate', '/v1.1/instances', {}, params2);
      }

      case 'xdr_instance_get': {
        const instId = args.instance_id as string;
        if (!instId) throw new Error('instance_id is required');
        return this.api.get('automate', `/v1/instances/${encodeURIComponent(instId)}`);
      }

      case 'xdr_instance_cancel': {
        const instId2 = args.instance_id as string;
        if (!instId2) throw new Error('instance_id is required');
        return this.api.post('automate', `/v1/instances/${encodeURIComponent(instId2)}/cancel`);
      }

      case 'xdr_calendars_list':
        return this.api.get('automate', '/v1/calendars');

      case 'xdr_schedules_list':
        return this.api.get('automate', '/v1/schedules');

      case 'xdr_targets_list': {
        const params3: Record<string, number> = {};
        if (args.limit != null) params3.limit = args.limit as number;
        if (args.start != null) params3.start = args.start as number;
        return this.api.get('automate', '/v1/targets', params3);
      }

      case 'xdr_variables_list':
        return this.api.get('automate', '/v1/variables');

      case 'xdr_webhooks_list':
        return this.api.get('automate', '/v1/webhooks');

      case 'xdr_profile_get':
        return this.api.get('platform', '/iroh/iroh-profile/profile');

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Cisco XDR MCP Server running on stdio');
  }
}
