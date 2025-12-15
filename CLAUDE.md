# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hugo static site using the **Toha theme** (v4) as a Hugo module. The site is multilingual (Italian and English) with i18n support, and features a blog, portfolio, and various customization options. It's deployed to GitHub Pages via Netlify.

## Key Technologies

- **Hugo**: Static site generator (v0.146.4+)
- **Toha Theme v4**: Imported as a Hugo module from `github.com/hugo-toha/toha/v4`
- **Node.js**: Required for npm dependencies (v18+)
- **Languages**: Italian (default) and English
- **CSS**: SCSS with custom overrides in `assets/styles/override.scss`
- **Styling Libraries**: Bootstrap 5, Autoprefixer, PostCSS

## Build & Development Commands

### Build the site
```bash
hugo --minify
```

### Build with garbage collection (production)
```bash
hugo --gc --minify
```

### Development server (with live reload)
```bash
hugo server
```

### Update Hugo modules
```bash
hugo mod tidy
```

### Update npm dependencies (after theme updates)
```bash
hugo mod npm pack && npm install
```

### Full Netlify build process (local testing)
```bash
hugo mod tidy && hugo mod npm pack && npm install && hugo --gc --minify
```

## Architecture & Content Structure

### Main Directories

- **`content/`**: Markdown content organized by language subdirectories
  - `content/posts/`: Blog posts with bilingual support (index.md for Italian, index.en.md for English)
  - Posts use Hugo's multilingual content management system

- **`data/`**: Configuration YAML files for site content
  - `data/it/` and `data/en/`: Language-specific data
  - `data/*/site.yaml`: Site metadata, footer, and feature configuration
  - `data/*/author.yaml`: Author/profile information
  - `data/*/sections/`: Likely contains section-specific configurations

- **`assets/`**: Custom theme assets
  - `assets/styles/override.scss`: Custom SCSS to override theme styling
  - `assets/images/`: Custom images for the site
  - `assets/jsconfig.json`: JS path configuration

- **`static/`**: Static files (copied as-is to output)
  - `static/files/`: Static file downloads
  - `static/videos/`: Video assets

- **`archetypes/`**: Hugo templates for content generation

### Theme Customization

The site uses the Toha theme v4 as a Hugo module. Custom overrides are in `assets/styles/override.scss`. The theme is configured via `hugo.yaml` parameters under `params.features`.

### Key Features (from hugo.yaml)

- Bilingual support (Italian + English)
- Blog with sharing buttons (Facebook, Twitter, LinkedIn, Reddit, Mastodon, etc.)
- Portfolio section
- Table of Contents (TOC) in posts
- Tags system
- Math support (KaTeX)
- Flowcharts (Mermaid)
- Syntax highlighting (highlight.js)
- Video player (Plyr)
- Copy code button in code blocks
- Light/Dark theme toggle

## Deployment

### GitHub Pages via Netlify

The site automatically deploys to GitHub Pages when commits are pushed to the `main` branch. This is handled by GitHub Actions workflows in `.github/workflows/`.

**Workflows:**
- `merge-to-main.yml`: Builds and deploys when main branch is updated (publishes to gh-pages)
- `pull-request.yml`: Runs build and Lighthouse checks on pull requests
- `theme-update.yml`: Daily scheduled job to update theme and dependencies (creates PR)

**Netlify Configuration** (`netlify.toml`):
- Sets Hugo version to 0.146.4
- Node.js v23.11.0, npm 10.9.2
- Publish directory: `public/`

## Bilingual Content Management

The site supports Italian (default) and English via Hugo's multilingual system.

**Content Organization:**
- Default language files: `index.md` (Italian)
- English versions: `index.en.md`

**Configuration (hugo.yaml):**
- `defaultContentLanguage: it`
- Languages with weights determine navigation order
- Base URL: https://hugo-toha.github.io

## Important Notes

1. **Theme Updates**: The Toha theme is a module dependency. Updates can be automated via the daily theme-update workflow, which creates PRs for updates.

2. **CSS Customization**: Only modify `assets/styles/override.scss` for styling changes. This prevents conflicts when the theme is updated.

3. **npm Dependencies**: Must be installed after `hugo mod npm pack` is run. Theme dependencies are managed through Hugo modules.

4. **Content Structure**: Follow the bilingual pattern when adding new posts or sections (create both `index.md` and `index.en.md`).

5. **Raw HTML in Markdown**: The site allows unsafe HTML rendering in markdown via `markup.goldmark.renderer.unsafe: true` in hugo.yaml.
