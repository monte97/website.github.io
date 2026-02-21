# Content Plan 2026 — montelli.dev

> Generato il 2026-02-21 basandosi sull'inventario del blog (22 pubblicati, 21 draft, 8 progetti portfolio)

---

## Blog (montelli.dev)

### Serie da completare/estendere (priorità alta)

1. **Performance Engineering parte 2-3** — Hai solo l'intro. Mancano articoli pratici su k6 (hai il progetto portfolio!), load testing in CI/CD, analisi risultati con Grafana
2. **CAPI Parte 6: Day 2 Operations** — ArgoCD, GitOps, upgrade cluster, disaster recovery. La serie CAPI è il tuo fiore all'occhiello e si ferma al deploy
3. **Playwright parte 4: Visual Regression Testing** — Gap naturale dopo CI/CD e OTel correlation

### Articoli standalone nuovi

4. **"GitOps con ArgoCD: dalla teoria al homelab"** — Hai ArgoCD nel progetto homelab ma zero articoli dedicati. È un topic molto cercato
5. **"Platform Engineering in pratica: cosa ho imparato costruendo il mio homelab"** — Articolo trasversale che collega CAPI + OTel + Keycloak + ArgoCD. Posizionamento come platform engineer
6. **"Terraform è morto? OpenTofu in produzione"** — Hai esperienza reale (pipeline Proxmox). Topic controverso, alto engagement
7. **"Go per DevOps engineer: scrivere un Kubernetes Operator"** — Evoluzione naturale dell'articolo sui controller K8s. Hai Go nel progetto order-processing

### Serie nuove

8. **Serie "Event-Driven Architecture"** (3 parti) — Hai Kafka, Pekko, Avro ma manca il quadro architetturale: pattern (saga, outbox, CQRS), quando usarli, anti-pattern
9. **Serie "Authorization moderna: OPA e OpenFGA"** (3-4 parti) — Evoluzione naturale della serie Keycloak (che si ferma a OPA). Percorso:
   - Parte 1: **"Autorizzazione oltre i ruoli: perché RBAC non basta"** — Limiti di RBAC, introduzione a ReBAC e ABAC, quando serve cosa
   - Parte 2: **"OPA in profondità: policy-as-code per microservizi"** — Estensione dell'articolo Keycloak+OPA, Rego avanzato, testing policy, bundle management
   - Parte 3: **"OpenFGA: Relationship-Based Access Control in pratica"** — Modello Zanzibar, authorization model, tuple store, confronto con OPA
   - Parte 4: **"OPA vs OpenFGA: quale scegliere (e quando usarli insieme)"** — Decision framework, architettura ibrida, pattern reali

---

## TheRedCode

Articoli divulgativi, tono conversazionale, 3-4 min lettura:

1. **"Observability spiegata a chi fa solo console.log"** — Derivato dalla serie OTel, semplificato. Hook fortissimo
2. **"Perché dovresti testare le performance PRIMA di andare in produzione"** — Dal tuo intro performance engineering, tagliato per dev generalisti
3. **"Keycloak: autenticazione senza reinventare la ruota"** — Overview dalla serie Keycloak, focus su "perché non fare auth custom"
4. **"DevContainers: basta con 'funziona sulla mia macchina'"** — Adattamento dell'articolo esistente, più corto e pratico
5. **"Docker non è una VM: cosa succede davvero sotto il cofano"** — Dal tuo docker-internals, taglio divulgativo
6. **"Autorizzazione nei microservizi: OPA, OpenFGA e il mondo dopo RBAC"** — Overview divulgativa del tema authorization moderna, accessibile a dev generalisti

---

## Conferenze / Meetup

### Talk da 40 min

1. **"Da console.log a distributed tracing: il viaggio dell'observability"** — La tua serie OTel condensata in un percorso narrativo. Demo live con lo stack LGTM
2. **"Platform Engineering nel garage: costruire un homelab production-grade"** — Storytelling: dal caos alla piattaforma. CAPI + Talos + ArgoCD + OTel. Talk aspirazionale
3. **"Event Streaming oltre il tutorial: Kafka, Schema Registry e stream processing in Scala"** — Serie Kafka condensata. Demo: producer Python → Avro → Pekko consumer

4. **"RBAC è morto? Authorization moderna con OPA e OpenFGA"** — Percorso da RBAC classico a policy-as-code (OPA) a ReBAC (OpenFGA). Demo: stessa app, 3 modelli di autorizzazione a confronto

### Talk da 20 min / Lightning

4. **"5 problemi reali integrando Keycloak (e come li ho risolti)"** — Dal tuo articolo "6 problemi reali". Formato war-stories, molto engaging
5. **"Playwright + OpenTelemetry: quando il test E2E debugga il backend"** — Articolo già scritto, perfetto per demo live
6. **"Il Kubernetes Controller spiegato con analogie: camerieri, cuochi e ristoranti"** — Divulgativo, buon talk per community day

### Workshop (2-4h)

7. **"Workshop: Observability hands-on con OpenTelemetry e LGTM Stack"** — Hai già 8 articoli di materiale. Enorme vantaggio competitivo
8. **"Workshop: Keycloak da zero a produzione"** — Hai il progetto portfolio dedicato + 5 articoli

---

## Post LinkedIn standalone

Post che non derivano da articoli ma dalla tua esperienza:

1. **"Ho costruito un homelab production-grade. Ecco 3 cose che non avrei mai imparato in azienda"** — Angle: learning by building. Collega al blog senza essere promo
2. **"Unpopular opinion: la maggior parte dei team non ha bisogno di microservizi. Ha bisogno di observability"** — Contrarian take, supportato dalla tua esperienza OTel
3. **"Il mio stack 2026 per side project: OpenTofu + Talos + ArgoCD + LGTM"** — Listicle tecnico, alto engagement, mostra competenza trasversale
4. **"Ho smesso di scrivere test E2E fragili quando ho capito una cosa: il problema non era Playwright, era l'architettura dei test"** — Hook forte, linka alla serie Playwright
5. **"3 errori che facevo con Kafka (e che vedo fare a tutti)"** — War stories, dalla serie Kafka
6. **"Scrivo articoli tecnici da [N] mesi. Ecco cosa ho imparato sul content creation per dev"** — Meta-post, alto engagement nella community tech italiana
7. **"RBAC non scala. Ecco cosa uso al suo posto"** — Contrarian hook, introduce OPA/OpenFGA come alternativa concreta. Linka alla serie authorization

---

## Priorità

| Priorità | Azione | Perché |
|----------|--------|--------|
| 🔴 Alta | Pubblica i 3 draft Kafka + 4 draft Keycloak | Hai serie complete ferme in draft |
| 🔴 Alta | Performance Engineering pt.2 (k6 pratico) | Colma il gap più grande |
| 🟡 Media | Talk OTel + Workshop Keycloak | Massimo ROI dal contenuto esistente |
| 🟡 Media | 2-3 post LinkedIn standalone | Brand building con effort minimo |
| 🟢 Bassa | Articoli nuovi (ArgoCD, Platform Eng) | Dopo aver pubblicato il backlog |
