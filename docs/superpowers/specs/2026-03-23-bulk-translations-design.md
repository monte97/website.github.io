# Bulk English Translations — Design Spec

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Translate all 42 Italian blog posts currently missing an English version into editorial adaptations (`index.en.md`), published on a dedicated git branch `feat/translations-bulk`.

---

## Scope

**42 articles** across 4 pillars:

| Pillar | Articles |
|--------|----------|
| verificare/observability | 04-correlation, 05-management, 06-routing, 07-keycloak-pii, 08-console-to-grafana |
| verificare/openfga | 01-zanzibar-concetti, 02-openfga-keycloak, 03-multitenancy, 04-gerarchie-query, 05-listobjects-performance |
| verificare/testing | 01-unit-test-nuxt3-logica-pura, 02-mock-traps-python-flask, 02-opentelemetry-trace-correlation, 03-cicd-strategie-avanzate, 03-flask-factory-testabile, 04-network-mocking, 05-network-mocking-avanzato, 06-visual-regression, 07-flaky-debugging, 08-authentication-testing, 09-page-object-model |
| progettare/kafka | 01-intro, 03-akka-pekko-migrazione, 05-kafka-crash-recovery-strategie |
| progettare/keycloak | 01-keycloak-intro, 02-authorization-code-pkce, 03-keycloak-m2m, 04-keycloak-e2e, 05-keycloak-opa, 06-keycloak-federation |
| progettare/kubernetes | 02-k8s-controller |
| progettare/system-design | 01-errori-produzione, 02-benchmark-net8, 03-compilatore-state-machine, 04-tracing-otel-grafana-tempo, di-python |
| progettare/vue | micro-frontend-module-federation |
| automatizzare/devops | pipeline-proxmox-opentofu-ansible |
| automatizzare/docker | docker-internals |
| altro/web-development | 01-eventbus-pinia-migrazione, 02-openlayers-vue3-composables, 03-vue3-dry-patterns |

---

## Quality Bar

**Editorial adaptation** — not literal translation. Each `index.en.md` must:

- Read as natural technical English, not translated Italian
- Adapt analogies and examples for an international audience where needed
- Reorganize sections if the flow improves in English
- Match the style and register of existing translations (see `verificare/observability/01-observability/index.en.md` as reference)

---

## File Convention

Each translation produces a single file `index.en.md` in the same directory as `index.md`:

```
src/content/posts/<pillar>/<category>/<slug>/
├── index.md        ← Italian (source)
└── index.en.md     ← English (to create)
```

### Frontmatter rules

- `lang: en`
- `title`, `description`: translated/adapted in English
- `pillar`, `category`, `tags`, `series`, `seriesOrder`, `date`: copied from Italian
- `reviewed: human` — same as existing translations
- Do NOT include `reproducibility` field (IT-only)

---

## Execution Strategy

### Branch

```
git checkout -b feat/translations-bulk
```

### Batching (9 parallel agents)

| Agent | Batch | Articles |
|-------|-------|----------|
| 1 | verificare/observability | 04, 05, 06, 07, 08 |
| 2 | verificare/openfga | 01, 02, 03, 04, 05 |
| 3 | verificare/testing batch 1 | unit-test-nuxt3, mock-traps, otel-trace-correlation, cicd-strategie, flask-factory |
| 4 | verificare/testing batch 2 | network-mocking, network-mocking-avanzato, visual-regression, flaky-debugging, authentication-testing, page-object-model |
| 5 | progettare/keycloak batch 1 | 01, 02, 03 |
| 6 | progettare/keycloak batch 2 | 04, 05, 06 |
| 7 | progettare/kafka + sd batch 1 | kafka 01, 03, 05 + sd/01-errori-produzione |
| 8 | progettare/sd batch 2 + k8s + vue | sd 02, 03, 04, di-python + k8s/02 + vue |
| 9 | automatizzare + altro | devops, docker, web-dev 01, 02, 03 |

### Commit

Single commit on `feat/translations-bulk` after all agents complete:

```
feat(translations): add English adaptations for all 42 missing posts
```

---

## Reference

- Existing translation example: `src/content/posts/verificare/observability/01-observability/index.en.md`
- Content schema: `src/content.config.ts`
- Blog utilities: `src/utils/blog.ts`
