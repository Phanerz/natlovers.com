"use client";

import Image from "next/image";
import Link from "next/link";
import {useMemo, useState} from "react";
import {ArrowRight} from "lucide-react";
import {CurrencyCode, Locale} from "@/lib/site";

const phonetic = "/\u02C8n\u00E6t.l\u0259\u028A.v\u0259z/";

export function Hero({locale, currency}: {locale: Locale; currency: CurrencyCode}) {
  const [offset, setOffset] = useState({x: 0, y: 0});

const titleTransform = useMemo(() => {
  return `perspective(1200px)
    rotateX(${offset.y * -2}deg)
    rotateY(${offset.x * 2}deg)
    translate3d(${offset.x * 10}px, ${offset.y * 6}px, 40px)`
}, [offset.x, offset.y])

const backgroundTransform = useMemo(() => {
  return `translate3d(${offset.x * -4}px, ${offset.y * -3}px, 0) scale(1.05)`
}, [offset.x, offset.y])

const [light, setLight] = useState({ x: 50, y: 50 });

const cardTransform = useMemo(() => {
  return `perspective(1200px)
          rotateX(${offset.y * -6}deg)
          rotateY(${offset.x * 6}deg)
          translate3d(${offset.x * 20}px, ${offset.y * 12}px, 60px)`;
}, [offset.x, offset.y]);

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setOffset({x, y});
    const lx = ((event.clientX - bounds.left) / bounds.width) * 100;
    const ly = ((event.clientY - bounds.top) / bounds.height) * 100;
    setLight({ x: lx, y: ly });
  }

  function handleLeave() {
    setOffset({ x: 0, y: 0 })
    setLight({ x: 50, y: 50 })
  }

  return (
    <section className="page-enter">
      <div
        className="hero-stage relative overflow-hidden border-b border-[#efe3cb]/14 shadow-[0_24px_80px_rgba(20,33,22,0.18)]"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <div className="absolute inset-0 bg-[#07120d]" />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ transform: backgroundTransform }}
        >
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="/images/natlovers-bags-1.jpg"
          >
            <source src="/videos/natlovers-hero.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[#06110b]/76" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_28%,rgba(115,155,134,0.26),transparent_22%),radial-gradient(circle_at_82%_24%,rgba(232,221,190,0.12),transparent_18%),linear-gradient(180deg,rgba(6,17,11,0.72),rgba(6,17,11,0.46)_42%,rgba(6,17,11,0.74)_100%)]" />
          <div className="ambient-orb left-10 top-10 h-28 w-28 bg-sand-100/12" />
          <div className="ambient-orb alt right-12 top-20 h-36 w-36 bg-forest-200/12" />
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1680px] flex-col justify-center px-4 py-5 sm:px-6 md:px-8 lg:px-10 xl:px-14">
          <div className="grid h-full items-center gap-[21px] lg:grid-cols-[minmax(0,1.618fr)_minmax(360px,1fr)] lg:gap-[34px] xl:gap-[55px]">
            <div className="flex min-w-0 flex-col justify-center">
              <div className="header-text-shadow inline-flex w-fit rounded-full border border-[#f3e7cf]/38 bg-black/24 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.3em] text-white backdrop-blur-sm shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
                {locale === "en" ? "Handcrafted in Indonesia" : "Dibuat tangan di Indonesia"}
              </div>

              <div
                className="museum-panel relative overflow-hidden transition-transform duration-300 ease-out mt-[21px] rounded-[2.4rem] border border-[#efe3cb]/20 bg-[linear-gradient(135deg,rgba(255,248,238,0.15),rgba(255,255,255,0.08))] px-5 py-6 text-white backdrop-blur-sm shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:px-7 sm:py-7 lg:px-[34px] lg:py-[34px] xl:px-[55px] xl:py-[34px]"
                style={{ transform: titleTransform, transformStyle: "preserve-3d" }}
              >
                {/* glass light sweep */}
                <div
                  className="pointer-events-none absolute inset-y-0 -left-[40%] w-[60%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)] blur-2xl opacity-20 animate-[glassSweep_8s_linear_infinite]"
                />

  <div className="min-w-0"></div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-[0.42em] text-[#f2e8d2]/84">
                    {locale === "en" ? "Dictionary entry / House of craft" : "Entri kamus / Rumah kriya"}
                  </div>
                  <div className="hero-title-shadow mt-[13px] font-display text-[clamp(2.6rem,5vw,5.25rem)] leading-[0.9] tracking-[-0.06em] text-white">
                    NATLOVERS
                  </div>
                </div>

                <div className="mt-[21px] grid gap-[13px] text-white md:grid-cols-[auto_auto_1fr] md:items-end">
                  <span className="hero-copy-shadow font-display text-[clamp(1rem,1.25vw,1.32rem)] text-white">{phonetic}</span>
                  <span className="header-text-shadow text-[11px] font-medium uppercase tracking-[0.3em] text-white/88">noun</span>
                  <span className="hidden h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.82),rgba(255,255,255,0.16))] md:block" />
                </div>
                <div className="mt-[13px] h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.9),rgba(255,255,255,0.18))] md:hidden" />

                <div className="mt-[21px] max-w-none">
                  <p className="hero-definition hero-copy-shadow font-display text-[clamp(1.05rem,1.55vw,1.72rem)] text-white">
                    {locale === "en"
                      ? "Unique sustainable natural-fibre crafts preserving tradition through thoughtful design."
                      : "Kriya serat alami berkelanjutan yang unik, menjaga tradisi melalui desain yang penuh perhatian."}
                  </p>
                </div>

                <div className="mt-[21px] flex flex-wrap gap-[13px]">
                  <Link
                    href="/catalogue"
                    className="button-lift inline-flex items-center gap-2 rounded-full bg-sand-100 px-6 py-3 text-sm font-semibold text-forest-900 shadow-[0_16px_34px_rgba(22,22,15,0.22)]"
                  >
                    EXPLORE CATALOGUE <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/custom"
                    className="button-lift inline-flex items-center gap-2 rounded-full border border-white/38 bg-black/12 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    REQUEST A CUSTOM PIECE
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 items-center lg:justify-end">
              <div
                className="floating-panel will-change-transform transition-transform duration-300 ease-out w-full max-w-[31rem] rounded-[2.1rem] border border-[#f0e5cd]/18 bg-[linear-gradient(180deg,rgba(7,20,14,0.62),rgba(7,20,14,0.28))] p-[13px] text-white backdrop-blur-sm shadow-2xl sm:p-[21px]"
                style={{ transform: cardTransform, transformStyle: "preserve-3d" }}
              >
                <div className="overflow-hidden rounded-[1.6rem] border border-[#f0e5cd]/14 bg-white/8 p-[13px]">
                  <div className="grid gap-[13px] sm:grid-cols-[minmax(0,1fr)_144px]">
                    <div
                      className="group relative aspect-[4/5] w-full rounded-[1.2rem] border border-white/12 overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                    >
                    <Image
                    src="/images/tas-rumah-natural.png"
                    alt="Tas Rumah Natural"
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 opacity-40 blur-xl pointer-events-none transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(circle at ${light.x}% ${light.y}%, rgba(255,255,255,0.18), transparent 55%)`
                    }}
                  />
                </div>
                    <div className="grid gap-[13px]">
                      <div className="rounded-[1.2rem] border border-white/12 bg-[#efdfbf]/10 p-4">
                        <p className="text-[10px] uppercase tracking-[0.34em] text-[#f2e8d2]/72">
                          {locale === "en" ? "Collection card" : "Kartu koleksi"}
                        </p>
                        <p className="mt-3 font-display text-[1.75rem] leading-none text-white">Tas Rumah Collection</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/12 bg-white/8 p-4 text-sm leading-7 text-[#f4ead7]/88">
                        {locale === "en" ? "Featured motif" : "Motif unggulan"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="header-text-shadow mt-[13px] rounded-[1.25rem] border border-white/12 bg-white/12 px-4 py-3 text-[13px] text-white/92">
                  <span className="block whitespace-nowrap">
                    {locale === "en"
                      ? `${locale.toUpperCase()} / ${currency} preview`
                      : `Pratinjau ${locale.toUpperCase()} / ${currency}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
