---
title: "Cento sorgenti aperte, un modello solo"
seoTitle: "Aggregare dati aperti: un modello solo"
date: 2026-09-14T09:00:00.000Z
description: "Cosa cambia passando da due fonti a centinaia: dove passa il confine fra codice e configurazione, perché la provenienza diventa un requisito, e qual è la parte che fa fallire questi progetti."
pillar: progettare
category: system-design
tags:
  - Opendata
  - Integrazione
  - Normalizzazione
  - System Design
lang: it
draft: false
reviewed: false
caseStudy:
  slug: un-modello-piu-povero-delle-fonti
  hook: "Il caso a due fonti da cui parte questo ragionamento."
---

# Cento sorgenti aperte, un modello solo

> Chi aggrega dati aperti scopre presto che il lavoro non è leggerli. È decidere cosa
> significano quando due enti chiamano la stessa cosa in due modi, e nessuno dei due
> risponde al telefono.

Ho costruito uno strato di raccolta dati con due fonti, e ne ho scritto altrove. Questo
pezzo parte da lì e va dove quel caso non arriva: **cosa cambia davvero quando le fonti
sono centinaia**, e quale parte del problema resta fuori.

Anticipo la conclusione, perché è la cosa che conta: la quantità non è il problema
interessante. Le cose che cambiano sono due, e solo una è architettura.

## Quello che non cambia, e diventa obbligatorio

Il modello interno deve essere **più povero dell'unione delle fonti**.

A due sorgenti si può tollerare qualche campo superfluo, lasciando vuoto ciò che una fonte
non trasmette; il costo emerge dopo mesi, quando a valle compare il primo `if` che discrimina
sulla provenienza.

A centinaia questa tolleranza non è praticabile: il modello esteso non supera la fase di
progettazione.
nessuno riesce a tenere in testa l'unione di cento schemi, e chi ci prova produce un
dizionario di trecento campi di cui duecento sono nulli per quasi tutte le righe.

Il criterio è lo stesso a due e a cento: **il modello contiene quello che serve a chi
consuma, non quello che le fonti offrono.** È una decisione di sottrazione, e va presa
all'inizio perché dopo non si può più prendere: da un modello che contiene tutto non si
toglie niente, perché non sai chi sta leggendo cosa.

## La prima cosa che cambia: dove passa il confine fra codice e configurazione

A due fonti ho scritto un lettore per fonte, e non ho costruito l'adapter generico guidato
da configurazione. Era la scelta giusta a quel numero, e non lo è al vostro.

La ragione è di **ammortamento**. Un adapter generico è un prodotto: va
progettato, testato, documentato e mantenuto. A due fonti non si ripaga. A cento è l'unica
strada, perché nessuno scrive cento lettori a mano, e la qualità degrada ben prima di arrivare in fondo all'elenco.

Ma la forma che prende non è "un file di configurazione gigante", che è il modo in cui
questa idea fallisce di solito: si sposta la complessità dal codice, dove si legge e si
discute in revisione, a un YAML di duemila righe che dopo sei mesi nessuno sa più toccare.

La forma che funziona sono **pochi tipi di connettore, e una configurazione per sorgente.**

Nel mondo dei dati aperti i tipi sono meno di quanti sembrino. Un catalogo CKAN con la sua
API. Un servizio geografico standard. Un file tabellare pubblicato a un URL fisso. Un
endpoint di interrogazione semantica. Una pagina HTML da cui si estrae una tabella, che
nessuno ama ma che c'è sempre. Cinque o sei famiglie coprono la stragrande maggioranza di un
catalogo nazionale.

Il criterio per contare i tipi è empirico: **si contano le forme di accesso effettivamente
diverse**, non le sorgenti. Il codice sta nel tipo, la differenza sta nel
dato. Una sorgente nuova che parla un protocollo noto è una riga di configurazione; una che
parla un protocollo nuovo è un tipo nuovo, e capita raramente.

## La seconda cosa che cambia, ed è il rovescio di una regola

Nel caso a due fonti una delle due proprietà volute era che **chi consuma non sappia da dove
arriva il dato**. Serviva a impedire che il consumatore si accorgesse della differenza fra i
fornitori e ci costruisse sopra un ramo.

Con i dati aperti quella regola si rovescia a metà, e la distinzione è sottile ma decisiva.

La **provenienza è un requisito**, non un dettaglio: ogni sorgente ha la sua licenza, la sua
attribuzione, la sua data di aggiornamento, e un dato aggregato che non sa dire da dove viene
è inutilizzabile, legalmente prima ancora che tecnicamente.

Resta invece da evitare il **ramificare** su di essa. La
provenienza è un campo del dato, non un `if` nel consumatore. Detto altrimenti: chi consuma
deve poter **citare** la fonte, non deve poter **comportarsi diversamente** a seconda della
fonte. Nel momento in cui un servizio a valle contiene "se viene dal catalogo regionale
allora", la normalizzazione ha fallito e nessuno se ne accorgerà per mesi.

## Tre problemi ricorrenti, diversi da come vengono percepiti

**Le sorgenti spariscono, e non è un incidente.** Un endpoint che smette di rispondere, un
URL che cambia, un formato che passa da CSV a JSON senza avviso: nei dati aperti rientra nel funzionamento normale. Un sistema che tratta ogni fonte assente come un guasto genera
un rumore di allarmi che in tre settimane nessuno guarda più. La domanda utile riguarda **da quanto tempo** una fonte non risponde, e se qualcuno se ne
è accorto. L'assenza va
misurata, non segnalata.

**La freschezza è per sorgente, non per sistema.** Un catalogo aggiornato ogni notte e uno
aggiornato una volta l'anno convivono nello stesso modello, e il dato aggregato è vecchio
quanto il suo pezzo più vecchio. Se questa informazione non arriva fino a chi consuma, il
sistema produce con sicurezza una risposta che ha dentro un numero del 2019.

**Il ritmo lo impongono loro.** Vale con due fornitori commerciali e vale con cento enti: la
cadenza di interrogazione costituisce un vincolo esterno, soggetto a variazioni
senza preavviso. Per questo vive in configurazione, per sorgente, e non nel codice.

## La parte che questo caso non copre

Nel caso a due fonti l'identità era data. Ogni unità aveva una matricola, entrambi i
fornitori parlavano di quella, e mettere insieme i loro dati era un'operazione meccanica.

**Nel vostro problema non è così, e questa è la parte difficile.**

Lo stesso comune scritto in quattro modi. Un ente che usa il codice ISTAT e un altro che usa
il proprio codice interno. La stessa struttura che compare in due cataloghi con due
denominazioni e nessun identificatore in comune. Due indirizzi che sono lo stesso posto.

Questo rientra nella **riconciliazione di identità**,
ed è il motivo per cui i progetti di aggregazione di dati aperti falliscono quando
falliscono. Si risolve con chiavi autorevoli dove esistono, con regole di corrispondenza dove
no, e con un posto dove un umano decide i casi che le regole non chiudono, che è la parte
che nessuno mette a preventivo e che poi costa più di tutto il resto.

Non è la parte che ho risolto nel caso che ho raccontato. Dirlo prima è più utile che
scoprirlo insieme dopo la firma.

## Cosa chiederei prima di dare un numero

Se il problema è questo, le domande che cambiano il preventivo di un fattore dieci sono
quattro, e nessuna riguarda la tecnologia.

**Quante forme di accesso diverse, non quante sorgenti.** Cento sorgenti su cinque protocolli
sono un lavoro; cento sorgenti su quaranta protocolli sono un altro lavoro.

**Esiste una chiave autorevole che le attraversa?** Se sì, la riconciliazione è un problema
tecnico. Se no, è un problema di processo e serve qualcuno che decida.

**Cosa serve davvero a chi consuma?** È la domanda che definisce il modello povero, e
l'unica che dice quanto si può buttare via.

**Chi risponde quando una fonte cambia senza avvisare?** È un ruolo, non manutenzione ordinaria, e se non ha un titolare il sistema si degrada
senza segnalazioni.

---

*Questo pezzo estende un caso reale a due fonti, che ho raccontato altrove in forma
anonimizzata. Le considerazioni sulla scala sono ragionamento di progetto, non misure: dove
parlo di cento sorgenti sto descrivendo una direzione, non un sistema che ho costruito.*
