/**
 * Quick Capture Command
 *
 * Quickly capture notes, thoughts, or tasks to Logseq.
 * Appends content to today's journal in Logseq.
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
import { useState, useMemo } from "react";
import { logseqAPI } from "./services";
import type { Preferences, QuickCaptureFormValues } from "./types";

export default function QuickCapture() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | undefined>();

  async function handleSubmit(values: QuickCaptureFormValues) {
    if (!values.content.trim()) {
      setContentError("Content cannot be empty");
      return;
    }
    setContentError(undefined);
    setIsSubmitting(true);

    try {
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

      await logseqAPI.appendToJournal(formattedContent);

      await showToast({
        style: Toast.Style.Success,
        title: "Captured!",
        message: "Content added to today's journal",
      });

      await popToRoot();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      let userMessage = errorMessage;
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        userMessage =
          "Cannot connect to Logseq HTTP server. Make sure:\n" +
          "1. The HTTP server is running (python3 logseq_server.py)\n" +
          "2. Logseq desktop app is open\n" +
          "3. HTTP API Server is enabled in Logseq settings";
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Capture Failed",
        message: userMessage,
        primaryAction: errorMessage.includes("API token")
          ? { title: "Open Settings", onAction: () => openExtensionPreferences() }
          : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture" icon={Icon.Plus} onSubmit={handleSubmit} />
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
        onChange={() => contentError && setContentError(undefined)}
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
        text="Content will be appended to today's journal in Logseq."
      />
    </Form>
  );
}
