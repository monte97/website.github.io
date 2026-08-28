import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://montelli.dev',
  output: 'static',
  redirects: {
    '/blog/series/observability/': '/blog/verificare/observability/',
    // observability 01/02/03 ristrutturati il 2026-08-26:
    // la tesi del 01 e' passata nella landing di serie, 02 e 03 sono stati fusi
    '/blog/verificare/observability/01-observability/': '/blog/verificare/observability/',
    '/en/blog/verificare/observability/01-observability/': '/blog/verificare/observability/',
    '/blog/verificare/observability/02-opentelenetry/': '/blog/verificare/observability/dalla-strumentazione-allo-storage/',
    '/en/blog/verificare/observability/02-opentelenetry/': '/en/blog/verificare/observability/dalla-strumentazione-allo-storage/',
    '/blog/verificare/observability/03-lgtm/': '/blog/verificare/observability/dalla-strumentazione-allo-storage/',
    '/en/blog/verificare/observability/03-lgtm/': '/en/blog/verificare/observability/dalla-strumentazione-allo-storage/',
    // 01-intro diviso in due articoli il 2026-08-25
    '/blog/verificare/testing/01-intro/': '/blog/verificare/testing/performance-senza-baseline/',
    '/en/blog/verificare/testing/01-intro/': '/en/blog/verificare/testing/performance-senza-baseline/',
    // sezione formazione ripensata il 2026-08-28: il primo livello sono i tre
    // workshop erogati, i vecchi slug non hanno piu' una pagina propria
    '/workshop/e2e-testing-infrastructure/': '/workshop/testing-e2e/',
    '/en/workshop/e2e-testing-infrastructure/': '/en/workshop/',
    '/workshop/keycloak-workshop/': '/workshop/',
    '/en/workshop/keycloak-workshop/': '/en/workshop/',
    '/workshop/mutation-testing-workshop/': '/workshop/',
    '/en/workshop/mutation-testing-workshop/': '/en/workshop/',
    '/workshop/k6-performance-training/': '/workshop/',
    '/en/workshop/k6-performance-training/': '/en/workshop/',
    '/cv': '/files/Francesco_Montelli_CV.pdf',
    '/cv-europass': '/files/Francesco_Montelli_CV_Europass.pdf',
    '/cv-eu': '/files/Francesco_Montelli_CV_Europass.pdf',
  },
  integrations: [
    vue(),
    sitemap({
      filter: (page) => !page.includes('/qr/'),
      i18n: {
        defaultLocale: 'it',
        locales: {
          it: 'it-IT',
          en: 'en-US',
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    locales: ['it', 'en'],
    defaultLocale: 'it',
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      wrap: true,
    },
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
