# Il permesso che il sistema non sapeva pronunciare

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

    RISPOSTA: era un caso tutto sommato isolato perché era emerso in una delle prime fasi di vita del prodotto per fortuna chi aveva fatto la l'analisi dei requisiti non era la stessa persona che poi doveva utilizzarlo comunque non aveva coinvolto tutte le persone che doveva coinvolgere, quindi poi anche parlando altre cose come questa sono sull'emerse. Quando dico prima fase delle visite del prodotto, intendo più che altro delle nuove finiture che venivano sviluppate sul sul prodotto vecchio.


                ════════════════════════════════════════════════


## Tre ruoli, quindici anni prima

Prima di cercare un colpevole, vale la pena guardare quei tre ruoli per quello che sono stati.

Quindici anni prima erano la scelta giusta, e non con occhio benevolo: con i criteri di allora. Cinque utenti, tutti interni, tutti conosciuti per nome. Chi entrava nella piattaforma aveva un mestiere — chi amministrava, chi progettava, chi eseguiva — e il mestiere bastava a decidere quello che poteva toccare. **Il permesso era una proprietà della persona perché le persone si conoscevano.** Non c'era bisogno di una relazione fra un utente e un cantiere: la relazione c'era già fuori dal software, si chiamava ufficio tecnico, e funzionava.

C'è però una seconda ragione, ed è meno comoda della prima. Quel modello dei permessi era stato disegnato durante l'analisi dei requisiti da persone che non erano quelle che poi avrebbero usato il prodotto, e senza coinvolgere tutti quelli che andavano coinvolti. Non è una colpa: è una cosa che succede quasi sempre, e si paga anni dopo. Quando la richiesta del direttore lavori è arrivata, non stava scoprendo un limite del software — stava dicendo per la prima volta una cosa che nessuno aveva mai chiesto a chi di dovere.

Per anni quella forma ha retto, e ha retto bene. Non è debito contratto con leggerezza: è una decisione presa quando il costo di quella forma era zero, e quel costo è cresciuto piano, un cantiere alla volta, senza mai presentare la fattura. Chi ha scelto tre ruoli globali ha fatto quello che si faceva. Il problema non è quello che hanno deciso: è che il mondo intorno è cambiato senza che nessuna singola modifica sembrasse giustificare una riscrittura.

## Il ruolo che funziona sempre

La risposta naturale alla richiesta del direttore lavori era aggiungere il quarto ruolo: «subappaltatore». E per due giorni il piano è stato esattamente questo.

Funzionava. Si aggiungeva il ruolo, si metteva l'utente dentro, il subappaltatore vedeva quello che gli serviva. Poi è arrivata la richiesta per il collaudatore, e si è fatto lo stesso: nuovo ruolo, nuovo utente, tutto a posto. Anche quello funzionava.

Ed è qui che la trappola va descritta per bene, perché non è la trappola ovvia. **La soluzione sbagliata non fallisce mai.** Ogni ruolo nuovo funziona la mattina stessa in cui lo aggiungi. Nessun errore, nessun incidente, nessuna mail di protesta: solo un'altra chiave globale che apre tutte le porte allo stesso modo. Il conto non arriva mai in una data precisa — arriva distribuito, in decennali piccole concessioni, finché i ruoli non sono più una descrizione delle persone ma una lista di eccezioni con nome proprio.

E c'è la parte che il conteggio dei ruoli non racconta: **il costo non era aggiungere il ruolo, era verificarlo**. Ogni ruolo nuovo si traduce in molte modifiche piccole sparse nel codice, e ognuna va provata — perché sono fattori di sicurezza, e sbagliare significa mostrare a qualcuno qualcosa che non deve vedere.

Non solo. In quella piattaforma certe funzioni non dovevano essere nascoste: **non dovevano essere note nella loro esistenza**. Un utente non autorizzato non doveva vedere il pulsante disabilitato — non doveva sapere che quel pulsante esiste. Che è un requisito diverso, e molto più difficile: costringe a verificare anche l'interfaccia, non solo la logica, e trasforma ogni ruolo nuovo in una campagna di prove che tocca schermate e permessi insieme.

Passare da tre ruoli a quattro è un conto. Ragionare su dove infilare l'ennesimo, quando ce ne sono già una ventina e ognuno porta con sé la sua campagna di verifica, è un'altra cosa.

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

    RISPOSTA: tante tante piccole modifiche sparse per il codice che da testare diventavano problematiche soprattutto andavano testa anche perché sono fattori di sicurezza non si potevano esporre determinate informazioni agli utenti sbagliati. Inoltre, doveva essere testato anche dal punto di vista grafico non solo di disequazione perché determinate funzioni dell'applicativo non dovevano neanche essere fatte conoscere a livello di esistenza a certi utenti quindi tutte le le procedure di verifica diventavano molto molto articolate e anche decidi i ruoli iniziava a diventare articolato quando si passa dal 34 un conto quando inizia a fare dei ragionamenti su come inserire il 27º ruolo ovviamente inizia a diventare tutto molto più complicato


                ════════════════════════════════════════════════


## Il salto

Il passaggio che cambia tutto è corto da dirsi.

**Un permesso in un modello ReBAC non è un attributo di chi sei: è una relazione fra te e una cosa specifica.** Non «subappaltatore» come chiave universale, ma «questa persona, su questo capitolato, può vedere». La differenza non è filosofica: è la differenza fra una frase che il sistema sa pronunciare e una che non sa. In numeri: si passa da **tre ruoli globali** a **una ottantina di relazioni distribuite su sei tipi di oggetto**. Non è complessità aggiunta per gusto — è il vocabolario che serviva per rispondere a quella richiesta di dieci parole.

Il modello OpenFGA — chi è collegato a cosa, e attraverso quali catene di tupla — l'ho imparato e raccontato nella [serie sui concetti di Zanzibar](/blog/verificare/openfga/01-zanzibar-concetti/), quindi qui non lo rispiego: la serie lo fa meglio, e questo pezzo parla d'altro. Parla di come si introduce quella forma in un sistema che ha gente dentro adesso.

## L'ostacolo vero

Perché non si butta giù il nuovo modello, si collega, e si cambia? Perché il sistema non è un esercizio: è vivo. Ha gente dentro adesso — direttore lavori, progettisti, operativi, ora anche subappaltatori — che apre la piattaforma ogni mattina per lavorare. Non c'è una versione di laboratorio su cui provare, non c'è il permesso di sbagliare, e non c'è una finestra in cui «per un'ora il sistema fa i capricci» sia una frase accettabile.

L'ostacolo vero, quindi, non era modellare le relazioni. Era **come si cambia la serratura senza chiudere la porta**.

La forma che ha retto è un seam: un unico punto di controllo davanti a tutte le domande «può?», con tre implementazioni dietro la stessa interfaccia.

La prima **replica deliberatamente il comportamento vecchio**: guarda il ruolo globale dell'utente e risponde esattamente come avrebbe risposto il codice di ieri — stesse risposte, stessi angoli ciechi, perché in questa fase l'obiettivo non è essere migliori, è essere identici. La seconda **non fa nulla**: serve a misurare cosa succede quando nessuno risponde, e a scoprire quanti punti del sistema chiedano davvero il permesso senza che nessuno lo sappia. La terza è quella **nuova**, che interroga le relazioni.

Un flag decide chi risponde. Girare il flag non è un deploy: è una scelta di traffico, reversibile in un istante, che si fa prima per un utente, poi per uno scenario, poi per tutti. Come si tiene aperta una strada mentre se costruisce una parallela l'ho già raccontato parlando di [identità e permessi che devono parlarsi senza invadere il territorio dell'altro](/blog/verificare/openfga/02-openfga-keycloak/); qui il meccanismo è lo stesso, applicato a un sistema che non si può fermare.

Il costo di quella scelta si misura: il motore nuovo sta in **circa ottocento righe**, la replica del comportamento vecchio in **meno di duecento**. Un quinto dello sforzo per non rompere niente mentre il resto cambia — ed è la voce che non entra mai in nessun preventivo, perché non produce niente di visibile.

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

## Il flag che non c'è più

Il flag è stato tolto.

È rimasto acceso per un periodo, e non per prudenza generica: serviva a passare avanti e indietro fra le due modalità e guardare se il modello nuovo rompeva qualcosa che prima funzionava. Perché il comportamento vecchio, per quanto limitato, **era corretto e accettato** — la gente ci lavorava e otteneva quello che si aspettava. Un modello nuovo che risponde diversamente non è automaticamente migliore: prima devi dimostrare che le differenze sono quelle che volevi, non quelle che ti sono sfuggite.

Quando le due modalità hanno smesso di divergere su qualcosa che non fosse voluto, la vecchia è stata rimossa. Non c'è stata una data promessa in anticipo: c'è stato un momento in cui non serviva più.

Quello che resta è del codice morto — riferimenti al vecchio modello di ruoli sparsi in una ventina di file, che non decidono più niente e aspettano solo di essere cancellati. È un residuo, non un ripiego: la differenza è che adesso è un elenco, e prima era una ragnatela.

## Cosa si può fare adesso che prima non si poteva

Due cose, e la seconda non me l'aspettavo.

La prima è quella per cui il lavoro è nato: si definiscono varianti mirate — questa persona, su questo cantiere, con questo capitolato — che con i ruoli non erano semplicemente scomode da scrivere, erano **non rappresentabili**. Non esisteva una combinazione di ruoli che le esprimesse.

La seconda è arrivata come conseguenza, e vale per un pubblico diverso: **si può ricostruire a posteriori chi vedeva cosa in un dato momento.** Con tre ruoli globali quella domanda non aveva risposta — l'unica ricostruzione possibile era chiedere a qualcuno se si ricordava. Con le relazioni la risposta è un'interrogazione. Non è una funzionalità che qualcuno aveva chiesto: è quello che succede quando i permessi smettono di essere una proprietà delle persone e diventano fatti registrati.

C'è chi leggerà una migrazione durata così come un lavoro fatto lentamente. Lo capisco, e la mia risposta è che **la lentezza era il metodo, non il sintomo**: il vecchio raggiungibile finché è servito, il nuovo sotto osservazione finché non ha smesso di sorprendere, e il flag in mano a chi risponde dei sistemi vivi. Un seam non è un ponte da attraversare una volta: è un posto dove si abita per un periodo, e poi si smonta.

---

*Il caso è reale, il dominio no: piattaforma di gestione cantieri edili al posto di quello originale, terminologia sostituita per intero. Il direttore lavori è un personaggio composito di richieste arrivate in momenti diversi; tempi e scene sono compressi, e la svolta è raccontata dove diventa comprensibile, non dove è stata capita. Restano fedeli le cose che contano: nessun record è stato migrato, le relazioni nuove si sintetizzano da ciò che il sistema già sa, e il percorso vecchio è stato rimosso solo dopo che le due modalità hanno smesso di divergere.*

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 4 · CHI STA MEGLIO, E COME SI VEDE
                ════════════════════════════════════════════════

    Serve un fatto osservabile: qualcosa che un estraneo avrebbe potuto vedere
    entrando in azienda. Chi apre cosa, quando, al posto di cosa faceva prima.

    ── LE METRICHE SONO GIA' NEL TESTO ────────────────────────────────────

    Il 2026-08-25 ho contato nel repo e ne ho messe tre nel pezzo, come ordini
    di grandezza:

      · tre ruoli globali  →  una ottantina di relazioni su sei tipi di oggetto
      · circa ottocento righe il motore nuovo, meno di duecento la replica del vecchio
      · un'ottantina di punti in una ventina di file dove decide ancora il ruolo

    Sono metriche di AMPIEZZA: dicono quanto era grande il lavoro, non quanto e'
    migliorato qualcosa. Rispondono alla domanda «il mio caso somiglia?», non
    «quanto avete guadagnato?».

    Le altre contate e non usate stanno in `_strategy/anonimizzazioni.yaml`:
    332 test su 24 file, 45 con container veri, 2.724 righe di layer, 24 chiamate
    ai gate, 889 file .cs nel prodotto.

    ── COSA SERVE ANCORA DA TE ────────────────────────────────────────────

    Le metriche di ampiezza non rispondono a «chi sta meglio». Per quello serve
    una di queste tre cose, in ordine di forza:

    1. UN NUMERO DI ESITO, se esiste: quanto durava aggiungere un permesso nuovo
       prima e quanto dopo; quante richieste di quel tipo arrivavano al mese;
       quante volte si e' dovuto dire di no.

      > richiedeva settimane di lavoro, anche perché comunque c'era da fare un'analisi mettere d'accordo alle persone su nome del ruolo verificare se tutto fosse effettivamente funzionante c'era molta poca fiducia su quello che era fatto

    2. UN FATTO OSSERVABILE, se il numero non c'e': chi ha smesso di essere
       interrotto, chi ha configurato qualcosa da solo, cosa non passa piu' da te.

        > sì, ma sono molto più molto indipendente. Non dipende dalle loro referenze che devono validare in partenza la modifica ma possono accedere in modo molto autonomo. Possono definire nel senso delle regole su open effe a scrivere dei test dei criteri di valutazione e poi discutere con il manager, in questo modo, comunque loro non la possibilità di muoversi con molta più tranquillità, definendo dei criteri di oggettivi che poi vengono guardati insieme al referente questo è molto d'aiuto anche per farsi parte, guardando qualcosa di già fatto piuttosto che partendo da un un foglio bianco discutendo di ipotesi, si guarda il lavoro, il lavoro già fatto e lavorando tramite le azioni, si possono anche definire delle relazioni di base che magari sanciscono le i criteri più stringenti che devono essere mantenuti per render sbagliare molto difficile cose che non è vera con un ruolo con un nuovo ruolo molti dei controlli devono essere di fatto da zero o sono molto più pro errori, perché magari sono concatenazioni di richieste di booleane che con FBI vengono meno

    3. NIENTE, se non c'e' nessuna delle due. Il pezzo si chiude sulla tesi e le
       metriche di ampiezza fanno il loro lavoro. E' una scelta legittima.

    Se hai un numero ma non sei sicuro, scrivilo con «circa»: un ordine di
    grandezza vero batte una cifra precisa ricordata male.

    RISPOSTA:


                ════════════════════════════════════════════════

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

    RISPOSTA: in generale sono contenti perché sono abbiamo finito i risultato flessibile con dei criteri estremamente mirati rispetto a quello che questo ruolo siamo adesso sono in grado di definire tutte le variazioni specifiche del caso o varianti che tramite semplici ruoli non erano assolutamente rappresentabili in generale anche il fatto di poter verificare o posteriori o quello che era un assegnazione di visibilità in determinato momento


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

    RISPOSTA: in realtà, con Flag non c'è più è stato mantenuto per un periodo in modo da sbucciare tra le da switchare tra le due modalità per vedere se quanto è implementato rompeva la l'archeologica perché comunque sia per quanto poco e imponibile era corretto e accettante quindi come tale doveva doveva essere mantenuta quindi sta usato per un periodo per motivi di verifiche dopo aver completato con successo la migrazione si è tenuto ovviamente solamente la versione corretta


                ════════════════════════════════════════════════
