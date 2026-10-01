/**
 * テキストをクリップボードへコピーし、成否を返す。
 * Clipboard API は安全なコンテキスト（HTTPS / localhost）でのみ利用できるため、
 * 利用不可・書き込み失敗時は false を返して表示の切り替えを呼び出し側に委ねる
 * （非推奨の `document.execCommand("copy")` へのフォールバックは行わない）。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
