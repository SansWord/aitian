// Emit-side transforms (spec §1.5 job 2). All markdown is rendered and
// sanitized HERE, at build time — the client never parses or trusts raw user
// input (spec §2.7). sanitize-html's allowedSchemes is defense-in-depth behind
// the validator's http(s)-only rule.
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { splitBodySections } from './bilingual.mjs';
import { zonedTimeToInstant } from './time.mjs';

const SANITIZE_OPTS = {
  allowedTags: ['p', 'a', 'em', 'strong', 'ul', 'ol', 'li', 'code', 'pre', 'br', 'blockquote'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https'],
  allowProtocolRelative: false,
};

export function renderMarkdown(md) {
  if (!md || md.trim() === '') return '';
  return sanitizeHtml(marked.parse(md), SANITIZE_OPTS).trim();
}

export function renderInlineMarkdown(md) {
  if (!md || md.trim() === '') return '';
  return sanitizeHtml(marked.parseInline(md), SANITIZE_OPTS).trim();
}

export function renderBilingualBody(body) {
  const { en, zh } = splitBodySections(body);
  return { en: renderMarkdown(en), zh: renderMarkdown(zh) };
}

// string-or-{en,zh} of markdown → {en, zh} of inline HTML (or null when absent).
function bilingualInlineHtml(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const html = renderInlineMarkdown(value);
    return { en: html, zh: html };
  }
  const en = value.en ?? value.zh;
  const zh = value.zh ?? value.en;
  return { en: renderInlineMarkdown(en), zh: renderInlineMarkdown(zh) };
}

export function meetupToJson({ id, data, content, defaults }) {
  const timezone = data.timezone ?? defaults.timezone;
  const startTime = data.startTime ?? defaults.startTime;
  const endTime = data.endTime ?? defaults.endTime;
  return {
    id,
    date: data.date,
    timezone,
    start: zonedTimeToInstant(data.date, startTime, timezone),
    end: zonedTimeToInstant(data.date, endTime, timezone),
    segments: (data.segments ?? []).map((seg) => ({
      type: seg.type,
      title: seg.title,
      speaker: seg.speaker ?? '',
      speakerBioHtml: bilingualInlineHtml(seg.speakerBio),
      materialsUrl: seg.materialsUrl ?? '',
      links: (seg.links ?? []).map(({ label, url }) => ({ label, url })),
    })),
    attendees: data.attendees ?? null,
    bodyHtml: renderBilingualBody(content),
  };
}

// Compact card data: enough to render the featured card and coming-up strip
// without fetching detail files (spec §1.5).
export function meetupIndexEntry(meetupJson) {
  const { id, date, timezone, start, end, attendees } = meetupJson;
  return {
    id,
    date,
    timezone, // cards format times from the index — must be PT-first, never viewer-local (spec §2.2)
    start,
    end,
    attendees,
    segments: meetupJson.segments.map(({ type, title, speaker }) => ({ type, title, speaker })),
  };
}

export function moderatorToJson({ id, data, content }) {
  return {
    id,
    name: data.name,
    bio: data.bio,
    avatar: data.avatar ?? 'default.png',
    links: (data.links ?? []).map(({ label, url }) => ({ label, url })),
    bodyHtml: renderBilingualBody(content),
  };
}

export function communityToJson({ data, content }) {
  return {
    tagline: data.tagline,
    schedule: data.schedule,
    ctas: data.ctas.map(({ id, label, href }) => ({ id, label, href: href ?? '' })),
    bodyHtml: renderBilingualBody(content),
  };
}
