---
title: "Unit test in Nuxt 3: 72 test senza montare un singolo componente"
date: 2026-02-23T09:00:00.000Z
description: "72 unit test in Nuxt 3 testando solo logica pura: store Pinia, composable, helper API. Zero dipendenze aggiunte, zero componenti montati."
pillar: verificare
category: testing
tags:
  - Nuxt3
  - Vue3
  - Vitest
  - Pinia
  - Testing
lang: it
draft: true
series: unit-testing
seriesOrder: 10
summary:
  - label: "Contesto"
    value: "Frontend Nuxt 3 con 106 componenti e nove test residui, di cui sette rotti"
  - label: "Scelta"
    value: "Ignorare i componenti Vue e testare solo la logica pura"
    note: "Il valore anti-regressione sta negli store, nelle factory API e nei composable"
  - label: "Setup"
    value: "Stub globali in `test/setup.ts` al posto di `@nuxt/test-utils`"
    note: "`onMounted` eseguito subito e alias `~/` verso la root, senza build Nuxt"
  - label: "Risultato"
    value: "72 test in 13 file, 1.7 secondi, zero dipendenze aggiunte"
openItems:
  - "Restano senza copertura i componenti Vue, i composable legati a OpenLayers e i test E2E"
  - "La rinuncia agli E2E vale per un'applicazione interna con utenti limitati: con un contesto diverso il rapporto costo/beneficio cambia"
  - "La convenzione sui file di test è ibrida per scelta: colocata nei composable, centralizzata in `test/` per store e helper"
openNote: "Cosa è rimasto fuori dalla suite, e perché è una scelta dichiarata."
mode: how-to
---

Ho un frontend Nuxt 3 con 106 componenti Vue, 4 store Pinia, 6 composable e 11 helper API. Zero test. O meglio: nove test di cui sette rotti -- residui di un tentativo precedente mai completato.

Volevo proteggermi dalle regressioni, ma non volevo passare settimane a configurare ambienti di test con Vuetify montato, DOM simulato e componenti renderizzati. Così ho fatto una scelta che sembra controintuitiva per un progetto frontend: **ho ignorato completamente i componenti Vue** e ho testato solo la logica pura.

72 test. 13 file. 1.7 secondi. Zero dipendenze aggiunte.

---

## Perché non testare i componenti

Quando pensi "test frontend", la prima cosa che viene in mente è montare un componente, simulare un click, verificare che il DOM si aggiorni. Con Vuetify 3 però questo significa:

- Configurare il plugin Vuetify nel test environment
- Mockare le icone Material Design
- Gestire i componenti che dipendono da `v-app` come wrapper
- Scrivere test che si rompono quando cambi una prop CSS

E il ritorno? Stai testando che Vuetify renderizzi un bottone. Lo fa. Lo fa da anni.

Il vero valore anti-regressione sta altrove: negli store che gestiscono stato condiviso, nelle factory API che costruiscono URL, nei composable che orchestrano logica. Roba che quando si rompe non te ne accorgi finché un utente non ti scrive.

---

## Il setup: un file per domarli tutti

Il primo problema di Nuxt 3 nei test è che metà del codice si basa su auto-import. `useRuntimeConfig()`, `useRoute()`, `useNuxtApp()`, `onMounted()` -- funzionano magicamente nel browser ma non esistono quando esegui Vitest.

La soluzione ufficiale è `@nuxt/test-utils`, che avvia un'istanza Nuxt per i test. Funziona, ma è pesante. Io ho scelto un approccio più leggero: un singolo file `test/setup.ts` che stubba tutto il necessario.

```typescript
// test/setup.ts
import { vi } from 'vitest'

// Storage mock (Pinia persist ne ha bisogno)
function createStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
  }
}
vi.stubGlobal('localStorage', createStorageMock())
vi.stubGlobal('sessionStorage', createStorageMock())

// Lifecycle hooks
vi.stubGlobal('onMounted', vi.fn((cb: Function) => cb()))
vi.stubGlobal('onUnmounted', vi.fn())

// Nuxt composables
vi.stubGlobal('useNuxtApp', vi.fn(() => ({
  $axios: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
})))

vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({
  public: {
    gatewayIp: 'localhost',
    gatewayPort: '8080',
    gatewayRegistryPrefix: 'registry',
    registryApiPrefix: 'api',
    c40ApiPrefix: 'c40',
    analyzeApiPrefix: 'analyze',
    fileManagerApiPrefix: 'filemanager',
    fmClassPrefix: 'classes'
  }
})))

vi.stubGlobal('useRoute', vi.fn(() => ({ params: {}, query: {}, path: '/' })))
vi.stubGlobal('useRouter', vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })))
```

E il `vitest.config.ts` per collegare tutto:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
      '#imports': resolve(__dirname, 'test/setup.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts']
  }
})
```

Due scelte importanti qui:

1. **`onMounted` esegue il callback subito.** Nel browser il callback parte dopo il mount del componente; nei test lo vogliamo sincrono per verificare lo stato immediatamente.
2. **L'alias `~/` punta alla root di `app-frontend`.** Così gli import tipo `~/stores/app` funzionano senza la build Nuxt.

Con questo setup, tutto il codice che usa auto-import di Nuxt funziona senza modifiche.

---

## Testare gli store Pinia

Gli store Pinia sono il candidato perfetto per i test: stato condiviso, logica di business, nessuna dipendenza dal DOM.

Per gli store semplici basta `setActivePinia(createPinia())` nel `beforeEach`:

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useReportFiltersStore } from '~/stores/reportFilters'

describe('useReportFiltersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('updateFilters sets partial fields', () => {
    const store = useReportFiltersStore()
    store.updateFilters({ company: 'ACME', site: 'Site1' })
    expect(store.company).toBe('ACME')
    expect(store.site).toBe('Site1')
    expect(store.dateExact).toBe('')  // non toccato
  })

  it('resetFilters clears all fields', () => {
    const store = useReportFiltersStore()
    store.updateFilters({ company: 'ACME', onlyWithRain: true })
    store.resetFilters()
    expect(store.company).toBe('')
    expect(store.onlyWithRain).toBe(false)
  })
})
```

Per lo store più complesso -- il registry store che gestisce 6 entità, ha caching e deduplicazione delle richieste concorrenti -- serve un mock del modulo API:

```typescript
const mockGetAll = vi.fn()
vi.mock('~/helpers/api/Routes', () => ({
  createApis: () => ({
    RegistryApi: {
      worker: () => ({ GetAll: mockGetAll }),
      equipment: () => ({ GetAll: mockGetAll }),
      // ... altre entita'
    }
  })
}))

describe('useRegistryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGetAll.mockReset()
  })

  it('fetchEntities caches results', async () => {
    const store = useRegistryStore()
    mockGetAll.mockResolvedValue([{ _id: '1', name: 'Worker1' }])
    await store.fetchEntities('workers')
    await store.fetchEntities('workers')  // seconda chiamata
    expect(mockGetAll).toHaveBeenCalledTimes(1)  // una sola call API
  })

  it('fetchEntities deduplicates concurrent requests', async () => {
    const store = useRegistryStore()
    mockGetAll.mockResolvedValue([{ _id: '1', name: 'Worker1' }])
    const p1 = store.fetchEntities('workers', true)
    const p2 = store.fetchEntities('workers', true)
    await Promise.all([p1, p2])
    expect(mockGetAll).toHaveBeenCalledTimes(1)  // ancora una sola call
  })

  it('availableTeams returns unique non-empty teams', async () => {
    const store = useRegistryStore()
    mockGetAll.mockResolvedValue([
      { _id: '1', team: 'Alpha' },
      { _id: '2', team: 'Alpha' },
      { _id: '3', team: 'Beta' },
      { _id: '4', team: '' }
    ])
    await store.fetchEntities('workers')
    expect(store.availableTeams).toEqual(['Alpha', 'Beta'])
  })
})
```

Il test sulla deduplicazione è quello con più valore: verifica che due chiamate simultanee a `fetchEntities` producano una sola richiesta HTTP. Senza test, un refactoring che rimuove la mappa `pendingRequests` sembrerebbe innocuo -- e raddoppierebbe le chiamate API in produzione.

---

## Testare le factory API

Il pattern API del progetto è una catena di factory: `createApis(runtimeConfig)` produce oggetti per dominio (`RegistryApi`, `ReportsApi`, ...), ciascuno dei quali accetta `axios` e restituisce i metodi CRUD.

Questo design è una manna per i test. Ogni livello è testabile in isolamento.

**Primo livello: la configurazione** genera URL corretti dai parametri:

```javascript
import { createApiConfig } from '~/helpers/api/Routes'

it('builds baseUrl from config', () => {
  const config = createApiConfig({
    public: { gatewayIp: '10.0.0.1', gatewayPort: '9090', /* ... */ }
  })
  expect(config.baseUrl).toBe('http://10.0.0.1:9090')
})
```

**Secondo livello: i generatori** chiamano l'endpoint giusto con i parametri giusti:

```javascript
import { RegistryRouteGenerator } from '~/helpers/api/registry/registryApiGenerator'

const BASE = 'http://localhost/api/workers'

describe('RegistryRouteGenerator', () => {
  let axios
  beforeEach(() => {
    axios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
  })

  it('GetByCode calls correct endpoint', async () => {
    axios.get.mockResolvedValue({ data: { code: 'W001' } })
    const api = RegistryRouteGenerator(BASE, axios)
    const result = await api.GetByCode('W001')
    expect(axios.get).toHaveBeenCalledWith(`${BASE}/bycode/W001`)
    expect(result).toEqual({ code: 'W001' })
  })

  it('throws formatted error on server error', async () => {
    axios.get.mockRejectedValue({
      response: { status: 404, data: { message: 'Worker not found' } }
    })
    const api = RegistryRouteGenerator(BASE, axios)
    await expect(api.GetAll()).rejects.toThrow('Worker not found')
  })
})
```

Il test sull'error handling è cruciale: la funzione `handleError` estrae il messaggio dall'errore Axios e lo rilancia. Se qualcuno la modifica e il messaggio cambia formato, il test lo cattura.

Per le API con query string dinamiche -- come la ricerca nei rapportini -- il test verifica la logica di costruzione dei parametri:

```javascript
it('SearchHeader uses dateExact over dateFrom/dateTo', async () => {
  axios.get.mockResolvedValue({ data: [] })
  const api = ReportsAccessRoute(BASE, axios)
  await api.SearchHeader({ dateExact: '2026-01-15' })
  expect(axios.get).toHaveBeenCalledWith(`${BASE}/search`, {
    params: { date: '2026-01-15' }
  })
})

it('SearchHeader uses dateFrom/dateTo when dateExact is absent', async () => {
  axios.get.mockResolvedValue({ data: [] })
  const api = ReportsAccessRoute(BASE, axios)
  await api.SearchHeader({ dateFrom: '2026-01-01', dateTo: '2026-01-31' })
  expect(axios.get).toHaveBeenCalledWith(`${BASE}/search`, {
    params: { date_from: '2026-01-01', date_to: '2026-01-31' }
  })
})
```

Qui il test documenta una regola di business: `dateExact` ha priorità su `dateFrom`/`dateTo`. Senza test, è una convenzione implicita nel codice che qualcuno potrebbe violare.

---

## Testare i composable

I composable sono la zona grigia. Alcuni -- come `useOlMap` che dipende da OpenLayers -- richiederebbero mock così complessi da essere inutili. Altri -- come `useTitle` o `loadFieldOptions` -- sono logica pura mascherata da composable.

```typescript
// useTitle chiama useAppStore().setTitle() dentro onMounted
describe('useTitle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sets the app store title on mount', async () => {
    const { useTitle } = await import('../useTitle')
    const { useAppStore } = await import('~/stores/app')
    useTitle('My Page')
    expect(useAppStore().title).toBe('My Page')
  })
})
```

Funziona perché nel setup abbiamo stubbato `onMounted` per eseguire il callback subito. Il composable non sa di non essere in un componente.

Il caso più interessante è `loadFieldOptions`, una funzione async che estrae valori unici da una lista:

```javascript
import { loadFieldOptions } from '../useRegistryDetail'

it('extracts unique non-empty values', async () => {
  const api = {
    GetAll: vi.fn().mockResolvedValue([
      { team: 'Alpha' }, { team: 'Beta' },
      { team: 'Alpha' }, { team: '' }, { team: null }
    ])
  }
  const result = await loadFieldOptions(api, 'team')
  expect(result).toEqual(['Alpha', 'Beta'])
})

it('returns empty array when API fails', async () => {
  const api = { GetAll: vi.fn().mockRejectedValue(new Error('Network error')) }
  const result = await loadFieldOptions(api, 'team')
  expect(result).toEqual([])
})
```

Quattro test coprono il contratto completo: deduplicazione, filtraggio valori falsy, gestione errori, lista vuota. Se qualcuno cambia il `filter(v => v)` in `filter(Boolean)` non si rompe nulla. Se lo rimuove, il test lo becca.

---

## Cosa ho lasciato fuori (e perché)

**Componenti Vue (.vue)** -- Il ROI non c'è. Montare un `WorkerInputDialog` con Vuetify richiede mezz'ora di setup per scoprire che il bottone "Salva" emette l'evento giusto. Se cambi il layout il test si rompe. Se cambi la logica di business, il test nello store la copre già.

**`useOlMap` e `useVectorLayer`** -- Dipendono da OpenLayers. Dovresti mockare `Map`, `View`, `TileLayer`, `VectorSource`, `Feature`. A quel punto stai testando i tuoi mock, non il tuo codice.

**Test E2E** -- Richiedono backend attivo, Playwright/Cypress configurato, e un ordine di grandezza in più di manutenzione. Per un'applicazione interna con utenti limitati, il rapporto costo/beneficio non regge ancora.

---

## Numeri finali

| Metrica | Valore |
|---------|--------|
| File di test | 13 |
| Test totali | 72 |
| Tempo di esecuzione | 1.7s |
| Nuove dipendenze | 0 |
| Componenti testati | 0 |
| Regressioni coperte | store, API, composable |

La prossima volta che qualcuno modifica la logica di caching del registry store, o cambia il formato della query string nella ricerca rapportini, o tocca il fallback dell'expiration warning -- un test rosso glielo dice subito. E i test girano in meno di due secondi, quindi non c'è scusa per non lanciarli.

---

## Struttura dei file

Per chi volesse replicare l'approccio, ecco l'organizzazione finale:

```
app-frontend/
├── vitest.config.ts
├── test/
│   ├── setup.ts                              # Mock globali Nuxt
│   ├── stores/
│   │   ├── app.test.ts                       # 5 test
│   │   ├── reportFilters.test.ts             # 5 test
│   │   ├── preferences.test.ts               # 3 test
│   │   └── registry.test.ts                  # 10 test
│   └── helpers/
│       ├── api/
│       │   ├── Routes.test.js                # 6 test
│       │   ├── registry/
│       │   │   └── registryApiGenerator.test.js  # 9 test
│       │   ├── reports/
│       │   │   ├── reportsGenerateApi.test.js    # 4 test
│       │   │   └── reportsAccessApi.test.js      # 10 test
│       │   └── C40/
│       │       └── C40ApiGenerator.test.js       # 6 test
│       └── fileDownload.test.js              # 5 test
├── composables/
│   └── __tests__/
│       ├── usePolling.test.ts                # 3 test
│       ├── useTitle.test.ts                  # 2 test
│       └── useRegistryDetail.test.js         # 4 test
```

I composable hanno i test colocati in `__tests__/` (accanto al codice sorgente). Store e helper li hanno nella directory `test/` centralizzata. È una convenzione ibrida: i composable cambiano spesso e avere il test accanto aiuta; store e helper sono più stabili e averli raggruppati dà una visione d'insieme migliore.
