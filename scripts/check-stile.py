#!/usr/bin/env python3
"""Controllo di stile dei case study. Gira sul testo RESO, non sui sorgenti.

Ordine obbligato (writing-rules/case-study.md): accenti -> astro sync -> build -> questo.
Cerca sul testo con gli spazi normalizzati, cosi' le occorrenze spezzate su piu' righe
nel markdown non sfuggono: e' il buco che ha lasciato passare tre occorrenze.
"""
import re, sys, glob, html, os

# nessun limite di lunghezza stretto: la clausola finisce alla punteggiatura forte
PATTERN = re.compile(r'\bnon è (?:un|una|il|la|solo|soltanto)?[^.;!?]{2,110}[:,] è\b', re.I)
APOSTROFO = re.compile(r"\b(?:e|perche|piu|gia|puo|cosi|cioe|ne|se|si|qualita|possibilita|verita|liberta|novita|citta|meta|percio|finche|poiche)'", re.I)
CAP = 3  # tetto per pezzo nel corpo

def testo(p):
    s = open(p, encoding='utf-8').read()
    m = re.search(r'<main\b.*?>(.*)</main>', s, re.S)
    t = re.sub(r'<[^>]+>', ' ', html.unescape(m.group(1) if m else s))
    return re.sub(r'\s+', ' ', t)

def main(root='dist/case-study'):
    esito = 0
    for p in sorted(glob.glob(f'{root}/*/index.html')):
        nome = p.split('/')[-2]
        t = testo(p)
        pat = PATTERN.findall(t)
        apo = APOSTROFO.findall(t)
        # i trattini lunghi che restano sono i pallini di elenco messi dal componente
        problemi = []
        if len(pat) > CAP: problemi.append(f'pattern {len(pat)} sopra il tetto di {CAP}')
        if apo:            problemi.append(f'accenti con apostrofo: {len(apo)}')
        stato = 'ok' if not problemi else 'DA SISTEMARE'
        print(f'  {nome[:44]:46} pattern {len(pat)}  apostrofi {len(apo)}   {stato}')
        for x in pat: print(f'        · {x.strip()}')
        for x in apo: print(f'        · accento: {x}')
        if problemi: esito = 1
    return esito

if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:]))
