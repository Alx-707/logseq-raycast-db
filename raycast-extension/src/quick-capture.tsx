/**
 * Quick Capture Command
 *
 * Quickly capture notes, thoughts, or tasks to Logseq.
 * Appends content to the current page in Logseq desktop app.
 */

import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  getPreferenceValues,
  openExtensionPreferences,
  Icon,
  Keyboard,
} from "@raycast/api";
import { useState } from "react";
import { logseqAPI } from "./services";
import type { Preferences, QuickCaptureFormValues } from "./types";

export default function QuickCapture() {
  const preferences = getPreferenceValues<Preferences>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | undefined>();

  async function handleSubmit(values: QuickCaptureFormValues) {
    // Validate content
    if (!values.content.trim()) {
      setContentError("Content cannot be empty");
      return;
    }
    setContentError(undefined);

    setIsSubmitting(true);

    try {
      // Check if API token is configured
      if (!preferences.apiToken) {
        throw new Error(
          "API token not configured. Please set it in extension preferences.\n" +
            "Find your token in Logseq Settings > Features > HTTP APIs Server."
        );
      }

      // Parse tags
      const tags = values.tags
        ?.split(/[,\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Format content with options
      const formattedContent = logseqAPI.formatCaptureContent(values.content, {
        tags,
        priority: values.priority || undefined,
        template: preferences.captureTemplate,
      });

      // Send to Logseq - append to today's journal
      await logseqAPI.appendToJournal(formattedContent, preferences.apiToken);

      await showToast({
        style: Toast.Style.Success,
        title: "Captured!",
        message: "Content added to Logseq",
      });

      // Close the form and return to Raycast root
      await popToRoot();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";

      let userMessage = errorMessage;
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        userMessage =
          "Cannot connect to Logseq HTTP server. Make sure:\n" +
          "1. The HTTP server is running (python3 logseq_server.py)\n" +
          "2. Logseq desktop app is open\n" +
          "3. HTTP API Server is enabled in Logseq settings";
      } else if (errorMessage.includes("API token")) {
        userMessage = errorMessage;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Capture Failed",
        message: userMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function dropContentErrorIfNeeded() {
    if (contentError) {
      setContentError(undefined);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Capture"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            shortcut={Keyboard.Shortcut.Common.Preferences}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="What's on your mind?"
        error={contentError}
        onChange={dropContentErrorIfNeeded}
        autoFocus
      />

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="tag1, tag2, tag3 (optional)"
        info="Comma or space separated tags to add to the capture"
      />

      <Form.Dropdown id="priority" title="Priority" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        <Form.Dropdown.Item value="A" title="🔴 High (A)" />
        <Form.Dropdown.Item value="B" title="🟡 Medium (B)" />
        <Form.Dropdown.Item value="C" title="🟢 Low (C)" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="Note"
        text={
          "Content will be appended to the current page in Logseq.\n" +
          "Make sure Logseq is running with HTTP API Server enabled."
        }
      />
    </Form>
  );
}
