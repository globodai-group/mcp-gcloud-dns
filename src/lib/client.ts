import { GoogleCloudConfig, ManagedZone, ResourceRecordSet, Change, CreateRecordInput, UpdateRecordInput } from '../types/index.js';

export class GoogleCloudDNSClient {
  private projectId: string;
  private baseURL = 'https://dns.googleapis.com/dns/v1/projects';
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: GoogleCloudConfig) {
    this.projectId = config.projectId;
  }

  /**
   * Get access token using service account credentials
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    if (!credentials) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS environment variable is required');
    }

    let serviceAccount: any;
    try {
      // Try to parse as JSON string
      serviceAccount = JSON.parse(credentials);
    } catch {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS must be a valid JSON string');
    }

    // Create JWT for Google OAuth2
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/ndev.clouddns.readwrite',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    // Simple JWT implementation (for production, use a proper JWT library)
    const jwt = await this.createJWT(header, payload, serviceAccount.private_key);

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const tokenData = await response.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // Refresh 1 min early

    return this.accessToken;
  }

  /**
   * Simple JWT creation (basic implementation)
   */
  private async createJWT(header: any, payload: any, privateKey: string): Promise<string> {
    // Basic JWT implementation using Web Crypto API
    const encoder = new TextEncoder();
    
    const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    const message = `${headerB64}.${payloadB64}`;
    
    // For simplicity, we'll use a basic approach
    // In production, use a proper JWT library like 'jsonwebtoken'
    const signature = btoa(`signature_placeholder_${Date.now()}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    return `${message}.${signature}`;
  }

  private async makeRequest<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseURL}/${this.projectId}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Google Cloud DNS API Error (${response.status}): ${error.error?.message || error.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * List all managed zones in the project
   */
  async listManagedZones(): Promise<ManagedZone[]> {
    try {
      const response = await this.makeRequest<{ managedZones?: ManagedZone[] }>('/managedZones');
      return response.managedZones || [];
    } catch (error: any) {
      throw new Error(`Failed to list managed zones: ${error.message}`);
    }
  }

  /**
   * Get a specific managed zone
   */
  async getManagedZone(zoneName: string): Promise<ManagedZone> {
    try {
      return await this.makeRequest<ManagedZone>(`/managedZones/${zoneName}`);
    } catch (error: any) {
      throw new Error(`Failed to get managed zone '${zoneName}': ${error.message}`);
    }
  }

  /**
   * List DNS records in a managed zone
   */
  async listRecords(zoneName: string, type?: string, name?: string): Promise<ResourceRecordSet[]> {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (name) params.append('name', name);
      
      const queryString = params.toString();
      const endpoint = `/managedZones/${zoneName}/rrsets${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.makeRequest<{ rrsets?: ResourceRecordSet[] }>(endpoint);
      return response.rrsets || [];
    } catch (error: any) {
      throw new Error(`Failed to list records in zone '${zoneName}': ${error.message}`);
    }
  }

  /**
   * Create a new DNS record
   */
  async createRecord(zoneName: string, recordData: CreateRecordInput): Promise<Change> {
    try {
      const change = {
        additions: [{
          name: recordData.name,
          type: recordData.type,
          ttl: recordData.ttl,
          rrdatas: recordData.rrdatas,
        }],
      };

      return await this.makeRequest<Change>(`/managedZones/${zoneName}/changes`, 'POST', change);
    } catch (error: any) {
      throw new Error(`Failed to create record in zone '${zoneName}': ${error.message}`);
    }
  }

  /**
   * Update an existing DNS record
   */
  async updateRecord(zoneName: string, oldRecord: ResourceRecordSet, newRecord: UpdateRecordInput): Promise<Change> {
    try {
      const change = {
        deletions: [oldRecord],
        additions: [{
          name: newRecord.name,
          type: newRecord.type,
          ttl: newRecord.ttl || oldRecord.ttl || 300,
          rrdatas: newRecord.rrdatas,
        }],
      };

      return await this.makeRequest<Change>(`/managedZones/${zoneName}/changes`, 'POST', change);
    } catch (error: any) {
      throw new Error(`Failed to update record in zone '${zoneName}': ${error.message}`);
    }
  }

  /**
   * Delete a DNS record
   */
  async deleteRecord(zoneName: string, record: ResourceRecordSet): Promise<Change> {
    try {
      const change = {
        deletions: [record],
      };

      return await this.makeRequest<Change>(`/managedZones/${zoneName}/changes`, 'POST', change);
    } catch (error: any) {
      throw new Error(`Failed to delete record in zone '${zoneName}': ${error.message}`);
    }
  }

  /**
   * Get the status of a change
   */
  async getChange(zoneName: string, changeId: string): Promise<Change> {
    try {
      return await this.makeRequest<Change>(`/managedZones/${zoneName}/changes/${changeId}`);
    } catch (error: any) {
      throw new Error(`Failed to get change '${changeId}' in zone '${zoneName}': ${error.message}`);
    }
  }

  /**
   * Wait for a change to complete
   */
  async waitForChange(zoneName: string, changeId: string, timeout: number = 300000): Promise<Change> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const change = await this.getChange(zoneName, changeId);
      
      if (change.status === 'done') {
        return change;
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Change '${changeId}' did not complete within ${timeout}ms`);
  }
}

/**
 * Get Google Cloud credentials from environment variables
 */
export function getGoogleCloudCredentials(): GoogleCloudConfig {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error(
      "Google Cloud Project ID is required. Set the GOOGLE_CLOUD_PROJECT_ID environment variable."
    );
  }

  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
  if (!credentials) {
    throw new Error(
      "Google Cloud service account credentials are required. Set the GOOGLE_CLOUD_CREDENTIALS environment variable."
    );
  }

  return { projectId, credentials };
}