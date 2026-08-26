---
title: "Un servizio non è tuo finché non lo sai ricreare"
seoTitle: "n8n self-hosted: OpenTofu, Ansible e LXC"
date: 2025-07-20T13:00:00.000Z
description: "Self-hosting n8n significa sostituire una dipendenza da un SaaS con una da voi stessi. Vale la pena solo se il servizio si ricostruisce da Git in un comando."
pillar: automatizzare
category: homelab
mode: how-to
tags:
  - n8n
  - Automazione
  - Homelab
  - DevOps
  - Self-Hosted
lang: it
reviewed: false
reproducibility: true
summary:
  - label: "Contesto"
    value: "n8n self-hosted nel homelab come alternativa ai SaaS di automazione"
    note: "Zapier e Make citati come termini di confronto"
  - label: "Stack"
    value: "OpenTofu provisiona, Ansible configura, Docker Compose esegue"
    note: "Tre livelli separati sullo stesso container LXC"
  - label: "Scelta"
    value: "Container LXC al posto della macchina virtuale"
    note: "Kernel dell'host condiviso: più leggero e trasparente di una VM"
  - label: "Risultato"
    value: "Servizio ricreabile da Git su qualsiasi nodo compatibile"
    note: "Configurazioni versionate e applicate in modo idempotente"
openItems:
  - "L'istanza resta confinata alla LAN con rete bridge e IP dedicato: l'esposizione diretta su Internet non fa parte del progetto"
  - "Il playbook cancella container e volumi esistenti prima del deploy: con dati da preservare quella fase va ripensata prima dell'uso"
  - "Le dipendenze Python per Docker sono pinnate a versioni precise: aggiornarle è una rivalutazione di compatibilità, non un passo automatico"
  - "La persistenza usa il volume Docker locale con il database SQLite interno di n8n: configurazioni a più istanze o database esterni sono fuori dal perimetro"
openNote: "Confini da conoscere prima di riusare lo stack così com'è."
---

Il servizio in homelab l'avete montato otto mesi fa. Funziona. E non avete la più pallida idea di cosa ci sia dentro: quale versione, quali variabili d'ambiente, quale pacchetto avete installato a mano quella sera che non partiva.

Finché gira, non è un problema. Diventa un problema il giorno in cui il disco muore, o volete spostarlo su un altro nodo, o semplicemente aggiornarlo — e scoprite che l'unica documentazione era la vostra memoria di allora.

**Self-hostare un servizio significa sostituire una dipendenza da un fornitore con una dipendenza da voi stessi.** È un buon affare a una condizione sola: che voi siate ricostruibili. Altrimenti avete solo cambiato il nome del punto singolo di guasto.

Questo è il percorso per [n8n](https://n8n.io/) — automazione di workflow, l'alternativa self-hosted a Zapier o Make — fatto in modo che il servizio si ricrei da Git. Il codice è su [monte97/homelab-n8n](https://github.com/monte97/homelab-n8n).

## Tre livelli, tre responsabilità

La ricostruibilità non viene dagli strumenti: viene dall'averli separati.

| Livello | Strumento | Risponde a |
|---|---|---|
| Infrastruttura | OpenTofu | quale macchina deve esistere |
| Configurazione | Ansible | cosa ci deve stare sopra |
| Esecuzione | Docker Compose | come gira il servizio |

Il valore della separazione si vede quando qualcosa cambia. Spostare il servizio su un altro nodo tocca solo il primo livello. Aggiornare n8n tocca solo il terzo. Cambiare distribuzione sotto tocca solo il secondo. **Se i tre livelli fossero uno script solo, ognuna di queste operazioni sarebbe una modifica a tutto.**

## Perché un container LXC e non una VM

La scelta di fondo è dove far girare la cosa, e vale la pena capirla perché è la meno reversibile.

LXC e Docker sono entrambi container e usano gli stessi meccanismi del kernel — namespace e cgroup, gli stessi [di cui è fatto un container Docker](/blog/automatizzare/docker/docker-internals/). Cambia cosa ci si mette dentro:

| | LXC — *system container* | Docker — *application container* |
|---|---|---|
| Obiettivo | un sistema operativo completo e autonomo | un singolo processo |
| Struttura | `systemd`, più servizi, utenti | un processo principale, stateless |
| Persistenza | pensato per essere stateful | immutabile, i dati stanno nei volumi |
| Filosofia | si comporta come una VM leggera | *cattle, not pets* |

Per un servizio di homelab che deve avere un IP sulla LAN, `systemd`, e un ciclo di vita lungo, il system container è l'astrazione giusta: la comodità di una macchina, senza il costo di un kernel a parte.

E qui va detto il rovescio: **kernel condiviso significa isolamento più debole di una VM.** In un homelab dietro la LAN è un compromesso ragionevole. Su un nodo che ospita anche codice di cui non vi fidate, non lo è.

## Il provisioning: cosa deve esistere

OpenTofu — il fork open source di Terraform — descrive il container come risorsa: template, risorse assegnate, rete bridge con IP dedicato.

Il punto che conta non è la sintassi, è **lo stato**. OpenTofu tiene traccia di cosa ha creato, e questo rende la differenza fra rilanciare e ricreare: applicare due volte lo stesso file non produce due container.

## La configurazione: cosa ci sta sopra

Ansible prende il container vuoto e lo porta a essere pronto. Tre scelte del playbook che vale la pena isolare, perché sono quelle che lo rendono riusabile invece che monouso.

**Variabili in un posto solo.** Tutto ciò che cambia fra un ambiente e l'altro sta in cima, e il resto del playbook lo referenzia:

```yaml
vars:
  n8n_data_dir: "/opt/n8n_data"
  n8n_port: 5678
  n8n_domain: "n8n.K8S2.homelab"
  n8n_timezone: "Europe/Rome"
  n8n_docker_image: "docker.n8n.io/n8nio/n8n"
```

**Il playbook si adatta al sistema, non lo assume.** Ansible raccoglie i *facts* della macchina target e il playbook li usa per decidere:

```yaml
- name: Install required system packages
  ansible.builtin.package:
    name: [ca-certificates, curl, gnupg, python3-pip]
    state: present
  when: ansible_os_family == "Debian"
```

È la differenza fra uno script che funziona sulla vostra distribuzione e un playbook che funziona su una famiglia di distribuzioni.

**Le dipendenze Python sono pinnate a versioni precise.** Non è pedanteria: le librerie Docker per Python hanno una storia di rotture fra versioni minori, e un provisioning che ieri funzionava e oggi no è esattamente il problema che stavamo eliminando. Il costo è che aggiornarle diventa una decisione, non un passo automatico.

## L'esecuzione: come gira

Il Compose finale è deliberatamente povero:

- **Configurazione minima** — solo le variabili d'ambiente strettamente necessarie. Ogni opzione in più è una cosa da ricordare quando qualcosa non parte.
- **Volume nominato** (`n8n_data`) per la persistenza: database SQLite interno, workflow, credenziali. È l'unica cosa che vale la pena salvare, ed è in un posto solo.
- **`restart: unless-stopped`**, perché un riavvio del nodo non deve richiedere un intervento.
- **Template Ansible** al posto dei valori: lo stesso file serve ambienti diversi.

## La trappola che c'è nel playbook

Una cosa va detta prima che qualcuno lo lanci: **il playbook cancella container e volumi esistenti prima del deploy.**

Per un provisioning da zero è corretto — garantisce che il risultato sia sempre lo stesso, che è il punto dell'idempotenza. Su un'istanza con dentro workflow e credenziali che vi servono, cancella tutto.

Se riusate questo stack su qualcosa che contiene già dati, quella fase va ripensata prima, non dopo.

## Quanto vale, in concreto

Il guadagno non è avere n8n gratis: il piano a pagamento di un SaaS costa meno di quanto valgono le vostre ore. **È che il servizio smette di essere un'installazione e diventa un file** — che si legge, si versiona, si applica su un altro nodo, e si ricostruisce dopo un guasto senza dipendere da cosa vi ricordate.

È la stessa differenza che c'è, su scala aziendale, fra un server che nessuno osa toccare e un ambiente che si ricrea. Cambia la dimensione, non il ragionamento.

## Da dove partire

Prendete il servizio di homelab che vi seccherebbe di più perdere e provate a scrivere, senza guardarlo, cosa ci gira sopra e come è configurato. Quello che non riuscite a scrivere è il debito.

Poi cominciate da un livello solo — il Compose versionato è già metà del lavoro. OpenTofu e Ansible hanno senso quando i servizi diventano più d'uno, e prima di allora sono macchinario.

## Risorse

- [Documentazione n8n](https://docs.n8n.io/) — configurazione e variabili d'ambiente
- [OpenTofu](https://opentofu.org/docs/) — il fork open source di Terraform
- [Ansible: playbook e best practice](https://docs.ansible.com/ansible/latest/playbook_guide/index.html)
- [Proxmox VE: container LXC](https://pve.proxmox.com/wiki/Linux_Container)
