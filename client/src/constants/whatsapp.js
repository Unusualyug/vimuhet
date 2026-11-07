/**
 * WhatsApp direct-contact configuration.
 *
 * A single source of truth so the header link, the floating button and the
 * contact page can never drift apart.
 *
 * The number is stored in full international form without punctuation, which is
 * what wa.me expects: country code + number, no `+`, no spaces.
 */

/** Business WhatsApp number: +91 81402 14051 */
export const WHATSAPP_NUMBER = '918140214051';

/** Human-readable form for display next to the icon. */
export const WHATSAPP_DISPLAY = '+91 81402 14051';

/** Default message, pre-filled and fully editable by the visitor before sending. */
export const WHATSAPP_DEFAULT_MESSAGE =
  'Hello! I visited your website and would like to know more about your products and services.';

/**
 * Build a wa.me link.
 *
 * wa.me is the universal deep link: on a phone it opens the WhatsApp app, on a
 * desktop it opens WhatsApp Web (or offers the desktop app). `?text=` pre-fills
 * the composer — the visitor can still edit or delete it before sending.
 */
export function whatsappLink(message = WHATSAPP_DEFAULT_MESSAGE, number = WHATSAPP_NUMBER) {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** The link used by every entry point on the site. */
export const WHATSAPP_LINK = whatsappLink();
