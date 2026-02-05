# Google Cloud DNS MCP Server

[![npm version](https://badge.fury.io/js/@artik0din%2Fmcp-gcloud-dns.svg)](https://badge.fury.io/js/@artik0din%2Fmcp-gcloud-dns)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/)

A comprehensive [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for managing Google Cloud DNS managed zones and records via the Google Cloud DNS API. This server enables AI assistants like Claude to manage DNS infrastructure directly through Google Cloud's robust DNS service.

## Features

### 🌐 Managed Zone Operations
- **List Zones**: View all DNS managed zones in your project
- **Zone Details**: Get comprehensive zone information including name servers and DNSSEC status
- **Zone Visibility**: Support for both public and private zones

### 📝 DNS Record Management
- **Full CRUD**: Complete create, read, update, delete operations for DNS records
- **Record Types**: Support for A, AAAA, CNAME, MX, NS, SOA, PTR, SRV, TXT, CAA
- **Smart Filtering**: Filter records by type or name
- **TTL Management**: Full control over time-to-live settings
- **Batch Changes**: Atomic operations with change tracking

### 🛡️ Enterprise Security
- **Service Account Auth**: Secure service account-based authentication
- **IAM Integration**: Leverages Google Cloud IAM for fine-grained permissions
- **Audit Trail**: All changes tracked through Google Cloud's audit logging
- **DNSSEC Support**: Full support for DNSSEC-enabled zones

### ⚡ Performance & Reliability
- **Global Infrastructure**: Built on Google Cloud's global DNS network
- **Change Tracking**: Monitor and wait for DNS propagation
- **Error Handling**: Comprehensive error handling with clear messages
- **Type Safety**: Full TypeScript support

## Quick Start

Run the server directly with npx (requires Node.js 18+):

```bash
npx @artik0din/mcp-gcloud-dns
```

Or install locally:

```bash
npm install -g @artik0din/mcp-gcloud-dns
mcp-gcloud-dns
```

## Environment Variables

Create a `.env` file in your working directory:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLOUD_PROJECT_ID` | ✅ | Your Google Cloud project ID |
| `GOOGLE_CLOUD_CREDENTIALS` | ✅ | Service account JSON credentials as a string |

### Setting Up Google Cloud Credentials

#### 1. Create a Service Account

1. Go to [Google Cloud Console > IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **"Create Service Account"**
3. Enter a name (e.g., `dns-mcp-server`)
4. Click **"Create and Continue"**

#### 2. Grant DNS Permissions

Grant one of these roles to your service account:
- **DNS Administrator** (full access) - `roles/dns.admin`
- **Custom Role** with these permissions:
  - `dns.managedZones.list`
  - `dns.managedZones.get`
  - `dns.resourceRecordSets.list`
  - `dns.changes.create`
  - `dns.changes.get`

#### 3. Create and Download Key

1. Click on your service account
2. Go to **"Keys"** tab
3. Click **"Add Key" > "Create new key"**
4. Choose **JSON** format
5. Download the key file

#### 4. Set Environment Variables

```bash
# Your project ID
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"

# Service account JSON as a string (escape quotes)
export GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"your-project",...}'
```

## MCP Client Configuration

### Claude Desktop

Add this to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "google-cloud-dns": {
      "command": "npx",
      "args": ["@artik0din/mcp-gcloud-dns"],
      "env": {
        "GOOGLE_CLOUD_PROJECT_ID": "your-project-id",
        "GOOGLE_CLOUD_CREDENTIALS": "{\"type\":\"service_account\",\"project_id\":\"your-project\",...}"
      }
    }
  }
}
```

### Other MCP Clients

Use the command `npx @artik0din/mcp-gcloud-dns` with the appropriate environment variables set.

## Available Tools

### gcloud_dns_list_zones
List all DNS managed zones in your Google Cloud project.

**Parameters:** None

**Example:**
```
List all my Google Cloud DNS zones
Show all managed zones in the project
```

### gcloud_dns_get_zone
Get detailed information about a specific managed zone.

**Parameters:**
- `zoneName` (string, required): Managed zone name (not the DNS name)

**Example:**
```
Get details for zone my-example-zone
Show information about production-dns-zone
```

### gcloud_dns_list_records
List DNS records in a managed zone with optional filtering.

**Parameters:**
- `zoneName` (string, required): Managed zone name
- `type` (string, optional): Filter by record type (A, AAAA, CNAME, MX, TXT, etc.)
- `name` (string, optional): Filter by record name (must include trailing dot)

**Example:**
```
List all records in zone my-example-zone
Show A records in zone production-dns
Get records for www.example.com. in zone my-zone
```

### gcloud_dns_create_record
Create a new DNS record in a managed zone.

**Parameters:**
- `zoneName` (string, required): Managed zone name
- `name` (string, required): Record name (must end with zone's DNS name and trailing dot)
- `type` (string, required): Record type (A, AAAA, CNAME, MX, TXT, etc.)
- `ttl` (number, optional): TTL in seconds (defaults to 300)
- `rrdatas` (array, required): Array of record data values

**Example:**
```
Create A record for www.example.com. pointing to 1.2.3.4 in zone my-zone
Add CNAME record for blog.example.com. pointing to www.example.com. with TTL 3600
Create MX record for example.com. with priority 10 pointing to mail.example.com.
```

### gcloud_dns_update_record
Update an existing DNS record.

**Parameters:**
- `zoneName` (string, required): Managed zone name
- `name` (string, required): Record name to update
- `type` (string, required): Record type
- `ttl` (number, optional): New TTL in seconds
- `rrdatas` (array, required): New record data values

**Example:**
```
Update A record for www.example.com. to point to 5.6.7.8 in zone my-zone
Change TTL of CNAME record blog.example.com. to 7200 seconds
Update MX record for example.com. to use new mail server
```

### gcloud_dns_delete_record
Delete a DNS record from a managed zone.

**Parameters:**
- `zoneName` (string, required): Managed zone name
- `name` (string, required): Record name to delete
- `type` (string, required): Record type

**Example:**
```
Delete A record for old.example.com. from zone my-zone
Remove CNAME record for staging.example.com.
Delete TXT record for verification.example.com.
```

## DNS Record Types

The server supports all standard DNS record types available in Google Cloud DNS:

- **A**: IPv4 address records
- **AAAA**: IPv6 address records
- **CNAME**: Canonical name records (aliases)
- **MX**: Mail exchange records
- **NS**: Name server records
- **SOA**: Start of authority records (managed by Google Cloud)
- **PTR**: Pointer records (reverse DNS)
- **SRV**: Service records
- **TXT**: Text records (SPF, DKIM, verification, etc.)
- **CAA**: Certification Authority Authorization records

## Important Notes

### DNS Name Format
- All DNS names **must end with a trailing dot** (e.g., `www.example.com.`)
- Names must be within the zone's DNS namespace
- Use `@` or the zone's DNS name for apex records

### Change Propagation
- DNS changes are processed asynchronously by Google Cloud
- The server waits for changes to complete before returning
- Changes typically propagate within seconds to minutes globally

### Record Restrictions
- Cannot delete NS or SOA records (required for DNS functionality)
- CNAME records cannot coexist with other record types for the same name
- MX and SRV records require priority values

## Security Considerations

- **Service Account Security**: Store service account keys securely
- **Least Privilege**: Grant minimal required DNS permissions
- **Key Rotation**: Rotate service account keys regularly
- **Environment Variables**: Never commit credentials to version control
- **Project Isolation**: Use separate projects for different environments

## Error Handling

The server provides detailed error messages for common scenarios:

- **Authentication errors**: Check service account credentials and permissions
- **Zone not found**: Verify zone name and project access
- **Record conflicts**: CNAME conflicts, duplicate records
- **Invalid data**: Malformed DNS names, invalid IP addresses
- **Permission denied**: Insufficient IAM permissions
- **Quota exceeded**: Google Cloud API quotas

## Development

```bash
# Clone the repository
git clone https://github.com/artik0din/mcp-gcloud-dns.git
cd mcp-gcloud-dns

# Install dependencies
npm install

# Build the project
npm run build

# Run locally
npm start
```

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Verify GOOGLE_CLOUD_CREDENTIALS is valid JSON
   - Check service account has DNS permissions
   - Ensure project ID is correct

2. **"Zone not found"**
   - Check zone name (use zone name, not DNS name)
   - Verify zone exists in the specified project
   - Ensure service account has access to the zone

3. **"Record already exists"**
   - Use update operation instead of create
   - Check for CNAME conflicts
   - Verify exact record name and type

## API Compatibility

This server uses **Google Cloud DNS REST API v1**. It supports:
- All managed zone operations
- All DNS record types supported by Cloud DNS
- Change tracking and status monitoring
- Both public and private zones

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

Built with:
- [Model Context Protocol SDK](https://modelcontextprotocol.io/)
- [Google Cloud DNS API](https://cloud.google.com/dns/docs/reference/v1/)
- [Google Cloud IAM](https://cloud.google.com/iam/docs)