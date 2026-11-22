/**
 * Builds a direct or composer WhatsApp URL.
 * If phone is a valid 10-digit Indian mobile (after stripping spaces, dashes,
 * and a leading +91 or 0), returns:
 *   https://wa.me/91<digits>?text=<encodeURIComponent(text)>
 * Otherwise, returns:
 *   https://wa.me/?text=<encodeURIComponent(text)>
 */
export function buildWhatsAppLink(text: string, phone?: string | null): string {
  const encodedText = encodeURIComponent(text);

  if (!phone || typeof phone !== 'string') {
    return `https://wa.me/?text=${encodedText}`;
  }

  // Strip spaces, dashes, and whitespace
  let cleaned = phone.replace(/[\s-]/g, '').trim();

  // Strip a leading +91 or 0
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  cleaned = cleaned.replace(/[\s-]/g, '');

  // Valid 10-digit Indian mobile starting with 6, 7, 8 or 9
  const isValidIndianMobile = /^[6-9]\d{9}$/.test(cleaned);

  if (isValidIndianMobile) {
    return `https://wa.me/91${cleaned}?text=${encodedText}`;
  }

  return `https://wa.me/?text=${encodedText}`;
}
