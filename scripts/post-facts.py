#!/usr/bin/env python3
"""Scheda meccanica di un articolo del blog.

Uso:
    python3 scripts/post-facts.py                      # tabella su tutti gli articoli
    python3 scripts/post-facts.py <path|frammento>     # scheda di un articolo

Non giudica la qualita' e non ha exit code: raccoglie i fatti che si contano,
per chi poi legge l'articolo. Tutto cio' che richiede giudizio sta altrove.
"""
import glob
import re
import sys

import yaml

ROOT = "src/content/posts"
TITLE_SUFFIX = " | montelli.dev"  # BaseLayout.astro:61
TITLE_BUDGET = 60 - len(TITLE_SUFFIX)
DESC_RANGE = (120, 160)

# heading che duplicano cio' che summary/openItems/PostCTA gia' rendono
# NB: "Limiti di questo tutorial" e' un doppione di openItems; "Limiti dichiarati"
# no — la style guide (§6) ammette una sezione quando il limite richiede una
# spiegazione. Il confine di parola serve a non confondere i due.
DUP_HEADING = re.compile(r"^#{2,4}\s+(TL;?DR|In sintesi|Limiti di\b|Cosa non copre|Call to action)", re.I)
# l'archetipo enciclopedico: il pezzo apre spiegando cos'e' invece che cosa si rompe
ENCYCLOPEDIC = re.compile(r"^(cos'?[eè]\b|introduzione|definizione|panoramica|che cos'?[eè]\b)", re.I)
MARKER = re.compile(r"TO BE TESTED|<!--\s*TODO|TODO:|\[NUMERO DA FORNIRE")
CTA_IN_BODY = re.compile(r"cal\.com|mailto:francesco")
NUM = re.compile(r"\d+(?:[.,]\d+)?%?")
# parole che tradiscono un heading rimasto in inglese
EN_HINT = re.compile(r"\b(the|and|with|from|deep dive|overview|setup|patterns?|issues?|"
                     r"management|health|inspection|creation|provisioning|generation)\b", re.I)


def split(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        return {}, text
    return yaml.safe_load(m.group(1)) or {}, m.group(2)


def norm(n):
    """2,5 e 2.5 sono lo stesso numero: il corpo puo' usare l'altro separatore."""
    return {n, n.replace(",", "."), n.replace(".", ",")}


def unanchored(fm, body):
    """Numeri promessi nel frontmatter che non compaiono nel corpo.

    E' il check che conta: intercetta il dato inventato nel riassunto.
    """
    claims = []
    for row in fm.get("summary") or []:
        claims += [str(row.get(k, "")) for k in ("value", "note")]
    claims += [str(x) for x in (fm.get("openItems") or [])]
    out = []
    for c in claims:
        for n in NUM.findall(c):
            if not any(v in body for v in norm(n)):
                out.append(n)
    return sorted(set(out))


def facts(path):
    fm, body = split(path)
    headings = re.findall(r"^(#{2,4})\s+(.*)$", body, re.M)
    titles = [h[1].strip() for h in headings]
    en = path.replace("index.md", "index.en.md")
    en_headings = None
    try:
        _, en_body = split(en)
        en_headings = len(re.findall(r"^#{2,4}\s+", en_body, re.M))
    except FileNotFoundError:
        pass
    return {
        "path": path.split(ROOT + "/")[-1],
        "words": len(body.split()),
        "mode": fm.get("mode"),
        "title": str(fm.get("title", "")),
        # e' il seoTitle a finire nel <title>, quando c'e'
        "serp": str(fm.get("seoTitle") or fm.get("title", "")),
        "desc": str(fm.get("description", "")),
        "summary": len(fm.get("summary") or []),
        "openItems": len(fm.get("openItems") or []),
        "headings": titles,
        "unanchored": unanchored(fm, body),
        "markers": [(i, l.strip()) for i, l in enumerate(body.splitlines(), 1) if MARKER.search(l)],
        "cta": [i for i, l in enumerate(body.splitlines(), 1) if CTA_IN_BODY.search(l)],
        "dups": [t for t in titles if DUP_HEADING.search("## " + t)],
        "opener": titles[0] if titles else "",
        "encyclopedic": bool(titles and ENCYCLOPEDIC.match(titles[0])),
        "en_headings": en_headings,
        "en_hint": [t for t in titles if EN_HINT.search(t)],
        "draft": bool(fm.get("draft")),
        "reviewed": fm.get("reviewed", "—"),
    }


def card(f):
    p = print
    p(f"\n\033[1m{f['path']}\033[0m")
    p(f"  parole       {f['words']}")
    p(f"  mode         {f['mode'] or 'NON DICHIARATO'}")
    tl = len(f["serp"])
    p(f"  title        {tl} char" + (f"   OLTRE il budget SERP di ~{TITLE_BUDGET}" if tl > TITLE_BUDGET else "   ok"))
    p(f"               \"{f['title']}\"")
    if f["serp"] != f["title"]:
        p(f"    via seoTitle \"{f['serp']}\"")
    dl = len(f["desc"])
    lo, hi = DESC_RANGE
    verdict = "corta" if dl < lo else ("lunga" if dl > hi else "ok")
    p(f"  description  {dl} char   {verdict} (range {lo}-{hi})")
    p(f"  frontmatter  summary {f['summary'] or '—'} righe · openItems {f['openItems'] or '—'} voci · "
      f"draft {f['draft']} · reviewed {f['reviewed']}")
    p(f"  numeri non ancorati   {', '.join(f['unanchored']) if f['unanchored'] else 'nessuno'}")
    p(f"  marcatori    {len(f['markers'])}")
    for i, l in f["markers"]:
        p(f"                 riga {i}: {l[:70]}")
    p(f"  CTA nel corpo         {f['cta'] or 'nessuna'}")
    p(f"  doppioni strutturali  {f['dups'] or 'nessuno'}")
    p(f"  primo ##     \"{f['opener']}\"" + ("   ← apertura enciclopedica" if f["encyclopedic"] else ""))
    p(f"  heading      {len(f['headings'])}" +
      (f"   di cui {len(f['en_hint'])} sospetti in inglese" if f["en_hint"] else ""))
    for t in f["en_hint"]:
        p(f"                 {t}")
    if f["en_headings"] is None:
        p("  versione EN  assente")
    else:
        d = f["en_headings"] - len(f["headings"])
        p(f"  versione EN  {f['en_headings']} heading" + (f"   DRIFT {d:+d} rispetto all'italiano" if d else "   allineata"))


def table(files):
    rows = [facts(p) for p in files]
    print(f"{'articolo':58} {'par':>5} {'ttl':>4} {'dsc':>4}  flag")
    for f in sorted(rows, key=lambda r: r["path"]):
        flags = []
        if f["unanchored"]:
            flags.append(f"numeri:{','.join(f['unanchored'])}")
        if f["markers"]:
            flags.append(f"marcatori:{len(f['markers'])}")
        if f["cta"]:
            flags.append("cta-nel-corpo")
        if f["dups"]:
            flags.append("doppione")
        if not f["mode"]:
            flags.append("mode:—")
        if f["encyclopedic"]:
            flags.append("apertura-enciclopedica")
        if f["en_headings"] is not None and f["en_headings"] != len(f["headings"]):
            flags.append(f"drift-en:{f['en_headings'] - len(f['headings']):+d}")
        if len(f["en_hint"]) >= 3:
            flags.append(f"heading-en:{len(f['en_hint'])}")
        t = len(f["serp"])
        d = len(f["desc"])
        print(f"{f['path'][:58]:58} {f['words']:>5} "
              f"{t:>4}{'!' if t > TITLE_BUDGET else ' '}"
              f"{d:>4}{'!' if not (DESC_RANGE[0] <= d <= DESC_RANGE[1]) else ' '} "
              f"{' · '.join(flags)}")
    print(f"\n{len(rows)} articoli. ! = fuori soglia. Le soglie sono indicative, non verdetti.")


def main():
    files = sorted(glob.glob(f"{ROOT}/**/index.md", recursive=True))
    if len(sys.argv) < 2:
        table(files)
        return
    q = sys.argv[1]
    hits = [p for p in files if q in p]
    if not hits:
        sys.exit(f"nessun articolo per '{q}'")
    for p in hits:
        card(facts(p))


if __name__ == "__main__":
    main()
