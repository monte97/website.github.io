---
title: "Il permesso che il sistema non sapeva pronunciare"
description: "«Fa vedere il capitolato al subappaltatore, ma non farlo toccare.» Dieci parole che il sistema non aveva il vocabolario per dire. La storia di come si sostituisce l'autorizzazione di un sistema vivo senza migrare un solo record."
type: case-study
pillar: progettare
pillarApplied: progettare
featured: false
weight: 4
eyebrow: "Analisi tecnica · autorizzazione di un sistema in esercizio"
tags: [Autorizzazione, Legacy, ReBAC, Strangler fig]
links:
  blog: "/blog/verificare/openfga/01-zanzibar-concetti/"
oggetto: >
  L'autorizzazione di una piattaforma di gestione cantieri per un'impresa di costruzioni:
  tre ruoli globali portati da Keycloak, controlli sparsi nel codice .NET, e una richiesta
  che il vocabolario del sistema non riusciva a esprimere.
metodo: >
  Un solo punto di controllo davanti alle domande sui permessi, con tre implementazioni
  dietro: una che replica deliberatamente il comportamento vecchio, una vuota, una nuova, e un flag che decide chi risponde. Le tuple OpenFGA si sintetizzano da ciò che il
  sistema già sa: nessun record migrato, nessun cutover notturno.
esito: >
  L'autorizzazione per singola risorsa e' diventata esprimibile in OpenFGA: da tre ruoli
  globali a un'ottantina di relazioni su sei tipi: senza migrare un solo record, e con la
  possibilita' di ricostruire a posteriori chi vedeva cosa. Il percorso vecchio e' stato
  rimosso dopo il periodo di doppia modalita': i permessi vecchi non erano dati, erano condizioni sparse nel codice. Il
  percorso precedente resta attivo dietro un flag, ed e' la parte onesta del risultato.
anonimizzazione: >
  Il dominio è sostituito: piattaforma di gestione cantieri edili al posto di quello
  reale. Il direttore lavori è un personaggio composito di richieste arrivate in momenti
  diversi, e tempi e scene sono compressi. Sono omessi il nome del committente e ogni
  dettaglio che possa ri-identificarne il prodotto; i numeri compaiono solo come ordini
  di grandezza.
sections:
  - n: "01"
    title: "La richiesta da dieci parole"
    summary: "Vedere il capitolato, senza toccarlo"
  - n: "02"
    title: "Tre ruoli, quindici anni prima"
    summary: "Era la scelta giusta, ed è colpa di nessuno"
  - n: "03"
    title: "Il ruolo che funziona sempre"
    summary: "La soluzione sbagliata non fallisce mai: è questo il problema"
  - n: "04"
    title: "Il salto"
    summary: "Il permesso come relazione, non come proprietà della persona"
  - n: "05"
    title: "L'ostacolo vero"
    summary: "Il sistema è vivo, e non c'è il permesso di sbagliare"
  - n: "06"
    title: "Nessun record da migrare"
    summary: "I permessi vecchi non erano dati: erano if sparsi nel codice"
  - n: "07"
    title: "Il prezzo dell'unione"
    summary: "L'unione non sa dire di no"
  - n: "08"
    title: "Dietro il flag"
    summary: "Il finale che non è un trionfo"
readingPaths:
  - label: "Per decidere"
    desc: "Le prime tre sezioni: come un sistema arriva a non sapere dire una frase semplice, e perché aggiungere il quarto ruolo globale è una trappola che funziona ogni volta."
  - label: "Per valutare"
    desc: "Dal salto in poi: il seam con tre implementazioni dietro un flag, la sintesi delle relazioni al posto della migrazione, e il prezzo dell'unione."
readingNote: >
  L'ordine non è cronologico. La svolta è raccontata dove diventa comprensibile, non
  dove è stata capita: lo dichiara la stessa sezione 06.
specs:
  - label: "Perimetro"
    value: "Le domande «può?» sull'autorizzazione, raccolte dietro un'unica interfaccia"
    note: "Il seam sta davanti ai permessi, non al resto del sistema"
  - label: "Implementazioni"
    value: "Tre dietro la stessa interfaccia: replica del comportamento vecchio, vuota, nuova"
    note: "Un flag decide chi risponde"
  - label: "Migrazione dati"
    value: "Zero record migrati"
    note: "Le relazioni nuove si sintetizzano da ciò che il sistema già sa"
  - label: "Modello"
    value: "Relazioni fra persona e risorsa, al posto di ruoli globali"
  - label: "Fuori scope"
    value: "Lo spegnimento del percorso vecchio: resta attivo dietro il flag"
decisions:
  - title: "Sostituire i punti di controllo"
    chosen: "Un'interfaccia sola, con tre implementazioni dietro e un flag che sceglie chi risponde"
    chosenWhy: "Il sistema è vivo e non c'è il permesso di sbagliare: il comportamento vecchio resta disponibile fino a quando il nuovo non ha prove."
    rejected: "Riscrivere i punti di controllo uno per uno"
    appeal: "È il lavoro che sembra vero: ogni punto riscritto è un pezzo di legacy cancellato per sempre. Ma ognuno può rompersi da solo, con gente dentro."
    why: "Prima la capacità di tornare indietro, poi la qualità del nuovo. Nell'ordine inverso non si torna indietro."
  - title: "I permessi esistenti"
    chosen: "Sintetizzare le relazioni da ciò che il sistema già sa"
    chosenWhy: "Se la sintesi sbaglia, si ricalcola. Un record migrato sbagliato resta scritto."
    rejected: "Esportare i permessi vecchi e migrarli in un archivio nuovo"
    appeal: "Un archivio esplicito sembra più pulito e più verificabile. Ma i permessi vecchi non erano un archivio: erano if."
decisionsNote: >
  Il filo è lo stesso nei due bivi: su un sistema vivo la reversibilità vale più
  dell'eleganza. Il vecchio resta raggiungibile finché il nuovo non si è guadagnato
  il posto.
timeline:
  label: "Come si cambia la serratura senza chiudere la porta"
  steps:
    - kind: "Punto zero"
      title: "Un solo punto di controllo davanti a tutte le domande «può?»"
      desc: >
        Prima di cambiare qualsiasi cosa, tutte le decisioni sui permessi passano da
        un'unica interfaccia. Finché i controlli restano sparsi nel codice, non c'è
        niente da girare.
      done: true
    - kind: "Dietro l'interfaccia"
      title: "Tre implementazioni, non due"
      desc: >
        Una replica il comportamento vecchio: stesse risposte, stessi angoli ciechi.
        Una non risponde affatto, per misurare quanti punti del sistema chiedano il
        permesso senza che nessuno lo sappia. Una interroga le relazioni nuove.
      done: true
    - kind: "Il flag"
      title: "Prima un utente, poi uno scenario, poi tutti"
      desc: >
        Girare il flag è una scelta di traffico, non un deploy: reversibile in un
        istante. È la fase in cui il modello nuovo può sbagliare in sicurezza, perché
        la replica del vecchio è ancora lì a rispondere.
      done: true
    - kind: "Fine dell'abitazione"
      title: "Il seam si smonta"
      desc: >
        Un seam non è una struttura permanente: quando la terza implementazione è
        l'unica che risponde, le altre due e il punto di controllo che le sceglieva
        diventano codice da togliere.
  caption: "G1 · le quattro fasi del seam"
  note: >
    La fase che costa e non si vede è la seconda: la replica del comportamento vecchio
    sta in meno di duecento righe contro le ottocento del motore nuovo, e non produce
    niente di visibile. È la voce che non entra mai in un preventivo.
openItems:
  - "Restano riferimenti al vecchio modello di ruoli sparsi in una ventina di file: codice morto che non decide più nulla, e che aspetta di essere cancellato"
  - "La ricostruzione a posteriori di chi vedeva cosa è possibile, ma non c'è ancora un'interfaccia che la renda comoda a chi non scrive interrogazioni"
  - "Il modello copre il perimetro affrontato: le aree del prodotto che non sono passate dal seam non sono state toccate"
cta:
  title: "Quante volte avete detto «con i ruoli non si può fare»?"
  desc: >
    Se la risposta è più di una, il problema è che il modello
    dei permessi è stato disegnato quando gli utenti erano pochi e si conoscevano tutti.
    Capire se si può cambiare senza fermare il sistema è un lavoro delimitato.
thesis: "Un seam è un posto dove si abita per un periodo, e poi si smonta: saperci stare senza fretta vale più di una migrazione lampo."
---

## La richiesta da dieci parole

«Al subappaltatore del cantiere 12 fai vedere il capitolato, però non farlo modificare.»

A dirla era il direttore lavori, in una di quelle chiamate che durano meno del caffè. Dieci parole, dette senza alcuna enfasi: per lui non era una richiesta, era una cosa ovvia che una piattaforma di gestione cantieri doveva saper fare. Una persona, una cosa specifica, un verbo concesso e uno negato.

Ho aperto il sistema per cercare dove si scrive una frase del genere. Non c'era.

Non nel senso che la funzionalità non era implementata, né che c'era un'impostazione nascosta in un menu. Nel senso che **nel vocabolario del sistema quella frase non esiste**. C'erano tre ruoli globali (amministratore, progettista, operativo) e ogni persona dentro la piattaforma ne aveva uno. Chi entra vede in base al suo ruolo: il ruolo dice tutto quello che serve, su ogni cantiere, per ogni ordine di lavoro, per sempre. Non c'era nessun posto dove scrivere «questa persona, questa cosa, così e così». Nemmeno uno.

Il direttore lavori non stava chiedendo una feature. Stava pronunciando una frase grammaticalmente corretta in una lingua che il sistema non parla. E la piattaforma non poteva nemmeno rispondere «non si può»: non aveva le parole né per la domanda né per il rifiuto.

## Tre ruoli, quindici anni prima

Prima di cercare un colpevole, vale la pena guardare quei tre ruoli per quello che sono stati.

Quindici anni prima erano la scelta giusta, e non con occhio benevolo: con i criteri di allora. Cinque utenti, tutti interni, tutti conosciuti per nome. Chi entrava nella piattaforma aveva un mestiere (chi amministrava, chi progettava, chi eseguiva) e il mestiere bastava a decidere quello che poteva toccare. **Il permesso era una proprietà della persona perché le persone si conoscevano.** Non c'era bisogno di una relazione fra un utente e un cantiere: la relazione c'era già fuori dal software, si chiamava ufficio tecnico, e funzionava.

C'è però una seconda ragione, ed è meno comoda della prima. Quel modello dei permessi era stato disegnato durante l'analisi dei requisiti da persone che non erano quelle che poi avrebbero usato il prodotto, e senza coinvolgere tutti quelli che andavano coinvolti. Succede quasi sempre, e si paga anni dopo. Quando la richiesta del direttore lavori è arrivata, non stava scoprendo un limite del software: stava dicendo per la prima volta una cosa che nessuno aveva mai chiesto a chi di dovere.

Per anni quella forma ha retto, e ha retto bene. È una decisione presa quando il costo di quella forma era zero, e quel costo è cresciuto piano, un cantiere alla volta, senza mai presentare la fattura. Chi ha scelto tre ruoli globali ha fatto quello che si faceva. Il problema è che il mondo intorno è cambiato senza che nessuna singola modifica sembrasse giustificare una riscrittura.

## Il ruolo che funziona sempre

La risposta naturale alla richiesta del direttore lavori era aggiungere il quarto ruolo: «subappaltatore». E per due giorni il piano è stato esattamente questo.

Funzionava. Si aggiungeva il ruolo, si metteva l'utente dentro, il subappaltatore vedeva quello che gli serviva. Poi è arrivata la richiesta per il collaudatore, e si è fatto lo stesso: nuovo ruolo, nuovo utente, tutto a posto. Anche quello funzionava.

Ed è qui che la trappola va descritta per bene, perché non è la trappola ovvia. **La soluzione sbagliata non fallisce mai.** Ogni ruolo nuovo funziona la mattina stessa in cui lo aggiungi. Nessun errore, nessun incidente, nessuna mail di protesta: solo un'altra chiave globale che apre tutte le porte allo stesso modo. Il conto non arriva mai in una data precisa: arriva distribuito, in decennali piccole concessioni, finché i ruoli non sono più una descrizione delle persone ma una lista di eccezioni con nome proprio.

Il costo si misurava in **settimane**. Non di sviluppo: di analisi, di riunioni per mettere d'accordo le persone anche solo sul nome del ruolo, e di verifiche per capire se davvero funzionava. Alla fine di tutto questo, la fiducia in quello che era stato fatto restava bassa.

E c'è la parte che il conteggio dei ruoli non racconta: **il costo non era aggiungere il ruolo, era verificarlo**. Ogni ruolo nuovo si traduce in molte modifiche piccole sparse nel codice, e ognuna va provata, perché sono fattori di sicurezza, e sbagliare significa mostrare a qualcuno qualcosa che non deve vedere.

Non solo. In quella piattaforma certe funzioni non dovevano essere nascoste: **non dovevano essere note nella loro esistenza**. Un utente non autorizzato non doveva vedere il pulsante disabilitato, non doveva sapere che quel pulsante esiste. Che è un requisito diverso, e molto più difficile: costringe a verificare anche l'interfaccia, non solo la logica, e trasforma ogni ruolo nuovo in una campagna di prove che tocca schermate e permessi insieme.

Passare da tre ruoli a quattro è un conto. Ragionare su dove infilare l'ennesimo, quando ce ne sono già una ventina e ognuno porta con sé la sua campagna di verifica, è un'altra cosa.

Dopo due giorni il piano è cambiato, e non perché quello vecchio avesse smesso di funzionare. Proprio il contrario: perché funzionava ogni singola volta, e quindi non c'era nessun momento naturale in cui fermarsi e chiedersi dove si stesse andando. Il quarto ruolo avrebbe funzionato anche lui. E il quinto. E la domanda del direttore lavori, nel frattempo, restava senza una risposta vera: il subappaltatore avrebbe visto *tutti* i cantieri, non il suo.

## Il salto

Il passaggio che cambia tutto è corto da dirsi.

**In un modello ReBAC un permesso è una relazione fra una persona e una cosa specifica, non una proprietà di chi sei.** Non «subappaltatore» come chiave universale, ma «questa persona, su questo capitolato, può vedere». La differenza è concreta: una frase che il sistema sa pronunciare, contro una che non sa. In numeri: si passa da **tre ruoli globali** a **una ottantina di relazioni distribuite su sei tipi di oggetto**. Non è complessità aggiunta per gusto: è il vocabolario che serviva per rispondere a quella richiesta di dieci parole.

Il modello OpenFGA (chi è collegato a cosa, e attraverso quali catene di tupla) l'ho imparato e raccontato nella [serie sui concetti di Zanzibar](/blog/verificare/openfga/01-zanzibar-concetti/), quindi qui non lo rispiego: la serie lo fa meglio, e questo pezzo parla d'altro. Parla di come si introduce quella forma in un sistema che ha gente dentro adesso.

## L'ostacolo vero

Perché non si butta giù il nuovo modello, si collega, e si cambia? Perché il sistema è vivo. Ha gente dentro adesso (direttore lavori, progettisti, operativi, ora anche subappaltatori) che apre la piattaforma ogni mattina per lavorare. Non c'è una versione di laboratorio su cui provare, non c'è il permesso di sbagliare, e non c'è una finestra in cui «per un'ora il sistema fa i capricci» sia una frase accettabile.

L'ostacolo vero, quindi, non era modellare le relazioni. Era **come si cambia la serratura senza chiudere la porta**.

La forma che ha retto è un seam: un unico punto di controllo davanti a tutte le domande «può?», con tre implementazioni dietro la stessa interfaccia.

La prima **replica deliberatamente il comportamento vecchio**: guarda il ruolo globale dell'utente e risponde esattamente come avrebbe risposto il codice di ieri, stesse risposte, stessi angoli ciechi, perché in questa fase l'obiettivo è essere identici, non migliori. La seconda **non fa nulla**: serve a misurare cosa succede quando nessuno risponde, e a scoprire quanti punti del sistema chiedano davvero il permesso senza che nessuno lo sappia. La terza è quella **nuova**, che interroga le relazioni.

Un flag decide chi risponde. Girare il flag è una scelta di traffico, non un deploy: reversibile in un istante, che si fa prima per un utente, poi per uno scenario, poi per tutti. Come si tiene aperta una strada mentre se costruisce una parallela l'ho già raccontato parlando di [identità e permessi che devono parlarsi senza invadere il territorio dell'altro](/blog/verificare/openfga/02-openfga-keycloak/); qui il meccanismo è lo stesso, applicato a un sistema che non si può fermare.

Il costo di quella scelta si misura: il motore nuovo sta in **circa ottocento righe**, la replica del comportamento vecchio in **meno di duecento**. Un quinto dello sforzo per non rompere niente mentre il resto cambia, ed è la voce che non entra mai in nessun preventivo, perché non produce niente di visibile.

Questa è la parte che un lettore con lo stesso problema può rubare: **la replica del vecchio è una feature, non un ripiego**. Finché la prima implementazione risponde, il nuovo modello può sbagliare in tutta sicurezza, e sbaglierà, perché nessun modello è uguale al vecchio il primo giorno.

## Nessun record da migrare

Questa sezione, in cronologia, viene molto dopo. Sta qui perché è qui che si capisce.

Chi sente «sostituire l'autorizzazione» immagina subito il lavoro sporco: lo script di migrazione, il backfill, la notte bianca del cutover, il piano di rollback per il caso in cui lo script si fermi a metà. Io me lo immaginavo così, e avevo già cominciato a disegnarlo.

Poi ho smesso, perché cercando i record da migrare ho scoperto che **non esistevano**.

I permessi vecchi non erano dati: erano `if` sparsi nel codice. Alcune decine di punti in cui il sistema chiedeva «che ruolo hai?» e decidendo da solo decideva tutto. Non c'era una tabella dei permessi da portare altrove, perché i permessi non erano mai stati una cosa scritta: erano la forma del codice stesso. Migrarli non era difficile. Non avevano una forma che si possa migrare.

E questo ribalta il problema, nel senso buono. Le relazioni nuove non si trasferiscono: **si sintetizzano** da ciò che il sistema già sa. Chi lavora su quale ordine di lavoro, chi è responsabile di quale cantiere, chi ha toccato per ultimo quale capitolato: quelle informazioni esistevano già, da quindici anni, usate per decine di scopi che non erano i permessi. Bastava leggerle come relazioni.

La differenza fra sintetizzare e migrare sta nel rischio. Un record migrato sbagliato resta scritto: è una verità congelata che nessuno ricalcola, e la scopri quando qualcuno non riesce a lavorare. Una sintesi sbagliata si ricalcola: correggi la regola, e la prossima risposta è giusta. Su un sistema vivo, questa differenza è tutto.

## Il prezzo dell'unione

Il modello nuovo ha una proprietà splendida: tutto è unione. Puoi vedere un cantiere perché sei responsabile, oppure perché lavori a un ordine dentro quel cantiere, oppure perché qualcuno ti ha reso partecipe di un capitolato: la risposta è la somma delle strade che portano a te. Componibile, locale, prevedibile. E finché le domande sono «chi può vedere questo?», l'unione risponde felice.

Poi arriva la prima richiesta del tipo: «questo utente **non** deve».

Il subappaltatore del cantiere 12, appunto, o il suo equivalente del mese successivo. E negare è la cosa che l'unione non sa fare, perché negando rompi la proprietà più bella del modello: che ogni risposta si spiega guardando le relazioni in gioco. Con un'eccezione in mezzo, **non si ragiona più per somma**, e la domanda «perché lui non può?» smette di avere una risposta locale: la risposta vive in una regola speciale, non in una relazione.

È una scelta di forma, non un difetto che si aggiusta con un filtro, e va fatta sapendo quello che si lascia. Delle gerarchie che si complicano e delle query che smettono di risolversi guardando solo il vicinato ho scritto in [gerarchie profonde e query inverse](/blog/verificare/openfga/04-gerarchie-query/); è lo stesso confine, visto dal lato delle prestazioni. Qui il conto si paga in espressività: guadagni un vocabolario che finalmente sa pronunciare la frase del direttore lavori, e perdi la semplicità di un mondo dove tutto era unione.

Lo scrivo perché è il prezzo vero, ed è meglio saperlo prima. Chi vende il modello a relazioni come «stesso servizio, funzioni in più» sta vendendo anche questo, senza dirlo.

## Il flag che non c'è più

Il flag è stato tolto.

È rimasto acceso per un periodo, e non per prudenza generica: serviva a passare avanti e indietro fra le due modalità e guardare se il modello nuovo rompeva qualcosa che prima funzionava. Perché il comportamento vecchio, per quanto limitato, **era corretto e accettato**: la gente ci lavorava e otteneva quello che si aspettava. Un modello nuovo che risponde diversamente non è automaticamente migliore: prima devi dimostrare che le differenze sono quelle che volevi, non quelle che ti sono sfuggite.

Quando le due modalità hanno smesso di divergere su qualcosa che non fosse voluto, la vecchia è stata rimossa. Non c'è stata una data promessa in anticipo: c'è stato un momento in cui non serviva più.

Quello che resta è del codice morto: riferimenti al vecchio modello di ruoli sparsi in una ventina di file, che non decidono più niente e aspettano solo di essere cancellati. È un residuo, non un ripiego: la differenza è che adesso è un elenco, e prima era una ragnatela.

## Chi lavora, adesso, senza chiedere il permesso

Il cambiamento più visibile non riguarda gli utenti della piattaforma: riguarda chi ci lavora sopra.

Prima, toccare i permessi voleva dire passare da chi di dovere **prima** di cominciare: la modifica andava validata in partenza, perché sbagliarla era costoso e nessuno sapeva dire con certezza cosa avrebbe rotto. Adesso uno sviluppatore scrive le regole, scrive i test che le verificano, definisce i criteri con cui giudicare il risultato, e poi porta al referente qualcosa di fatto.

**La revisione ha cambiato oggetto: da un'ipotesi discussa su un foglio bianco a un lavoro che si guarda.** È una differenza che chiunque abbia condotto una riunione di allineamento riconosce.

C'è anche una ragione tecnica sotto, e vale la pena dirla. Le relazioni permettono di scolpire una volta i vincoli più stringenti (quelli che non devono mai cadere) e da lì in poi è difficile sbagliare. Con un ruolo nuovo, invece, molti controlli andavano riscritti da capo: concatenazioni di condizioni booleane, ognuna un'occasione per dimenticarsene una.

## Cosa si può fare adesso che prima non si poteva

Due cose, e la seconda non me l'aspettavo.

La prima è quella per cui il lavoro è nato: si definiscono varianti mirate (questa persona, su questo cantiere, con questo capitolato) che con i ruoli non erano semplicemente scomode da scrivere, erano **non rappresentabili**. Non esisteva una combinazione di ruoli che le esprimesse.

La seconda è arrivata come conseguenza, e vale per un pubblico diverso: **si può ricostruire a posteriori chi vedeva cosa in un dato momento.** Con tre ruoli globali quella domanda non aveva risposta: l'unica ricostruzione possibile era chiedere a qualcuno se si ricordava. Con le relazioni la risposta è un'interrogazione. Nessuno l'aveva chiesta: è quello che succede quando i permessi smettono di essere una proprietà delle persone e diventano fatti registrati.

C'è chi leggerà una migrazione durata così come un lavoro fatto lentamente. Lo capisco, e la mia risposta è che **la lentezza era il metodo, non il sintomo**: il vecchio raggiungibile finché è servito, il nuovo sotto osservazione finché non ha smesso di sorprendere, e il flag in mano a chi risponde dei sistemi vivi. Un seam è un posto dove si abita per un periodo, e poi si smonta.

---

*Il caso è reale, il dominio no: piattaforma di gestione cantieri edili al posto di quello originale, terminologia sostituita per intero. Il direttore lavori è un personaggio composito di richieste arrivate in momenti diversi; tempi e scene sono compressi, e la svolta è raccontata dove diventa comprensibile, non dove è stata capita. Restano fedeli le cose che contano: nessun record è stato migrato, le relazioni nuove si sintetizzano da ciò che il sistema già sa, e il percorso vecchio è stato rimosso solo dopo che le due modalità hanno smesso di divergere.*
