"use client";

import Image from "next/image";
import Link from "next/link";
import {useEffect, useMemo, useRef, useState} from "react";
import {ArrowDown, ArrowRight, Hand, Infinity as InfinityIcon, Leaf} from "lucide-react";
import {CurrencyCode, Locale} from "@/lib/site";
import {HeroCardStack} from "@/components/hero-card-stack";

const HERO_VIDEO_SRC = "https://ftw7p3nsw06ehaup.public.blob.vercel-storage.com/natlovers-hero.mp4";

const phonetic = "/\u02C8n\u00E6t.l\u0259\u028A.v\u0259z/";

// The phone hero is a short, swipeable run of real NATLOVERS photographs (all
// already in /public/images). No autoplay: swiping is the only motion.
const MOBILE_SLIDES = [
  {src: "/images/natlovers-bags-1.jpg", alt: "Handwoven natural-fibre bags with embroidered dolls"},
  {src: "/images/natlovers-bags-2.webp", alt: "Embroidered Natlovers bag detail"},
  {src: "/images/natlovers-bags-4.webp", alt: "Natlovers bags in natural fibre and colour"}
];

// Official UN Sustainable Development Goal tiles (English), from sdgs.un.org.
const SDG_TILES = [
  {goal: 8, name: "Decent Work and Economic Growth", src: "/images/sdg/sdg-8.webp"},
  {goal: 12, name: "Responsible Consumption and Production", src: "/images/sdg/sdg-12.webp"},
  {goal: 11, name: "Sustainable Cities and Communities", src: "/images/sdg/sdg-11.webp"}
];

export function Hero({locale}: {locale: Locale; currency: CurrencyCode}) {
  const [offset, setOffset] = useState({x: 0, y: 0});
  const videoRef = useRef<HTMLVideoElement>(null);
  const [slide, setSlide] = useState(0);
  const slideCount = MOBILE_SLIDES.length;

  function handleSlideScroll(event: React.UIEvent<HTMLDivElement>) {
    const track = event.currentTarget;
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    setSlide((current) => (current === index ? current : Math.min(slideCount - 1, Math.max(0, index))));
  }

  // The poster image is what needs to paint fast (it's the LCP candidate on
  // this page) \u2014 the video itself is deferred until after the browser has
  // actually painted, so an 8MB+ eagerly-buffering <video autoPlay> doesn't
  // compete for bandwidth/main-thread time with everything else the page
  // needs on first load. Same video file, just no longer render-blocking.
  // Set programmatically (not a static <source>/autoPlay) because a <video>
  // doesn't reliably pick up a source added after the fact without an
  // explicit load() call; the double rAF guarantees this runs after the
  // browser has committed at least one real paint, not just after mount.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Phones and tablets keep the still poster: an 8MB looping video is the
    // heaviest thing on the page and not worth the data, battery or jank.
    if (window.matchMedia("(max-width: 1023px)").matches) return;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        el.src = HERO_VIDEO_SRC;
        el.load();
        el.play().catch(() => {
          // Autoplay can still be blocked in some contexts even when
          // muted \u2014 the poster stays visible either way, so this is a
          // silent no-op rather than an error state.
        });
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, []);

const titleTransform = useMemo(() => {
  return `perspective(1200px)
    rotateX(${offset.y * -2}deg)
    rotateY(${offset.x * 2}deg)
    translate3d(${offset.x * 10}px, ${offset.y * 6}px, 40px)`
}, [offset.x, offset.y])

const backgroundTransform = useMemo(() => {
  return `translate3d(${offset.x * -4}px, ${offset.y * -3}px, 0) scale(1.05)`
}, [offset.x, offset.y])

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
  }

  function handleLeave() {
    setOffset({ x: 0, y: 0 })
  }

  return (
    <section className="page-enter">
      <div
        className="hero-stage relative overflow-hidden max-lg:hidden border-b border-[#efe3cb]/14 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <div className="absolute inset-0 bg-[#07120d]" />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ transform: backgroundTransform }}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            loop
            playsInline
            preload="none"
            poster="/images/natlovers-bags-1.jpg"
          />
          <div className="absolute inset-0 bg-[#06110b]/76" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_28%,rgba(115,155,134,0.26),transparent_22%),radial-gradient(circle_at_82%_24%,rgba(232,221,190,0.12),transparent_18%),linear-gradient(180deg,rgba(6,17,11,0.72),rgba(6,17,11,0.46)_42%,rgba(6,17,11,0.74)_100%)]" />
          <div className="ambient-orb left-10 top-10 h-28 w-28 bg-sand-100/12" />
          <div className="ambient-orb alt right-12 top-20 h-36 w-36 bg-forest-200/12" />
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1680px] flex-col justify-center px-4 py-5 max-sm:py-3 sm:px-6 md:px-8 lg:px-10 xl:px-14">
          <div className="grid h-full items-center gap-[21px] max-lg:content-center max-lg:gap-4 lg:grid-cols-[minmax(0,1.618fr)_minmax(360px,1fr)] lg:gap-[34px] xl:gap-[55px]">
            <div className="flex min-w-0 flex-col justify-center max-lg:order-2">
              <div className="header-text-shadow inline-flex w-fit rounded-full border border-[#f3e7cf]/38 bg-black/24 px-4 py-2 max-sm:px-3 max-sm:py-1 text-[11px] max-sm:text-[10px] font-medium uppercase tracking-[0.3em] max-sm:tracking-[0.22em] text-white backdrop-blur-sm max-lg:backdrop-blur-none shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                {locale === "en" ? "Handcrafted in Indonesia" : "Dibuat tangan di Indonesia"}
              </div>

              <div
                className="museum-panel relative overflow-hidden transition-transform duration-300 ease-out mt-[21px] max-sm:mt-3 rounded-xl border border-[#efe3cb]/20 bg-[linear-gradient(135deg,rgba(255,248,238,0.15),rgba(255,255,255,0.08))] px-5 py-6 max-sm:py-4 text-white backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.06)] max-lg:border-0 max-lg:bg-transparent max-lg:px-0 max-lg:shadow-none max-lg:backdrop-blur-none sm:px-7 sm:py-7 lg:px-[34px] lg:py-[34px] xl:px-[55px] xl:py-[34px]"
                style={{ transform: titleTransform, transformStyle: "preserve-3d" }}
              >
                {/* glass light sweep */}
                <div
                  className="pointer-events-none absolute inset-y-0 -left-[40%] w-[60%] max-lg:hidden bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)] blur-2xl opacity-20 animate-[glassSweep_8s_linear_infinite]"
                />

  <div className="min-w-0"></div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-[0.42em] text-[#f2e8d2]/84">
                    {locale === "en" ? "Dictionary entry / House of craft" : "Entri kamus / Rumah kriya"}
                  </div>
                  <div className="hero-title-shadow mt-[13px] font-display text-[clamp(2.6rem,5vw,5.25rem)] max-sm:text-[3rem] leading-[0.9] tracking-[-0.06em] text-white">
                    NATLOVERS
                  </div>
                </div>

                <div className="mt-[21px] max-sm:mt-2 grid gap-[13px] text-white max-md:flex max-md:items-baseline max-md:gap-3 md:grid-cols-[auto_auto_1fr] md:items-end">
                  <span className="hero-copy-shadow font-display text-[clamp(1rem,1.25vw,1.32rem)] text-white">{phonetic}</span>
                  <span className="header-text-shadow text-[11px] font-medium uppercase tracking-[0.3em] text-white/88">noun</span>
                  <span className="hidden h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.82),rgba(255,255,255,0.16))] md:block" />
                </div>
                <div className="mt-2 h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.9),rgba(255,255,255,0.18))] md:hidden" />

                <div className="mt-[21px] max-sm:mt-3 max-w-none">
                  <p className="hero-definition hero-copy-shadow font-display text-[clamp(1.05rem,1.55vw,1.72rem)] text-white">
                    {locale === "en"
                      ? "Unique sustainable natural-fibre crafts preserving tradition through thoughtful design."
                      : "Kriya serat alami berkelanjutan yang unik, menjaga tradisi melalui desain yang penuh perhatian."}
                  </p>
                </div>

                <div className="mt-[21px] max-sm:mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-[13px]">
                  <Link
                    href="/catalogue"
                    className="glass-btn-secondary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-center text-sm font-semibold text-forest-900 max-sm:px-3 max-sm:text-[11px] max-sm:leading-tight"
                  >
                    EXPLORE CATALOGUE <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/custom"
                    className="liquid-glass button-lift inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-center text-sm font-semibold text-white max-sm:px-3 max-sm:text-[11px] max-sm:leading-tight"
                  >
                    REQUEST A CUSTOM PIECE
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-center max-lg:hidden">
              <div
                className="floating-panel will-change-transform transition-transform duration-300 ease-out w-full max-w-[24rem] p-5 max-lg:max-w-[14rem] max-lg:p-2.5 max-sm:max-w-[min(12.5rem,23svh)] max-sm:p-2 sm:p-6"
                style={{ transform: cardTransform, transformStyle: "preserve-3d" }}
              >
                <HeroCardStack />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phones and tablets only: one composed screen  -  photograph dissolving into
          the cream page, the dictionary definition, the two actions, the three
          values and three UN goals. Sizes follow the visible height (svh) so it
          fits without scrolling on any phone. */}
      <div className="m-hero lg:hidden">
        <div className="m-hero__photo">
          <div className="m-hero__track" onScroll={handleSlideScroll}>
            {MOBILE_SLIDES.map((item, index) => (
              <div key={item.src} className="m-hero__slide">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          <div className="m-hero__fade" aria-hidden />
          <div className="m-hero__dots" aria-hidden>
            {MOBILE_SLIDES.map((item, index) => (
              <span key={item.src} className={index === slide ? "is-active" : undefined} />
            ))}
          </div>
        </div>

        <div className="m-hero__body">
          <h1 className="m-hero__title">NATLOVERS</h1>
          <p className="m-hero__phonetic">
            <span>{phonetic}</span>
            <span className="m-hero__pos">noun</span>
          </p>
          <p className="m-hero__definition">{locale === "en" ? "Unique sustainable natural-fibre crafts preserving tradition through thoughtful design." : "Kriya serat alami berkelanjutan yang unik, menjaga tradisi melalui desain yang penuh perhatian."}</p>

          <div className="m-hero__actions">
            {/* On the home page this is an in-page step down to the catalogue page;
                the href is the fallback if that section is not there. */}
            <Link
              href="/catalogue"
              className="m-hero__btn"
              onClick={(event) => {
                const next = document.querySelector('[data-nav-href="/catalogue"]');
                if (!next) return;
                event.preventDefault();
                next.scrollIntoView({behavior: "smooth", block: "start"});
              }}
            >
              <span>{locale === "en" ? "Explore Catalogue" : "Jelajahi Katalog"}</span>
              <span className="m-hero__btn-icon" aria-hidden>
                <ArrowDown />
              </span>
            </Link>
          </div>

          <ul className="m-hero__values">
            <li>
              <Leaf aria-hidden />
              <span>Natural Materials</span>
            </li>
            <li>
              <Hand aria-hidden />
              <span>Handcrafted</span>
            </li>
            <li>
              <InfinityIcon aria-hidden />
              <span>Sustainable</span>
            </li>
          </ul>

          <div className="m-hero__impact">
            <p className="m-hero__eyebrow">Our Impact</p>
            <h2 className="m-hero__impact-title">Crafting with purpose.</h2>
            <ul className="m-hero__goals">
              {SDG_TILES.map((tile) => (
                <li key={tile.goal}>
                  <Image
                    src={tile.src}
                    alt={`UN Sustainable Development Goal ${tile.goal}: ${tile.name}`}
                    width={180}
                    height={180}
                    sizes="110px"
                  />
                </li>
              ))}
            </ul>
            <p className="m-hero__note">Our work aligns with selected Sustainable Development Goals.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
