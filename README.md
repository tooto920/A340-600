# A340-600 — The Legend of Long Haul

An interactive, cinematic tribute to the **Airbus A340-600** — the last long-haul
quadjet ever built in series.

The site is a single-page React application with two independent 3D experiences:

1. **A scroll-driven cinematic story** — a fixed WebGL scene whose camera flies
   along a six-chapter path as the page scrolls.
2. **An aircraft explorer** — a separate viewer with its own camera, drag rotation,
   wheel zoom, station presets, day/night lighting and a landing-gear toggle.

---

## Quick start

```bash
npm install
npm run dev        # http://127.0.0.1:5173/A340-600/
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run typecheck` | `tsc --noEmit` over the whole project |
| `npm run build` | Type check, then a production build into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run verify:geometry` | Offline geometry check — renders orthographic PNGs and asserts the model matches the published dimensions |
| `npm run test:browser` | Playwright browser tests against the production build |

---

## The 3D aircraft

The aircraft is **procedurally generated** in Three.js. No external model file is
downloaded, so there is no licence to honour, no network dependency and no asset
that can 404 in production.

Geometry is authored in **real-world metres** in an "aircraft space" where
`+X` runs aft from the nose, `+Y` is up and `+Z` is starboard, then scaled into
the scene by the parent group.

- `src/three/aircraftGeometry.ts` — the geometry builders: lofted fuselage,
  swept lifting surfaces, ring-revolved nacelles, fan blades, tyres and pylons.
- `src/three/aircraftDimensions.ts` — every dimension, with its source.
- `src/three/Aircraft.tsx` — assembles the parts into one reusable component
  used by both the cinematic scene and the explorer.

The model is verified offline by `npm run verify:geometry`, which rasterises
side, top and front orthographic projections to PNG and asserts the measured
length, span and height against the published figures.

| Dimension | Published | Model |
| --- | --- | --- |
| Length | 75.36 m | 75.49 m |
| Wingspan | 63.45 m | 63.50 m |
| Height | 17.80 m | 17.65 m |

---

## Data accuracy

Figures in the interface and in `src/data/aircraftData.ts` are taken from
manufacturer and regulator documents, and the sources are listed in the site
itself under **The Final Horizon**.

- Airbus, *Aircraft Characteristics — A340-500/-600*, Airport & Maintenance
  Planning, Rev. 21, Aug 01/22 — dimensions, door stations, gear geometry,
  cabin volumes, MTOW, range.
- Airbus Commercial Aircraft, *A340-600* programme page — history, seating
  configurations, engine and performance data.
- FAA Type Certificate Data Sheet A-140 — certification basis.
- Rolls-Royce, Trent 500 family — engine programme data.

Where manufacturers publish a range rather than a single number (seating,
range, payload) the configuration-dependent value is stated instead of a
headline figure. For example the A340-600 is quoted at **384 seats in the
standard configuration** (12 business + 54 premium economy + 318 main cabin)
and **380 seats in the typical configuration**, with a maximum of 440 where
the cabin is laid out densely.

**The 3D model is a procedural reconstruction built to the published
dimensions — it is not an official Airbus CAD model, and the wing planform
reproduces the published sweep, kink and taper to visual accuracy rather than
to the exact published area of 437 m².**

---

## Architecture

```
src/
  main.tsx                  Entry point
  App.tsx                   App shell: scene backdrop, sections, explorer
  index.css                 Design system (Tailwind v4 + custom layer)
  data/aircraftData.ts      All aviation content and its sources
  three/
    aircraftDimensions.ts   Dimension table with source comments
    aircraftGeometry.ts     Geometry builders
    Aircraft.tsx            Reusable aircraft component
    Atmosphere.tsx          Sky dome, cloud layers, particle field
    textTexture.ts          Canvas-backed fin registration
  scenes/
    CinematicScene.tsx      Scroll-driven scene, camera rig, lighting
    ExplorerScene.tsx       Interactive viewer, orbit + camera presets
  components/
    Navigation.tsx          Animated nav, scroll progress rail, mobile menu
    Hero.tsx                Opening statement
    ChapterSection.tsx      Scroll chapter wrapper
    Specifications.tsx      Spec grid, timeline, milestones, sources
    ExplorerPanel.tsx       Explorer control panel
  hooks/
    useScroll.ts            Scroll progress + pointer tracking
    useReveal.ts            IntersectionObserver reveal
    useEnvironment.ts       Reduced motion, mobile, WebGL detection
```

### Performance notes

- The cinematic canvas and the explorer canvas are separate WebGL contexts.
  The explorer is only mounted while it is on screen, so the two never compete.
- Pixel ratio is capped (`1.5`–`1.75` for the cinematic scene, `1.4`–`1.6` for
  the explorer) rather than following `devicePixelRatio` exactly.
- The cabin window belt is a single `InstancedMesh` — roughly 200 panes in one
  draw call. Passenger doors are a second instanced mesh.
- The fuselage livery is baked into vertex colours, so the whole body is one
  draw call with no texture upload.
- Shadows are enabled but the shadow maps are modest (1024² cinematic, 2048²
  explorer) and tightly fitted to the model.
- No postprocessing pass is used. ACES Filmic tone mapping and a CSS vignette
  provide the grade at a fraction of the cost.
- Every geometry, material and texture created by the components is disposed
  on unmount.

### Accessibility

- `prefers-reduced-motion` is honoured: the camera snaps between chapter
  keyframes instead of flying, the aircraft stops drifting, and the CSS
  transitions are reduced to near-zero.
- If the browser cannot create a WebGL context, the site renders a static
  fallback with the full specification table instead of failing.
- The explorer controls are real buttons with `aria-pressed` / `aria-checked`
  state, and the whole page is keyboard navigable.

---

## Testing

```bash
npm run typecheck
npm run build
npm run verify:geometry   # offline dimension check
npm run test:browser      # Playwright, requires: npx playwright install chromium
```

The browser suite verifies that the WebGL canvas actually renders (by decoding
real screenshots and measuring tone variance), that every explorer camera
preset produces a visibly different frame, that drag and zoom change the render,
that the toggles change the scene, that all six chapters and the specification
figures are present, and that every local asset resolves under the
`/A340-600/` base path.

---

## Deployment

The site deploys to GitHub Pages on every push to `main` via
`.github/workflows/deploy.yml`:

1. `npm ci` — installs from the committed lockfile
2. `npm run typecheck`
3. `npm run build`
4. uploads `dist/` as the Pages artifact
5. deploys with `actions/deploy-pages`

`vite.config.ts` sets `base: '/A340-600/'` so every asset URL resolves under the
repository sub-path.

**Expected URL:** <https://tooto920.github.io/A340-600/>

### If the site does not appear

1. Open the repository → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Re-run the `Deploy to GitHub Pages` workflow from the **Actions** tab.

---

## Licence and attribution

This is a non-commercial tribute. The Airbus A340-600, the Rolls-Royce Trent
500 family and all associated marks are the property of their respective
owners; no affiliation or endorsement is implied. The 3D aircraft is an
original procedural reconstruction built for this project.
