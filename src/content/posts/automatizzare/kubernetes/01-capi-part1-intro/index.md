---
title: "Un cluster Kubernetes come risorsa Kubernetes"
seoTitle: "Cluster API: cos'è e quando conviene"
date: 2025-10-21T09:00:00.000Z
description: "Lo script che aggiunge un nodo funziona finché non fallisce a metà. Cluster API rende il cluster una risorsa dichiarativa, con gli strumenti che usate già."
pillar: automatizzare
category: kubernetes
mode: explanation
tags:
  - Kubernetes
  - Cluster API
  - Proxmox
  - Talos
  - IaC
lang: it
reviewed: false
series: homelab-capi
seriesOrder: 10
summary:
  - label: "Problema"
    value: "Provisioning e upgrade dei cluster affidati a script imperativi e procedure manuali"
    note: "Uno script che fallisce a metà lascia uno stato che nessuno conosce"
  - label: "Scelta"
    value: "Cluster API: il cluster diventa una risorsa dichiarativa, riconciliata da un controller"
    note: "Si dichiara lo stato voluto, non la sequenza di passi per arrivarci"
  - label: "Strumento"
    value: "Management cluster su Kind, infrastruttura Proxmox VE, workload cluster su Talos"
  - label: "Ampiezza"
    value: "L'articolo inquadra il modello: i componenti e il flusso sono nelle parti successive"
openItems:
  - "Il modello dichiarativo sposta la complessità, non la elimina: il controller va aggiornato, osservato e capito quando si ferma"
  - "Il management cluster diventa una dipendenza critica: se non è disponibile, nessun workload cluster può essere modificato"
  - "Proxmox è la scelta di questo percorso perché offre controllo completo a costo contenuto: su un provider cloud i provider CAPI cambiano, i concetti no"
  - "Sotto una certa scala — due o tre cluster che cambiano di rado — il costo di imparare e mantenere CAPI può superare quello che fa risparmiare"
figures:
  - kind: flow
    at: il-banco-di-prova-kind-proxmox-e-talos
    label: "I tre pezzi del banco di prova"
    caption: "Su un cloud provider cambierebbe solo il pezzo di mezzo: è il senso di avere un'interfaccia standard"
    nodes:
      - kind: "Management"
        name: "Kind"
        desc: "Ospita i controller e le risorse che descrivono la flotta. All'inizio deve essere usa e getta: se serve ricrearlo, non deve essere un evento."
        edge: "chiama le API di Proxmox"
      - kind: "Infrastruttura"
        name: "Proxmox VE"
        desc: "Controllo completo sull'ambiente virtualizzato e una API REST su cui il provider CAPI può agire davvero. Non è un simulatore: è la stessa meccanica su scala minore."
        edge: "crea le macchine"
      - kind: "Workload"
        name: "Talos Linux"
        desc: "Sistema operativo immutabile, costruito per Kubernetes e senza shell: per costruzione toglie di mezzo la classe di problemi da configuration drift che l'approccio imperativo produceva."
        key: true
---

Lo script che aggiunge un worker node al cluster funziona. Lo lanciate, gira due minuti, il nodo compare in `kubectl get nodes`.

Poi una volta fallisce a metà. La VM è stata creata su Proxmox, il pacchetto `kubeadm` è installato, il `join` non è mai partito perché il token era scaduto. Adesso esiste una macchina che non è un nodo, che nessun inventario conosce, e che scoprirete fra tre mesi guardando la fattura o le risorse dell'hypervisor.

**Questo è il costo dell'approccio imperativo, e non è la fatica di scrivere lo script.** È che uno script descrive *come fare*, e quando si interrompe a metà lascia uno stato che nessuno ha dichiarato e che nessuno sa ricostruire.

## Il problema non è creare un cluster, è la sesta volta

Il primo cluster lo si monta a mano e va benissimo. La difficoltà arriva quando i cluster diventano più di uno e devono restare allineati nel tempo:

- **Script personalizzati** che nascono per un caso e vengono adattati agli altri, finché nessuno sa più quale sia la versione buona
- **Procedure manuali** documentate — si spera — in una pagina che è ferma a due upgrade fa
- **Configurazioni statiche** difficili da versionare, e quindi difficili da confrontare quando due cluster si comportano diversamente
- **Upgrade coordinati del control plane**, che è il momento in cui tutto quanto sopra si paga insieme

Il denominatore comune è che ogni intervento manuale introduce un punto di fallimento, e ogni punto di fallimento produce stato non dichiarato.

## Se il cluster è una risorsa, valgono le abitudini che hai già

[Cluster API](https://cluster-api.sigs.k8s.io/) ribalta la direzione: invece di descrivere i passi, **si dichiara il cluster che si vuole** e un controller si occupa di arrivarci — e di restarci.

L'idea in sé è quella che Kubernetes applica già ai container. Il cambio è nel soggetto: qui l'oggetto riconciliato non è un Pod, è un cluster intero, con le sue macchine e la sua infrastruttura sottostante.

La conseguenza pratica è quella che rende l'adozione ragionevole: **non serve imparare un nuovo modo di lavorare.** Un cluster si crea con `kubectl apply`, si ispeziona con `kubectl describe`, si versiona in Git e si applica con lo stesso flusso GitOps che già usate per i deployment. Gli stessi strumenti, la stessa forma mentale, un oggetto diverso.

E lo stato non dichiarato dell'apertura sparisce per costruzione: se la creazione si interrompe, la risorsa resta lì a dire cosa manca, e il controller riprova. Non c'è un punto in cui il processo esce lasciando dietro una macchina orfana e nessuna traccia.

## Management e workload: chi gestisce chi

CAPI separa due ruoli, ed è la distinzione da cui discende tutto il resto.

Il **management cluster** ospita i controller e le risorse che descrivono gli altri cluster. Non ci girano applicazioni: è la sala di controllo.

I **workload cluster** sono quelli veri, dove stanno i carichi. Non sanno di essere gestiti: sono il risultato della riconciliazione fatta altrove.

Il vantaggio è che l'intera flotta si descrive in un posto solo, versionabile. Il costo va detto subito: **il management cluster diventa una dipendenza critica.** Se non è disponibile, i workload continuano a girare — non è un proxy sul percorso del traffico — ma nessuno può più crearli, aggiornarli o scalarli finché non torna.

## Il banco di prova: Kind, Proxmox e Talos

Il percorso di questa serie usa tre pezzi:

**[Proxmox VE](https://www.proxmox.com/en/proxmox-virtual-environment/overview)** come infrastruttura, per tre motivi che contano più della gratuità: controllo completo sull'ambiente virtualizzato, una [API REST](https://pve.proxmox.com/wiki/Proxmox_VE_API) su cui il provider CAPI può agire davvero, e un realismo operativo confrontabile con un ambiente enterprise. Un homelab su Proxmox non è un simulatore: è la stessa meccanica su scala minore.

**Kind** per il management cluster, perché all'inizio deve essere sacrificabile. **[Talos Linux](https://www.talos.dev/)** per i workload, perché è un sistema operativo immutabile pensato per Kubernetes e senza shell: elimina per costruzione la classe di problemi da configuration drift che l'approccio imperativo produceva.

Su un provider cloud cambierebbe il provider di infrastruttura e resterebbe identico tutto il resto. È il senso di avere un'interfaccia standard.

## Quanto vale, fuori dal team infrastrutturale

La differenza non è il tempo per creare un cluster: quello si misura in minuti in entrambi i modi. È che **la conoscenza di come sono fatti i vostri cluster smette di stare nella testa di chi ha scritto gli script e passa in un file che si legge, si rivede e si applica** — con la conseguenza che ricostruire un ambiente dopo un guasto diventa un'operazione ripetibile invece di un progetto.

## Da dove partire

Prima di installare qualcosa: contate i cluster che gestite e chiedetevi quante persone saprebbero ricrearne uno da zero oggi. Se la risposta è "una", il problema di questo articolo ce l'avete già.

Se la risposta è "sono due cluster e cambiano una volta l'anno", CAPI probabilmente è più macchinario di quanto serva — e vale la pena saperlo prima, non dopo aver montato un management cluster.

La parte successiva entra nei componenti: [le CRD e il flusso di provisioning](/blog/automatizzare/kubernetes/02-capi-part2-internals/), cioè cosa succede davvero fra il `kubectl apply` e il cluster funzionante.
