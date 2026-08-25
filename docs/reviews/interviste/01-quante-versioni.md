# Quante versioni del tuo prodotto stai mantenendo davvero?

> **Questo è il testo integrale dell'articolo**, così com'è oggi sul sito, con dentro
> **5 blocchi da compilare** nel punto esatto in cui la tua risposta andrà a finire.
> Cerca `DA COMPILARE` per saltare da uno all'altro.
>
> Scrivi sulla riga `RISPOSTA:`. Se non hai niente, scrivi `NIENTE` e il blocco sparisce:
> un campo assente batte sempre un campo vago — «miglioramento significativo» fa più
> danno del silenzio.
>
> Il testo intorno ai blocchi è quello reale: se leggendolo vuoi cambiare una frase,
> cambiala direttamente qui.

---


## Il conto che nessuno teneva

La call durò quaranta minuti, e la frase che conta arrivò al trentacinquesimo.

«Il nostro Keycloak ce l'abbiamo già. Gli utenti li gestiamo noi, il vostro sistema deve solo fidarsi.»

Il commerciale rispose come rispondono i commerciali quando la richiesta è ragionevole e il contratto è grosso: «certo, si può fare». Aveva ragione. Si poteva fare, si era già fatto altrove, e la stima buttata lì quel giorno — due giorni-uomo — era anche corretta, per la prima volta.

Mesi dopo mi trovai a fare un conto che nessuno aveva mai fatto: quante versioni diverse di quel prodotto erano vive, in quel momento, presso i clienti che l'avevano comprato.

Non è una domanda con una risposta ovvia, perché le configurazioni non si sommano. Si moltiplicano. Una struttura porta le proprie utenze dal proprio Keycloak, un altro le lascia gestire al prodotto. Un sede ha la rete isolata verso l'esterno, un altro no. Qui i laboratori sono tre sulla stessa installazione, là uno solo. Ogni scelta è indipendente dalle altre, e ogni combinazione è una cosa che deve funzionare.

Nessuna di queste varianti era stata decisa da un architetto. Erano state tutte concesse in trattativa, una alla volta, ognuna in un momento in cui dire di sì costava meno che dire di no.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 3 · DOVE SI VEDEVA IL COSTO
                ════════════════════════════════════════════════

    E' l'«agitate» della struttura PAS, e oggi manca del tutto: il pezzo dice che le
    configurazioni non erano contate, ma non dice cosa costava non contarle.

    Serve un attrito concreto, di quelli che un CTO riconosce nel proprio trimestre:
      · un rilascio richiedeva prove manuali su ambienti che nessuno sapeva elencare
      · un guasto compariva presso un cliente solo e non era riproducibile altrove
      · una persona sapeva «come si fa da quel cliente» e senza di lei ci si fermava
      · nessuno rispondeva in trattativa senza chiedere prima a uno sviluppatore

    Quale era vero da voi? O quale altro?

    RISPOSTA: era tutto vero


                ════════════════════════════════════════════════


## La suite verde che non c'entrava

La prima reazione, quando conti quel numero, è cercare i test.

I test c'erano, ed erano verdi. Migliaia di asserzioni sul prodotto, scritte bene, mantenute nel tempo. Non servivano a niente per questo problema, e ci volle un po' per accettarlo.

Il motivo è che **l'applicazione è la stessa ovunque**. Lo stesso identico codice gira dentro tutte quelle sedi. Non è lì che si rompe qualcosa: si rompe nel modo in cui quel codice viene messo in piedi. Una struttura ruota il certificato di firma del proprio Keycloak e le utenze smettono di arrivare; un altro rinnova la rete e un modulo non raggiunge più il servizio che gli serve. In entrambi i casi la suite del prodotto resta verde, perché il prodotto non ha nulla che non va.

L'oggetto da verificare non era il software. Era **l'installazione**, con la sua configurazione, dentro il suo ambiente.

Questo sposta il problema in un posto scomodo. Un test sul prodotto lo lanci sulla tua macchina. Un test sull'installazione ha bisogno di un'installazione — e le installazioni vivono dentro le sedi dei clienti dove non entri quando ti pare, e in alcuni casi non entri affatto.

## Una fonte, due esecutori

La forma che ha retto è più semplice di quanto sembri.

Un solo file YAML elenca le configurazioni supportate. Non è codice: è un elenco. Per ogni riga, quali moduli ci sono, come arrivano le utenze, cosa deve rispondere e a che livello.

Quel file viene letto da **due esecutori diversi**. Il primo è uno smoke test in shell che non installa niente: serve dove non puoi installare, ambienti chiusi, macchine di qualcun altro, situazioni in cui hai il permesso di guardare e non di toccare. Il secondo è una suite pytest che porta su l'ambiente con Ansible e OpenTofu, da zero, e poi guarda cosa succede.

La parte che conta non è nessuno dei due esecutori: è che **leggono la stessa fonte**. Due elenchi separati, uno per esecutore, sarebbero stati più semplici da scrivere e avrebbero divergito nel giro di qualche mese senza che nessuno se ne accorgesse — perché due elenchi che divergono non producono nessun errore, producono due verdi.

## Il rosso che aveva torto

Poi arrivò il rosso.

Una configurazione falliva. Non a intermittenza, sempre. Passai quaranta minuti sui log a cercare quale pezzo dell'installazione fosse rotto, con quella sensazione crescente che qualcosa non tornasse — perché era una configurazione vecchia, in esercizio da anni, senza una sola segnalazione dal campo.

Alla fine entrai a mano. Aprii il sistema, feci le cose che il controllo diceva di fare, e le vidi funzionare tutte.

L'installazione era sana. **Sbagliava il file che avevo scritto io per dire quando è sana.** Descriveva un esito che quel sistema, in quella configurazione, non produceva e non aveva mai prodotto.

È un momento istruttivo, e non per il bug. Per quaranta minuti avevo dato per scontato che l'oracolo avesse ragione e la realtà torto. È lo stesso riflesso per cui una suite verde rassicura: si finisce per fidarsi dello strumento invece che della cosa che lo strumento dovrebbe misurare. Ci ero già passato con [una suite che mi mentiva sulla propria copertura](/blog/verificare/testing/mutation-testing-oltre-la-coverage/), e non l'avevo riconosciuto.

## La scoperta peggiore

Se un controllo può sbagliare dicendo rosso a un sistema sano, può sbagliare anche nell'altra direzione. Andai a rileggerli tutti.

Uno controllava il flusso di autenticazione OIDC e accettava come successo **qualunque risposta sotto il 500**. Un 401 passava per verde. Un 403 passava per verde. In quella configurazione il controllo aveva risposto verde per mesi senza aver mai verificato un accesso riuscito, e stampava a schermo un esito che non corrispondeva a quello che aveva davvero misurato.

E c'era il secondo pezzo, peggiore del primo perché più banale: **diverse configurazioni avevano la casella dei controlli semplicemente vuota**. Nessun controllo scritto. Nel cruscotto non comparivano come mancanti: non comparivano affatto.

Sommate le due cose, la matrice mostrava una fila di verdi che significavano tre cose diverse — questa funziona, questa non è stata guardata bene, questa non è stata guardata per niente — tutte disegnate uguali.

È la stessa domanda che mi ero già fatto quando i test hanno cominciato a scriverli gli agenti: [chi controlla che funzionino davvero](/blog/verificare/testing/chiudere-il-loop-mutation-testing/)? Qui non li aveva scritti un modello, li avevo scritti io, e il risultato era identico. Un controllo che nessuno verifica è un controllo di cui non sai niente, a prescindere da chi tiene la penna.

## La mappa dei buchi

La riparazione non è stata scrivere i controlli mancanti. È stata **dichiarare cosa significa verde**.

Tre livelli, scritti esplicitamente. *Esiste*: il container è su, la porta risponde. *Risponde*: l'endpoint restituisce qualcosa di sensato. *Funziona davvero*: un login OIDC completo arriva fino al token, con un esito che solo un successo autentico può produrre. Per ogni configurazione si scrive quale livello raggiunge, e le caselle non raggiunte restano bianche.

Il risultato non è un cruscotto tutto verde. È una griglia in cui il bianco si vede, e si vede soprattutto nella terza colonna.

Il prodotto utile di questo lavoro non è la copertura: **è la mappa dei buchi**. Una percentuale sarebbe stata più comoda da mostrare e inutile da usare, perché non dice quale configurazione è scoperta — e le configurazioni non sono intercambiabili. Sapere che sei coperto al settanta per cento non serve a nessuno se il trenta scoperto è quello del cliente più grosso.

## Il conto torna al commerciale

A questo punto la matrice ha smesso di essere un documento tecnico.

Ogni riga è una configurazione che qualcuno deve tenere viva: quando esce una versione va provata su quella riga, quando cambia una dipendenza va ricontrollata su quella riga, e quando il cliente rinnova qualcosa dalla sua parte è su quella riga che si rompe. Ha un costo mensile, e quel costo esisteva già da anni. Semplicemente non era scritto da nessuna parte, e quello che non è scritto non entra in nessun preventivo.

**La matrice è il listino vero.** Non quello dei moduli: quello delle combinazioni.

E cambia la domanda che si fa al tavolo della trattativa. Non più «si può fare?», che ha quasi sempre risposta sì. Ma: *quale riga stiamo aggiungendo, e chi la mantiene?*

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 4 · CHI STA MEGLIO, E COME SI VEDE
                ════════════════════════════════════════════════

    Il risultato e' raccontato solo da te. Serve un fatto osservabile: qualcosa che
    un estraneo avrebbe potuto vedere entrando in azienda.

    Del tipo: chi apre quel file, quando, al posto di cosa faceva prima. Chi non
    viene piu' interrotto. Cosa si guarda in riunione che prima non esisteva.

    La precisione qui e' il sostituto del numero: «il commerciale apre la matrice
    prima di rispondere» vale piu' di «il processo e' migliorato».

    RISPOSTA: È diventato molto più facile gestire il prodotto, anche perché tutte le volte non dovevamo ricordarci se era un caso nuovo o un caso vecchio sapevamo molto meglio come intervenire il tema aveva molta più confidenza e anche persone con una signore di più bassa erano in grado di gestire la configura le varie configurazioni e le varie installazioni, perché era tutto documentato e standardizzato è stato rivisto anche il processo con cui queste modifiche venivano costruite anziché dire sì in modo, cioè coatto si vedeva di fare ricadere la necessità del cliente in qualcosa che in una qualche misura esisteva già o adattandolo al all'esistente per minimizzare le effettive customizzazioni


                ════════════════════════════════════════════════


## La riga che non abbiamo aggiunto

L'ultima richiesta arrivò quando la matrice esisteva già.

Era ragionevole quanto le altre, tecnicamente fattibile in pochi giorni, e chiedeva una combinazione nuova che nessun'altra installazione aveva. Con la griglia sul tavolo, però, la conversazione fu diversa: non si discusse se si potesse fare, ma quanto sarebbe costato tenerla in piedi per la durata del contratto, e chi l'avrebbe provata a ogni rilascio.

La risposta al cliente non fu no. Fu che quella combinazione si poteva avere accostandola a una riga che esisteva già, rinunciando a un dettaglio che nella pratica non gli cambiava la giornata. Il cliente accettò senza pensarci troppo: era un dettaglio, per l'appunto. Nessuno l'aveva mai potuto proporre prima, perché prima nessuno sapeva che l'alternativa costava una riga in più per sempre.

**La flessibilità che vendi in trattativa non è una feature: è una riga di manutenzione che qualcuno pagherà ogni mese — e finché non la scrivi da qualche parte, quel qualcuno non lo sa nessuno.**

---

*Il caso è reale, il settore no: dominio, ruoli e terminologia sono stati sostituiti. Tempi e scene sono compressi, e le configurazioni mostrate nella figura sono inventate. Restano fedeli l'esistenza di una fonte dichiarativa unica letta da due esecutori diversi, le configurazioni prive di controlli che passavano lo stesso, e il controllo che accettava risposte di errore come successo dichiarando un esito che non corrispondeva.*

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 2 · DIMENSIONE DEL TEAM
                ════════════════════════════════════════════════

    Serve un descrittore che renda la storia riconoscibile: la ricerca
    sull'anonimizzazione dice che sostituire il nome con la dimensione e' cio' che
    permette al lettore di capire se somiglia a lui.

    Basta un ordine di grandezza: «una decina di sviluppatori», «una trentina».
    Andra' inserito qui sopra, nel primo paragrafo.

    RISPOSTA: era un contesto misto perché avevamo una decina di sviluppatori tra tutto che però non seguivano in maniera esclusiva il prodotto oltre alle figure degli sviluppatori c'erano poi delle figure volte alla stoni e del prodotto, visto che comunque era un prodotto in un qualche modo estremamente configurabile avevamo poi delle figure specifiche che hanno lo scopo di preparare l'ambiente per il cliente e queste figure non hanno una competenza informatica specifica ma non background molto variegato di quello di sviluppat quindi tutte le modifiche e gli adattamenti dovevano venire incontro anche loro perché spesso si trovavano di fronte a degli errori che non erano in grado di comprendere appieno


                ════════════════════════════════════════════════

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 1 · LA FRASE DEL CLIENTE
                ════════════════════════════════════════════════

    IL BLOCCO PIU' IMPORTANTE. Sostituisce da solo tutte le metriche: il case study
    di Dropbox non ha un solo numero e regge su una frase del cliente.

    Serve una frase detta da qualcuno del cliente sul lavoro fatto. Anche breve,
    anche tiepida, anche presa da una chat. Meglio se detta da chi decide.

    Andra' qui, come citazione in evidenza, appena prima della tesi finale.

    CHI L'HA DETTA (ruolo, non nome):

    RISPOSTA: qui più che dal cliente la frase viene quasi dall'interno nel senso il cliente è il mio cliente non il cliente finale per il cliente finale è andato tutto bene perché tanto il software andava buona notte limite aveva poteva avere un periodo di setup iniziale più breve, però, nel nella somma complessiva di tutto quello che comporta l'adozione di quel prodotto non era rilevante un giorno in +1 giorno in meno qui il grosso è stato migliorare la vita degli di sviluppatori comunque dell'azienda che vende il prodotto durante le discussioni le revisioni con il resto del tema al tavolo spesso fuori che era complicato installare e configurare c'era poca confidenza perché sembrava che un'installazione per un nuovo cliente, fosse un progetto a sestante anziché dovere, semplicemente da un comando piuttosto che eseguire un'applicativo, come ci si aspetterebbe


                ════════════════════════════════════════════════

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 5 · IL MOMENTO IN CUI FA MALE  →  riscrive la CTA
                ════════════════════════════════════════════════

    Konrath: un problema tollerato per anni diventa urgente solo quando succede
    qualcosa. Per chi vende software installato la ricerca indica un momento su
    tutti: la migrazione di piattaforma o l'aggiornamento di versione maggiore,
    perche' e' li' che ogni configurazione va riverificata una per una.

    Nel progetto vero c'era una di queste cose all'orizzonte?
      · una migrazione di piattaforma o un cambio di stack
      · un aggiornamento di versione maggiore
      · un cliente nuovo piu' grosso degli altri
      · l'uscita di una persona che sapeva le cose a memoria
      · un rilascio andato male

    Questo blocco non entra nel corpo: riscrive il campo `cta` nel frontmatter.

    RISPOSTA: qui in particolare, sta fatto una volta una brutta figura con un cliente, perché il processo di installazione non era ben verificato ci sono stati diversi rimpalli avanti e indietro per richiedere verifiche di volta in volta ha portato lì molto tempo ma più che altro la faccia dell'azienda che avendo il prodotto


                ════════════════════════════════════════════════
