import { useState, useEffect, useCallback } from "react";
import type { AuditEntry } from "../../db/audit";
import { runLog, runLogAll } from "../../cli/commands/log";

export interface UseAuditLogOptions {
  fudaId?: string;
  limit?: number;
}

export interface UseAuditLogResult {
  entries: AuditEntry[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

/**
 * React hook for fetching and managing audit log entries.
 * Supports filtering by fudaId and limit.
 * Provides refresh functionality.
 */
export function useAuditLog(options: UseAuditLogOptions = {}): UseAuditLogResult {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    let result;
    if (options.fudaId) {
      result = await runLog({ id: options.fudaId, limit: options.limit });
    } else {
      result = await runLogAll({ limit: options.limit });
    }

    if (result.success) {
      setEntries(result.entries || []);
    } else {
      setError(result.error);
      setEntries([]);
    }

    setLoading(false);
  }, [options.fudaId, options.limit]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    error,
    refresh: fetchEntries,
  };
}
