import type { GenericRecord } from '../types/database';

class ApiClient {
  public getBaseUrl(): string {
    return '/api';
  }

  public async checkHealth(): Promise<{
    status: string;
    server?: string;
    database?: string;
    mysqlConnected?: boolean;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err: unknown) {
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Server tidak terjangkau',
      };
    }
  }

  public async getRecords<T>(
    kind?: string,
    includeDeleted = false,
    tenantId?: string
  ): Promise<GenericRecord<T>[] | null> {
    try {
      const params = new URLSearchParams();
      if (kind) params.set('kind', kind);
      if (includeDeleted) params.set('includeDeleted', 'true');
      if (tenantId) params.set('tenantId', tenantId);

      const res = await fetch(`${this.getBaseUrl()}/records?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data as GenericRecord<T>[];
      }
      return null;
    } catch {
      return null;
    }
  }

  public async getRecordById<T>(id: string): Promise<GenericRecord<T> | null> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/records/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && json.data) {
        return json.data as GenericRecord<T>;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async saveRecord<T>(record: {
    id: string;
    kind: string;
    data: T;
    updatedAt: number;
    deleted: 0 | 1;
    tenantId?: string;
    userId?: string;
  }): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async deleteRecord(id: string, soft = true): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.getBaseUrl()}/records/${encodeURIComponent(id)}?hard=${!soft}`,
        {
          method: 'DELETE',
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  public async countRecords(kind: string, tenantId?: string): Promise<number | null> {
    try {
      const params = new URLSearchParams();
      params.set('kind', kind);
      if (tenantId) params.set('tenantId', tenantId);

      const res = await fetch(`${this.getBaseUrl()}/records-count?${params.toString()}`);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && typeof json.count === 'number') {
        return json.count;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();
