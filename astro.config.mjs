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
    // 01-intro diviso in due articoli il 2026-08-25
    '/blog/verificare/testing/01-intro/': '/blog/verificare/testing/performance-senza-baseline/',
    '/en/blog/verificare/testing/01-intro/': '/en/blog/verificare/testing/performance-senza-baseline/',
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
