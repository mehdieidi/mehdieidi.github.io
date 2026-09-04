# Local wall-media cache

Run `python3 run_museum.py` from the museum root while online once.

The launcher reads `media-plan.json`, downloads one unique Wikimedia Commons image per wall exhibit, and creates:

- the image binaries in this folder;
- `attribution.json` with exact provenance and license metadata;
- `CREDITS.md` with a readable credit list.

Subsequent `python3 run_museum.py --offline` launches use these local files and do not need to retrieve historical images from the network.
