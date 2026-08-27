"use client";

import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {usePathname, useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import type {ProductCard as ProductCardType} from "@/lib/data";
import {Locale} from "@/lib/site";
import type {AdminProduct} from "@/lib/admin-products";
import type {CartConfig} from "@/lib/cart";

type CartItem = {
  slug: string;
  quantity: number;
  config: CartConfig | null;
};

type CheckoutDraft = {
  items: CartItem[];
  direct?: boolean;
} | null;

type StorefrontContextValue = {
  products: ProductCardType[];
  cartItems: CartItem[];
  cabinetOpen: boolean;
  previewSlug: string | null;
  checkoutDraft: CheckoutDraft;
  getProducts: (locale?: Locale) => ProductCardType[];
  resolveProduct: (slug: string, locale?: Locale) => ProductCardType | undefined;
  addToCart: (slug: string, quantity?: number, config?: CartConfig | null) => void;
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
  getCartSubtotalIdr: (locale?: Locale) => number;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

// The real catalogue (from /api/admin/products) is mapped onto the same
// shape the cart drawer, search modal, and quick-preview panel already
// render (title/story/imageUrl/materials as string[]) so none of that JSX
// needed to change  -  only where the data comes from did.
function toProductCard(product: AdminProduct): ProductCardType {
  return {
    slug: product.slug,
    title: product.name,
    description: product.description ?? "",
    priceIdr: product.priceIdr,
    imageUrl: product.images[0] ?? product.imageUrl,
    story: product.description ?? "",
    materials: product.materials,
    collection: "bags"
  };
}

export function StorefrontProvider({children}: {children: ReactNode}) {
  const {status} = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [products, setProducts] = useState<ProductCardType[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/products", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (!cancelled && Array.isArray(data)) {
          setProducts((data as AdminProduct[]).map(toProductCard));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Cart lives in Postgres per account, not localStorage  -  it's hydrated
  // here whenever sign-in state changes, and cleared locally on sign-out so
  // the drawer doesn't keep showing the previous account's items.
  useEffect(() => {
    if (status !== "authenticated") {
      if (status === "unauthenticated") {
        setCartItems([]);
      }
      return;
    }
    let cancelled = false;
    fetch("/api/cart", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : {items: []}))
      .then((data: {items: CartItem[]}) => {
        if (!cancelled) {
          setCartItems(Array.isArray(data.items) ? data.items : []);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status]);

  // config is omitted from the request entirely (not sent as null) unless
  // the caller explicitly passes one  -  the API route treats "field absent"
  // as "leave whatever's already stored," which is what a plain quantity
  // bump from the cart drawer needs.
  const persistQuantity = useCallback((slug: string, quantity: number, config?: CartConfig | null) => {
    fetch("/api/cart", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(config !== undefined ? {slug, quantity, config} : {slug, quantity})
    }).catch(() => undefined);
  }, []);

  function getProducts() {
    return products;
  }

  function resolveProduct(slug: string) {
    return products.find((product) => product.slug === slug);
  }

  function addToCart(slug: string, quantity = 1, config?: CartConfig | null) {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    const existing = cartItems.find((item) => item.slug === slug);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    // A config passed explicitly (adding from the product page) replaces
    // whatever the line already had; re-adding with none leaves it as-is.
    const nextConfig = config !== undefined ? config : (existing?.config ?? null);

    setCartItems((current) =>
      existing
        ? current.map((item) => (item.slug === slug ? {...item, quantity: nextQuantity, config: nextConfig} : item))
        : [...current, {slug, quantity: nextQuantity, config: nextConfig}]
    );
    setCabinetOpen(true);
    persistQuantity(slug, nextQuantity, config !== undefined ? config : undefined);
  }

  function updateQuantity(slug: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(slug);
      return;
    }

    setCartItems((current) => current.map((item) => (item.slug === slug ? {...item, quantity} : item)));
    persistQuantity(slug, quantity);
  }

  function removeFromCart(slug: string) {
    setCartItems((current) => current.filter((item) => item.slug !== slug));
    persistQuantity(slug, 0);
  }

  function clearCart() {
    const slugs = cartItems.map((item) => item.slug);
    setCartItems([]);
    slugs.forEach((slug) => persistQuantity(slug, 0));
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
    setCheckoutDraft({items: [{slug, quantity: 1, config: null}], direct: true});
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

  function getCartSubtotalIdr() {
    // Locale param kept for call-site compatibility; pricing is locale-independent now.
    return cartItems.reduce((sum, item) => {
      const product = resolveProduct(item.slug);
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
      getCartSubtotalIdr
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, cartItems, cabinetOpen, previewSlug, checkoutDraft, status]
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
