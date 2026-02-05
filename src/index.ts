#!/usr/bin/env node

/**
 * Google Cloud DNS MCP Server
 * 
 * Standalone server for managing Google Cloud DNS zones and records via API.
 * 
 * Required environment variables:
 * - GOOGLE_CLOUD_PROJECT_ID (required) - Your Google Cloud project ID
 * - GOOGLE_CLOUD_CREDENTIALS (required) - Service account JSON string
 * 
 * Available tools:
 * - gcloud_dns_list_zones: List all DNS managed zones
 * - gcloud_dns_get_zone: Get details for a specific managed zone
 * - gcloud_dns_list_records: List DNS records in a managed zone
 * - gcloud_dns_create_record: Create a new DNS record
 * - gcloud_dns_update_record: Update an existing DNS record
 * - gcloud_dns_delete_record: Delete a DNS record
 */

import { createMCPServer, startMCPServer, type Tool } from "./lib/mcp-core.js";
import { GoogleCloudDNSClient, getGoogleCloudCredentials } from "./lib/client.js";
import { createDomainTools } from "./tools/domains.js";

async function initServer() {
  try {
    // Get credentials from environment variables
    const credentials = getGoogleCloudCredentials();
    
    // Create client with credentials
    const client = new GoogleCloudDNSClient(credentials);
    
    // Create tools
    const tools: Tool[] = [
      ...createDomainTools(client),
    ];

    const server = createMCPServer(
      {
        name: "gcloud-dns-mcp",
        version: "1.0.0",
        description: "Google Cloud DNS zones and records management via API",
      },
      tools
    );

    // Start server
    await startMCPServer(server);
    console.error(`[MCP] Google Cloud DNS server ready with ${tools.length} tools`);
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize and start server
initServer().catch(console.error);