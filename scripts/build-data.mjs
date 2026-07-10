#!/usr/bin/env node
// Parse + validate + emit (spec §1.5). Validates EVERYTHING first and reports
// all errors at once (contributors shouldn't play whack-a-mole in CI); emits
// only when the whole data/ tree is clean.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import {
  validateMeetup,
  validateModerator,
  validateCommunity,
  privacyLintErrors,
} from './lib/validate.mjs';
import {
  meetupToJson,
  meetupIndexEntry,
  moderatorToJson,
  communityToJson,
} from './lib/emit.mjs';

// CORE_SCHEMA (YAML 1.2) keeps `date: 2026-07-14` and `startTime: 18:00` as
// plain strings — js-yaml's default schema would turn the former into a JS
// Date object and the latter (YAML 1.1 sexagesimal) into the number 1080.
const MATTER_OPTS = {
  engines: { yaml: { parse: (s) => yaml.load(s, { schema: yaml.CORE_SCHEMA }) } },
};

function readEntry(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    const { data, content } = matter(raw, MATTER_OPTS);
    return { raw, data: data ?? {}, content };
  } catch (err) {
    // A YAML syntax error becomes a normal per-file error so every other
    // file still gets validated and reported in the same pass.
    return {
      raw,
      data: {},
      content: '',
      parseError: `frontmatter is not valid YAML: ${err.reason ?? err.message}`,
    };
  }
}

// _*.md files are templates: skipped by validation and emission (spec §1.1).
function listDataFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort();
}

export function buildData({ dataDir, outDir }) {
  const errors = [];
  const addErrors = (rel, errs) => errors.push(...errs.map((e) => `${rel}: ${e}`));

  // ---- read + validate everything ----
  const communityPath = path.join(dataDir, 'community.md');
  let community = null;
  if (!fs.existsSync(communityPath)) {
    errors.push('community.md: missing (required)');
  } else {
    community = readEntry(communityPath);
    if (community.parseError) {
      addErrors('community.md', [community.parseError]);
    } else {
      addErrors('community.md', validateCommunity({ data: community.data }));
    }
    addErrors('community.md', privacyLintErrors(community.raw));
  }

  const avatarsDir = path.join(dataDir, 'moderators', 'avatars');
  const avatarFiles = fs.existsSync(avatarsDir)
    ? fs.readdirSync(avatarsDir).filter((f) => !f.startsWith('.'))
    : [];
  if (!avatarFiles.includes('default.png')) {
    errors.push('moderators/avatars/default.png: missing (required fallback avatar)');
  }

  const meetups = listDataFiles(path.join(dataDir, 'meetups')).map((filename) => {
    const entry = readEntry(path.join(dataDir, 'meetups', filename));
    if (entry.parseError) {
      addErrors(`meetups/${filename}`, [entry.parseError]);
    } else {
      addErrors(`meetups/${filename}`, validateMeetup({ filename, data: entry.data }));
    }
    addErrors(`meetups/${filename}`, privacyLintErrors(entry.raw));
    return { filename, ...entry };
  });

  const moderators = listDataFiles(path.join(dataDir, 'moderators')).map((filename) => {
    const entry = readEntry(path.join(dataDir, 'moderators', filename));
    if (entry.parseError) {
      addErrors(`moderators/${filename}`, [entry.parseError]);
    } else {
      addErrors(
        `moderators/${filename}`,
        validateModerator({ filename, data: entry.data, avatarFiles }),
      );
    }
    addErrors(`moderators/${filename}`, privacyLintErrors(entry.raw));
    return { filename, ...entry };
  });

  if (errors.length > 0) return { errors };

  // ---- emit ----
  const defaults = community.data.schedule;
  const dataOut = path.join(outDir, 'data');
  fs.rmSync(dataOut, { recursive: true, force: true });
  fs.mkdirSync(path.join(dataOut, 'meetups'), { recursive: true });
  fs.mkdirSync(path.join(dataOut, 'moderators'), { recursive: true });

  const meetupJsons = meetups.map(({ filename, data, content }) =>
    meetupToJson({ id: filename.replace(/\.md$/, ''), data, content, defaults }),
  );
  meetupJsons.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0)); // ISO strings sort chronologically
  for (const m of meetupJsons) {
    fs.writeFileSync(path.join(dataOut, 'meetups', `${m.id}.json`), JSON.stringify(m, null, 2));
  }
  fs.writeFileSync(
    path.join(dataOut, 'meetups', 'index.json'),
    JSON.stringify(meetupJsons.map(meetupIndexEntry), null, 2),
  );

  const moderatorJsons = moderators.map(({ filename, data, content }) =>
    moderatorToJson({ id: filename.replace(/\.md$/, ''), data, content }),
  );
  moderatorJsons.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const m of moderatorJsons) {
    fs.writeFileSync(path.join(dataOut, 'moderators', `${m.id}.json`), JSON.stringify(m, null, 2));
  }
  fs.writeFileSync(
    path.join(dataOut, 'moderators', 'index.json'),
    JSON.stringify(moderatorJsons.map(({ bodyHtml, ...card }) => card), null, 2),
  );

  fs.writeFileSync(
    path.join(dataOut, 'community.json'),
    JSON.stringify(communityToJson({ data: community.data, content: community.content }), null, 2),
  );

  fs.cpSync(avatarsDir, path.join(dataOut, 'moderators', 'avatars'), {
    recursive: true,
    filter: (src) => !path.basename(src).startsWith('.'),
  });

  return { errors: [] };
}

// CLI entry: `node scripts/build-data.mjs` from the repo root.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors } = buildData({ dataDir: 'data', outDir: 'dist' });
  if (errors.length > 0) {
    console.error(`✗ data validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}):\n`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log('✓ data validated and emitted to dist/data/');
}
