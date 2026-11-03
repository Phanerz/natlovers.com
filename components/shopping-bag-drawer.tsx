"use client";

import Image from "next/image";
import Link from "next/link";
import type {ReactNode, Ref} from "react";
import {ArrowRight, CreditCard, Minus, Plus, ShoppingBag, Trash2, X} from "lucide-react";
import {formatCurrency} from "@/lib/format";
import {htmlToPlainText} from "@/lib/html-text";
import type {CurrencyCode} from "@/lib/site";

export type BagItem = {
  slug: string;
  title: string;
  // Stored as rich-text HTML; shown here as a short readable line.
  description: string;
  imageUrl?: string;
  priceIdr: number;
  quantity: number;
};

// The Shopping Bag drawer: purely presentational. The cart itself (items,
// quantities, persistence, checkout) stays in the storefront provider and the
// header; this only lays it out. `children` is where the header puts the quick
// preview and the in-drawer bank-transfer checkout, between the notice and the
// item list. Visuals are the .bag-* classes in globals.css.
export function ShoppingBagDrawer({
  entered,
  panelRef,
  items,
  currency,
  subtotalIdr,
  onClose,
  onOpenPreview,
  onRemove,
  onQuantity,
  onCheckout,
  children
}: {
  entered: boolean;
  panelRef?: Ref<HTMLDivElement>;
  items: BagItem[];
  currency: CurrencyCode;
  subtotalIdr: number;
  onClose: () => void;
  onOpenPreview: (slug: string) => void;
  onRemove: (slug: string) => void;
  onQuantity: (slug: string, quantity: number) => void;
  onCheckout: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      data-scroll-lock
      onClick={onClose}
      className={`bag-overlay fixed inset-0 z-50 transition-opacity duration-200 ${
        entered ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bag-title"
        onClick={(event) => event.stopPropagation()}
        className={`bag-drawer ml-auto transition-transform ${
          entered ? "translate-x-0 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" : "translate-x-full duration-200 ease-in"
        }`}
      >
        <div className="bag-header">
          <div className="min-w-0">
            <p className="bag-eyebrow">
              <ShoppingBag aria-hidden />
              <span>Shopping Bag</span>
              <span className="bag-eyebrow-line" aria-hidden />
            </p>
            <h2 id="bag-title" className="bag-title">
              Your Selections
            </h2>
            <p className="bag-subtitle">Review your selected pieces before checkout.</p>
          </div>
          <button type="button" data-bag-close aria-label="Close shopping bag" onClick={onClose} className="bag-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bag-notice">
          <CreditCard aria-hidden />
          <span>Preview and bank-transfer checkout are now available.</span>
        </div>

        {children}

        <div className="bag-list">
          {items.length ? (
            <ul className="bag-items">
              {items.map((item) => (
                <li key={item.slug} className="bag-item">
                  <button
                    type="button"
                    onClick={() => onOpenPreview(item.slug)}
                    aria-label={`Preview ${item.title}`}
                    className="bag-thumb"
                  >
                    {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="96px" className="object-contain p-1.5" /> : null}
                  </button>
                  <div className="bag-item-body">
                    <div className="bag-item-top">
                      <div className="min-w-0">
                        <button type="button" onClick={() => onOpenPreview(item.slug)} className="bag-item-name">
                          {item.title}
                        </button>
                        <p className="bag-item-desc">{htmlToPlainText(item.description, {firstParagraph: true})}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item.slug)}
                        aria-label={`Remove ${item.title} from shopping bag`}
                        className="bag-icon-btn"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="bag-item-bottom">
                      <div role="group" aria-label={`Quantity for ${item.title}`} className="bag-stepper">
                        <button
                          type="button"
                          onClick={() => onQuantity(item.slug, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={`Decrease quantity of ${item.title}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <output aria-live="polite">{item.quantity}</output>
                        <button
                          type="button"
                          onClick={() => onQuantity(item.slug, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="bag-item-total">
                        <span>Total</span>
                        <strong>{formatCurrency(item.priceIdr * item.quantity, currency)}</strong>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bag-empty">
              <p className="bag-empty-title">Your shopping bag is empty.</p>
              <p className="bag-empty-copy">Discover something handcrafted for you.</p>
              <Link href="/catalogue" onClick={onClose} className="bag-btn bag-btn-primary mt-4 px-8">
                Explore Catalogue
              </Link>
            </div>
          )}
        </div>

        {items.length ? (
          <div className="bag-footer">
            <div className="bag-subtotal">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotalIdr, currency)}</strong>
            </div>
            <div className="bag-actions">
              <button type="button" onClick={onCheckout} className="bag-btn bag-btn-primary">
                Proceed to Checkout
                <ArrowRight className="h-5 w-5" aria-hidden />
              </button>
              <Link href="/catalogue" onClick={onClose} className="bag-btn bag-btn-secondary">
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
