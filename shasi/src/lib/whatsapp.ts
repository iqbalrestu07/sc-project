/**
 * Default WhatsApp number used when no organization-specific number is
 * configured in CMS contact settings. Kept in sync with the original
 * hardcoded value across landing components.
 */
export const DEFAULT_WHATSAPP_NUMBER = "6282123523139";

const DEFAULT_MESSAGE =
  "Halo Shasi Beauty Care! Saya lihat informasi di website dan tertarik dengan layanannya.";

/**
 * Builds a `https://wa.me/<number>?text=<message>` URL.
 * - `number` should be digits only (country code + number, no `+`).
 * - Falls back to the project default number when empty.
 * - `message` is optional and defaults to the standard greeting.
 */
export function buildWhatsAppUrl(
  number?: string | null,
  message: string = DEFAULT_MESSAGE
): string {
  const normalized = (number ?? "").replace(/[^\d]/g, "");
  const finalNumber = normalized || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Returns the raw WhatsApp number (digits only), falling back to the
 * project default when the input is empty. Useful for display labels
 * such as "+62 821 2352 3139".
 */
export function resolveWhatsAppNumber(number?: string | null): string {
  const normalized = (number ?? "").replace(/[^\d]/g, "");
  return normalized || DEFAULT_WHATSAPP_NUMBER;
}
