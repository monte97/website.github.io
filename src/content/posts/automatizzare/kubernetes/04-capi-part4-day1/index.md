---
title: "CAPI Parte 4: Setup Pratico - Day 1 Operations"
seoTitle: "Cluster API su Proxmox: il primo cluster"
date: 2025-08-05T09:30:00.000Z
description: Guida completa al deployment iniziale di cluster Kubernetes utilizzando Cluster API (CAPI) - Da Zero a Cluster Funzionante
pillar: automatizzare
category: kubernetes
mode: how-to
tags:
  - Kubernetes
  - CAPI
  - Cluster API
  - Infrastructure as Code
  - DevOps
  - Day 1 Operations
lang: it
reviewed: false
series: homelab-capi
seriesOrder: 40
reproducibility: true
summary:
  - label: "Contesto"
    value: "Day 1: da Proxmox vuoto al primo workload cluster funzionante e verificato"
    note: "Obiettivo dichiarato: un cluster minimalmente funzionante"
  - label: "Prerequisiti"
    value: "Utente Proxmox dedicato con token API e template Talos pronto al clone"
    note: "Template VM 8700 costruito dall'ISO factory con datasource NoCloud"
  - label: "Strumento"
    value: "Python generator con Jinja2 per i manifest parametrici del cluster"
    note: "Configurazione default pronta in un file YAML"
  - label: "Risultato"
    value: "Cluster in fase Provisioned, kubeconfig estratto, controlli di base superati"
openItems:
  - "Le versioni indicate definiscono lo scenario: clusterctl 1.10.3, provider Proxmox 0.6.2, Kubernetes v1.32.0"
  - "Al termine del Day 1 il metrics server può non essere ancora disponibile: `kubectl top` è previsto fallire"
  - "Il perimetro si ferma a un cluster minimale verificato su nodi, DNS e connettività esterna: storage, ingress e monitoraggio restano esclusi"
figures:
  - kind: matrix
    at: il-cluster-cè-cosa-vuol-dire-davvero
    label: "Provisioned, verificato, utilizzabile"
    columns: ["Provisioned", "Verificato", "Utilizzabile"]
    rows:
      - label: "Il control plane risponde"
        cells: [full, full, full]
      - label: "I nodi sono Ready"
        cells: [full, full, full]
      - label: "etcd, scheduler e controller-manager in piedi"
        note: "provato, non assunto"
        cells: [empty, full, full]
      - label: "Storage persistente"
        cells: [empty, empty, full]
      - label: "Ingress"
        cells: [empty, empty, full]
      - label: "Observability"
        cells: [empty, empty, full]
      - label: "Politiche di accesso"
        cells: [empty, empty, full]
    legend:
      full: "c'è"
      empty: "non ancora"
    caption: "Dove finisce il Day 1 e comincia il Day 2"
    note: >
      La colonna di mezzo è quella che questo articolo aggiunge: un cluster verificato non
      è più capace di uno provisioned, ma se qualcosa si rompe domani sapete che non è
      nessuno dei punti già provati.
  - kind: flow
    at: comè-fatto-il-generatore
    label: "Dal file di configurazione ai manifest"
    nodes:
      - kind: "Config YAML"
        name: "I parametri, in un file solo"
        desc: "Nome del cluster, versione di Kubernetes, nodi Proxmox ammessi, endpoint del control plane. È l'unico file che si modifica a mano."
        edge: "in ingresso al template"
      - kind: "Template Jinja2"
        name: "La logica che sta fuori dai parametri"
        desc: "Condizionali e ripetizioni vivono qui, non nel file di configurazione: cambiare un valore non richiede di rileggere il template."
        key: true
        edge: "reso"
      - kind: "Cluster YAML"
        name: "Le risorse Cluster API da applicare"
        desc: "I manifest generati, pronti per kubectl apply. Sono un artefatto: si rigenerano, non si correggono a mano."
    caption: "I parametri stanno in un file, la logica in un altro: è la separazione che rende il deploy ripetibile"
---

Fra un Proxmox vuoto e un cluster Kubernetes funzionante c'è una lista di cose che devono essere giuste tutte insieme: un utente con i permessi esatti, un token che non scade, un template che si clona, un bridge di rete che risponde, un generatore che produce manifest coerenti.

Se una sola sbaglia, il cluster non fallisce: **resta in `Provisioning`**, che è la modalità di fallimento più costosa perché non dice cosa manca. E il tempo che serve a scoprirlo cresce con quanto sei andato avanti prima di accorgertene.

Questo articolo è la sequenza del giorno uno nell'ordine in cui va eseguita, con il controllo che chiude ogni passo prima di passare al successivo. La [parte precedente](/blog/automatizzare/kubernetes/02-capi-part2-internals/) spiega quali controller entrano in gioco e come leggerne lo stato: serve esattamente quando uno di questi controlli non passa.

## Configurazione Proxmox VE

### Utente API e permessi

Proxmox richiede un utente dedicato con permissions appropriate per l'automazione CAPI.

#### Creare utente e token

```bash
# SSH al Proxmox host
ssh root@192.168.0.10

# Creazione utente CAPI
pveum user add capi@pve --comment "Cluster API Automation User"

# Assignment ruolo Administrator
pveum aclmod / -user capi@pve -role Administrator

# Generazione API token
pveum user token add capi@pve capi-token --privsep 0
```

**Output atteso:**
```console
┌──────────────┬──────────────────────────────────────┐
│ key          │ value                                │
╞══════════════╪══════════════════════════════════════╡
│ full-tokenid │ capi@pve!capi-token                  │
├──────────────┼──────────────────────────────────────┤
│ info         │ {"privsep":"0"}                      │
├──────────────┼──────────────────────────────────────┤
│ value        │ 12345678-1234-1234-1234-123456789abc │
└──────────────┴──────────────────────────────────────┘
```

#### Verificare l'accesso all'API

```bash
# Test API connectivity
curl -k -H 'Authorization: PVEAPIToken=capi@pve!capi-token=12345678-1234-1234-1234-123456789abc' \
     "https://192.168.0.10:8006/api2/json/version"

# Expected response
{
  "data": {
    "version": "8.4",
    "repoid": "06a4bc2e6",
    "release": "8.4.0"
  }
}
```

### Creazione Talos Template

Il template VM rappresenta l'immagine base che verrà clonata per ogni nodo del cluster.

#### Scaricare l'immagine Talos ottimizzata

```bash
# Talos factory image con estensioni per Proxmox
wget https://factory.talos.dev/image/ce4c980550dd2ab1b17bbf2b08801c7eb59418eafe8f279833297925d67c7515/v1.10.5/nocloud-amd64.iso
```

Questa immagine include:
- **QEMU Guest Agent** per comunicazione VM-host
- **NoCloud datasource** per cloud-init integration
- **Optimized kernel** per virtualizzazione

#### Creare il template della VM

```bash
# Create template VM
qm create 8700 \
  --name "talos-template" \
  --ostype l26 \
  --memory 2048 \
  --balloon 0 \
  --cores 2 \
  --cpu cputype=host \
  --net0 virtio,bridge=vmbr0 \
  --scsi0 local-lvm:20 \
  --ide2 local:iso/nocloud-amd64.iso,media=cdrom \
  --boot order=ide2 \
  --agent enabled=1,fstrim_cloned_disks=1

# Convert to template
qm template 8700
```

#### Verificare il template

```bash
# Verify template creation
qm list | grep 8700
# Output: 8700 talos-v1.9.5-template   0    2048      0.00     20.00 template

# Check template configuration
qm config 8700 | grep -E "(name|template|agent|net0)"
```

### Configurazione del bridge di rete

Assicurarsi che il bridge di rete sia configurato correttamente per l'accesso dei cluster nodes.

#### Verificare il bridge

```bash
# Check existing bridges
ip link show type bridge

# Verify bridge configuration
cat /etc/network/interfaces | grep -A 10 vmbr0

# Example expected output:
auto vmbr0
iface vmbr0 inet static
    address 192.168.0.10/24
    gateway 192.168.0.1
    bridge-ports eno1
    bridge-stp off
    bridge-fd 0
```

#### Regole di firewall (facoltative)

```bash
# Allow Kubernetes API traffic
iptables -A INPUT -p tcp --dport 6443 -j ACCEPT
iptables -A FORWARD -p tcp --dport 6443 -j ACCEPT

# Allow pod-to-pod communication
iptables -A FORWARD -s 192.168.0.0/24 -d 192.168.0.0/24 -j ACCEPT

# Persist rules
iptables-save > /etc/iptables/rules.v4
```

---

## Preparare il management cluster

### Creare il cluster Kind

Il management cluster serve come control plane per orchestrare i workload clusters.

#### La configurazione di Kind

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: capi-management
```

```bash
# Create management cluster
kind create cluster --config kind-config.yaml

# Verify cluster
kubectl cluster-info --context kind-capi-management
kubectl get nodes -o wide
```

### Installare gli strumenti

#### Installare clusterctl

```bash
# Download latest clusterctl
curl -L https://github.com/kubernetes-sigs/cluster-api/releases/download/v1.10.3/clusterctl-linux-amd64 -o clusterctl

# Install
sudo install -o root -g root -m 0755 clusterctl /usr/local/bin/clusterctl

# Verify installation
clusterctl version
```

#### Configurare i provider

```bash
# Create clusterctl configuration directory
mkdir -p ~/.cluster-api

# Provider configuration
cat > ~/.cluster-api/clusterctl.yaml << EOF
providers:
  - name: "talos"
    url: "https://github.com/siderolabs/cluster-api-bootstrap-provider-talos/releases/v0.6.7/bootstrap-components.yaml"
    type: "BootstrapProvider"
  - name: "talos"
    url: "https://github.com/siderolabs/cluster-api-control-plane-provider-talos/releases/v0.5.8/control-plane-components.yaml"
    type: "ControlPlaneProvider"
  - name: "proxmox"
    url: "https://github.com/ionos-cloud/cluster-api-provider-proxmox/releases/v0.6.2/infrastructure-components.yaml"
    type: "InfrastructureProvider"
EOF
```

### Le variabili d'ambiente

```bash
# Create environment file
cat > .capi-env << 'EOF'
# Proxmox connection settings
export PROXMOX_URL="https://192.168.0.10:8006/"
export PROXMOX_TOKEN='capi@pve!capi-token'
export PROXMOX_SECRET="12345678-1234-1234-1234-123456789abc"
EOF

# Source environment
source .capi-env

# Make persistent (Optional)
echo "source .capi-env" >> .bashrc
```

### Inizializzare CAPI

```bash
# Initialize Cluster API
clusterctl init \
  --infrastructure proxmox \
  --ipam in-cluster \
  --control-plane talos \
  --bootstrap talos

# Verify installation
kubectl get pods --all-namespaces

# Check provider status
kubectl get providers -A
```

**Expected output:**
```console
NAMESPACE                           NAME                    TYPE                    VERSION   INSTALLED
capi-bootstrap-talos-system         bootstrap-talos         BootstrapProvider       v0.6.7    True
capi-control-plane-talos-system     control-plane-talos     ControlPlaneProvider    v0.5.8    True
capi-system                         cluster-api             CoreProvider            v1.10.3   True
capx-system                         infrastructure-proxmox  InfrastructureProvider  v0.6.2    True
```

---

## Il generatore Python, passo per passo

Per facilitare la creazione dei template per i workload cluster è stato creato un [repository specifico](https://github.com/monte97/homelab-capi). Per informazioni specifiche, fare riferimento alla [relativa documentazione](https://github.com/monte97/homelab-capi/blob/master/docs.md).  

### Installare le dipendenze

```bash
# Create virtual environment
python3 -m venv capi-generator-env
source capi-generator-env/bin/activate

# Install dependencies
pip install jinja2 pyyaml

# Verify dependencies
python -c "import jinja2, yaml; print('Dependencies OK')"
```

### Com'è fatto il generatore

Il Python generator implementa un sistema templating flessibile:

### Creare la configurazione di partenza

```bash
# Generate default configuration
python cluster_generator.py --create-config homelab.yaml

# Review generated configuration
cat homelab.yaml
```

La configurazione default include i parametri minimi per avviare un workload cluster:

```yaml
# Key sections del config file
cluster_name: "homelab-cluster"           # Nome cluster
kubernetes_version: "v1.32.0"             # Versione K8s
replicas: 1                               # Control plane nodes
allowed_nodes: ["K8S0", "K8S1", "K8S2"]   # Proxmox nodes
control_plane_endpoint:
  host: "192.168.0.30"                    # VIP address
  port: 6443                              # API port
# ... configurazioni dettagliate per VM, network, Talos
```

---

## Deploy del Primo Cluster Workload

### Controlli prima del deploy

Prima del deployment, validare che tutti i prerequisiti siano soddisfatti:

```bash
# Verify management cluster
kubectl get nodes -o wide
kubectl get pods --all-namespaces
```

### Generare la configurazione del cluster

```bash
# Generate homelab cluster configuration
python cluster_generator.py \
  --config homelab.yaml \
  --output homelab-cluster.yaml

# Review generated configuration
head -50 homelab-cluster.yaml
```

### Applicare il cluster

```bash
# Apply cluster configuration
kubectl apply -f homelab-cluster.yaml

# Verify resources created
kubectl get clusters,machines,machinedeployments -A -o wide
```

**Expected initial state:**
```console
NAME                    PHASE    AGE   VERSION
cluster/homelab-cluster           1m    

NAME                                      CLUSTER           NODENAME   PROVIDERID   PHASE      AGE   VERSION
machine/homelab-cluster-cp-abc123         homelab-cluster              proxmox://   Pending    1m    v1.32.0
```

### Seguire il deploy mentre avviene

Il deployment progredisce attraverso diverse fasi. Monitorare usando:

```bash
# Watch cluster progression
watch 'kubectl get clusters,machines -A -o wide'

# Monitor events for troubleshooting
kubectl get events --sort-by='.lastTimestamp' -A | tail -20

# Check specific machine status
kubectl describe machine homelab-cluster-cp-abc123
```

#### Fase 1: provisioning dell'infrastruttura

```bash
# Monitor Proxmox machines
kubectl get proxmoxmachines -A -o wide

# Check VM creation in Proxmox
qm list | grep -v template
```

**Expected progression:**
1. **ProxmoxMachine** resource creato
2. **VM clone** started in Proxmox
3. **VM boot** con Talos ISO
4. **Network configuration** applied

#### Fase 2: bootstrap

```bash
# Monitor bootstrap configuration
kubectl get talosconfigs -A -o wide

# Check bootstrap status
kubectl describe talosconfig homelab-cluster-cp-abc123
```

**Bootstrap activities:**
1. **Talos configuration** injection
2. **Kubernetes components** installation
3. **etcd cluster** initialization
4. **API server** startup

#### Fase 3: control plane pronto

```bash
# Check control plane status
kubectl get taloscontrolplane -A -o wide
```

#### Fase 4: worker node, se previsti

```bash
# Monitor worker deployment
kubectl get machinedeployment -A -o wide

# Watch worker machines
kubectl get machines -A | grep worker
```

### Quando il deploy si blocca

#### I blocchi più frequenti, e come uscirne

**1. VM Creation Failures**
```bash
# Check Proxmox machine status
kubectl describe proxmoxmachine homelab-cluster-cp-abc123

# Common causes:
# - Template not found (template_id: 8700)
# - Insufficient resources on source_node
# - Network bridge misconfiguration
```

**2. Bootstrap Failures**
```bash
# Check bootstrap configuration
kubectl get talosconfig homelab-cluster-cp-abc123 -o yaml

# Common causes:  
# - Invalid Talos configuration
# - Network connectivity issues
# - Cloud-init not working
```

**3. Control Plane Issues**
```bash
# Check control plane provider logs
kubectl logs -n capi-control-plane-talos-system deployment/capi-control-plane-talos-controller-manager

# Common causes:
# - etcd initialization failures
# - Certificate generation issues
# - API server startup problems
```

### Verificare che sia andata bene

Una volta completato il deployment:

```bash
# Verify cluster is ready
kubectl get cluster homelab-cluster -o wide
# Expected: PHASE=Provisioned, CONTROLPLANE=true, INFRASTRUCTURE=true

# Check all machines running
kubectl get machines -A -o wide
# Expected: All machines in "Running" phase

# Verify control plane endpoint
curl -k https://192.168.0.30:6443/version
# Expected: Kubernetes version response
```

---

## Accesso al Cluster Workload

### Estrarre il kubeconfig

```bash
# Extract kubeconfig from management cluster
kubectl get secret homelab-cluster-kubeconfig -o jsonpath='{.data.value}' | base64 -d > kubeconfig-homelab

# Test cluster access
kubectl --kubeconfig kubeconfig-homelab get nodes -o wide
```

**Expected nodes output:**
```console
NAME                        STATUS   ROLES           AGE   VERSION   INTERNAL-IP   EXTERNAL-IP
homelab-cluster-cp-abc123   Ready    control-plane   10m   v1.32.0   192.168.0.21  <none>
homelab-cluster-worker-xyz  Ready    <none>          8m    v1.32.0   192.168.0.22  <none>
homelab-cluster-worker-def  Ready    <none>          8m    v1.32.0   192.168.0.23  <none>
```

---

## Il cluster è pronto? I controlli del giorno uno

### Stato di salute del cluster

Prima di considerare completate le Day 1 Operations, è essenziale validare che il cluster sia in uno stato healthy e pronto per le configurazioni avanzate.

```bash
# Comprehensive cluster health check
kubectl --kubeconfig kubeconfig-homelab get componentstatuses
kubectl --kubeconfig kubeconfig-homelab get nodes -o wide
kubectl --kubeconfig kubeconfig-homelab get pods -A | grep -E "(kube-system|kube-public)"

# API Server responsiveness test
kubectl --kubeconfig kubeconfig-homelab cluster-info
kubectl --kubeconfig kubeconfig-homelab api-resources --verbs=list --namespaced -o name | head -10 | xargs -n 1 kubectl --kubeconfig kubeconfig-homelab get -A
```

### I componenti di sistema

```bash
# Verify etcd cluster health
kubectl --kubeconfig kubeconfig-homelab get pods -n kube-system -l component=etcd -o wide

# Check control plane components
kubectl --kubeconfig kubeconfig-homelab get pods -n kube-system -l tier=control-plane

# Verify scheduler and controller-manager
kubectl --kubeconfig kubeconfig-homelab get pods -n kube-system | grep -E "(scheduler|controller-manager)"
```

### Prove di rete di base

```bash
# DNS functionality test
kubectl --kubeconfig kubeconfig-homelab run dns-test --image=busybox --restart=Never -- nslookup kubernetes.default.svc.cluster.local

# Wait for pod completion and check results  
kubectl --kubeconfig kubeconfig-homelab logs dns-test

# Basic external connectivity test
kubectl --kubeconfig kubeconfig-homelab run network-test --image=busybox --restart=Never -- ping -c 3 8.8.8.8
kubectl --kubeconfig kubeconfig-homelab logs network-test

# Cleanup test pods
kubectl --kubeconfig kubeconfig-homelab delete pod dns-test network-test
```

### Service discovery

```bash
# Test service discovery
kubectl --kubeconfig kubeconfig-homelab get svc -A

# Verify kube-dns/coredns service
kubectl --kubeconfig kubeconfig-homelab get svc -n kube-system | grep dns

# Test service endpoint resolution
kubectl --kubeconfig kubeconfig-homelab get endpoints -n kube-system
```

### Risorse disponibili

```bash
# Check node resources
kubectl --kubeconfig kubeconfig-homelab describe nodes | grep -A 5 "Allocated resources"

# Verify system resource consumption
kubectl --kubeconfig kubeconfig-homelab top nodes --kubeconfig kubeconfig-homelab 2>/dev/null || echo "Metrics server not yet available (expected)"

# Check for any resource constraints
kubectl --kubeconfig kubeconfig-homelab get events --field-selector type=Warning -A
```

## Il cluster c'è. Cosa vuol dire davvero

Un cluster in `Provisioned` con i controlli di base superati non è un cluster di produzione: è un cluster **verificato**, che è una cosa diversa e più utile. Vuol dire che ogni prerequisito è stato provato invece che assunto, e che se qualcosa si romperà domani saprete che non è nessuno dei punti di questa lista.

Manca ancora tutto quello che rende un cluster utilizzabile da qualcun altro: storage persistente, ingress, osservabilità, politiche di accesso. Sono le Day 2 Operations, e cominciano da qui.

**Detto a chi non scrive `kubectl`:** la differenza fra questa sequenza e uno script che fa le stesse cose è che qui ogni passo lascia una prova. Quando fra sei mesi il cluster andrà ricostruito — perché l'hardware muore, o perché ne serve un secondo identico — la ricostruzione è una procedura ripetibile invece di una giornata di archeologia.

## Prima di passare oltre

Rifate gli ultimi tre controlli su un cluster che *sapete* essere sano, e leggete cosa restituiscono. Riconoscere l'output di un cluster a posto è l'unico modo per riconoscere in fretta quello di un cluster che non lo è.

La [parte successiva](/blog/automatizzare/kubernetes/05-capi-part5-ubuntu/) cambia il sistema operativo dei nodi: Ubuntu al posto di Talos, con Image Builder, e il motivo per cui a volte conviene.
