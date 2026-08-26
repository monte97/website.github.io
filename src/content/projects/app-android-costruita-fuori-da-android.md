---
title: "L'app che ho costruito stando fuori da Android"
description: "Venti progetti indipendenti, e la piattaforma che compare in uno solo. Come si rifà lo strumento di un tecnico che lavora su un traliccio, quando il sensore che misura non ce l'hai sulla scrivania."
type: case-study
pillar: progettare
pillarApplied: progettare
featured: false
weight: 7

eyebrow: "Analisi tecnica · strumento di misura per lavoro in campo"
tags: [Architettura, Kotlin, JVM, Testabilità, Seam]

oggetto: >
  Rifare da zero l'applicazione con cui i tecnici allineano le antenne: orientamento,
  inclinazione, posizione, foto, e un rapporto che l'operatore mobile pretende in un
  formato suo. Il sensore che misura dialoga via rete, e sta dal committente.

metodo: >
  Venti progetti indipendenti sulla macchina virtuale Java, ognuno con il proprio ciclo
  di prova, e la piattaforma mobile lasciata fuori dietro interfacce. Un solo modulo la
  dichiara, e la porta nel nome.

esito: >
  La parte che decide, cioe' validazione della qualita' del segnale, calibrazione,
  filtri, generazione del rapporto, si verifica senza telefono e senza sensore. Il
  codice legato alla piattaforma sta in due file su tutto il progetto. Restano scoperte
  l'integrazione dei venti pezzi e la prova contro il sensore vero.

anonimizzazione: >
  Il settore e' quello reale. Non sono nominati il committente, il suo prodotto,
  l'intermediario da cui e' passato il lavoro, e gli operatori mobili citati nei profili
  di configurazione. Il dominio e' rimasto perche' sostituirlo avrebbe reso generica la
  scena da cui il pezzo dipende, e non avrebbe protetto niente che non sia gia' fuori.

sections:
  - n: "01"
    title: "Dieci minuti per salire"
    summary: "Il lavoro vero succede dove non puoi tornare"
  - n: "02"
    title: "Il primo istinto"
    summary: "Si apre l'ambiente mobile e si comincia, ed è difendibile"
  - n: "03"
    title: "Quello che non puoi convocare"
    summary: "Il sensore sta altrove, e con lui ogni verifica completa"
  - n: "04"
    title: "La domanda che ribalta il conto"
    summary: "Non come provare senza hardware, ma quanto hardware serve davvero"
  - n: "05"
    title: "Venti progetti"
    summary: "La forma che esce dalla risposta"
  - n: "06"
    title: "Il modulo che non parla col satellite"
    summary: "La parte che si rompe non è mai quella che immagini"
  - n: "07"
    title: "Il prezzo di venti build"
    summary: "Venti pezzi giusti che insieme possono non funzionare"

readingPaths:
  - label: "La decisione"
    desc: "Sezioni 01-04: perché un'applicazione mobile può quasi tutta non essere codice mobile, e da quale conto discende."
  - label: "La forma e il prezzo"
    desc: "Sezioni 05-07: come sono divisi i venti moduli, dove entra la piattaforma, e cosa costa questa divisione."
readingNote: >
  Chi ha un'applicazione mobile in casa e un ciclo di verifica lento trova il proprio
  problema nella sezione 03, e il conto che lo risolve nella 04.

specs:
  - label: "Moduli autonomi"
    value: "20"
    note: "Ognuno con il proprio file di build, senza un progetto padre che li aggreghi"
  - label: "Moduli che dichiarano la piattaforma"
    value: "0"
    note: "Nessun file di build contiene dipendenze mobili"
  - label: "File che importano la piattaforma"
    value: "2"
    note: "Entrambi nell'unico modulo che la porta nel nome"
  - label: "File di test nei moduli"
    value: "98"
  - label: "Dialogo col sensore"
    value: "Rete, messaggi binari con lunghezza in testa"
    note: "Provato contro un server finto, non contro il sensore"

matrix:
  label: "Dove vive il codice, per cinque moduli su venti"
  columns: ["Logica", "Interfaccia", "Piattaforma"]
  rows:
    - label: "Posizione"
      note: "qualità del segnale, validazione, stati dell'acquisizione"
      cells: [full, partial, empty]
    - label: "Guida acustica"
      note: "zone, soglie, quando emettere il tono"
      cells: [full, full, empty]
    - label: "Persistenza"
      note: "entità, transazioni, cancellazioni a cascata"
      cells: [full, full, empty]
    - label: "Rapporto"
      note: "impaginazione, contenuti, foto"
      cells: [full, full, empty]
    - label: "Lettura codice a barre"
      note: "l'unico che ha bisogno della fotocamera"
      cells: [partial, partial, full]
  legend:
    full: "il modulo lo contiene"
    partial: "in parte"
    empty: "assente"
  caption: "G1 · l'ultima colonna è quasi tutta vuota"
  note: >
    L'unica riga con la terza colonna piena è quella che ha bisogno della fotocamera, e
    quel modulo porta la piattaforma nel proprio nome. È la sola eccezione su venti, ed è
    dichiarata invece che nascosta.

decisions:
  - title: "Dove far vivere il codice"
    chosen: "Venti progetti autonomi sulla macchina virtuale, la piattaforma dietro interfacce"
    chosenWhy: "Il sensore sta dal committente e l'emulatore è lento: ogni verifica che dipende da uno dei due è una verifica che si fa di rado."
    rejected: "Un unico progetto mobile, come si fa quasi sempre"
    appeal: "Un solo file di build, nessuna integrazione da progettare, e la strada che chiunque riconosce."
    why: "Avrebbe legato la verifica di un'addizione alla disponibilità di un telefono e di un sensore."
  - title: "Cosa mettere nel modulo della posizione"
    chosen: "Il campione, la qualità, il validatore, gli stati dell'acquisizione"
    chosenWhy: "La parte che si rompe non è il satellite: è la decisione su quando fidarsi di quello che il satellite ha detto."
    rejected: "Incapsulare l'interfaccia di posizionamento del sistema operativo"
    appeal: "Sembra più completo. Un modulo che si chiama così dovrebbe fornire la posizione."
    why: "Avrebbe portato la piattaforma dentro il modulo più ricco di logica del progetto, che è l'esatto contrario di quello che serviva."
  - title: "Come trattare l'unica dipendenza inevitabile"
    chosen: "Isolarla in un modulo solo, e scriverlo nel nome"
    chosenWhy: "Un'eccezione dichiarata resta una. Chi apre il progetto vede subito dove finisce la parte portabile."
    rejected: "Uniformare tutto dietro la stessa astrazione"
    appeal: "Coerenza formale: venti moduli che si somigliano."
    why: "Un'eccezione nascosta dietro un nome neutro si moltiplica, perché la seconda volta nessuno si accorge di averla aggiunta."
decisionsNote: >
  Le tre decisioni sono la stessa decisione applicata a tre scale diverse: il progetto, il
  modulo più importante, e il caso che non rientra nella regola.

openItems:
  - "L'integrazione dei venti moduli in un'unica applicazione non è raccontata qui, ed è lavoro vero: venti pezzi verificati singolarmente possono non funzionare insieme."
  - "Il dialogo col sensore è provato contro un server finto. Un server finto risponde come lo hai scritto tu, quindi conferma il formato e non il comportamento del sensore vero."
  - "Un modulo su venti dipende dalla piattaforma e non è verificabile fuori da essa. È dichiarato, non risolto."
  - "La divisione riduce il costo di verificare un pezzo e aumenta quello di tenerne allineati venti. Il secondo costo non è stato misurato."

thesis: "Gran parte di quello che sembra codice di piattaforma è aritmetica travestita, e l'aritmetica si verifica senza aprire l'emulatore."

cta:
  title: "Quante volte, questa settimana, avete aspettato un pezzo di hardware per sapere se una cosa funzionava?"
  desc: >
    Se la risposta non è zero, il conto della sezione 04 si può fare sul vostro progetto.
    Serve sapere due cose: quanto dura il ciclo di verifica oggi, e quanta parte del
    codice ha davvero bisogno della piattaforma per essere messa alla prova.
---

## Dieci minuti per salire

Un tecnico sale su un traliccio. Ci mette dieci minuti, e non è tempo che si recupera:
scendere e risalire perché una misura non è stata registrata bene costa mezza mattinata.
Lassù orienta un'antenna, legge l'inclinazione, aspetta che la posizione satellitare sia
abbastanza buona da poter essere scritta in un documento, scatta le foto. La sera consegna
un rapporto a un operatore mobile che quel rapporto lo pretende in un formato suo, diverso
da quello dell'operatore del mese prima.

Lo strumento che regge tutto questo è un'applicazione su un telefono, collegata via rete a
un sensore che fa le misure vere. Andava rifatta.

## Il primo istinto

Si apre l'ambiente di sviluppo mobile, si crea il progetto, si comincia dalla prima
schermata. È quello che fa chiunque, ed è difendibile: l'obiettivo è un'applicazione
mobile, gli strumenti per farla sono quelli, e la prima schermata che compila è un segnale
di avanzamento che si può mostrare a qualcuno.

Ho cominciato a farlo, e per un po' è andata bene.

## Quello che non puoi convocare

Poi arriva il momento in cui devi verificare qualcosa, e ti accorgi che ogni verifica
interessante dipende da due cose che non hai.

Il sensore sta dal committente. Non è un dispositivo che si compra, si mette sulla
scrivania e si accende quando serve: è lo strumento con cui qualcuno lavora, e quando
lavora non è disponibile. Il traliccio, ovviamente, meno che mai.

E l'emulatore, dal canto suo, è lento. Non lento in senso assoluto, lento nel senso che
conta: abbastanza da far sì che un controllo lo lanci alla fine, non mentre scrivi. Un
ciclo di verifica che richiede trenta secondi si esegue dieci volte in un pomeriggio; uno
che ne richiede tre lo esegui trecento.

Sommate, le due cose producono una situazione precisa: **il progetto aveva un ciclo di
verifica che dipendeva da qualcosa che non si poteva convocare.** Non è un problema di
strumenti, ed è per questo che comprare uno strumento migliore non lo risolve.

## La domanda che ribalta il conto

La reazione naturale è chiedersi come si testa senza hardware. È una domanda ragionevole
che porta in un vicolo, perché la risposta è sempre "si simula", e simulare il sensore
sposta il problema senza scioglierlo.

La domanda che scioglie è un'altra, ed è quasi imbarazzante nella sua semplicità:
**quanta parte di questa applicazione ha davvero bisogno della piattaforma?**

La risposta, guardata con onestà, è quasi nessuna.

Il telefono ti dà una posizione. Decidere se quella posizione sia abbastanza buona per
finire in un documento che qualcuno firma è un calcolo su una manciata di numeri. La
calibrazione di un sensore è un'addizione con memoria. Un filtro sul segnale è aritmetica.
Il rapporto finale è un documento costruito a partire da dati che hai già. Le regole di
validazione che cambiano da un operatore all'altro sono un file di configurazione letto e
applicato.

Niente di tutto questo ha bisogno di un telefono per esistere, e niente di tutto questo ha
bisogno di un telefono per essere verificato. Ha bisogno di un telefono solo per essere
*usato*, che è una cosa diversa e succede molto più tardi.

## Venti progetti

Da lì la forma viene da sé. Venti progetti indipendenti, ognuno con il proprio file di
build e il proprio ciclo di prova, e nessun progetto padre che li tenga insieme. Guida
acustica, calibrazione, conversioni fra sistemi di coordinate, persistenza, invio dei
messaggi, esportazione e importazione dei lavori, filtri sul segnale, posizione, misure,
foto, profili di configurazione, rapporto, impostazioni, validazione, collegamento al
sensore.

Nessuno dei venti dichiara la piattaforma mobile nel proprio file di build. In tutto il
progetto, i file che importano qualcosa di specifico della piattaforma sono **due**, ed
entrambi stanno nell'unico modulo che quella dipendenza la porta nel nome.

Il meccanismo che rende possibile la cosa è vecchio e non ha niente di ingegnoso: quello
che la piattaforma fornisce entra da un'interfaccia. C'è chi emette il suono, e c'è chi
decide quando emetterlo, con quale pausa e a quale distanza dal bersaglio. Sono due
responsabilità diverse, vivono in due posti diversi, e solo la prima ha bisogno di un
telefono. La seconda, che è quella dove stanno le decisioni e quindi dove stanno gli
errori, si prova in millisecondi.

## Il modulo che non parla col satellite

C'è un dettaglio che riassume tutto il resto, e la prima volta sembra un errore.

Il modulo che si occupa della posizione non contiene alcuna interfaccia di posizionamento.
Non chiede la posizione al sistema operativo, non parla col satellite, non sa nemmeno da
dove arrivi il dato. Contiene il campione, la lettura, la qualità, il validatore, e la
macchina a stati dell'acquisizione.

Detto altrimenti: contiene tutto quello che serve a rispondere alla domanda *questa
misura è abbastanza buona da poterci scrivere sopra un rapporto?*, e niente di quello che
serve a ottenerla.

Sembra sbagliato finché non ti accorgi che **la parte che si rompe non è mai il
satellite**. Il satellite funziona. Quello che si rompe è la soglia scelta male, lo stato
in cui l'acquisizione resta bloccata perché nessuno ha previsto quella combinazione, la
misura accettata quando andava rifiutata e finita in un documento che qualcuno ha firmato.
Sono tutti errori di logica, e la logica non ha bisogno di un cielo aperto per essere
messa alla prova.

Un modulo che avesse incapsulato l'interfaccia di posizionamento avrebbe portato la
piattaforma dentro il pezzo più denso di decisioni dell'intero progetto. Sarebbe stato il
posto peggiore in cui metterla.

## Il prezzo di venti build

Questa divisione costa, e vale la pena dire quanto prima che sembri gratis.

Venti progetti sono venti file di build da tenere allineati, venti insiemi di dipendenze
che possono divergere, venti versioni che qualcuno deve far combaciare. Ogni volta che una
libreria comune si aggiorna, il lavoro si moltiplica per venti invece che per uno.

E c'è un rischio peggiore del costo, perché il costo almeno si vede. **Venti pezzi
verificati singolarmente possono non funzionare insieme.** La verifica di un modulo dice
che quel modulo si comporta come previsto quando lo interroghi da solo; non dice niente su
cosa succede quando venti moduli si passano dati in un ordine che nessuno ha provato per
intero. L'integrazione resta lavoro vero, e non è raccontata qui perché non è ancora la
parte finita.

Il conto quindi non è "questa divisione è gratis", è: rende quasi gratuita la verifica di
un pezzo, e trasferisce il rischio sull'integrazione. Conviene quando la maggior parte
degli errori sta dentro i pezzi, e non conviene quando sta nelle giunture. Su un
progetto pieno di soglie, calibrazioni, validazioni e formati di rapporto, sta dentro i
pezzi.

## Cosa cambia per chi paga

Il cambiamento che conta non è tecnico e non è nel numero dei moduli.

È che **si può lavorare al progetto senza avere lo strumento**. Chi scrive la logica di
validazione non deve prenotare il sensore, non deve aspettare che un tecnico scenda dal
traliccio, non deve accendere un emulatore per sapere se una soglia è giusta. Un pezzo
del lavoro ha smesso di dipendere dalla disponibilità di qualcosa che non si controlla, ed
è la specie di dipendenza che non compare in nessun preventivo perché non è una voce di
costo: è un'attesa.

E c'è un secondo effetto, che si vede più tardi. Il giorno in cui quella logica dovrà
girare da qualche altra parte, su un'altra piattaforma o dentro un servizio che elabora i
rapporti prima che arrivino all'operatore, la parte da riscrivere sono due file. Non era
l'obiettivo, e prometterlo sarebbe stato disonesto. È quello che succede quando smetti di
scrivere aritmetica dentro un telefono.
