/**
 * Search Logseq
 *
 * Search pages across your Logseq graphs.
 * Uses the shared logseqAPI service and useGraphs hook.
 */

import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { logseqAPI } from "./services";
import { useGraphs } from "./hooks/useGraphs";
import type { Preferences, LogseqPage } from "./types";

export default function SearchLogseq() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const maxResults = useMemo(() => {
    const parsed = parseInt(preferences.maxResults || "20", 10);
    return isNaN(parsed) || parsed < 1 ? 20 : Math.min(parsed, 100);
  }, [preferences.maxResults]);

  const { graphs, selectedGraph, setSelectedGraph, isLoading: isLoadingGraphs, error: graphError } = useGraphs();

  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<LogseqPage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Search when text or graph changes
  useEffect(() => {
    if (!searchText.trim() || !selectedGraph) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const pages = await logseqAPI.search(searchText, selectedGraph, maxResults);
        if (!controller.signal.aborted) {
          setResults(pages);
          if (pages.length === 0) {
            setSearchError("No results found");
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const msg = err instanceof Error ? err.message : "Search failed";
          setSearchError(msg);
          setResults([]);
          await showToast({ style: Toast.Style.Failure, title: "Search failed", message: msg });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchText, selectedGraph, maxResults]);

  // Clear results when graph changes
  const handleGraphChange = async (graph: string) => {
    await setSelectedGraph(graph);
    setResults([]);
    setSearchText("");
  };

  const openInLogseq = (page: LogseqPage) =>
    `logseq://graph/${encodeURIComponent(selectedGraph)}?block-id=${page["block/uuid"]}`;

  const error = graphError || searchError;

  return (
    <List
      isLoading={isSearching || isLoadingGraphs}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={selectedGraph ? `Search in ${selectedGraph}...` : "Loading graphs..."}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Graph" value={selectedGraph} onChange={handleGraphChange} isLoading={isLoadingGraphs}>
          {graphs.length === 0 ? (
            <List.Dropdown.Item title="No graphs available" value="" />
          ) : (
            graphs.map((g) => <List.Dropdown.Item key={g} title={g} value={g} />)
          )}
        </List.Dropdown>
      }
      throttle
    >
      {error && !isSearching ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      ) : searchText && !isSearching && results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description={selectedGraph ? `No pages matching "${searchText}" in ${selectedGraph}` : "No graph selected"}
        />
      ) : !searchText ? (
        <List.EmptyView
          icon={Icon.Book}
          title="Search Logseq"
          description={selectedGraph ? `Start typing to search pages in ${selectedGraph}` : "Select a graph and start typing"}
        />
      ) : (
        results.map((page) => (
          <List.Item
            key={page["block/uuid"]}
            title={page["block/title"] || page["block/name"]}
            subtitle={page["block/name"] !== page["block/title"] ? page["block/name"] : undefined}
            accessories={[
              {
                tag: page["block/journal-day"] ? "Journal" : undefined,
                icon: page["block/journal-day"] ? Icon.Calendar : Icon.Document,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Logseq" url={openInLogseq(page)} icon={Icon.Book} />
                <Action.CopyToClipboard
                  title="Copy Page Link"
                  content={openInLogseq(page)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Page Title"
                  content={page["block/title"]}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Open Preferences"
                  onAction={openExtensionPreferences}
                  icon={Icon.Gear}
                  shortcut={{ modifiers: ["cmd"], key: "," }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
