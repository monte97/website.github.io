---
title: "Software per chi non apre il terminale"
description: "L'algoritmo era la parte facile. A tenere in piedi la consegna hanno pensato SmartScreen, una casella in fondo a una schermata di installazione e una libreria da compilare: tutto ciò che sta fra il doppio click e il primo file ridotto."
type: case-study
pillar: progettare
pillarApplied: progettare
featured: false
weight: 5
eyebrow: "Analisi tecnica · la consegna come problema di progettazione"
tags: [Distribuzione, Utenti non tecnici, Windows, Python]
oggetto: >
  Uno strumento desktop per ridurre le nuvole di punti prodotte dagli scanner laser 3D: file E57 che arrivano alle decine di gigabyte, destinato a professionisti del rilievo
  che usano bene i software di settore ma non apriranno mai un terminale.
metodo: >
  Un solo punto d'ingresso: un launcher che al primo doppio click cerca Python, installa
  le dipendenze in un ambiente confinato nella cartella del programma e apre la
  interfaccia grafica, senza passaggi manuali. Parametri tecnici tradotti in scelte di
  dominio; gli avvisi di Windows documentati come parte del percorso d'uso.
anonimizzazione: >
  Non c'è nulla da anonimizzare: lo strumento nasce come progetto personale, senza
  committenti. Nessun nome è stato omesso perché nessun nome compare nelle fonti; i
  prodotti terzi citati (scanner e software di visualizzazione) sono quelli che la
  documentazione originale indica come compatibili.
problem: >
  Sulla macchina di chi ha scritto il programma funzionava già tutto. Sul computer
  dell'utente non c'era né Python né il suo PATH, il sistema operativo trattava il
  launcher come una minaccia, e ogni errore reale arrivava in una lingua che il
  destinatario non parla.
context: >
  Chi fa rilievo laser lavora ogni giorno con nuvole di punti pesanti, da aprire in
  CloudCompare, QGIS o ReCap: altissima competenza di dominio, competenza di sistema
  irrilevante per il mestiere. Fra il download e il primo risultato il programma deve
  attraversare un territorio che non si controlla: installer, antivirus, permessi,
  dipendenze da compilare.
specs:
  - label: "Perimetro"
    value: "Tutto ciò che sta fra il download e la prima elaborazione riuscita"
    note: "L'algoritmo di riduzione era la parte facile"
  - label: "Punto d'ingresso"
    value: "Un unico file: il launcher aperto con un doppio click"
    note: "Trova Python, installa le dipendenze, avvia l'interfaccia"
  - label: "Interfaccia"
    value: "Quattro livelli di dettaglio descritti dal risultato nel dominio del rilievo"
    note: "Dettagli fini · edifici · misure generali · volumetrie"
  - label: "Sicurezza percepita"
    value: "Avvisi di Windows documentati uno per uno, con il modo di verificare il contenuto dello script"
  - label: "Fuori scope"
    value: "Firma digitale del launcher, installer nativo, versioni per altri sistemi operativi"
decisions:
  - title: "Come scegliere il dettaglio"
    chosen: "Quattro livelli descritti dal risultato: modanature, sezioni misurabili, ingombri"
    chosenWhy: "Quattro livelli con un nome comprensibile coprono il caso normale; il parametro numerico resta disponibile in una modalità a parte per chi sa cosa chiedere."
    rejected: "Esporre solo il parametro tecnico, voxel in metri, come nella riga di comando"
    appeal: "Era già pronto, preciso, e per chi ha scritto il programma è il linguaggio naturale."
  - title: "Il terminale"
    chosen: "Nascosto nell'avvio normale, riaperto con i log quando qualcosa fallisce"
    chosenWhy: "La finestra nera non aggiunge nulla a un avvio riuscito, e diventa l'unica cosa leggibile quando l'avvio fallisce."
    rejected: "Console sempre visibile, davanti all'utente"
    appeal: "Debug immediato e sensazione di trasparenza, per chi ha passato la vita nel terminale."
  - title: "Gli avvisi di Windows"
    chosen: "Documentarli uno per uno e insegnare a verificare il contenuto dello script"
    chosenWhy: "L'utente non li eviterà comunque: l'unica variabile è se sa cosa sta succedendo."
    rejected: "Evitarli alla fonte, firmando digitalmente il launcher"
    appeal: "Nessuna schermata blu, nessuna spiegazione da scrivere."
decisionsNote: >
  Il filo che tiene insieme i tre bivi è lo stesso: ogni scelta sposta conoscenza dal
  lato dell'utente a quello del prodotto: prima che l'attrite arrivi, non mentre lo
  sta attraversando.
beforeAfter:
  label: "Il primo incontro col programma"
  beforeLabel: "Prima"
  afterLabel: "Dopo"
  rows:
    - label: "L'avvio"
      before: "Una schermata blu che dice che Windows ha protetto il PC"
      after: "L'avviso c'è ancora, ma la documentazione lo precede invece di inseguirlo"
    - label: "Le dipendenze"
      before: "Una casella in fondo a una schermata di installazione, che nessuno spunta"
      after: "Se ne occupa il launcher, e quando non ce la fa lo dice in italiano"
    - label: "Le opzioni di elaborazione"
      before: "Parametri numerici, da capire prima di poter scegliere"
      after: "Quattro livelli descritti dal risultato: modanature, sezioni misurabili, ingombri"
    - label: "La finestra nera"
      before: "Resta aperta sotto il programma per tutto il tempo"
      after: "Non compare, e riappare solo quando c'è un errore da leggere"
  caption: "il riassunto in quattro righe"
  note: >
    Nessuna delle quattro righe riguarda l'algoritmo, che era la parte già finita quando è
    cominciato il lavoro raccontato qui.

inventory:
  at: cosa-resta-aperto
  label: "Gli attriti fra il download e la prima elaborazione"
  items:
    - name: "avviso del sistema al primo avvio"
      mark: true
    - name: "blocco di alcuni antivirus"
      mark: true
    - name: "interprete assente sul computer"
    - name: "la casella del percorso non spuntata"
    - name: "librerie da compilare durante l'installazione"
    - name: "la finestra nera che resta aperta"
    - name: "parametri numerici da capire prima di scegliere"
    - name: "errori in una lingua che l'utente non parla"
    - name: "file oltre i 30 GB"
      mark: true
  legend:
    plain: "attriti incontrati nel percorso"
    mark: "non eliminati, e dichiarati"
  caption: "cosa è stato tolto, e cosa resta"
  note: >
    I tre marcati non si risolvono con il codice: due dipendono da una firma digitale che
    non c'è, il terzo dalla memoria della macchina. Restano scritti accanto alla strada
    scelta invece che scoperti dall'utente.
flow:
  at: il-terminale-che-non-si-vede
  label: "Il primo avvio"
  caption: "Dal doppio click alla finestra del programma, tutto ciò che l'utente non deve vedere"
  nodes:
    - kind: "Ingresso"
      name: "Doppio click sul launcher"
      desc: "L'unico gesto richiesto. Il file è testo leggibile, verificabile col Blocco Note."
      edge: "cerca"
    - kind: "Ricerca ambiente"
      name: "Python 3.10-3.12"
      desc: "PATH, alias alternativo, percorsi tipici delle installazioni Windows; se non trova nulla, istruzioni numerate per installarlo."
      edge: "solo la prima volta"
    - kind: "Installazione"
      name: "Ambiente virtuale nella cartella"
      desc: "Le librerie vivono dentro la cartella del programma e non toccano il resto del sistema: cancellarla disinstalla tutto."
      key: true
      edge: "avvia"
    - kind: "Interfaccia"
      name: "GUI senza terminale"
      desc: "Avvio silenzioso; se fallisce, il programma riparte mostrando l'errore e la finestra resta aperta finché non viene letto."
sections:
  - n: "01"
    title: "La parte che non si vede"
    summary: "Fra il software che funziona e quello che si usa c'è un intero territorio"
  - n: "02"
    title: "Il sistema operativo non ti conosce"
    summary: "SmartScreen, antivirus, permessi: il primo incontro è un avviso"
  - n: "03"
    title: "La casella a metà schermo"
    summary: "Installare Python è il muro più alto del percorso"
  - n: "04"
    title: "Tradurre i parametri in domande"
    summary: "Il voxel diventa «rilievo architettonico»"
  - n: "05"
    title: "Il terminale che non si vede"
    summary: "Nascosto quando tutto va bene, riaperto coi log quando va male"
  - n: "06"
    title: "Cosa resta aperto"
    summary: "I compromessi dichiarati della strada scelta"
readingPaths:
  - label: "Per decidere"
    desc: "Dove finisce il software e comincia la consegna: avvisi di sistema, dipendenze da installare, parametri da tradurre."
  - label: "Per valutare"
    desc: "Le scelte concrete: un launcher che fa tutto, livelli nominati dal risultato, errori resi leggibili."
readingNote: >
  Gli attriti raccontati sono quelli documentati nella guida dello strumento: ogni voce
  del troubleshooting corrisponde a un punto in cui il percorso verso il primo risultato
  può fermarsi.
actions:
  - "Un solo punto d'ingresso: il launcher cerca Python in tre modi diversi, crea l'ambiente virtuale dentro la cartella del programma, installa le dipendenze e apre l'interfaccia"
  - "Avvio senza finestra di terminale, con fallback che riapre il programma mostrando l'errore e resta aperto finché non viene letto"
  - "Parametri della riga di comando tradotti in quattro livelli di dettaglio descritti da ciò che producono nelle sezioni del rilievo"
  - "Stima della dimensione dell'output prima dell'elaborazione, barra di avanzamento e log leggibile durante"
  - "Documentazione dedicata agli attriti reali del primo avvio: SmartScreen, UAC, antivirus, casella PATH, strumenti di compilazione mancanti"
result:
  - "Un programma che si installa con un doppio click, senza passaggi manuali, e si rimuove cancellando una cartella: fuori dalla propria cartella non tocca nulla"
  - "Un'interfaccia che parla la lingua del rilievo, stima il risultato prima di partire e dichiara ad alta voce che il file originale non viene mai modificato"
  - "Una documentazione che tratta gli attriti del primo avvio come parte del prodotto: ogni avviso ha la sua spiegazione e la sua via d'uscita"
openItems:
  - "Il launcher resta senza firma digitale: ogni nuovo computer e ogni nuovo download rivede la schermata di SmartScreen, e la mitigazione è una pagina di documentazione, non una soluzione"
  - "Nel caso peggiore dell'installazione l'utente vede comunque il messaggio di Visual C++ prima che la guida prenda il sopravvento"
  - "Alcuni antivirus bloccano il primo avvio: la soluzione suggerita (eccezione o sospensione temporanea) è un compromesso dichiarato, non una correzione"
  - "I file oltre i 30 GB richiedono macchine con almeno 32 GB di RAM: il programma non copre esattamente la fascia in cui il problema di partenza è più grosso"
thesis: "Un software è consegnato quando attraversa il computer di qualcun altro senza chiedergli di diventare tecnico, non quando funziona sulla tua macchina."
---

## La parte che non si vede

Il programma in sé non è complicato. Legge un file E57: la nuvola di punti che esce da uno scanner laser, a volte decine di gigabyte. Divide lo spazio in cubetti di pochi millimetri e tiene un punto per cubetto. Poi scrive un file più leggero, nello stesso formato o in LAS/LAZ, senza toccare l'originale. La logica sta in un modulo, e la tecnica è descritta ovunque.

Il resto del progetto è tutto ciò che sta prima e dopo quella funzione: far sì che il programma arrivi sul computer di chi fa rilievi per mestiere e produca un risultato al primo tentativo. Su una macchina dove Python non c'è, il PATH è una parola senza significato, e il sistema operativo stesso tratta il launcher come una possibile minaccia.

Chi usa questo strumento passa la giornata fra CloudCompare, QGIS e i software del proprio mestiere: sa riconoscere una sezione sbagliata a colpo d'occhio, non sa (e non deve sapere) cosa significa «aggiungere Python al PATH». La differenza fra il software che funziona e quello che si usa abita tutta lì.

## Il sistema operativo non ti conosce

Il primo incontro con il programma è una schermata blu di SmartScreen che dice che Windows ha protetto il PC. Poi magari un antivirus che blocca il download delle librerie. Poi la richiesta dei permessi di amministratore.

Nessuno di questi avvisi si toglie con la buona volontà: il launcher è un file `.bat` scaricato da internet, senza firma digitale, ed è trattato di conseguenza. La scelta è stata dichiarare il problema dentro il prodotto: la documentazione dedica una sezione a ogni avviso, dice che sono normali, mostra cosa cliccare, e offre qualcosa di più raro, un modo per verificare da soli che non c'è niente di losco. Il launcher è un file di testo: tasto destro, Modifica, e si legge tutto quello che fa. Le librerie che scarica sono open source, pubblicate su PyPI, usate da migliaia di professionisti del settore.

È l'unica strada rimasta quando non hai un marchio che risponde per te.

## La casella a metà schermo

Poi c'è l'installazione di Python, che nella testa di chi scrive software è un dettaglio e nella pratica è il muro più alto del percorso.

L'installer ufficiale ha una casella, in basso: «Add Python to PATH». Se resta vuota (e resta vuota, sta in basso e nessuno te lo dice) il programma non troverà mai l'interprete. La guida non si fida: mette la casella in grassetto, spiega cosa succede se la salti, e arriva a dire di disinstallare e reinstallare se l'hai già fatta senza. Chiede anche di riavviare il computer, e dice perché.

Il launcher intanto fa la sua parte: cerca `python`, poi `python3`, poi i percorsi tipici delle installazioni Windows, versione dopo versione. Solo quando non trova nulla si arrende, e invece di un messaggio d'errore mostra le istruzioni numerate per installarlo.

Resta il caso peggiore: una delle librerie ha componenti in C++ che vengono compilati durante l'installazione, e se sulla macchina non ci sono gli strumenti giusti l'errore arriva in inglese e parla di compilatori. Per chi fa rilievi è rumore. La documentazione lo traduce: quel messaggio significa scaricare certi Build Tools, selezionare una voce precisa durante l'installazione, riprovare.

## Tradurre i parametri in domande

La riga di comando espone il programma com'è dentro: voxel in metri, frazione di punti da mantenere, quantizzazione delle coordinate. È esattamente ciò che serve a chi l'ha scritto, ed è inutilizzabile da chi no.

L'interfaccia grafica fa la stessa domanda in un'altra lingua. Quattro opzioni, ognuna descritta dal risultato nel dominio: dettagli architettonici fini; rilievo architettonico, consigliato per edifici, con sezioni pulite e spessori misurabili; dimensioni generali; solo volumetrie e ingombri. Il millimetro c'è ancora, ma tra parentesi: la scelta si fa su quello che resterà a vedere nelle sezioni, non sull'unità di misura.

Intorno ai quattro livelli ci sono le piccole cose che tolgono paura: la stima della dimensione del risultato prima di lanciare l'elaborazione, la barra di avanzamento con un log leggibile durante, e ripetuto dovunque (fino alla nota tecnica) che il file originale non viene mai modificato né cancellato. Chi consegna una nuvola di punti consegna lavoro fatto sul campo: «non tocca l'originale» è la condizione perché il programma venga aperto.

## Il terminale che non si vede

Quando tutto è installato, il launcher avvia l'interfaccia con l'eseguibile pensato per le applicazioni grafiche: nessuna finestra nera che resta aperta sotto il programma. Ma l'avvio silenzioso ha un costo noto: se qualcosa fallisce, fallisce senza dire nulla, la finestra si apre e si chiude subito, e sembra un programma rotto.

La soluzione sta nel launcher: se l'avvio silenzioso non va a buon fine, il programma riparte nella variante che mostra gli errori, e la console resta aperta finché qualcuno non ha letto. E il caso limite (capire perché non parte) ha una sezione dedicata nella guida: apri il prompt dei comandi, lancia il file a mano, leggi il messaggio prima che sparisca.

È la regola generale del progetto in miniatura: il terminale si nasconde quando non aggiunge niente, e riappare nell'unico momento in cui è l'unica cosa che conta.

## Cosa resta aperto

Gli attriti non eliminati restano dichiarati. Senza firma digitale, ogni nuovo computer e ogni nuovo download rivede SmartScreen: la mitigazione è una pagina di documentazione, non una soluzione. Alcuni antivirus bloccano comunque il primo avvio, e la guida suggerisce un'eccezione o una sospensione temporanea: un compromesso detto ad alta voce. Nel caso peggiore dell'installazione, l'utente incontra comunque il messaggio di Microsoft prima che la guida prenda il sopravvento. E i file più grossi chiedono macchine con tanta memoria: il programma non gira esattamente dove il problema di partenza è più grande.

Sono i costi della strada scelta, scritti accanto alla strada.

**Un software è consegnato quando attraversa il computer di qualcun altro senza chiedergli di diventare tecnico, non quando funziona sulla tua macchina.**

---

*Bozza derivata dal repository dello strumento: launcher, interfaccia e guide sono la fonte di ogni dettaglio citato, e ogni voce della guida corrisponde a un punto documentato del percorso. I prodotti terzi menzionati (scanner e software di visualizzazione) compaiono come nella documentazione originale, cioè come formati e strumenti compatibili.*
