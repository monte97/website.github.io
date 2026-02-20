# Tech Review Report

**Data:** 2026-02-14
**Articolo:** `index.md` — Pipeline CI/CD su Proxmox: Provisioning con OpenTofu e Deploy con Ansible via Semaphore
**Demo:** `demo/` — 12 file (Jenkinsfile, Makefile, main.tf, variables.tf, outputs.tf, staging.tfvars, deploy.yml, group_vars/all.yml, docker-compose.yml.j2, semaphore-deploy.sh, docker-compose.yml, README.md)
**Parole articolo:** 2202

---

## Verifica tecnica

**Scope:** articolo + demo code
**File verificati:**
- `index.md`
- `demo/Jenkinsfile`
- `demo/Makefile`
- `demo/docker-compose.yml`
- `demo/README.md`
- `demo/deployment/opentofu/main.tf`
- `demo/deployment/opentofu/variables.tf`
- `demo/deployment/opentofu/outputs.tf`
- `demo/deployment/opentofu/environments/staging.tfvars`
- `demo/deployment/ansible/deploy.yml`
- `demo/deployment/ansible/group_vars/all.yml`
- `demo/deployment/ansible/templates/docker-compose.yml.j2`
- `demo/deployment/cicd/semaphore-deploy.sh`

| # | Claim/Config | Esito | Dettaglio | Riga/File |
|---|-------------|-------|-----------|-----------|
| 1 | Provider source `"bpg/proxmoxve"` | **ERRORE FATTUALE** | Il source corretto nel Terraform Registry e' `"bpg/proxmox"`, non `"bpg/proxmoxve"`. Con `"bpg/proxmoxve"` il `tofu init` fallira' con "provider not found". Fonte: [Terraform Registry - bpg/proxmox](https://registry.terraform.io/providers/bpg/proxmox/latest) | `demo/deployment/opentofu/main.tf:20`, `index.md:231`, `index.md:481` |
| 2 | Semaphore API field `"cli_extra_args"` nel payload POST tasks | **ERRORE FATTUALE** | Il campo corretto nell'API Semaphore e' `"arguments"` (stringa, formato JSON array). `"cli_extra_args"` non esiste nello schema API. Il payload corretto e': `{"template_id": N, "arguments": "[\"-e\", \"target_host=IP\"]"}`. Fonte: [Semaphore API docs.yml](https://github.com/semaphoreui/semaphore/blob/develop/api-docs.yml) — POST `/project/{id}/tasks` | `demo/deployment/cicd/semaphore-deploy.sh:95`, `index.md:140` |
| 3 | Link risorse: URL provider Proxmox | **ERRORE FATTUALE** | Il link punta a `registry.terraform.io/providers/bpg/terraform-provider-proxmox/latest/docs` che non esiste. Il path corretto e' `registry.terraform.io/providers/bpg/proxmox/latest/docs`. | `index.md:481` |
| 4 | `insecure = true` nel provider Proxmox | **SECURITY** | Disabilita la verifica del certificato TLS, consentendo attacchi MITM. Il commento nel codice menziona di "valutare l'uso di un certificato valido" ma l'articolo non lo evidenzia. Rischio: le credenziali API token transitano in chiaro se c'e' un attaccante sulla rete. Mitigazione: usare un certificato valido (Let's Encrypt) o almeno documentare il rischio nell'articolo. | `demo/deployment/opentofu/main.tf:44` |
| 5 | Accesso SSH come root (`ANSIBLE_USER ?= root`) | **BAD PRACTICE** | Il template VM e l'intero flusso usano `root` come utente SSH. Best practice: creare un utente dedicato con `sudo` e disabilitare il login root via SSH. | `demo/Makefile:27`, `index.md:180` |
| 6 | `postgres_password: "CHANGE_ME_in_semaphore"` committato | **CONFERMATO (con caveat)** | Il valore e' un placeholder esplicito e il commento chiarisce che va sovrascritto. Tuttavia, se qualcuno deploya senza sovrascrivere, il DB sara' accessibile con una password nota. Alternativa: usare Ansible Vault o validare che la password non sia il placeholder prima del deploy. | `demo/deployment/ansible/group_vars/all.yml:54` |
| 7 | Convenzione `TF_VAR_*` per variabili OpenTofu | **CONFERMATO** | OpenTofu/Terraform leggono automaticamente le variabili d'ambiente `TF_VAR_nomevariabile`. Fonte: [OpenTofu Environment Variables](https://opentofu.org/docs/cli/config/environment-variables/) | `index.md:103`, `demo/Jenkinsfile:38-39` |
| 8 | Backend `pg` con `PG_CONN_STR` | **CONFERMATO** | Il backend pg di OpenTofu supporta la variabile d'ambiente `PG_CONN_STR` per la connection string. Fonte: [OpenTofu pg backend](https://opentofu.org/docs/language/settings/backends/pg/) | `index.md:265`, `demo/deployment/opentofu/main.tf:31` |
| 9 | Workspace OpenTofu per separare staging/production | **CONFERMATO (con caveat)** | I workspace separano lo state per ambiente. Tuttavia l'articolo menziona i workspace (riga 265) ma nel Jenkinsfile non c'e' il comando `tofu workspace select ${ENVIRONMENT}` prima del plan/apply. Senza questo, tutto usa il workspace "default". | `demo/Jenkinsfile:73-82`, `index.md:265` |
| 10 | `ansible.builtin.command` per `docker compose pull/up` | **BAD PRACTICE** | Ansible ha il modulo `community.docker.docker_compose_v2` dedicato che gestisce idempotenza e output strutturato. L'uso di `ansible.builtin.command` con `changed_when: true` segnala sempre "changed" anche quando non cambia nulla. Alternativa: usare `community.docker.docker_compose_v2`. Fonte: [Ansible docker_compose_v2 module](https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html) | `demo/deployment/ansible/deploy.yml:70-84` |
| 11 | `required_version = ">= 1.6.0"` per OpenTofu | **CONFERMATO** | OpenTofu 1.6.0 e' la prima release stabile (dicembre 2023). Il vincolo e' corretto e non troppo restrittivo. | `demo/deployment/opentofu/main.tf:16` |
| 12 | Provider version `">= 0.60.0"` per bpg/proxmox | **OUTDATED (minor)** | La versione attuale e' v0.95.0 (febbraio 2026). Il vincolo `>= 0.60.0` funziona ma e' molto lasco (36 minor versions di differenza). Considerare `>= 0.90.0` per evitare breaking changes delle versioni molto vecchie. Fonte: [GitHub releases bpg/terraform-provider-proxmox](https://github.com/bpg/terraform-provider-proxmox/releases) | `demo/deployment/opentofu/main.tf:21` |
| 13 | Sintassi HCL della risorsa `proxmox_virtual_environment_vm` | **CONFERMATO** | I blocchi `clone { vm_id, full }`, `cpu { cores, type }`, `memory { dedicated }`, `initialization { ip_config { ipv4 { address, gateway } }, dns { servers } }`, `agent { enabled }`, `started`, `disk`, `network_device`, `tags` corrispondono alla documentazione del provider. Fonte: [proxmox_virtual_environment_vm docs](https://registry.terraform.io/providers/bpg/proxmox/latest/docs/resources/virtual_environment_vm) | `demo/deployment/opentofu/main.tf:60-127` |
| 14 | Output `vm_ip` con `split("/", ...address)[0]` | **CONFERMATO** | L'indirizzo cloud-init e' in formato CIDR (`192.168.1.201/24`). Lo split sulla `/` per estrarre solo l'IP e' corretto e robusto. | `demo/deployment/opentofu/outputs.tf:18` |
| 15 | Health check doppio (Ansible + Jenkins) | **BAD PRACTICE (minor)** | Il playbook Ansible (deploy.yml:92-100) e lo stage Verify del Jenkinsfile (riga 123-150) eseguono entrambi un health check HTTP. Se il check Ansible passa, quello Jenkins e' ridondante. Se l'intento e' un check end-to-end da fuori la VM, documentarlo nell'articolo come scelta intenzionale. | `demo/deployment/ansible/deploy.yml:92-100`, `demo/Jenkinsfile:123-150` |
| 16 | Jenkins `credentials()` helper per Secret text | **CONFERMATO** | La sintassi `TF_VAR_x = credentials('id')` nel blocco `environment` e' corretta per credenziali di tipo Secret text. Il valore viene maskato nei log. Fonte: [Jenkins Pipeline - Using credentials](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-credentials) | `demo/Jenkinsfile:38-46` |
| 17 | `semaphore-deploy.sh`: parsing JSON con python3 inline | **BAD PRACTICE (minor)** | Lo script usa `python3 -c "import sys,json; ..."` per parsare JSON. Funziona, ma il commento dice "compatibile POSIX (senza dipendenza da jq)" il che e' fuorviante: python3 e' una dipendenza altrettanto pesante. Alternativa: usare `jq` (standard de facto per JSON in shell) o dichiarare esplicitamente la dipendenza python3. | `demo/deployment/cicd/semaphore-deploy.sh:103-104` |
| 18 | Articolo: "Le credenziali Jenkins restano nel credential store e vengono iniettate a runtime, mai serializzate nel workspace" | **CONFERMATO** | Il Credentials Binding plugin di Jenkins inietta i secret come variabili d'ambiente nel processo, non come file nel workspace (per il tipo Secret text). Fonte: [Jenkins Credentials Binding Plugin](https://plugins.jenkins.io/credentials-binding/) | `index.md:103` |
| 19 | Health check Ansible: `url: "http://localhost:{{ gateway_port }}/"` | **BAD PRACTICE** | L'URL usa `localhost`, ma il playbook gira sulla macchina Ansible controller (o su Semaphore), non sulla VM target. Dovrebbe usare l'IP della VM (`http://{{ ansible_host }}:{{ gateway_port }}/`) oppure `delegate_to: localhost` va aggiunto esplicitamente. Con `become: true` e `hosts: all`, il task URI viene eseguito sulla VM target, quindi `localhost` funziona, ma solo perche' `ansible.builtin.uri` non e' un comando shell — e' una connessione HTTP dal nodo target. | `demo/deployment/ansible/group_vars/all.yml:64`, `demo/deployment/ansible/deploy.yml:94` |
| 20 | Coerenza articolo-demo: main.tf nell'articolo omette `disk`, `network_device`, `timeouts` | **CONFERMATO (atteso)** | L'articolo mostra una versione semplificata del `main.tf` rispetto alla demo. E' prassi normale per un tutorial, e l'articolo rimanda alla demo per il codice completo. | `index.md:189-229` vs `demo/deployment/opentofu/main.tf` |
| 21 | Workspace OpenTofu non selezionato nel Jenkinsfile | **ERRORE FATTUALE** | L'articolo afferma (riga 265): "I workspace OpenTofu (`staging`, `production`) separano lo state per ambiente". Ma nel Jenkinsfile non c'e' `tofu workspace select ${ENVIRONMENT}` prima di plan/apply. Senza questo comando, tutte le pipeline usano il workspace "default", vanificando la separazione. Il commento in main.tf (riga 30) conferma l'intenzione: "Jenkins esegue `tofu workspace select staging` prima di plan/apply", ma il Jenkinsfile non lo implementa. | `demo/Jenkinsfile:71-83`, `index.md:265`, `demo/deployment/opentofu/main.tf:30` |
| 22 | `postgres:17` come immagine DB | **CONFERMATO** | PostgreSQL 17 e' l'ultima major release stabile (rilasciata settembre 2024). L'immagine `postgres:17` e' disponibile su Docker Hub. | `demo/deployment/ansible/group_vars/all.yml:32` |
| 23 | `.env` file generato con `mode: "0600"` | **CONFERMATO** | I permessi restrittivi (solo owner read/write) per un file che contiene password sono corretti e rappresentano una best practice. | `demo/deployment/ansible/deploy.yml:57` |

**Punteggio correttezza:** 6/10

---

### Priorita' correzioni

#### P0 (bloccanti) — errori che impediscono il funzionamento o creano vulnerabilita'

1. **#1 — Provider source `"bpg/proxmoxve"` errato**: `tofu init` fallira'. Correggere in `"bpg/proxmox"` in `main.tf`, nell'articolo e nel README.
2. **#2 — Campo Semaphore API `"cli_extra_args"` inesistente**: il deploy via Semaphore non funzionera'. Correggere in `"arguments"` con valore in formato JSON array: `"arguments": "[\"-e\", \"target_host=${VM_IP}\"]"`.
3. **#3 — Link provider nella sezione Risorse Utili**: URL non valido. Correggere da `bpg/terraform-provider-proxmox` a `bpg/proxmox`.
4. **#21 — Workspace non selezionato nel Jenkinsfile**: staging e production condivideranno lo stesso state, causando conflitti. Aggiungere `sh "tofu workspace select -or-create ${ENVIRONMENT}"` prima del plan.

#### P1 (importanti) — funziona ma sconsigliato

5. **#4 — `insecure = true` senza warning nell'articolo**: aggiungere una nota sulla sicurezza TLS nell'articolo.
6. **#5 — SSH come root**: documentare il rischio e suggerire un utente dedicato.
7. **#10 — `ansible.builtin.command` al posto di `community.docker.docker_compose_v2`**: l'idempotenza viene persa, i report Ansible sono meno informativi.
8. **#19 — Health check URL `localhost` nel playbook**: funziona perche' il task viene eseguito sulla VM, ma e' confuso. Aggiungere un commento che chiarisca il comportamento.

#### P2 (nice to have) — miglioramenti e chiarimenti

9. **#12 — Version constraint lasco (`>= 0.60.0`)**: considerare `>= 0.90.0`.
10. **#15 — Health check doppio**: documentare la scelta o rimuovere uno dei due.
11. **#17 — Commento fuorviante su "POSIX" con dipendenza python3**: correggere il commento o usare `jq`.

---

## Fonti consultate

| # | URL | Cosa verificato | Takeaway |
|---|-----|-----------------|----------|
| 1 | [Terraform Registry - bpg/proxmox](https://registry.terraform.io/providers/bpg/proxmox/latest) | Source name del provider | Il source corretto e' `"bpg/proxmox"`, versione attuale v0.95.0 |
| 2 | [bpg/proxmox VM resource docs](https://registry.terraform.io/providers/bpg/proxmox/latest/docs/resources/virtual_environment_vm) | Sintassi HCL della risorsa VM | Tutti i blocchi (clone, cpu, memory, initialization, agent, disk, network_device, tags) sono conformi alla documentazione |
| 3 | [GitHub releases bpg/terraform-provider-proxmox](https://github.com/bpg/terraform-provider-proxmox/releases) | Versione attuale provider | v0.95.0 rilasciata il 2026-02-08 |
| 4 | [OpenTofu pg backend](https://opentofu.org/docs/language/settings/backends/pg/) | Variabile d'ambiente `PG_CONN_STR` | Confermata come modo corretto per passare la connection string |
| 5 | [OpenTofu Environment Variables](https://opentofu.org/docs/cli/config/environment-variables/) | Convenzione `TF_VAR_*` | Confermata |
| 6 | [Semaphore API docs (api-docs.yml)](https://github.com/semaphoreui/semaphore/blob/develop/api-docs.yml) | Schema POST `/project/{id}/tasks` | Il campo per CLI args e' `"arguments"` (stringa), non `"cli_extra_args"` |
| 7 | [Semaphore issue #2367](https://github.com/semaphoreui/semaphore/issues/2367) | Formato campo arguments | Deve essere un JSON array (es. `["-e", "var=value"]`) |
| 8 | [Jenkins Pipeline - credentials()](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/) | Binding credentials come env vars | Confermato per Secret text: il valore viene iniettato direttamente nella variabile d'ambiente |
| 9 | [Jenkins Credentials Binding Plugin](https://plugins.jenkins.io/credentials-binding/) | Comportamento credential store | I secret non vengono scritti nel workspace per il tipo Secret text |
| 10 | [Ansible docker_compose_v2 module](https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html) | Alternativa a `ansible.builtin.command` per Docker Compose | Modulo dedicato con gestione idempotenza e output strutturato |
| 11 | [Ansible template module](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html) | Sintassi modulo template | Confermata la sintassi usata nel playbook |
| 12 | [Proxmox Cloud-Init Support](https://pve.proxmox.com/wiki/Cloud-Init_Support) | Funzionamento cloud-init su Proxmox | Confermato: il clone da template con cloud-init per IP statico e' un pattern supportato |
