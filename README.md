# مسار | MASAR

![Saudi-inspired 3D driving & parking simulator](/docs/img/1.png)

**MASAR** is a Saudi-inspired 3D driving & parking simulator built with
[Three.js](https://threejs.org/). Sharpen your parking skills across 20
hand-crafted campaign levels, graduate from the MASAR Driving Academy, and
earn your Digital Driving License — all set in environments styled after
real Saudi cities, with bilingual Arabic/English signage, Saudi flags, and
Gulf-inspired architecture throughout.

## Game Overview

Park accurately, avoid collisions, and beat the clock. Each level drops you
in a themed parking environment — malls, airports, downtown lots, a driving
school, and six Saudi city districts — with a target spot marked out
(perpendicular, parallel, or angled), moving traffic and pedestrians to
watch for, and a score built from time, accuracy, and style. Progress
unlocks new vehicles, themes, and modes, with every run backed by a local
save profile.

## Features

- 20 campaign levels across multiple visual themes
- MASAR Driving Academy: 5 training modules (basics, perpendicular,
  parallel, reverse, precision) across 6 Saudi city-inspired environments,
  with star ratings and completion certificates
- Driving License Test: multi-maneuver routes with time/accuracy/collision
  requirements, awarding a MASAR Digital Driving License on a pass
- Bilingual Arabic/English signage, Saudi flags, and realistic Arabic road
  signs (stop, one-way, no parking, bump, parking, exit, entrance, caution)
- Optional, lightweight national events (Saudi National Day, Founding Day,
  Riyadh Season) with festive lighting accents and a coin bonus
- Full Arabic/English localization with right-to-left layout support
- Vehicle unlocks tied to progression, including a pickup truck and an EV
- Ghost car replays of your best runs
- Achievements system
- Traffic and pedestrian hazards
- Local accounts with per-profile save slots, plus manual save export/import
- Desktop (keyboard) and mobile (touch) controls

## Screenshots

![MASAR gameplay screenshot 1](/docs/img/1.png)
![MASAR gameplay screenshot 2](/docs/img/2.png)

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Throttle | `W` / `↑` | On-screen accelerator |
| Brake / Reverse | `S` / `↓` | On-screen brake |
| Steer | `A`/`D` or `←`/`→` | On-screen left/right |
| Handbrake | `Space` | On-screen handbrake button |
| Toggle camera | `C` | Tap CAM button |
| Pause | `Esc` or `P` | Pause button |
| Restart level | `R` | Restart button |

Controls are detected automatically — touch controls appear on mobile
devices, keyboard controls on desktop.

## Academy Mode

The MASAR Driving Academy is a dedicated training track, separate from the
campaign, that teaches core parking techniques stage by stage:

- **Driving Basics** — orientation and fundamentals
- **Perpendicular Parking**
- **Parallel Parking**
- **Reverse Parking**
- **Precision Parking**

Each module has multiple stages set in one of the Saudi city-inspired
environments. Stages unlock progressively as you complete the one before,
each run is scored with a star rating, and finishing every stage in a
module awards a downloadable completion certificate.

## Driving License Test

The Driving License Test simulates a real driving exam: complete a full
route of consecutive parking maneuvers within a strict time limit and
without excessive collisions. Passing a route awards progress toward your
**MASAR Digital Driving License** — a certificate you can save as an image
once every route has been completed.

## Saudi City Themes

Academy and License Test environments are set across six districts
inspired by real Saudi cities, each with its own color palette, building
style, lighting, and prop density:

- **Riyadh** — Business District
- **Jeddah** — Corniche District
- **Khobar** — Waterfront District
- **Dammam** — Commercial District
- **AlUla** — Heritage District
- **NEOM** — Future District

These are abstract, stylized reinterpretations of each city's character
rather than literal landmark recreations, built on the same procedural
building/tree/streetlight system as the rest of the game.

## Installation

Requires [Node.js](https://nodejs.org/) and npm.

```bash
git clone https://github.com/sqp77/masar.git
cd masar
npm install
```

## Development

```bash
npm run dev      # start the Vite dev server with hot reload
npm run build    # production build, output to dist/
npm run preview  # preview the production build locally
```

The project is a plain Vite + Three.js app (no framework) — see `src/core`
for the game/save/input/i18n managers, `src/systems` for gameplay systems
(physics, traffic, parking, achievements, events), `src/world` for level
and theme data, and `src/data` for static content (strings, achievements,
challenges, academy/license configs, road signs).

## Credits

**مسار | MASAR**

Created by **Saud Alqhtani**
GitHub: [sqp77](https://github.com/sqp77)
