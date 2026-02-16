---
title: "Pipeline CI/CD su Proxmox: Provisioning con OpenTofu e Deploy con Ansible via Semaphore"
date: 2026-02-14T12:00:00+01:00
description: Architettura di una pipeline CI/CD che provisiona VM su Proxmox con OpenTofu e automatizza il deploy con Ansible orchestrato da Semaphore
menu:
  sidebar:
    name: Pipeline Proxmox OpenTofu Ansible
    identifier: pipeline-proxmox-opentofu-ansible
    weight: 10
    parent: DEVOPS-CICD
tags: ["CI/CD", "OpenTofu", "Ansible", "Proxmox", "Semaphore", "Infrastructure as Code", "DevOps"]
categories: ["DevOps", "Automazione", "Infrastruttura"]
draft: true
---

## Il Contesto

Un'applicazione composta da più servizi containerizzati: backend API, frontend, database PostgreSQL e identity provider (Keycloak). Ogni ambiente (staging, produzione) gira su una VM dedicata, provisionata su un hypervisor Proxmox. Il deploy avviene via Docker Compose.

Il flusso manuale prevede: creare la VM dalla UI Proxmox, configurare SSH, copiare i file di configurazione, lanciare i container. Per un singolo ambiente il processo è gestibile. Per due ambienti con aggiornamenti frequenti, il costo di ogni deploy manuale si accumula - e con esso il rischio di errori e drift tra gli ambienti.

L'obiettivo è una pipeline che, dato un nuovo set di immagini, provisioni l'infrastruttura se necessario e deploji l'applicazione senza intervento manuale.

L'intero codice del progetto è disponibile nella cartella `demo/` accanto a questo articolo.

-----

## L'Architettura: Tre Strumenti, Tre Responsabilità

La pipeline separa orchestrazione, provisioning e deploy in tre componenti indipendenti. Ogni componente ha una singola responsabilità e interfacce definite verso gli altri.

| Fase | Strumento | Input | Output |
|------|-----------|-------|--------|
| 1. Polling | Jenkins | Container Registry | Nuove immagini rilevate |
| 2. Provisioning | OpenTofu | Template VM + `.tfvars` | VM attiva, IP statico |
| 3. Deploy | Semaphore + Ansible | VM IP + variabili | Stack Docker Compose |
| 4. Verifica | Jenkins | HTTP health check | Pipeline pass/fail |

### Jenkins: Orchestrazione

Jenkins rileva i cambiamenti nelle immagini tramite polling periodico sul container registry, gestisce le credenziali tramite il proprio credential store e coordina gli step successivi. Non sa come funziona OpenTofu né come Ansible esegue il deploy: si limita a invocare comandi e passare variabili.

### OpenTofu: Provisioning

OpenTofu provisiona la VM su Proxmox clonando un template pre-configurato. Lo state è persistito su PostgreSQL, e i workspace separano staging e produzione. Al termine dell'apply, restituisce l'IP della VM creata come output.

### Semaphore: Deploy

Semaphore riceve da Jenkins l'IP della VM e le variabili d'ambiente, esegue il playbook Ansible e restituisce il risultato del deploy. Agisce come interfaccia HTTP verso Ansible, eliminando la necessità di avere `ansible-playbook` installato sul nodo Jenkins.

La sostituibilità è una proprietà diretta di questa separazione. Jenkins non sa come funziona Ansible, Semaphore non sa da dove arriva l'IP della VM. Sostituire Jenkins con GitLab CI richiede modifiche solo al livello di orchestrazione.

-----

## Separare Compilazione e Deployment

Una scelta architetturale non scontata: il codice sorgente e il codice di deployment vivono in repository separati.

I repository sorgente (backend, frontend) compilano, costruiscono le immagini Docker e le pushano su un container registry. Il repository di deployment contiene i Dockerfile di base, la configurazione infrastrutturale (OpenTofu, Ansible) e i riferimenti alle immagini. Jenkins rileva le nuove immagini e, se presenti, committa automaticamente il bump di versione nel repository di deployment.

### Vantaggi

Il disaccoppiamento ha conseguenze pratiche. Il team di sviluppo non interagisce con la pipeline di deploy. Il repository di deployment non contiene codice applicativo. Cambiare lo strumento di CI (da Jenkins a GitLab, ad esempio) non richiede modifiche ai repository sorgente.

### Compromessi

Lo svantaggio è un livello di indirezione in più: per risalire da un deploy alla versione del codice sorgente serve attraversare il tag dell'immagine nel registry. In pratica, il git log del repository di deployment fornisce un audit trail sufficiente.

-----

## Il Jenkinsfile: Orchestrazione della Pipeline

Il Jenkinsfile definisce tre stage sequenziali: provisioning, deploy e verifica. La sezione `environment` è il punto centrale per la gestione dei secret.

### Iniezione dei Secret

```groovy
// deployment/cicd/Jenkinsfile
environment {
    // Secret da Jenkins Credentials - mai nel codice
    TF_VAR_proxmox_endpoint  = credentials('proxmox-url')
    TF_VAR_proxmox_api_token = credentials('proxmox-api-token')
    PG_CONN_STR              = credentials('pg-conn-str')
    SEMAPHORE_TOKEN          = credentials('semaphore-api-token')

    // Configurazione ambiente
    ENVIRONMENT = 'staging'
    TFVARS_FILE = "environments/${ENVIRONMENT}.tfvars"
}
```

Le variabili `TF_VAR_*` sono una convenzione di OpenTofu: vengono lette automaticamente come valori per le corrispondenti variabili Terraform. Le credenziali Jenkins restano nel credential store e vengono iniettate a runtime, mai serializzate nel workspace.

### Stage Infrastructure

```groovy
stage('Infrastructure') {
    steps {
        dir('deployment/opentofu') {
            sh 'tofu init -input=false'
            sh "tofu workspace select -or-create ${ENVIRONMENT}"
            sh "tofu plan -input=false -var-file=${TFVARS_FILE} -out=tfplan"
            sh 'tofu apply -input=false tfplan'
        }
        script {
            env.VM_IP = sh(
                script: 'cd deployment/opentofu && tofu output -raw vm_ip',
                returnStdout: true
            ).trim()
        }
    }
}
```

L'output `vm_ip` di OpenTofu diventa una variabile d'ambiente Jenkins, disponibile per gli stage successivi. Questo è il punto di contatto tra provisioning e deploy: un singolo indirizzo IP.

### Stage Deploy

```groovy
stage('Deploy') {
    steps {
        sh '''
            chmod +x deployment/cicd/semaphore-deploy.sh
            deployment/cicd/semaphore-deploy.sh
        '''
    }
}
```

Lo script `semaphore-deploy.sh` è un wrapper sulle API REST di Semaphore. Triggera un task template passando `VM_IP` come extra variable Ansible, poi fa polling sullo stato fino a completamento o timeout.

### Stage Verify

```groovy
stage('Verify') {
    steps {
        script {
            def retries = env.HEALTH_CHECK_RETRIES.toInteger()
            def delay = env.HEALTH_CHECK_DELAY.toInteger()

            for (int i = 1; i <= retries; i++) {
                def status = sh(
                    script: "curl -sf -o /dev/null -w '%{http_code}' http://${env.VM_IP}/ || true",
                    returnStdout: true
                ).trim()
                if (status == '200') {
                    echo "Health check passed on attempt ${i}/${retries}"
                    return
                }
                sleep(delay)
            }
            error("Health check failed after ${retries} attempts")
        }
    }
}
```

L'health check è l'ultimo gate della pipeline. Se l'applicazione non risponde con HTTP 200 entro il timeout configurato, la pipeline fallisce. Il retry con backoff gestisce il tempo di avvio dei container.

-----

## Il Template VM come Investimento

Il provisioning di una VM da zero (installazione OS, configurazione SSH, agent, cloud-init) richiede tempo manuale significativo. La pipeline lo elimina usando un template Proxmox pre-configurato.

Il template contiene:

* Ubuntu Server 24.04 con `cloud-init` e `qemu-guest-agent`
* Docker e Docker Compose plugin pre-installati
* Accesso SSH root con chiave pre-installata (in produzione, valutare un utente dedicato con `sudo` e disabilitare il login root)
* Pulizia del `machine-id` per la clonazione

La creazione del template è un'operazione una tantum. Ogni deploy successivo parte da un clone già configurato.

### Provisioning con OpenTofu

Il file `main.tf` definisce la VM come clone del template, con cloud-init per la configurazione di rete:

```hcl
# deployment/opentofu/main.tf
resource "proxmox_virtual_environment_vm" "app_vm" {
  name      = var.vm_name
  node_name = var.proxmox_node

  # Clone da template pre-configurato
  clone {
    vm_id = var.template_id
    full  = true
  }

  cpu {
    cores = var.vm_cores
    type  = "host"
  }

  memory {
    dedicated = var.vm_memory
  }

  # Cloud-init inietta IP statico e DNS al primo boot
  initialization {
    ip_config {
      ipv4 {
        address = var.vm_ip_cidr
        gateway = var.vm_gateway
      }
    }
    dns {
      servers = var.dns_servers
    }
  }

  agent {
    enabled = true
  }

  started = true
}
```

Il provider [`bpg/proxmox`](https://registry.terraform.io/providers/bpg/proxmox/latest/docs) gestisce l'interazione con l'API Proxmox. L'uso di `agent { enabled = true }` assicura che OpenTofu attenda l'avvio completo della VM (tramite qemu-guest-agent) prima di considerare la risorsa come creata.

> **Nota sulla sicurezza TLS**: la configurazione demo usa `insecure = true` nel provider perché i certificati Proxmox sono tipicamente self-signed. In un ambiente di produzione è consigliabile configurare un certificato valido o aggiungere la CA interna al trust store, per evitare il rischio di attacchi man-in-the-middle sulle credenziali API.

### Separazione per Ambiente

I valori specifici di ogni ambiente sono in file `.tfvars` separati:

```hcl
# deployment/opentofu/environments/staging.tfvars
proxmox_node   = "pve"
template_id    = 9000
vm_name        = "myapp-staging"

# Risorse ridotte rispetto a production
vm_cores          = 4
vm_memory         = 8192
vm_disk_size      = 32

# Rete
vm_ip_cidr = "192.168.1.201/24"
vm_gateway = "192.168.1.1"
dns_servers = ["8.8.8.8", "8.8.4.4"]

vm_tags = ["managed-by-opentofu", "staging"]
```

Questi file sono committati nel repository — contengono solo valori non sensibili. I secret (endpoint Proxmox, token API, connection string PostgreSQL) sono iniettati da Jenkins come variabili d'ambiente `TF_VAR_*`.

### Backend State su PostgreSQL

```hcl
# deployment/opentofu/main.tf
backend "pg" {}
```

Lo state di OpenTofu è persistito su PostgreSQL anziché su file locale. La connection string arriva dalla variabile d'ambiente `PG_CONN_STR`. I workspace OpenTofu (`staging`, `production`) separano lo state per ambiente all'interno dello stesso database.

-----

## Deploy con Ansible via Semaphore

Il playbook Ansible trasforma una VM vuota (ma con Docker pre-installato) in uno stack applicativo funzionante.

### Struttura del Playbook

```yaml
# deployment/ansible/deploy.yml
- name: Deploy applicazione con Docker Compose
  hosts: all
  become: true
  gather_facts: false

  tasks:
    - name: Crea directory applicazione
      ansible.builtin.file:
        path: "{{ app_dir }}"
        state: directory
        mode: "0755"

    - name: Genera docker-compose.yml dal template
      ansible.builtin.template:
        src: docker-compose.yml.j2
        dest: "{{ app_dir }}/docker-compose.yml"
        mode: "0644"

    - name: Genera file .env
      ansible.builtin.copy:
        dest: "{{ app_dir }}/.env"
        mode: "0600"
        content: |
          POSTGRES_USER={{ postgres_user }}
          POSTGRES_PASSWORD={{ postgres_password }}
          POSTGRES_DB={{ postgres_db }}

    - name: Pull immagini Docker
      ansible.builtin.command:
        cmd: docker compose pull
        chdir: "{{ app_dir }}"

    - name: Avvia stack Docker Compose
      ansible.builtin.command:
        cmd: docker compose up -d --force-recreate
        chdir: "{{ app_dir }}"

    - name: Attendi che lo stack sia healthy
      ansible.builtin.uri:
        url: "{{ health_check_url }}"
        method: GET
        status_code: 200
      register: health_result
      until: health_result.status == 200
      retries: "{{ health_check_retries }}"
      delay: "{{ health_check_delay }}"
```

Il playbook è lineare: crea la directory, genera la configurazione dai template, esegue pull e avvio dei container, verifica lo stato. Il flag `--force-recreate` assicura che i container vengano ricreati con la nuova configurazione anche se l'immagine non è cambiata.

### Il Template Docker Compose

Il file `docker-compose.yml.j2` è un template Jinja2 che Ansible risolve con le variabili definite in `group_vars/all.yml`:

```yaml
# deployment/ansible/templates/docker-compose.yml.j2 (estratto)
services:
  app:
    image: {{ app_image }}
    restart: unless-stopped
    environment:
      DATABASE_HOST: db
      DATABASE_PORT: "{{ db_port }}"
      DATABASE_USER: "{{ postgres_user }}"
      DATABASE_PASSWORD: "{{ postgres_password }}"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: {{ db_image }}
    restart: unless-stopped
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U {{ postgres_user }} -d {{ postgres_db }}"]
      interval: 5s
      retries: 10

  gateway:
    image: {{ gateway_image }}
    ports:
      - "{{ gateway_port }}:80"
    depends_on:
      - app
```

Il template completo, con reti, volumi e tutte le variabili d'ambiente, è nella cartella `demo/deployment/ansible/templates/`.

Un singolo template genera configurazioni per tutti gli ambienti. Le variabili di default sono in `group_vars/all.yml`, sovrascrivibili dalle Extra Variables di Semaphore. Il database espone un healthcheck che blocca l'avvio dell'applicazione fino a quando PostgreSQL non è pronto.

### Variabili Centralizzate

```yaml
# deployment/ansible/group_vars/all.yml
app_dir: /opt/app

# Immagini container - sovrascritte da Semaphore con il tag della build
app_image: "nginx:latest"
db_image: "postgres:17"
gateway_image: "nginx:latest"

# Porte
app_port: 8080
db_port: 5432
gateway_port: 80

# Database - password sovrascritta da Semaphore Credentials
postgres_user: "app"
postgres_password: "CHANGE_ME_in_semaphore"
postgres_db: "appdb"

# Health check
health_check_url: "http://localhost:{{ gateway_port }}/"
health_check_retries: 12
health_check_delay: 5
```

I valori di default sono placeholder generici. In un deploy reale, Semaphore sovrascrive `app_image` con il tag della build appena completata e `postgres_password` con il valore dal proprio credential store.

-----

## Gestione dei Secret

I file di configurazione committati (`*.tfvars`, `group_vars/all.yml`) contengono solo valori non sensibili: nomi VM, IP, porte, risorse.

I secret seguono due percorsi separati:

* **Credenziali infrastrutturali** (token Proxmox, connection string OpenTofu) — Jenkins Credentials, iniettate come variabili d'ambiente `TF_VAR_*` e `PG_CONN_STR`
* **Credenziali applicative** (password DB, admin Keycloak) — Semaphore Environment, passate come extra-vars Ansible

Nessun secret transita dal repository. Jenkins e Semaphore li iniettano a runtime nei rispettivi contesti.

-----

## Sviluppo Locale con Makefile

Il Makefile fornisce target di comodo per le operazioni più comuni, consentendo di testare i singoli componenti della pipeline senza passare da Jenkins:

```bash
# Anteprima modifiche infrastruttura
make infra-plan ENVIRONMENT=staging

# Applica le modifiche
make infra-apply ENVIRONMENT=staging

# Deploy diretto via Ansible (senza Semaphore)
make deploy-local VM_IP=192.168.1.201

# Health check
make verify VM_IP=192.168.1.201
```

Il target `deploy-local` esegue il playbook Ansible direttamente dalla macchina locale, utile per debug e sviluppo senza passare da Semaphore. La cartella `demo/` include anche un `docker-compose.yml` con valori hardcoded per testare lo stack localmente senza Ansible.

-----

## Cosa si Potrebbe Migliorare

La pipeline attuale usa polling (ogni 15 minuti) per rilevare nuove immagini. Un webhook dal container registry ridurrebbe la latenza tra pubblicazione e deploy a pochi secondi.

Il template VM è creato manualmente. Uno strumento come [Packer](https://www.packer.io/) potrebbe generarlo in modo riproducibile, eliminando l'unico step manuale rimasto nel processo.

L'health check verifica solo la raggiungibilità HTTP. In un contesto più maturo, la verifica potrebbe includere smoke test funzionali o controlli sulla versione deployata.

-----

## Riepilogo

L'architettura descritta copre:

1. **Rilevamento automatico** delle nuove immagini via polling sul container registry
2. **Provisioning** di VM Proxmox da template con OpenTofu e cloud-init
3. **Deploy** via Ansible orchestrato da Semaphore, con template Docker Compose parametrici
4. **Separazione** tra repository sorgente e repository di deployment
5. **Isolamento** dei secret tra Jenkins Credentials e Semaphore Environment
6. **Sviluppo locale** tramite Makefile e Docker Compose standalone

Ogni componente ha una singola responsabilità e interfacce definite. La sostituzione di uno strumento (ad esempio Jenkins con GitLab CI) richiede modifiche solo al livello di orchestrazione, senza impattare provisioning o deploy.

-----

## Risorse Utili

* **OpenTofu Documentation**: Per la sintassi HCL e i provider disponibili.
    * [OpenTofu Docs](https://opentofu.org/docs/)
    * [Proxmox Provider (bpg/proxmox)](https://registry.terraform.io/providers/bpg/proxmox/latest/docs)
* **Ansible Documentation**: Guida completa per playbook e best practice.
    * [Ansible Docs](https://docs.ansible.com/)
    * [Ansible Template Module](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html)
* **Semaphore**: Interfaccia web per Ansible con API REST.
    * [Semaphore UI](https://semaphoreui.com/)
    * [Semaphore API Docs](https://semaphoreui.com/api-docs/)
* **Jenkins Pipeline**: Sintassi dichiarativa per pipeline CI/CD.
    * [Jenkins Pipeline Docs](https://www.jenkins.io/doc/book/pipeline/)
* **Proxmox VE**: Hypervisor open source con API REST.
    * [Proxmox VE Docs](https://pve.proxmox.com/wiki/Main_Page)
    * [Cloud-Init Support](https://pve.proxmox.com/wiki/Cloud-Init_Support)
