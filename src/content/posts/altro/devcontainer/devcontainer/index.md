---
title: "DevContainers: Ambiente di Sviluppo Portatile e Riproducibile"
date: 2026-08-17T09:00:00.000Z
description: Come funzionano i DevContainers, cosa contiene la cartella .devcontainer e come evitare il problema dei file di proprietà di root che colpisce chi sviluppa su Linux
pillar: automatizzare
category: devcontainer
tags:
  - Docker
  - Linux
  - Containerizzazione
  - DevOps
lang: it
reviewed: human
reproducibility: true
---


## Ogni macchina configurata a mano diverge dalle altre

La frase **"Funziona sulla mia macchina!"** descrive un problema di configurazione. Il codice è lo stesso per tutti: cambia la macchina sotto. Ogni membro del team monta il proprio ambiente in modo leggermente diverso: versioni di linguaggio discordanti, dipendenze mancanti, variabili d'ambiente non allineate.

Il costo si paga in ore di debugging del setup invece che del prodotto, in onboarding lenti e in sorprese al deploy, quando l'ambiente di sviluppo e quello di produzione smettono di somigliarsi.

Nei sistemi distribuiti e nelle architetture a microservizi la superficie cresce: più linguaggi, più database, più servizi da tenere allineati su ogni macchina. I **DevContainers** spostano quella configurazione dentro un file versionato insieme al codice.

### Il container diventa l'ambiente di sviluppo

I **DevContainers** (o "Development Containers") sono una funzionalità di Visual Studio Code (VS Code) che permette di usare un container **Docker** come ambiente di sviluppo completo.

Il codice viene montato nel container, e tutte le operazioni di sviluppo (editing, debugging, esecuzione di comandi, installazione di dipendenze) avvengono dentro questo ambiente isolato.

L'ambiente ideale si descrive una volta sola in un file di configurazione. Chiunque apra il progetto con VS Code e Docker ottiene automaticamente lo stesso ambiente, qualunque sia il suo sistema operativo.

![Dev Container](imgs/devcont.png)

#### VS Code esegue un server dentro il container

Al centro dei DevContainers ci sono due componenti:

  - **VS Code**: l'IDE, che esegue un "server remoto" all'interno del container e permette di interagire con file e strumenti come se fossero locali.
  - **Docker**: il motore di containerizzazione che ospita l'ambiente.

All'apertura del progetto l'IDE rileva la configurazione, costruisce e avvia il container, monta il codice e installa le estensioni specificate. Da quel momento comandi da terminale, debugging e installazioni avvengono dentro il container.

### La cartella `.devcontainer` contiene tutto quello che serve a ricostruire l'ambiente

Sta alla radice del progetto e raccoglie i file di configurazione che definiscono l'ambiente.

#### `devcontainer.json` descrive immagine, strumenti ed estensioni

È il file di configurazione principale, e specifica come costruire e configurare l'ambiente.

```json
// .devcontainer/devcontainer.json
{
  "name": "My Python App Dev Environment", // Nome visualizzato del DevContainer
  "image": "mcr.microsoft.com/devcontainers/python:0-3.11", // Immagine Docker predefinita
  // Oppure: "dockerFile": "Dockerfile", // Se usi un Dockerfile personalizzato
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {
      "version": "latest"
    },
    "ghcr.io/devcontainers/features/node:1": {
      "version": "latest"
    },
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "installOhMyZsh": true
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-azuretools.vscode-docker",
        "redhat.vscode-yaml",
        "esbenp.prettier-vscode"
      ],
      "settings": {
        "python.defaultInterpreterPath": "/usr/local/bin/python"
      }
    }
  },
  "postCreateCommand": "pip install -r requirements.txt",
  "forwardPorts": [3000, 8000],
  "remoteUser": "vscode"
}
```

Per una guida completa su tutte le proprietà disponibili, consulta la [documentazione ufficiale](https://code.visualstudio.com/docs/devcontainers/create-dev-container).

#### Il `Dockerfile` serve quando le `features` non bastano

Per un controllo più granulare puoi usare un `Dockerfile` personalizzato.

```dockerfile
# .devcontainer/Dockerfile
ARG VARIANT="3.11"
FROM mcr.microsoft.com/devcontainers/python:${VARIANT}

# Installare dipendenze di sistema aggiuntive
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends git curl make build-essential \
    && rm -rf /var/lib/apt/lists/*

# Configurare il working directory
WORKDIR /workspace

# Impostare un entrypoint predefinito (se necessario)
ENTRYPOINT ["/usr/local/bin/python"]
```

Il costo è una build più lenta e un'immagine da mantenere. In cambio puoi installare pacchetti di sistema e personalizzare l'immagine base.

#### `docker-compose.yml` quando il progetto ha più servizi

Quando servono un'app web, un database e un broker di messaggi insieme, la definizione passa da Compose.

```yaml
# .devcontainer/docker-compose.yml
version: '3.8'
services:
  # Servizio principale, la tua app, che sarà l'ambiente di sviluppo
  app:
    build:
      context: ../my-app
      dockerfile: Dockerfile
    volumes:
      - ..:/workspaces:cached
    command: sleep infinity
    ports:
      - "8000:8000"

  # Servizio database di esempio
  database:
    image: postgres:15
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  # Servizio Kafka di esempio
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
```

VS Code usa il `docker-compose.yml` per avviare tutti i servizi, e il `devcontainer.json` punta a questo file per indicare quale servizio ospita l'ambiente di sviluppo.

### Su Linux i file scritti dal container escono di proprietà di root

Questa è la parte che chi sviluppa su Linux incontra quasi sempre, di solito senza capire subito cosa sia successo.

#### Lo scenario: il file l'hai appena generato tu e non lo puoi toccare

Apri il progetto nel DevContainer. Dal terminale integrato lanci un comando che scrive su disco: `npm install`, uno scaffolding, una migrazione, un build. Tutto funziona.

Poi chiudi VS Code e apri gli stessi file da fuori, con un altro editor o da un altro terminale. `node_modules/`, la cartella di build, il file di migrazione appena generato: `Permission denied`. Il `git status` li vede, il `git add` fallisce, l'editor rifiuta di salvare.

Per rimuoverli serve `sudo rm -rf`. Su una macchina di sviluppo, avere bisogno di `sudo` per cancellare l'output di un comando ordinario segnala che qualcosa nella configurazione è rimasto implicito.

#### La causa: il bind mount passa l'UID numerico così com'è

Nel flusso più comune, quello in cui apri una cartella locale, il DevContainer la monta come bind mount. Su Linux quel mount non traduce niente. La documentazione Microsoft lo scrive esplicitamente: "any mounted files/folders will have the exact same permissions as outside the container - including the owner user ID (UID) and group ID (GID)".

Il kernel confronta numeri. Un utente con UID 1000 sull'host e un utente con UID 1000 nel container sono la stessa identità dal punto di vista del filesystem, perché il nome non attraversa il confine.

Quando nel container non è dichiarato nessun utente, i processi girano come root, cioè UID 0. Ogni file che scrivono compare sull'host con owner `root:root`. Il tuo utente conserva il diritto di leggerlo, e finisce lì.

#### Su macOS e Windows lo stesso comando non lascia file di root

Su macOS e Windows i file passano attraverso il livello di condivisione di Docker Desktop, e quello che si osserva cambia. La documentazione Microsoft riporta il risultato: su macOS i file montati risultano di proprietà dell'utente del container, su Windows risultano di root ma restano leggibili e scrivibili comunque. Descrive l'esito senza documentare il meccanismo che lo produce, quindi qui vale l'esito.

Il conto pratico si paga sulla composizione del team. In un gruppo misto lo stesso `devcontainer.json` funziona per tutti tranne chi sviluppa su Linux. La CI non se ne accorge, perché costruisce da zero e non monta la tua working directory. Lo scopre una persona sola, sulla propria macchina, di solito quando il file è già in repository da giorni.

#### La correzione: dichiarare un utente non root nel `devcontainer.json`

Due proprietà governano l'identità dentro il container. `containerUser` cambia l'utente di tutti i processi; `remoteUser` cambia quello di VS Code e dei suoi sottoprocessi, terminale incluso, lasciando il resto com'è.

Dichiararne una attiva anche il meccanismo che chiude il problema. La specifica dei Dev Containers definisce la sincronizzazione dell'UID come "an optional task for Linux (only) and that executes if the `updateRemoteUserUID` property is set to true and a `containerUser` or `remoteUser` is specified".

Il default di `updateRemoteUserUID` è `true`. La specifica classifica il sync come task opzionale, che un'implementazione può saltare; VS Code lo esegue, quindi in pratica nominare l'utente è quello che serve.

```json
{
  "image": "mcr.microsoft.com/devcontainers/python:0-3.11",
  // vscode è già non root nell'immagine. Nominarlo qui attiva su Linux
  // updateRemoteUserUID, che allinea il suo UID al tuo prima di creare il container.
  "remoteUser": "vscode"
}
```

Le immagini `mcr.microsoft.com/devcontainers/*` arrivano con l'utente `vscode` già creato, quindi non devi crearlo tu. Nominarlo resta il passaggio che conta: la specifica lega il sync a un `containerUser` o `remoteUser` *specificato*, e lasciar valere il default dell'immagine non è la stessa cosa.

Restano i casi in cui l'allineamento va fatto a mano. Se costruisci l'immagine e vuoi che l'UID coincida già in fase di build, la documentazione Microsoft indica `groupmod` e `usermod`:

```dockerfile
ARG USER_UID=1000
ARG USER_GID=$USER_UID
# L'utente dell'immagine ha un UID fisso deciso a monte, che può non essere il tuo.
RUN groupmod --gid $USER_GID vscode \
    && usermod --uid $USER_UID --gid $USER_GID vscode \
    && chown -R $USER_UID:$USER_GID /home/vscode
```

Con Docker Compose l'utente si dichiara nel servizio, con `user: vscode` nel `docker-compose.yml`. La documentazione descrive la sincronizzazione automatica dell'UID per i setup basati su immagine o Dockerfile e tace sul caso Compose. A mancare è la documentazione, il che lascia aperto cosa succeda davvero: dichiarare l'identità costa una riga e toglie il dubbio.

#### Il `chown` dopo ogni comando funziona, e ha un prezzo

La scorciatoia circola da sempre: dopo ogni comando che genera file, un `sudo chown -R $USER:$USER .` dall'host.

Funziona. Il compromesso è che ogni esecuzione ripara il sintomo e lascia la causa esattamente dov'era. La riga entra in un alias, poi in un target del Makefile, poi nella pagina di onboarding come passaggio normale, e a quel punto è una regola del progetto che nessuno rimette in discussione.

Il conto arriva con la persona successiva che entra nel team. Trova file di root nel checkout, nessuna traccia del perché nel `devcontainer.json`, e ci perde un pomeriggio prima che qualcuno le spieghi che si fa così. Le tre righe di configurazione costavano meno.

#### Riproducibile in sviluppo e riproducibile in build sono due cose diverse

Un ambiente di sviluppo riproducibile non porta con sé una build riproducibile. Sono due problemi distinti e si affrontano in posti diversi: il primo nel `devcontainer.json`, il secondo nei lockfile, nei digest delle immagini e nella pipeline.

### Cosa cambia nel lavoro quotidiano

L'impatto maggiore dei DevContainers cade sulla **Developer Experience (DX)**, cioè su come si lavora ogni giorno:

  - **Onboarding in minuti**: chi arriva apre il progetto e lavora, senza la giornata di setup che di solito precede la prima riga di codice.
  - **Fine del "funziona sulla mia macchina"**: tutti lavorano sulla stessa configurazione, e le discrepanze smettono di essere una categoria di bug.
  - **Isolamento tra progetti**: stack diversi convivono sulla stessa macchina senza conflitti di versione, perché ogni progetto porta il suo ambiente.
  - **Coerenza con la produzione**: quanto più il container somiglia al runtime di produzione, tanti meno problemi emergono per la prima volta al deploy.
  - **Condivisione per il debugging**: l'ambiente si passa a un collega come si passa un file, il che accorcia il tempo per riprodurre un problema.
  - **Sperimentazione a costo zero**: provare una versione nuova di un linguaggio significa cambiare una riga e ricostruire, senza toccare la macchina locale.

### Il conto da pagare, e come tenerlo basso

I DevContainers hanno costi reali, e conviene conoscerli prima di adottarli.

#### Quello che i DevContainers ti fanno pagare

  - **Docker obbligatorio**: serve Docker installato e funzionante sulla macchina locale. Per i dettagli, [**Installazione di Docker Desktop**](https://www.docker.com/products/docker-desktop/).
  - **Overhead iniziale**: la prima apertura del progetto costruisce l'immagine, e su stack pesanti significa qualche minuto di attesa.
  - **Consumo di risorse**: un `docker-compose.yml` con molti servizi occupa CPU e RAM che al portatile servivano per altro.
  - **Debugging a due livelli**: quando qualcosa si rompe nel container, il problema può stare nel codice o nella configurazione dell'ambiente, e distinguerli richiede confidenza con Docker.

#### Le pratiche che riducono l'attrito

  - **Immagini base ufficiali**: partire dalle immagini DevContainer già ottimizzate evita di reinventare la configurazione. Il catalogo è su [**DevContainers Features**](https://containers.dev/features).
  - **Cache dei layer Docker**: ordinare le istruzioni dalle più stabili alle più volatili accorcia le ricostruzioni successive.
  - **`features` prima del `Dockerfile`**: le `features` coprono gli strumenti comuni, il `Dockerfile` resta per quello che è specifico del progetto.
  - **Dipendenze minime**: ogni pacchetto installato è tempo di build e superficie da aggiornare.
  - **Porte mappate**: verificare che tutte le porte necessarie siano esposte, prima che il primo collega ci sbatta contro.
  - **Dotfiles**: la sincronizzazione dei dotfiles rende il terminale del container familiare fin dal primo avvio.
  - **Monitoraggio risorse**: tenere d'occhio il consumo di Docker Desktop o Docker Engine evita che il container mangi la macchina in silenzio.

### Conclusioni

I DevContainers rendono l'ambiente di sviluppo un artefatto versionato insieme al codice. Il setup smette di essere conoscenza tribale e diventa un file che si legge, si rivede in pull request e si corregge una volta per tutti.

Il beneficio più grande si vede sui progetti con molte dipendenze esterne, dove ricostruire l'ambiente a mano costa più che leggere il codice. Il prezzo è Docker sempre acceso e qualche minuto di build iniziale, e nella maggior parte dei casi vale la pena pagarlo.
