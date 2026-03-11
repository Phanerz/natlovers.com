import {Locale} from "@/lib/site";

type Dictionary = {
  nav: Record<string, string>;
  home: Record<string, string>;
  footer: Record<string, string>;
  common: Record<string, string>;
};

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: {
      home: "Home",
      about: "About",
      catalogue: "Catalogue",
      custom: "Custom",
      gallery: "Gallery",
      contact: "Contact",
      socials: "Social Medias",
      dashboard: "Dashboard",
      admin: "Admin"
    },
    home: {
      eyebrow: "Yogyakarta artisan craft house",
      title: "Handmade bags that feel like collectible gallery pieces.",
      subtitle:
        "Natlovers brings embroidery, weaving, and storytelling into fashion objects made slowly by Indonesian artisans.",
      ctaPrimary: "Explore Catalogue",
      ctaSecondary: "Request a Custom Piece",
      featured: "Featured Works",
      storyTitle: "Crafted by many hands, guided by one vision.",
      storyBody:
        "Founded by Anita Yan in 1998, Natlovers grew from a commitment to preserve Indonesian artistry and create dignified work for artisan communities."
    },
    footer: {
      note: "Designed for collectors, gift buyers, and lovers of handmade storytelling."
    },
    common: {
      currency: "Currency",
      locale: "Language",
      addToCart: "Add to cart",
      startCustom: "Start custom request",
      search: "Search",
      viewAll: "View all",
      submit: "Submit"
    }
  },
  id: {
    nav: {
      home: "Beranda",
      about: "Tentang",
      catalogue: "Katalog",
      custom: "Custom",
      gallery: "Galeri",
      contact: "Kontak",
      socials: "Media Sosial",
      dashboard: "Dashboard",
      admin: "Admin"
    },
    home: {
      eyebrow: "Rumah kriya artisan dari Yogyakarta",
      title: "Tas handmade yang terasa seperti karya koleksi di galeri.",
      subtitle:
        "Natlovers memadukan bordir, anyaman, dan storytelling menjadi karya fashion yang dibuat perlahan oleh artisan Indonesia.",
      ctaPrimary: "Jelajahi Katalog",
      ctaSecondary: "Ajukan Pesanan Custom",
      featured: "Karya Unggulan",
      storyTitle: "Dibuat oleh banyak tangan, dipandu satu visi.",
      storyBody:
        "Didirikan oleh Anita Yan pada 1998, Natlovers tumbuh dari komitmen untuk menjaga seni kriya Indonesia dan menghadirkan kerja yang bermartabat bagi komunitas artisan."
    },
    footer: {
      note: "Dirancang untuk kolektor, pembeli hadiah, dan pecinta karya handmade yang bercerita."
    },
    common: {
      currency: "Mata Uang",
      locale: "Bahasa",
      addToCart: "Tambah ke keranjang",
      startCustom: "Mulai pesanan custom",
      search: "Cari",
      viewAll: "Lihat semua",
      submit: "Kirim"
    }
  }
};

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
