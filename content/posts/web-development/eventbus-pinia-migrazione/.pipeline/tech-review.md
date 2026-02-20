# Tech Review — Da EventBus a Pinia

**Reviewer**: Claude (tech-review)
**Date**: 2026-02-20
**Article**: `content/posts/web-development/eventbus-pinia-migrazione/index.md`

---

## Summary

The article covers migrating from a Vue 2 EventBus pattern to Pinia stores in Vue 3. It presents four patterns: UI state, cache with request deduplication, selective persistence, and incremental migration. The technical content is solid and the code snippets are correct.

**Overall Score: 8/10**

---

## Findings

### P1 — Important

#### 1. `entityRefs` type is overly narrow (line 143)

```typescript
const entityRefs: Record<InventoryEntityType, typeof products> = {
  products, categories, suppliers
}
```

`typeof products` resolves to `Ref<Product[]>`. Assigning `Ref<Category[]>` and `Ref<Supplier[]>` to it would produce a TypeScript error unless `Product`, `Category`, and `Supplier` share the same shape. The article should either use `Record<InventoryEntityType, Ref<any[]>>` or acknowledge that a generic factory pattern would be more type-safe.

**Impact**: Readers copying this verbatim will get a TS compile error unless their entity types are structurally compatible.

#### 2. `invalidate` + `refresh` pattern has a subtle gap (lines 224-228)

```typescript
inventoryStore.invalidate('products')
await inventoryStore.refresh('products')
```

`refresh()` calls `fetchEntities(type, true)` with `force = true`, which bypasses the `loaded` check entirely. This means calling `invalidate()` before `refresh()` is redundant — `refresh` alone suffices. The article explains the separation of `invalidate` vs `refresh` well in the prose (line 233), but the CRUD example is misleading because it implies both calls are needed together. Should either simplify the example to just `await inventoryStore.refresh('products')` or clarify in a comment that `invalidate` is shown for completeness.

**Impact**: Confusion about the API contract; no runtime bug.

#### 3. Missing error handling in `fetchEntities` (lines 166-191)

The `fetchEntities` function has no `.catch()` or try/catch. If the API call fails, the promise rejects, `loaded` stays `false` (correct), but `pendingRequests[type]` is cleaned up in `.finally()` so subsequent callers will retry (correct). However, the error propagates unhandled to consumers. The article should at minimum note that error handling is omitted for brevity, or show a minimal pattern (e.g., an `error` ref per entity).

**Impact**: Production code without error handling leads to silent failures or unhandled promise rejections.

### P2 — Minor

#### 4. Typo: missing spaces in accented contractions

Multiple instances of `èstata`, `èin`, `èil`, `èsufficiente`, `èvisibile`, etc. — the space before the accented word is missing (should be `è stata`, `è in`, etc.). This is a prose/formatting issue, not technical.

**Impact**: Readability.

#### 5. `pinia-plugin-persistedstate` — `pick` option naming

The article uses `pick` (lines 287, 309) which is the correct API for v4 of the plugin. Worth noting that v3 used `paths` instead of `pick`. Since the article targets a Vue 3 / current-era setup, this is correct, but a brief note on the version would help readers on older setups.

**Impact**: Minor compatibility note.

#### 6. `availableCategories` computed accesses `p.category` (line 203)

```typescript
const availableCategories = computed(() => {
  return [...new Set(products.value.map(p => p.category).filter(Boolean))]
```

If `Product.category` is an object (e.g., `{ id, name }`), `new Set()` deduplication by reference would not work as intended. The article uses a simple domain so this is likely a string, but the type is not shown. A type annotation or comment would clarify.

**Impact**: Potential logic bug depending on the `Product` type definition.

#### 7. Demo repository link not verifiable

The article references `https://github.com/monte97/pinia-vue-demo` — this repo may not exist yet (article is in draft). Should be verified before publishing.

**Impact**: Broken link.

---

## Factual Correctness

| Claim | Verdict |
|-------|---------|
| `new Vue()` as EventBus no longer works in Vue 3 | Correct. Vue 3 removed the `$on`, `$off`, `$once` instance methods. |
| Vuex is in maintenance mode | Correct. Vuex 4.x receives security fixes only; Pinia is the official recommendation. |
| Pinia has no mutations | Correct. State is mutated directly or via actions. |
| Pinia supports Options API and Composition API store syntax | Correct. |
| `pinia-plugin-persistedstate` uses `pick` for selective fields | Correct for v4+. |
| `setup()` can coexist with Options API `data()`, `mounted()` | Correct. This is standard Vue 3 hybrid usage. |

## Code Correctness

All code snippets are syntactically valid. The Pinia store definitions follow correct patterns. The deduplication logic with `pendingRequests` is a well-known and correct pattern. The persistence configuration matches the `pinia-plugin-persistedstate` v4 API.

## Security

No security issues identified. The article does not handle authentication tokens, sensitive data in localStorage, or user input in an unsafe way.

## Best Practices

The article aligns well with Vue 3 / Pinia best practices:
- Composition API for complex stores, Options API for simple ones — reasonable guidance
- Explicit cache invalidation over TTL for CRUD — sound advice
- Incremental migration strategy — pragmatic and well-explained

## Completeness

The article covers its scope well. Missing aspects that could strengthen it:
- Error handling pattern (acknowledged as P1 above)
- SSR/Nuxt 3 considerations for `sessionStorage`/`localStorage` (these are browser-only APIs; Nuxt SSR would throw)
- Testing patterns for Pinia stores (out of scope but worth a mention in resources)
