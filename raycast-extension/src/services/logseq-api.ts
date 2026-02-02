/**
 * Logseq HTTP API Service
 *
 * Provides a unified interface to communicate with the Logseq HTTP server.
 * Supports both read (search, query, list) and write (append) operations.
 */

import { getPreferenceValues } from "@raycast/api";
import type {
  Preferences,
  SearchResponse,
  ListGraphsResponse,
  AppendResponse,
  QueryResponse,
  LogseqPage,
} from "../types";

class LogseqAPIService {
  private serverUrl: string;
  private apiToken?: string;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.serverUrl = preferences.serverUrl || "http://localhost:8765";
    this.apiToken = preferences.apiToken;
  }

  /**
   * Refresh preferences (call after user changes settings)
   */
  refreshPreferences(): void {
    const preferences = getPreferenceValues<Preferences>();
    this.serverUrl = preferences.serverUrl || "http://localhost:8765";
    this.apiToken = preferences.apiToken;
  }

  /**
   * Build full URL for an endpoint
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.serverUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  /**
   * Make a GET request
   */
  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Make a POST request
   */
  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check server health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get<{ status: string }>("/health");
      return response.status === "healthy";
    } catch {
      return false;
    }
  }

  /**
   * List all available graphs
   */
  async listGraphs(): Promise<string[]> {
    const response = await this.get<ListGraphsResponse>("/list");

    if (!response.success) {
      throw new Error(response.error || "Failed to fetch graphs");
    }

    // Parse graph names from stdout
    const lines = (response.stdout || "").split("\n");
    const graphNames = lines
      .filter(
        (line) =>
          line.trim() &&
          !line.includes(":") &&
          line.trim() !== "DB Graphs" &&
          line.trim() !== "File Graphs"
      )
      .map((line) => line.trim());

    return graphNames;
  }

  /**
   * Search pages in a graph
   */
  async search(query: string, graph: string, maxResults?: number): Promise<LogseqPage[]> {
    const response = await this.get<SearchResponse>("/search", {
      q: query,
      graph: graph,
    });

    if (!response.success) {
      throw new Error(response.error || response.stderr || "Search failed");
    }

    const pages = response.data || [];
    return maxResults ? pages.slice(0, maxResults) : pages;
  }

  /**
   * Execute a Datalog query
   */
  async query(datalogQuery: string, graph: string): Promise<unknown> {
    const response = await this.post<QueryResponse>("/query", {
      query: datalogQuery,
      graph: graph,
    });

    if (!response.success) {
      throw new Error(response.error || response.stderr || "Query failed");
    }

    return response.data;
  }

  /**
   * Append content to the current page in Logseq
   *
   * Note: This requires:
   * 1. Logseq desktop app to be running
   * 2. HTTP API Server enabled in Logseq settings
   * 3. Valid API token configured
   */
  async append(content: string, token?: string): Promise<void> {
    const apiToken = token || this.apiToken;

    const body: Record<string, string> = { content };
    if (apiToken) {
      body.token = apiToken;
    }

    const response = await this.post<AppendResponse>("/append", body);

    if (!response.success) {
      throw new Error(response.error || "Failed to append content");
    }
  }

  /**
   * Append content to today's journal in Logseq
   *
   * This method uses the Logseq native API to append directly to today's journal,
   * regardless of what page is currently open in Logseq.
   */
  async appendToJournal(content: string, token?: string): Promise<void> {
    const apiToken = token || this.apiToken;

    const body: Record<string, string> = { content };
    if (apiToken) {
      body.token = apiToken;
    }

    const response = await this.post<AppendResponse>("/append-to-journal", body);

    if (!response.success) {
      throw new Error(response.error || "Failed to append to journal");
    }
  }

  /**
   * Format content for capture with optional tags and priority
   */
  formatCaptureContent(
    content: string,
    options?: {
      tags?: string[];
      priority?: string;
      template?: string;
    }
  ): string {
    let formatted = content;

    // Add tags
    if (options?.tags && options.tags.length > 0) {
      const tagString = options.tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ");
      formatted = `${formatted} ${tagString}`;
    }

    // Add priority marker if specified
    if (options?.priority) {
      formatted = `[#${options.priority}] ${formatted}`;
    }

    // Apply template if provided
    if (options?.template && options.template !== "{content}") {
      formatted = options.template.replace("{content}", formatted);
    }

    return formatted;
  }
}

// Singleton instance
export const logseqAPI = new LogseqAPIService();

// Export class for testing
export { LogseqAPIService };
