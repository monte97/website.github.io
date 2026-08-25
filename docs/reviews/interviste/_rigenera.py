#!/usr/bin/env python3
"""Riallinea le interviste al testo corrente dei case study.

Ricostruisce ogni file prendendo il corpo aggiornato da src/content/projects/ e
reinserendo i blocchi DA COMPILARE agli stessi ancoraggi, **preservando le risposte
già scritte**. Da rilanciare ogni volta che un case study cambia.

    python3 docs/reviews/interviste/_rigenera.py
"""
import re, sys, glob, os

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(BASE, '..', '..', '..'))

MAP = {
 '01-quante-versioni.md':            'quante-versioni-stai-mantenendo',
 '02-il-permesso.md':                'il-permesso-che-non-sapeva-pronunciare',
 '03-il-fornitore.md':               'il-fornitore-non-ha-una-api',
 '04-dalla-cecita-alla-traccia.md':  'dalla-cecita-alla-traccia',
 '05-tracking-mobile.md':            'tracking-live-mezzi-mobile',
}

# un blocco va dalla cornice di apertura a quella di CHIUSURA: tre righe di ═ in tutto
BLOCK_RE = re.compile(
    r'[ ]{16}═+\n[ ]{16}▶ DA COMPILARE.*?\n[ ]{16}═+\n.*?[ ]{16}═+\n',
    re.S)

def estrai_blocchi(testo):
    """Restituisce [(numero, testo_blocco, ancora_o_None)] nell'ordine in cui compaiono."""
    out = []
    for m in BLOCK_RE.finditer(testo):
        b = m.group(0)
        num = int(re.search(r'▶ DA COMPILARE — (\d+)', b).group(1))
        # l'ancora è la prima intestazione ## che segue il blocco
        resto = testo[m.end():]
        h = re.search(r'^## .+$', resto, re.M)
        # l'ancora vale solo se fra la fine del blocco e la sezione non c'è altro testo
        ancora = h.group(0) if h and resto[:h.start()].strip() == '' else None
        out.append((num, b, ancora))
    return out

def main():
    cambiati = 0
    for fname, slug in MAP.items():
        fpath = os.path.join(BASE, fname)
        cspath = os.path.join(ROOT, 'src/content/projects', slug + '.md')
        vecchio = open(fpath, encoding='utf-8').read()
        cs = open(cspath, encoding='utf-8').read()
        corpo_nuovo = re.match(r'^---\n.*?\n---\n(.*)$', cs, re.S).group(1).rstrip()

        testa = vecchio[:vecchio.index('\n---\n\n')+6] if '\n---\n\n' in vecchio else ''
        blocchi = estrai_blocchi(vecchio)
        if not blocchi:
            print(f"  {fname}: nessun blocco, salto"); continue

        nuovo = testa + corpo_nuovo + '\n'
        in_fondo = []
        for num, blocco, ancora in blocchi:
            if ancora and ancora in nuovo:
                nuovo = nuovo.replace(ancora, blocco.strip('\n') + '\n\n\n' + ancora, 1)
            else:
                in_fondo.append(blocco.strip('\n'))
        if in_fondo:
            nuovo = nuovo.rstrip() + '\n\n' + '\n\n'.join(in_fondo) + '\n'

        if nuovo != vecchio:
            open(fpath, 'w', encoding='utf-8').write(nuovo)
            risposte = len([l for l in nuovo.splitlines() if re.match(r'\s*RISPOSTA: \S', l)])
            print(f"  {fname}: riallineato · {len(blocchi)} blocchi · {risposte} risposte preservate")
            cambiati += 1
        else:
            print(f"  {fname}: già allineato")
    print(f"\n{cambiati} file aggiornati")

if __name__ == '__main__':
    main()
