Refactor: split large inline script into modules

What I changed
- Moved the inline module script from `index.html` into several ES modules under `js/`:
  - `js/main.js` — app entry; initializes app on DOMContentLoaded
  - `js/app.js` — `App` class containing scene, camera, renderer, controls, and feature methods
  - `js/loaders.js` — GLTF + Draco loader wrapper (`loadGLTF`)
  - `js/utils.js` — shared helper functions and shader material factory
  - `js/ui.js` — GUI construction moved out of page and now accepts `app` to wire controls
  - `js/constants.js` — shared constants (axis ranges, thickness steps, labels)

Notes & next steps
- The refactor is conservative: logic remains the same, but encapsulated in `App` methods.
- Next steps I recommend: extract smaller pieces from `app.js` into dedicated modules (e.g., `helium.js`, `iso.js`) to reduce size further.
- Run a local dev server (e.g. `python -m http.server 8000`) and open `http://localhost:8000/` to test.
