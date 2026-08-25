# Il fornitore non ha un'API. Il portale sì.

> **Questo è il testo integrale dell'articolo**, così com'è oggi sul sito, con dentro
> **6 blocchi da compilare**. Cerca `DA COMPILARE` per saltare da uno all'altro.
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


## Quaranta pagine su come guardare

La frase era: «questi dati ci servono nel gestionale».

A dirla era il responsabile operativo di un noleggiatore di taglia media: qualche centinaio di macchine in flotta, tre filiali, un gestionale cresciuto in casa negli anni, due persone in tutto sull'IT. Non un'azienda tecnologica. Un'azienda che porta macchine nei cantieri e le riporta indietro, e che sul software ha esattamente le risorse che servono a tenerlo in piedi.

Nel gestionale c'era già tutto il resto: contratti, trasporti, manutenzioni programmate, fatturazione. Mancavano le macchine: ore motore, cicli di lavoro, allarmi, stati. Un campione ogni tre minuti, per ogni macchina connessa. Quei dati esistevano ed erano completi. Erano sul portale del costruttore, dietro un login, in una pagina con un grafico e un pulsante di esportazione.

**La posta in gioco non era la comodità, era il contratto.** Il noleggio si fattura a ore di utilizzo, e le ore le dichiarava il cantiere. La manutenzione si programma sulle ore, e quelle stesse ore le trascriveva a mano qualcuno che apriva il portale, filiale per filiale, quando se ne ricordava. Ogni contestazione su una fattura diventava mezza giornata di ricostruzione. Ogni intervento saltato era una macchina che tornava rotta prima del previsto, e nessuno collegava le due cose perché non c'era un posto dove i numeri stessero insieme.

Nessuno stava misurando quel costo, perché era distribuito su chiunque capitasse.

Abbiamo chiesto al costruttore l'accesso via API. La risposta è arrivata come allegato: il manuale utente del portale, con gli screenshot. Nessuna cattiveria e nessuna trattativa — semplicemente, per come era pensato quel prodotto, la domanda non aveva senso. I dati si guardano. Se li vuoi altrove, li guardi e li riscrivi.

E qui comincia il lavoro vero, che non è tecnico: decidere se questa cosa si fa, e cosa significa farla.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 3 · IL COSTO DELLA TRASCRIZIONE A MANO
                ════════════════════════════════════════════════

    Il pezzo dice che le ore le dichiarava il cantiere e qualcuno le ricopiava dal
    portale. Serve l'attrito concreto:
      · ogni quanto qualcuno apriva quel portale
      · quante contestazioni su fatture arrivavano
      · una in particolare che e' costata cara

    RISPOSTA:


                ════════════════════════════════════════════════


## Il tentativo che fanno tutti

La prima cosa che ho provato è la prima che prova chiunque: prendere l'indirizzo del portale, cercare un endpoint di autenticazione, mandargli utente e password.

Non funziona. Il password grant OAuth2 è disabilitato sull'endpoint OIDC — il server risponde che il client non è abilitato agli accessi diretti — non per una configurazione sbagliata, per una scelta di chi ha montato il sistema. E la pagina di login non è una pagina: è un'applicazione JavaScript SPA. Non c'è un form da inviare, c'è del codice che parla con un endpoint OIDC.

Ho passato qualche ora a provare varianti. È il punto in cui è facile perdere una settimana: ogni tentativo è abbastanza vicino al successo da far credere che manchi un dettaglio.

## Smettere di attaccare l'API

La svolta non è stata tecnica ma di metodo: **smetti di cercare l'API che vorresti e guarda quella che c'è già.**

Il portale funziona. Ogni volta che qualcuno apre quel grafico, qualcosa risponde con dei numeri. Non serve indovinare l'interfaccia: basta leggere una conversazione che avviene comunque, decine di volte al giorno, ogni volta che un capocantiere controlla una macchina.

Venti minuti con le DevTools del browser hanno raccontato quello che il manuale non diceva in quaranta pagine. Il portale era una superficie: sotto c'era una piattaforma OIDC, con un altro nome, che il costruttore aveva integrato e rivestito con i propri colori. Le chiamate non andavano al portale, andavano a quell'endpoint. E quell'endpoint un'interfaccia programmabile ce l'aveva — solo, non era documentata per i clienti, perché dal punto di vista commerciale non esisteva.

Da lì in poi non è stato reverse engineering nel senso avventuroso del termine. È stato leggere: quali chiamate, in che ordine, con quali parametri, cosa torna indietro.

## Quindici minuti alla volta

Restava il primo accesso, e la scelta è stata accettare il confine invece di forzarlo: un browser headless — Chromium pilotato da Playwright — che fa il login una volta e restituisce le credenziali di sessione. Da quel momento il browser non serve più — l'access token dura quindici minuti e si rinnova con polling HTTP, e la catena di rinnovi regge circa otto ore.

Otto ore sono un turno. Il processo poteva partire la mattina, raccogliere tutto il giorno e chiudersi da solo.

Il resto è venuto in fretta. Ore motore, cicli, allarmi, stati. Nel giro di pochi giorni i dati arrivavano nel gestionale, aggiornati quasi in tempo reale, sovrapponibili a quelli del portale. Funzionava.

## I numeri erano sbagliati

Funzionava per modo di dire.

Ce ne siamo accorti per una via traversa: una macchina risultava avere ore motore che non stavano in piedi rispetto ai cicli di lavoro registrati. Non un valore assurdo — un valore *strano*. Il tipo di anomalia che su una macchina vera può benissimo essere una macchina che sta lavorando male, e infatti la prima ipotesi è stata quella.

Il problema era nell'integrazione, e la causa è di quelle che fanno arrabbiare per quanto sono semplici. Quando chiedi più grandezze insieme, l'endpoint non risponde nell'ordine in cui le hai chieste: le riordina secondo un criterio suo. Io avevo fatto la cosa naturale — prima grandezza chiesta, prima colonna della risposta JSON.

Così le ore motore finivano nella colonna dei cicli. Tutti valori nell'intervallo giusto. Tutti perfettamente plausibili.

Nessun errore, nessuna eccezione, nessun valore nullo, nessuna riga di log. Un sistema che dichiara successo, restituisce dati completi, e li mette nel posto sbagliato.

## Perché nessun test lo avrebbe preso

È la parte che vale la pena portarsi a casa, perché non riguarda questo progetto.

Se avessi scritto dei test su quell'integrazione — e ne avevo — sarebbero stati verdi. Un test su un sistema simulato verifica che il tuo codice legga correttamente una risposta **che hai scritto tu**. E tu la scrivi nell'ordine che hai in testa. Il sistema simulato conferma il tuo modello mentale, che è esattamente la cosa che non serve verificare.

Solo il sistema vero riordina. Solo il sistema vero si comporta in un modo che non avevi previsto — perché se l'avessi previsto, l'avresti già gestito.

Non è un argomento contro i test, è un argomento su cosa provano. Un'integrazione con un sistema di terzi ha una classe di errori che vive interamente nello spazio fra quello che credi che l'altro faccia e quello che l'altro fa. Quello spazio si copre in un modo solo: guardando i dati veri e chiedendosi se hanno senso. Da noi ha funzionato un controllo di coerenza fisica — ore di funzionamento che devono stare in un certo rapporto con i cicli — non un test.

## L'endpoint che ho lasciato lì

Mentre leggevo il traffico per capire la lettura, ho visto anche il resto.

Il portale non serve solo a guardare: serve a configurare. Fra le cose configurabili c'erano i parametri del limitatore di carico — chiamate come le altre, sullo stesso sistema, con lo stesso token che avevo già in mano.

Non le ho ricostruite, e la decisione è arrivata prima di provarci, non dopo aver fallito.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 6 · IL CANALE DI SCRITTURA
                ════════════════════════════════════════════════

    Il finale dice che la configurazione resta al costruttore, con la sua responsabilita'.
    Serve sapere se quella conversazione e' avvenuta davvero e come e' andata:

      · l'hai proposto tu o l'hanno chiesto loro?
      · qualcuno ha insistito per averla comunque?
      · come hai spiegato il no?

    Se il cliente ha accettato senza discutere, dirlo rafforza il pezzo. Se ha insistito
    e hai tenuto duro, lo rafforza il doppio.

    RISPOSTA:


                ════════════════════════════════════════════════


## Dove finisce il lavoro

La differenza fra le due cose non è la difficoltà. È che una è reversibile e l'altra no.

Leggere quei dati è un'operazione che il cliente ha già il diritto di fare: sono le sue macchine, sono i suoi numeri, li sta già guardando su quel portale tutti i giorni. L'ho solo automatizzata.

Il limitatore di carico è il dispositivo che impedisce a una macchina di sollevare più di quanto può reggere. In cantiere, sotto una macchina, ci sono delle persone.

Non è un limite tecnico che non ho saputo aggirare. È il punto in cui il lavoro finisce — e dirlo al cliente fa parte del lavoro quanto il resto. La risposta è stata: quella configurazione continuerà a farla il costruttore, dal suo portale, con la sua responsabilità.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 2 · COSA SUCCEDE OGGI ALL'INTEGRAZIONE
                ════════════════════════════════════════════════

    Il pezzo si chiude dicendo che l'integrazione ha una data di scadenza che nessuno
    conosce. Serve sapere com'e' andata a finire:

      · gira ancora?
      · il costruttore ha cambiato il portale nel frattempo?
      · qualcuno l'ha ripresa in mano usando il documento che hai lasciato?

    Anche «non lo so, non li sento da un anno» e' una risposta, e onesta.

    RISPOSTA:


                ════════════════════════════════════════════════


## Il deliverable non era il codice

Alla fine il gestionale ha ricevuto le ore, i cicli e gli allarmi senza che nessuno li trascrivesse più a mano. Le contestazioni sulle fatture si chiudono guardando una schermata invece di ricostruire una settimana. La manutenzione si programma sui numeri veri.

Ma la cosa che ho consegnato con più cura non è l'integrazione.

È un documento. Come funziona il protocollo, per quanto ne so. Perché il primo accesso passa da un browser, e cosa succederebbe se il costruttore cambiasse quel flusso. Perché le risposte vanno mappate per nome e mai per posizione — con la storia dei numeri nella colonna sbagliata scritta per intero, così che il prossimo non debba ritrovarla da solo. Cosa non è stato costruito, e per quale ragione: non per mancanza di tempo, per scelta. Cosa andrebbe sorvegliato. Cosa resta aperto.

È scritto per qualcuno a cui non sarò io a spiegarlo. Perché un'integrazione basata sull'osservazione di un sistema di terzi ha una data di scadenza che nessuno conosce: il giorno che il costruttore aggiorna il portale qualcosa smette di funzionare, e in quel momento la differenza fra un problema di mezza giornata e una riscrittura da zero è tutta lì dentro.

**Un'integrazione è finita quando qualcun altro può portarla avanti da solo, compresi i punti dove hai deciso di non arrivare.**

---

*Il caso è reale. Sono stati rimossi i nomi del costruttore, del cliente e dei modelli coinvolti; tempi e scene sono compressi e ricostruiti. Restano fedeli il vincolo sul primo accesso, il riordino silenzioso delle risposte, e il fatto che la decisione di non toccare il canale di configurazione sia stata presa prima di guardarci dentro.*

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 1 · LA FRASE DEL CLIENTE
                ════════════════════════════════════════════════

    IL BLOCCO PIU' IMPORTANTE. Sostituisce da solo tutte le metriche: il case study
    di Dropbox non ha un solo numero e regge su una frase del cliente.

    Serve una frase detta da qualcuno del noleggiatore sul lavoro fatto. Anche breve, anche tiepida,
    anche presa da una chat. Meglio se detta da chi decide.

    Se non esiste, va bene il fatto osservato: qualcuno che ha smesso di fare una
    cosa, o che ha iniziato a farne una che prima non poteva.

    CHI L'HA DETTA (ruolo, non nome):

    RISPOSTA:


                ════════════════════════════════════════════════

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 4 · CHI STA MEGLIO, E COME SI VEDE
                ════════════════════════════════════════════════

    Serve un fatto osservabile: qualcosa che un estraneo avrebbe potuto vedere
    entrando in azienda. Chi apre cosa, quando, al posto di cosa faceva prima.

    La precisione qui e' il sostituto del numero.

    RISPOSTA:


                ════════════════════════════════════════════════

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 5 · IL MOMENTO IN CUI FA MALE  →  riscrive la CTA
                ════════════════════════════════════════════════

    Un problema tollerato per anni diventa urgente solo quando succede qualcosa:
    una migrazione, un aggiornamento di versione, un cliente nuovo piu' grosso,
    l'uscita di chi sapeva le cose a memoria, un rilascio andato male, un audit.

    Nel progetto vero c'era una di queste cose all'orizzonte?
    Questo blocco non entra nel corpo: riscrive il campo `cta` nel frontmatter.

    RISPOSTA:


                ════════════════════════════════════════════════
