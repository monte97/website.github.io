#!/usr/bin/env python3
"""Cerca il testo che parla di se stesso, sul testo RESO.

Regola: style-guide.md §8 "Il testo non parla di se stesso", metodo in §14.
Gira su dist/ e non sui sorgenti, per lo stesso motivo di check-stile.py: una
frase spezzata su due righe nel markdown sfugge al grep sul sorgente, e questo
difetto sta quasi sempre a inizio paragrafo, dove le righe si spezzano.

    python3 scripts/check-riempitivo.py            # blog + case study
    python3 scripts/check-riempitivo.py dist/blog  # solo una parte

Due liste, perche' due classi diverse:

  BLOCCANTI  forme che non sono mai legittime. Exit 1.
  CANDIDATI  forme che vanno guardate: l'annuncio che NOMINA il contenuto
             informa e resta, quello che dice solo che il contenuto arriva se
             ne va. Il tu che parla al lettore resta, quello che fa da
             destinatario dentro la descrizione di un meccanismo no. Nessun
             exit code: decide chi legge.
"""
import re, sys, glob, html

DIRE = r'(?:dire|dirlo|dirla|spiegare|notare|chiarire|ricordare|sottolineare|precisare|menzionare|osservare|segnalare|esplicitare|raccontare|conoscerle|capire|capirlo|esaminare|scomporlo|smontare|portarsi|farsi|guardare)'

BLOCCANTI = [
    ('vale la pena + verbo di dire', re.compile(rf'\bvale la pena {DIRE}\b', re.I)),
    # "va detto" riscattato nella stessa frase da cio' che dice ("il costo va
    # detto subito: X") non e' il difetto: annuncia e paga. Lo e' quando
    # l'annuncio resta solo. Esente anche la domanda "quando va detto che
    # qualcosa non funziona", che parla di alert e non del testo.
    ('va detto senza cio\' che dice',
                                     re.compile(r'\bva (?:detto|detta|precisato|sottolineato|ricordato|chiarito)\b(?![^.!?:]{0,90}:)(?![^.!?]{0,40}qualcosa non funziona)', re.I)),
    ('e\' importante notare',        re.compile(r"\b(?:e|è)' importante (?:notare|sottolineare|ricordare|dire)\b", re.I)),
    ('merita attenzione',            re.compile(r'\bmerit(?:a|ano) (?:attenzione|un approfondimento|un\'analisi|di essere)\b', re.I)),
    ('lo scrivo/lo dico perche\'',   re.compile(r'\bl[oae] (?:scrivo|dico|racconto) perch(?:e|é)\b', re.I)),
    ('il testo si attribuisce un punto',
                                     re.compile(r"\b(?:e|è)' il punto di tutto (?:l'articolo|il pezzo)|il takeaway (?:operativo )?di questa sezione|la parte che vale la pena portarsi|questa (?:e|è)' la parte che un lettore", re.I)),
    ('il testo parla di se stesso',  re.compile(r"\bqui il (?:pezzo|testo|paragrafo)\b|\bquesto pezzo parla d'altro\b|\bquesta sezione, in cronologia\b|\banticipo la conclusione\b|\bpi(?:u|ù)' avanti si vede perch(?:e|é)\b", re.I)),
]

CANDIDATI = [
    ('annuncio strutturale', re.compile(r'\b(?:vediamoli|vediamole|vediamo come farlo|ecco il problema che dobbiamo|nelle prossime sezioni vediamo|vedremo tra poco|le sezioni (?:seguenti|successive)|sono gli argomenti delle sezioni)\b', re.I)),
    ('numero nudo',          re.compile(r'(?:^|[.!?] )(?:Sono )?(?:Due|Tre|Quattro|Cinque|Sei)[,.] ')),
    ('tu che descrive il sistema', re.compile(r'\b(?:ti|vi) (?:d(?:a|à)|dice|dicono|mostra|restituisce|fornisce|consegna)\b', re.I)),
]

def testo(p):
    """Il testo dell'articolo, senza la CTA di fondo pagina.

    Il blocco <aside data-cta-variant> e' uguale su tutte le pagine e contiene
    "se il tuo sistema non ti da'": senza toglierlo, ogni pagina del sito
    risulterebbe un candidato per la regola sulla seconda persona."""
    s = open(p, encoding='utf-8').read()
    m = re.search(r'<main\b.*?>(.*)</main>', s, re.S)
    corpo = m.group(1) if m else s
    corpo = re.sub(r'<aside[^>]*data-cta-variant.*', '', corpo, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', html.unescape(corpo))
    return re.sub(r'\s+', ' ', t)

def frase(t, m):
    a = max(t.rfind('.', 0, m.start()), t.rfind('»', 0, m.start())) + 1
    b = t.find('.', m.end())
    return t[a:b + 1 if b > 0 else len(t)].strip()[:150]

def main(*radici):
    radici = radici or ('dist/blog', 'dist/case-study')
    pagine = sorted(p for r in radici for p in glob.glob(f'{r}/**/index.html', recursive=True)
                    if not p.endswith('-originale/index.html'))  # copie di confronto: sono il "prima" apposta
    bloc = cand = 0
    for p in pagine:
        nome = '/'.join(p.split('/')[1:-1])
        t = testo(p)
        righe = []
        for etichetta, pat in BLOCCANTI:
            for m in pat.finditer(t):
                righe.append(('X', etichetta, frase(t, m))); bloc += 1
        for etichetta, pat in CANDIDATI:
            for m in pat.finditer(t):
                righe.append(('?', etichetta, frase(t, m))); cand += 1
        if righe:
            print(f'\n{nome}')
            for s, e, f in righe:
                print(f'  {s} {e:32} {f}')
    print(f'\n{len(pagine)} pagine · {bloc} bloccanti · {cand} da guardare')
    return 1 if bloc else 0

if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:]))
