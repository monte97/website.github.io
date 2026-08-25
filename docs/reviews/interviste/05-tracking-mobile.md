# Tracking live dei mezzi su mappa

> **Questo è il testo integrale dell'articolo**, così com'è oggi sul sito, con dentro
> **4 blocchi da compilare**. Cerca `DA COMPILARE` per saltare da uno all'altro.
>
> Scrivi sulla riga `RISPOSTA:`. Se non hai niente, scrivi `NIENTE`: il blocco sparisce,
> non viene annacquato. Un campo assente batte sempre un campo vago.
>
> I blocchi marcati `DA COMPILARE` stanno **nel punto in cui la tua risposta andrà a finire**.
> Quelli in fondo al file sono i tre che non appartengono a un punto preciso del testo:
> la frase del cliente (diventa una citazione prima della tesi), il cambiamento osservabile
> (entra nel risultato) e il momento in cui il problema diventa urgente (riscrive la CTA,
> che vive nel frontmatter e non nel corpo).
>
> Il testo intorno e' quello reale: se leggendolo vuoi cambiare una frase, cambiala qui.

---


Questo è un dimostratore di portfolio, non una consegna a un cliente. La differenza conta, perché cambia cosa ha senso ottimizzare: non il numero di funzionalità accese, ma quanto chiaramente si vede il modo di lavorare.

## Una feature, fino in fondo

Il caso di partenza elencava tre aree candidate. Ne ho costruita una sola, portandola end-to-end: tracking live dei mezzi su mappa nativa, con due punti d'ingresso — il tap sul marker e la riga dell'elenco — che portano alla stessa pagina di dettaglio, alimentata dalla stessa sorgente in memoria.

Le altre due aree non sono state abbozzate come schermate vuote. Una schermata vuota è una promessa che il codice non mantiene: fa sembrare il prodotto più completo e lo rende meno credibile appena qualcuno la tocca.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 2 · PERCHE' PROPRIO QUESTA FEATURE
                ════════════════════════════════════════════════

    Il pezzo dice che il caso di partenza elencava tre aree e ne hai costruita una.
    Serve sapere come hai scelto quella:
      · era la piu' difficile? la piu' dimostrativa? la piu' vicina a quello che ti chiedevano?
      · quanto tempo ci hai messo in tutto?

    RISPOSTA:


                ════════════════════════════════════════════════


## Le decisioni prima del codice

Ogni bivio è stato deciso prima di scrivere il codice corrispondente, e il motivo dello scarto è registrato insieme alla scelta. È una disciplina che costa poco durante e vale molto dopo: sei mesi più tardi, una scelta senza la sua alternativa non si distingue da un'abitudine, e nessuno sa più se fosse una decisione o un riflesso.

Il criterio è sempre lo stesso — *cosa dimostra davvero questa scelta* — ed è la versione da dimostratore della domanda che si fa su un progetto vero: dove conviene spendere il budget di rischio, che è uno solo e non si rigenera.

## Il codice tiene la promessa dell'architettura

Un diagramma è una promessa; quello che la mantiene sono sei o sette punti precisi del codice. Il client HTTP è tipizzato e registrato in un composition root unico, non costruito a mano dentro le pagine. Il polling gira su un timer asincrono e non su un loop con attesa, cattura le eccezioni per tipo invece che con una rete generica, e marshalla l'aggiornamento della collezione sul thread dell'interfaccia — perché toccare da un thread di background una collezione osservata è il crash classico che si manifesta solo sul dispositivo di qualcun altro.

La parte che può davvero rompersi — la sincronizzazione della collezione condivisa — vive fuori dal framework, in una funzione pura e deterministica. È quella con più test, perché se sbaglia sbaglia per tutte e tre le pagine insieme. Svuotare e ricreare la lista a ogni aggiornamento sarebbe stato più semplice da scrivere, e avrebbe fatto sfarfallare mappa ed elenco ogni quattro secondi sotto gli occhi di chi guarda.

Un leak sulle sottoscrizioni al ciclo di vita non era stato previsto in fase di design: è emerso in code review, ed è stato corretto e coperto da test nello stesso giro. Sta scritto perché è più utile di una lista di cose andate bene.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 3 · IL LEAK EMERSO IN CODE REVIEW
                ════════════════════════════════════════════════

    Il pezzo dice che un leak sulle sottoscrizioni non era stato previsto in fase di
    design ed e' emerso in code review. Serve sapere:
      · chi ha fatto quella review — tu stesso a distanza di giorni, uno strumento, una persona?
      · e' la risposta che rende credibile tutto il capitolo sulla verifica.

    RISPOSTA:


                ════════════════════════════════════════════════


## La verifica, dichiarata per intero

I test automatici coprono il contratto del gateway e le trasformazioni pure e condivise della app. Le build e alcune prove runtime restano manuali. La guardia di avvio è testata con cento chiamate concorrenti; il wire format è verificato leggendo il JSON grezzo, non solo l'oggetto deserializzato, così una regressione del formato si vede prima che se ne accorga la app.

Quello che non è verificato è scritto insieme al motivo. Una verifica proporzionata dichiarata per intero dice più di una copertura alta di cui non si conosce il perimetro.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 1 · A COSA E' SERVITO DAVVERO
                ════════════════════════════════════════════════

    Questo e' un dimostratore, non un lavoro per un cliente: non c'e' una frase del
    committente da riportare. La prova sociale, qui, e' un'altra.

      · l'hai mostrato a qualcuno? in che occasione?
      · e' servito in una conversazione commerciale, in un colloquio, in un talk?
      · qualcuno ha reagito a qualcosa in particolare?

    RISPOSTA:


                ════════════════════════════════════════════════

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 4 · L'ANIMAZIONE MAI FATTA
                ════════════════════════════════════════════════

    Lo stretch goal dichiarato e non implementato e' la parte piu' onesta del pezzo.
    Serve sapere se e' ancora vero: l'hai fatta poi? Hai deciso di non farla?

    RISPOSTA:


                ════════════════════════════════════════════════
