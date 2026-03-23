# Bulk English Translations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `index.en.md` editorial adaptations for all 42 Italian blog posts currently missing an English version.

**Architecture:** 9 independent translation batches executed in parallel (one subagent per batch), each reading Italian source files and writing English adaptations. Single commit on `feat/translations-bulk` after all batches complete.

**Tech Stack:** Astro content collections, Markdown frontmatter, no build tooling required for translation tasks.

**Spec:** `docs/superpowers/specs/2026-03-23-bulk-translations-design.md`

---

## Translation Agent Instructions (applies to ALL tasks below)

Every translation subagent MUST follow these rules:

### What to produce
For each article in the batch, create `index.en.md` in the same directory as `index.md`.

### How to translate
- **Read the Italian `index.md` first** — always, do not infer content from slug names
- **Editorial adaptation**, not literal translation: write natural technical English
- Adapt analogies for an international audience where needed
- Reorganize sections if the flow improves in English
- Style reference: `src/content/posts/verificare/observability/01-observability/index.en.md`

### Frontmatter rules
```yaml
---
title: "[Adapted English title]"
date: [copy from IT]
description: "[Adapted English description]"
pillar: [copy from IT]
category: [copy from IT]
tags: [copy from IT]
series: [copy from IT if present]
seriesOrder: [copy from IT if present]
heroImage: [copy from IT if present, omit if absent]
lang: en
reviewed: machine
---
```

**Do NOT include:** `draft`, `reproducibility`, any IT-only fields.

### Ignore
Any `.pipeline/` subdirectories inside post folders.

---

## Task 0: Create branch

**Files:** git branch only

- [ ] **Step 1: Create and checkout branch**

```bash
git checkout -b feat/translations-bulk
```

- [ ] **Step 2: Verify branch**

```bash
git branch --show-current
```
Expected output: `feat/translations-bulk`

---

## Task 1: Translate verificare/observability (5 articles)

**Files to create:**
- `src/content/posts/verificare/observability/04-correlation/index.en.md`
- `src/content/posts/verificare/observability/05-management/index.en.md`
- `src/content/posts/verificare/observability/06-routing/index.en.md`
- `src/content/posts/verificare/observability/07-keycloak-pii/index.en.md`
- `src/content/posts/verificare/observability/08-console-to-grafana/index.en.md`

**Sources to read:**
- `src/content/posts/verificare/observability/04-correlation/index.md`
- `src/content/posts/verificare/observability/05-management/index.md`
- `src/content/posts/verificare/observability/06-routing/index.md`
- `src/content/posts/verificare/observability/07-keycloak-pii/index.md`
- `src/content/posts/verificare/observability/08-console-to-grafana/index.md`

Context: This is part of the "observability" series (articles 04-08). Articles 01-03 are already translated — read one of them for style consistency (`01-observability/index.en.md`).

- [ ] **Step 1: Read all 5 Italian sources and the style reference**
- [ ] **Step 2: Write `04-correlation/index.en.md`**
- [ ] **Step 3: Write `05-management/index.en.md`**
- [ ] **Step 4: Write `06-routing/index.en.md`**
- [ ] **Step 5: Write `07-keycloak-pii/index.en.md`**
- [ ] **Step 6: Write `08-console-to-grafana/index.en.md`**
- [ ] **Step 7: Verify all 5 files exist and have correct `lang: en` frontmatter**

```bash
grep -l "lang: en" src/content/posts/verificare/observability/0{4,5,6,7,8}*/index.en.md
```
Expected: 5 file paths

---

## Task 2: Translate verificare/openfga (5 articles)

**Files to create:**
- `src/content/posts/verificare/openfga/01-zanzibar-concetti/index.en.md`
- `src/content/posts/verificare/openfga/02-openfga-keycloak/index.en.md`
- `src/content/posts/verificare/openfga/03-multitenancy/index.en.md`
- `src/content/posts/verificare/openfga/04-gerarchie-query/index.en.md`
- `src/content/posts/verificare/openfga/05-listobjects-performance/index.en.md`

**Sources to read:**
- `src/content/posts/verificare/openfga/01-zanzibar-concetti/index.md`
- `src/content/posts/verificare/openfga/02-openfga-keycloak/index.md`
- `src/content/posts/verificare/openfga/03-multitenancy/index.md`
- `src/content/posts/verificare/openfga/04-gerarchie-query/index.md`
- `src/content/posts/verificare/openfga/05-listobjects-performance/index.md`

- [ ] **Step 1: Read all 5 Italian sources and the style reference**
- [ ] **Step 2: Write `01-zanzibar-concetti/index.en.md`**
- [ ] **Step 3: Write `02-openfga-keycloak/index.en.md`**
- [ ] **Step 4: Write `03-multitenancy/index.en.md`**
- [ ] **Step 5: Write `04-gerarchie-query/index.en.md`**
- [ ] **Step 6: Write `05-listobjects-performance/index.en.md`**
- [ ] **Step 7: Verify all 5 files exist and have correct `lang: en` frontmatter**

```bash
grep -rl "lang: en" src/content/posts/verificare/openfga/ | wc -l
```
Expected: `5`

---

## Task 3: Translate verificare/testing batch 1 (5 articles)

**Files to create:**
- `src/content/posts/verificare/testing/01-unit-test-nuxt3-logica-pura/index.en.md`
- `src/content/posts/verificare/testing/02-mock-traps-python-flask/index.en.md`
- `src/content/posts/verificare/testing/02-opentelemetry-trace-correlation/index.en.md`
- `src/content/posts/verificare/testing/03-cicd-strategie-avanzate/index.en.md`
- `src/content/posts/verificare/testing/03-flask-factory-testabile/index.en.md`

**Sources to read:** the corresponding `index.md` in each directory above.

Context: testing series. Read the already-translated `verificare/testing/01-intro/index.en.md` and `01-guida-completa-e2e/index.en.md` for style.

- [ ] **Step 1: Read all 5 Italian sources and a style reference from the testing series**
- [ ] **Step 2: Write `01-unit-test-nuxt3-logica-pura/index.en.md`**
- [ ] **Step 3: Write `02-mock-traps-python-flask/index.en.md`**
- [ ] **Step 4: Write `02-opentelemetry-trace-correlation/index.en.md`**
- [ ] **Step 5: Write `03-cicd-strategie-avanzate/index.en.md`**
- [ ] **Step 6: Write `03-flask-factory-testabile/index.en.md`**
- [ ] **Step 7: Verify 5 files created with correct frontmatter**

```bash
grep -l "lang: en" src/content/posts/verificare/testing/{01-unit-test-nuxt3-logica-pura,02-mock-traps-python-flask,02-opentelemetry-trace-correlation,03-cicd-strategie-avanzate,03-flask-factory-testabile}/index.en.md
```
Expected: 5 file paths

---

## Task 4: Translate verificare/testing batch 2 (6 articles)

**Files to create:**
- `src/content/posts/verificare/testing/04-network-mocking/index.en.md`
- `src/content/posts/verificare/testing/05-network-mocking-avanzato/index.en.md`
- `src/content/posts/verificare/testing/06-visual-regression/index.en.md`
- `src/content/posts/verificare/testing/07-flaky-debugging/index.en.md`
- `src/content/posts/verificare/testing/08-authentication-testing/index.en.md`
- `src/content/posts/verificare/testing/09-page-object-model/index.en.md`

**Sources to read:** the corresponding `index.md` in each directory above.

- [ ] **Step 1: Read all 6 Italian sources and a style reference from the testing series**
- [ ] **Step 2: Write `04-network-mocking/index.en.md`**
- [ ] **Step 3: Write `05-network-mocking-avanzato/index.en.md`**
- [ ] **Step 4: Write `06-visual-regression/index.en.md`**
- [ ] **Step 5: Write `07-flaky-debugging/index.en.md`**
- [ ] **Step 6: Write `08-authentication-testing/index.en.md`**
- [ ] **Step 7: Write `09-page-object-model/index.en.md`**
- [ ] **Step 8: Verify 6 files created with correct frontmatter**

```bash
grep -l "lang: en" src/content/posts/verificare/testing/{04-network-mocking,05-network-mocking-avanzato,06-visual-regression,07-flaky-debugging,08-authentication-testing,09-page-object-model}/index.en.md
```
Expected: 6 file paths

---

## Task 5: Translate progettare/keycloak batch 1 (3 articles)

**Files to create:**
- `src/content/posts/progettare/keycloak/01-keycloak-intro/index.en.md`
- `src/content/posts/progettare/keycloak/02-authorization-code-pkce/index.en.md`
- `src/content/posts/progettare/keycloak/03-keycloak-m2m/index.en.md`

**Sources to read:** the corresponding `index.md` in each directory above.

Note: no pre-existing English translations exist for keycloak — use the global style reference (`verificare/observability/01-observability/index.en.md`). Establish consistent terminology for Keycloak-specific terms (`realm`, `client`, `OIDC`, `bearer token`, etc.) in Task 5 and carry it into Task 6.

- [ ] **Step 1: Read all 3 Italian sources**
- [ ] **Step 2: Write `01-keycloak-intro/index.en.md`**
- [ ] **Step 3: Write `02-authorization-code-pkce/index.en.md`**
- [ ] **Step 4: Write `03-keycloak-m2m/index.en.md`**
- [ ] **Step 5: Verify 3 files created with correct frontmatter**

```bash
grep -l "lang: en" src/content/posts/progettare/keycloak/{01-keycloak-intro,02-authorization-code-pkce,03-keycloak-m2m}/index.en.md
```
Expected: 3 file paths

---

## Task 6: Translate progettare/keycloak batch 2 (3 articles)

**Files to create:**
- `src/content/posts/progettare/keycloak/04-keycloak-e2e/index.en.md`
- `src/content/posts/progettare/keycloak/05-keycloak-opa/index.en.md`
- `src/content/posts/progettare/keycloak/06-keycloak-federation/index.en.md`

**Sources to read:** the corresponding `index.md` in each directory above.

Context: same keycloak series as Task 5 — maintain consistent terminology (realm, client, OIDC, etc.).

- [ ] **Step 1: Read all 3 Italian sources**
- [ ] **Step 2: Write `04-keycloak-e2e/index.en.md`**
- [ ] **Step 3: Write `05-keycloak-opa/index.en.md`**
- [ ] **Step 4: Write `06-keycloak-federation/index.en.md`**
- [ ] **Step 5: Verify 3 files created with correct frontmatter**

```bash
grep -l "lang: en" src/content/posts/progettare/keycloak/{04-keycloak-e2e,05-keycloak-opa,06-keycloak-federation}/index.en.md
```
Expected: 3 file paths

---

## Task 7: Translate progettare/kafka (3) + system-design/01 (1)

**Files to create:**
- `src/content/posts/progettare/kafka/01-intro/index.en.md`
- `src/content/posts/progettare/kafka/03-akka-pekko-migrazione/index.en.md`
- `src/content/posts/progettare/kafka/05-kafka-crash-recovery-strategie/index.en.md`
- `src/content/posts/progettare/system-design/01-errori-produzione/index.en.md`

**Sources to read:** the corresponding `index.md` in each directory above.

Context: kafka series — articles 02 and 04 are already translated, read `02-schema-registry-avro-apicurio/index.en.md` for style/terminology.

- [ ] **Step 1: Read all 4 Italian sources + kafka style reference**
- [ ] **Step 2: Write `kafka/01-intro/index.en.md`**
- [ ] **Step 3: Write `kafka/03-akka-pekko-migrazione/index.en.md`**
- [ ] **Step 4: Write `kafka/05-kafka-crash-recovery-strategie/index.en.md`**
- [ ] **Step 5: Write `system-design/01-errori-produzione/index.en.md`**
- [ ] **Step 6: Verify 4 files created with correct frontmatter**

```bash
grep -l "lang: en" \
  src/content/posts/progettare/kafka/{01-intro,03-akka-pekko-migrazione,05-kafka-crash-recovery-strategie}/index.en.md \
  src/content/posts/progettare/system-design/01-errori-produzione/index.en.md
```
Expected: 4 file paths

---

## Task 8: Translate progettare/system-design (4) + kubernetes/02 + vue (1)

**Files to create:**
- `src/content/posts/progettare/system-design/02-benchmark-net8/index.en.md`
- `src/content/posts/progettare/system-design/03-compilatore-state-machine/index.en.md`
- `src/content/posts/progettare/system-design/04-tracing-otel-grafana-tempo/index.en.md`
- `src/content/posts/progettare/system-design/di-python/index.en.md`
- `src/content/posts/progettare/kubernetes/02-k8s-controller/index.en.md`
- `src/content/posts/progettare/vue/micro-frontend-module-federation/index.en.md`

**Sources to read:** the corresponding `index.md` in each directory above.

Context: kubernetes series — 5 other articles already translated, read `01-capi-part1-intro/index.en.md` for style.

- [ ] **Step 1: Read all 6 Italian sources + kubernetes style reference**
- [ ] **Step 2: Write `system-design/02-benchmark-net8/index.en.md`**
- [ ] **Step 3: Write `system-design/03-compilatore-state-machine/index.en.md`**
- [ ] **Step 4: Write `system-design/04-tracing-otel-grafana-tempo/index.en.md`**
- [ ] **Step 5: Write `system-design/di-python/index.en.md`**
- [ ] **Step 6: Write `kubernetes/02-k8s-controller/index.en.md`**
- [ ] **Step 7: Write `vue/micro-frontend-module-federation/index.en.md`**
- [ ] **Step 8: Verify 6 files created with correct frontmatter**

```bash
grep -l "lang: en" \
  src/content/posts/progettare/system-design/{02-benchmark-net8,03-compilatore-state-machine,04-tracing-otel-grafana-tempo,di-python}/index.en.md \
  src/content/posts/progettare/kubernetes/02-k8s-controller/index.en.md \
  src/content/posts/progettare/vue/micro-frontend-module-federation/index.en.md
```
Expected: 6 file paths

---

## Task 9: Translate automatizzare (2) + altro/web-development (3)

**Files to create:**
- `src/content/posts/automatizzare/devops/pipeline-proxmox-opentofu-ansible/index.en.md`
- `src/content/posts/automatizzare/docker/docker-internals/index.en.md`
- `src/content/posts/altro/web-development/01-eventbus-pinia-migrazione/index.en.md`
- `src/content/posts/altro/web-development/02-openlayers-vue3-composables/index.en.md`
- `src/content/posts/altro/web-development/03-vue3-dry-patterns/index.en.md`

**Sources to read:** the corresponding `index.md` in each directory above.

Note: `automatizzare/devops/pipeline-proxmox-opentofu-ansible/index.md` may have `draft: true` — do NOT copy the draft field; always omit it.

- [ ] **Step 1: Read all 5 Italian sources**
- [ ] **Step 2: Write `devops/pipeline-proxmox-opentofu-ansible/index.en.md`**
- [ ] **Step 3: Write `docker/docker-internals/index.en.md`**
- [ ] **Step 4: Write `web-development/01-eventbus-pinia-migrazione/index.en.md`**
- [ ] **Step 5: Write `web-development/02-openlayers-vue3-composables/index.en.md`**
- [ ] **Step 6: Write `web-development/03-vue3-dry-patterns/index.en.md`**
- [ ] **Step 7: Verify 5 files created with correct frontmatter and no `draft` field**

```bash
grep -l "lang: en" \
  src/content/posts/automatizzare/devops/pipeline-proxmox-opentofu-ansible/index.en.md \
  src/content/posts/automatizzare/docker/docker-internals/index.en.md \
  src/content/posts/altro/web-development/{01-eventbus-pinia-migrazione,02-openlayers-vue3-composables,03-vue3-dry-patterns}/index.en.md
```
Expected: 5 file paths

---

## Task 10: Verify build and commit

**This task runs AFTER all Tasks 1-9 complete.**

- [ ] **Step 1: Count all new EN files**

```bash
find src/content/posts -name "index.en.md" | wc -l
```
Expected: `57` (15 existing + 42 new)

- [ ] **Step 2: Check no `draft: true` leaked into EN files**

```bash
grep -r "draft: true" src/content/posts --include="*.en.md"
```
Expected: no output

- [ ] **Step 3: Check no `reproducibility` field leaked into EN files**

```bash
grep -r "reproducibility" src/content/posts --include="*.en.md"
```
Expected: no output

- [ ] **Step 4: All new files have `reviewed: machine`**

```bash
grep -rL "reviewed: machine" src/content/posts --include="*.en.md" | grep -v "reviewed: human"
```
Expected: no output (all files have either `reviewed: machine` or `reviewed: human`)

- [ ] **Step 5: Run production build to verify no Astro schema errors**

```bash
make build
```
Expected: build completes without errors

- [ ] **Step 6: Commit all new files**

```bash
git add src/content/posts
git commit -m "$(cat <<'EOF'
feat(translations): add English adaptations for all 42 missing posts

Adds index.en.md editorial adaptations for:
- verificare/observability (5): 04-correlation through 08-console-to-grafana
- verificare/openfga (5): full series 01-05
- verificare/testing (11): 01-unit-test-nuxt3 through 09-page-object-model
- progettare/kafka (3): 01-intro, 03-akka-pekko, 05-crash-recovery
- progettare/keycloak (6): full series 01-06
- progettare/kubernetes (1): 02-k8s-controller
- progettare/system-design (5): 01-errori through di-python
- progettare/vue (1): micro-frontend-module-federation
- automatizzare/devops (1): pipeline-proxmox-opentofu-ansible
- automatizzare/docker (1): docker-internals
- altro/web-development (3): 01-eventbus through 03-vue3-dry-patterns

All translations marked reviewed: machine.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
