# ⚡ ECHO DUEL — ACCESSIBLE REACTION SHOWDOWN

An ultra-polished, accessible hackathon prototype demonstrating how the **exact same 1v1 reaction game** can be enjoyed equally by:
* **Blind & Low-Vision Players** (Spatial stereo audio cues, pitch differentiation, ARIA live region + Web Speech TTS)
* **Deaf & Hard-of-Hearing Players** (High-contrast visual telegraphs, shape/symbol badging `◄ ◉ ►`, tension pulse ring, visual sound banner)
* **Players with Motor Disabilities** (Unified single-switch auto-scanning mode, 100% playable via a single Spacebar, Enter, or Screen Tap)
* **Non-Speaking Players** (Zero voice input required; completely playable via touch, keyboard, or switch)
* **Players without Disabilities** (A thrilling, high-speed 1v1 reaction showdown with tight game feel and high replayability)

---

## 🎮 CORE GAMEPLAY LOOP

```
MENU ➔ TENSION (Hold... Wait...) ➔ SIGNAL TRIGGER (◄ / ◉ / ►) ➔ REACTION SHOWDOWN ➔ ROUND RESULT ➔ MATCH OVER / REPLAY
```

1. **The Tension**: Duelists face off in silence while a rhythmic heartbeat builds tension. Premature strikes result in an immediate **False Start** penalty!
2. **The Signal**: At an unpredictable moment between 1.3s and 2.7s, a directional cue fires (Left, Center, or Right).
3. **The Reaction**: Duelists strike the matching direction. The fastest duelist scores a point!
4. **The Match**: First to 3 points (or custom match length) takes the match crown.

---

## ♿ ACCESSIBILITY ARCHITECTURE

### 1. Blind & Low-Vision Players
* **Procedural Spatial Audio**: Synthesized with the Web Audio API (zero external sound files needed).
  * **LEFT**: -0.92 stereo pan, 340 Hz sawtooth pitch.
  * **CENTER**: 0.0 center pan, 620 Hz bell chime + harmonic chime.
  * **RIGHT**: +0.92 stereo pan, 950 Hz square snap.
* **Dual-Channel Screen Reader Support**:
  * Native Web Speech API Text-to-Speech (TTS) with real-time speech feedback.
  * Assertive ARIA Live Region (`#aria-game-announcer`) for NVDA, JAWS, VoiceOver, and Orca.

### 2. Deaf & Hard-of-Hearing Players
* **Sensory Parity**: Every auditory cue has an instant visual twin.
* **Non-Color Dependent Shape Badging**:
  * **LEFT**: High-contrast Triangle pointing West (`◄`) with cyan neon halo.
  * **CENTER**: Bullseye Target (`◉`) with golden amber flare.
  * **RIGHT**: High-contrast Triangle pointing East (`►`) with magenta chevron flare.
* **Tension Ring Visualizer**: Rhythmic pulsating radar ring during the tension phase so deaf players know when the cue is imminent.
* **Sensory Live Banner**: High-contrast on-screen marquee mirroring all audio states and timing results.

### 3. Motor Accessibility & Assistive Switch Control
* **Single-Switch Scanning Controller**:
  * For players unable to press multiple buttons.
  * Automatically scans across lanes: `LEFT ➔ CENTER ➔ RIGHT ➔ LEFT...`
  * Pressing a single key (Spacebar, Enter, or any touch tap on screen) activates the currently scanned lane.
  * Adjustable scan speed (250ms to 800ms per step) in settings.
* **Input Debounce**: Hardware bounce protection preventing accidental double-inputs.

### 4. Non-Speaking & Motion Accessibility
* Completely playable without speech or voice communication.
* **Reduce Motion Mode**: Disables screen shake and caps particle counts for vestibular sensitivity.
* **High Contrast Mode**: WCAG AAA certified black/yellow/cyan high-contrast palette.

---

## 🕹 CONTROLS

| Action | Keyboard | Touch / Mouse | Assistive Single-Switch |
| :--- | :--- | :--- | :--- |
| **Strike Left** | `A`, `Left Arrow`, or `Numpad 4` | Tap Left Station Button | Auto-scanned + Tap/Space |
| **Strike Center** | `W`, `Up/Down Arrow`, or `Numpad 5/8` | Tap Center Station Button | Auto-scanned + Tap/Space |
| **Strike Right** | `D`, `Right Arrow`, or `Numpad 6` | Tap Right Station Button | Auto-scanned + Tap/Space |
| **Primary Action / Switch** | `Space`, `Enter`, or `Numpad Enter` | Tap Primary Button or Screen | Single Space / Enter / Screen Tap |
| **Toggle Sound** | `M` | Tap Sound Button in Header | Header Action |
| **Settings** | `Escape` | Tap Settings Button | Header Action |

---

## 🚀 HOW TO RUN

### Instant Launch with Python
From the project root directory:
```bash
python server.py --open
```
This opens `http://localhost:8000` in your default web browser.

### Run with Node.js
```bash
npx serve .
```

### Automated Tests
Run the headless Node.js verification suite:
```bash
node tests/test-suite.js
```
Or open `tests/index.html` in any web browser to run the interactive automated test suite.

---

## 📂 FILE STRUCTURE

```
echo-duel/
├── index.html                     # Accessible semantic application markup
├── server.py                      # Local HTTP server with dev headers
├── package.json                   # ES module metadata & test scripts
├── README.md                      # Comprehensive project documentation
├── css/
│   └── style.css                  # High-contrast theme, WCAG AAA compliant
├── src/
│   ├── main.js                    # Subsystem orchestrator & entry point
│   ├── core/
│   │   ├── state.js               # Central state machine (MENU, PLAYING, RESULT, etc.)
│   │   └── game.js                # Core duel logic, AI timing, scoring & rounds
│   ├── audio/
│   │   └── sound.js               # Procedural Web Audio synthesis & spatial panner
│   ├── accessibility/
│   │   ├── tts.js                 # Dual-channel Web Speech TTS & ARIA live announcer
│   │   └── switch-control.js      # Assistive single-switch auto-scanner
│   ├── input/
│   │   └── input.js               # Unified keyboard, touch & switch input manager
│   └── render/
│       ├── render.js              # Accessible canvas renderer, telegraphs & badges
│       └── vfx.js                 # Lightweight particles, shockwaves & screen shake
└── tests/
    ├── index.html                 # Browser-based automated test suite runner
    └── test-suite.js              # Comprehensive unit & regression test suite
```
