/**
 * Safe clipboard helper with automatic fallback for non-secure contexts (e.g., LAN HTTP).
 * Works across modern browsers, iframe sandboxes, and insecure local network environments.
 */
export async function copyText(text: string): Promise<boolean> {
  // 1. Try modern Async Clipboard API if available and in secure context
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // If permission was denied or failed (e.g. non-focused document or insecure context), proceed to fallback
  }

  // 2. Fallback to execCommand('copy') via temporary textarea
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      // Prevent scrolling to bottom of page in iOS/Safari
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return Boolean(successful);
    }
  } catch (err) {
    console.warn('[Clipboard] Fallback execCommand gagal:', err);
  }

  return false;
}
