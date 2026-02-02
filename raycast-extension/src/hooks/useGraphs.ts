/**
 * useGraphs Hook
 *
 * Manages graph selection with LocalStorage persistence.
 * Provides list of available graphs and handles graph switching.
 */

import { LocalStorage } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { logseqAPI } from "../services";

const STORAGE_KEY = "selected-graph";

interface UseGraphsResult {
  graphs: string[];
  selectedGraph: string;
  setSelectedGraph: (graph: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  refresh: () => Promise<void>;
}

export function useGraphs(): UseGraphsResult {
  const [graphs, setGraphs] = useState<string[]>([]);
  const [selectedGraph, setSelectedGraphState] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialGraph, setInitialGraph] = useState<string | null>(null);

  const fetchGraphs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const graphNames = await logseqAPI.listGraphs();
      setGraphs(graphNames);

      // Load saved graph selection from LocalStorage
      const savedGraph = await LocalStorage.getItem<string>(STORAGE_KEY);

      let graphToUse = "";
      if (savedGraph && graphNames.includes(savedGraph)) {
        // Use saved graph from previous session
        graphToUse = savedGraph;
      } else if (graphNames.length > 0) {
        // No saved selection - default to first graph
        graphToUse = graphNames[0];
      }

      setInitialGraph(graphToUse);
      setSelectedGraphState(graphToUse);
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError")
      ) {
        setError("Cannot connect to Logseq HTTP server. Make sure it's running.");
      } else {
        setError(`Failed to load graphs: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGraphs();
  }, [fetchGraphs]);

  // Handle graph selection change
  const setSelectedGraph = useCallback(
    async (newGraph: string) => {
      // Prevent setting during initialization if it's the same value
      if (!isInitialized && newGraph === initialGraph) {
        return;
      }

      setSelectedGraphState(newGraph);

      // Save to LocalStorage
      if (isInitialized) {
        await LocalStorage.setItem(STORAGE_KEY, newGraph);
      }
    },
    [isInitialized, initialGraph]
  );

  return {
    graphs,
    selectedGraph,
    setSelectedGraph,
    isLoading,
    error,
    isInitialized,
    refresh: fetchGraphs,
  };
}
