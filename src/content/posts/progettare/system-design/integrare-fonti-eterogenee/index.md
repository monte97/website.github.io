---
title: "Integrare molte sorgenti: cambia il confine, non il modello"
seoTitle: "Integrazione multi-sorgente: il confine e il modello"
date: 2026-09-14T09:00:00.000Z
description: "Quando le sorgenti da integrare diventano molte, cambiano due cose: dove passa il confine fra codice e configurazione, e quale parte del problema diventa quella che fa fallire il progetto."
pillar: progettare
category: system-design
tags:
  - Integrazione
  - Normalizzazione
  - System Design
lang: it
draft: false
reviewed: false
caseStudy:
  slug: un-modello-piu-povero-delle-fonti
  hook: "Il caso da cui parte questo ragionamento."
---

# Integrare molte sorgenti: cambia il confine, non il modello

> Il lavoro di integrare molte sorgenti sta nel decidere cosa significano i dati quando due
> sistemi chiamano la stessa cosa in due modi, non nel leggerli. Con la scala cambia dove
> passa il confine fra codice e configurazione; il criterio sul modello interno resta lo
> stesso.

Ho progettato uno strato di raccolta su un numero ridotto di sorgenti, e ne ho scritto
altrove. Questo testo parte da lì e va dove quel caso non arriva: **cosa cambia davvero
quando le sorgenti diventano molte**, e quale parte del problema resta fuori.

Anticipo la conclusione, perché è la cosa che conta: la quantità non è il problema
interessante. Le cose che cambiano sono due, e solo una è architettura.

## Quello che non cambia, e diventa obbligatorio

Il modello interno deve essere **più povero dell'unione delle fonti**.

Con poche sorgenti si può tollerare qualche campo superfluo, lasciando vuoto ciò che una
fonte non trasmette; il costo emerge dopo mesi, quando a valle compare il primo `if` che
discrimina sulla provenienza.

Con molte questa tolleranza non è praticabile: il modello esteso non supera la fase di
progettazione. Nessuno riesce a governare l'unione di decine di schemi, e chi ci prova
produce un dizionario in cui la maggioranza dei campi è nulla per la maggioranza delle
righe.

Il criterio non dipende dal numero di sorgenti: **il modello contiene quello che serve a
chi consuma, non quello che le fonti offrono.** È una decisione di sottrazione, e va presa
all'inizio perché dopo non si può più prendere: da un modello che contiene tutto non si
toglie niente, perché non sai chi sta leggendo cosa.

## La prima cosa che cambia: dove passa il confine fra codice e configurazione

Su poche sorgenti ho scritto un lettore per sorgente, senza costruire l'adapter generico
guidato da configurazione. È la scelta corretta a quell'ordine di grandezza, e smette di
esserlo più avanti.

La ragione è di **ammortamento**. Un adapter generico è un prodotto: va progettato,
testato, documentato e mantenuto. Su poche sorgenti non si ripaga. Su molte è l'unica
strada praticabile, perché la scrittura manuale di decine di lettori non è sostenibile e la
qualità degrada ben prima di arrivare in fondo.

Ma la forma che prende non è "un file di configurazione gigante", che è il modo in cui
questa idea fallisce di solito: si sposta la complessità dal codice, dove si legge e si
discute in revisione, a un file che dopo sei mesi nessuno sa più toccare.

La forma che funziona sono **pochi tipi di connettore, e una configurazione per sorgente.**

I tipi sono quasi sempre meno di quanti sembrino. Un'API con le sue chiamate e il suo
schema di autenticazione. Un file tabellare pubblicato a un percorso fisso. Un database
interrogabile direttamente. Una coda su cui qualcuno pubblica. Un endpoint che espone un
catalogo da cui si scoprono le risorse. Una pagina da cui estrarre una tabella, che nessuno
ama ma che compare sempre.

Il criterio per contare i tipi è empirico: **si contano le forme di accesso effettivamente
diverse**, non le sorgenti. Il codice sta nel tipo, la differenza sta nel dato. Una sorgente
nuova che parla un protocollo noto è una riga di configurazione; una che parla un protocollo
nuovo è un tipo nuovo, e capita raramente.

## La seconda cosa che cambia, ed è il rovescio di una regola

Nel caso a poche sorgenti una delle proprietà volute era che **chi consuma non sappia da
dove arriva il dato**. Serviva a impedire che il consumatore si accorgesse della differenza
fra i fornitori e ci costruisse sopra un ramo.

Quando le sorgenti sono molte ed esterne, quella regola si rovescia a metà, e la distinzione
è sottile ma decisiva.

La **provenienza diventa un requisito**, non un dettaglio: ogni sorgente ha il suo titolare,
le sue condizioni d'uso, la sua data di aggiornamento. Un dato aggregato che non sa dire da
dove viene è inutilizzabile, sul piano contrattuale prima ancora che su quello tecnico.

Quello che resta da evitare non è sapere la provenienza: è **ramificare** su di essa. La
provenienza è un campo del dato, non un `if` nel consumatore. Detto altrimenti: chi consuma
deve poter **citare** la fonte, non deve poter **comportarsi diversamente** a seconda della
fonte. Nel momento in cui un servizio a valle contiene "se viene dal sistema X allora", la
normalizzazione ha fallito e nessuno se ne accorgerà per mesi.

## Tre problemi ricorrenti, diversi da come vengono percepiti

**Le sorgenti spariscono, e non è un incidente.** Un endpoint che smette di rispondere, un
percorso che cambia, un formato che passa da CSV a JSON senza avviso: con molte sorgenti
esterne rientra nel funzionamento normale. Un sistema che tratta ogni fonte assente come un
guasto genera un rumore di allarmi che in tre settimane nessuno guarda più. La domanda utile
riguarda **da quanto tempo** una fonte non risponde, e se qualcuno se ne è accorto.
L'assenza va misurata, non segnalata.

**La freschezza è per sorgente, non per sistema.** Una fonte aggiornata ogni notte e una
aggiornata una volta l'anno convivono nello stesso modello, e il dato aggregato è vecchio
quanto il suo pezzo più vecchio. Se questa informazione non arriva fino a chi consuma, il
sistema produce con sicurezza una risposta che contiene un valore di tre anni fa.

**Il ritmo lo impongono le sorgenti.** Vale con i fornitori commerciali e vale con i sistemi
di terzi: la cadenza di interrogazione costituisce un vincolo esterno, soggetto a variazioni
senza preavviso. Per questo vive in configurazione, per sorgente, e non nel codice.

## La parte che questo ragionamento non copre

Nel caso a poche sorgenti l'identità era data. Ogni unità aveva un identificativo, tutte le
sorgenti vi facevano riferimento, e mettere insieme i loro dati era un'operazione meccanica.

**Quando le sorgenti sono molte e indipendenti, quasi mai è così. È la parte difficile.**

Lo stesso soggetto scritto in quattro modi. Un sistema che usa un codice normalizzato e un
altro che usa il proprio codice interno. La stessa entità che compare in due cataloghi con
due denominazioni e nessun identificativo in comune. Due indirizzi che sono lo stesso posto.

Questo rientra nella **riconciliazione di identità**, ed è il motivo per cui i progetti di
aggregazione falliscono quando falliscono. Si risolve con chiavi autorevoli dove esistono,
con regole di corrispondenza dove non esistono, e con un posto in cui una persona decide i
casi che le regole non chiudono: la parte che nessuno mette a preventivo e che poi costa più
di tutto il resto.

Non è la parte risolta nel caso che ho raccontato. Dirlo prima è più utile che scoprirlo
insieme dopo la firma.

## Cosa chiederei prima di dare un numero

Se il problema è questo, le domande che cambiano il preventivo di un fattore dieci sono
quattro, e nessuna riguarda la tecnologia.

**Quante forme di accesso diverse, non quante sorgenti.** Cinquanta sorgenti su cinque
protocolli sono un lavoro; cinquanta sorgenti su venti protocolli sono un altro lavoro.

**Esiste una chiave autorevole che le attraversa?** Se sì, la riconciliazione è un problema
tecnico. Se no, è un problema di processo e serve qualcuno che decida.

**Cosa serve davvero a chi consuma?** È la domanda che definisce il modello povero, e
l'unica che stabilisce il perimetro.

**Chi risponde quando una fonte cambia senza avvisare?** È un ruolo, non manutenzione
ordinaria, e se non ha un titolare il sistema si degrada senza segnalazioni.

---

*Questo testo estende un caso reale, di dimensioni ridotte, raccontato altrove in forma
anonimizzata. Le considerazioni sulla scala sono ragionamento di progetto, non misure: dove
parlo di molte sorgenti sto descrivendo una direzione, non un sistema che ho costruito.*
