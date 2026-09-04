# Historical media and provenance — v5

The museum uses **real historical photographs and authentic documentary/software artifacts**. It does not generate faux historical imagery.

## Unique-image rule

Every one of the museum’s 70 wall exhibits is assigned a distinct media key. The first-run launcher (`run_museum.py`) downloads a distinct Wikimedia Commons file for each key and tracks Commons file titles globally so the same source image cannot be intentionally reused on two different walls.

Forty-three historically specific objects are pinned directly to known Commons file pages (for example Ada Lovelace, ENIAC, Colossus, Grace Hopper with UNIVAC, System/360, SAGE, Margaret Hamilton, Dijkstra, Smalltalk on Alto, the first Web server, Watson, AlphaGo, Thompson/Ritchie, Linus Torvalds, and Grady Booch). Exhibits that formerly reused one of those images now use subject-specific Commons searches and preferentially select photographic files.

## Exact credits live with the local cache

Because the search-selected image can differ as Wikimedia Commons evolves, the authoritative credit record is generated from **the metadata of the exact file actually downloaded**. After the first run, see:

- `assets/media/attribution.json` — machine-readable source, creator/credit, license, date, Commons file title, and local path
- `assets/media/CREDITS.md` — human-readable per-exhibit credit list

Each exhibit dossier also loads that local attribution manifest, so the displayed provenance/source link corresponds to the cached wall image rather than to a generic search page.

The supplied Grady Booch paper is included separately under `assets/paper/source.pdf` as the project’s primary narrative source.
