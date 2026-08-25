# Il permesso che il sistema non sapeva pronunciare

> **Questo è il testo integrale dell'articolo**, così com'è oggi sul sito, con dentro
> Cerca `DA COMPILARE` per saltare da uno all'altro.
>
> Scrivi sulla riga `RISPOSTA:`. Se non hai niente, scrivi `NIENTE`: il blocco sparisce,
> non viene annacquato. Un campo assente batte sempre un campo vago.
>
>
> I blocchi marcati `DA COMPILARE` stanno **nel punto in cui la tua risposta andrà a finire**.
> Quelli in fondo al file sono i tre che non appartengono a un punto preciso del testo:
> la frase del cliente (diventa una citazione prima della tesi), il cambiamento osservabile
> (entra nel risultato) e il momento in cui il problema diventa urgente (riscrive la CTA,
> che vive nel frontmatter e non nel corpo).
>
> Il testo intorno e' quello reale: se leggendolo vuoi cambiare una frase, cambiala qui.

---


## La richiesta da dieci parole

«Al subappaltatore del cantiere 12 fai vedere il capitolato, però non farlo modificare.»

A dirla era il direttore lavori, in una di quelle chiamate che durano meno del caffè. Dieci parole, dette senza alcuna enfasi: per lui non era una richiesta, era una cosa ovvia che una piattaforma di gestione cantieri doveva saper fare. Una persona, una cosa specifica, un verbo concesso e uno negato.

Ho aperto il sistema per cercare dove si scrive una frase del genere. Non c'era.

Non nel senso che la funzionalità non era implementata, né che c'era un'impostazione nascosta in un menu. Nel senso che **nel vocabolario del sistema quella frase non esiste**. C'erano tre ruoli globali — amministratore, progettista, operativo — e ogni persona dentro la piattaforma ne aveva uno. Chi entra vede in base al suo ruolo: il ruolo dice tutto quello che serve, su ogni cantiere, per ogni ordine di lavoro, per sempre. Non c'era nessun posto dove scrivere «questa persona, questa cosa, così e così». Nemmeno uno.

Il direttore lavori non stava chiedendo una feature. Stava pronunciando una frase grammaticalmente corretta in una lingua che il sistema non parla. E la piattaforma non poteva nemmeno rispondere «non si può»: non aveva le parole né per la domanda né per il rifiuto.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 2 · COSA NON SI POTEVA FARE, PRIMA
                ════════════════════════════════════════════════

    Il pezzo apre su una richiesta che il sistema non sa esprimere. Serve sapere
    quante volte quella richiesta e' arrivata davvero, e da chi.

    Era un caso isolato o una domanda ricorrente? Chi la faceva: clienti, commerciale,
    supporto? Cosa si rispondeva prima che il seam esistesse?

    RISPOSTA:


                ════════════════════════════════════════════════


## Tre ruoli, quindici anni prima

Prima di cercare un colpevole, vale la pena guardare quei tre ruoli per quello che sono stati.

Quindici anni prima erano la scelta giusta, e non con occhio benevolo: con i criteri di allora. Cinque utenti, tutti interni, tutti conosciuti per nome. Chi entrava nella piattaforma aveva un mestiere — chi amministrava, chi progettava, chi eseguiva — e il mestiere bastava a decidere quello che poteva toccare. **Il permesso era una proprietà della persona perché le persone si conoscevano.** Non c'era bisogno di una relazione fra un utente e un cantiere: la relazione c'era già fuori dal software, si chiamava ufficio tecnico, e funzionava.

Per anni quella forma ha retto, e ha retto bene. Non è debito contratto con leggerezza: è una decisione presa quando il costo di quella forma era zero, e quel costo è cresciuto piano, un cantiere alla volta, senza mai presentare la fattura. Chi ha scelto tre ruoli globali ha fatto quello che si faceva. Il problema non è quello che hanno deciso: è che il mondo intorno è cambiato senza che nessuna singola modifica sembrasse giustificare una riscrittura.

## Il ruolo che funziona sempre

La risposta naturale alla richiesta del direttore lavori era aggiungere il quarto ruolo: «subappaltatore». E per due giorni il piano è stato esattamente questo.

Funzionava. Si aggiungeva il ruolo, si metteva l'utente dentro, il subappaltatore vedeva quello che gli serviva. Poi è arrivata la richiesta per il collaudatore, e si è fatto lo stesso: nuovo ruolo, nuovo utente, tutto a posto. Anche quello funzionava.

Ed è qui che la trappola va descritta per bene, perché non è la trappola ovvia. **La soluzione sbagliata non fallisce mai.** Ogni ruolo nuovo funziona la mattina stessa in cui lo aggiungi. Nessun errore, nessun incidente, nessuna mail di protesta: solo un'altra chiave globale che apre tutte le porte allo stesso modo. Il conto non arriva mai in una data precisa — arriva distribuito, in decennali piccole concessioni, finché i ruoli non sono più una descrizione delle persone ma una lista di eccezioni con nome proprio.

Dopo due giorni il piano è cambiato, e non perché quello vecchio avesse smesso di funzionare. Proprio il contrario: perché funzionava ogni singola volta, e quindi non c'era nessun momento naturale in cui fermarsi e chiedersi dove si stesse andando. Il quarto ruolo avrebbe funzionato anche lui. E il quinto. E la domanda del direttore lavori, nel frattempo, restava senza una risposta vera: il subappaltatore avrebbe visto *tutti* i cantieri, non il suo.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 3 · IL COSTO DEL RUOLO IN PIU'
                ════════════════════════════════════════════════

    Il pezzo dice che aggiungere un ruolo funziona sempre e ogni volta peggiora.
    Serve l'attrito concreto che questo produceva:
      · quanto durava aggiungere un ruolo nuovo
      · quante volte e' stato fatto prima che diventasse insostenibile
      · chi doveva essere coinvolto ogni volta
      · cosa si rompeva quando si toccava

    RISPOSTA:


                ════════════════════════════════════════════════


## Il salto

Il passaggio che cambia tutto è corto da dirsi.

**Un permesso in un modello ReBAC non è un attributo di chi sei: è una relazione fra te e una cosa specifica.** Non «subappaltatore» come chiave universale, ma «questa persona, su questo capitolato, può vedere». La differenza non è filosofica: è la differenza fra una frase che il sistema sa pronunciare e una che non sa.

Il modello OpenFGA — chi è collegato a cosa, e attraverso quali catene di tupla — l'ho imparato e raccontato nella [serie sui concetti di Zanzibar](/blog/verificare/openfga/01-zanzibar-concetti/), quindi qui non lo rispiego: la serie lo fa meglio, e questo pezzo parla d'altro. Parla di come si introduce quella forma in un sistema che ha gente dentro adesso.

## L'ostacolo vero

Perché non si butta giù il nuovo modello, si collega, e si cambia? Perché il sistema non è un esercizio: è vivo. Ha gente dentro adesso — direttore lavori, progettisti, operativi, ora anche subappaltatori — che apre la piattaforma ogni mattina per lavorare. Non c'è una versione di laboratorio su cui provare, non c'è il permesso di sbagliare, e non c'è una finestra in cui «per un'ora il sistema fa i capricci» sia una frase accettabile.

L'ostacolo vero, quindi, non era modellare le relazioni. Era **come si cambia la serratura senza chiudere la porta**.

La forma che ha retto è un seam: un unico punto di controllo davanti a tutte le domande «può?», con tre implementazioni dietro la stessa interfaccia.

La prima **replica deliberatamente il comportamento vecchio**: guarda il ruolo globale dell'utente e risponde esattamente come avrebbe risposto il codice di ieri — stesse risposte, stessi angoli ciechi, perché in questa fase l'obiettivo non è essere migliori, è essere identici. La seconda **non fa nulla**: serve a misurare cosa succede quando nessuno risponde, e a scoprire quanti punti del sistema chiedano davvero il permesso senza che nessuno lo sappia. La terza è quella **nuova**, che interroga le relazioni.

Un flag decide chi risponde. Girare il flag non è un deploy: è una scelta di traffico, reversibile in un istante, che si fa prima per un utente, poi per uno scenario, poi per tutti. Come si tiene aperta una strada mentre se costruisce una parallela l'ho già raccontato parlando di [identità e permessi che devono parlarsi senza invadere il territorio dell'altro](/blog/verificare/openfga/02-openfga-keycloak/); qui il meccanismo è lo stesso, applicato a un sistema che non si può fermare.

Questa è la parte che un lettore con lo stesso problema può rubare: **la replica del vecchio è una feature, non un ripiego**. Finché la prima implementazione risponde, il nuovo modello può sbagliare in tutta sicurezza — e sbaglierà, perché nessun modello è uguale al vecchio il primo giorno.

## Nessun record da migrare

Questa sezione, in cronologia, viene molto dopo. Sta qui perché è qui che si capisce.

Chi sente «sostituire l'autorizzazione» immagina subito il lavoro sporco: lo script di migrazione, il backfill, la notte bianca del cutover, il piano di rollback per il caso in cui lo script si fermi a metà. Io me lo immaginavo così, e avevo già cominciato a disegnarlo.

Poi ho smesso, perché cercando i record da migrare ho scoperto che **non esistevano**.

I permessi vecchi non erano dati: erano `if` sparsi nel codice. Alcune decine di punti in cui il sistema chiedeva «che ruolo hai?» e decidendo da solo decideva tutto. Non c'era una tabella dei permessi da portare altrove, perché i permessi non erano mai stati una cosa scritta: erano la forma del codice stesso. Migrarli non era difficile. Non avevano una forma che si possa migrare.

E questo ribalta il problema, nel senso buono. Le relazioni nuove non si trasferiscono: **si sintetizzano** da ciò che il sistema già sa. Chi lavora su quale ordine di lavoro, chi è responsabile di quale cantiere, chi ha toccato per ultimo quale capitolato: quelle informazioni esistevano già, da quindici anni, usate per decine di scopi che non erano i permessi. Bastava leggerle come relazioni.

La differenza fra sintetizzare e migrare non è tecnica, è di rischio. Un record migrato sbagliato resta scritto: è una verità congelata che nessuno ricalcola, e la scopri quando qualcuno non riesce a lavorare. Una sintesi sbagliata si ricalcola: correggi la regola, e la prossima risposta è giusta. Su un sistema vivo, questa differenza è tutto.

## Il prezzo dell'unione

Il modello nuovo ha una proprietà splendida: tutto è unione. Puoi vedere un cantiere perché sei responsabile, oppure perché lavori a un ordine dentro quel cantiere, oppure perché qualcuno ti ha reso partecipe di un capitolato: la risposta è la somma delle strade che portano a te. Componibile, locale, prevedibile. E finché le domande sono «chi può vedere questo?», l'unione risponde felice.

Poi arriva la prima richiesta del tipo: «questo utente **non** deve».

Il subappaltatore del cantiere 12, appunto — o il suo equivalente del mese successivo. E negare è la cosa che l'unione non sa fare, perché negando rompi la proprietà più bella del modello: che ogni risposta si spiega guardando le relazioni in gioco. Con un'eccezione in mezzo, **non si ragiona più per somma**, e la domanda «perché lui non può?» smette di avere una risposta locale: la risposta vive in una regola speciale, non in una relazione.

Non è un difetto che si aggiusta con un filtro: è una scelta di forma, e va fatta sapendo quello che si lascia. Delle gerarchie che si complicano e delle query che smettono di risolversi guardando solo il vicinato ho scritto in [gerarchie profonde e query inverse](/blog/verificare/openfga/04-gerarchie-query/); è lo stesso confine, visto dal lato delle prestazioni. Qui il conto si paga in espressività: guadagni un vocabolario che finalmente sa pronunciare la frase del direttore lavori, e perdi la semplicità di un mondo dove tutto era unione.

Lo scrivo perché è il prezzo vero, ed è meglio saperlo prima. Chi vende il modello a relazioni come «stesso servizio, funzioni in più» sta vendendo anche questo, senza dirlo.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 4 · CHI STA MEGLIO, E COME SI VEDE
                ════════════════════════════════════════════════

    Serve un fatto osservabile: qualcosa che un estraneo avrebbe potuto vedere
    entrando in azienda. Chi apre cosa, quando, al posto di cosa faceva prima.

    La precisione qui e' il sostituto del numero.

    RISPOSTA:


                ════════════════════════════════════════════════


## Dietro il flag

Il finale onesto è che il percorso vecchio è ancora lì.

Dietro il flag, pronto a rispondere, e ci resterà per un po'. Non perché il nuovo non funzioni: perché su un sistema vivo lo spegnimento non è un gesto, è una conseguenza — arriva quando il nuovo ha accumulato abbastanza prove da non aver più bisogno della rete. Nessuna data promessa, e nessuna voglia di fingere che la migrazione sia finita solo perché la parte nuova esiste e risponde.

C'è chi leggerà questo come un lavoro finito a metà. Lo capisco, e la mia risposta è che **la metà visibile è l'unica metà che si potesse costruire senza smettere di servire le persone che stavano lavorando**. Un seam non è un ponte da attraversare una volta: è un posto dove si abita per un periodo. E saperci abitare senza fretta — tenendo il vecchio raggiungibile, il nuovo sotto osservazione, e il flag in mano a chi risponde dei sistemi vivi — è la competenza. Non la migrazione lampo.

---

*Il caso è reale, il dominio no: piattaforma di gestione cantieri edili al posto di quello originale, terminologia sostituita per intero. Il direttore lavori è un personaggio composito di richieste arrivate in momenti diversi; tempi e scene sono compressi, e la svolta è raccontata dove diventa comprensibile, non dove è stata capita. Restano fedeli le cose che contano: nessun record è stato migrato, le relazioni nuove si sintetizzano da ciò che il sistema già sa, e il percorso vecchio è ancora attivo dietro un flag.*



                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 1 · LA FRASE DEL CLIENTE
                ════════════════════════════════════════════════

    IL BLOCCO PIU' IMPORTANTE. Sostituisce da solo tutte le metriche: il case study
    di Dropbox non ha un solo numero e regge su una frase del cliente.

    Serve una frase detta da qualcuno del cliente sul lavoro fatto. Anche breve, anche tiepida,
    anche presa da una chat. Meglio se detta da chi decide.

    Se non esiste, va bene il fatto osservato: qualcuno che ha smesso di fare una
    cosa, o che ha iniziato a farne una che prima non poteva.

    CHI L'HA DETTA (ruolo, non nome):

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



                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 6 · IL FLAG E' ANCORA LI'?
                ════════════════════════════════════════════════

    Il finale dice che il percorso vecchio resta attivo dietro un flag, ed e' la parte
    onesta del pezzo. Serve sapere a che punto e' oggi:

      · il flag e' ancora acceso da qualche parte?
      · qualcuno ha una data per spegnerlo?
      · quanti punti di controllo vecchi restano?

    Se e' cambiato qualcosa da quando l'hai scritto, il finale va aggiornato: e'
    l'affermazione piu' verificabile del pezzo.

    RISPOSTA:


                ════════════════════════════════════════════════
