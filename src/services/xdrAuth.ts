/*
 * Cisco XDR OAuth2 Client Credentials Flow
 * See: https://developer.cisco.com/docs/cisco-xdr/authentication/
 */

import fetch from 'node-fetch';
import type { XdrConfig } from '../utils/config.js';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export class XdrAuthService {
  private config: XdrConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private readonly bufferSeconds = 60; // Refresh 60s before expiry

  constructor(config: XdrConfig) {
    this.config = config;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - this.bufferSeconds * 1000) {
      return this.accessToken;
    }
    const tokenUrl = this.config.oauthTokenUrl!;
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientPassword}`,
      'utf8'
    ).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `XDR OAuth2 token request failed: ${response.status} ${response.statusText}. ${text}`
      );
    }

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }
}
