# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build personal landing page (anime theme, red/black/purple). Three hand-written files: `index.html`, `styles.css`, `script.js`. No package.json, bundler, linter or tests. Python is not installed on this machine; use Node.

## Project rules

- Plain HTML/CSS/JS only. No frameworks, no build step.
- Colors live in CSS variables at the top of `styles.css`.
- Accessibility matters: every image needs alt text, and contrast must pass WCAG AA (4.5:1 for normal text). Use `--accent-text` / `--accent-2-text` for colored *text*; `--accent` / `--accent-2` are for backgrounds and borders (white on `--accent` passes, `--accent` as text on the dark backgrounds does not).
- Don't add new files without asking.

## Running it

```
node serve.js        # serves this folder at http://localhost:8765
```

Always view it through `http://localhost:8765`, not by opening `index.html` directly. YouTube refuses to play embeds on `file://` pages (error 153), so `script.js` deliberately skips the embed there and shows the animated panel instead.

## Architecture

Everything interesting is the **Anime Moments slideshow** (`#montage`, between About and Projects). It spans all three files:

- **Markup (`index.html`)**: 11 `<article class="slide">` elements. Each has per-slide colors (`--c1`/`--c2` inline), a mood class (`fx-action|funny|cute|heart|calm`) selecting the animated CSS backdrop, a big onomatopoeia `.sfx`, and a `.caption`. The animated panel is the base layer. Real media is optional and layered on top via `data-youtube="<id>"` (+ `data-start="<seconds>"`) or `data-clip="<name>"` (loads `clips/<name>.mp4`). Only slide 1 (Jujutsu Kaisen) has a YouTube trailer so far; `data-youtube` wins over `data-clip`.
- **Timing (`script.js`)**: there is no `setInterval`. The `.progress-bar` CSS animation (`--dur`, 9s) *is* the timer, and its `animationend` calls `show(current + 1)`. Total loop = slides × `--dur` (currently 99s; keep under 120s). Pausing is `animation-play-state`, driven by two stage classes: `running` (video should play) and `timing` (slide may advance). `timing` = running, not mouse-hovered, and not `waiting`. Hovering therefore freezes the slide but lets a trailer keep playing; `waiting` holds the timer until a YouTube player reports it is actually playing (8s cap).
- **YouTube embeds**: one iframe at most, created only when its slide is active *and* the stage is running, removed when the slide leaves. Created with `autoplay=1` (creating it paused and sending a play command later races the player and gets lost). Player state arrives via `postMessage` (`onStateChange` / `infoDelivery`), which toggles `.slide.playing`; control goes the other way via `ytCommand`. A player `onError` marks the slide `data-yt-failed` and falls back to the animated panel.
- **Playing state drives the UI**: `.slide.playing` fades out `.caption` and `.sfx` (CSS transition) so text doesn't cover the video.
- **Sound**: starts muted because browsers block unmuted autoplay before a click. The `.ctl-sound` button sets `soundOn`, which affects new embeds (`mute` param) and the current one (`mute`/`unMute` command).
- **Visibility gating**: an `IntersectionObserver` sets `inView`; nothing runs until the stage is on screen, and `prefers-reduced-motion` starts it paused with animations off.
- **Hover**: use `pointerenter` and only for `pointerType === "mouse"`. A touch tap would otherwise leave hover stuck and freeze the loop on phones.

Other page behavior in `script.js` (nav toggle, section reveal, typewriter, falling petals, mailto contact form) is independent and self-explanatory. Petal colors come from `--petal-1/--petal-2` in `:root`.

## Styling notes

- Dark by default; colors are variables in `:root` (`--accent` teal, `--accent-2` purple). `:root[data-theme="light"]` overrides the neutrals and text accents; the `.theme-toggle` button in the nav sets it (saved in localStorage, applied early by an inline script in `<head>`). The slideshow stays dark in both themes.
- Responsive breakpoints: `720px` (hamburger nav, single column, slideshow becomes 16:9) and `480px` (slideshow controls move below the video; this covers 375px phones). Keep tap targets at 40px+ and check 320, 360 and 375px widths.
- `.slide` is a size container (`container-type: size`); the YouTube iframe sizing relies on `cqw`/`cqh` to act like `object-fit: cover`.

## Placeholders still to replace

`you@example.com` (in `data-email` on the contact form and in the socials list), the `#` project links, and the generic GitHub / MyAnimeList URLs. `clips/README.txt` lists the expected local clip filenames.
