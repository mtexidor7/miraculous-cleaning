// Scroll-controlled hero: pins the stage, scrubs the lobby video with scroll and
// steps through the three "Cleaning ..." messages in sync with it.

// Where the cleaner and machine sit in the frame (0..1) as the clip plays.
// Used to steer object-position so they stay in view on narrow screens.
const SUBJECT = [
  [0, 0.72, 0.4], [0.125, 0.69, 0.42], [0.25, 0.66, 0.45], [0.375, 0.61, 0.47],
  [0.5, 0.56, 0.5], [0.625, 0.51, 0.53], [0.75, 0.44, 0.55], [0.875, 0.38, 0.55], [1, 0.36, 0.52],
];
// Encoded files are cropped to 2790x1620 (the source has a black bar on the right)
const VIDEO_W = 2790, VIDEO_H = 1620, X_SCALE = 2880 / 2790;
const VIDEO_END = 0.9; // share of the pin spent playing; the rest holds the final frame

function subjectAt(t) {
  for (let i = 1; i < SUBJECT.length; i++) {
    const [t1, x1, y1] = SUBJECT[i];
    const [t0, x0, y0] = SUBJECT[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    }
  }
  return SUBJECT[SUBJECT.length - 1].slice(1);
}

export function initVideoHero({ gsap, ScrollTrigger, reduce }) {
  const hero = document.querySelector(".vhero");
  if (!hero) return null;
  const stage = hero.querySelector(".vhero__stage");
  const media = hero.querySelector(".vhero__media");
  const video = hero.querySelector(".vhero__video");
  const copy = hero.querySelector(".vhero__copy");
  const phrases = [...hero.querySelectorAll(".vhero__phrase")];
  const subs = [...hero.querySelectorAll(".vhero__sub")];
  const bars = [...hero.querySelectorAll(".vhero__steps b")];

  const saveData = navigator.connection && navigator.connection.saveData;
  let staticMode = reduce || saveData;
  let progress = 0;

  // ----- framing: keep the subject in view whatever the crop -----
  function frame(t) {
    const w = media.clientWidth, h = media.clientHeight;
    const s = Math.max(w / VIDEO_W, h / VIDEO_H);
    const dw = VIDEO_W * s, dh = VIDEO_H * s;
    const [sx, cy] = staticMode ? SUBJECT[0].slice(1) : subjectAt(t);
    const cx = Math.min(1, sx * X_SCALE);
    const px = dw - w > 1 ? gsap.utils.clamp(0, 1, (cx * dw - w / 2) / (dw - w)) : 0.5;
    const py = dh - h > 1 ? gsap.utils.clamp(0, 1, (cy * dh - h * 0.48) / (dh - h)) : 0.5;
    media.style.setProperty("--ox", (px * 100).toFixed(2) + "%");
    media.style.setProperty("--oy", (py * 100).toFixed(2) + "%");
  }
  frame(0);
  addEventListener("resize", () => frame(Math.min(1, progress / VIDEO_END)));

  // ----- reduced motion: a calm static hero, first message only -----
  if (reduce) {
    hero.classList.add("is-static");
    return { intro: () => gsap.timeline() };
  }

  // ----- video loading -----
  let target = 0, current = 0, loopOn = false, inView = true;
  const seekTimes = [];
  let seekStart = 0;

  function goStatic() {
    staticMode = true;
    hero.classList.add("is-static");
    hero.classList.remove("is-video-ready");
    loopOn = false;
    try { video.pause(); video.removeAttribute("src"); video.load(); } catch (e) {}
    frame(0);
  }

  if (!staticMode && video) {
    const coarse = matchMedia("(pointer: coarse)").matches;
    video.src = coarse || innerWidth < 900 ? video.dataset.srcSm : video.dataset.srcLg;
    video.muted = true;
    video.load();
    video.addEventListener("loadedmetadata", () => {
      // iOS paints frames for seeks only after one muted play
      const p = video.play();
      if (p && p.then) p.then(() => video.pause()).catch(() => {});
    }, { once: true });
    video.addEventListener("loadeddata", () => {
      hero.classList.add("is-video-ready");
      current = target;
      video.currentTime = current;
      startLoop();
    }, { once: true });
    video.addEventListener("error", goStatic, { once: true });
    video.addEventListener("seeking", () => (seekStart = performance.now()));
    video.addEventListener("seeked", () => {
      if (!seekStart) return;
      seekTimes.push(performance.now() - seekStart);
      seekStart = 0;
      if (seekTimes.length > 12) seekTimes.shift();
      // device can't keep up with scrubbing: fall back to the still frame
      if (seekTimes.length >= 8) {
        const sorted = [...seekTimes].sort((a, b) => a - b);
        if (sorted[Math.floor(sorted.length / 2)] > 260) goStatic();
      }
    });
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) startLoop(); }).observe(stage);
  } else {
    hero.classList.add("is-static");
  }

  function startLoop() {
    if (loopOn || staticMode) return;
    loopOn = true;
    requestAnimationFrame(tick);
  }
  function tick() {
    if (!loopOn || staticMode) return;
    if (!inView) { loopOn = false; return; }
    const d = target - current;
    current = Math.abs(d) < 0.002 ? target : current + d * 0.2;
    if (video.readyState >= 2 && !video.seeking && Math.abs(video.currentTime - current) > 0.012) {
      video.currentTime = current;
    }
    requestAnimationFrame(tick);
  }

  // ----- pinned sequence -----
  gsap.set(phrases.slice(1).concat(subs.slice(1)), { autoAlpha: 0, y: 26 });
  gsap.set([phrases[0], subs[0]], { autoAlpha: 1 });

  const landscape = () => matchMedia("(min-aspect-ratio: 1/1)").matches;
  const pinLength = () => innerHeight * (landscape() ? 2.3 : 1.9);

  const tl = gsap.timeline({ defaults: { ease: "none" } });
  // message windows: 0 to .32, .36 to .64, .68 to 1
  const swap = (from, to, at) => {
    tl.to([phrases[from], subs[from]], { autoAlpha: 0, y: -22, duration: 0.05, ease: "power1.in", stagger: 0.01 }, at)
      .fromTo([phrases[to], subs[to]], { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: "power2.out", stagger: 0.015 }, at + 0.045);
  };
  tl.to(bars[0], { scaleX: 1, duration: 0.33 }, 0)
    .to(bars[1], { scaleX: 1, duration: 0.31 }, 0.34)
    .to(bars[2], { scaleX: 1, duration: 0.32 }, 0.66);
  swap(0, 1, 0.3);
  swap(1, 2, 0.62);
  // as the cleaner glides left, the copy glides right so neither covers the other
  tl.to(copy, {
    x: () => (landscape() ? stage.clientWidth - copy.offsetWidth - copy.offsetLeft * 2 : 0),
    duration: 0.12, ease: "power2.inOut",
  }, 0.6)
    .to(".vhero__shade--left", { opacity: () => (landscape() ? 0 : 1), duration: 0.12 }, 0.6)
    .to(".vhero__shade--right", { opacity: () => (landscape() ? 1 : 0), duration: 0.12 }, 0.6)
    .to(".vhero__cue", { autoAlpha: 0, duration: 0.06 }, 0.04)
    .to(media, { scale: () => (landscape() ? 1.04 : 1), duration: 0.1, ease: "power1.in" }, 0.9)
    .set({}, {}, 1);

  ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: () => "+=" + pinLength(),
    pin: stage,
    scrub: 0.5,
    animation: tl,
    invalidateOnRefresh: true,
    onUpdate(self) {
      progress = self.progress;
      const t = Math.min(1, progress / VIDEO_END);
      frame(t);
      if (!staticMode && video.duration) target = t * (video.duration - 0.04);
      startLoop();
    },
  });

  return {
    intro() {
      return gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".vhero__eyebrow", { autoAlpha: 0, y: 20, duration: 1 }, 0.1)
        .from(".vhero__anchor", { yPercent: 40, autoAlpha: 0, duration: 1.4 }, 0)
        .from([phrases[0], subs[0]], { y: 30, autoAlpha: 0, duration: 1.2, stagger: 0.12, clearProps: "transform" }, 0.2)
        .from(".vhero__dock, .vhero__cue", { y: 30, autoAlpha: 0, duration: 1.1, stagger: 0.1 }, 0.35);
    },
  };
}
