/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Server URL - URL of the Logseq HTTP server */
  "serverUrl": string,
  /** Default Graph Name - Default graph name - you can also select from the dropdown in the search interface */
  "graphName"?: string,
  /** Max Search Results - Maximum number of search results to display */
  "maxResults": string,
  /** Logseq API Token - Token for Logseq HTTP API Server (required for Quick Capture). Find it in Logseq Settings > Features > HTTP APIs Server. */
  "apiToken"?: string,
  /** Capture Template - Template for captured content. Use {content} as placeholder. */
  "captureTemplate": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-logseq` command */
  export type SearchLogseq = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-capture` command */
  export type QuickCapture = ExtensionPreferences & {}
  /** Preferences accessible in the `capture-to-journal` command */
  export type CaptureToJournal = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-logseq` command */
  export type SearchLogseq = {}
  /** Arguments passed to the `quick-capture` command */
  export type QuickCapture = {}
  /** Arguments passed to the `capture-to-journal` command */
  export type CaptureToJournal = {}
}

