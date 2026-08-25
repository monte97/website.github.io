# Software per chi non apre il terminale

> **Bozza scritta da un agente**, non da te. Questa intervista non chiede la prova
> sociale come le altre: chiede **se quello che c'è scritto è vero**.
>
> 5 blocchi da compilare. Cerca `DA COMPILARE`. Scrivi sulla riga `RISPOSTA:`.
> Se un episodio è inventato, dillo: si toglie. Non c'è niente da salvare in una scena
> che non è successa.
>
> Il testo qui sotto è quello che l'agente ha prodotto, integrale.

---


## La parte che non si vede

Il programma in sé non è complicato. Legge un file E57 — la nuvola di punti che esce da uno scanner laser, a volte decine di gigabyte — divide lo spazio in cubetti di pochi millimetri e tiene un punto per cubetto. Poi scrive un file più leggero, nello stesso formato o in LAS/LAZ, senza toccare l'originale. La logica sta in un modulo, e la tecnica è descritta ovunque.

Il resto del progetto è tutto ciò che sta prima e dopo quella funzione: far sì che il programma arrivi sul computer di chi fa rilievi per mestiere e produca un risultato al primo tentativo. Su una macchina dove Python non c'è, il PATH è una parola senza significato, e il sistema operativo stesso tratta il launcher come una possibile minaccia.

Chi usa questo strumento passa la giornata fra CloudCompare, QGIS e i software del proprio mestiere: sa riconoscere una sezione sbagliata a colpo d'occhio, non sa — e non deve sapere — cosa significa «aggiungere Python al PATH». La differenza fra il software che funziona e quello che si usa abita tutta lì.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 3 · CHI ERA DAVVERO DALL'ALTRA PARTE
                ════════════════════════════════════════════════

    Il pezzo parla di «chi non aprira' mai un terminale» in astratto. Serve sapere
    chi era davvero:
      · una persona sola o un gruppo?
      · che mestiere fa?
      · qual e' stato l'attrito piu' stupido e piu' vero che ha incontrato?

    Un dettaglio concreto qui vale piu' di tre paragrafi di teoria.

    RISPOSTA:


                ════════════════════════════════════════════════


## Il sistema operativo non ti conosce

Il primo incontro con il programma non è la sua interfaccia: è una schermata blu di SmartScreen che dice che Windows ha protetto il PC. Poi magari un antivirus che blocca il download delle librerie. Poi la richiesta dei permessi di amministratore.

Nessuno di questi avvisi si toglie con la buona volontà: il launcher è un file `.bat` scaricato da internet, senza firma digitale, ed è trattato di conseguenza. La scelta è stata dichiarare il problema dentro il prodotto: la documentazione dedica una sezione a ogni avviso, dice che sono normali, mostra cosa cliccare, e offre qualcosa di più raro — un modo per verificare da soli che non c'è niente di losco. Il launcher è un file di testo: tasto destro, Modifica, e si legge tutto quello che fa. Le librerie che scarica sono open source, pubblicate su PyPI, usate da migliaia di professionisti del settore.

Non è eleganza: è l'unica strada rimasta quando non hai un marchio che risponde per te.

## La casella a metà schermo

Poi c'è l'installazione di Python, che nella testa di chi scrive software è un dettaglio e nella pratica è il muro più alto del percorso.

L'installer ufficiale ha una casella, in basso: «Add Python to PATH». Se resta vuota — e resta vuota, sta in basso e nessuno te lo dice — il programma non troverà mai l'interprete. La guida non si fida: mette la casella in grassetto, spiega cosa succede se la salti, e arriva a dire di disinstallare e reinstallare se l'hai già fatta senza. Chiede anche di riavviare il computer, e dice perché.

Il launcher intanto fa la sua parte: cerca `python`, poi `python3`, poi i percorsi tipici delle installazioni Windows, versione dopo versione. Solo quando non trova nulla si arrende — e invece di un messaggio d'errore mostra le istruzioni numerate per installarlo.

Resta il caso peggiore: una delle librerie ha componenti in C++ che vengono compilati durante l'installazione, e se sulla macchina non ci sono gli strumenti giusti l'errore arriva in inglese e parla di compilatori. Per chi fa rilievi è rumore. La documentazione lo traduce: quel messaggio significa scaricare certi Build Tools, selezionare una voce precisa durante l'installazione, riprovare.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 4 · LE TRE DECISIONI SONO QUELLE VERE?
                ════════════════════════════════════════════════

    Nel frontmatter ci sono tre bivi con l'alternativa scartata. Li ha dedotti
    l'agente dalle fonti.

    Erano davvero decisioni, o sono ricostruzioni a posteriori di cose fatte senza
    pensarci? Una decisione che non hai preso e' peggio di una decisione mancante.

    RISPOSTA:


                ════════════════════════════════════════════════


## Tradurre i parametri in domande

La riga di comando espone il programma com'è dentro: voxel in metri, frazione di punti da mantenere, quantizzazione delle coordinate. È esattamente ciò che serve a chi l'ha scritto, ed è inutilizzabile da chi no.

L'interfaccia grafica fa la stessa domanda in un'altra lingua. Quattro opzioni, ognuna descritta dal risultato nel dominio: dettagli architettonici fini; rilievo architettonico, consigliato per edifici, con sezioni pulite e spessori misurabili; dimensioni generali; solo volumetrie e ingombri. Il millimetro c'è ancora, ma tra parentesi: la scelta si fa su quello che resterà a vedere nelle sezioni, non sull'unità di misura.

Intorno ai quattro livelli ci sono le piccole cose che tolgono paura: la stima della dimensione del risultato prima di lanciare l'elaborazione, la barra di avanzamento con un log leggibile durante, e ripetuto dovunque — fino alla nota tecnica — che il file originale non viene mai modificato né cancellato. Chi consegna una nuvola di punti consegna lavoro fatto sul campo: «non tocca l'originale» non è una feature, è la condizione perché il programma venga aperto.

## Il terminale che non si vede

Quando tutto è installato, il launcher avvia l'interfaccia con l'eseguibile pensato per le applicazioni grafiche: nessuna finestra nera che resta aperta sotto il programma. Ma l'avvio silenzioso ha un costo noto: se qualcosa fallisce, fallisce senza dire nulla — la finestra si apre e si chiude subito, e sembra un programma rotto.

La soluzione sta nel launcher: se l'avvio silenzioso non va a buon fine, il programma riparte nella variante che mostra gli errori, e la console resta aperta finché qualcuno non ha letto. E il caso limite — capire perché non parte — ha una sezione dedicata nella guida: apri il prompt dei comandi, lancia il file a mano, leggi il messaggio prima che sparisca.

È la regola generale del progetto in miniatura: il terminale si nasconde quando non aggiunge niente, e riappare nell'unico momento in cui è l'unica cosa che conta.

## Cosa resta aperto

Gli attriti non eliminati restano dichiarati. Senza firma digitale, ogni nuovo computer e ogni nuovo download rivede SmartScreen: la mitigazione è una pagina di documentazione, non una soluzione. Alcuni antivirus bloccano comunque il primo avvio, e la guida suggerisce un'eccezione o una sospensione temporanea — un compromesso detto ad alta voce. Nel caso peggiore dell'installazione, l'utente incontra comunque il messaggio di Microsoft prima che la guida prenda il sopravvento. E i file più grossi chiedono macchine con tanta memoria: il programma non gira esattamente dove il problema di partenza è più grande.

Sono i costi della strada scelta, scritti accanto alla strada.

**Un software è consegnato quando attraversa il computer di qualcun altro senza chiedergli di diventare tecnico — non quando funziona sulla tua macchina.**

---

*Bozza derivata dal repository dello strumento: launcher, interfaccia e guide sono la fonte di ogni dettaglio citato, e ogni voce della guida corrisponde a un punto documentato del percorso. I prodotti terzi menzionati — scanner e software di visualizzazione — compaiono come nella documentazione originale, cioè come formati e strumenti compatibili.*

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 1 · È VERO?  →  il blocco che viene prima di tutti
                ════════════════════════════════════════════════

    Questo testo non l'hai scritto tu: l'ha ricavato un agente leggendo il repo e il
    TROUBLESHOOTING. Prima di qualunque revisione di stile serve sapere se regge.

    Rileggi le cinque sezioni e segna cosa NON e' andata cosi':
      · episodi inventati o gonfiati
      · attriti che l'utente non ha mai avuto
      · scelte attribuite a te che non hai preso
      · dettagli tecnici sbagliati

    Se un episodio e' inventato, dillo: si toglie. Non c'e' niente da salvare in una
    scena che non e' successa.

    RISPOSTA:


                ════════════════════════════════════════════════


                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 2 · LA TESI E' TUA?
                ════════════════════════════════════════════════

    La tesi attuale e': «Un software e' consegnato quando attraversa il computer di
    qualcun altro senza che tu sia nella stanza.»

    L'ha scritta l'agente. La sottoscrivi, o la diresti diversamente? La tesi e' la
    riga che il lettore ripete a qualcun altro: se non e' tua, tutto il pezzo suona
    di seconda mano.

    RISPOSTA:


                ════════════════════════════════════════════════


                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 5 · SERVE DAVVERO QUESTO PEZZO?
                ════════════════════════════════════════════════

    Domanda scomoda ma legittima: fra i sette case study, questo e' l'unico che parla
    di software consegnato a persone non tecniche.

    E' un tema che ti interessa presidiare, o e' finito qui perche' il panel l'aveva
    segnalato come «costo bassissimo»? Se la risposta e' la seconda, si archivia
    senza rimpianti: sette pezzi mediocri valgono meno di quattro buoni.

    RISPOSTA:


                ════════════════════════════════════════════════

