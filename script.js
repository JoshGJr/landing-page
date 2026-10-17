document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile nav toggle
const toggle = document.querySelector(".nav-toggle");
const links = document.getElementById("nav-links");

toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});

links.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

// Dark / light theme toggle
const themeBtn = document.querySelector(".theme-toggle");
const root = document.documentElement;

function syncThemeBtn() {
  const light = root.dataset.theme === "light";
  themeBtn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
}

themeBtn.addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) {}
  syncThemeBtn();
});
syncThemeBtn();

// Pause / play the decorative motion (typewriter, petals, floating sun).
// Starts paused when the visitor prefers reduced motion.
const motionBtn = document.querySelector(".motion-toggle");
let motionOn = !reduceMotion;

function syncMotion() {
  root.classList.toggle("motion-off", !motionOn);
  motionBtn.setAttribute("aria-label", motionOn ? "Pause animations" : "Play animations");
}

motionBtn.addEventListener("click", () => {
  motionOn = !motionOn;
  syncMotion();
});
syncMotion();

// Highlight the nav link for the section in view
const navLinks = [...links.querySelectorAll("a")];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href")));

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) =>
        a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`)
      );
    });
  },
  { rootMargin: "-50% 0px -50% 0px" }
);
sections.forEach((s) => navObserver.observe(s));

// Fade sections in as they scroll into view
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Typewriter effect in the hero
const typed = document.getElementById("typed");
const phrases = ["builder of things", "binge-watcher", "manga reader", "seasonal anime tracker"];

{
  let phrase = 0;
  let char = phrases[0].length;
  let deleting = true;

  const tick = () => {
    if (!motionOn) {
      typed.textContent = phrases[phrase];
      char = phrases[phrase].length;
      deleting = true;
      return setTimeout(tick, 500);
    }
    const word = phrases[phrase];
    char += deleting ? -1 : 1;
    typed.textContent = word.slice(0, char);

    let delay = deleting ? 50 : 90;
    if (!deleting && char === word.length) {
      deleting = true;
      delay = 1800;
    } else if (deleting && char === 0) {
      deleting = false;
      phrase = (phrase + 1) % phrases.length;
      delay = 300;
    }
    setTimeout(tick, delay);
  };

  setTimeout(tick, 2000);
}

// Falling sakura petals
{
  const spawnPetal = () => {
    if (!motionOn) return;
    const petal = document.createElement("span");
    petal.className = "petal";
    petal.style.left = `${Math.random() * 100}vw`;
    if (Math.random() < 0.4) petal.style.background = "var(--petal-2)";
    petal.style.setProperty("--drift", `${(Math.random() - 0.5) * 200}px`);
    petal.style.animationDuration = `${6 + Math.random() * 6}s`;
    const size = 0.6 + Math.random() * 0.8;
    petal.style.width = `${12 * size}px`;
    petal.style.height = `${10 * size}px`;
    document.body.appendChild(petal);
    petal.addEventListener("animationend", () => petal.remove());
  };

  setInterval(spawnPetal, 900);
}

// Anime moments slideshow: each slide's progress bar finishing advances the loop
const stage = document.querySelector(".stage");
const slides = [...stage.querySelectorAll(".slide")];
const bar = stage.querySelector(".progress-bar");
const playBtn = stage.querySelector(".ctl-play");
const dotsWrap = stage.querySelector(".dots");

let current = 0;
let userPaused = reduceMotion;
let inView = false;
let hovering = false;
let soundOn = false; // browsers only allow sound after a click, so it starts off
let waitTimer;

const soundBtn = stage.querySelector(".ctl-sound");

const dots = slides.map((_, i) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "dot";
  dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
  dot.addEventListener("click", () => show(i));
  dotsWrap.appendChild(dot);
  return dot;
});

// Optional clips: clips/<data-clip>.mp4. A missing file just drops the video
// and the animated panel underneath stays.
slides.forEach((s) => {
  if (!s.dataset.clip || s.dataset.youtube) return;
  const v = document.createElement("video");
  v.muted = !soundOn;
  v.loop = true;
  v.addEventListener("playing", () => s.classList.add("playing"));
  v.addEventListener("pause", () => s.classList.remove("playing"));
  v.playsInline = true;
  v.preload = "none";
  v.setAttribute("aria-hidden", "true");
  v.dataset.src = `clips/${s.dataset.clip}.mp4`;
  v.addEventListener("error", () => v.remove());
  s.querySelector(".fx").after(v);
});

// Official trailers: a controls-free YouTube embed that only exists while its
// slide is showing. Needs http(s), not file://.
const ytCommand = (frame, func, args = []) =>
  frame.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");

// The slide's timer waits for the trailer to actually start playing, so load
// time doesn't eat into the slide. 8s is the cap if it never reports back.
const stopWaiting = () => {
  clearTimeout(waitTimer);
  stage.classList.remove("waiting");
  syncRunning();
};

// YouTube rejects embeds with no web origin (error 153), so file:// pages skip
// the embed and keep the animated panel. A player that reports an error is
// dropped for the rest of the visit for the same reason.
const canEmbed = location.protocol.startsWith("http");

window.addEventListener("message", (e) => {
  let host;
  try { host = new URL(e.origin).hostname; } catch { return; }
  if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return;
  let data;
  try { data = JSON.parse(e.data); } catch { return; }
  const s = slides.find((sl) => sl.querySelector("iframe")?.contentWindow === e.source);
  if (!s) return;

  if (data.event === "onError") {
    s.dataset.ytFailed = "1";
    s.querySelector("iframe").remove();
    s.classList.remove("playing");
    if (s === slides[current]) stopWaiting();
    return;
  }

  const state = data.event === "onStateChange" ? data.info : data.info?.playerState;
  if (state === undefined) return;
  s.classList.toggle("playing", state === 1);
  if (state === 1 && s === slides[current]) stopWaiting();
});

const updateYouTube = (s, k) => {
  let frame = s.querySelector("iframe");
  if (k !== current) {
    s.classList.remove("playing");
    return frame && frame.remove();
  }
  if (!canEmbed || s.dataset.ytFailed) return;
  const running = stage.classList.contains("running");
  if (!frame) {
    if (!running) return;
    const id = s.dataset.youtube;
    const params = new URLSearchParams({
      autoplay: "1", mute: soundOn ? "0" : "1", controls: "0", loop: "1", playlist: id,
      playsinline: "1", rel: "0", modestbranding: "1", disablekb: "1", enablejsapi: "1",
      start: s.dataset.start || "0", origin: location.origin,
    });
    frame = document.createElement("iframe");
    frame.src = `https://www.youtube.com/embed/${id}?${params}`;
    // Ask the player to report errors back to this page
    frame.addEventListener("load", () =>
      frame.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"));
    frame.title = `${s.querySelector("h3").textContent} official trailer`;
    frame.allow = "autoplay; encrypted-media; picture-in-picture";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.tabIndex = -1;
    s.querySelector(".fx").after(frame);
    clearTimeout(waitTimer);
    waitTimer = setTimeout(stopWaiting, 8000);
  } else {
    ytCommand(frame, running ? "playVideo" : "pauseVideo");
  }
};

const updateVideos = () => {
  slides.forEach((s, k) => {
    if (s.dataset.youtube) return updateYouTube(s, k);
    const v = s.querySelector("video");
    if (!v) return;
    if (k !== current) return v.pause();
    if (!v.getAttribute("src")) v.src = v.dataset.src;
    if (stage.classList.contains("running")) v.play().catch(() => {});
    else v.pause();
  });
};

const syncRunning = () => {
  // "running" keeps the video playing; "timing" also advances the slide, which
  // hovering holds still without stopping the video.
  const running = !userPaused && inView;
  stage.classList.toggle("running", running);
  stage.classList.toggle("timing", running && !hovering && !stage.classList.contains("waiting"));
  updateVideos();
  playBtn.innerHTML = userPaused ? "&#9654;" : "&#10074;&#10074;";
  playBtn.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
};

function show(i) {
  current = (i + slides.length) % slides.length;
  slides.forEach((s, k) => {
    s.classList.toggle("active", k === current);
    s.setAttribute("aria-hidden", String(k !== current));
    dots[k].classList.toggle("active", k === current);
  });
  bar.style.animation = "none";
  void bar.offsetWidth;
  bar.style.animation = "";
  const v = slides[current].querySelector("video");
  if (v && v.readyState) v.currentTime = 0;
  const s = slides[current];
  clearTimeout(waitTimer);
  stage.classList.toggle("waiting", canEmbed && !!s.dataset.youtube && !s.dataset.ytFailed);
  syncRunning();
}

soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? "🔊" : "🔇";
  soundBtn.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  const frame = slides[current].querySelector("iframe");
  if (frame) ytCommand(frame, soundOn ? "unMute" : "mute");
  slides.forEach((sl) => {
    const clip = sl.querySelector("video");
    if (clip) clip.muted = !soundOn;
  });
});

bar.addEventListener("animationend", () => show(current + 1));
stage.querySelector(".ctl-prev").addEventListener("click", () => show(current - 1));
stage.querySelector(".ctl-next").addEventListener("click", () => show(current + 1));
playBtn.addEventListener("click", () => { userPaused = !userPaused; syncRunning(); });
// Mouse only: on a touchscreen a tap would leave "hover" stuck on and freeze the loop
stage.addEventListener("pointerenter", (e) => {
  if (e.pointerType === "mouse") { hovering = true; syncRunning(); }
});
stage.addEventListener("pointerleave", () => { hovering = false; syncRunning(); });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") show(current - 1);
  if (e.key === "ArrowRight") show(current + 1);
});

// Only run while on screen so the loop starts when the visitor gets here
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  syncRunning();
}, { threshold: 0.4 }).observe(stage);

show(0);
syncRunning();

// Contact form: open the visitor's mail app with the message filled in
const form = document.querySelector(".contact-form");
const status = form.querySelector(".form-status");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const subject = encodeURIComponent(`Hello from ${data.get("name")}`);
  const body = encodeURIComponent(`${data.get("message")}\n\nFrom: ${data.get("name")} <${data.get("email")}>`);
  window.location.href = `mailto:${form.dataset.email}?subject=${subject}&body=${body}`;
  status.textContent = "Opening your email app... ありがとう!";
  form.reset();
});
