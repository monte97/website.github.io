# Cluster API: automatizzare Kubernetes senza perdere il sonno

**Da script bash e SSH a infrastruttura dichiarativa con CAPI e Talos Linux**

- **Formato**: Talk 35 min + Q&A
- **Livello**: Intermedio
- **Target**: DevOps, platform engineer, SRE, chiunque gestisca cluster Kubernetes

---

## Abstract

Cinque cluster, quindici nodi, una patch di sicurezza urgente. Con l'approccio tradizionale significa SSH su ogni nodo, apt update, pregare che nulla si rompa. Con Cluster API significa cambiare una riga di YAML e applicare.

In questo talk mostro come CAPI porta l'Infrastructure as Code al lifecycle dei cluster Kubernetes: creazione, scaling, upgrade e disaster recovery diventano operazioni dichiarative, idempotenti e versionabili. Uso come caso concreto il mio homelab su Proxmox con Talos Linux, un sistema operativo immutabile progettato esclusivamente per Kubernetes: niente SSH, niente package manager, filesystem root read-only.

Il pubblico esce sapendo come funziona l'architettura CAPI, quando scegliere Talos vs Ubuntu, e come deployare un cluster da zero con `kubectl apply -f cluster.yaml`.

---

## Scaletta

### 1. Il problema (5 min)

- Apertura: "Quanti di voi hanno uno script bash per creare cluster Kubernetes? Quanti si fidano di eseguirlo due volte di fila?"
- Configuration drift: due nodi dello stesso cluster con `cgroupDriver` diverso. Nessun errore, solo comportamento inconsistente.
- L'approccio imperativo non scala: ogni nodo aggiunto e' un'opportunita' di errore.
- Transizione: "E se i cluster fossero gestiti come qualsiasi altra risorsa Kubernetes?"

### 2. CAPI: l'architettura (8 min)

- Concetto: un management cluster gestisce workload cluster tramite CRD e controller.
- I 4 provider: Infrastructure (Proxmox), Bootstrap (Talos/kubeadm), Control Plane, IPAM.
- Il reconciliation loop: desired state (YAML) → controller → actual state (infrastruttura) → feedback.
- Idempotenza: applico lo stesso manifest 3 volte, stesso risultato, zero side effect.
- Diagramma: management cluster → provider → workload cluster.

### 3. Talos Linux: l'OS immutabile (8 min)

- Il problema che Talos risolve: un OS general-purpose su un nodo Kubernetes e' superficie d'attacco inutile.
- Niente SSH, niente apt, niente utenti. Solo kubelet, containerd, networking.
- Filesystem root read-only: impossibile avere configuration drift.
- Gestione via API: `talosctl get members`, `talosctl logs kubelet`, `talosctl upgrade`.
- Upgrade atomici con rollback automatico se gli health check falliscono.
- Confronto superfice d'attacco: Ubuntu (~50 servizi) vs Talos (3 servizi).

### 4. Da zero a cluster: Day 1 operations (10 min)

- Il flusso completo: manifest YAML → `kubectl apply` → VM provisioning → bootstrap → control plane → kubeconfig.
- Demo (live o registrata):
  1. Management cluster con `kind`.
  2. `kubectl apply -f cluster.yaml` — la cascata di risorse: Cluster → ProxmoxCluster → ProxmoxMachine → VM.
  3. `watch kubectl get machines -A -o wide` — monitoraggio in tempo reale.
  4. `kubectl get nodes` sul nuovo cluster: tutti i nodi Ready.
- Scaling dichiarativo: `replicas: 1` → `replicas: 3`, CAPI provisiona 2 nuove VM, configura il control plane, aggiorna il load balancer. Zero downtime.

### 5. Talos vs Ubuntu: quando scegliere cosa (2 min)

- Talos: massima sicurezza, minima superficie d'attacco, zero drift. Ideale per produzione.
- Ubuntu con image-builder: piu' flessibilita', strumenti tradizionali, debugging con SSH. Ideale per team in transizione.
- Entrambi supportati da CAPI con lo stesso workflow.

### 6. Chiusura (2 min)

- "L'infrastruttura Kubernetes dichiarativa non e' piu' teoria. CAPI la rende production-ready."
- Il passo successivo: GitOps + CAPI = infrastruttura versionata, reviewata, automatizzata.
- Slide risorse: serie 5 articoli + repo homelab.
