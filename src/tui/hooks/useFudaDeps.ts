import { useState, useEffect, useCallback } from "react";
import { type FudaDependency } from "../../types";
import { runDepsTree } from "../../cli/commands/deps/tree";
import {
  runDepsBlocked,
  type BlockingFuda,
} from "../../cli/commands/deps/blocked";

export interface UseFudaDepsOptions {
  id: string;
  depth?: number;
}

export interface UseFudaDepsResult {
  tree: Record<string, FudaDependency[]>;
  blocking: BlockingFuda[];
  hasBlockers: boolean;
  blockerCount: number;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

/**
 * React hook for fetching and managing fuda dependencies.
 * Fetches both the dependency tree and blocking dependencies in parallel.
 * Provides computed properties and refresh functionality.
 */
export function useFudaDeps(options: UseFudaDepsOptions): UseFudaDepsResult {
  const [tree, setTree] = useState<Record<string, FudaDependency[]>>({});
  const [blocking, setBlocking] = useState<BlockingFuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const fetchDeps = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    const [treeResult, blockedResult] = await Promise.all([
      runDepsTree({ id: options.id, depth: options.depth }),
      runDepsBlocked({ id: options.id }),
    ]);

    if (!treeResult.success) {
      setError(treeResult.error);
      setTree({});
      setBlocking([]);
      setLoading(false);
      return;
    }

    if (!blockedResult.success) {
      setError(blockedResult.error);
      setTree({});
      setBlocking([]);
      setLoading(false);
      return;
    }

    setTree(treeResult.tree || {});
    setBlocking(blockedResult.blocking || []);
    setLoading(false);
  }, [options.id, options.depth]);

  useEffect(() => {
    fetchDeps();
  }, [fetchDeps]);

  return {
    tree,
    blocking,
    hasBlockers: blocking.length > 0,
    blockerCount: blocking.length,
    loading,
    error,
    refresh: fetchDeps,
  };
}
