#!/usr/bin/env python3
"""
OG card per articolo del blog — montelli.dev

Genera una card 1200x630 per ogni articolo, in italiano e in inglese, dentro
public/og/posts/, rispecchiando la struttura delle cartelle di src/content/posts.
Da lanciare a mano quando cambiano i titoli: le PNG sono asset committati, NON
fanno parte della build npm.

Uso:
    python3 scripts/og/generate-post-og.py                 # tutte
    python3 scripts/og/generate-post-og.py kafka testing   # solo i path che contengono...

Stile: gli stessi token di scripts/og/generate-og.py, il logo vero da
src/assets/logo-fra.svg. Nessun colore per pillar: pillar-styles.ts stabilisce
che i pillar si distinguono per tipografia, non per colore.

Richiede: playwright (python) + Chromium in cache.
"""

import os
import re
import sys

import yaml
from playwright.sync_api import sync_playwright

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
POSTS = os.path.join(REPO, "src", "content", "posts")
OUT_DIR = os.path.join(REPO, "public", "og", "posts")
LOGO = os.path.join(REPO, "src", "assets", "logo-fra.svg")

BASE = "#FAF8F5"
TEXT = "#2D2D3A"
MUTED = "#606070"
ACCENT = "#E8973A"

PILLAR = {
    "progettare": {"it": "Progettare", "en": "Design"},
    "verificare": {"it": "Verificare", "en": "Verify"},
    "automatizzare": {"it": "Automatizzare", "en": "Automate"},
}
# src/data/blog-labels.ts
CATEGORY = {
    "kafka": "Kafka", "kubernetes": "Kubernetes", "system-design": "System Design",
    "keycloak": "Keycloak", "observability": "Observability", "devops": "DevOps",
    "docker": "Docker", "homelab": "Homelab", "testing": "Testing",
    "web-development": "Web Dev", "devcontainer": "Dev Container",
    "openfga": "OpenFGA", "vue": "Vue 3", "developer-tools": "Developer Tools",
}

CSS = f"""
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: 1200px; height: 630px; }}
body {{
  font-family: "Inter", system-ui, sans-serif;
  background:
    radial-gradient(1100px 520px at 100% -5%, rgba(232,151,58,0.18), transparent 58%),
    {BASE};
  color: {TEXT};
  padding: 68px 72px;
  display: flex;
  flex-direction: column;
}}
.logo {{ display: flex; align-items: center; gap: 14px; }}
.logo svg {{ width: 58px; height: 50px; }}
.logo .word {{ font-size: 26px; font-weight: 600; }}
.body {{ flex: 1; display: flex; flex-direction: column; justify-content: center; }}
.eyebrow {{
  font-size: 19px; font-weight: 700; letter-spacing: 3px;
  text-transform: uppercase; color: {ACCENT}; margin-bottom: 22px;
}}
.headline {{ font-weight: 800; line-height: 1.08; letter-spacing: -1px; max-width: 1020px; }}
.subtitle {{ font-size: 26px; color: {MUTED}; margin-top: 24px; max-width: 960px; line-height: 1.35; }}
.footer {{ display: flex; align-items: center; gap: 13px; font-size: 23px; }}
.footer .tag {{ color: {MUTED}; }}
.footer .dot {{ color: #C3BDB2; }}
.footer .url {{ font-weight: 700; }}
"""


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def headline_size(title):
    """Il titolo comanda: piu' e' lungo, piu' il corpo scende."""
    n = len(title)
    if n <= 42:
        return 66
    if n <= 60:
        return 56
    if n <= 82:
        return 48
    return 42


def clip(text, limit=155):
    """Taglia sulla parola, non a meta'."""
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(" ,;:.") + "..."


def card_html(fm, lang, logo_svg):
    pillar = fm.get("pillar")
    eyebrow = PILLAR.get(pillar, {}).get(lang, "") if pillar else ""
    title = str(fm.get("title", "")).strip()
    desc = str(fm.get("description", "")).strip()
    cat = CATEGORY.get(str(fm.get("category", "")), str(fm.get("category", "")))
    eyebrow_html = f'<div class="eyebrow">{esc(eyebrow)}</div>' if eyebrow else ""
    sub_html = f'<div class="subtitle">{esc(clip(desc))}</div>' if desc else ""
    return f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
<div class="logo">{logo_svg}<div class="word">montelli.dev</div></div>
<div class="body">{eyebrow_html}
<div class="headline" style="font-size:{headline_size(title)}px">{esc(title)}</div>
{sub_html}</div>
<div class="footer"><span class="tag">{esc(cat)}</span><span class="dot">&#183;</span><span class="url">montelli.dev/blog</span></div>
</body></html>"""


def frontmatter(path):
    m = re.match(r"^---\n(.*?)\n---", open(path, encoding="utf-8").read(), re.S)
    return yaml.safe_load(m.group(1)) if m else {}


def targets(filters):
    """(file sorgente, path di output relativo a OUT_DIR, lingua)"""
    out = []
    for dirpath, _dirs, files in os.walk(POSTS):
        rel = os.path.relpath(dirpath, POSTS)
        if filters and not any(f in rel for f in filters):
            continue
        for name, lang, suffix in (("index.md", "it", ""), ("index.en.md", "en", ".en")):
            src = os.path.join(dirpath, name)
            if os.path.exists(src):
                out.append((src, f"{rel}{suffix}.png", lang))
    return sorted(out)


def main():
    logo_svg = open(LOGO, encoding="utf-8").read().strip()
    items = targets(set(sys.argv[1:]))
    if not items:
        sys.exit("nessun articolo corrisponde ai filtri")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # scale 1: 1200x630 e' la dimensione raccomandata per og:image,
        # il 2x quadruplica il peso di un asset committato senza guadagno.
        page = browser.new_page(viewport={"width": 1200, "height": 630},
                                device_scale_factor=1)
        for src, out_rel, lang in items:
            fm = frontmatter(src)
            if fm.get("draft"):
                continue
            out = os.path.join(OUT_DIR, out_rel)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            page.set_content(card_html(fm, lang, logo_svg), wait_until="networkidle")
            try:
                page.evaluate("document.fonts.ready")
            except Exception:
                pass
            page.wait_for_timeout(120)
            page.screenshot(path=out)
            print("wrote", os.path.relpath(out, REPO))
        browser.close()


if __name__ == "__main__":
    main()
