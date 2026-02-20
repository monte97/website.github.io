# Tech Review — Pipeline CI/CD su Proxmox: OpenTofu + Ansible via Semaphore

**Reviewer**: Claude (tech-review)
**Data**: 2026-02-20
**Articolo**: `content/posts/devops-practices/cicd/pipeline-proxmox-opentofu-ansible/index.md`

---

## Riepilogo

Articolo solido che descrive un'architettura CI/CD concreta e ben separata. I code snippet sono sintatticamente corretti e coerenti tra loro. Le scelte architetturali sono giustificate e i compromessi dichiarati. Si segnalano alcune imprecisioni tecniche minori e opportunita di miglioramento sulla sicurezza.

---

## Issue

### P1 — Importante

#### 1. `PG_CONN_STR` non e la variabile corretta per il backend `pg` di OpenTofu

Il backend `pg` di OpenTofu/Terraform si aspetta la connection string nella variabile d'ambiente `PG_CONN_STR` **oppure** nel campo `conn_str` del blocco backend. L'articolo mostra `backend "pg" {}` vuoto e dice che la connection string arriva da `PG_CONN_STR`. In realta la variabile d'ambiente attesa e `PG_CONN_STR` per OpenTofu, ma storicamente Terraform usava `PG_CONN_STR`. Verificare che OpenTofu usi effettivamente questo nome — la documentazione OpenTofu conferma `PG_CONN_STR`, quindi l'articolo e corretto. **Nessuna azione richiesta dopo verifica.**

**Stato**: Verificato corretto. Non e un issue.

#### 2. Health check duplicato tra Ansible e Jenkins

Il playbook Ansible include un health check con `ansible.builtin.uri` (retries: 12, delay: 5 = 60s max), e lo stage Verify di Jenkins fa un altro health check con curl. Se il playbook fallisce il suo health check, Ansible restituisce errore e Jenkins non arriva mai al Verify. Se il playbook lo passa, il Verify di Jenkins e ridondante. L'articolo non commenta questa sovrapposizione.

- **File**: `index.md`, righe 307-315 e 136-156
- **Suggerimento**: Spiegare brevemente perche entrambi i check esistono (es. il check Ansible verifica dalla VM stessa via localhost, il check Jenkins verifica dall'esterno via IP di rete) oppure rimuovere uno dei due.

#### 3. `HEALTH_CHECK_RETRIES` e `HEALTH_CHECK_DELAY` non definiti nel Jenkinsfile

Lo stage Verify usa `env.HEALTH_CHECK_RETRIES` e `env.HEALTH_CHECK_DELAY` (righe 139-140) ma questi non sono definiti nel blocco `environment` mostrato (righe 80-90). Il lettore che copia il codice otterra un errore `NullPointerException` su `.toInteger()`.

- **File**: `index.md`, righe 139-140
- **Fix**: Aggiungere queste variabili al blocco `environment` oppure usare valori di default inline: `def retries = (env.HEALTH_CHECK_RETRIES ?: '10').toInteger()`

#### 4. Login al container registry mancante

Il task Ansible `docker compose pull` (riga 298-300) non mostra autenticazione verso il container registry. Se le immagini sono su un registry privato (scenario molto probabile dato il contesto), il pull fallira. Manca un task `docker login` o la configurazione di `~/.docker/config.json`.

- **File**: `index.md`, righe 298-300
- **Suggerimento**: Aggiungere un commento o un task che gestisca l'autenticazione al registry, oppure menzionare che il template VM ha gia le credenziali del registry pre-configurate.

### P2 — Minore

#### 5. `become: true` con `gather_facts: false`

Il playbook usa `become: true` (riga 274) il che implica che l'utente SSH non e root e serve sudo. Ma il template VM e descritto con "accesso SSH root con chiave pre-installata" (riga 171). Se ci si connette come root, `become: true` e superfluo. Se ci si connette come utente non-root (come suggerito nella nota di sicurezza), `gather_facts: false` potrebbe essere problematico se qualche task successivo richiede facts.

- **File**: `index.md`, righe 171 e 274
- **Suggerimento**: Chiarire la coerenza tra template (root SSH) e playbook (`become: true`).

#### 6. Moduli `ansible.builtin.command` per Docker Compose

I task `docker compose pull` e `docker compose up` usano `ansible.builtin.command` (righe 298-305). Questo modulo non e idempotente e non gestisce errori in modo strutturato. Esistono collection dedicate come `community.docker.docker_compose_v2`. L'uso di `command` e accettabile in questo contesto ma va contro le best practice Ansible.

- **Suggerimento**: Menzionare brevemente l'alternativa `community.docker.docker_compose_v2` e perche si e scelto `command` (semplicita, meno dipendenze).

#### 7. `--force-recreate` ricrea tutti i container

L'articolo dice che `--force-recreate` "assicura che i container vengano ricreati con la nuova configurazione anche se l'immagine non e cambiata" (riga 318). In realta `--force-recreate` ricrea tutti i container, incluso il database, il che causa downtime. Per ricreazione selettiva serve `docker compose up -d --force-recreate app gateway` escludendo `db`. Valutare se questo e il comportamento desiderato.

- **Suggerimento**: Commentare la scelta o usare `--force-recreate` solo sui servizi applicativi.

#### 8. Password di default nel repository

`group_vars/all.yml` contiene `postgres_password: "CHANGE_ME_in_semaphore"` (riga 379). Anche se e un placeholder, committare password di default in un repository puo violare policy di security scanning. Meglio usare `postgres_password: ""` con un `assert` nel playbook che verifichi che la variabile sia stata sovrascritta.

#### 9. Riferimento a cartella `demo/` inesistente nell'articolo

L'articolo menziona piu volte una cartella `demo/` (righe 25, 357, 423) ma non e chiaro se questa cartella esiste nel repository o se e prevista. Il lettore potrebbe cercarla invano.

- **Suggerimento**: Verificare che la cartella `demo/` esista o rimuovere i riferimenti.

#### 10. Il link al provider `bpg/proxmox` punta al Terraform Registry

Il link (riga 222 e 456) punta a `registry.terraform.io`. OpenTofu ha il proprio registry (`registry.opentofu.org`), anche se il Terraform Registry funziona ugualmente con OpenTofu. Per coerenza con la scelta di OpenTofu, sarebbe meglio linkare al registry OpenTofu o almeno menzionare la compatibilita.

#### 11. `insecure = true` menzionato ma non mostrato

La nota di sicurezza TLS (riga 224) menziona `insecure = true` nel provider, ma il code block del provider non lo mostra. Il lettore non sa dove inserirlo.

---

## Correttezza Fattuale

| Claim | Corretto? | Note |
|-------|-----------|------|
| `TF_VAR_*` convention per variabili OpenTofu | Si | Ereditata da Terraform, confermata nella doc OpenTofu |
| Backend `pg` con `PG_CONN_STR` | Si | Documentato in OpenTofu |
| Workspace separano lo state per ambiente | Si | Ogni workspace ha il suo state nel DB |
| `bpg/proxmox` provider per Proxmox | Si | Provider piu attivo e mantenuto per Proxmox |
| `agent { enabled = true }` attende qemu-guest-agent | Si | Comportamento documentato del provider |
| Semaphore come interfaccia HTTP per Ansible | Si | Semaphore UI espone API REST per triggering task |
| `cloud-init` per configurazione rete al primo boot | Si | Uso standard con Proxmox |

---

## Sicurezza

| Aspetto | Valutazione |
|---------|-------------|
| Secret non committati nel repo | OK — iniettati da Jenkins/Semaphore |
| Root SSH sul template | Segnalato dall'autore stesso come migliorabile |
| TLS `insecure = true` | Segnalato dall'autore con nota |
| Password placeholder in `group_vars` | P2 — vedi issue 8 |
| Registry auth mancante | P1 — vedi issue 4 |

---

## Punteggio

| Criterio | Voto |
|----------|------|
| Correttezza fattuale | 9/10 |
| Correttezza codice | 7/10 |
| Sicurezza | 7/10 |
| Versioni e compatibilita | 8/10 |
| Best practices | 7/10 |
| Completezza | 7/10 |
| **Media** | **7.5/10** |

---

## Verdetto

**Approvato con riserve**. L'articolo e tecnicamente solido e architetturalmente ben ragionato. I P1 (variabili mancanti nel Jenkinsfile, health check duplicato, registry auth) richiedono correzione prima della pubblicazione. I P2 sono miglioramenti consigliati ma non bloccanti.
