# The Software Engineering Museum — v5 architectural / offline-media edition

A walkable WebGL museum about the **history of software engineering**. Galleries 00–10 and 17 are grounded in Grady Booch’s 2018 IEEE Software essay **“The History of Software Engineering.”** A clearly labelled research wing expands the history through 2026 using institutional histories, standards bodies, official project records, and empirical research.

This edition keeps the v3/v4 first-person controls but substantially rebuilds the building itself: museum-style wall bays, wainscoting, baseboards and crown trim, coffered ceilings, bronze/wood portal surrounds, shallow vestibules instead of long tunnel connectors, and a **“Next Gallery” wall board beside every forward doorway** explaining what the visitor is about to enter.

It also enforces a **one-exhibit / one-image policy**. All 70 wall exhibits have distinct local media keys. `run_museum.py` resolves each key to a unique Wikimedia Commons file, favors photographs over logos/diagrams when a photograph exists, records exact creator/license/source metadata, caches the image locally, and never intentionally selects the same Commons file twice.

## Run — recommended

No npm, pip package, or build step is required. Use the included launcher:

```bash
cd museum
python3 run_museum.py
```

On the **first run**, keep an Internet connection available. The launcher will:

1. download/cache one unique real historical photograph or authentic artifact image for every wall exhibit;
2. save them under `assets/media/`;
3. write exact provenance to `assets/media/attribution.json` and `assets/media/CREDITS.md`;
4. cache the pinned Three.js 0.170.0 module as `three.module.js`;
5. start the museum at `http://127.0.0.1:8080/` and open your browser. On the published site, the museum is available at `/museum/`.

After that first successful cache, the historical wall images and 3D library are local. To explicitly launch without network access:

```bash
python3 run_museum.py --offline
```

To download/update assets without starting the server:

```bash
python3 run_museum.py --fetch-only
```

If a first-run download is interrupted, just run the command again. Existing successful downloads are kept and skipped.

## Navigation

- Hold the **left mouse button and drag** to look left/right/up/down.
- **WASD** or **arrow keys** walk; **Shift** moves faster.
- The **mouse wheel** moves forward/backward.
- Hover a framed object/wall exhibit and **click** to open its dossier.
- **Previous / Next Gallery** follows the physical route.
- **Map** teleports to a selected room.
- **Room guide** explains the current room and its source basis.
- **Collection** searches the 213-entry index.
- **Source** contains the complete Booch paper, coverage audit, research catalogue, corrections, and Booch biography.

## Building changes in v5

The old long rectangular room connectors have been removed. Gallery centers are now closer together and transitions are **short, wide vestibules** at full room height. Every doorway has a dark architectural surround and bronze cornice. The exit wall has a framed board giving the next gallery number, dates, title, and two key ideas before the visitor crosses the threshold.

The gallery walls now use a contemporary museum language rather than bare boxes: recessed exhibit bays, lower wall panels, chair rails, dark baseboards, crown trim, corner pilasters, framed portals, floor borders, ceiling coffers, picture lights, and warmer materials. There are no decorative floating particles or meaningless hovering geometry.

## Historical-media policy

`assets/media/media-plan.json` is the curatorial download plan. For known archival objects, it pins a specific Commons file. Where an exhibit previously reused another exhibit’s image, the plan instead supplies subject-specific Commons searches. The downloader reserves all pinned files first, tracks every selected Commons file title, and rejects duplicates. It also captures Wikimedia Commons metadata for the exact file that was actually downloaded.

The museum itself prefers local cached files. A remote URL is only retained as a fallback for some pinned archival images. Search-selected images have no duplicate remote fallback; if they have not yet been cached, the frame explicitly tells you to run `run_museum.py` once.

## Museum structure

Galleries 00–10 and 17 remain grounded in Booch’s paper. Galleries 11–15 are explicitly marked **Research extension**. Gallery 16 is a mixed-source gallery about Grady Booch himself.

The research wing adds Unix/GNU/Linux/Git; SRE/cloud/containers/Kubernetes; secure software development and DevSecOps; AI-assisted software engineering; and engineering learned/AI systems through 2026. Research claims link to Computer History Museum, GNU, Git, AWS, Google SRE/DORA, Docker, Kubernetes, IEEE Computer Society, OMG, NIST, ICLR/OpenReview, METR, and related primary/institutional sources.

## Files

- `index.html` — interface and museum overlays
- `styles.css` — UI design
- `app.js` — Three.js architecture, first-person controls, shallow vestibules, portals, wall panels, exhibit frames, collision, and guided navigation
- `museum-data.js` — galleries, collection, research sources, accuracy notes, and local-media mapping
- `run_museum.py` — first-run media/Three.js cache + local server
- `assets/media/media-plan.json` — 70 unique wall-image download specifications
- `assets/media/attribution.json` — generated after download; exact file-by-file provenance
- `assets/media/CREDITS.md` — generated human-readable image credits
- `assets/paper/source.pdf` — supplied primary source
- `assets/paper/page-1.webp` … `page-7.webp` — local page facsimiles
- `CURATORIAL_NOTES.md` — source policy, gallery mapping, corrections, and visual policy

## Curatorial principle

The museum does **not** imply that Booch’s 2018 paper covers later events. Paper-derived interpretation and the researched extension are visibly labelled. The 2021–2026 AI rooms preserve conflicting empirical evidence rather than presenting benchmark scores or productivity claims as settled facts.
