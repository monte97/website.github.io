# Estrarre prima che scada

> **Bozza scritta da un agente**, non da te. Questa intervista non chiede la prova
> sociale come le altre: chiede **se quello che c'è scritto è vero**.
>
> 5 blocchi da compilare. Cerca `DA COMPILARE`. Scrivi sulla riga `RISPOSTA:`.
> Se un episodio è inventato, dillo: si toglie. Non c'è niente da salvare in una scena
> che non è successa.
>
> Il testo qui sotto è quello che l'agente ha prodotto, integrale.

---


## L'abbonamento che contiene una memoria

I rilievi tridimensionali dei cantieri finivano su un servizio in abbonamento: virtual tour navigabili dal browser, un modello per ogni spazio rilevato. Il modello commerciale è semplice, e la licenza è agganciata ai modelli attivi. Quando un cantiere chiude e il modello viene disattivato — o semplicemente l'abbonamento scade — il visualizzatore e l'accesso programmatico smettono di funzionare.

Le fotografie panoramiche non sparivano: restavano dall'altra parte, irraggiungibili. E l'alternativa al perderle era pagare un canone per ogni modello dormiente, all'infinito, solo per continuare a guardare le proprie immagini.

Una memoria visiva ha senso se dura più del progetto che l'ha generata. Altrimenti non è un archivio: è un servizio, e si paga come tale.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 3 · COSA TI HA FATTO PENSARCI
                ════════════════════════════════════════════════

    Il pezzo dice che l'estrazione va fatta prima, non quando serve. Serve sapere
    cosa te l'ha fatto venire in mente:
      · un aumento di prezzo? un cambio di condizioni? una notizia sul fornitore?
      · un'esperienza precedente andata male?
      · o semplicemente il fastidio di dipendere da qualcuno?

    Senza questo, il pezzo e' un consiglio. Con questo, e' una storia.

    RISPOSTA:


                ════════════════════════════════════════════════


## Prima, non quando

L'estrazione avviene mentre il modello è ancora attivo, attraverso le interfacce ufficiali del servizio e con le credenziali di chi quei modelli li ha creati. Niente scorciatoie, niente aggiramenti: è un uso deliberato della porta giusta, aperta, prima che si chiuda.

Un click lancia un job che attraversa ogni panoramica del modello, ricompone le sei facce della vista cubica in un'unica immagine equirettangolare e la salva sul proprio server. Il progresso arriva in diretta, sweep per sweep; per ogni piano un indicatore di copertura conta gli estratti contro i totali e mostra la spunta quando il piano è completo. È la domanda che conta in questa fase del lavoro: *posso spegnere?*

Perché il fine vero non è il backup. È arrivare al giorno in cui disattivare un modello diventa una decisione economica ordinaria invece di una rinuncia forzata.

## Una coda che perdona

La prima versione del job era semplice: parte, lavora, finisce. Oppure no. In una forma così, un'estrazione completa dipende da tutto ciò che può andare storto in una sequenza lunga di richieste a un servizio remoto — e basta un'interruzione per dover chiedersi cosa era stato fatto e cosa no.

La forma che è rimasta tratta l'interruzione come condizione normale. Un job alla volta, in coda. Alla ripartenza, ogni panoramica già presente nell'archivio viene saltata: il lavoro ricomincia da dove si era fermato, non da zero. Gli sweep falliti vengono registrati con il loro errore, e un nuovo job può riprendere *solo* quelli. L'annullamento è morbido: il job finisce lo sweep in corso e conserva tutto il percorso fatto — le foto estratte sono il risultato, non uno stato intermedio da ripulire.

È la differenza fra un processo che funziona e un processo che si può abbandonare e riprendere: la seconda versione è l'unica che sopravvive alla vita vera di chi la usa.

## Ciò che resta in casa

A estrazione finita, quello che si consulta non tocca più il servizio. La galleria organizza le panoramiche per piano e stanza, con filtri e anteprime a 360 gradi. Piani, stanze e singole posizioni possono essere rinominati con nomi che hanno un significato per chi li usa — come overlay, senza toccare gli originali, che restano lì sotto come fallback. Le annotazioni si piantano sulle coordinate sferiche del panorama, con etichetta e descrizione. E per ogni piano nasce un virtual tour: ogni panorama diventa un nodo, e i collegamenti fra nodi vengono calcolati automaticamente dai vicini più prossimi sulle posizioni reali degli sweep. Si cammina negli ambienti.

Quello che si conserva, insomma, non è una cartella di immagini: è la possibilità di muoversi negli spazi. Ed è questa la differenza fra possedere i dati e poterglieli usare — la stessa che decide se disattivare un modello è un risparmio o un lutto.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 4 · IL CONFINE COL FORNITORE
                ════════════════════════════════════════════════

    Il pezzo non nomina il fornitore e non spiega come aggirarne i limiti: giusto cosi'.

    Serve pero' sapere se hai letto i loro termini di servizio, e cosa dicono
    sull'esportazione dei propri dati. Se non li hai letti, va dichiarato nei
    confini — e' l'affermazione piu' rischiosa del pezzo.

    RISPOSTA:


                ════════════════════════════════════════════════


## Il confine dichiarato

Ci sono due cose che questo strumento non fa.

La prima: non tocca il ciclo di vita dei modelli. Disattivazione e riattivazione restano sul portale del fornitore, perché là dentro c'è una relazione commerciale, non un'operazione tecnica. Automatizzare quel pulsante avrebbe chiuso il cerchio — e sarebbe stato un bottone in mano sbagliata.

La seconda: non dice nulla sui termini di servizio. Che cosa sia lecito, per quale piano, con quali limiti d'uso: dipende dal contratto e dal tipo di account, va verificato caso per caso, e questo pezzo non li interpreta. Il perimetro tecnico — porte ufficiali, modello attivo, credenziali proprie — non è un parere legale: è il modo in cui lo strumento è stato costruito.

Resta infine il costo silenzioso di ogni archivio: mantenerlo. Spazio, backup, longevità dei supporti. La dipendenza dal servizio di terzi non sparisce: si sostituisce con una dipendenza da sé stessi, che almeno si può gestire.

**Con un servizio di terzi, la domanda non è se uscirà di scena: è cosa vorresti avere in mano quel giorno. E quella risposta si costruisce mentre funziona ancora.**

---

*Bozza derivata dal repository dello strumento: README, guida interna e documenti di design sono la fonte di ogni dettaglio citato. Il fornitore del servizio non è nominato per scelta, e il pezzo non interpreta i suoi termini di servizio.*

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 1 · È VERO?  →  il blocco che viene prima di tutti
                ════════════════════════════════════════════════

    Testo ricavato da un agente leggendo il repo. Prima della revisione di stile serve
    sapere cosa non regge:
      · episodi inventati
      · scelte attribuite a te che non hai preso
      · dettagli sul funzionamento del servizio di terzi che potrebbero essere sbagliati

    Su quest'ultimo punto attenzione doppia: e' un pezzo che parla di un fornitore.
    Un dettaglio tecnico sbagliato su come funziona il loro servizio e' l'unica cosa
    che puo' trasformarlo in un problema.

    RISPOSTA:


                ════════════════════════════════════════════════


                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 2 · LA TESI E' TUA?
                ════════════════════════════════════════════════

    «Con un servizio di terzi la domanda non e' se uscira' di scena, ma cosa vorresti
    avere gia' in mano quando succede.»

    La sottoscrivi? E' la riga migliore del pezzo — ma se non e' tua, va riscritta.

    RISPOSTA:


                ════════════════════════════════════════════════


                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 5 · 813 PAROLE: MANCA QUALCOSA O BASTA COSI'?
                ════════════════════════════════════════════════

    E' il piu' corto dei sette, sotto il minimo che il piano si era dato. L'agente se
    n'era accorto e stava per espanderlo quando la run e' stata interrotta.

    Va allungato, o e' giusto cosi' perche' il tema si esaurisce li'? Un pezzo corto
    e completo batte un pezzo lungo e diluito.

    RISPOSTA:


                ════════════════════════════════════════════════

