"use client";

import "@/components/atelier/atelier.css";
import Image from "next/image";
import Link from "next/link";
import type {Route} from "next";
import {FormEvent, Ref, useEffect, useMemo, useRef, useState} from "react";
import {Minus, Plus, Trash2, X} from "lucide-react";
import {useSession} from "next-auth/react";
import {LimitNoticeBox} from "@/components/atelier/limit-notice";
import {useScrollLock} from "@/components/use-scroll-lock";
import {useStorefront, type LimitHit} from "@/components/storefront-provider";
import {bagCopy, copy as atelierCopy, langForCurrency, orderCopy} from "@/lib/atelier-copy";
import {combinedLeadTime, isReadyToShip, type LimitViolation} from "@/lib/atelier-limits";
import {formatCurrency} from "@/lib/format";
import {htmlToPlainText} from "@/lib/html-text";
import {paymentRouteFor} from "@/lib/payment-routes";
import type {CurrencyCode} from "@/lib/site";

export type BagItem = {
  slug: string;
  title: string;
  description: string;
  imageUrl?: string;
  // The line unit price in the chosen currency, options included.
  price: number;
  quantity: number;
  details?: {label: string; value: string; extra: number}[];
  config?: unknown;
};

type Step = "bag" | "delivery" | "done";

type Address = {recipientName: string; phone: string; street: string; city: string; province: string; postalCode: string; country: string};

type Placed = {
  route: string;
  orderRef: string;
  total: number;
  expiresAt: string | null;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  // Rupiah orders paid online: the hosted payment page (null if it could not be made just now) and
  // the order page, where the customer can pay later.
  paymentUrl?: string | null;
  orderUrl?: string;
};

const EMPTY_ADDRESS: Address = {recipientName: "", phone: "", street: "", city: "", province: "", postalCode: "", country: "Indonesia"};

const REQUIRED: (keyof Address)[] = ["recipientName", "phone", "street", "city", "postalCode", "country"];

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function BagSidebar({
  entered,
  panelRef,
  items,
  checkoutItems,
  currency,
  onClose,
  onRemove,
  onQuantity,
  onOrderPlaced,
  initialStep
}: {
  entered: boolean;
  panelRef?: Ref<HTMLDivElement>;
  items: BagItem[];
  // Set for a direct "buy this one" checkout, which is not the whole bag.
  checkoutItems?: BagItem[];
  currency: CurrencyCode;
  onClose: () => void;
  onRemove: (slug: string) => void;
  onQuantity: (slug: string, quantity: number) => void;
  onOrderPlaced: () => void;
  initialStep: Step;
}) {
  useScrollLock(true);
  const lang = langForCurrency(currency);
  const t = bagCopy[lang];
  const route = paymentRouteFor(currency);
  const {data: session} = useSession();
  const {limitHit, dismissLimitHit, availability, resolveProduct} = useStorefront();

  const [step, setStep] = useState<Step>(initialStep);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [touched, setTouched] = useState<Partial<Record<keyof Address, boolean>>>({});
  const [loadedAddress, setLoadedAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [orderLimit, setOrderLimit] = useState<LimitHit | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [placedItems, setPlacedItems] = useState<BagItem[]>([]);
  const [copied, setCopied] = useState<"number" | "amount" | null>(null);
  const keyRef = useRef<string>(newKey());
  // Set at once on click, before React re-renders, so a fast double click cannot send two requests.
  const submittingRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const activeItems = checkoutItems ?? items;
  const summaryItems = step === "done" ? placedItems : activeItems;
  const subtotal = summaryItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Prefill from the saved default address the first time delivery opens.
  useEffect(() => {
    if (step !== "delivery" || loadedAddress) return;
    let cancelled = false;
    fetch("/api/account/addresses", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : []))
      .then((list: Array<Address & {isDefault: boolean}>) => {
        if (cancelled) return;
        const found = Array.isArray(list) ? (list.find((entry) => entry.isDefault) ?? list[0]) : null;
        if (found) {
          setAddress({
            recipientName: found.recipientName,
            phone: found.phone,
            street: found.street,
            city: found.city,
            province: found.province ?? "",
            postalCode: found.postalCode,
            country: found.country
          });
        } else if (session?.user?.name) {
          setAddress((current) => ({...current, recipientName: session.user?.name ?? ""}));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadedAddress(true);
      });
    return () => {
      cancelled = true;
    };
  }, [step, loadedAddress, session]);

  // A fresh checkout starts with a fresh key; the same attempt keeps its key.
  useEffect(() => {
    keyRef.current = newKey();
  }, [activeItems.length]);

  // New step, new view: start at the top.
  useEffect(() => {
    bodyRef.current?.scrollTo({top: 0});
  }, [step]);

  const errors = useMemo(() => {
    const result: Partial<Record<keyof Address, string>> = {};
    for (const key of REQUIRED) {
      if (!address[key].trim()) result[key] = t.errors[key as keyof typeof t.errors];
    }
    return result;
  }, [address, t]);

  function setField(key: keyof Address, value: string) {
    setAddress((current) => ({...current, [key]: value}));
  }

  async function placeOrder(event?: FormEvent) {
    event?.preventDefault();
    if (submitting || submittingRef.current) return;
    const firstInvalid = REQUIRED.find((key) => errors[key]);
    if (firstInvalid) {
      setTouched(Object.fromEntries(REQUIRED.map((key) => [key, true])));
      document.getElementById(`bs-${firstInvalid}`)?.focus();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setServerError(null);
    setOrderLimit(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          method: route,
          currency,
          idempotencyKey: keyRef.current,
          items: activeItems.map((item) => ({slug: item.slug, quantity: item.quantity, config: item.config ?? null})),
          address
        })
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.ok) {
        setPlacedItems(activeItems);
        setPlaced(payload as Placed);
        setStep("done");
        onOrderPlaced();
        if (payload.route === "idr_online" && typeof payload.paymentUrl === "string") {
          window.location.assign(payload.paymentUrl);
        }
        return;
      }
      // A definite answer from the server: the next attempt is a new attempt.
      keyRef.current = newKey();
      if (response.status === 409 && payload?.error === "limit") {
        setOrderLimit({violation: payload.violation as LimitViolation, nextMonth: payload.nextMonth ?? 1});
        return;
      }
      setServerError(typeof payload?.error === "string" ? payload.error : atelierCopy[lang].orderFailed);
    } catch {
      // The request may or may not have arrived: keep the key, so trying again cannot make a second order.
      setServerError(atelierCopy[lang].orderFailed);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function copy(kind: "number" | "amount", value: string) {
    if (await copyText(value)) {
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 2000);
    }
  }

  const stepIndex = step === "bag" ? 0 : step === "delivery" ? 1 : 2;
  const expiryText =
    placed?.expiresAt
      ? new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta"}).format(new Date(placed.expiresAt))
      : null;

  // The longest lead time among the made-to-order items ordered, since everything ships together.
  // Ready-to-ship items have none. Nothing is shown unless a product has one set.
  const placedProducts = placedItems.map((item) => resolveProduct(item.slug));
  const lead = combinedLeadTime(
    placedProducts.map((product) => ({fulfilmentType: product?.fulfilmentType, min: product?.leadTimeWeeksMin, max: product?.leadTimeWeeksMax}))
  );
  const placedReady = placedProducts.filter((product) => isReadyToShip(product?.fulfilmentType)).length;
  const placedMade = placedProducts.length - placedReady;

  const contactUrl = availability?.wholesaleContactUrl ?? null;
  const bagNotice = limitHit && step !== "done" ? limitHit : null;

  return (
    <div data-scroll-lock onClick={onClose} className={`bs-overlay transition-opacity duration-200 ${entered ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bs-title"
        onClick={(event) => event.stopPropagation()}
        className="bs-panel"
        style={{transform: entered ? "translateX(0)" : "translateX(100%)"}}
      >
        <div className="bs-head">
          <h2 id="bs-title" className="bs-title">
            {step === "done" ? t.doneTitle : t.title}
          </h2>
          <button type="button" data-bag-close aria-label={t.close} onClick={onClose} className="bs-icon">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <ol className="bs-steps" aria-label={t.stepsLabel}>
          {t.steps.map((label, index) => (
            <li key={label} aria-current={index === stepIndex ? "step" : undefined} data-done={index < stepIndex}>
              {label}
            </li>
          ))}
        </ol>

        <div ref={bodyRef} className="bs-body">
          {step === "bag" ? (
            <>
              {bagNotice ? (
                <div className="mb-3">
                  <LimitNoticeBox hit={bagNotice} lang={lang} contactUrl={contactUrl} onDismiss={dismissLimitHit} />
                </div>
              ) : null}
              {activeItems.length ? (
                <ul className="bs-items">
                  {activeItems.map((item) => (
                    <li key={item.slug} className="bs-item">
                      <Link href={`/catalogue/${item.slug}` as Route} onClick={onClose} aria-label={item.title} className="bs-thumb">
                        {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-contain p-1" /> : null}
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/catalogue/${item.slug}` as Route} onClick={onClose} className="bs-name">
                            {item.title}
                          </Link>
                          <button type="button" onClick={() => onRemove(item.slug)} aria-label={t.remove(item.title)} className="bs-icon" style={{width: "2.25rem", height: "2.25rem", flex: "none"}}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                        {item.details?.length ? (
                          <ul className="bs-detail">
                            {item.details.map((line, index) => (
                              <li key={`${line.label}-${index}`}>
                                {line.label}: {line.value}
                                {line.extra > 0 ? ` (+${formatCurrency(line.extra, currency)})` : ""}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="bs-detail line-clamp-2">{htmlToPlainText(item.description, {firstParagraph: true})}</p>
                        )}
                        {isReadyToShip(resolveProduct(item.slug)?.fulfilmentType) ? <p className="bs-detail">{atelierCopy[lang].readyToShip}</p> : null}
                        <div className="bs-item-bottom">
                          <div role="group" aria-label={t.quantity(item.title)} className="bs-stepper">
                            <button type="button" onClick={() => onQuantity(item.slug, item.quantity - 1)} disabled={item.quantity <= 1} aria-label={t.decrease(item.title)}>
                              <Minus className="mx-auto h-4 w-4" aria-hidden />
                            </button>
                            <output aria-live="polite">{item.quantity}</output>
                            <button type="button" onClick={() => onQuantity(item.slug, item.quantity + 1)} aria-label={t.increase(item.title)}>
                              <Plus className="mx-auto h-4 w-4" aria-hidden />
                            </button>
                          </div>
                          <span className="bs-price">{formatCurrency(item.price * item.quantity, currency)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bs-empty">
                  <p className="bs-heading">{t.empty}</p>
                  <p className="bs-text mt-2">{t.emptyHint}</p>
                  <Link href="/catalogue" onClick={onClose} className="bs-btn bs-btn-quiet mt-5">
                    {t.explore}
                  </Link>
                </div>
              )}
              {activeItems.length ? <p className="bs-text mt-3">{atelierCopy[lang].madeInSmallNumbers}</p> : null}
            </>
          ) : null}

          {step === "delivery" ? (
            <form id="bs-delivery-form" onSubmit={placeOrder} noValidate>
              <details className="bs-card bs-summary">
                <summary>
                  {t.orderSummary} ({activeItems.reduce((sum, item) => sum + item.quantity, 0)})
                </summary>
                {activeItems.map((item) => (
                  <div key={item.slug} className="bs-summary-line">
                    <span>
                      {item.title} <span className="bs-detail">{t.qty} {item.quantity}</span>
                    </span>
                    <span>{formatCurrency(item.price * item.quantity, currency)}</span>
                  </div>
                ))}
              </details>

              <h3 className="bs-heading mt-5">{t.deliveryTitle}</h3>

              {(
                [
                  ["recipientName", "name", "text", "words"],
                  ["phone", "tel", "tel", "off"],
                  ["street", "street-address", "text", "sentences"],
                  ["city", "address-level2", "text", "words"],
                  ["province", "address-level1", "text", "words"],
                  ["postalCode", "postal-code", "text", "off"],
                  ["country", "country-name", "text", "words"]
                ] as const
              ).map(([key, autoComplete, type, capitalise]) => {
                const message = touched[key] ? errors[key] : undefined;
                return (
                  <div key={key} className="bs-field">
                    <label htmlFor={`bs-${key}`} className="bs-label">
                      {t.labels[key]}
                    </label>
                    <input
                      id={`bs-${key}`}
                      name={key}
                      type={type}
                      inputMode={key === "phone" ? "tel" : key === "postalCode" ? "text" : undefined}
                      autoComplete={autoComplete}
                      autoCapitalize={capitalise}
                      value={address[key]}
                      onChange={(event) => setField(key, event.target.value)}
                      onBlur={() => setTouched((current) => ({...current, [key]: true}))}
                      aria-invalid={message ? true : undefined}
                      aria-describedby={message ? `bs-${key}-error` : undefined}
                      aria-required={REQUIRED.includes(key) ? true : undefined}
                      className="bs-input"
                    />
                    {message ? (
                      <p id={`bs-${key}-error`} className="bs-error">
                        {message}
                      </p>
                    ) : null}
                  </div>
                );
              })}

              {orderLimit ? (
                <div className="mt-4">
                  <LimitNoticeBox hit={orderLimit} lang={lang} contactUrl={contactUrl} context="order" />
                </div>
              ) : null}
              {serverError ? (
                <p role="alert" className="bs-error mt-4">
                  {serverError}
                </p>
              ) : null}

              <p className="bs-text mt-5" style={{fontSize: "0.8125rem"}}>
                {t.fixedPrice}
              </p>
              <p className="bs-text mt-2" style={{fontSize: "0.8125rem"}}>
                {t.termsLead}{" "}
                <Link href={"/terms" as Route} target="_blank" rel="noopener noreferrer" className="bs-link">
                  {t.terms}
                </Link>
                ,{" "}
                <Link href={"/returns" as Route} target="_blank" rel="noopener noreferrer" className="bs-link">
                  {t.returns}
                </Link>{" "}
                {t.and}{" "}
                <Link href={"/privacy" as Route} target="_blank" rel="noopener noreferrer" className="bs-link">
                  {t.privacy}
                </Link>
                .
              </p>
            </form>
          ) : null}

          {step === "done" && placed ? (
            <div>
              {placed.route === "idr_online" ? (
                <>
                  <p className="bs-text">{placed.paymentUrl ? orderCopy[lang].payOpening : orderCopy[lang].paymentUnavailable}</p>
                  <dl className="bs-dl bs-card">
                    <div className="bs-dl-row">
                      <dt>{t.doneRef}</dt>
                      <dd>{placed.orderRef}</dd>
                    </div>
                    <div className="bs-dl-row">
                      <dt>{t.doneAmount}</dt>
                      <dd>{formatCurrency(placed.total, "IDR")}</dd>
                    </div>
                  </dl>
                  <a className="bs-btn bs-btn-primary mt-4" href={placed.paymentUrl ?? placed.orderUrl ?? "/account"}>
                    {placed.paymentUrl ? orderCopy[lang].payNow : t.doneRef}
                  </a>
                </>
              ) : placed.route === "idr_bank_transfer" ? (
                <>
                  <p className="bs-text">{expiryText ? t.transferBefore(expiryText) : null}</p>
                  <dl className="bs-dl bs-card">
                    <div className="bs-dl-row">
                      <dt>{t.doneRef}</dt>
                      <dd>{placed.orderRef}</dd>
                    </div>
                    <div className="bs-dl-row">
                      <dt>{t.doneAmount}</dt>
                      <dd className="flex items-center gap-2">
                        <span>{formatCurrency(placed.total, "IDR")}</span>
                        <button type="button" className="bs-copy" onClick={() => copy("amount", String(placed.total))}>
                          {copied === "amount" ? t.copied : t.copyAmount}
                        </button>
                      </dd>
                    </div>
                    <div className="bs-dl-row">
                      <dt>{t.doneBank}</dt>
                      <dd>{placed.bankName}</dd>
                    </div>
                    <div className="bs-dl-row">
                      <dt>{t.doneAccountName}</dt>
                      <dd>{placed.accountName}</dd>
                    </div>
                    <div className="bs-dl-row">
                      <dt>{t.doneAccountNumber}</dt>
                      <dd className="flex items-center gap-2">
                        <span>{placed.accountNumber}</span>
                        <button type="button" className="bs-copy" onClick={() => copy("number", placed.accountNumber ?? "")}>
                          {copied === "number" ? t.copied : t.copyNumber}
                        </button>
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <dl className="bs-dl bs-card">
                  <div className="bs-dl-row">
                    <dt>{t.doneRef}</dt>
                    <dd>{placed.orderRef}</dd>
                  </div>
                  <div className="bs-dl-row">
                    <dt>{t.doneAmountUsd}</dt>
                    <dd>{formatCurrency(placed.total, "USD")}</dd>
                  </div>
                </dl>
              )}

              {placed.route === "idr_online" ? null : (
                <>
                  <h3 className="bs-heading mt-6">{t.nextTitle}</h3>
                  <ol className="bs-ol">
                    {(placed.route === "idr_bank_transfer" ? t.nextIdr : t.nextUsd).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                </>
              )}
              {lead ? <p className="bs-text mt-4">{atelierCopy[lang].readyIn(lead.min, lead.max)}</p> : null}
              {placedReady > 0 && placedMade === 0 ? <p className="bs-text mt-4">{atelierCopy[lang].readyToShip}</p> : null}
              {placedReady > 0 && placedMade > 0 ? <p className="bs-text mt-2">{atelierCopy[lang].shipsTogether}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="bs-foot">
          {step === "bag" && activeItems.length ? (
            <>
              <div className="bs-total-row">
                <span>{t.subtotal}</span>
                <strong>{formatCurrency(subtotal, currency)}</strong>
              </div>
              <div className="bs-actions">
                <button type="button" className="bs-btn bs-btn-primary" onClick={() => setStep("delivery")}>
                  {t.toDelivery}
                </button>
                <Link href="/catalogue" onClick={onClose} className="bs-btn bs-btn-quiet">
                  {t.continueShopping}
                </Link>
              </div>
            </>
          ) : null}

          {step === "delivery" ? (
            <>
              <div className="bs-total-row">
                <span>{t.total}</span>
                <strong>{formatCurrency(subtotal, currency)}</strong>
              </div>
              <div className="bs-actions">
                <button type="submit" form="bs-delivery-form" disabled={submitting} className="bs-btn bs-btn-primary">
                  {submitting ? t.placing : t.placeOrder}
                </button>
                <button type="button" className="bs-step-back" onClick={() => setStep("bag")}>
                  {t.backToBag}
                </button>
              </div>
            </>
          ) : null}

          {step === "done" && placed ? (
            <>
              <div className="bs-total-row">
                <span>{t.total}</span>
                <strong>{formatCurrency(subtotal, currency)}</strong>
              </div>
              <div className="bs-actions">
                <Link href={`/account/orders/${encodeURIComponent(placed.orderRef)}` as Route} onClick={onClose} className="bs-btn bs-btn-primary">
                  {t.viewOrder}
                </Link>
                <Link href="/catalogue" onClick={onClose} className="bs-btn bs-btn-quiet">
                  {t.continueShopping}
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

