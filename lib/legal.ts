// Facts the legal pages share, kept in one place so a change is made once.
export const LEGAL = {
  brand: "Natlovers",
  email: "natlovers@gmail.com",
  address: "Jl. Tata Bumi Selatan No.107, Banyuraden, Gamping, Sleman, Yogyakarta, Indonesia",
  // Update this date whenever the wording of any legal page changes.
  updated: "6 November 2026"
} as const;

export const LEGAL_LINKS = [
  {href: "/terms", label: "Terms of Service"},
  {href: "/returns", label: "Returns & Shipping"},
  {href: "/privacy", label: "Privacy Policy"}
] as const;
