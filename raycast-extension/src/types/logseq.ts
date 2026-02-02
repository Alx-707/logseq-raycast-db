/**
 * Logseq types for Raycast extension
 */

// Page/Block types from Logseq DB
export interface LogseqPage {
  "block/uuid": string;
  "block/title": string;
  "block/name": string;
  "db/id": number;
  "block/journal-day"?: number;
}

// API Response types
export interface BaseResponse {
  success: boolean;
  error?: string;
  stderr?: string;
}

export interface SearchResponse extends BaseResponse {
  data?: LogseqPage[];
}

export interface ListGraphsResponse extends BaseResponse {
  stdout?: string;
}

export interface AppendResponse extends BaseResponse {
  message?: string;
}

export interface QueryResponse extends BaseResponse {
  data?: unknown;
  stdout?: string;
}

// Preferences types
export interface Preferences {
  serverUrl: string;
  graphName?: string;
  maxResults: string;
  apiToken?: string;
  defaultCapturePage?: string;
  captureTemplate?: string;
}

// Quick Capture specific types
export interface QuickCaptureFormValues {
  content: string;
  tags?: string;
  priority?: "A" | "B" | "C" | "";
}

export interface CaptureOptions {
  content: string;
  tags?: string[];
  priority?: string;
  template?: string;
}
