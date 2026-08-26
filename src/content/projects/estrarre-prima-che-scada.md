---
title: "Estrarre prima che scada"
description: "Quando un abbonamento scade, con lui smettono di funzionare anche le fotografie dei tuoi cantieri. Questo strumento esiste perché quel problema non si scopra al momento sbagliato."
type: case-study
hold:
  reason: >
    Possibile conflitto con i termini di servizio del fornitore. Il pezzo resta in
    lavorazione ma non viene pubblicato finché la questione non è chiarita.
  since: 2026-08-26
pillar: progettare
pillarApplied: progettare
featured: false
weight: 6
eyebrow: "Analisi tecnica · dipendenza da un servizio di terzi"
tags: [Dipendenze, Archiviazione, Dati propri, Web app]
oggetto: >
  Un archivio visivo di cantiere che mette insieme due sorgenti che nessuno teneva
  insieme: le panoramiche prodotte da uno strumento di rilievo, ospiti di un servizio in
  abbonamento, e le fotografie scattate sul posto dalle persone che ci lavorano. Con
  annotazioni, etichette e percorsi di navigazione, e in locale, perché restino
  consultabili anche quando il modello viene disattivato o l'abbonamento scade.
metodo: >
  Le panoramiche si portano fuori dal servizio finché il modello è attivo, attraverso le
  interfacce ufficiali e con credenziali proprie: coda sequenziale riprendibile,
  conversione in immagini equirettangolari, archivio locale di immagini e metadati.
  Le foto di cantiere entrano nello stesso archivio e nella stessa navigazione. Nessun
  aggiramento di limiti o protezioni.
anonimizzazione: >
  Il fornitore del servizio non è nominato per scelta: il soggetto del pezzo è la
  dipendenza da un servizio di terzi, non il caso particolare.
problem: >
  La memoria visiva di un cantiere stava in due posti che non si parlavano: le
  panoramiche dello strumento, dietro un abbonamento che le tiene in vita solo finché
  paghi, e le fotografie fatte a mano dalle persone, sparse fra telefoni e cartelle
  condivise. La prima metà aveva una scadenza, la seconda non aveva un ordine.
context: >
  Le panoramiche erano dati propri ma lontani: per rileggere un ambiente serviva il
  servizio acceso, il modello attivo, l'account valido, e ogni modello dormiente pagava
  affitto. Le foto scattate in cantiere erano vicine ma inutilizzabili: nessuno sapeva a
  quale punto dello spazio appartenessero, e ritrovare quella giusta significava chiedere
  a chi l'aveva fatta.
specs:
  - label: "Perimetro"
    value: "Estrazione e conservazione locale delle panoramiche, con tutto ciò che serve a navegarle"
    note: "Disattivazione e riattivazione dei modelli: fuori perimetro, restano al fornitore"
  - label: "Accesso"
    value: "Interfacce ufficiali del servizio, credenziali proprie, modello ancora attivo"
    note: "Nessun aggiramento di limiti o protezioni"
  - label: "Conservazione"
    value: "Immagini su filesystem, struttura, nomi e annotazioni in un database proprio"
  - label: "Stack"
    value: "Vue 3 · Fastify · PostgreSQL · Docker Compose"
  - label: "Fuori scope"
    value: "Automatizzare il ciclo di vita dei modelli, interpretare i termini di servizio"
decisions:
  - title: "Quando estrarre"
    chosen: "Mentre il modello è attivo, come manutenzione programmata"
    chosenWhy: "Servono tre condizioni insieme (modello attivo, credenziali valide, tempo) e all'ultimo momento ne resta una sola, quella che manca sempre."
    rejected: "All'ultimo momento, appena prima che l'abbonamento scada"
    appeal: "Rimanda il costo e sembra razionale: tanto l'estrazione è questione di ore."
  - title: "La coda"
    chosen: "Un job alla volta, riprendibile: salta gli estratti, ripete solo i falliti"
    chosenWhy: "Un'estrazione lunga verrà interrotta: la coda tratta l'interruzione come condizione normale, non come eccezione."
    rejected: "Un ciclo semplice che riparte da zero quando qualcosa si rompe"
    appeal: "È il codice che scrivi per primo, ed è quello che c'era: poche righe, nessuno stato da tenere."
  - title: "L'annullamento"
    chosen: "Morbido: finisce lo sweep in corso e conserva tutto ciò che è già stato estratto"
    chosenWhy: "Le foto estratte sono il risultato del lavoro, non uno stato intermedio da ripulire."
    rejected: "Annullamento immediato con rollback di quanto fatto"
    appeal: "È il comportamento pulito che ci si aspetta da un job."
  - title: "Il ciclo di vita dei modelli"
    chosen: "Resta sul portale del fornitore: lo strumento estrae e conserva, punto"
    chosenWhy: "Disattivare e riattivare tocca il rapporto commerciale col servizio: è una decisione, non un'automazione."
    rejected: "Chiudere il cerchio automatizzando anche l'archiviazione dei modelli"
    appeal: "Il traguardo naturale, finché ti accorgi che quel pulsante non lo vuoi tuo."
decisionsNote: >
  Il filo: ogni scelta separa ciò che puoi controllare da ciò che dipende dal servizio.
  La coda riprendibile, l'annullamento morbido, l'overlay dei nomi sono tutti modi di
  dire che un'estrazione è finita anche quando qualcosa è andato storto.
beforeAfter:
  label: "Cosa è cambiato, in tre righe"
  rows:
    - label: "La memoria visiva del cantiere"
      before: "In due posti che non si parlano"
      after: "Un archivio solo, con la stessa navigazione per entrambe le sorgenti"
    - label: "Le panoramiche dello strumento"
      before: "Vive finché l'abbonamento è attivo e il modello acceso"
      after: "In locale, consultabili anche dopo"
    - label: "Le fotografie fatte sul posto"
      before: "Sparse fra telefoni e cartelle condivise, senza un ordine"
      after: "Per piano e per stanza, accanto alle panoramiche dello stesso ambiente"
  caption: "il riassunto in tre righe"
  note: >
    La seconda riga è la ragione per cui il lavoro è stato fatto adesso e non fra un anno:
    quel tipo di dipendenza scade, e scade senza preavviso.

flow:
  at: una-coda-che-perdona
  label: "Percorso dell'estratto"
  caption: "Dal modello sul servizio all'archivio navigabile in casa, mentre l'abbonamento è ancora vivo"
  nodes:
    - kind: "Origine"
      name: "Modello attivo sul servizio"
      desc: "Piani, stanze e posizioni delle panoramiche, letti dalle interfacce ufficiali con credenziali proprie."
      edge: "coda"
    - kind: "Coda"
      name: "Job sequenziale riprendibile"
      desc: "Uno sweep alla volta: salta gli estratti, ripete solo i falliti, l'annullamento conserva il percorso fatto."
      edge: "sei facce"
    - kind: "Conversione"
      name: "Immagine equirettangolare"
      desc: "Le facce della vista cubica ricomposte in un unico panorama navigabile a 360 gradi."
      edge: "salvataggio"
    - kind: "Archivio"
      name: "Server e database locali"
      desc: "Filesystem per le immagini, database per struttura, nomi e annotazioni: da qui in poi il servizio non serve più."
      key: true
sections:
  - n: "01"
    title: "L'abbonamento che contiene una memoria"
    summary: "I dati sono tuoi, ma vivono dietro un rinnovo"
  - n: "02"
    title: "Prima, non quando"
    summary: "L'estrazione come manutenzione programmata, non come emergenza"
  - n: "03"
    title: "Una coda che perdona"
    summary: "Ripresa, annullamento morbido, retry mirato: l'interruzione come condizione normale"
  - n: "04"
    title: "Ciò che resta in casa"
    summary: "Galleria, annotazioni e tour che non toccano più il servizio"
  - n: "05"
    title: "Il confine dichiarato"
    summary: "Cosa lo strumento non fa, e cosa va verificato fuori da questo pezzo"
readingPaths:
  - label: "Per decidere"
    desc: "Cosa vale la pena estrarre da un servizio di terzi, quando farlo, e dove finisce il tuo perimetro."
  - label: "Per valutare"
    desc: "Come è fatta l'estrazione: coda riprendibile, conversione e conservazione locale, tour automatici."
readingNote: >
  Il pezzo descrive un uso delle interfacce ufficiali del servizio mentre l'abbonamento
  è attivo. Non interpreta i termini di servizio: quelli vanno verificati caso per caso.
actions:
  - "Estrazione in un click di ogni panoramica di un modello mentre è attivo: le sei facce della vista cubica ricomposte in un'unica immagine equirettangolare salvata sul proprio server"
  - "Coda di lavoro sequenziale e riprendibile: salta ciò che è già stato estratto, ripete solo gli sweep falliti, e l'annullamento conserva quanto già ottenuto"
  - "Progresso in diretta via SSE, con indicatore di copertura per piano fino alla spunta del completamento"
  - "Galleria organizzata per piano e stanza, annotazioni sulle coordinate sferiche, rinomina come overlay non distruttivo con gli originali preservati"
  - "Virtual tour generati automaticamente per piano, con collegamenti calcolati sui vicini più prossimi dalle posizioni reali degli sweep"
result:
  - "Un archivio navigabile che funziona senza alcuna dipendenza dal servizio: galleria, annotazioni, etichette e tour restano in piedi dopo la disattivazione del modello"
  - "La possibilità di disattivare i modelli dormienti per contenere i costi della licenza, mantenendo comunque il record visivo navigabile di ogni spazio rilevato"
  - "Un confine esplicito: lo strumento estrae e conserva; l'archiviazione formale e la riattivazione dei modelli restano sul portale del fornitore"
esito: >
  Le panoramiche dello strumento e le fotografie scattate in cantiere vivono nello stesso
  archivio e nella stessa navigazione, in locale e senza dipendere da un abbonamento
  attivo. Lo strumento è in uso quotidiano, ed è il posto dove quelle
  persone vanno a guardare com'era un ambiente.
openItems:
  - "L'archivio locale vive dove è stato messo: la conservazione nel tempo (copie, supporti, chi se ne occupa) resta una questione aperta che nessuno strumento risolve"
  - "Le fotografie scattate in cantiere vanno collocate nello spazio da qualcuno: il collegamento fra una foto e il punto in cui è stata fatta non è automatico"
  - "Il pezzo non interpreta i termini di servizio del fornitore: vanno letti e valutati caso per caso prima di replicare l'approccio"
cta:
  title: "Le foto dei vostri cantieri, fra sei mesi, dove saranno?"
  desc: >
    Se una metà vive dentro un abbonamento e l'altra nei telefoni di chi c'era, la
    risposta è che una scadrà e l'altra non si troverà. Metterle nello stesso posto,
    finché entrambe esistono, è un lavoro delimitato.
thesis: "Con un servizio di terzi la domanda non è se uscirà di scena, ma cosa vorresti avere in mano quel giorno, e quella risposta si costruisce mentre funziona ancora."
---

## L'abbonamento che contiene una memoria

I rilievi tridimensionali dei cantieri finivano su un servizio in abbonamento: virtual tour navigabili dal browser, un modello per ogni spazio rilevato. Il modello commerciale è semplice, e la licenza è agganciata ai modelli attivi. Quando un cantiere chiude e il modello viene disattivato (o semplicemente l'abbonamento scade) il visualizzatore e l'accesso programmatico smettono di funzionare.

Le fotografie panoramiche non sparivano: restavano dall'altra parte, irraggiungibili. E l'alternativa al perderle era pagare un canone per ogni modello dormiente, all'infinito, solo per continuare a guardare le proprie immagini.

Una memoria visiva ha senso se dura più del progetto che l'ha generata. Altrimenti quello che hai è un servizio, non un archivio, e si paga come tale.

## Prima, non quando

L'estrazione avviene mentre il modello è ancora attivo, attraverso le interfacce ufficiali del servizio e con le credenziali di chi quei modelli li ha creati. Niente scorciatoie, niente aggiramenti: è un uso deliberato della porta giusta, aperta, prima che si chiuda.

Un click lancia un job che attraversa ogni panoramica del modello, ricompone le sei facce della vista cubica in un'unica immagine equirettangolare e la salva sul proprio server. Il progresso arriva in diretta, sweep per sweep; per ogni piano un indicatore di copertura conta gli estratti contro i totali e mostra la spunta quando il piano è completo. È la domanda che conta in questa fase del lavoro: *posso spegnere?*

Perché il fine vero non è il backup. È arrivare al giorno in cui disattivare un modello diventa una decisione economica ordinaria invece di una rinuncia forzata.

## Una coda che perdona

La prima versione del job era semplice: parte, lavora, finisce. Oppure no. In una forma così, un'estrazione completa dipende da tutto ciò che può andare storto in una sequenza lunga di richieste a un servizio remoto, e basta un'interruzione per dover chiedersi cosa era stato fatto e cosa no.

La forma che è rimasta tratta l'interruzione come condizione normale. Un job alla volta, in coda. Alla ripartenza, ogni panoramica già presente nell'archivio viene saltata: il lavoro ricomincia da dove si era fermato, non da zero. Gli sweep falliti vengono registrati con il loro errore, e un nuovo job può riprendere *solo* quelli. L'annullamento è morbido: il job finisce lo sweep in corso e conserva tutto il percorso fatto, le foto estratte sono il risultato, non uno stato intermedio da ripulire.

È la differenza fra un processo che funziona e un processo che si può abbandonare e riprendere: la seconda versione è l'unica che sopravvive alla vita vera di chi la usa.

## Ciò che resta in casa

A estrazione finita, quello che si consulta non tocca più il servizio. La galleria organizza le panoramiche per piano e stanza, con filtri e anteprime a 360 gradi. Piani, stanze e singole posizioni possono essere rinominati con nomi che hanno un significato per chi li usa: come overlay, senza toccare gli originali, che restano lì sotto come fallback. Le annotazioni si piantano sulle coordinate sferiche del panorama, con etichetta e descrizione. E per ogni piano nasce un virtual tour: ogni panorama diventa un nodo, e i collegamenti fra nodi vengono calcolati automaticamente dai vicini più prossimi sulle posizioni reali degli sweep. Si cammina negli ambienti.

Quello che si conserva, insomma, è la possibilità di muoversi in quegli spazi, non una cartella di immagini. Ed è questa la differenza fra possedere i dati e poterglieli usare: la stessa che decide se disattivare un modello è un risparmio o un lutto.

## Il confine dichiarato

Ci sono due cose che questo strumento non fa.

La prima: non tocca il ciclo di vita dei modelli. Disattivazione e riattivazione restano sul portale del fornitore, perché là dentro c'è una relazione commerciale, non un'operazione tecnica. Automatizzare quel pulsante avrebbe chiuso il cerchio, e sarebbe stato un bottone in mano sbagliata.

La seconda: non dice nulla sui termini di servizio. Che cosa sia lecito, per quale piano, con quali limiti d'uso: dipende dal contratto e dal tipo di account, va verificato caso per caso, e questo pezzo non li interpreta. Il perimetro tecnico (porte ufficiali, modello attivo, credenziali proprie) descrive il modo in cui lo strumento è stato costruito, e non sostituisce un parere legale.

Resta infine il costo silenzioso di ogni archivio: mantenerlo. Spazio, backup, longevità dei supporti. La dipendenza dal servizio di terzi non sparisce: si sostituisce con una dipendenza da sé stessi, che almeno si può gestire.

**Con un servizio di terzi, prima o poi esce di scena: la domanda è cosa vorresti avere in mano quel giorno. E quella risposta si costruisce mentre funziona ancora.**

---

*Bozza derivata dal repository dello strumento: README, guida interna e documenti di design sono la fonte di ogni dettaglio citato. Il fornitore del servizio non è nominato per scelta, e il pezzo non interpreta i suoi termini di servizio.*
