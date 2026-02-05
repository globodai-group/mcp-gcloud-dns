export interface GoogleCloudConfig {
  projectId: string;
  credentials?: string; // Path to service account JSON file or JSON string
}

export interface ManagedZone {
  id?: string;
  name?: string;
  dnsName?: string;
  description?: string;
  nameServers?: string[];
  creationTime?: string;
  labels?: { [key: string]: string };
  visibility?: 'public' | 'private';
  dnssecConfig?: {
    state?: 'off' | 'on' | 'transfer';
    kind?: string;
    nonExistence?: string;
    defaultKeySpecs?: Array<{
      keyType?: 'keySigning' | 'zoneSigning';
      algorithm?: string;
      keyLength?: number;
      kind?: string;
    }>;
  };
}

export interface ResourceRecordSet {
  name?: string;
  type?: string;
  ttl?: number;
  rrdatas?: string[];
  signatureRrdatas?: string[];
  kind?: string;
}

export interface Change {
  id?: string;
  additions?: ResourceRecordSet[];
  deletions?: ResourceRecordSet[];
  startTime?: string;
  status?: 'pending' | 'done';
  kind?: string;
}

export interface CreateRecordInput {
  name: string;
  type: string;
  ttl: number;
  rrdatas: string[];
}

export interface UpdateRecordInput {
  name: string;
  type: string;
  ttl?: number;
  rrdatas: string[];
}

export interface DeleteRecordInput {
  name: string;
  type: string;
}