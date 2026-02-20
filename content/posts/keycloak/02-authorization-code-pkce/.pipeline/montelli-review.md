# Style Review - "Login con Keycloak: Authorization Code + PKCE in MockMart"

**Reviewer**: montelli-review (style guide compliance)
**Date**: 2026-02-20
**Word count**: ~2498
**Overall Score**: 8.5/10

---

## 1. Tone & Voice

**Verdict: Compliant**

- Impersonal constructions dominate technical explanations: "Il frontend usa `keycloak-js`...", "Il backend non partecipa al login."
- "Noi" inclusivo used for solutions: "vediamo cosa succede", "possiamo simularlo"
- "Tu" is largely absent, even in the intro hook area. The hook uses an impersonal narrative instead.

| Issue | Line | Severity |
|-------|------|----------|
| Intro hook lacks a direct "tu" question/problem statement. The style guide expects a rhetorical question or direct address in the first 2 paragraphs. The intro jumps straight into referencing the previous article. | 17-19 | **Minor** |

---

## 2. Structure

**Verdict: Mostly Compliant**

- **Hook**: Present but weak. The intro references the previous article and states what this one does, but lacks the typical rhetorical question or concrete pain point ("Quante volte hai...?"). It's functional but not engaging per the style guide pattern.
- **Logical progression**: Excellent. Theory (PKCE flow) -> Config -> Frontend -> Backend -> E2E test -> Troubleshooting -> JWT deep-dive -> Conclusion.
- **Conclusion**: Has recap list (3 points) and resources section. Has forward-looking links to next articles. Matches the style guide pattern well.
- **Separators**: Uses `---` between major sections, consistent with the style guide.

| Issue | Line | Severity |
|-------|------|----------|
| Hook does not open with a concrete problem or rhetorical question. Style guide expects this in the first 2 paragraphs. | 17 | **Minor** |

---

## 3. Formatting

**Verdict: Compliant**

- **Paragraphs**: Consistently 1-3 sentences. No walls of text.
- **Headings**: H2 for major sections, H3 for subsections. Numbered H2s ("1. Configurazione Keycloak", "2. Integrazione Frontend...") deviate slightly from the style guide pattern of descriptive titles, but remain clear and effective.
- **Lists**: Use bold key terms followed by explanation (e.g., "`onLoad: 'check-sso'` - controlla se..."). Matches style guide.
- **Tables**: Well-used for config fields and comparisons (ID Token vs Access Token). Follows the style guide pattern.
- **Blockquotes**: Used for important notes with bold prefix ("**Perche PKCE...**", "**`S256`**..."). Consistent with style guide.

| Issue | Line | Severity |
|-------|------|----------|
| Numbered H2 sections ("## 1. Configurazione Keycloak") are not the typical style guide pattern ("## Titolo: Sottotitolo"). Functional but inconsistent with other articles. | 59, 149, 243, 335, 442 | **Minor** |

---

## 4. Code Blocks

**Verdict: Compliant**

- All code blocks specify the language (`javascript`, `bash`, `json`, `text`, `http`).
- Inline comments present in most blocks explaining non-obvious lines.
- File paths indicated where relevant (`// AuthContext.jsx`, `// middleware/auth.js`).
- Longest block is the middleware at ~30 lines -- within the 30-40 line limit.
- Command/output separation used correctly (e.g., curl command then separate `text` block for output).

| Issue | Line | Severity |
|-------|------|----------|
| No issues found. | - | - |

---

## 5. Links & References

**Verdict: Compliant**

- All links have descriptive text (no "clicca qui").
- Official docs linked: Keycloak docs, jose library, RFC 7636.
- Repo link prominent with emoji: "MockMart - Repository Demo".
- Dedicated "Risorse utili" section at the end.
- Internal Hugo cross-references to other series articles.

| Issue | Line | Severity |
|-------|------|----------|
| "Risorse utili" is bold text rather than an H2 heading. The style guide shows `## Risorse Utili` as a proper section heading. | 541 | **Minor** |

---

## 6. Frontmatter

**Verdict: Mostly Compliant**

- **Title**: "Login con Keycloak: Authorization Code + PKCE in MockMart" -- follows "Argomento: Sottotitolo" pattern. 58 chars, within 50-80 range.
- **Description**: "Setup pratico di Authorization Code Flow con PKCE: configurazione Keycloak, integrazione frontend React e validazione backend Express." -- 133 chars, within 120-150 target.
- **Tags**: PascalCase (`Keycloak`, `OAuth2`, `PKCE`, `OpenID Connect`, `Security`). 5 tags, within 4-9 range.
- **`reviewed: false`**: Correct for pre-review state.

| Issue | Line | Severity |
|-------|------|----------|
| `categories: ["Security", "Frontend"]` -- "Frontend" as a category is new. Check consistency with existing categories in the blog. | 12 | **Minor** |

---

## 7. Images

**Verdict: Missing**

- The article has **no images at all**. No `imgs/` subdirectory exists.
- For a tutorial with UI steps (Keycloak console, browser DevTools, login flow), screenshots would significantly improve clarity.

| Issue | Line | Severity |
|-------|------|----------|
| No images for a hands-on tutorial. Screenshots of Keycloak console, login redirect, DevTools token inspection would help readability. | - | **Major** |

---

## Summary of Issues

| # | Issue | Severity | Lines |
|---|-------|----------|-------|
| 1 | Hook lacks rhetorical question or direct "tu" engagement | Minor | 17-19 |
| 2 | Numbered H2 sections deviate from "Titolo: Sottotitolo" pattern | Minor | 59, 149, 243, 335, 442 |
| 3 | "Risorse utili" should be an H2 heading, not bold text | Minor | 541 |
| 4 | "Frontend" category consistency to verify | Minor | 12 |
| 5 | No images in a hands-on tutorial | Major | - |

**Major issues**: 1
**Minor issues**: 4

---

## Overall Assessment

The article is well-written, technically thorough, and structurally sound. The PKCE explanation before the implementation is excellent and aligns with the style guide's "why before how" principle. The troubleshooting section ("Dove si rompe") is a strong addition. The main gap is the complete absence of images in what is a step-by-step tutorial involving UI interactions -- adding screenshots of the Keycloak console and browser flow would bring this from good to excellent.

**Score: 8.5/10**
