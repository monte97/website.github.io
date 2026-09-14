---
title: "Un modello più povero delle fonti"
description: "Progettazione da zero di uno strato di raccolta dati a due fonti. Il modello interno è deliberatamente più povero dell'unione delle sorgenti, e il confine fra codice e configurazione sta dove lo mette l'ammortamento."
type: case-study
pillar: progettare
pillarApplied: progettare
featured: false
weight: 4
eyebrow: "Analisi tecnica · raccolta dati da fornitori esterni"
tags: [Integrazione, Normalizzazione, Sistemi a eventi]
links:
  blog: "/blog/progettare/system-design/cento-sorgenti-opendata/"
thesis: >
  Standardizzare non è mettere insieme ciò che le fonti mandano: è decidere cosa non
  portare. Un modello più povero delle sorgenti rende il numero di sorgenti irrilevante.
oggetto: >
  Uno strato di raccolta dati costruito da zero su due fornitori di localizzazione già
  scelti, con API di forma diversa: uno espone il parco intero in una chiamata, l'altro
  obbliga a chiedere unità per unità.
metodo: >
  Due proprietà dichiarate prima di scrivere una riga, aggiungere una fonte costa un
  pezzo nuovo e nessuna modifica altrove, chi consuma non sa da dove arriva il dato, e
  usate come unico criterio per ogni decisione successiva.
esito: >
  Un modello interno deliberatamente più povero dell'unione delle fonti, un lettore per
  fonte con la propria cadenza in configurazione, un'uscita sola. Il prezzo è dichiarato:
  N lettori da mantenere, un limite di chiamate per fonte, e un modello che dal giorno in
  cui viene trasportato a valle si cambia solo con una migrazione.
anonimizzazione: >
  Committente, settore e fornitori sono omessi. Le due fonti sono reali e la differenza
  fra le loro API è quella descritta; il dominio in cui la storia è ambientata no. Le
  assenze elencate sotto "cosa il sistema non contiene" sono fatti sul risultato, non
  decisioni prese in riunione.
---

# Un modello più povero delle fonti

> I tuoi dati arrivano da fonti che non si sono messe d'accordo, e non lo faranno. Il modello che le riconcilia regge se è più povero di loro. Quante siano le fonti cambia una cosa sola, e non è quella.

Il parco è distribuito su impianti di conferimento, mezzi in transito e piazzali di
sosta. Ogni cassone monta un dispositivo di localizzazione che ne trasmette la posizione, e
i dispositivi provengono da due fornitori distinti, entrambi già sotto contratto quando il
progetto è iniziato.

Il requisito era costruire da zero lo strato di raccolta: leggere entrambe le sorgenti e
consegnare a valle un'unica rappresentazione del parco, non due insiemi da riconciliare
a posteriori.

## Due fornitori, due modelli di accesso diversi

Il primo fornitore espone il parco intero in una chiamata sola: una richiesta, e torna
l'elenco con le posizioni aggiornate.

Il secondo no. Il secondo richiede prima l'elenco delle matricole, poi una chiamata per ciascuna. Il parco intero è altrettante chiamate, che diventano un ritmo da
rispettare: se lo interroghi come vorresti ti chiude fuori.

Nessuno dei due è sbagliato. Il primo ha costruito un prodotto per chi guarda una flotta; il
secondo per chi guarda una singola unità. Risolvono due problemi diversi, li risolvono bene entrambi,
e non si sono mai parlati, non hanno nessun motivo per farlo.

Questa è la situazione di partenza, e non migliora. È il punto: la differenza fra le fonti
costituisce una proprietà permanente del contesto, non una condizione transitoria da
sanare.

## Le due cose che dovevano essere vere alla fine

Prima di scrivere una riga ne abbiamo dichiarate due, e sono servite come unico criterio
per giudicare tutto il resto.

**Aggiungere una fonte deve costare un pezzo nuovo e nessuna modifica altrove.** Non per un terzo fornitore già previsto, che non esisteva, ma perché il costo della terza
fonte si determina al momento della seconda, e in seguito non è più negoziabile.

**Chi consuma non deve sapere da dove arriva il dato.** Il cruscotto, il servizio che calcola
le giacenze, il report mensile: nessuno dei tre deve contenere un ramo che dice "se viene dal
fornitore A". Nel momento in cui quel ramo esiste, si moltiplica.

Sono due frasi banali. Tutto l'interesse sta in cosa si è dovuto rinunciare per tenerle vere.

## L'alternativa praticabile, e perché non regge

Il modo ovvio di riconciliare due fonti è un modello interno che le contiene entrambe. Prendi
i campi del primo, aggiungi quelli del secondo, quelli che una fonte non manda restano vuoti.
È una soluzione praticabile e funzionante.

Funziona il primo giorno. Funziona anche il secondo.

Poi qualcuno a valle si accorge che il campo `ultimoSvuotamento` è pieno solo per metà dei
cassoni, e scrive un `if`. Poi un altro servizio scopre la stessa cosa e scrive lo stesso
`if`, perché non sapeva del primo. Al terzo mese il modello interno non è più un contratto:
è l'unione di tutto ciò che qualcuno, una volta, ha mandato. E la seconda proprietà, quella
per cui chi consuma non deve sapere da dove arriva il dato, è persa senza che nessuno se ne
sia accorto, perché **glielo dice quale campo è pieno**.

È l'alternativa scartata, e vale la pena spiegare perché risulti attraente: non richiede di
scartare nulla. Ogni informazione che una fonte ti dà finisce da qualche parte. Sembra
prudenza.

## Standardizzare è sottrarre

La decisione è stata fare il contrario: **il modello interno è più povero di tutte e due le
fonti.**

Contiene ciò che serve a valle (posizione del cassone, istante della rilevazione,
matricola) e nient'altro. Ciò che una sorgente trasmette in eccesso viene scartato al bordo, deliberatamente.

L'obiezione prevedibile è legittima: stai scartando dati che
il cliente ha pagato. La risposta è che quei dati non sono scartati per sempre, sono
scartati *da questo modello*. Se un giorno servono, si aggiungono a un modello che è ancora
abbastanza piccolo da poter cambiare. Il contrario non è vero: da un modello che contiene
tutto non si toglie più niente, perché non sai chi sta leggendo cosa.

E c'è il punto che tiene insieme le due proprietà dichiarate all'inizio: **il modello resta
povero perché la fonte successiva possa entrare senza allargarlo.** Estensione e
standardizzazione non sono due obiettivi che si bilanciano, sono la stessa decisione guardata
da due lati.

## Dove finisce la conoscenza di una fonte

In un pezzo di codice per fonte, e in nessun altro posto.

Ogni fonte ha il suo lettore, e ogni lettore può adottare la forma che la sorgente impone.
Quello del secondo fornitore fa due giri, prima chiede l'elenco delle matricole, poi le
posizioni una per una, e ha un ritmo diverso dall'altro. Il vincolo è imposto dal fornitore, e il lettore lo assorbe.

Il ritmo, in particolare, non è una decisione di progetto: è un vincolo del fornitore, e
cambia senza preavviso quando cambia il loro contratto. Per questo vive in configurazione e
non nel codice. È la differenza fra "abbiamo scelto di interrogare ogni dodici secondi" e
"ogni dodici secondi è quello che ci lasciano fare oggi".

L'uscita è una sola. Tutti i lettori producono lo stesso oggetto e lo consegnano allo stesso
posto, e da lì in poi il sistema non sa più che i fornitori erano due.

## Cosa il sistema non contiene

Tre cose, e le dico perché la loro assenza è metà del progetto, anche se nessuna delle
tre è stata discussa in riunione. Non è che le abbiamo valutate e scartate: è che a due
fonti non servivano, e il costo di costruirle non si sarebbe ripagato. La differenza fra
queste due frasi conta, e più avanti si vede perché.

**Non c'è un adapter generico guidato da configurazione.** Un pezzo unico che legge un file
di mappature e si adatta a qualunque fonte è la soluzione che sembra più matura. A due
fonti è un prodotto da costruire e mantenere che risolve un problema che non hai: sposta la
complessità dal codice, dove si legge, si testa e si discute in revisione, a un file che
nessuno sa più leggere dopo sei mesi.

**Non c'è una cadenza unica.** Sarebbe più ordinato interrogare tutti allo stesso ritmo.
Ma il ritmo lo impone la fonte, e livellare verso il più lento butta via la freschezza che
l'altro fornitore regala gratis.

**Non c'è un campo `payload` o `extra` nel modello.** È la porta da cui rientra tutto
quello che si è appena finito di tenere fuori: un campo libero dove infilare "il resto"
trasforma il modello povero in un modello ricco con un passaggio in più, e in sei mesi
qualcuno a valle sta leggendo dentro quel campo.

## Il prezzo

Tre, e vanno dichiarati: una progettazione di cui non si espone il costo non è
valutabile.

**Si mantengono N lettori invece di un'integrazione sola.** Due oggi. Ogni fonte nuova è
codice nuovo da scrivere, testare e tenere in vita quando il fornitore cambia qualcosa.

**Ogni fonte porta il suo limite di chiamate**, e quel numero vive in configurazione. Esiste quindi un parametro che può essere impostato in modo errato, e una restrizione
imposta dal fornitore si manifesta in esercizio prima che in un documento.

**Il modello interno è un contratto vero.** Dal giorno in cui viene trasportato a valle,
cambiarlo comporta una migrazione, con tutti i consumatori da coordinare. Si paga qui,
e si paga tutto insieme. Il modo di renderlo sostenibile è tenerlo abbastanza piccolo da non
doverlo cambiare spesso, che è esattamente la stessa decisione di prima, vista dal lato del
costo.

## La linea: a quante fonti questa risposta si rovescia

Qui il pezzo esce dal proprio caso, perché chi legge sta quasi sempre pensando a un numero
più grande di due.

Un lettore per fonte è giusto a due. **Non è giusto a cento.**

La ragione è di ammortamento. L'adapter generico che a due fonti è un
prodotto inutile da mantenere, a molte fonti è l'unica strada praticabile: la scrittura manuale di cento lettori non è sostenibile, e la qualità degrada ben prima
di arrivare in fondo.

Ma la forma che prende non è nemmeno "un file di configurazione gigante", che è il modo in
cui questa idea fallisce di solito. A molte fonti si scrivono **pochi tipi di connettore**,
uno per protocollo e forma di accesso, e per ogni fonte una configurazione. Il codice sta
nel tipo, la differenza sta nel dato. Quanti tipi servano lo dice il campo, non
l'architettura: si contano le forme di accesso davvero diverse, e di solito sono molte meno
delle fonti.

E la cosa che **non** cambia con la scala, anzi si irrigidisce: il modello interno più povero
dell'unione delle fonti. A due sorgenti si può tollerare qualche campo superfluo, e il costo emerge dopo mesi. A cento sorgenti il modello esteso non supera la fase di progettazione: l'unione di cento
schemi non è governabile.

Chi ha letto un articolo dice "un lettore per fonte". Chi l'ha costruito sa dove cade la
linea, e la dichiara.

## Cosa è rimasto in mano al committente

Non un miglioramento, non c'era un prima da migliorare. Un sistema con due proprietà che si
possono verificare senza fidarsi di me.

Aggiungere una fonte è un modulo nuovo e nessuna modifica al resto. La cadenza di ogni
fornitore è configurazione, non codice. Il formato interno è uno solo, e chi consuma non ha
modo di sapere da dove arrivano i dati, nemmeno volendo.

E un conto che arriverà, con un nome scritto sopra: il modello interno. Il giorno in cui
dovrà cambiare sarà una migrazione, e lo sapevamo il primo giorno. Averlo detto allora è la
differenza fra un debito e una sorpresa.

---

*Il committente, il settore e i fornitori sono omessi. Le due fonti sono reali e la
differenza fra le loro API è quella descritta; il dominio in cui la storia è ambientata no.*
