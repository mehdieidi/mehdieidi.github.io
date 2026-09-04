#!/usr/bin/env python3
"""Software Engineering Museum v5 launcher.

First run (online): downloads one unique, openly licensed/public-domain Wikimedia
Commons image for every wall exhibit, records exact attribution, downloads the
pinned Three.js module, then starts a local HTTP server.

Later runs: uses the local cache and can run offline.

Standard-library only. No pip/npm install is required.
"""
from __future__ import annotations

import argparse
import html
import json
import mimetypes
import os
import re
import socketserver
import sys
import time
import urllib.parse
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MEDIA_DIR = ROOT / "assets" / "media"
PLAN_FILE = MEDIA_DIR / "media-plan.json"
ATTR_FILE = MEDIA_DIR / "attribution.json"
CREDITS_FILE = MEDIA_DIR / "CREDITS.md"
THREE_FILE = ROOT / "three.module.js"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "SoftwareEngineeringMuseum/5.0 (educational offline cache; Wikimedia Commons attribution preserved)"
THUMB_WIDTH = 1024

THREE_URLS = [
    "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.js",
    "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "https://unpkg.com/three@0.170.0/build/three.module.js",
]


def request(url: str, timeout: int = 45):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": USER_AGENT}), timeout=timeout)


def get_json(params: dict) -> dict:
    url = COMMONS_API + "?" + urllib.parse.urlencode(params)
    with request(url) as r:
        return json.loads(r.read().decode("utf-8"))


def strip_html(value: str | None) -> str:
    if not value:
        return ""
    value = re.sub(r"<br\s*/?>", " · ", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def extmeta(ii: dict, key: str, default: str = "") -> str:
    return strip_html((ii.get("extmetadata") or {}).get(key, {}).get("value")) or default


def commons_source(title: str) -> str:
    return "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"), safe="():,_-'%")


def pages_from_query(data: dict) -> list[dict]:
    q = data.get("query", {})
    pages = q.get("pages", [])
    if isinstance(pages, dict):
        pages = list(pages.values())
    return [p for p in pages if p and not p.get("missing")]


def exact_candidate(file_title: str) -> dict | None:
    data = get_json({
        "action": "query", "format": "json", "formatversion": 2,
        "prop": "imageinfo", "titles": file_title,
        "iiprop": "url|mime|extmetadata|sha1", "iiurlwidth": THUMB_WIDTH,
    })
    pages = pages_from_query(data)
    return pages[0] if pages else None


def search_candidates(query: str) -> list[dict]:
    data = get_json({
        "action": "query", "format": "json", "formatversion": 2,
        "generator": "search", "gsrsearch": query, "gsrnamespace": 6,
        "gsrlimit": 24, "gsrwhat": "text",
        "prop": "imageinfo", "iiprop": "url|mime|extmetadata|sha1",
        "iiurlwidth": THUMB_WIDTH,
    })
    return pages_from_query(data)


def usable(page: dict) -> bool:
    ii = (page.get("imageinfo") or [{}])[0]
    mime = ii.get("mime", "")
    title = page.get("title", "")
    if mime.startswith("image/"):
        return True
    return mime == "application/pdf" and title.lower().endswith(".pdf") and bool(ii.get("thumburl"))


def photo_preference(page: dict) -> tuple[int, int]:
    """Prefer photographs while retaining primary-source artifacts when needed."""
    title = page.get("title", "").lower()
    ext = Path(urllib.parse.unquote(title)).suffix.lower()
    score = 0
    if ext in {".jpg", ".jpeg"}: score += 8
    elif ext in {".webp", ".tif", ".tiff"}: score += 5
    elif ext == ".png": score += 2
    elif ext == ".svg": score -= 6
    elif ext == ".pdf": score -= 2
    for bad in ("logo", "icon", "flag", "coat of arms", "wordmark"):
        if bad in title: score -= 12
    # Keep screenshots/diagrams available for authentic software artifacts, but prefer photos.
    for artifact in ("screenshot", "diagram", "chart"):
        if artifact in title: score -= 2
    return (score, -len(title))


def choose_page(item: dict, used_titles: set[str], used_sha1: set[str], reserved_exact: set[str]) -> dict | None:
    own_exact = item.get("exact_file")
    if own_exact:
        try:
            p = exact_candidate(own_exact)
            if p and usable(p) and p.get("title") not in used_titles:
                sha = ((p.get("imageinfo") or [{}])[0]).get("sha1")
                if not sha or sha not in used_sha1:
                    return p
        except Exception as e:
            print(f"    exact source lookup failed: {e}")

    for query in item.get("searches", []):
        try:
            pages = [p for p in search_candidates(query) if usable(p)]
        except Exception as e:
            print(f"    Commons search failed for {query!r}: {e}")
            continue
        allowed = [p for p in pages if p.get("title") not in used_titles and (((p.get("imageinfo") or [{}])[0]).get("sha1") not in used_sha1) and (p.get("title") not in reserved_exact or p.get("title") == own_exact)]
        if allowed:
            # Preserve Commons search relevance within a small preference for photographic files.
            ranked = sorted(enumerate(allowed), key=lambda t: (photo_preference(t[1])[0], -t[0]), reverse=True)
            return ranked[0][1]
        time.sleep(0.04)
    return None


def suffix_from_response(resp, url: str) -> str:
    ctype = (resp.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
    mapped = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
    if ctype in mapped:
        return mapped[ctype]
    ext = Path(urllib.parse.urlparse(url).path).suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return ".jpg" if ext == ".jpeg" else ext
    guess = mimetypes.guess_extension(ctype) if ctype else None
    return guess or ".img"


def download_page(item: dict, page: dict) -> dict:
    ii = (page.get("imageinfo") or [{}])[0]
    url = ii.get("thumburl") or ii.get("url")
    if not url:
        raise RuntimeError("Commons returned no downloadable media URL")
    with request(url, timeout=90) as r:
        payload = r.read()
        suffix = suffix_from_response(r, url)
    if len(payload) < 1024:
        raise RuntimeError("Downloaded media file was unexpectedly small")
    # Remove any stale extension for this key, then write the real binary locally.
    for old in MEDIA_DIR.glob(item["key"] + ".*"):
        if old.name not in {"media-plan.json", "attribution.json"}:
            old.unlink(missing_ok=True)
    dest = MEDIA_DIR / (item["key"] + suffix)
    dest.write_bytes(payload)

    author = extmeta(ii, "Artist", "Wikimedia Commons contributor / archival source")
    credit = extmeta(ii, "Credit", author)
    license_name = extmeta(ii, "LicenseShortName", "See Wikimedia Commons file page")
    license_url = extmeta(ii, "LicenseUrl", "")
    date = extmeta(ii, "DateTimeOriginal", extmeta(ii, "DateTime", ""))
    description = extmeta(ii, "ImageDescription", "")
    title = page.get("title", item["title"])
    return {
        "local": "./assets/media/" + dest.name,
        "title": title.removeprefix("File:"),
        "source": commons_source(title),
        "credit": credit,
        "license": license_name,
        "license_url": license_url,
        "date": date,
        "description": description,
        "commons_file": title,
        "commons_sha1": ii.get("sha1", ""),
        "bytes": len(payload),
    }


def write_attribution(records: dict, plan: list[dict]) -> None:
    ATTR_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    by_key = {x["key"]: x for x in plan}
    lines = [
        "# Local historical-media cache", "",
        "This file is generated by `run_museum.py`. Every wall exhibit is assigned a distinct Wikimedia Commons file; no Commons file title is intentionally reused.", "",
    ]
    for key in sorted(records):
        r = records[key]; item = by_key.get(key, {})
        lines += [f"## {item.get('title', key)}", f"- Local file: `{r.get('local','')}`", f"- Commons file: {r.get('title','')}", f"- Source: {r.get('source','')}", f"- Credit: {r.get('credit','')}", f"- License: {r.get('license','')} {r.get('license_url','')}".rstrip(), ""]
    CREDITS_FILE.write_text("\n".join(lines), encoding="utf-8")


def cache_media(refresh: bool = False) -> tuple[int, int]:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    plan = json.loads(PLAN_FILE.read_text(encoding="utf-8"))
    records = {}
    if ATTR_FILE.exists() and not refresh:
        try: records = json.loads(ATTR_FILE.read_text(encoding="utf-8"))
        except Exception: records = {}

    # Keep only records whose actual local file still exists.
    records = {k:v for k,v in records.items() if (ROOT / v.get("local", "__missing__")).exists()}
    used_titles = {v.get("commons_file") for v in records.values() if v.get("commons_file")}
    used_sha1 = {v.get("commons_sha1") for v in records.values() if v.get("commons_sha1")}
    reserved_exact = {x["exact_file"] for x in plan if x.get("exact_file")}

    total = len(plan)
    for idx, item in enumerate(plan, 1):
        key = item["key"]
        if key in records:
            print(f"[{idx:02d}/{total}] cached   {item['title']}")
            continue
        print(f"[{idx:02d}/{total}] finding  {item['title']}")
        try:
            page = choose_page(item, used_titles, used_sha1, reserved_exact)
            if not page:
                print("    WARNING: no unique Commons image found; this exhibit will use the in-museum cache warning until retried.")
                continue
            record = download_page(item, page)
            records[key] = record
            used_titles.add(record["commons_file"])
            if record.get("commons_sha1"): used_sha1.add(record["commons_sha1"])
            write_attribution(records, plan)  # resumable after every successful file
            print(f"    saved     {Path(record['local']).name} ← {record['commons_file']}")
        except KeyboardInterrupt:
            write_attribution(records, plan)
            raise
        except Exception as e:
            print(f"    WARNING: download failed: {e}")
        time.sleep(0.05)

    write_attribution(records, plan)
    return len(records), total


def cache_three() -> bool:
    if THREE_FILE.exists() and THREE_FILE.stat().st_size > 100_000:
        return True
    print("Caching pinned Three.js 0.170.0 for offline use…")
    for url in THREE_URLS:
        try:
            with request(url, timeout=60) as r:
                data = r.read()
            if len(data) < 100_000:
                raise RuntimeError("downloaded module was too small")
            THREE_FILE.write_bytes(data)
            print(f"    saved {THREE_FILE.relative_to(ROOT)}")
            return True
        except Exception as e:
            print(f"    {url}: {e}")
    return False


class QuietHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".mjs": "text/javascript"}
    def log_message(self, fmt, *args):
        sys.stdout.write("[server] " + (fmt % args) + "\n")


def serve(port: int, open_browser: bool) -> None:
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), QuietHandler) as httpd:
        url = f"http://127.0.0.1:{port}/"
        print("\nMuseum ready:", url)
        print("Press Ctrl+C to stop the local server.")
        if open_browser:
            try: webbrowser.open(url)
            except Exception: pass
        try: httpd.serve_forever()
        except KeyboardInterrupt: print("\nMuseum server stopped.")


def main() -> int:
    ap = argparse.ArgumentParser(description="Cache museum assets locally and serve the Software Engineering Museum.")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--fetch-only", action="store_true", help="Download/update assets but do not start the server")
    ap.add_argument("--offline", action="store_true", help="Do not make network requests; serve the existing cache only")
    ap.add_argument("--refresh-media", action="store_true", help="Re-resolve the local image cache from Commons")
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    if not args.offline:
        print("Preparing a local, provenance-preserving museum media cache…")
        try:
            count, total = cache_media(refresh=args.refresh_media)
        except KeyboardInterrupt:
            return 130
        ok_three = cache_three()
        print(f"\nHistorical media cached: {count}/{total} unique wall images.")
        if count < total:
            print("Some files could not be fetched. Re-run this command with Internet access; already cached images are skipped.")
        if not ok_three:
            print("Three.js could not be cached; the web app will still try its CDN fallbacks while online.")
    else:
        count = 0
        if ATTR_FILE.exists():
            try: count = len(json.loads(ATTR_FILE.read_text(encoding="utf-8")))
            except Exception: pass
        print(f"Offline mode: using {count} cached historical images and the existing local 3D engine.")

    if args.fetch_only:
        return 0
    serve(args.port, not args.no_browser)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
