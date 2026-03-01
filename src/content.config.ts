import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    pillar: z.enum(['progettare', 'verificare', 'automatizzare']).nullable().default(null),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['it', 'en']).default('it'),
    draft: z.boolean().default(false),
    reviewed: z.union([z.boolean(), z.literal('machine'), z.literal('human')]).default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    heroImage: z.string().optional(),
    reproducibility: z.boolean().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['project', 'workshop']).default('project'),
    pillar: z.enum(['progettare', 'verificare', 'automatizzare']),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    links: z.object({
      github: z.string().optional(),
      demo: z.string().optional(),
      blog: z.string().optional(),
    }).optional(),
    image: z.string().optional(),
    weight: z.number().default(10),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pillar: z.enum(['progettare', 'verificare', 'automatizzare', 'tutti']),
    icon: z.string(),
    cta: z.string(),
    weight: z.number().default(10),
  }),
});

export const collections = { posts, projects, services };
