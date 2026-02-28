/**
 * Content migration script: Hugo -> Astro
 *
 * Reads all Hugo posts from content/posts/ and migrates them to
 * src/content/posts/ with pillar-based directory structure.
 *
 * Usage: npx tsx scripts/migrate-content.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const HUGO_POSTS = path.resolve('content/posts');
const ASTRO_POSTS = path.resolve('src/content/posts');

// ---------------------------------------------------------------------------
// Mapping: Hugo directory path -> Astro pillar/category
// The key is matched against the relative path of a post directory inside
// content/posts/.  We try the longest prefix first.
// ---------------------------------------------------------------------------

interface DestMapping {
  pillar: 'progettare' | 'verificare' | 'automatizzare' | null;
  category: string;
}

const PATH_TO_DEST: Array<[string, DestMapping]> = [
  // progettare
  ['kubernetes/', { pillar: 'progettare', category: 'kubernetes' }],
  ['kafka/', { pillar: 'progettare', category: 'kafka' }],
  ['keycloak/', { pillar: 'progettare', category: 'keycloak' }],
  ['dotnet/', { pillar: 'progettare', category: 'system-design' }],
  ['patterns/', { pillar: 'progettare', category: 'system-design' }],
  // verificare
  ['otel-website-material/', { pillar: 'verificare', category: 'observability' }],
  ['testing/', { pillar: 'verificare', category: 'testing' }],
  // automatizzare
  ['devops-practices/', { pillar: 'automatizzare', category: 'devops' }],
  ['homelab-n8n/', { pillar: 'automatizzare', category: 'homelab' }],
  ['docker-internals/', { pillar: 'automatizzare', category: 'docker' }],
  // altro
  ['web-development/', { pillar: null, category: 'web-development' }],
  ['devcontainer/', { pillar: null, category: 'devcontainer' }],
];

// Map old Hugo pillar values to new Astro enum values
const PILLAR_MAP: Record<string, 'progettare' | 'verificare' | 'automatizzare' | null> = {
  'DevOps & Quality': 'automatizzare',
  'Observability': 'verificare',
  'Event Streaming': 'progettare',
  'Security': 'progettare',
  'System Design': 'progettare',
};

// Series identifier mapping: menu.sidebar.parent -> series slug
const SERIES_MAP: Record<string, string> = {
  'KAFKA': 'kafka',
  'KEYCLOAK': 'keycloak',
  'CAPI': 'homelab-capi',
  'K8S-Core': 'kubernetes-fondamenti',
  'OBS': 'observability',
  'PLAYWRIGHT': 'playwright',
  'PERFT': 'performance-engineering',
  'unit-testing': 'unit-testing',
  'LINQ': 'linq',
  'DEVOPS-CICD': 'cicd',
  'WEBDEV': 'web-development',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFrontmatter(content: string): { data: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: content };
  }
  const data = yaml.load(match[1]) as Record<string, any>;
  return { data: data || {}, body: match[2] };
}

function serializeFrontmatter(data: Record<string, any>, body: string): string {
  const yamlStr = yaml.dump(data, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
    noRefs: true,
    sortKeys: false,
  });
  return `---\n${yamlStr}---\n${body}`;
}

function resolveDestination(relPath: string): DestMapping | null {
  // Normalize: ensure relPath ends with / for consistent prefix matching
  const normalized = relPath.endsWith('/') ? relPath : relPath + '/';
  for (const [prefix, dest] of PATH_TO_DEST) {
    if (normalized.startsWith(prefix)) {
      return dest;
    }
  }
  return null;
}

function isIndexFile(filename: string): boolean {
  return filename === 'index.md' || filename === 'index.en.md';
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

interface PostFile {
  /** Absolute path to the source index.md or index.en.md */
  srcFile: string;
  /** Absolute path to the post directory (containing the index file) */
  srcDir: string;
  /** Relative path from content/posts/ to the post directory */
  relDir: string;
  /** Whether this is the English version */
  isEnglish: boolean;
}

function discoverPosts(): PostFile[] {
  const results: PostFile[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden dirs and _index dirs
        if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
        walk(fullPath);
      } else if (entry.isFile() && isIndexFile(entry.name)) {
        const relDir = path.relative(HUGO_POSTS, dir);
        results.push({
          srcFile: fullPath,
          srcDir: dir,
          relDir,
          isEnglish: entry.name === 'index.en.md',
        });
      }
    }
  }

  walk(HUGO_POSTS);
  return results;
}

function buildSlug(relDir: string): string {
  // The slug is the last component of the path
  // e.g. kafka/01-intro -> 01-intro
  // e.g. kubernetes/homelab-capi-article/01-capi-part1-intro -> 01-capi-part1-intro
  return path.basename(relDir);
}

function migratePost(post: PostFile): void {
  const content = fs.readFileSync(post.srcFile, 'utf-8');
  const { data, body } = parseFrontmatter(content);

  // Skip projects directory — handled separately in Task 7
  if (post.relDir.startsWith('projects/') || post.relDir === 'projects') {
    console.log(`  SKIP (project): ${post.srcFile}`);
    return;
  }

  // Determine destination
  const dest = resolveDestination(post.relDir);
  if (!dest) {
    console.warn(`  WARN: No mapping for ${post.relDir}, skipping`);
    return;
  }

  const slug = buildSlug(post.relDir);
  const pillarDir = dest.pillar ?? 'altro';
  const destDir = path.join(ASTRO_POSTS, pillarDir, dest.category, slug);

  // Create destination directory
  fs.mkdirSync(destDir, { recursive: true });

  // Build new frontmatter
  const newData: Record<string, any> = {};

  // Required fields
  newData.title = data.title || 'Untitled';
  newData.date = data.date || new Date().toISOString();
  newData.description = data.description || data.title || 'No description provided';

  // Pillar: use mapping from old pillar value, or fallback to dest mapping
  if (data.pillar && PILLAR_MAP[data.pillar] !== undefined) {
    newData.pillar = PILLAR_MAP[data.pillar];
  } else {
    newData.pillar = dest.pillar;
  }

  // Category
  newData.category = dest.category;

  // Tags
  if (Array.isArray(data.tags)) {
    newData.tags = data.tags;
  } else if (data.tags) {
    newData.tags = [data.tags];
  } else {
    newData.tags = [];
  }

  // Language
  newData.lang = post.isEnglish ? 'en' : 'it';

  // Draft
  if (data.draft === true) {
    newData.draft = true;
  }

  // Reviewed
  if (data.reviewed !== undefined && data.reviewed !== false) {
    newData.reviewed = data.reviewed;
  }

  // Series: extract from menu.sidebar.parent
  const parentId = data.menu?.sidebar?.parent;
  if (parentId && SERIES_MAP[parentId]) {
    newData.series = SERIES_MAP[parentId];
  }

  // SeriesOrder: from menu.sidebar.weight
  const weight = data.menu?.sidebar?.weight;
  if (weight !== undefined && parentId && SERIES_MAP[parentId]) {
    newData.seriesOrder = weight;
  }

  // Reproducibility
  if (data.reproducibility !== undefined) {
    newData.reproducibility = data.reproducibility;
  }

  // Determine output filename
  const outFilename = post.isEnglish ? 'index.en.md' : 'index.md';
  const outFile = path.join(destDir, outFilename);

  // Write the migrated file
  const output = serializeFrontmatter(newData, body);
  fs.writeFileSync(outFile, output, 'utf-8');

  // Copy non-index files (imgs/, .pipeline/, etc.) — only from Italian source
  // to avoid duplicating files for both language versions
  if (!post.isEnglish) {
    copyAssets(post.srcDir, destDir);
  }

  console.log(`  OK: ${post.srcFile} -> ${outFile}`);
}

function copyAssets(srcDir: string, destDir: string): void {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    // Skip index files (already processed), pipeline dirs, hidden dirs, and stray .md files
    if (entry.name === 'index.md' || entry.name === 'index.en.md') continue;
    if (entry.name.startsWith('.pipeline') || entry.name.startsWith('.reproducibility')) continue;
    if (entry.name.startsWith('.')) continue;
    // Skip non-index .md files (README.md, report.md, skeleton.md etc.)
    if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) continue;

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      // Skip hidden subdirectories
      if (entry.name.startsWith('.')) continue;
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function main() {
  console.log('Discovering Hugo posts...');
  const posts = discoverPosts();
  console.log(`Found ${posts.length} post files\n`);

  console.log('Migrating posts...');
  let ok = 0;
  let skipped = 0;

  for (const post of posts) {
    try {
      const relDir = post.relDir;
      if (relDir.startsWith('projects/') || relDir === 'projects') {
        skipped++;
        continue;
      }
      migratePost(post);
      ok++;
    } catch (err) {
      console.error(`  ERROR: ${post.srcFile}: ${err}`);
    }
  }

  console.log(`\nMigration complete: ${ok} migrated, ${skipped} skipped (projects)`);

  // Summary
  const indexFiles = countFiles(ASTRO_POSTS, 'index.md');
  const enFiles = countFiles(ASTRO_POSTS, 'index.en.md');
  console.log(`\nResult: ${indexFiles} Italian files, ${enFiles} English files in ${ASTRO_POSTS}`);
}

function countFiles(dir: string, name: string): number {
  let count = 0;
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(d, entry.name));
      else if (entry.name === name) count++;
    }
  }
  walk(dir);
  return count;
}

main();
