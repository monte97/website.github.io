# Interviste sui case study

Un file per case study. Ognuno contiene **il testo integrale del pezzo** con dentro i
blocchi da compilare, nel punto in cui la risposta andrà a finire.

## Come si usa

Cerca `DA COMPILARE` e scrivi sulla riga `RISPOSTA:`.
Se non hai niente da dire scrivi `NIENTE`: il blocco viene tolto, non annacquato.
Un campo assente batte sempre un campo vago.

Il testo attorno ai blocchi è quello reale: se leggendolo vuoi cambiare una frase,
cambiala direttamente lì. Le modifiche si raccolgono dal diff.

## Stato

| Case study | Blocchi | Compilati |
|---|---|---|
| quante-versioni-stai-mantenendo | 5 | 2 |
| il-permesso-che-non-sapeva-pronunciare | 6 | 0 |
| il-fornitore-non-ha-una-api | 6 | 0 |
| dalla-cecita-alla-traccia | 6 | 0 |
| tracking-live-mezzi-mobile | 4 | 0 |

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
