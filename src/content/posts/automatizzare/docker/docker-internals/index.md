---
title: "Un container è un processo, non una macchina"
date: 2025-07-13T02:06:25.000Z
description: "Dall'host lanci kill sul PID e il container si ferma: è lo stesso processo. Namespaces, cgroups, e dove finisce davvero l'isolamento."
pillar: automatizzare
category: docker
mode: explanation
tags:
  - Docker
  - Linux
  - Containerizzazione
  - DevOps
lang: it
reviewed: false
reproducibility: true
summary:
  - label: "Contesto"
    value: "I meccanismi del kernel Linux dietro l'isolamento dei container Docker"
  - label: "Scoperta"
    value: "Un container è un processo dell'host, non una macchina a parte"
    note: "Terminarlo dall'host ferma il container: è lo stesso processo"
  - label: "Ampiezza"
    value: "Otto tipi di namespace e cinque categorie di risorse sotto cgroups"
  - label: "Costo reale"
    value: "Kernel condiviso: meno overhead delle VM, isolamento meno robusto"
openItems:
  - "Nella gerarchia dei namespace PID i processi restano visibili ai livelli superiori: l'isolamento vale dall'interno verso il basso"
  - "Senza configurazioni ad-hoc chi vive in un network namespace non raggiunge il resto del sistema: l'esposizione passa dal port mapping controllato"
  - "I limiti hard di memoria portano all'OOM Killer: la soglia va tarata sul profilo dell'applicazione"
  - "Container o macchina virtuale dipende dal compromesso che si accetta fra efficienza e isolamento completo"
  - "I percorsi delle demo su cgroups assumono cgroup v1: su una distribuzione con v2 come default la gerarchia sotto `/sys/fs/cgroup` è organizzata diversamente"
openNote: "Alcune proprietà di questi meccanismi da tenere presenti."
---

Avvia un container, prendi il PID che Docker ti dà, e dall'host lancia `kill`.

```bash
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' pid-demo)
kill $CONTAINER_PID
# Il container si ferma
```

Non hai spento una macchina. Hai terminato un processo — un processo normale, che compare in `ps aux` dell'host insieme a tutti gli altri, che ha un genitore, e che il kernel tratta come qualunque altro.

È la cosa che conviene tenere a mente quando si ragiona su cosa un container garantisce e cosa no: **non c'è nessuna macchina isolata sotto**. Ci sono due meccanismi del kernel Linux che limitano quello che quel processo *vede* e quello che *può prendersi*. Si chiamano namespaces e cgroups, e sapere dove finisce ognuno dei due è la differenza fra usare Docker e fidarsi di Docker.

## Il container è un processo dell'host

Il modo più rapido di convincersene è guardarlo.

```bash
# 1. Avviare un container Ubuntu con una shell interattiva
docker run -it --name pid-demo ubuntu bash

# 2. Nel container, avviare un processo distintivo
# (dalla shell del container)
watch -n 1 'ps aux | head -10'

# 3. Da un'altra shell sull'host, identificare il processo
ps aux | grep watch

# 4. Analizzare la gerarchia dei processi
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' pid-demo)
pstree -p $CONTAINER_PID

# 5. Verificare il mapping dei namespace
ls -la /proc/$CONTAINER_PID/ns/
grep -E 'NSpid|NStgid' /proc/$CONTAINER_PID/status

# 6. Terminare il processo dall'host (dimostra che sono lo stesso processo)
kill $CONTAINER_PID
# Il container si fermerà
```

Il passo 5 è quello che spiega tutto il resto. `/proc/$PID/status` mostra due PID per lo stesso processo: quello valido nel namespace del container — di solito 1, perché lì dentro è il processo di init — e quello valido sull'host. Un processo, due identità, a seconda di chi guarda.

I namespace PID sono organizzati **gerarchicamente**: ogni namespace ha un padre, e i processi al suo interno restano visibili dai livelli superiori. L'isolamento va in una direzione sola. Dall'host vedi dentro il container; dal container non vedi fuori.

![Rappresentazione della gerarchia fra processi nel namespace PID: lo stesso processo ha identificativi diversi a seconda del livello da cui viene osservato](./imgs/ns_pid_hier2.jpg)

## Namespaces: cosa quel processo riesce a vedere

Un namespace limita la porzione di sistema che un processo percepisce. Linux ne ha otto tipi — mount, PID, network, IPC, UTS, user, cgroup, time — e Docker li usa quasi tutti insieme, ma due meritano attenzione perché è lì che le aspettative sbagliano più spesso.

**PID**, appena visto: ogni container ha il suo processo con PID 1, che non interferisce con gli altri container né con l'host. Con l'asimmetria che ne consegue.

**Network** isola l'intero stack: indirizzi, tabelle di routing, `/proc/net`. La conseguenza pratica è che un processo dentro un network namespace **non raggiunge il resto del sistema**, punto, se non lo si configura apposta. Il port mapping di Docker è esattamente quella configurazione: un canale esplicito verso una porta specifica.

Si vede in due comandi:

```bash
# 1. Avviare un container con port mapping
docker run -d -p 8080:80 --name web-demo nginx

# 2. Verificare il mapping delle porte
docker port web-demo
ss -tlnp | grep :8080

# 3. Ottenere il PID del container
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' web-demo)

# 4. Confrontare i network namespace
ls -l /proc/1/ns/net                # Host namespace
ls -l /proc/$CONTAINER_PID/ns/net   # Container namespace

# 5. Testare la connettività
curl localhost:80         # Fallisce - porta non esposta sull'host
curl localhost:8080       # Funziona - porta mappata

# 6. Accedere al namespace del container
nsenter --target $CONTAINER_PID --net --mount --pid bash
# Ora siamo "dentro" il container
curl localhost:80         # Funziona - siamo nel namespace del container
```

Il passo 6 è il seguito del ragionamento di prima: `nsenter` entra nei namespace di un processo. Non c'è nessuna porta da forzare, nessun hypervisor da bucare — basta essere root sull'host.

![Comunicazione fra processi attraverso i network namespace: reti virtuali condivise fra gruppi ristretti di processi, senza esposizione verso l'esterno](./imgs/net_ns.jpg)

Lo stesso meccanismo permette di costruire reti virtuali fra container che comunicano fra loro senza essere raggiungibili da fuori, che è quello che fa Docker quando crei una rete definita dall'utente.

## Cgroups: quanto quel processo riesce a prendere

Se i namespace decidono cosa il processo vede, i **cgroups** decidono quanto può consumare. Sono un'interfaccia a filesystem sotto `/sys/fs/cgroup/`: ogni gruppo è una directory, e i file dentro la directory sono i limiti e i contatori.

Cinque categorie di risorse:

- **Memoria** — quantitativo massimo e uso dello swap. Il limite può essere *soft*, e allora la memoria viene reclamata quando serve, oppure *hard*, e allora superarlo scatena l'OOM Killer.
- **CPU** — superare il limite non fa fallire il processo: lo mette in throttle.
- **Blkio** — operazioni di I/O, con throttling su letture e scritture eccessive.
- **Network** — limiti sul traffico.
- **Device** — quali dispositivi il processo può scrivere.

La differenza fra il limite soft e quello hard non è un dettaglio di configurazione: decide se sotto pressione l'applicazione rallenta o muore. Si vede lanciando un container contro il proprio limite.

```bash
# 1. Creare un container con limiti di memoria
docker run -it --memory=100m --name memory-demo ubuntu bash

# 2. Trovare il cgroup del container
CONTAINER_ID=$(docker inspect --format '{{.Id}}' memory-demo)
cat /sys/fs/cgroup/memory/docker/$CONTAINER_ID/memory.limit_in_bytes

# 3. Test di allocazione memoria normale (dalla shell del container)
python3 -c "
data = []
for i in range(50):
    data.append(b'0' * (1024 * 1024))  # 1MB per iterazione
    print(f'Allocated {i+1} MB')
"

# 4. Test che supera il limite (dovrebbe fallire)
python3 -c "
data = []
for i in range(150):
    data.append(b'0' * (1024 * 1024))  # Tenta di allocare 150MB
    print(f'Allocated {i+1} MB')
"
# Il processo verrà terminato dal kernel OOM killer

# 5. Verificare i log del sistema
dmesg | tail -n 20 | grep -i "killed process"
```

Il passo 4 non produce un errore dell'applicazione: produce un processo ucciso dal kernel. Chi legge i log dell'applicazione non trova niente, perché l'applicazione non ha avuto modo di scrivere. La traccia è in `dmesg`, ed è il motivo per cui un container che "sparisce senza log" è quasi sempre un limite di memoria tarato male.

Gli stessi file servono a osservare invece che a limitare:

```bash
# Container sotto carico controllato
docker run -d --name stress-demo --memory=200m --cpus=0.5 ubuntu \
  bash -c "apt update && apt install -y stress && stress --cpu 2 --memory 1 --memory-bytes 150M"

docker stats stress-demo

# Gli stessi numeri, letti direttamente dal cgroup
CONTAINER_ID=$(docker inspect --format '{{.Id}}' stress-demo)
watch -n 1 "cat /sys/fs/cgroup/memory/docker/$CONTAINER_ID/memory.usage_in_bytes"
cat /sys/fs/cgroup/cpu/docker/$CONTAINER_ID/cpu.stat
```

`docker stats` legge quei file. Sapere che sono file spiega perché il monitoraggio dei container non richiede un agente dentro il container.

## Dove finisce l'isolamento

Qui sta la conseguenza che vale la pena portarsi via, ed è il rovescio della tesi iniziale.

Una macchina virtuale ha un kernel proprio: l'hypervisor separa due sistemi operativi completi. Un container **condivide il kernel dell'host**. Namespaces e cgroups sono funzionalità di quel kernel condiviso — sono un limite imposto dall'interno, non un muro fra due sistemi.

Le conseguenze sono tre, e sono operative:

- **Una vulnerabilità del kernel è una vulnerabilità di tutti i container** che ci girano sopra. Non c'è un secondo kernel a fare da rete.
- **Root sull'host è root ovunque.** `nsenter` della sezione precedente non è un exploit: è un comando documentato.
- **In compenso non c'è un sistema operativo da avviare**, ed è per questo che un container parte in un secondo e una VM in un minuto.

È un compromesso, non un difetto, ma va scelto sapendo cosa si sta scegliendo. Container per densità e velocità di ciclo; macchina virtuale quando l'isolamento deve reggere anche contro chi gira nel processo accanto — codice di terzi, tenant che non si fidano fra loro, requisiti di conformità che chiedono separazione fisica.

**Tradotto in una frase da portare fuori dal team**: la densità di container che permette di far girare quaranta servizi su un server invece di quaranta VM è la stessa scelta che mette quei quaranta servizi dietro un unico kernel, e la seconda metà di quella frase è quella che di solito nessuno dice quando si presenta il risparmio sull'infrastruttura.

## Cosa fare domani

Prendi un container che gira in produzione da voi e fai i tre passaggi della prima demo: trova il PID sull'host, guarda `/proc/$PID/ns/`, leggi `/proc/$PID/status`. Dieci minuti, e il modello mentale cambia da «macchina» a «processo con una vista ristretta».

Poi guarda i limiti di memoria dei vostri container. Se non sono impostati, il primo che perde memoria se la prende tutta e il kernel decide da solo chi uccidere. Se sono impostati troppo stretti, li state uccidendo voi — e in `dmesg`, non nei vostri log.
