---
title: "Unit testing in Nuxt 3: 72 tests without mounting a single component"
date: 2026-02-23T09:00:00.000Z
description: "72 unit tests in Nuxt 3 covering only pure logic: Pinia stores, composables, API helpers. Zero added dependencies, zero mounted components."
pillar: verificare
category: testing
tags:
  - Nuxt3
  - Vue3
  - Vitest
  - Pinia
  - Testing
lang: en
reviewed: machine
series: unit-testing
seriesOrder: 10
---

A Nuxt 3 frontend. 106 Vue components, 4 Pinia stores, 6 composables, 11 API helpers. Zero tests. Or rather: nine tests, seven of them broken — leftovers from a previous attempt that never got finished.

I wanted regression protection, but I didn't want to spend weeks configuring Vuetify-mounted test environments with simulated DOM and rendered components. So I made a choice that feels counterintuitive for a frontend project: **I ignored Vue components entirely** and tested only pure logic.

72 tests. 13 files. 1.7 seconds. Zero added dependencies.

---

## Why skip component tests

When you think "frontend testing," the first thing that comes to mind is mounting a component, simulating a click, verifying that the DOM updates. With Vuetify 3, though, that means:

- Configuring the Vuetify plugin in the test environment
- Mocking Material Design icons
- Handling components that depend on `v-app` as a wrapper
- Writing tests that break whenever you change a CSS prop

And what do you actually get? You're testing whether Vuetify renders a button. It does. It has for years.

The real regression-prevention value lives elsewhere: in the stores that manage shared state, in the API factories that build URLs, in the composables that orchestrate logic. The stuff that silently breaks in production before a user reports it.

---

## The setup: one file to rule them all

The first Nuxt 3 testing problem is that half the codebase relies on auto-imports. `useRuntimeConfig()`, `useRoute()`, `useNuxtApp()`, `onMounted()` — they work magically in the browser, but they don't exist when you run Vitest.

The official solution is `@nuxt/test-utils`, which spins up a Nuxt instance for tests. It works, but it's heavy. I took a lighter approach: a single `test/setup.ts` file that stubs everything needed.

```typescript
// test/setup.ts
import { vi } from 'vitest'

// Storage mock (needed by Pinia persist)
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

And the `vitest.config.ts` to wire everything together:

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

Two deliberate choices here:

1. **`onMounted` runs its callback immediately.** In the browser the callback fires after the component mounts; in tests we want synchronous execution so we can inspect state right away.
2. **The `~/` alias points to the `app-frontend` root.** This makes imports like `~/stores/app` work without the Nuxt build.

With this setup, all code relying on Nuxt auto-imports works without changes.

---

## Testing Pinia stores

Pinia stores are ideal candidates for unit testing: shared state, business logic, no DOM dependency.

For simple stores, `setActivePinia(createPinia())` in `beforeEach` is enough:

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
    expect(store.dateExact).toBe('')  // untouched
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

For the more complex registry store — which manages 6 entities, has caching, and deduplicates concurrent requests — you need an API module mock:

```typescript
const mockGetAll = vi.fn()
vi.mock('~/helpers/api/Routes', () => ({
  createApis: () => ({
    RegistryApi: {
      worker: () => ({ GetAll: mockGetAll }),
      equipment: () => ({ GetAll: mockGetAll }),
      // ... other entities
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
    await store.fetchEntities('workers')  // second call
    expect(mockGetAll).toHaveBeenCalledTimes(1)  // only one API call
  })

  it('fetchEntities deduplicates concurrent requests', async () => {
    const store = useRegistryStore()
    mockGetAll.mockResolvedValue([{ _id: '1', name: 'Worker1' }])
    const p1 = store.fetchEntities('workers', true)
    const p2 = store.fetchEntities('workers', true)
    await Promise.all([p1, p2])
    expect(mockGetAll).toHaveBeenCalledTimes(1)  // still one call
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

The deduplication test carries the most value: it verifies that two simultaneous calls to `fetchEntities` produce a single HTTP request. Without it, a refactor that removes the `pendingRequests` map would look harmless — and silently double API calls in production.

---

## Testing API factories

The project's API pattern is a factory chain: `createApis(runtimeConfig)` produces domain-scoped objects (`RegistryApi`, `ReportsApi`, ...), each accepting `axios` and returning CRUD methods.

This design is a gift for testing. Every level is independently testable.

**First level: configuration** generates correct URLs from parameters:

```javascript
import { createApiConfig } from '~/helpers/api/Routes'

it('builds baseUrl from config', () => {
  const config = createApiConfig({
    public: { gatewayIp: '10.0.0.1', gatewayPort: '9090', /* ... */ }
  })
  expect(config.baseUrl).toBe('http://10.0.0.1:9090')
})
```

**Second level: generators** call the right endpoint with the right parameters:

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

The error handling test is critical: `handleError` extracts the message from the Axios error and re-throws it. If someone changes its format, the test catches it immediately.

For APIs with dynamic query strings — like the report search endpoint — the test verifies the parameter-building logic:

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

Here the test is also documentation: `dateExact` takes precedence over `dateFrom`/`dateTo`. Without it, that's an implicit convention in the code that anyone could break.

---

## Testing composables

Composables are the grey area. Some — like `useOlMap`, which depends on OpenLayers — would require mocks so complex they'd be useless. Others — like `useTitle` or `loadFieldOptions` — are pure logic wearing a composable wrapper.

```typescript
// useTitle calls useAppStore().setTitle() inside onMounted
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

This works because we stubbed `onMounted` in setup to execute the callback immediately. The composable has no idea it's not inside a component.

The more interesting case is `loadFieldOptions`, an async function that extracts unique values from a list:

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

Four tests cover the full contract: deduplication, falsy filtering, error handling, empty list. If someone changes `filter(v => v)` to `filter(Boolean)`, nothing breaks. If they remove the filter entirely, the test catches it.

---

## What I left out (and why)

**Vue components (.vue)** — The ROI isn't there. Mounting a `WorkerInputDialog` with Vuetify takes half an hour of setup to confirm that the Save button emits the right event. Change the layout and the test breaks. Change the business logic and the store test already has it covered.

**`useOlMap` and `useVectorLayer`** — These depend on OpenLayers. You'd need to mock `Map`, `View`, `TileLayer`, `VectorSource`, `Feature`. At that point you're testing your mocks, not your code.

**E2E tests** — These require a running backend, Playwright or Cypress configured, and an order of magnitude more maintenance overhead. For an internal application with limited users, the cost-benefit ratio doesn't hold yet.

---

## Final numbers

| Metric | Value |
|--------|-------|
| Test files | 13 |
| Total tests | 72 |
| Execution time | 1.7s |
| New dependencies | 0 |
| Components tested | 0 |
| Regressions covered | stores, APIs, composables |

Next time someone modifies the registry store caching logic, changes the report search query string format, or touches the expiration warning fallback — a red test tells them immediately. And the tests run in under two seconds, so there's no excuse not to run them.

---

## File structure

For those wanting to replicate this approach, the final layout:

```
app-frontend/
├── vitest.config.ts
├── test/
│   ├── setup.ts                              # Global Nuxt mocks
│   ├── stores/
│   │   ├── app.test.ts                       # 5 tests
│   │   ├── reportFilters.test.ts             # 5 tests
│   │   ├── preferences.test.ts               # 3 tests
│   │   └── registry.test.ts                  # 10 tests
│   └── helpers/
│       ├── api/
│       │   ├── Routes.test.js                # 6 tests
│       │   ├── registry/
│       │   │   └── registryApiGenerator.test.js  # 9 tests
│       │   ├── reports/
│       │   │   ├── reportsGenerateApi.test.js    # 4 tests
│       │   │   └── reportsAccessApi.test.js      # 10 tests
│       │   └── C40/
│       │       └── C40ApiGenerator.test.js       # 6 tests
│       └── fileDownload.test.js              # 5 tests
├── composables/
│   └── __tests__/
│       ├── usePolling.test.ts                # 3 tests
│       ├── useTitle.test.ts                  # 2 tests
│       └── useRegistryDetail.test.js         # 4 tests
```

Composables have co-located tests in `__tests__/` (next to the source). Stores and helpers use a centralized `test/` directory. It's a hybrid convention: composables change often and having tests nearby helps; stores and helpers are more stable and grouping them gives a better overview.
