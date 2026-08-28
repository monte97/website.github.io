---
title: "Il cluster è fermo in Provisioning. Chi sta aspettando?"
seoTitle: "Cluster API: le CRD e il provisioning"
date: 2025-10-23T09:00:00.000Z
description: "Quattro CRD annidate e cinque fasi fra il kubectl apply e il cluster pronto. Sapere dove passa il controllo è l'unico modo per capire dove si è fermato."
pillar: automatizzare
category: kubernetes
mode: explanation
tags:
  - Kubernetes
  - Cluster API
  - CRD
  - Proxmox
  - Talos
lang: it
reviewed: false
series: homelab-capi
seriesOrder: 20
summary:
  - label: "Problema"
    value: "Un cluster resta in Provisioning e l'errore non è in un posto solo"
    note: "Il controllo passa fra quattro controller: senza sapere dove, si cerca a caso"
  - label: "Scelta"
    value: "Quattro CRD annidate — Cluster, MachineDeployment, MachineSet, Machine"
    note: "Le stesse relazioni di Deployment, ReplicaSet e Pod, applicate alle macchine"
  - label: "Strumento"
    value: "Provider separati per infrastruttura, bootstrap e control plane"
    note: "Cambiare da Proxmox a un altro provider non tocca le risorse Cluster e Machine"
  - label: "Risultato"
    value: "Cinque fasi dal manifest al kubeconfig, ognuna con la sua risorsa da ispezionare"
openItems:
  - "Le CRD mostrate sono in `v1beta1`: campi e nomi possono cambiare nelle versioni successive dell'API"
  - "I comandi di ispezione presuppongono il provider Proxmox: con un altro provider cambiano i nomi delle risorse di infrastruttura, non il metodo"
  - "La teoria generale dei controller Kubernetes — informer, cache, work queue — non è trattata qui: si dà per acquisita"
  - "Il flusso descritto è quello del percorso felice più i punti di blocco più frequenti: non è un catalogo completo dei modi in cui un provisioning può fallire"
---

`kubectl get cluster` dice `Provisioning`. È così da venti minuti.

La domanda non è cosa sia andato storto: è **dove guardare**. Perché in mezzo fra il `kubectl apply` e il cluster funzionante ci sono quattro controller diversi, ognuno con le proprie risorse e i propri log, e senza sapere a chi è passato il controllo si finisce a leggere i log sbagliati.

Questo articolo è la mappa di quel percorso. Non serve a costruire niente: serve a sapere, quando si blocca, quale risorsa interrogare.

> La teoria generale dei controller Kubernetes — informer, cache locale, work queue, riconciliazione — è il tema di [Il meccanismo dietro kubectl apply](/blog/automatizzare/kubernetes/02-k8s-controller/). Qui si dà per acquisita.

## Chi gestisce chi

Due ruoli, come [nella parte precedente](/blog/automatizzare/kubernetes/01-capi-part1-intro/): il **management cluster** ospita i controller e le risorse che descrivono la flotta, i **workload cluster** eseguono i carichi e non sanno di essere gestiti.

![Il management cluster ospita i controller CAPI e i provider, e agisce sull'infrastruttura per portare i workload cluster nello stato dichiarato](/images/posts/kubernetes/02-capi-part2-internals/management-cluster.svg)

Nel management cluster convivono quattro tipi di controller, e la separazione non è pedanteria: è ciò che permette di cambiare infrastruttura senza riscrivere le risorse.

- **Core controller** — gestisce `Cluster` e `Machine`, cioè le astrazioni indipendenti dalla piattaforma
- **Infrastructure provider** — parla con Proxmox: crea VM, dischi, rete
- **Bootstrap provider** — genera la configurazione che trasforma una macchina in un nodo
- **Control plane provider** — si occupa dell'inizializzazione e della salute del control plane

Un cluster su Proxmox e uno su un cloud pubblico condividono le stesse risorse `Cluster` e `Machine`. Cambia solo chi le esegue.

## Le quattro CRD, e perché sono quattro

La gerarchia ricalca una che conoscete già: `Deployment → ReplicaSet → Pod`. Qui è `MachineDeployment → MachineSet → Machine`, con `Cluster` sopra a tutto.

**`Cluster`** è il punto d'ingresso dichiarativo. Non contiene la configurazione dell'infrastruttura: contiene i *riferimenti* a chi la gestisce.

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-cluster
spec:
  clusterNetwork:
    services:
      cidrBlocks: ["10.96.0.0/16"]
    pods:
      cidrBlocks: ["10.244.0.0/16"]
  controlPlaneEndpoint:
    host: "192.168.1.100"
    port: 6443
  controlPlaneRef:                # chi gestisce il control plane
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: TalosControlPlane
    name: production-control-plane
  infrastructureRef:              # chi crea le macchine
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: ProxmoxCluster
    name: production-proxmox
```

I due campi che contano sono `controlPlaneRef` e `infrastructureRef`. Sono il punto di innesto dei provider, ed è lì che si sostituisce Proxmox con qualcos'altro lasciando invariato tutto il resto del file.

**`Machine`** è l'astrazione di una singola istanza destinata a diventare un nodo. Una `Machine` non è una VM: è la dichiarazione che una VM deve esistere, con una certa versione di Kubernetes e una certa configurazione di bootstrap.

**`MachineSet`** garantisce che N `Machine` identiche esistano, esattamente come un `ReplicaSet` fa con i Pod.

**`MachineDeployment`** aggiunge sopra la gestione degli aggiornamenti: cambiare la versione di Kubernetes dei worker significa modificare un campo e lasciare che le macchine vengano sostituite in modo controllato, non aggiornate sul posto.

**È questa la ragione dei quattro livelli**: separano *cosa deve esistere* da *quante ce ne devono essere* da *come si passa da una versione all'altra*. Confondere i tre significa tornare agli script.

## Dal manifest al cluster, in cinque fasi

Cosa succede davvero dopo l'`apply`, e chi ha il controllo in ogni momento:

| Fase | Chi agisce | Cosa produce |
|---|---|---|
| 1. Creazione risorse | API server | gli oggetti esistono, nessuna infrastruttura ancora |
| 2. Provisioning infrastruttura | Cluster controller → infrastructure provider → API Proxmox | le VM esistono |
| 3. Bootstrap | Machine controller → bootstrap provider | la configurazione Talos è generata e consegnata |
| 4. Inizializzazione control plane | control plane provider | il control plane risponde |
| 5. Kubeconfig | core controller | le credenziali per parlare col nuovo cluster |

Le fasi sono sequenziali e ogni passaggio di consegne è un punto in cui il processo può fermarsi. **Sapere in quale fase si è bloccato dice già quale controller interrogare**, ed è per questo che vale la pena tenerle distinte invece di pensare al provisioning come a un'unica operazione.

## Leggere lo stato quando si blocca

Tornando alla domanda dell'apertura. Tre livelli, nell'ordine in cui conviene guardarli.

**I controller sono vivi?** Se un provider non gira, tutto quello che dipende da lui resta fermo senza errori visibili sulle risorse.

```bash
kubectl get pods -n capi-system
kubectl get pods -n capx-system                 # infrastructure provider
kubectl get pods -n capi-bootstrap-talos-system
```

**Cosa dicono le risorse?** `describe` mostra le condizioni, che sono il posto in cui i controller scrivono perché non stanno procedendo.

```bash
kubectl get cluster production-cluster -o wide
kubectl get machines -A -o wide
kubectl describe cluster production-cluster
kubectl get events --sort-by='.lastTimestamp' -A
```

**E se il blocco è a livello di infrastruttura**, si scende alle risorse del provider:

```bash
kubectl get proxmoxclusters,proxmoxmachines -A -o wide
kubectl describe proxmoxmachine <machine-name>
```

Se anche lì non emerge niente, restano i log del controller responsabile della fase in cui si è fermato:

```bash
kubectl logs -n capi-system deployment/capi-controller-manager
kubectl logs -n capx-system deployment/capx-controller-manager
```

L'ordine non è casuale: si va dal generale al particolare, e ogni livello esclude una classe di cause.

## Quanto vale saperlo

Un provisioning che si ferma senza una mappa diventa mezza giornata di tentativi, ed è mezza giornata che si ripete a ogni incidente perché nessuno ha imparato niente. **La differenza fra un'infrastruttura dichiarativa che funziona e una che il team teme è tutta qui: se quando si blocca sapete dove guardare, il modello dichiarativo è un guadagno; se non lo sapete, avete solo aggiunto uno strato fra voi e le macchine.**

## Da provare adesso

Su un cluster CAPI già in piedi, lanciate `kubectl get machines -A -o wide` e `kubectl describe cluster <nome>` anche quando va tutto bene. Leggere le condizioni di un cluster sano è il modo più veloce per riconoscere, la prossima volta, quale non lo è.

La parte successiva entra in [Talos Linux](/blog/automatizzare/kubernetes/03-capi-part3-talos/) e nel motivo per cui un sistema operativo immutabile toglie di mezzo una classe intera di problemi sui nodi.
