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
    // /progetti/ cancellata il 2026-08-28: era orfana, non la linkava nessuna
    // pagina, e la sua rotta duplicava i case study e i workshop su un secondo URL
    '/progetti/': '/case-study/',
    '/en/progetti/': '/en/case-study/',
    '/progetti/app-android-costruita-fuori-da-android/': '/case-study/app-android-costruita-fuori-da-android/',
    '/en/progetti/app-android-costruita-fuori-da-android/': '/en/case-study/app-android-costruita-fuori-da-android/',
    '/progetti/dalla-cecita-alla-traccia/': '/case-study/dalla-cecita-alla-traccia/',
    '/en/progetti/dalla-cecita-alla-traccia/': '/en/case-study/dalla-cecita-alla-traccia/',
    '/progetti/il-fornitore-non-ha-una-api/': '/case-study/il-fornitore-non-ha-una-api/',
    '/en/progetti/il-fornitore-non-ha-una-api/': '/en/case-study/il-fornitore-non-ha-una-api/',
    '/progetti/il-permesso-che-non-sapeva-pronunciare/': '/case-study/il-permesso-che-non-sapeva-pronunciare/',
    '/en/progetti/il-permesso-che-non-sapeva-pronunciare/': '/en/case-study/il-permesso-che-non-sapeva-pronunciare/',
    '/progetti/quante-versioni-stai-mantenendo/': '/case-study/quante-versioni-stai-mantenendo/',
    '/en/progetti/quante-versioni-stai-mantenendo/': '/en/case-study/quante-versioni-stai-mantenendo/',
    '/progetti/software-per-chi-non-apre-il-terminale/': '/case-study/software-per-chi-non-apre-il-terminale/',
    '/en/progetti/software-per-chi-non-apre-il-terminale/': '/en/case-study/software-per-chi-non-apre-il-terminale/',
    '/progetti/tracking-live-mezzi-mobile/': '/case-study/tracking-live-mezzi-mobile/',
    '/en/progetti/tracking-live-mezzi-mobile/': '/en/case-study/tracking-live-mezzi-mobile/',
    '/progetti/e2e-testing-infrastructure/': '/case-study/',
    '/en/progetti/e2e-testing-infrastructure/': '/en/case-study/',
    '/progetti/estrarre-prima-che-scada/': '/case-study/',
    '/en/progetti/estrarre-prima-che-scada/': '/en/case-study/',
    '/progetti/homelab-infrastructure/': '/case-study/',
    '/en/progetti/homelab-infrastructure/': '/en/case-study/',
    '/progetti/k6-performance-training/': '/case-study/',
    '/en/progetti/k6-performance-training/': '/en/case-study/',
    '/progetti/keycloak-dotnet-adoption/': '/case-study/',
    '/en/progetti/keycloak-dotnet-adoption/': '/en/case-study/',
    '/progetti/keycloak-workshop/': '/case-study/',
    '/en/progetti/keycloak-workshop/': '/en/case-study/',
    '/progetti/mutation-testing-workshop/': '/case-study/',
    '/en/progetti/mutation-testing-workshop/': '/en/case-study/',
    '/progetti/observability-as-a-service/': '/case-study/',
    '/en/progetti/observability-as-a-service/': '/en/case-study/',
    '/progetti/order-processing-platform/': '/case-study/',
    '/en/progetti/order-processing-platform/': '/en/case-study/',
    '/progetti/pipeline-cicd-proxmox/': '/case-study/',
    '/en/progetti/pipeline-cicd-proxmox/': '/en/case-study/',
    '/progetti/realtime-analytics-pipeline/': '/case-study/',
    '/en/progetti/realtime-analytics-pipeline/': '/en/case-study/',
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
