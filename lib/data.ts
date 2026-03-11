import {CurrencyCode, Locale} from "@/lib/site";

export type CollectionSlug = "bags" | "clothing" | "dolls" | "accessories";

export type ProductCard = {
  slug: string;
  title: string;
  description: string;
  priceIdr: number;
  imageUrl: string;
  story: string;
  materials: string[];
  collection: CollectionSlug;
  featured?: boolean;
};

export const featuredProducts: Record<Locale, ProductCard[]> = {
  en: [
    {
      slug: "simbok-nusantara-heirloom",
      title: "Simbok Nusantara Heirloom",
      description: "A story-driven woven handbag celebrating Indonesian motherhood and ceremony.",
      priceIdr: 4250000,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
      story: "Hand appliqued figures, floral embroidery, and leather handles by Natlovers artisans.",
      materials: ["Natural fiber", "Embroidery", "Leather"],
      collection: "bags",
      featured: true
    },
    {
      slug: "garden-procession-tote",
      title: "Garden Procession Tote",
      description: "A whimsical tote alive with birds, blooms, and dimensional textile play.",
      priceIdr: 3650000,
      imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
      story: "Designed like a moving garden scene, balancing collectible beauty and daily practicality.",
      materials: ["Crochet", "Recycled fabric", "Hand weaving"],
      collection: "bags",
      featured: true
    },
    {
      slug: "woven-story-runner",
      title: "Woven Story Table Runner",
      description: "Decor for homes that value craft, texture, and human detail.",
      priceIdr: 1850000,
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      story: "A textile object that translates Natlovers storytelling into the home.",
      materials: ["Patchwork", "Embroidery", "Hand stitching"],
      collection: "accessories"
    }
  ],
  id: [
    {
      slug: "simbok-nusantara-heirloom",
      title: "Simbok Nusantara Pusaka",
      description: "Tas anyam bercerita yang merayakan keibuan dan upacara budaya Indonesia.",
      priceIdr: 4250000,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
      story: "Figur applique, bordir bunga, dan pegangan kulit yang dibuat oleh artisan Natlovers.",
      materials: ["Serat alami", "Bordir", "Kulit"],
      collection: "bags",
      featured: true
    },
    {
      slug: "garden-procession-tote",
      title: "Garden Procession Tote",
      description: "Tote whimsical yang hidup dengan burung, bunga, dan permainan tekstil dimensional.",
      priceIdr: 3650000,
      imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
      story: "Dirancang seperti adegan taman bergerak, menyeimbangkan keindahan koleksi dan fungsi harian.",
      materials: ["Rajut", "Kain daur ulang", "Anyaman tangan"],
      collection: "bags",
      featured: true
    },
    {
      slug: "woven-story-runner",
      title: "Table Runner Cerita Anyam",
      description: "Dekor rumah untuk ruang yang menghargai kriya, tekstur, dan detail manusiawi.",
      priceIdr: 1850000,
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      story: "Objek tekstil yang menerjemahkan storytelling Natlovers ke dalam interior rumah.",
      materials: ["Patchwork", "Bordir", "Jahit tangan"],
      collection: "accessories"
    }
  ]
};

export const dashboardSummary = {
  upcomingOrders: 2,
  savedPieces: 4,
  customRequests: 1
};

export const adminSummary = {
  revenueMonth: {
    IDR: 38750000,
    USD: 2450
  },
  openOrders: 9,
  newCustomRequests: 5,
  artisanPartners: 34
};

export const supportedCurrencies: CurrencyCode[] = ["IDR", "USD", "GBP", "AUD", "SGD", "MYR"];
