/*
 * Cisco XDR API Client - Unified client for Automation, Platform (IROH), and Private Intel APIs
 */

import fetch from 'node-fetch';
import type { XdrConfig } from '../utils/config.js';
import { XdrAuthService } from './xdrAuth.js';

export type ApiTarget = 'automate' | 'platform' | 'privateIntel';

export class XdrApiService {
  private auth: XdrAuthService;
  private config: XdrConfig;

  constructor(config: XdrConfig) {
    this.config = config;
    this.auth = new XdrAuthService(config);
  }

  private getBaseUrl(target: ApiTarget): string {
    switch (target) {
      case 'automate':
        return this.config.automateBaseUrl!;
      case 'platform':
        return this.config.platformBaseUrl!;
      case 'privateIntel':
        return this.config.privateIntelBaseUrl!;
      default:
        throw new Error(`Unknown API target: ${target}`);
    }
  }

  async get<T = unknown>(
    target: ApiTarget,
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(path.startsWith('http') ? path : `${this.getBaseUrl(target)}${path.startsWith('/') ? '' : '/'}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const headers = await this.auth.getAuthHeaders();
    const response = await fetch(url.toString(), { method: 'GET', headers });
    return this.handleResponse<T>(response);
  }

  async post<T = unknown>(
    target: ApiTarget,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(path.startsWith('http') ? path : `${this.getBaseUrl(target)}${path.startsWith('/') ? '' : '/'}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const headers = await this.auth.getAuthHeaders();
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Awaited<ReturnType<typeof fetch>>): Promise<T> {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`XDR API error ${response.status}: ${text}`);
    }
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
    }
  }
}
