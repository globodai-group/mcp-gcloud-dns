import { Tool, ToolInput, ToolResult } from "../lib/mcp-core.js";
import { GoogleCloudDNSClient } from "../lib/client.js";

interface DomainsToolsContext {
  client: GoogleCloudDNSClient;
}

/**
 * List all managed zones
 */
export class ListManagedZonesTool extends Tool {
  name = "gcloud_dns_list_zones";
  description = "List all DNS managed zones in the Google Cloud project";

  constructor(private context: DomainsToolsContext) {
    super();
  }

  get inputSchema() {
    return {
      type: "object",
      properties: {},
      required: []
    } as const;
  }

  async execute(_input: ToolInput<{}>): Promise<ToolResult> {
    try {
      const zones = await this.context.client.listManagedZones();
      
      if (zones.length === 0) {
        return {
          content: [{ type: "text", text: "No DNS managed zones found in the project." }]
        };
      }

      const content = `Found ${zones.length} DNS managed zones:\n\n${zones
        .map(zone => 
          `• ${zone.dnsName} (${zone.name})\n` +
          `  - Description: ${zone.description || 'No description'}\n` +
          `  - Visibility: ${zone.visibility || 'public'}\n` +
          `  - Name servers: ${zone.nameServers?.join(', ') || 'None'}\n` +
          `  - DNSSEC: ${zone.dnssecConfig?.state || 'off'}\n` +
          `  - Created: ${zone.creationTime ? new Date(zone.creationTime).toLocaleString() : 'Unknown'}`
        )
        .join('\n\n')}`;

      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error listing managed zones: ${error.message}` }],
        isError: true
      };
    }
  }
}

/**
 * Get details for a specific managed zone
 */
export class GetManagedZoneTool extends Tool {
  name = "gcloud_dns_get_zone";
  description = "Get details for a specific DNS managed zone";

  constructor(private context: DomainsToolsContext) {
    super();
  }

  get inputSchema() {
    return {
      type: "object",
      properties: {
        zoneName: {
          type: "string",
          description: "Name of the managed zone (not the DNS name)"
        }
      },
      required: ["zoneName"]
    } as const;
  }

  async execute(input: ToolInput<{ zoneName: string }>): Promise<ToolResult> {
    try {
      if (!input.zoneName || typeof input.zoneName !== 'string') {
        return {
          content: [{ type: "text", text: "zoneName parameter must be a string" }],
          isError: true
        };
      }

      const zone = await this.context.client.getManagedZone(input.zoneName);
      
      const content = `Managed Zone Details: ${zone.dnsName}\n\n` +
        `Zone Name: ${zone.name}\n` +
        `DNS Name: ${zone.dnsName}\n` +
        `Description: ${zone.description || 'No description'}\n` +
        `Visibility: ${zone.visibility || 'public'}\n` +
        `Created: ${zone.creationTime ? new Date(zone.creationTime).toLocaleString() : 'Unknown'}\n` +
        `DNSSEC State: ${zone.dnssecConfig?.state || 'off'}\n` +
        `Name Servers:\n${zone.nameServers?.map(ns => `  - ${ns}`).join('\n') || '  None'}\n` +
        (zone.labels && Object.keys(zone.labels).length > 0 ? 
          `Labels:\n${Object.entries(zone.labels).map(([k, v]) => `  - ${k}: ${v}`).join('\n')}` : '');

      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error getting managed zone details: ${error.message}` }],
        isError: true
      };
    }
  }
}

/**
 * List DNS records in a managed zone
 */
export class ListDNSRecordsTool extends Tool {
  name = "gcloud_dns_list_records";
  description = "List DNS records in a managed zone";

  constructor(private context: DomainsToolsContext) {
    super();
  }

  get inputSchema() {
    return {
      type: "object",
      properties: {
        zoneName: {
          type: "string",
          description: "Name of the managed zone"
        },
        type: {
          type: "string",
          description: "Filter by record type (e.g., A, AAAA, CNAME, MX, TXT, NS, SOA)"
        },
        name: {
          type: "string",
          description: "Filter by record name (e.g., www.example.com.)"
        }
      },
      required: ["zoneName"]
    } as const;
  }

  async execute(input: ToolInput<{ 
    zoneName: string; 
    type?: string; 
    name?: string; 
  }>): Promise<ToolResult> {
    try {
      if (!input.zoneName || typeof input.zoneName !== 'string') {
        return {
          content: [{ type: "text", text: "zoneName parameter must be a string" }],
          isError: true
        };
      }

      const records = await this.context.client.listRecords(input.zoneName, input.type, input.name);
      
      if (records.length === 0) {
        return {
          content: [{ type: "text", text: "No DNS records found with the specified criteria." }]
        };
      }

      const content = `Found ${records.length} DNS records in zone '${input.zoneName}':\n\n${records
        .map(record => 
          `• ${record.name} (${record.type})\n` +
          `  - TTL: ${record.ttl}\n` +
          `  - Data: ${record.rrdatas?.join(', ') || 'No data'}\n` +
          (record.signatureRrdatas ? `  - Signatures: ${record.signatureRrdatas.join(', ')}\n` : '')
        )
        .join('\n')}`;

      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error listing DNS records: ${error.message}` }],
        isError: true
      };
    }
  }
}

/**
 * Create a new DNS record
 */
export class CreateDNSRecordTool extends Tool {
  name = "gcloud_dns_create_record";
  description = "Create a new DNS record in a managed zone";

  constructor(private context: DomainsToolsContext) {
    super();
  }

  get inputSchema() {
    return {
      type: "object",
      properties: {
        zoneName: {
          type: "string",
          description: "Name of the managed zone"
        },
        name: {
          type: "string",
          description: "Record name (must end with zone's DNS name, e.g., www.example.com.)"
        },
        type: {
          type: "string",
          description: "Record type (e.g., A, AAAA, CNAME, MX, TXT)"
        },
        ttl: {
          type: "number",
          description: "Time to live in seconds",
          default: 300
        },
        rrdatas: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Array of record data (e.g., IP addresses, hostnames, text values)"
        }
      },
      required: ["zoneName", "name", "type", "rrdatas"]
    } as const;
  }

  async execute(input: ToolInput<{ 
    zoneName: string;
    name: string;
    type: string;
    ttl?: number;
    rrdatas: string[];
  }>): Promise<ToolResult> {
    try {
      if (!input.zoneName || typeof input.zoneName !== 'string') {
        return {
          content: [{ type: "text", text: "zoneName parameter must be a string" }],
          isError: true
        };
      }

      if (!input.name || typeof input.name !== 'string') {
        return {
          content: [{ type: "text", text: "name parameter must be a string" }],
          isError: true
        };
      }

      if (!input.type || typeof input.type !== 'string') {
        return {
          content: [{ type: "text", text: "type parameter must be a string" }],
          isError: true
        };
      }

      if (!input.rrdatas || !Array.isArray(input.rrdatas) || input.rrdatas.length === 0) {
        return {
          content: [{ type: "text", text: "rrdatas parameter must be a non-empty array of strings" }],
          isError: true
        };
      }

      const recordData = {
        name: input.name,
        type: input.type,
        ttl: input.ttl || 300,
        rrdatas: input.rrdatas
      };

      const change = await this.context.client.createRecord(input.zoneName, recordData);
      
      // Wait for the change to complete
      const completedChange = await this.context.client.waitForChange(input.zoneName, change.id!);
      
      const content = `✅ Successfully created DNS record:\n\n` +
        `Name: ${input.name}\n` +
        `Type: ${input.type}\n` +
        `TTL: ${input.ttl || 300}\n` +
        `Data: ${input.rrdatas.join(', ')}\n` +
        `Change ID: ${change.id}\n` +
        `Status: ${completedChange.status}\n` +
        `Started: ${completedChange.startTime ? new Date(completedChange.startTime).toLocaleString() : 'Unknown'}`;

      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error creating DNS record: ${error.message}` }],
        isError: true
      };
    }
  }
}

/**
 * Update an existing DNS record
 */
export class UpdateDNSRecordTool extends Tool {
  name = "gcloud_dns_update_record";
  description = "Update an existing DNS record";

  constructor(private context: DomainsToolsContext) {
    super();
  }

  get inputSchema() {
    return {
      type: "object",
      properties: {
        zoneName: {
          type: "string",
          description: "Name of the managed zone"
        },
        name: {
          type: "string",
          description: "Record name to update"
        },
        type: {
          type: "string",
          description: "Record type"
        },
        ttl: {
          type: "number",
          description: "New TTL in seconds (optional)"
        },
        rrdatas: {
          type: "array",
          items: {
            type: "string"
          },
          description: "New record data values"
        }
      },
      required: ["zoneName", "name", "type", "rrdatas"]
    } as const;
  }

  async execute(input: ToolInput<{ 
    zoneName: string;
    name: string;
    type: string;
    ttl?: number;
    rrdatas: string[];
  }>): Promise<ToolResult> {
    try {
      if (!input.zoneName || typeof input.zoneName !== 'string') {
        return {
          content: [{ type: "text", text: "zoneName parameter must be a string" }],
          isError: true
        };
      }

      // First, get the existing record
      const records = await this.context.client.listRecords(input.zoneName, input.type, input.name);
      const existingRecord = records.find(r => r.name === input.name && r.type === input.type);
      
      if (!existingRecord) {
        return {
          content: [{ type: "text", text: `Record '${input.name}' of type '${input.type}' not found in zone '${input.zoneName}'` }],
          isError: true
        };
      }

      const newRecordData = {
        name: input.name,
        type: input.type,
        ttl: input.ttl,
        rrdatas: input.rrdatas
      };

      const change = await this.context.client.updateRecord(input.zoneName, existingRecord, newRecordData);
      
      // Wait for the change to complete
      const completedChange = await this.context.client.waitForChange(input.zoneName, change.id!);
      
      const content = `✅ Successfully updated DNS record:\n\n` +
        `Name: ${input.name}\n` +
        `Type: ${input.type}\n` +
        `TTL: ${input.ttl || existingRecord.ttl}\n` +
        `Data: ${input.rrdatas.join(', ')}\n` +
        `Change ID: ${change.id}\n` +
        `Status: ${completedChange.status}\n` +
        `Started: ${completedChange.startTime ? new Date(completedChange.startTime).toLocaleString() : 'Unknown'}`;

      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error updating DNS record: ${error.message}` }],
        isError: true
      };
    }
  }
}

/**
 * Delete a DNS record
 */
export class DeleteDNSRecordTool extends Tool {
  name = "gcloud_dns_delete_record";
  description = "Delete a DNS record from a managed zone";

  constructor(private context: DomainsToolsContext) {
    super();
  }

  get inputSchema() {
    return {
      type: "object",
      properties: {
        zoneName: {
          type: "string",
          description: "Name of the managed zone"
        },
        name: {
          type: "string",
          description: "Record name to delete"
        },
        type: {
          type: "string",
          description: "Record type"
        }
      },
      required: ["zoneName", "name", "type"]
    } as const;
  }

  async execute(input: ToolInput<{ 
    zoneName: string;
    name: string;
    type: string;
  }>): Promise<ToolResult> {
    try {
      if (!input.zoneName || typeof input.zoneName !== 'string') {
        return {
          content: [{ type: "text", text: "zoneName parameter must be a string" }],
          isError: true
        };
      }

      // First, get the existing record
      const records = await this.context.client.listRecords(input.zoneName, input.type, input.name);
      const recordToDelete = records.find(r => r.name === input.name && r.type === input.type);
      
      if (!recordToDelete) {
        return {
          content: [{ type: "text", text: `Record '${input.name}' of type '${input.type}' not found in zone '${input.zoneName}'` }],
          isError: true
        };
      }

      // Don't allow deletion of NS or SOA records
      if (input.type === 'NS' || input.type === 'SOA') {
        return {
          content: [{ type: "text", text: `Cannot delete ${input.type} records as they are required for proper DNS functioning` }],
          isError: true
        };
      }

      const change = await this.context.client.deleteRecord(input.zoneName, recordToDelete);
      
      // Wait for the change to complete
      const completedChange = await this.context.client.waitForChange(input.zoneName, change.id!);
      
      const content = `✅ Successfully deleted DNS record:\n\n` +
        `Name: ${input.name}\n` +
        `Type: ${input.type}\n` +
        `TTL: ${recordToDelete.ttl}\n` +
        `Data: ${recordToDelete.rrdatas?.join(', ')}\n` +
        `Change ID: ${change.id}\n` +
        `Status: ${completedChange.status}\n` +
        `Started: ${completedChange.startTime ? new Date(completedChange.startTime).toLocaleString() : 'Unknown'}`;

      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error deleting DNS record: ${error.message}` }],
        isError: true
      };
    }
  }
}

/**
 * Create and export all domain tools for Google Cloud DNS
 */
export function createDomainTools(client: GoogleCloudDNSClient): Tool[] {
  const context = { client };
  
  return [
    new ListManagedZonesTool(context),
    new GetManagedZoneTool(context),
    new ListDNSRecordsTool(context),
    new CreateDNSRecordTool(context),
    new UpdateDNSRecordTool(context),
    new DeleteDNSRecordTool(context)
  ];
}