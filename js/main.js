// Miraculous: scroll choreography, cursor, loader, form.
import { initVideoHero } from "./video-hero.js";

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const mm = gsap.matchMedia();

root.classList.remove("no-js");
root.classList.add("js");
gsap.registerPlugin(ScrollTrigger, SplitText);

// ---------- Smooth scroll ----------
// The home page opens with a loader and a pinned hero, so always start at the top
if ("scrollRestoration" in history && document.querySelector(".loader")) {
  history.scrollRestoration = "manual";
  if (!location.hash) scrollTo(0, 0);
}
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.querySelectorAll('a[href^="#"], a[href^="/#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    let id = a.getAttribute("href");
    if (id.startsWith("/")) {
      if (location.pathname !== "/") return;
      id = id.slice(1);
    }
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.6 }) : el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });
});

// ---------- Scroll-controlled video hero ----------
const videoHero = initVideoHero({ gsap, ScrollTrigger, reduce });

// ---------- Header, progress, menu ----------
const header = document.querySelector(".header");
let lastY = 0;
ScrollTrigger.create({
  start: 0,
  end: "max",
  onUpdate(self) {
    const y = self.scroll();
    header.classList.toggle("is-scrolled", y > 40);
    header.classList.toggle("is-hidden", y > lastY && y > 400 && !root.classList.contains("menu-open"));
    lastY = y;
    gsap.set(".progress", { scaleX: self.progress });
  },
});

const menu = document.querySelector(".menu");
const menuBtn = document.querySelector(".menu-btn");
let menuTl;
function openMenu() {
  root.classList.add("menu-open");
  menuBtn.setAttribute("aria-expanded", "true");
  menu.removeAttribute("inert");
  lenis && lenis.stop();
  menuTl = gsap.timeline()
    .set(menu, { visibility: "visible" })
    .to(menu, { clipPath: "inset(0 0 0% 0)", duration: 0.9, ease: "expo.inOut" })
    .from(".menu__list li", { yPercent: 110, opacity: 0, stagger: 0.06, duration: 0.8, ease: "expo.out" }, "-=0.35")
    .from(".menu__foot", { opacity: 0, y: 20, duration: 0.6 }, "-=0.5");
}
function closeMenu() {
  if (!root.classList.contains("menu-open")) return;
  root.classList.remove("menu-open");
  menuBtn.setAttribute("aria-expanded", "false");
  menu.setAttribute("inert", "");
  lenis && lenis.start();
  gsap.to(menu, { clipPath: "inset(0 0 100% 0)", duration: 0.7, ease: "expo.inOut", onComplete: () => gsap.set(menu, { visibility: "hidden" }) });
}
menuBtn?.addEventListener("click", () => (root.classList.contains("menu-open") ? closeMenu() : openMenu()));
addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

// ---------- Cursor ----------
if (finePointer && !reduce) {
  root.classList.add("has-cursor");
  const dot = document.querySelector(".cursor__dot");
  const ring = document.querySelector(".cursor__ring");
  const cursor = document.querySelector(".cursor");
  const label = document.querySelector(".cursor__label");
  const xDot = gsap.quickTo(dot, "x", { duration: 0.08 }), yDot = gsap.quickTo(dot, "y", { duration: 0.08 });
  const xRing = gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3" }), yRing = gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3" });
  addEventListener("pointermove", (e) => { cursor.classList.add("is-active"); xDot(e.clientX); yDot(e.clientY); xRing(e.clientX); yRing(e.clientY); }, { passive: true });
  document.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
  document.querySelectorAll("a, button, summary, label.chip").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
  });
  document.querySelectorAll("[data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => { label.textContent = el.dataset.cursor; cursor.classList.add("is-media"); });
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-media"));
  });
  // magnetic buttons
  document.querySelectorAll(".btn, .pill").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.25);
      yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
  });
}

// ---------- Loader + intro ----------
function intro() {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  if (videoHero) tl.add(videoHero.intro(), 0);
  tl.from(".header", { autoAlpha: 0, duration: 1.1, clearProps: "opacity,visibility" }, 0.3);
  return tl;
}

const loader = document.querySelector(".loader");
if (loader && !reduce) {
  lenis && lenis.stop();
  const count = loader.querySelector(".loader__count");
  const obj = { v: 0 };
  const ready = Promise.race([
    Promise.all([document.fonts.ready, new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r)))]),
    new Promise((r) => setTimeout(r, 3200)),
  ]);
  const tl = gsap.timeline();
  tl.to(".loader__logo", { clipPath: "inset(0% 0 0 0 round 22px)", duration: 1.3, ease: "expo.inOut" }, 0)
    .from(".loader__logo .logo", { scale: 1.12, duration: 1.8, ease: "expo.out" }, 0)
    .to(obj, { v: 86, duration: 1.6, ease: "power2.out", onUpdate: () => (count.textContent = String(Math.round(obj.v)).padStart(3, "0")) }, 0)
    .to(".loader__blade", { scaleX: 0.86, duration: 1.6, ease: "power2.out" }, 0);
  ready.then(() => {
    tl.then(() => {
      gsap.timeline({
        onComplete: () => {
          loader.remove();
          document.body.classList.remove("is-loading");
          lenis && lenis.start();
          ScrollTrigger.refresh();
        },
      })
        .to(obj, { v: 100, duration: 0.4, onUpdate: () => (count.textContent = String(Math.round(obj.v)).padStart(3, "0")) })
        .to(".loader__blade", { scaleX: 1, duration: 0.4 }, "<")
        .to(".loader__inner", { opacity: 0, y: -30, duration: 0.6, ease: "power3.in" })
        .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, "-=0.2")
        .add(intro(), "-=0.75");
    });
  });
} else {
  loader?.remove();
  document.body.classList.remove("is-loading");
}

if (reduce) {
  document.querySelectorAll("video[data-autoplay]").forEach((v) => v.removeAttribute("autoplay"));
} else {
  // ---------- Generic reveals ----------
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  gsap.utils.toArray(".reveal-img").forEach((el) => {
    gsap.to(el, { clipPath: "inset(0% 0 0 0)", duration: 1.5, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.utils.toArray("[data-split]").forEach((el) => {
    const split = SplitText.create(el, { type: "lines,words", mask: "lines" });
    gsap.from(split.words, { yPercent: 115, duration: 1.2, stagger: 0.035, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.utils.toArray("[data-parallax]").forEach((el) => {
    gsap.fromTo(el, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // ---------- Marquee with scroll velocity ----------
  document.querySelectorAll(".marquee__track").forEach((track) => {
    const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
    let dir = 1;
    ScrollTrigger.create({
      onUpdate(self) {
        const v = self.getVelocity();
        if (self.direction !== dir) { dir = self.direction; }
        gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(v) / 400, 5)), duration: 0.25, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.4, delay: 0.25, ease: "power2.out" });
        gsap.to(track, { skewX: gsap.utils.clamp(-8, 8, -v / 300), duration: 0.4, overwrite: "auto" });
        gsap.to(track, { skewX: 0, duration: 0.9, delay: 0.3 });
      },
    });
  });

  // ---------- Manifesto word fill ----------
  const mani = document.querySelector(".manifesto__text");
  if (mani) {
    const split = SplitText.create(mani, { type: "words", wordsClass: "word" });
    split.words.forEach((w) => { if (/^(miraculous|ready)$/i.test(w.textContent.trim())) w.classList.add("hl"); });
    gsap.to(split.words, {
      opacity: 1, stagger: 0.08, ease: "none",
      scrollTrigger: { trigger: mani, start: "top 78%", end: "bottom 45%", scrub: 0.6 },
    });
  }
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 2, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => (el.textContent = Math.round(obj.v) + (el.dataset.suffix || "")),
    });
  });

  // ---------- After hours: pinned, expanding frame, scrubbed video ----------
  const night = document.querySelector(".night");
  if (night) {
    const video = night.querySelector("video");
    const clock = night.querySelector(".night__clock span");
    const steps = night.querySelectorAll(".night__step");
    const times = ["18:00", "21:30", "02:00", "05:30"];
    const scrubVideo = finePointer && video;
    if (video && !scrubVideo) video.play().catch(() => {});
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: night, start: "top top", end: "+=260%", pin: true, scrub: 0.8,
        onUpdate(self) {
          const p = self.progress;
          const i = Math.min(times.length - 1, Math.floor(p * times.length));
          clock.textContent = times[i];
          steps.forEach((s, k) => s.classList.toggle("is-on", p > (k + 0.6) / (steps.length + 1)));
          if (scrubVideo && video.duration) video.currentTime = Math.min(video.duration - 0.05, p * video.duration);
        },
      },
    });
    mm.add("(min-width: 900px)", () => {
      tl.to(".night__frame", { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.inOut", duration: 1 }, 0);
    });
    mm.add("(max-width: 899px)", () => {
      tl.to(".night__frame", { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.inOut", duration: 1 }, 0);
    });
    tl.to(".night__frame video, .night__frame img", { scale: 1, ease: "none", duration: 2 }, 0)
      .from(".night__head", { opacity: 0, y: 40, duration: 0.5 }, 0.1)
      .to({}, { duration: 0.6 });
  }

  // ---------- Services horizontal ----------
  mm.add("(min-width: 900px)", () => {
    const track = document.querySelector(".hscroll__track");
    if (!track) return;
    const counter = document.querySelector(".services__count b");
    const cards = track.querySelectorAll(".svc");
    const dist = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: ".hscroll", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.9, invalidateOnRefresh: true,
        onUpdate: (s) => counter && (counter.textContent = String(Math.min(cards.length, Math.floor(s.progress * cards.length) + 1)).padStart(2, "0")),
      },
    });
    cards.forEach((card) => {
      const media = card.querySelector(".svc__media img, .svc__media video");
      gsap.fromTo(media, { xPercent: 8, scale: 1.12 }, {
        xPercent: -8, scale: 1, ease: "none",
        scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
      });
    });
  });
  mm.add("(max-width: 899px)", () => {
    gsap.utils.toArray(".hscroll .svc").forEach((card) => {
      gsap.from(card, { opacity: 0, y: 60, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 88%" } });
    });
  });

  // ---------- Squeegee wipe ----------
  const wipe = document.querySelector(".wipe");
  if (wipe) {
    const after = wipe.querySelector(".wipe__layer--after");
    const blade = wipe.querySelector(".wipe__blade");
    const pct = wipe.querySelector(".wipe__pct");
    ScrollTrigger.create({
      trigger: wipe, start: "top top", end: "+=200%", pin: true, scrub: 0.6,
      onUpdate(self) {
        const p = gsap.parseEase("power1.inOut")(self.progress);
        const w = wipe.clientWidth;
        after.style.clipPath = `inset(0 ${100 - p * 100}% 0 0)`;
        gsap.set(blade, { x: p * w - 8 });
        pct.textContent = Math.round(p * 100) + "%";
      },
    });
  }

  // ---------- Industries hover preview ----------
  if (finePointer) {
    const prev = document.querySelector(".ind-preview");
    const imgs = prev ? prev.querySelectorAll("img") : [];
    if (prev) {
      const xTo = gsap.quickTo(prev, "x", { duration: 0.6, ease: "power3" });
      const yTo = gsap.quickTo(prev, "y", { duration: 0.6, ease: "power3" });
      const list = document.querySelector(".ind-list");
      list.addEventListener("pointermove", (e) => { xTo(e.clientX + 40); yTo(e.clientY); });
      list.addEventListener("pointerenter", () => gsap.to(prev, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" }));
      list.addEventListener("pointerleave", () => gsap.to(prev, { opacity: 0, scale: 0.6, duration: 0.4 }));
      list.querySelectorAll(".ind").forEach((row, i) => {
        row.addEventListener("pointerenter", () => {
          imgs.forEach((im, k) => im.classList.toggle("is-on", k === i));
          gsap.fromTo(prev, { rotate: (i % 2 ? 1 : -1) * 6 }, { rotate: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" });
        });
      });
    }
  }

  // ---------- Process line ----------
  const steps = document.querySelector(".steps");
  if (steps) {
    gsap.to(".steps__fill", { scaleY: 1, ease: "none", scrollTrigger: { trigger: steps, start: "top 60%", end: "bottom 60%", scrub: true } });
    steps.querySelectorAll(".step").forEach((s) => ScrollTrigger.create({ trigger: s, start: "top 62%", onToggle: (st) => s.classList.toggle("is-on", st.isActive || st.progress > 0), end: "max" }));
  }

  // ---------- Area reveal ----------
  if (document.querySelector(".area__media")) {
    gsap.timeline({ scrollTrigger: { trigger: ".area__media", start: "top 85%", end: "center center", scrub: 1 } })
      .to(".area__media", { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none" }, 0)
      .to(".area__media img", { scale: 1, ease: "none" }, 0);
    gsap.from(".cities li", { opacity: 0, y: 24, stagger: 0.05, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: ".cities", start: "top 90%" } });
  }

  // ---------- Finale: building lights up with scroll ----------
  const finale = document.querySelector(".finale");
  if (finale) {
    const v = finale.querySelector("video");
    const scrub = finePointer && v;
    if (v && !scrub) v.play().catch(() => {});
    gsap.timeline({
      scrollTrigger: {
        trigger: finale, start: "top top", end: "+=160%", pin: true, scrub: 0.8,
        onUpdate(self) { if (scrub && v.duration) v.currentTime = Math.min(v.duration - 0.05, self.progress * v.duration); },
      },
    })
      .fromTo(finale.querySelector("video, img"), { scale: 1.2 }, { scale: 1, ease: "none", duration: 1 }, 0)
      .from(".finale__copy", { opacity: 0, y: 80, duration: 0.5 }, 0.35);
  }

  // ---------- Footer wordmark ----------
  if (document.querySelector(".footer__word")) {
    gsap.to(".footer__word", { clipPath: "inset(0 0 0% 0)", ease: "none", scrollTrigger: { trigger: ".footer__word", start: "top bottom", end: "bottom 92%", scrub: true } });
  }

  // ---------- Service page hero ----------
  if (document.querySelector(".page-hero")) {
    gsap.to(".page-hero__media img, .page-hero__media video", { scale: 1, yPercent: 10, ease: "none", scrollTrigger: { trigger: ".page-hero", start: "top top", end: "bottom top", scrub: true } });
    const t = document.querySelector("[data-split-hero]");
    if (t && !loader) {
      const split = SplitText.create(t, { type: "lines,words", mask: "lines" });
      gsap.from(split.words, { yPercent: 115, duration: 1.3, stagger: 0.05, ease: "expo.out", delay: 0.15 });
      gsap.from(".page-hero .hero__card, .crumbs", { opacity: 0, y: 40, duration: 1.2, ease: "expo.out", delay: 0.4 });
    }
  }
}

// ---------- FAQ smooth open ----------
document.querySelectorAll(".qa").forEach((d) => {
  const sum = d.querySelector("summary");
  const body = d.querySelector(".qa__a");
  sum.addEventListener("click", (e) => {
    if (reduce) return;
    e.preventDefault();
    if (d.open) {
      gsap.to(body, { height: 0, duration: 0.5, ease: "expo.inOut", onComplete: () => { d.open = false; gsap.set(body, { clearProps: "height" }); ScrollTrigger.refresh(); } });
    } else {
      d.open = true;
      gsap.fromTo(body, { height: 0 }, { height: "auto", duration: 0.7, ease: "expo.out", onComplete: () => ScrollTrigger.refresh() });
    }
  });
});

// ---------- Videos: lazy play when visible (non-scrubbed ones) ----------
const vio = new IntersectionObserver((entries) => {
  entries.forEach(({ isIntersecting, target }) => {
    if (reduce) return;
    if (isIntersecting) target.play().catch(() => {});
    else target.pause();
  });
}, { rootMargin: "200px" });
document.querySelectorAll("video[data-autoplay]").forEach((v) => vio.observe(v));

// ---------- Quote form ----------
const form = document.querySelector("#quote-form");
if (form) {
  const status = form.querySelector(".form__status");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll("[required]").forEach((input) => {
      const field = input.closest(".field");
      const err = field?.querySelector(".err");
      const valid = input.checkValidity();
      field?.classList.toggle("has-err", !valid);
      if (err) err.textContent = valid ? "" : input.dataset.error || "Please fill this in.";
      if (!valid && ok) { input.focus(); ok = false; }
    });
    if (!ok) return;
    const data = Object.fromEntries(new FormData(form));
    const endpoint = form.dataset.endpoint;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      if (endpoint) {
        const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error("bad status");
        status.textContent = "Thank you. Your request is in, and we will call you shortly.";
        form.reset();
      } else {
        const body = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n");
        const to = form.dataset.mailto;
        if (to) location.href = `mailto:${to}?subject=${encodeURIComponent("Commercial cleaning quote request")}&body=${encodeURIComponent(body)}`;
        else status.textContent = "Online requests are being set up. Please call (863) 221-6645 and we will take your details right away.";
      }
    } catch (err) {
      status.textContent = "Something went wrong sending that. Please call (863) 221-6645.";
    } finally {
      btn.disabled = false;
    }
  });
}

addEventListener("load", () => ScrollTrigger.refresh());
document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());
