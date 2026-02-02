/**
 * Capture to Journal Command
 *
 * Quick capture with minimal UI - just a text field.
 * Perfect for rapid note-taking with a keyboard shortcut.
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
  showHUD,
} from "@raycast/api";
import { useState } from "react";
import { logseqAPI } from "./services";
import type { Preferences } from "./types";

export default function CaptureToJournal() {
  const preferences = getPreferenceValues<Preferences>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { content: string }) {
    if (!values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty content",
        message: "Please enter some content to capture",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!preferences.apiToken) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Token Required",
          message: "Press ⌘+Shift+, to open settings and add your Logseq API token",
          primaryAction: {
            title: "Open Settings",
            onAction: () => openExtensionPreferences(),
          },
        });
        setIsSubmitting(false);
        return;
      }

      // Simple format: just the content
      const formattedContent = values.content;

      await logseqAPI.appendToJournal(formattedContent, preferences.apiToken);

      // Use HUD for faster feedback
      await showHUD("✓ Captured to journal");
      await popToRoot();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      await showToast({
        style: Toast.Style.Failure,
        title: "Capture Failed",
        message: errorMessage,
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
          <Action.SubmitForm
            title="Capture"
            icon={Icon.Calendar}
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
      <Form.TextField
        id="content"
        title=""
        placeholder="Quick note to today's journal..."
        autoFocus
      />
      <Form.Description
        title=""
        text="Press Enter to capture to the current page in Logseq"
      />
    </Form>
  );
}
