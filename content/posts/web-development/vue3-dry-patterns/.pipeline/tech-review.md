# Tech Review — Vue 3 DRY Patterns

**Reviewer**: Claude (tech-review)
**Date**: 2026-02-20
**Article**: `content/posts/web-development/vue3-dry-patterns/index.md`
**Score**: 8/10

---

## Summary

The article is technically sound. It presents three well-chosen patterns (composable, wrapper component with slots, utility function) plus a valuable anti-pattern section. Code snippets are syntactically correct, idiomatic Vue 3 / Vuetify 3 / Nuxt 3, and demonstrate real-world usage. The main issues are minor inconsistencies and a few missing details.

---

## Issues

### P1 — Important

#### 1. Inconsistent `mockApi` import between snippets

- **Line 34**: The "before" snippet uses `const { mockApi } = useMockApi()` (a composable returning a destructured object).
- **Line 53**: The composable version imports `mockApi` as a plain module: `import { mockApi } from '~/helpers/mockApi'`.
- **Line 69**: It is then returned directly in the composable's return object without being wrapped in any reactive construct.

These two usages are incompatible. If `mockApi` is a composable (`useMockApi`), the refactored version should call it the same way. If it is a plain helper, the "before" snippet should not use `useMockApi()`. This will confuse readers trying to reproduce the example.

**Recommendation**: Pick one approach and use it consistently. Since `mockApi` has no reactive state, importing it as a plain module (`helpers/mockApi`) is the correct choice — update the "before" snippet on line 34 accordingly.

#### 2. `EntityDetailPage.vue` wrapper missing `<script setup>` section

The wrapper component template (line 178-228) references `tab`, `saving`, `snackbar`, `snackbarColor`, `snackbarText`, `title`, `icon` — but no `<script setup>` block is shown. The article mentions `defineExpose` for `showSuccess`/`showError` (line 230) but never shows the implementation. For a pattern article, the script section is essential to understand how props, emits, and internal state are defined.

**Recommendation**: Add a minimal `<script setup lang="ts">` block showing at least: `defineProps`, `defineEmits`, the `tab`/`snackbar` refs, and the `defineExpose({ showSuccess, showError })` call.

### P2 — Minor

#### 3. Missing `document.body.appendChild(a)` in download function

The `downloadBlob` function (line 331-338) creates an anchor element, sets `href` and `download`, then calls `a.click()` without appending the element to the DOM. This works in Chromium-based browsers but may silently fail in Firefox. The safer cross-browser pattern is:

```typescript
document.body.appendChild(a)
a.click()
document.body.removeChild(a)
```

**Recommendation**: Add `appendChild`/`removeChild` for cross-browser safety, or mention the browser compatibility caveat.

#### 4. `useEntityDetail` composable returns `route` and `router` unnecessarily

Line 67-70: The composable returns `route` and `router`, but the consuming snippet on line 77 does not destructure them. If individual pages never need direct access (since `goBack` and `code` abstract the common uses), returning them adds noise to the API surface. If they are needed in some pages, it is worth a brief note explaining why.

**Recommendation**: Either remove `route`/`router` from the return object or add a one-line comment explaining that pages with custom navigation needs can access them.

#### 5. `loadFieldOptions` silently swallows errors

Line 89-95: The `catch` block returns an empty array with no logging. In a production app this can make debugging difficult when an API endpoint is misconfigured.

**Recommendation**: Add a note that production code should log the error (e.g., `console.error` or a reporting service), or show it in the snippet.

#### 6. Decision tree uses plain text instead of a proper diagram

Line 420-438: The ASCII decision tree uses `text` as implicit language (no fence language specified — it is just indented). It renders fine but specifying ` ```text ` would be consistent with the style guide's recommendation.

**Recommendation**: Already uses code fence without language tag. Add `text` language identifier.

#### 7. Anti-pattern `GenericCrudPage` slot signature may confuse readers

Line 387: `<template #dialog-content="{ item, update }">` — the `update` slot prop is never used in the snippet body. Minor, but readers may wonder what it does.

**Recommendation**: Either remove `update` from the destructuring or add a brief comment.

---

## Factual Correctness

- Composition API usage (composables, `computed`, `ref`) is correct for Vue 3.
- Nuxt 3 auto-imports (`useRoute`, `useRouter`, `computed`) are correctly used without explicit imports inside composables — this is valid in Nuxt 3.
- Vuetify 3 component API (`v-tabs`/`v-window`, `v-text-field`, `v-select`, `v-snackbar`) matches current stable Vuetify 3.x.
- The Sandi Metz quote and attribution are accurate.
- The distinction between composables (reactive) and utility functions (pure) is correctly stated and aligns with Vue community conventions.

## Security

No security issues identified. The article does not deal with user input sanitization, authentication, or other security-sensitive patterns. The `JSON.stringify` + Blob download pattern is safe.

## Versions & Compatibility

- The article targets Vue 3 + Nuxt 3 + Vuetify 3. All patterns are compatible with current stable versions (Vue 3.5.x, Nuxt 3.15.x, Vuetify 3.7.x as of Feb 2026).
- No deprecated APIs are used.
- The `downloadBlob` cross-browser caveat (P2 #3) is the only compatibility concern.

## Best Practices

- The "when to use" subsections are a strong editorial choice — they prevent cargo-cult application of the patterns.
- The anti-pattern section with the Sandi Metz reference is well-argued and balances the article.
- The decision tree is a useful reference artifact.

## Completeness

- The article covers the three most common DRY patterns in Vue 3 SPA development. No major pattern is missing for the stated scope.
- A brief mention of `provide`/`inject` as an alternative to prop-drilling in deep component trees could add value, but is not strictly necessary given the article's focus.
- The missing `<script setup>` for the wrapper component (P1 #2) is the main completeness gap.

---

## Verdict

Solid article with correct technical content and well-chosen examples. Fixing the two P1 issues (mockApi inconsistency and missing script block) would bring it to production quality. The P2 items are polish.
