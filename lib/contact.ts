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


// A saved phone number, made ready for the phone field. Numbers were stored however the customer typed them
// ("0812 2697 007", "62812...", "+62 812..."), and the field wants the international form. A number with no
// country code is taken as Indonesian, which is where the shop is.
export function phoneForInput(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  if (digits.startsWith("62")) return `+${digits}`;
  return `+62${digits}`;
}
