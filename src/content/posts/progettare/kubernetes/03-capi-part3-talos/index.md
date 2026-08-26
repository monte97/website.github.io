---
title: "CAPI Parte 3: Talos Linux - Il Sistema Operativo per Kubernetes"
seoTitle: "Cluster API e Talos: l'OS immutabile"
date: 2025-08-05T09:30:00.000Z
description: Guida completa al deployment e gestione di cluster Kubernetes utilizzando Cluster API (CAPI) per l'automazione dell'infrastruttura
pillar: automatizzare
category: kubernetes
mode: explanation
tags:
  - Kubernetes
  - CAPI
  - Cluster API
  - Infrastructure as Code
  - DevOps
  - Automazione
lang: it
reviewed: false
series: homelab-capi
seriesOrder: 30
reproducibility: true
summary:
  - label: "Problema"
    value: "OS generalistici sui nodi: drift, superficie di attacco larga, manutenzione via SSH"
    note: "Un Ubuntu tipico porta con sé ~1847 pacchetti, pochi necessari a Kubernetes"
  - label: "Scelta"
    value: "Talos Linux: root filesystem read-only, gestione via API gRPC, niente shell"
    note: "Mutual TLS su tutte le comunicazioni"
  - label: "Prerequisiti"
    value: "Per Proxmox, ISO «no-cloud» con estensione `qemu-guest-agent`"
    note: "Estensioni aggiuntive solo quando servono, per restare minimali"
  - label: "Risultato"
    value: "Upgrade atomici con rollback automatico e rolling update senza downtime"
openItems:
  - "La sezione su monitoring e alerting è segnata dall'articolo stesso come ancora da testare"
  - "Solo `/var` resta scrivibile: dati persistenti e storage vanno pianificati a parte"
  - "Le cifre citate (~1847 pacchetti, ~50 servizi) descrivono un'installazione Ubuntu tipica, non un benchmark comparativo"
  - "L'integrazione con Prometheus e Grafana non è stata verificata su questo setup: Talos espone metriche, ma il percorso di scraping e le dashboard restano da provare sul proprio cluster"
openNote: "Aspetti da pesare prima di scegliere Talos."
---

Due nodi worker creati dallo stesso template, sei mesi fa. Oggi uno dei due ha una versione del kernel diversa, un pacchetto installato a mano per chiudere un incidente di marzo, e un file di configurazione che nessuno ricorda di aver toccato.

Nessuno l'ha fatto apposta. È il risultato di sei mesi di `apt upgrade`, di interventi urgenti e di accessi SSH che non hanno lasciato traccia. Si chiama **configuration drift**, e la sua conseguenza non è che i nodi siano diversi: è che **smettono di essere sostituibili**. Da quel momento ogni nodo è un caso a sé, e ricrearlo significa indovinare cosa aveva.

[Talos Linux](https://www.talos.dev/) toglie di mezzo il problema eliminando ciò che lo causa: non c'è una shell, non c'è un gestore di pacchetti, non c'è un modo di modificare un nodo dall'interno. Si configura via API, e si aggiorna sostituendo l'immagine intera.

Questo articolo è su cosa si guadagna con quel vincolo, e su cosa costa accettarlo.

### Problemi dei Sistemi Operativi Tradizionali

#### Configuration Drift e Snowflake Servers

I sistemi operativi tradizionali (Ubuntu, CentOS, RHEL) in ambiente Kubernetes soffrono di problemi strutturali:

```bash
# Scenario tipico su un nodo Ubuntu
ssh worker-node-01
sudo apt update && sudo apt upgrade -y
sudo systemctl restart kubelet
# Un mese dopo...
ssh worker-node-02  
sudo apt update && sudo apt upgrade -y
# Versioni diverse, configurazioni divergenti, comportamenti inconsistenti
```

Secondo il [2023 State of DevOps Report](https://cloud.google.com/devops/state-of-devops/), oltre il 60% delle organizzazioni lotta con la gestione della configurazione inconsistente nei sistemi distribuiti.

#### Surface di Attacco Estesa

I sistemi operativi general-purpose includono centinaia di pacchetti non necessari per Kubernetes:

```bash
# Tipica installazione Ubuntu Server
dpkg -l | wc -l
# Output: ~1847 pacchetti installati
# Di questi, quanti sono effettivamente necessari per Kubernetes? <20

# Servizi in esecuzione
systemctl list-units --type=service --state=running | wc -l  
# Output: ~50+ servizi
# Necessari per Kubernetes: kubelet, containerd, networking
```

#### Complessità di Manutenzione

La manutenzione di nodi Kubernetes tradizionali richiede:
- **SSH access** per troubleshooting e manutenzione
- **Package management** con potenziali conflitti di dipendenze
- **Manual patching** per security vulnerabilities
- **Configuration management** tools (Ansible, Puppet, Chef)

---

## Talos Linux: Architettura e Filosofia

### Principi di Design Fondamentali

[Talos Linux](https://github.com/siderolabs/talos) è progettato seguendo principi radicalmente diversi dai sistemi operativi tradizionali:

#### 1. API-First Design

**Nessun accesso SSH o shell tradizionale.** Tutta la gestione avviene tramite [gRPC API](https://www.talos.dev/v1.9/reference/api/) sicura e autenticata:

```bash
# Invece di SSH
talosctl -n 192.168.1.100 get members
talosctl -n 192.168.1.100 logs kubelet
talosctl -n 192.168.1.100 restart kubelet
```

#### 2. Infrastruttura Immutabile

Il filesystem root è **completamente read-only**, prevenendo modifiche runtime che causano drift:

```bash
# Filesystem structure in Talos
/
├── boot/          # Boot partition (read-only)
├── system/        # System partition (read-only, squashfs)
├── var/           # Persistent data (writable)
│   ├── lib/kubernetes/
│   ├── lib/containerd/
│   └── log/
└── tmp/           # Temporary files (tmpfs)
```

#### 3. Superficie di attacco minimale

Talos include **esclusivamente** i componenti necessari per eseguire Kubernetes:

- **Kernel Linux** ottimizzato
- **systemd** per service management
- **containerd** come container runtime
- **runc** per container execution
- **CNI plugins** per networking
- **kubelet** per Kubernetes integration

**Nessun shell, package manager, SSH daemon, o utility non essenziali.**

### Architettura Tecnica

#### La sequenza di avvio

Talos implementa un boot process deterministico basato su [systemd](https://systemd.io/):

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Kernel    │───▶│   systemd    │───▶│  Talos OS   │
│   Loading   │    │    Init      │    │  Services   │
└─────────────┘    └──────────────┘    └─────────────┘
                           │                    │
                           ▼                    ▼
                   ┌──────────────┐    ┌─────────────┐
                   │  Config      │    │ Kubernetes  │
                   │  Loading     │    │ Components  │
                   └──────────────┘    └─────────────┘
```

**Fasi del boot process:**
1. **Kernel initialization**: caricamento kernel e initramfs
2. **systemd startup**: inizializzazione dei servizi base
3. **Configuration loading**: lettura configurazione da meta-data sources
4. **Network setup**: configurazione interfacce di rete
5. **Kubernetes bootstrap**: avvio kubelet e join del cluster

#### Come si configura

Talos utilizza un approccio dichiarativo per la configurazione, simile a Kubernetes:

```yaml
# /var/lib/talos/config.yaml
version: v1alpha1
debug: false
persist: true
machine:
  type: controlplane
  token: "bootstrap-token"
  ca:
    crt: LS0tLS1CRUdJTi0tLS0t...
    key: LS0tLS1CRUdJTi0tLS0t...
  certSANs:
    - "192.168.1.100"
    - "cluster.local"
cluster:
  name: "production-cluster"
  controlPlane:
    endpoint: "https://192.168.1.100:6443"
  network:
    dnsDomain: "cluster.local"
    podSubnets:
      - "10.244.0.0/16"
    serviceSubnets:
      - "10.96.0.0/16"
```

#### Il modello di sicurezza

Talos implementa un security model basato su [mutual TLS (mTLS)](https://developers.cloudflare.com/cloudflare-one/identity/devices/mutual-tls-authentication/) per tutte le comunicazioni:

```bash
# Client certificate required per ogni operazione
talosctl --talosconfig ~/.talos/config config endpoint 192.168.1.100
talosctl --talosconfig ~/.talos/config config node 192.168.1.100

# Tutte le comunicazioni sono autenticate e crittografate
talosctl -n 192.168.1.100 version
# Client: v1.7.0
# Server: v1.7.0 (requires valid client certificate)
```

---

## Integrazione con Cluster API

### I provider Talos per CAPI

L'integrazione di Talos con CAPI avviene attraverso provider specializzati che sfruttano le caratteristiche native dell'OS:

#### 1. Il bootstrap provider

Il [Cluster API Bootstrap Provider Talos](https://github.com/siderolabs/cluster-api-bootstrap-provider-talos) (CABPT) genera configurazioni Talos invece di script cloud-init:

```yaml
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfig
metadata:
  name: worker-node-bootstrap
spec:
  generateType: "join"
  talosVersion: "v1.7.0"
  configPatches:
    - op: "add"
      path: "/machine/install"
      value:
        disk: "/dev/sda"
        image: "ghcr.io/siderolabs/installer:v1.7.0"
        wipe: false
    - op: "add"  
      path: "/machine/network/interfaces"
      value:
        - interface: "eth0"
          dhcp: true
```

**Vantaggi rispetto a cloud-init:**
- **Type safety**: configurazione validata a compile-time
- **Immutability**: nessuna possibilità di modifiche post-boot
- **Consistency**: stessa configurazione produce sempre lo stesso risultato
- **Security**: nessun shell script eseguito con privilegi elevati

#### 2. Il control plane provider

Il [Cluster API Control Plane Provider Talos](https://github.com/siderolabs/cluster-api-control-plane-provider-talos) (CACPPT) gestisce il ciclo di vita del control plane utilizzando l'API nativa di Talos:

```yaml
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
metadata:
  name: cluster-control-plane
spec:
  version: "v1.29.0"
  replicas: 3
  infrastructureTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: ProxmoxMachineTemplate
    name: control-plane-template
  controlPlaneConfig:
    controlplane:
      configPatches:
        - op: "add"
          path: "/cluster/etcd"
          value:
            ca:
              crt: LS0tLS1CRUdJTi0tLS0t...
              key: LS0tLS1CRUdJTi0tLS0t...
```

### La CRD TalosConfig nel dettaglio

Il Custom Resource `TalosConfig` rappresenta l'equivalente Talos del `KubeadmConfig`, ma con caratteristiche specifiche per l'OS immutabile:

#### I campi della specifica

```yaml
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfig
metadata:
  name: controlplane-config
spec:
  # Tipo di configurazione da generare
  generateType: "controlplane"  # controlplane, join, init
  
  # Versione Talos target
  talosVersion: "v1.7.0"
  
  # Patches di configurazione (RFC 6902 JSON Patch)
  configPatches:
    - op: "replace"
      path: "/machine/install/disk"
      value: "/dev/sda"
    - op: "add"
      path: "/machine/install/extensions"
      value:
        - image: "ghcr.io/siderolabs/qemu-guest-agent:9.0.0"
    - op: "add"
      path: "/machine/kernel/args"
      value:
        - "net.ifnames=0"
        - "console=tty0"
        - "console=ttyS0"
```

#### Il sistema di patch della configurazione

Talos utilizza [RFC 6902 JSON Patch](https://tools.ietf.org/rfc/rfc6902.txt) per modifiche declarative alla configurazione base:

```yaml
# Esempio: configurazione networking statico
configPatches:
  - op: "add"
    path: "/machine/network/interfaces"
    value:
      - interface: "eth0"
        addresses:
          - "192.168.1.100/24"
        routes:
          - network: "0.0.0.0/0"
            gateway: "192.168.1.1"
        nameservers:
          - "8.8.8.8"
          - "8.8.4.4"
```

**Vantaggi del patching:**
- **Composability**: patches multiple possono essere combinate
- **Reusability**: stesso patch applicabile a configurazioni diverse
- **Validation**: syntax e semantic validation automatica
- **Version control**: patches sono files YAML versionabili

### TalosControlPlane CRD

Il `TalosControlPlane` estende il concetto di control plane management con funzionalità specifiche di Talos:

```yaml
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
metadata:
  name: production-control-plane
spec:
  # Replica count per HA
  replicas: 3
  
  # Versione Kubernetes
  version: "v1.29.0"
  
  # Reference al template dell'infrastructure
  infrastructureTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: ProxmoxMachineTemplate
    name: control-plane-template
    
  # Configurazione Talos specifica
  controlPlaneConfig:
    init:
      configPatches:
        - op: "add"
          path: "/cluster/etcd/ca"
          value:
            crt: LS0tLS1CRUdJTi0tLS0t...
            key: LS0tLS1CRUdJTi0tLS0t...
    controlplane:
      configPatches:
        - op: "add"
          path: "/cluster/controllerManager/extraArgs"
          value:
            bind-address: "0.0.0.0"
            
  # Rolling update strategy
  rolloutStrategy:
    type: "RollingUpdate"
    rollingUpdate:
      maxSurge: 1
```

#### Campi di stato e monitoraggio della salute

```yaml
status:
  # Replica status
  replicas: 3
  readyReplicas: 3
  unavailableReplicas: 0
  
  # Initialization status
  initialized: true
  ready: true
  
  # Cluster health indicators
  selector: "cluster.x-k8s.io/control-plane=production-control-plane"
  
  # Version tracking
  version: "v1.29.0"
  
  # Condition tracking
  conditions:
    - type: "Ready"
      status: "True"
      lastTransitionTime: "2024-01-15T10:30:00Z"
    - type: "Available"
      status: "True"
      lastTransitionTime: "2024-01-15T10:30:00Z"
```

---

## Vantaggi Operativi di Talos

### 1. Eliminazione del Configuration Drift

#### Il problema tradizionale
```bash
# Node A (deployato 6 mesi fa)
ssh node-a
cat /etc/kubernetes/kubelet/config.yaml | grep cgroupDriver
# Output: cgroupDriver: systemd

# Node B (deployato ieri)  
ssh node-b
cat /etc/kubernetes/kubelet/config.yaml | grep cgroupDriver  
# Output: cgroupDriver: cgroupfs

# Risultato: comportamenti inconsistenti, troubleshooting complesso
```

#### Come lo risolve Talos
```bash
# Tutti i nodi hanno configurazione identica derivata dal template
talosctl -n node-a,node-b get kubeletconfig
# Output identico su entrambi i nodi - configurazione garantita consistente
```

### 2. Una superficie d'attacco più stretta

#### Il confronto sulla superficie d'attacco

| Componente | Sistema Tradizionale | Talos Linux |
|------------|---------------------|-------------|
| **Shell Access** | SSH daemon, bash, zsh | ❌ Nessun accesso shell |
| **Package Manager** | apt, yum, zypper | ❌ Nessun package manager |
| **Network Services** | SSH, rsyslog, cron, etc | ✅ Solo Kubernetes essentials |
| **User Accounts** | root, users, sudo | ❌ Nessun user account |
| **Filesystem** | Read-write, modificabile | ✅ Read-only root filesystem |
| **Configuration** | Files, scripts, manual | ✅ API-driven, validated |

#### Conformità e audit

Talos semplifica la compliance con standard security come [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes):

```bash
# Audit automatico via API
talosctl -n 192.168.1.100 get seccompprofiles
talosctl -n 192.168.1.100 get networkpolicy
talosctl -n 192.168.1.100 audit

# Output structured per compliance reporting
```

### 3. Manutenzione Semplificata

#### Come si aggiorna

Talos implementa **atomic upgrades** che eliminano i rischi di partial updates:

```bash
# Traditional OS upgrade (risky)
ssh worker-node
sudo apt update && sudo apt upgrade -y
sudo reboot  # Hope everything works...

# Talos upgrade (atomic)
talosctl -n 192.168.1.100 upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.1
# Rollback automatico se health checks falliscono
```

**Processo di upgrade:**
1. **Download** nuova image in background
2. **Validation** dell'image integrity
3. **Atomic switch** al nuovo rootfs
4. **Health checks** post-reboot
5. **Automatic rollback** se health checks falliscono

#### Manutenzione senza interruzioni

```yaml
# Rolling update automatico via CAPI
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
spec:
  version: "v1.29.1"  # Upgrade da v1.29.0
  rolloutStrategy:
    type: "RollingUpdate"
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime
```

### 4. Osservabilità e diagnosi

#### Log strutturati

Talos fornisce logging strutturato tramite API invece di file system tradizionale:

```bash
# Logs strutturati per ogni componente
talosctl -n 192.168.1.100 logs kubelet --follow
talosctl -n 192.168.1.100 logs etcd --follow  
talosctl -n 192.168.1.100 logs containerd --follow

# Machine logs per troubleshooting OS-level
talosctl -n 192.168.1.100 logs machined --follow
```

#### Metriche e stato di salute

```bash
# Health checks built-in
talosctl -n 192.168.1.100 health
# Output:
# ✓ etcd is healthy
# ✓ kube-apiserver is healthy  
# ✓ kubelet is healthy
# ✓ All conditions are met

# System metrics via API
talosctl -n 192.168.1.100 get cpustat,memstat,diskstats
```

---

## Integrazione con Proxmox

### Template Talos per Proxmox

La creazione di template Talos ottimizzate per Proxmox richiede configurazioni specifiche:

#### Configurazione del template VM

> Nota: __FONDAMENTALE__ scaricare l'iso con supporto a `cloud-init` (denominata "no-cloud") e aggiungere l'estensione `siderolabs/qemu-guest-agent`

```bash
# Download Talos ISO con estensioni Proxmox
wget https://factory.talos.dev/image/\
ce4c980550dd2ab1b17bbf2b08801c7eb59418eafe8f279833297925d67c7515/\
v1.10.5/nocloud-amd64.iso

# Template VM settings per Proxmox
qm create 8700 \
  --name "talos-template" \
  --ostype l26 \
  --memory 2048 \
  --balloon 0 \
  --cores 2 \
  --cpu cputype=host \
  --net0 virtio,bridge=vmbr0 \
  --scsi0 local-lvm:20,format=qcow2 \
  --ide2 local:iso/nocloud-amd64.iso,media=cdrom \
  --boot order=ide2 \
  --agent enabled=1,fstrim_cloned_disks=1
```

#### Le estensioni Talos per Proxmox

```yaml
# Configurazione con estensioni Proxmox-specific
configPatches:
  - op: "add"
    path: "/machine/install/extensions"
    value:
      # QEMU Guest Agent per integration con Proxmox
      - image: "ghcr.io/siderolabs/qemu-guest-agent:9.0.0"
      # Utilities addizionali se necessarie
      # - image: "ghcr.io/siderolabs/util-linux-tools:2.39.2"
  
  - op: "add"
    path: "/machine/kernel/args"
    value:
      # Network interface naming consistent
      - "net.ifnames=0"
      # Console output per Proxmox console
      - "console=tty0"
      - "console=ttyS0"
```

### Integrazione con cloud-init

Talos supporta [cloud-init](https://cloud-init.io/) per metadata injection, essenziale per l'automazione Proxmox:

```yaml
# Proxmox cloud-init configuration
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: ProxmoxMachine
spec:
  cloudInit:
    # User data contiene la configurazione Talos
    userData: |
      #cloud-config
      write_files:
        - path: /var/lib/talos/config.yaml
          permissions: '0600'
          content: |
            version: v1alpha1
            machine:
              type: controlplane
              # ... configurazione completa Talos
```

---

## Cosa tenere presente in produzione

### 1. Gestione dei dati persistenti

Talos mantiene solo `/var` come filesystem writable. Pianificare appropriatamente:

```yaml
# Configurazione storage per persistent volumes
configPatches:
  - op: "add"
    path: "/machine/disks"
    value:
      - device: "/dev/sdb"
        partitions:
          - mountpoint: "/var/lib/longhorn"
            size: "100GB"
            format: "ext4"
```

### 2. Configurazione di rete

Per ambienti enterprise, configurazione networking statica:

```yaml
configPatches:
  - op: "add"
    path: "/machine/network"
    value:
      interfaces:
        - interface: "eth0"
          addresses:
            - "192.168.1.100/24"
          routes:
            - network: "0.0.0.0/0"
              gateway: "192.168.1.1"
          vip:
            ip: "192.168.1.99"  # Virtual IP per control plane HA
```

### 3. Strategia sulle estensioni

Utilizzare extensions per funzionalità addizionali mantenendo minimalismo:

```yaml
# Extensions raccomandate per production
extensions:
  - "ghcr.io/siderolabs/qemu-guest-agent:9.0.0"      # Proxmox integration
  - "ghcr.io/siderolabs/util-linux-tools:2.39.2"     # Debug utilities
  - "ghcr.io/siderolabs/iscsi-tools:0.1.6"          # Storage integration
```

---

## Troubleshooting Comune

### 1. Il nodo non si avvia

```bash
# Console access tramite Proxmox
# Check boot logs
talosctl -n 192.168.1.100 logs machined --follow

# Common issues:
# - Invalid configuration format
# - Network connectivity problems  
# - Insufficient resources
```

### 2. Problemi di configurazione

```bash
# Validate configuration prima dell'apply
talosctl validate --config /path/to/talos-config.yaml

# Apply configuration con dry-run
talosctl -n 192.168.1.100 apply-config \
  --file /path/to/talos-config.yaml \
  --dry-run
```

### 3. Connettività di rete

```bash
# Network diagnostics
talosctl -n 192.168.1.100 get addresses
talosctl -n 192.168.1.100 get routes
talosctl -n 192.168.1.100 get resolvers

# Test connectivity
talosctl -n 192.168.1.100 get services
```

---

## Cosa si compra con quel vincolo

L'immutabilità non è una proprietà elegante: è un baratto. Si rinuncia alla possibilità di intervenire su un nodo — niente shell, niente patch al volo, niente debug con gli strumenti a cui si è abituati — e in cambio si ottiene che **ogni nodo sia identico a ogni altro per costruzione**, non per disciplina.

È il rovescio esatto dell'apertura: se non puoi modificare un nodo, non puoi nemmeno farlo divergere.

Il costo va detto per intero: quando qualcosa non funziona, si diagnostica via API con `talosctl` invece che entrando nella macchina, e questo richiede al team di imparare uno strumento nuovo proprio nel momento peggiore, cioè durante un incidente. Chi arriva da anni di Ubuntu lo sente.

**Tradotto per chi decide:** un parco nodi immutabile trasforma la sostituzione di una macchina da un intervento con esito incerto a un'operazione ripetibile — e la stessa proprietà rende la superficie d'attacco un fatto verificabile invece di una stima, perché non c'è niente da indurire che non sia già assente.

## Da dove partire

Prendete due nodi che dovrebbero essere identici e confrontateli davvero: versioni dei pacchetti, kernel, file di configurazione. La distanza che trovate è il drift che state già pagando, e sapere quanto è grande è il modo per capire se questo baratto conviene a voi.

La [parte successiva](/blog/progettare/kubernetes/04-capi-part4-day1/) è la sequenza pratica: da Proxmox vuoto al primo cluster workload verificato.
