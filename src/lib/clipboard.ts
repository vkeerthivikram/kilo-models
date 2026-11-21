export class ClipboardTimeoutError extends Error {}

export async function writeClipboardText(text: string): Promise<void> {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    // Invoke writeText in the click handler's user activation.
    const write = navigator.clipboard.writeText(text);
    await Promise.race([write, new Promise<never>((_, reject) => {
      deadline = setTimeout(() => reject(new ClipboardTimeoutError("Clipboard access timed out.")), 8000);
    })]);
  } finally {
    clearTimeout(deadline);
  }
}
