# Interviste sui case study

Un file per case study. Ognuno contiene **il testo integrale del pezzo** con dentro i
blocchi da compilare, nel punto in cui la risposta andrà a finire.

## Come si usa

Cerca `DA COMPILARE` e scrivi sulla riga `RISPOSTA:`.
Se non hai niente da dire scrivi `NIENTE`: il blocco viene tolto, non annacquato.
Un campo assente batte sempre un campo vago.

Il testo attorno ai blocchi è quello reale: se leggendolo vuoi cambiare una frase,
cambiala direttamente lì. Le modifiche si raccolgono dal diff.

## I file, in ordine di lettura

| File | Case study | Blocchi | Compilati |
|---|---|---|---|
| `01-quante-versioni.md` | Quante versioni del tuo prodotto stai mantenendo | 5 | **2** |
| `02-il-permesso.md` | Il permesso che il sistema non sapeva pronunciare | 6 | 0 |
| `03-il-fornitore.md` | Il fornitore non ha un'API. Il portale sì. | 6 | 0 |
| `04-dalla-cecita-alla-traccia.md` | Dalla cecità alla traccia | 6 | 0 |
| `05-tracking-mobile.md` | Tracking live dei mezzi su mappa | 4 | 0 |

Il numero è l'ordine di resa, non di importanza narrativa: si parte dal pezzo più avanti
(`01`, già a metà) e si scende verso quello che ha meno bisogno di risposte (`05`, che è
un dimostratore e non ha un cliente da citare).

I due draft — `software-per-chi-non-apre-il-terminale` e `estrarre-prima-che-scada` —
non hanno un'intervista: sono bozze scritte da un agente, e vanno prima riscritte.
Intervistarsi su un testo che non è tuo non ha senso.

## Perché le domande sono diverse fra un pezzo e l'altro

Non è lo stesso questionario copiato cinque volte.

- Tre pezzi hanno **un committente**: si chiede la frase del cliente, il costo del prima,
  il cambiamento osservabile, il momento in cui il problema è diventato urgente.
- `tracking-live-mezzi-mobile` è un **dimostratore senza cliente**: la prova sociale non
  è una citazione ma a cosa è servito — in quale conversazione, con chi, con che reazione.
- Ogni pezzo ha poi **una domanda sua**, sull'affermazione più verificabile che contiene:
  il flag ancora acceso, il canale di scrittura lasciato al costruttore, le sei modifiche
  non fatte, l'animazione mai implementata.

Quest'ultima categoria è la più importante: sono le frasi che un lettore ostile
potrebbe controllare, e le uniche che invecchiano male se cambia qualcosa nel progetto.
