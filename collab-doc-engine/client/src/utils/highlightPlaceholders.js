/**
 * Req 9.5 — Highlight placeholder text in Quill editor.
 * Scans for patterns like [Placeholder Text] and applies a yellow background.
 */
export function highlightPlaceholders(quill) {
  if (!quill) return;
  const text = quill.getText();
  const regex = /\[([^\]]+)\]/g;
  let match;
  // Remove existing placeholder formatting first
  quill.formatText(0, text.length, { background: false }, 'silent');
  while ((match = regex.exec(text)) !== null) {
    quill.formatText(match.index, match[0].length, { background: '#fff3cd' }, 'silent');
  }
}
