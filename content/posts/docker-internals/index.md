---
title: "Docker Internals"
date: 2025-07-13T08:06:25+06:00
description: Introduction to Sample Post
menu:
  sidebar:
    name: Introduction
    identifier: introduction
    weight: 10
tags: ["Basic", "Multi-lingual"]
categories: ["Basic"]
---

# Docker e Linux Namespaces: Guida Completa alla Containerizzazione

*Pubblicato in Marzo 2025 - di Francesco Montelli*

La containerizzazione ha rivoluzionato il modo in cui sviluppiamo e distribuiamo le applicazioni. In questo articolo esploreremo Docker e i meccanismi fondamentali che rendono possibile l'isolamento dei container: i **namespaces** e i **cgroups** di Linux.

## Cos'è Docker?

Docker è una piattaforma open-source che semplifica lo sviluppo, la distribuzione e l'esecuzione delle applicazioni tramite l'uso di **container**. Un container è un'astrazione che permette di racchiudere un'applicazione e tutte le sue dipendenze in un ambiente isolato e portatile, eliminando le incompatibilità dovute alle differenti configurazioni dei sistemi host.

### Caratteristiche Principali

**Isolamento e Portabilità**: Ogni container contiene tutto il necessario per eseguire l'applicazione, garantendo che il software venga eseguito sempre allo stesso modo su qualsiasi infrastruttura.

**Efficienza e Leggerezza**: I container offrono un consumo minore di risorse rispetto alle tradizionali macchine virtuali, condividendo il kernel dell'host.

**Uniformità di Gestione**: Il container diventa la nuova "unità fondamentale" durante il ciclo di vita dell'applicativo, riducendo il tempo che intercorre tra la scrittura del codice e la messa in esercizio.

## Casi d'Uso Principali

### 1. Rilascio Rapido e Coerente delle Applicazioni

Docker elimina il problema del "funziona sulla mia macchina" attraverso:

- **Sviluppo in ambienti isolati**: Ogni sviluppatore lavora in un ambiente standardizzato
- **Testing uniforme**: I container sono identici in ogni ambiente, garantendo test affidabili
- **Aggiornamenti rapidi**: Le modifiche possono essere immediatamente testate e distribuite

### 2. Deploy e Scalabilità Reattivi

La flessibilità di Docker si manifesta in:

- **Portabilità totale**: I container possono essere eseguiti su qualsiasi infrastruttura (PC, server fisici, macchine virtuali, cloud, ambienti ibridi)
- **Scalabilità dinamica**: Possibilità di avviare o terminare istanze in tempo reale per rispondere alle variazioni del carico

### 3. Massimizzazione delle Risorse Hardware

L'efficienza dei container permette:

- **Maggiore densità**: Numerosi container possono essere eseguiti sullo stesso server
- **Riduzione dei costi**: Uso più efficiente dell'hardware si traduce in minori costi infrastrutturali

## Integrazione DevOps e CI/CD

Docker si integra perfettamente nei flussi di lavoro moderni:

- **Automazione completa**: Dal coding al deployment, tutto può essere automatizzato
- **Coerenza ambientale**: Lo stesso container viene utilizzato in sviluppo, test e produzione

## Architettura Docker

L'architettura di Docker si basa su tre componenti principali:

### Docker Client
L'interfaccia primaria per interagire con Docker. Il comando `docker` invia le richieste al Docker daemon e può comunicare con più daemon contemporaneamente.

### Docker Host
Il sistema su cui gira il Docker daemon (`dockerd`), responsabile di:
- Ascoltare le richieste API
- Gestire gli oggetti Docker (immagini, container, reti, volumi)
- Coordinare i servizi distribuiti

### Docker Registry
Il sistema di archiviazione e distribuzione delle immagini Docker. Docker Hub è il registry pubblico predefinito, ma è possibile configurare registry privati.

### Flusso di Esecuzione di un Container

Quando eseguiamo `docker run`, Docker:

1. **Verifica l'immagine**: Controlla se è disponibile localmente, altrimenti la scarica dal registry
2. **Crea il container**: Istanzia un nuovo container basato sull'immagine
3. **Alloca il filesystem**: Assegna un filesystem in scrittura come layer aggiuntivo
4. **Configura la rete**: Imposta l'indirizzo IP e la connessione di rete
5. **Esegue il comando**: Avvia il processo specificato

## Docker vs Virtual Machine

La differenza fondamentale tra containerizzazione e virtualizzazione risiede nell'architettura:

**Virtualizzazione**: Crea macchine virtuali complete con proprio sistema operativo tramite hypervisor. Offre isolamento rigoroso ma con overhead elevato.

**Containerizzazione**: I container condividono il kernel dell'host, isolandosi tramite namespaces e cgroups. Riduce drasticamente l'overhead ma offre isolamento meno robusto.

Questa scelta architettuale determina un compromesso tra sicurezza/isolamento completo e agilità/efficienza.

## Linux Namespaces: Il Cuore dell'Isolamento

I **namespaces** sono un meccanismo del kernel Linux che permette di creare ambienti isolati per processi e risorse. Ogni processo può avere una visione limitata del sistema, accedendo solo alle risorse assegnate.

### Tipi di Namespace

Linux supporta otto tipi di namespace:

- **Mount (mnt)**: Isola i punti di montaggio dei filesystem
- **Process ID (pid)**: Separa gli ID di processo
- **Network (net)**: Isola le risorse di rete
- **Interprocess Communication (ipc)**: Separa le risorse IPC
- **UTS (uts)**: Permette di modificare hostname e domain name
- **User (user)**: Fornisce separazione tra ID utente e gruppo
- **Cgroup (cgroup)**: Isola la visibilità dei gruppi di controllo
- **Time (time)**: Consente separazione degli orologi di sistema

### PID Namespace

I namespace PID permettono di isolare i processi, assegnando identificativi distinti. Caratteristiche principali:

- Organizzazione **gerarchica**: ogni namespace ha un padre
- **Visibilità**: i processi sono visibili dai namespace superiori
- **Mappatura**: un processo può avere PID diversi in namespace diversi

Questo è fondamentale per i container, permettendo a ogni istanza di avere il proprio processo init con PID 1.

### Network Namespace

L'isolamento delle risorse di rete consente a ciascun namespace di avere il proprio stack di rete indipendente:

- **Sicurezza**: Impedisce accessi non autorizzati alla rete dell'host
- **Port mapping**: Docker usa questo meccanismo per mappare le porte
- **Reti virtuali**: Possibilità di creare reti condivise tra gruppi di processi

## CGroups: Controllo delle Risorse

I **cgroups** (control groups) sono una funzionalità del kernel Linux che consente di limitare, monitorare e isolare l'uso delle risorse di sistema tra gruppi di processi.

### Risorse Gestibili

- **Memoria**: Limiti soft e hard, controllo dello swap
- **CPU**: Monitoring e throttling del consumo
- **Block I/O**: Controllo delle operazioni di lettura/scrittura
- **Network**: Limitazione del traffico di rete
- **Device**: Controllo dell'accesso ai dispositivi

### Interfaccia Filesystem

I cgroups sono gestiti tramite un'interfaccia filesystem, tipicamente in `/sys/fs/cgroup/`. Ogni gerarchia corrisponde a una directory con file speciali per configurare limiti e ottenere statistiche.

## Demo Pratiche

### Demo 1: PID Namespaces in Azione

Questa demo dimostra che i container sono semplicemente processi nel sistema host:

```bash
# 1. Avviare un container Ubuntu
docker run -it ubuntu bash

# 2. Nel container, eseguire un processo
watch ps aux

# 3. Dall'host, trovare il processo
ps aux | grep watch

# 4. Visualizzare la catena dei processi
pstree -s <PID>

# 5. Verificare il mapping dei PID
grep NSpid /proc/<PID>/status

# 6. Terminare il processo dall'host
kill <PID>
```

### Demo 2: Network Namespace

Questa demo mostra il funzionamento del port mapping:

```bash
# 1. Avviare container con port mapping
docker run -d -p 9090:8080 --name net-demo python:3 python -m http.server 8080

# 2. Verificare il mapping
docker port net-demo

# 3. Ottenere il PID del container
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' net-demo)

# 4. Confrontare i network namespace
ls -l /proc/1/ns/net
ls -l /proc/$CONTAINER_PID/ns/net

# 5. Testare la connessione
telnet 127.0.0.1 8080  # Fallisce
telnet 127.0.0.1 9090  # Funziona

# 6. Usare nsenter per accedere al namespace del container
nsenter --target $CONTAINER_PID --net telnet 127.0.0.1 8080  # Funziona
```

### Demo 3: CGroups e Limitazione Memoria

Questa demo mostra come i cgroups limitano l'uso della memoria:

```bash
# 1. Creare un cgroup con limite di memoria
mkdir /sys/fs/cgroup/demo3_memory
echo 104857600 > /sys/fs/cgroup/demo3_memory/memory.max
echo 0 > /sys/fs/cgroup/demo3_memory/memory.swap.max

# 2. Test normale (funziona)
python3 -c "a = bytearray(200 * 1024 * 1024)"

# 3. Spostare la shell nel cgroup
echo $$ | sudo tee /sys/fs/cgroup/demo3_memory/cgroup.procs

# 4. Test con limite (fallisce)
python3 -c "a = bytearray(200 * 1024 * 1024)"
# Output: Killed

# 5. Verificare i log di sistema
sudo dmesg | grep -i "Killed process"
```

## Conclusioni

Docker rappresenta una rivoluzione nel deployment delle applicazioni, combinando efficienza, portabilità e semplicità d'uso. La comprensione dei meccanismi sottostanti - namespaces e cgroups - è fondamentale per utilizzare al meglio questa tecnologia.

I namespaces forniscono l'isolamento necessario per far credere a ogni container di essere l'unico sul sistema, mentre i cgroups garantiscono che le risorse siano distribuite equamente e in modo controllato.

Questa combinazione rende Docker ideale per ambienti cloud-native, microservizi e pipeline CI/CD, dove l'agilità e l'efficienza sono requisiti fondamentali.
