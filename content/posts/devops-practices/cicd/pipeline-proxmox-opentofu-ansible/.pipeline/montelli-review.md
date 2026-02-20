# Montelli Style Review

**Articolo**: `pipeline-proxmox-opentofu-ansible/index.md`
**Data review**: 2026-02-20
**Parole**: ~2240
**Struttura**: 10 H2, 8 H3, 0 H4

---

## Score: 7/10

Articolo tecnicamente solido, ben strutturato e coerente con lo stile del blog. Le violazioni principali riguardano l'assenza di un hook nell'introduzione e la mancanza di immagini/diagrammi per un articolo architetturale.

---

## Violazioni

### Major

| # | Sezione | Violazione | Dettaglio |
|---|---------|-----------|-----------|
| 1 | Introduzione | **Manca hook con problema/domanda** | L'articolo inizia direttamente con "Un'applicazione composta da piu servizi..." senza il pattern identificato nella style guide (domanda retorica, scenario riconoscibile, provocazione). La guida richiede "sempre un hook con problema/domanda nei primi 2 paragrafi". |
| 2 | Immagini | **Nessuna immagine nel corpo dell'articolo** | Per un articolo architetturale con 3 strumenti e flussi tra componenti, manca un diagramma dell'architettura. La tabella al punto "Tre Strumenti, Tre Responsabilita" e utile ma un diagramma visivo (anche ASCII con blocco `text`) renderebbe il flusso molto piu immediato. L'immagine `hero.png` esiste ma non e referenziata nell'articolo. |
| 3 | Conclusione | **Manca frase di chiusura impattante** | Il riepilogo e una lista pulita ma si chiude in modo piatto. La style guide richiede una frase motivazionale/impattante finale (es. "Ora puoi buttare via tutti quegli script..."). |

### Minor

| # | Sezione | Violazione | Dettaglio |
|---|---------|-----------|-----------|
| 4 | Frontmatter - title | **Titolo troppo lungo** | 84 caratteri, la guida raccomanda 50-80. Valutare un taglio: es. "Pipeline CI/CD su Proxmox: OpenTofu, Ansible e Semaphore". |
| 5 | Frontmatter - description | **Description al limite basso** | 131 caratteri, rientra nel range 80-150 ma potrebbe esplicitare meglio il valore per il lettore (es. aggiungere "da zero a deploy automatico"). |
| 6 | Tono | **Assenza quasi totale del "tu" e del "noi"** | L'articolo usa esclusivamente costruzioni impersonali. La style guide indica di usare "noi" quando si descrivono soluzioni e "tu" per i momenti di connessione. L'articolo risulta leggermente distaccato rispetto al tono abituale del blog. |
| 7 | Link repo demo | **Riferimento generico alla cartella `demo/`** | La style guide prevede link prominenti al repository demo (con formato esplicito e URL). Il riferimento "nella cartella `demo/` accanto a questo articolo" non e un link cliccabile e non segue il pattern abituale. |
| 8 | Sezione "Cosa si Potrebbe Migliorare" | **Manca link a Packer** | Il link a Packer c'e (corretto), ma mancano link alla documentazione per webhook e smoke test. La guida richiede di linkare sempre alla documentazione ufficiale quando si cita uno strumento. |
| 9 | Versione inglese | **Manca `index.en.md`** | La guida richiede di creare sempre la versione inglese. Potrebbe essere intenzionale dato che l'articolo e in draft. |

---

## Punti di forza

- **Struttura eccellente**: progressione logica chiara (contesto, architettura, implementazione, miglioramenti, riepilogo, risorse)
- **Code block esemplari**: tutti con linguaggio specificato, commenti con path file, lunghezza contenuta
- **Separatori visivi** (`-----`) usati coerentemente tra sezioni principali
- **Tabella architetturale** efficace per il riassunto del flusso
- **Sezione Risorse Utili** completa e ben formattata, coerente con il pattern del blog
- **Gestione secret** trattata con attenzione e nota sulla sicurezza TLS in blockquote
- **Paragrafi** corti e focalizzati, rispettano il limite di 2-4 frasi

---

## Azioni raccomandate

1. **Aggiungere hook iniziale** (major) - Aprire con una domanda retorica o scenario riconoscibile prima del paragrafo tecnico
2. **Inserire diagramma architetturale** (major) - Un diagramma ASCII in blocco `text` o un'immagine PNG del flusso Jenkins -> OpenTofu -> Semaphore/Ansible
3. **Aggiungere frase di chiusura** (major) - Dopo la lista riepilogativa, una frase che dia un senso di completezza
4. **Accorciare il titolo** (minor) - Portarlo sotto 80 caratteri
5. **Introdurre "noi" nelle sezioni di soluzione** (minor) - Es. "Separiamo orchestrazione, provisioning e deploy..." invece di "La pipeline separa..."
6. **Rendere il link al repo demo esplicito** (minor) - Usare il pattern con URL e freccia
