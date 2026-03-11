"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {featuredProducts, ProductCard as ProductCardType} from "@/lib/data";
import {Locale} from "@/lib/site";

type CartItem = {
  slug: string;
  quantity: number;
};

type CheckoutDraft = {
  items: CartItem[];
  direct?: boolean;
} | null;

type ProductPatch = Partial<Omit<ProductCardType, "slug">>;

type StorefrontContextValue = {
  products: Record<Locale, ProductCardType[]>;
  cartItems: CartItem[];
  cabinetOpen: boolean;
  previewSlug: string | null;
  checkoutDraft: CheckoutDraft;
  getProducts: (locale: Locale) => ProductCardType[];
  resolveProduct: (slug: string, locale: Locale) => ProductCardType | undefined;
  addToCart: (slug: string, quantity?: number) => void;
  removeFromCart: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
  openCabinet: () => void;
  closeCabinet: () => void;
  openPreview: (slug: string) => void;
  closePreview: () => void;
  startBankTransferForProduct: (slug: string) => void;
  startBankTransferForCart: () => void;
  clearCheckoutDraft: () => void;
  updateProduct: (locale: Locale, slug: string, patch: ProductPatch) => void;
  addProduct: (locale: Locale) => string;
  removeProductEntry: (locale: Locale, slug: string) => void;
  getCartSubtotalIdr: (locale: Locale) => number;
};

const productStorageKey = "natlovers-products-v1";
const cartStorageKey = "natlovers-cart-v1";

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

function cloneBaseProducts(): Record<Locale, ProductCardType[]> {
  return {
    en: featuredProducts.en.map((product) => ({...product, materials: [...product.materials]})),
    id: featuredProducts.id.map((product) => ({...product, materials: [...product.materials]}))
  };
}

export function StorefrontProvider({children}: {children: ReactNode}) {
  const [products, setProducts] = useState<Record<Locale, ProductCardType[]>>(cloneBaseProducts);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft>(null);

  useEffect(() => {
    const savedProducts = window.localStorage.getItem(productStorageKey);
    const savedCart = window.localStorage.getItem(cartStorageKey);

    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts) as Record<Locale, ProductCardType[]>;
        if (parsed?.en && parsed?.id) {
          setProducts(parsed);
        }
      } catch {
        window.localStorage.removeItem(productStorageKey);
      }
    }

    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart) as CartItem[];
        if (Array.isArray(parsed)) {
          setCartItems(parsed.filter((item) => item.slug && item.quantity > 0));
        }
      } catch {
        window.localStorage.removeItem(cartStorageKey);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(productStorageKey, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartItems]);

  function getProducts(locale: Locale) {
    return products[locale];
  }

  function resolveProduct(slug: string, locale: Locale) {
    return products[locale].find((product) => product.slug === slug)
      ?? products.en.find((product) => product.slug === slug)
      ?? products.id.find((product) => product.slug === slug);
  }

  function addToCart(slug: string, quantity = 1) {
    setCartItems((current) => {
      const existing = current.find((item) => item.slug === slug);
      if (existing) {
        return current.map((item) => item.slug === slug ? {...item, quantity: item.quantity + quantity} : item);
      }
      return [...current, {slug, quantity}];
    });
    setCabinetOpen(true);
  }

  function removeFromCart(slug: string) {
    setCartItems((current) => current.filter((item) => item.slug !== slug));
  }

  function updateQuantity(slug: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(slug);
      return;
    }

    setCartItems((current) => current.map((item) => item.slug === slug ? {...item, quantity} : item));
  }

  function clearCart() {
    setCartItems([]);
  }

  function openCabinet() {
    setCabinetOpen(true);
  }

  function closeCabinet() {
    setCabinetOpen(false);
  }

  function openPreview(slug: string) {
    setPreviewSlug(slug);
    setCabinetOpen(true);
  }

  function closePreview() {
    setPreviewSlug(null);
  }

  function startBankTransferForProduct(slug: string) {
    setCheckoutDraft({items: [{slug, quantity: 1}], direct: true});
    setCabinetOpen(true);
  }

  function startBankTransferForCart() {
    if (!cartItems.length) {
      return;
    }

    setCheckoutDraft({items: cartItems});
    setCabinetOpen(true);
  }

  function clearCheckoutDraft() {
    setCheckoutDraft(null);
  }

  function updateProduct(locale: Locale, slug: string, patch: ProductPatch) {
    setProducts((current) => ({
      ...current,
      [locale]: current[locale].map((product) => (
        product.slug === slug
          ? {
              ...product,
              ...patch,
              materials: patch.materials ?? product.materials
            }
          : product
      ))
    }));
  }

  function addProduct(locale: Locale) {
    const slug = `new-piece-${Date.now()}`;
    const draft: ProductCardType = {
      slug,
      title: locale === "en" ? "New Natlovers Piece" : "Karya Natlovers Baru",
      description: locale === "en" ? "Add a concise product description." : "Tambahkan deskripsi produk singkat.",
      priceIdr: 1500000,
      imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
      story: locale === "en" ? "Use this area for the longer product story and craftsmanship details." : "Gunakan area ini untuk cerita produk dan detail craftsmanship.",
      materials: locale === "en" ? ["Natural fiber", "Embroidery"] : ["Serat alami", "Bordir"],
      collection: "accessories"
    };

    setProducts((current) => ({
      ...current,
      [locale]: [draft, ...current[locale]]
    }));

    return slug;
  }

  function removeProductEntry(locale: Locale, slug: string) {
    setProducts((current) => ({
      ...current,
      [locale]: current[locale].filter((product) => product.slug !== slug)
    }));
    removeFromCart(slug);
    if (previewSlug === slug) {
      setPreviewSlug(null);
    }
  }

  function getCartSubtotalIdr(locale: Locale) {
    return cartItems.reduce((sum, item) => {
      const product = resolveProduct(item.slug, locale);
      return product ? sum + product.priceIdr * item.quantity : sum;
    }, 0);
  }

  const value = useMemo(
    () => ({
      products,
      cartItems,
      cabinetOpen,
      previewSlug,
      checkoutDraft,
      getProducts,
      resolveProduct,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      openCabinet,
      closeCabinet,
      openPreview,
      closePreview,
      startBankTransferForProduct,
      startBankTransferForCart,
      clearCheckoutDraft,
      updateProduct,
      addProduct,
      removeProductEntry,
      getCartSubtotalIdr
    }),
    [products, cartItems, cabinetOpen, previewSlug, checkoutDraft]
  );

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const context = useContext(StorefrontContext);

  if (!context) {
    throw new Error("useStorefront must be used within StorefrontProvider");
  }

  return context;
}



