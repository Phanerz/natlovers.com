"use client";

import Image from "next/image";
import {useLoopingTrack} from "@/components/use-looping-track";
import Link from "next/link";
import {useEffect, useMemo, useRef, useState} from "react";
import {ArrowDown, ArrowRight, Hand, Infinity as InfinityIcon, Leaf} from "lucide-react";
import {CurrencyCode, Locale} from "@/lib/site";
import {HeroCardStack} from "@/components/hero-card-stack";
import {DesignerName} from "@/components/hero-designer";
import {HeroFactCard, SDG_FACTS, VALUE_FACTS, warmFactImages, decodeFactImage, type HeroFact} from "@/components/hero-facts";

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

// Laptop and desktop photographs from the admin panel: a slow cross-fade, one every 15 seconds.
function DesktopSlides({urls}: {urls: string[]}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (urls.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % urls.length), 15000);
    return () => window.clearInterval(timer);
  }, [urls.length]);
  return (
    <div className="absolute inset-0">
      {urls.map((url, position) => (
        <Image
          key={url}
          src={url}
          alt=""
          fill
          sizes="100vw"
          priority={position === 0}
          className="object-cover transition-opacity duration-[1600ms] ease-in-out"
          style={{opacity: position === index ? 1 : 0}}
        />
      ))}
    </div>
  );
}

// How many places apart two slides are on the endless loop.
function slideDistance(index: number, active: number, count: number) {
  const real = ((index % count) + count) % count;
  const gap = Math.abs(real - active);
  return Math.min(gap, count - gap);
}

export function Hero({locale}: {locale: Locale; currency: CurrencyCode}) {
  const [offset, setOffset] = useState({x: 0, y: 0});
  const videoRef = useRef<HTMLVideoElement>(null);
  const [slide, setSlide] = useState(0);
  const [fact, setFact] = useState<HeroFact | null>(null);
  const [cardsEmpty, setCardsEmpty] = useState(false);
  const openFact = (item: HeroFact) => {
    void decodeFactImage(item.image).then(() => setFact(item));
  };
  // Photographs set in the admin panel (phone list, desktop list). Until they arrive, or when
  // none are set, the built-in photographs and the video are used.
  const [slides, setSlides] = useState<{mobile: string[]; desktop: string[]} | null>(null);
  const mobileSlides = useMemo(
    () => (slides && slides.mobile.length ? slides.mobile.map((src) => ({src, alt: "Natlovers"})) : MOBILE_SLIDES),
    [slides]
  );
  const slideCount = mobileSlides.length;
  const {trackRef, loop, onScroll: onTrackScroll, touchHandlers, next: nextSlide} = useLoopingTrack(slideCount, setSlide);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    let off = false;
    fetch("/api/admin/hero-cards?scope=slides", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (off) return;
        setSlides(data && Array.isArray(data.mobile) && Array.isArray(data.desktop) ? data : {mobile: [], desktop: []});
      })
      .catch(() => {
        if (!off) setSlides({mobile: [], desktop: []});
      });
    return () => {
      off = true;
    };
  }, []);

  // The phone photographs slide on their own every 15 seconds, unless they were just touched,
  // the page is hidden, or the carousel is off screen.
  useEffect(() => {
    if (slideCount < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track || document.hidden) return;
      if (Date.now() - lastTouchRef.current < 15000) return;
      const box = track.getBoundingClientRect();
      if (box.width === 0 || box.bottom <= 0 || box.top >= window.innerHeight) return;
      nextSlide();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [slideCount, nextSlide, trackRef]);

  // Phones only: once the page is idle, fetch the pictures the fact cards use.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const idle = window.setTimeout(warmFactImages, 1800);
    return () => window.clearTimeout(idle);
  }, []);

  // The poster image is what needs to paint fast (it's the LCP candidate on
  // this page) \u2014 the video itself is deferred until after the browser has
  // actually painted, so an 8MB+ eagerly-buffering <video autoPlay> doesn't
  // compete for bandwidth/main-thread time with everything else the page
  // needs on first load. Same video file, just no longer render-blocking.
  // Set programmatically (not a static <source>/autoPlay) because a <video>
  // doesn't reliably pick up a source added after the fact without an
  // explicit load() call; the double rAF guarantees this runs after the
  // browser has committed at least one real paint, not just after mount.
  const hasDesktopSlides = Boolean(slides && slides.desktop.length);
  useEffect(() => {
    // Wait for the admin list: with desktop photographs set there is no video at all.
    if (!slides || hasDesktopSlides) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, hasDesktopSlides]);

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
          {hasDesktopSlides && slides ? (
            <DesktopSlides urls={slides.desktop} />
          ) : (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              loop
              playsInline
              preload="none"
              poster="/images/natlovers-bags-1.jpg"
            />
          )}
          <div className="absolute inset-0 bg-[#06110b]/76" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_28%,rgba(115,155,134,0.26),transparent_22%),radial-gradient(circle_at_82%_24%,rgba(232,221,190,0.12),transparent_18%),linear-gradient(180deg,rgba(6,17,11,0.72),rgba(6,17,11,0.46)_42%,rgba(6,17,11,0.74)_100%)]" />
          <div className="ambient-orb left-10 top-10 h-28 w-28 bg-sand-100/12" />
          <div className="ambient-orb alt right-12 top-20 h-36 w-36 bg-forest-200/12" />
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1680px] flex-col justify-center px-4 py-5 max-sm:py-3 sm:px-6 md:px-8 lg:px-10 xl:px-14">
          <div className={`hero-grid grid${cardsEmpty ? " hero-grid--solo" : ""} h-full items-center gap-[21px] max-lg:content-center max-lg:gap-4 lg:grid-cols-[minmax(0,1.618fr)_minmax(360px,1fr)] lg:gap-[34px] xl:gap-[55px]`}>
            <div className="flex min-w-0 flex-col justify-center max-lg:order-2">
              <div className="hero-house">
                <span className="hero-house__by">{locale === "en" ? "Designed by" : "Dirancang oleh"}</span>
                <DesignerName locale={locale} />
                <span className="hero-house__bar" aria-hidden />
                <span className="hero-house__since">{locale === "en" ? "Since 1998" : "Sejak 1998"}</span>
              </div>

              <div
                className="museum-panel relative overflow-hidden transition-transform duration-300 ease-out mt-[21px] max-sm:mt-3 rounded-[2rem] border border-[#e8d49a]/30 bg-[linear-gradient(135deg,rgba(255,248,238,0.15),rgba(255,255,255,0.08))] px-5 py-6 max-sm:py-4 text-white backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.06)] max-lg:border-0 max-lg:bg-transparent max-lg:px-0 max-lg:shadow-none max-lg:backdrop-blur-none sm:px-7 sm:py-7 lg:px-[34px] lg:py-[34px] xl:px-[55px] xl:py-[34px]"
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

                <div className="mt-[21px] max-sm:mt-3 flex flex-wrap gap-2 sm:gap-[13px]">
                  <Link
                    href="/catalogue"
                    className="glass-btn-secondary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-center text-sm font-semibold text-forest-900 max-sm:px-5 max-sm:text-xs max-sm:leading-tight"
                  >
                    EXPLORE CATALOGUE <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="hero-cards-col flex min-w-0 items-center justify-center max-lg:hidden">
              <div
                className="floating-panel will-change-transform transition-transform duration-300 ease-out w-full max-w-[24rem] p-5 max-lg:max-w-[14rem] max-lg:p-2.5 max-sm:max-w-[min(12.5rem,23svh)] max-sm:p-2 sm:p-6"
                style={{ transform: cardTransform, transformStyle: "preserve-3d" }}
              >
                <HeroCardStack onEmpty={setCardsEmpty} />
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
          <div
            ref={trackRef}
            className="m-hero__track"
            onScroll={onTrackScroll}
            onTouchStart={() => {
              lastTouchRef.current = Date.now();
              touchHandlers.onTouchStart();
            }}
            onTouchEnd={touchHandlers.onTouchEnd}
            onTouchCancel={touchHandlers.onTouchCancel}
            onPointerDown={() => (lastTouchRef.current = Date.now())}
          >
            {(loop ? [mobileSlides[mobileSlides.length - 1], ...mobileSlides, mobileSlides[0]] : mobileSlides).map((item, position) => {
              const index = loop ? position - 1 : position;
              return (
              <div key={`${position}-${item.src}`} className="m-hero__slide">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  // The visible photograph and the two either side of it are fetched at once, the rest
                  // wait their turn; so a swipe always lands on a picture that is already there.
                  loading={index === 0 || slideDistance(index, slide, slideCount) <= 2 ? "eager" : "lazy"}
                  quality={70}
                  className="object-cover"
                />
              </div>
              );
            })}
          </div>
          {/* A mirrored copy of the visible photograph sits just above it, so pulling the page down
              past the top shows more of the picture, never a gap. */}
          {mobileSlides[slide] ? (
            <div className="m-hero__bleed" aria-hidden>
              <Image src={mobileSlides[slide].src} alt="" fill sizes="100vw" className="object-cover" />
            </div>
          ) : null}
          <div className="m-hero__fade" aria-hidden />
          <div className="m-hero__dots" aria-hidden>
            {mobileSlides.map((item, index) => (
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
            {VALUE_FACTS.map((item, index) => {
              const Icon = [Leaf, Hand, InfinityIcon][index];
              return (
                <li key={item.id}>
                  <button type="button" className="m-hero__value" aria-haspopup="dialog" onClick={() => openFact(item)}>
                    <Icon aria-hidden />
                    <span>{item.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="m-hero__impact">
            <p className="m-hero__eyebrow">Our Impact</p>
            <h2 className="m-hero__impact-title">Crafting with purpose.</h2>
            <ul className="m-hero__goals">
              {SDG_TILES.map((tile, index) => (
                <li key={tile.goal}>
                  <button
                    type="button"
                    className="m-hero__goal"
                    aria-haspopup="dialog"
                    aria-label={`UN Sustainable Development Goal ${tile.goal}: ${tile.name}. Read how we align.`}
                    onClick={() => openFact(SDG_FACTS[index])}
                  >
                    <Image src={tile.src} alt="" width={180} height={180} sizes="110px" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="m-hero__note">Our work aligns with selected Sustainable Development Goals.</p>
          </div>
        </div>
      </div>
      {fact ? <HeroFactCard fact={fact} onClose={() => setFact(null)} /> : null}
    </section>
  );
}
