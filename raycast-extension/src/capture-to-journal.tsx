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
  openExtensionPreferences,
  Icon,
  Keyboard,
  showHUD,
} from "@raycast/api";
import { useState } from "react";
import { logseqAPI } from "./services";

export default function CaptureToJournal() {
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
      await logseqAPI.appendToJournal(values.content);
      await showHUD("✓ Captured to journal");
      await popToRoot();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      await showToast({
        style: Toast.Style.Failure,
        title: "Capture Failed",
        message: errorMessage,
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
          <Action.SubmitForm title="Capture" icon={Icon.Calendar} onSubmit={handleSubmit} />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            shortcut={Keyboard.Shortcut.Common.Preferences}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="content" title="" placeholder="Quick note to today's journal..." autoFocus />
      <Form.Description title="" text="Press Enter to capture to today's journal in Logseq" />
    </Form>
  );
}
