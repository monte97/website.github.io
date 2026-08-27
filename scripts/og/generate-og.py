#!/usr/bin/env python3
"""
OG preview card generator — montelli.dev

Renders branded 1200x630 Open Graph cards (PNG) into public/og/ using an
HTML/CSS template screenshotted with Playwright. Run on demand; the PNGs are
committed as static assets (this is NOT part of the npm build).

Usage:
    python3 scripts/og/generate-og.py            # all cards
    python3 scripts/og/generate-og.py servizi    # a subset by file key

Requires: playwright (python) + a cached Chromium (already installed).
No emoji in card text: the Inter font does not carry them.
"""

import os
import sys

from playwright.sync_api import sync_playwright

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(REPO, "public", "og")

# --- Brand tokens (from src/styles/global.css) -----------------------------
BASE = "#FAF8F5"
TEXT = "#2D2D3A"
MUTED = "#606070"
ACCENT = "#E8973A"
BORDER = "#DDD9D0"

# --- Cards -----------------------------------------------------------------
# headline: 1 short sentence. subtitle: optional muted line.
# pills: optional list of (title, sub) — the numbered 3-step row.
# Use pills OR subtitle, not both.
CARDS = [
    {
        "file": "servizi",
        "headline": "Progetto, sviluppo e automatizzo il software del tuo prodotto.",
        "pills": [
            ("Progetto", "architettura & analisi"),
            ("Sviluppo", "codice di prodotto"),
            ("Automatizzo", "test, CI/CD, observability"),
        ],
        "tagline": "Dall'idea al sistema che si mantiene",
        "url": "montelli.dev/servizi",
    },
    {
        "file": "progetti",
        "headline": "Progetti e lavori",
        "subtitle": "Cosa ho costruito, dentro e fuori il lavoro.",
        "tagline": "Portfolio",
        "url": "montelli.dev/progetti",
    },
    {
        "file": "talks",
        "headline": "Conferenze & Speaking",
        "subtitle": "Talk su testing, architettura e DevOps.",
        "tagline": "Dove parlo",
        "url": "montelli.dev/talks",
    },
    {
        "file": "blog",
        "headline": "Quello che imparo, lo scrivo.",
        "subtitle": "System design, observability, automazione.",
        "tagline": "Blog",
        "url": "montelli.dev/blog",
    },
    {
        "file": "observability",
        "eyebrow": "Serie",
        "headline": "Observability nei Sistemi Distribuiti",
        "subtitle": "Da console.log a distributed tracing con OpenTelemetry.",
        "tagline": "6 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "mutation-testing-ai",
        "eyebrow": "Serie",
        "headline": "Mutation testing e AI",
        "subtitle": "Perché i test verdi non bastano, e come chiudere il loop.",
        "tagline": "2 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "playwright",
        "eyebrow": "Serie",
        "headline": "Test end-to-end con Playwright",
        "subtitle": "Dalla flakiness al Page Object Model.",
        "tagline": "9 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "keycloak",
        "eyebrow": "Serie",
        "headline": "Keycloak in produzione",
        "subtitle": "Dall'Authorization Code Flow alla federazione.",
        "tagline": "6 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "openfga",
        "eyebrow": "Serie",
        "headline": "Autorizzazione con OpenFGA",
        "subtitle": "Da Zanzibar alla multi-tenancy dei permessi.",
        "tagline": "5 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "kafka",
        "eyebrow": "Serie",
        "headline": "Kafka in un sistema di telemetria",
        "subtitle": "Dall'evento come fatto gia' successo al crash recovery.",
        "tagline": "5 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "saturation-alerting",
        "eyebrow": "Serie",
        "headline": "Alertare prima che sia tardi",
        "subtitle": "Saturation predittiva, burn-rate sugli SLO e routing.",
        "tagline": "5 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "homelab-capi",
        "eyebrow": "Serie",
        "headline": "Cluster API su Proxmox",
        "subtitle": "Il cluster Kubernetes come risorsa Kubernetes.",
        "tagline": "5 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "linq",
        "eyebrow": "Serie",
        "headline": "LINQ, dal profiler al compilatore",
        "subtitle": "Quattro errori in produzione, i benchmark, l'IL.",
        "tagline": "4 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "web-development",
        "eyebrow": "Serie",
        "headline": "Vue 3 in una SPA che cresce",
        "subtitle": "Da EventBus a Pinia, e i pattern contro la duplicazione.",
        "tagline": "3 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "unit-testing",
        "eyebrow": "Serie",
        "headline": "Unit test che verificano davvero",
        "subtitle": "Il codice che rende i mock inutili.",
        "tagline": "3 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "performance-engineering",
        "eyebrow": "Serie",
        "headline": "Misurare le prestazioni con onesta'",
        "subtitle": "Mille richieste al secondo non vogliono dire niente.",
        "tagline": "2 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "kubernetes-fondamenti",
        "eyebrow": "Serie",
        "headline": "Come funziona Kubernetes sotto",
        "subtitle": "Dall'Ingress al reconciliation loop.",
        "tagline": "2 articoli",
        "url": "montelli.dev/blog",
    },
    {
        "file": "home",
        "headline": "Progetto, sviluppo e automatizzo il software del tuo prodotto.",
        "subtitle": "Software Engineer freelance, da zero o su sistemi irrigiditi nel tempo.",
        "tagline": "Francesco Montelli",
        "url": "montelli.dev",
    },
    {
        "file": "about",
        "headline": "Filosofia, metodo, come lavoro.",
        "subtitle": "Francesco Montelli, Software Engineer freelance.",
        "tagline": "About",
        "url": "montelli.dev/about",
    },
    {
        "file": "competenze",
        "headline": "Competenze & stack",
        "subtitle": "Organizzate per i tre pilastri: progettare, verificare, automatizzare.",
        "tagline": "Skills",
        "url": "montelli.dev/about/competenze",
    },
    {
        "file": "workshop",
        "headline": "Workshop & formazione hands-on",
        "subtitle": "Sessioni mirate, fatte col team che deve applicarle.",
        "tagline": "Per team di sviluppo",
        "url": "montelli.dev/workshop",
    },
]

CSS = """
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; }
body {
  font-family: "Inter", system-ui, sans-serif;
  background:
    radial-gradient(1100px 520px at 100% -5%, rgba(232,151,58,0.18), transparent 58%),
    __BASE__;
  color: __TEXT__;
  padding: 72px;
  display: flex;
  flex-direction: column;
}
.logo { display: flex; align-items: center; gap: 15px; }
.logo .mark {
  width: 54px; height: 54px; border-radius: 14px;
  background: __ACCENT__; color: #fff;
  font-weight: 800; font-size: 32px;
  display: flex; align-items: center; justify-content: center;
}
.logo .word { font-size: 27px; font-weight: 600; color: __TEXT__; }
.body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.eyebrow {
  font-size: 20px; font-weight: 700; letter-spacing: 3px;
  text-transform: uppercase; color: __ACCENT__; margin-bottom: 20px;
}
.headline {
  font-weight: 800; font-size: 62px; line-height: 1.08;
  color: __TEXT__; max-width: 1000px; letter-spacing: -1px;
}
.subtitle { font-size: 31px; color: __MUTED__; margin-top: 26px; max-width: 940px; }
.pills { display: flex; align-items: center; gap: 16px; margin-top: 48px; }
.pill {
  background: #fff; border: 1px solid __BORDER__; border-radius: 18px;
  padding: 18px 26px; display: flex; align-items: center; gap: 16px;
}
.pill .num {
  width: 40px; height: 40px; border-radius: 999px; flex: none;
  background: __ACCENT__; color: #fff; font-weight: 700; font-size: 20px;
  display: flex; align-items: center; justify-content: center;
}
.pill .txt .t { font-size: 25px; font-weight: 700; color: __TEXT__; line-height: 1.1; }
.pill .txt .s { font-size: 19px; color: __MUTED__; margin-top: 3px; }
.arrow { color: #C3BDB2; font-size: 30px; font-weight: 700; }
.footer { display: flex; align-items: center; gap: 14px; font-size: 25px; }
.footer .tag { color: __MUTED__; }
.footer .dot { color: #C3BDB2; }
.footer .url { color: __TEXT__; font-weight: 700; }
"""
for _k, _v in {"__BASE__": BASE, "__TEXT__": TEXT, "__MUTED__": MUTED,
               "__ACCENT__": ACCENT, "__BORDER__": BORDER}.items():
    CSS = CSS.replace(_k, _v)


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def pills_html(pills):
    parts = []
    for i, (t, s) in enumerate(pills):
        parts.append(
            f'<div class="pill"><div class="num">{i+1}</div>'
            f'<div class="txt"><div class="t">{esc(t)}</div>'
            f'<div class="s">{esc(s)}</div></div></div>'
        )
    return '<div class="arrow">&#8594;</div>'.join(parts)


def card_html(card):
    eyebrow = f'<div class="eyebrow">{esc(card["eyebrow"])}</div>' if card.get("eyebrow") else ""
    middle = ""
    if card.get("pills"):
        middle = f'<div class="pills">{pills_html(card["pills"])}</div>'
    elif card.get("subtitle"):
        middle = f'<div class="subtitle">{esc(card["subtitle"])}</div>'
    return f"""<!doctype html><html lang="it"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
<div class="logo"><div class="mark">M</div><div class="word">montelli.dev</div></div>
<div class="body">{eyebrow}<div class="headline">{esc(card["headline"])}</div>{middle}</div>
<div class="footer"><span class="tag">{esc(card["tagline"])}</span><span class="dot">&#183;</span><span class="url">{esc(card["url"])}</span></div>
</body></html>"""


def main():
    wanted = set(sys.argv[1:])
    cards = [c for c in CARDS if not wanted or c["file"] in wanted]
    os.makedirs(OUT_DIR, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1200, "height": 630},
                                device_scale_factor=2)
        for card in cards:
            page.set_content(card_html(card), wait_until="networkidle")
            try:
                page.evaluate("document.fonts.ready")
            except Exception:
                pass
            page.wait_for_timeout(250)
            out = os.path.join(OUT_DIR, card["file"] + ".png")
            page.screenshot(path=out)
            print("wrote", os.path.relpath(out, REPO))
        browser.close()


if __name__ == "__main__":
    main()
