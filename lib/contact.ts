// Shared customer-contact helpers. Client-safe (no DB, no mail client), so
// both the account page and the studio's admin views can build the same link
// from the same rules rather than each carrying its own copy.

// Indonesian numbers are stored however the customer typed them  -  with
// spaces, with a leading 0, sometimes already in +62 form. wa.me accepts
// only digits in international format, so normalising is what makes a saved
// phone number actually clickable.
export function toWhatsAppLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;
  const withCountryCode = withoutLeadingZero.startsWith("62") ? withoutLeadingZero : `62${withoutLeadingZero}`;
  const base = `https://wa.me/${withCountryCode}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function toMailtoLink(email: string, subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return query ? `mailto:${email}?${query}` : `mailto:${email}`;
}
