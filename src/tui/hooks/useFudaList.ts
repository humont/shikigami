import { useState, useEffect, useCallback } from "react";
import { type Fuda, type FudaStatus } from "../../types";
import { runList, type ListOptions } from "../../cli/commands/list";

export interface UseFudaListOptions {
  status?: FudaStatus;
  limit?: number;
  all?: boolean;
}

export interface UseFudaListResult {
  fudas: Fuda[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

/**
 * React hook for fetching and managing a list of fuda.
 * Supports filtering by status, limit, and all flag.
 * Provides refresh functionality.
 */
export function useFudaList(options: UseFudaListOptions = {}): UseFudaListResult {
  const [fudas, setFudas] = useState<Fuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const fetchFudas = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    const listOptions: ListOptions = {};
    if (options.status) listOptions.status = options.status;
    if (options.limit) listOptions.limit = options.limit;
    if (options.all) listOptions.all = options.all;

    const result = await runList(listOptions);

    if (result.success) {
      setFudas(result.fudas || []);
    } else {
      setError(result.error);
      setFudas([]);
    }

    setLoading(false);
  }, [options.status, options.limit, options.all]);

  useEffect(() => {
    fetchFudas();
  }, [fetchFudas]);

  return {
    fudas,
    loading,
    error,
    refresh: fetchFudas,
  };
}
