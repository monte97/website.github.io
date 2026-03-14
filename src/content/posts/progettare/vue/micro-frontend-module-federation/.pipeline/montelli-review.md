# Style Review (montelli.dev): Micro-frontend in Vue 3 con Module Federation

**Score: 8/10**

---

## Violazioni stilistiche

### Alta priorità

- **Testo**: "Module Federation è una risposta concreta a questo problema: un meccanismo di composizione runtime che consente a più applicazioni di condividere codice e componenti senza essere compilate insieme. Questo articolo mostra come funziona in pratica con Vue 3 e Vite, dalle basi al contratto tra shell e moduli fino al deploy indipendente."
  **Problema**: Il primo paragrafo funziona (problema reale, costo umano preciso). Il secondo paragrafo scivola in un pattern da blog post aziendale: "Questo articolo mostra come funziona in pratica" è una frase di raccordo generica che abbassa il tono. Non serve annunciare cosa farà l'articolo.
  **Suggerimento**: Eliminare o riscrivere. Esempio: "Module Federation è una risposta concreta: composizione runtime, deploy indipendente, nessun bundle condiviso a compile time. Vediamo come funziona con Vue 3 e Vite."

- **Testo**: Dopo il primo paragrafo, l'articolo passa da "tre team si bloccano a vicenda" (prima persona, scenario vissuto) a un registro completamente impersonale ("si configura", "si deploya", "si manifesta"). La voce personale scompare.
  **Problema**: Le writing rules richiedono "Come ho fatto, non come si fa". Il contenuto educativo deve partire dall'esperienza vissuta. L'articolo scivola nella modalità documentazione tecnica impersonale dopo l'hook.
  **Suggerimento**: Almeno in una sezione critica — ad esempio "Dipendenze condivise: il punto più insidioso" — aggiungere una frase in prima persona che agganci al concreto. Esempio: "La prima volta che ho visto questo problema, l'app si rompeva senza un errore chiaro. Due istanze di Vue nella stessa pagina: inject non funzionavano, plugin non venivano trovati."

### Media priorità

- **Testo**: "Module Federation aggiunge complessità reale."
  **Problema**: Affermazione corretta, ma è una riga solitaria che introduce la tabella senza voce personale. Non si capisce se è un'osservazione da esperienza o una premessa teorica neutra.
  **Suggerimento**: Aggiungere una frase in prima persona. Esempio: "Ogni volta che ho valutato Module Federation, la domanda non era 'possiamo farlo?' ma 'vale la complessità che aggiungiamo?'. La risposta dipende dallo scenario."

- **Testo**: Sezione "Riepilogo" — titolo della sezione finale.
  **Problema**: "Riepilogo" è terminologia di documentazione tecnica, non di un articolo editoriale. Neutro, non orientato al beneficio né al punto di vista.
  **Suggerimento**: Rinominare in qualcosa che rispecchi il giudizio: "Quattro decisioni che non puoi rimandare" o "Cosa porto via da questo setup" o, se si vuole restare sobri, "In sintesi".

- **Testo**: La sezione "Risorse" elenca 8 link con descrizioni didascaliche omogenee.
  **Problema**: Una lista di 8 risorse trattate tutte allo stesso modo è documentazione, non voce editoriale. Non c'è selezione critica né punto di vista personale su nessun link.
  **Suggerimento**: Ridurre a 3-4 risorse essenziali con una riga di commento personale per ognuna. Oppure dividere in "Indispensabili" e "Approfondimenti" per dare una gerarchia.

### Bassa priorità

- **Testo**: "Il segnale non è 'siamo tanti' — è 'ci blocchiamo a vicenda nel deploy'."
  **Problema**: È la frase più forte dell'articolo, ma viene dopo la tabella, quasi come nota a margine in fondo alla sezione. Posizionamento che ne riduce l'impatto.
  **Suggerimento**: Spostarla come frase di chiusura della sezione o usarla come apertura del paragrafo successivo. È la sintesi del criterio decisionale — merita visibilità.

- **Testo**: Chiusure di paragrafo come "Il confine tra applicazioni è esplicito per design." e "URL parametrizzati per ambiente: la shell non va modificata quando cambia l'hosting di un modulo."
  **Problema**: Funzionano bene nella documentazione tecnica. In un articolo editoriale, alcune di queste osservazioni potrebbero essere rese più personali, specialmente quando contengono un giudizio implicito.
  **Suggerimento**: Lasciare così le più tecniche. Trasformare in prima persona quelle che contengono un giudizio: "Il confine è esplicito per design" → "Ho scelto di lasciarlo esplicito: ogni tanto la chiarezza vale il costo."

---

## Punti di forza stilistici

- **Hook iniziale**: il primo paragrafo è il migliore dell'articolo. Il problema è concreto, ha un costo umano preciso ("tre team si bloccano a vicenda perché lavorano sullo stesso `router.ts`"), non è generico. È esattamente il pattern "Scenario da lavoro reale" delle writing rules.

- **Tabella "Quando usare Module Federation"**: uno degli elementi più riusciti. Copre i casi reali senza essere esaustiva, include il caso "Startup con 5 sviluppatori → Overengineering. Tornarci tra 18 mesi" che è opinionato e utile. Funziona perché non è neutrale.

- **Sezione "Dipendenze condivise: il punto più insidioso"**: l'unico titolo che rompe la neutralità e segnala un giudizio. Il contenuto tecnico è solido, il problema è spiegato con un esempio concreto (versioni diverse tra shell e remote). È la sezione più vicina allo stile montelli.dev.

- **Nessun marketing speak né entusiasmo eccessivo**: l'articolo non vende Module Federation. Lo presenta con i trade-off espliciti, incluso il costo in complessità. Coerente con la voce "opinionato con criterio" delle writing rules.

- **Struttura progressiva coerente**: ogni sezione rispetta la progressione logica (problema → configurazione → contratto → errori → deploy → decisione). Nessuna digressione, nessuna sezione orfana.

- **Formattazione corretta**: codice in blocchi, grassetto usato con parsimonia su termini chiave (non su frasi intere), tabelle usate dove aggiungono chiarezza. Nessun abuso di bullet list.

- **Chiusura del Riepilogo**: "Il costo è la complessità distribuita: invece di un build che fallisce, hai runtime error che dipendono da quale versione del remote è in produzione." — frase di chiusura onesta e impattante, coerente con il tono dell'articolo.

---

## Verdetto

L'articolo è tecnicamente solido e strutturalmente ben costruito. Il problema principale è il cambio di registro dopo il primo paragrafo: si inizia con una scena reale in prima persona, poi si scivola nella modalità documentazione tecnica impersonale. Le writing rules di montelli.dev richiedono che la voce personale rimanga presente anche negli articoli tecnici — almeno nei punti di giudizio e nei momenti in cui l'autore ha imparato qualcosa sulla propria pelle.

Con tre interventi mirati — riscrivere il secondo paragrafo dell'introduzione, aggiungere una frase in prima persona nella sezione sulle dipendenze singleton, rinominare "Riepilogo" — l'articolo passa da un ottimo pezzo tecnico a un articolo distintamente montelli.dev.

Struttura, formattazione e onestà sui trade-off sono già al livello giusto. Manca la voce che rende questo pezzo non replicabile da chiunque.
