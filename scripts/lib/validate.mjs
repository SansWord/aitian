// Per-file schema validation (spec §1.5). Every function returns an array of
// error message strings — the caller prefixes them with the file path. Clear
// messages matter: this is the CI gate contributors hit on their PRs.
import { isValidTimeZone } from './time.mjs';
import { bilingualShapeError } from './bilingual.mjs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MEETUP_FILENAME_RE = /^\d{4}-\d{2}-\d{2}(-[a-z0-9]+(?:-[a-z0-9]+)*)?\.md$/;
const HTTP_URL_RE = /^https?:\/\//i;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MD_LINK_SCHEME_RE = /\]\(\s*([a-z][a-z0-9+.-]*):/gi;

function isRealDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// `allowed` gates the check; `displayAllowed` is what the error message lists
// (meetup/moderator pass 'id' as allowed so it isn't double-reported as
// "unknown" — it already gets its own dedicated remove-id error — but it must
// not appear in the "allowed:" hint).
function unknownKeyErrors(obj, allowed, ctx, displayAllowed = allowed) {
  return Object.keys(obj)
    .filter((k) => !allowed.includes(k))
    .map((k) => `${ctx}: unknown field "${k}" (allowed: ${displayAllowed.join(', ')})`);
}

function urlError(value, ctx) {
  if (typeof value !== 'string') return `${ctx}: must be a string`;
  if (value !== '' && !HTTP_URL_RE.test(value)) {
    return `${ctx}: must start with http:// or https:// (got "${value}")`;
  }
  return null;
}

function markdownLinkSchemeErrors(md, ctx) {
  const errors = [];
  for (const m of md.matchAll(MD_LINK_SCHEME_RE)) {
    const scheme = m[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      errors.push(`${ctx}: markdown link uses "${scheme}:" — only http(s) links are allowed`);
    }
  }
  return errors;
}

function bilingualErrors(value, ctx, { required = false, markdownLinks = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? [`${ctx}: required`] : [];
  }
  const shapeErr = bilingualShapeError(value, ctx);
  if (shapeErr) return [shapeErr];
  const errors = [];
  const texts = typeof value === 'string' ? [value] : Object.values(value);
  if (required && texts.every((t) => t.trim() === '')) errors.push(`${ctx}: required (empty)`);
  if (markdownLinks) {
    for (const t of texts) errors.push(...markdownLinkSchemeErrors(t, ctx));
  }
  return errors;
}

const MEETUP_KEYS = ['id', 'date', 'startTime', 'endTime', 'timezone', 'segments', 'attendees'];
const SEGMENT_KEYS = ['type', 'title', 'speaker', 'speakerBio', 'materialsUrl'];

export function validateMeetup({ filename, data }) {
  const errors = [];
  if (!MEETUP_FILENAME_RE.test(filename)) {
    errors.push(
      `filename "${filename}" must be YYYY-MM-DD.md or YYYY-MM-DD-slug.md ` +
        '(slug: lowercase a-z0-9, hyphen-separated)',
    );
  }
  if ('id' in data) {
    errors.push('remove "id:" from the frontmatter — the filename is the id');
  }
  errors.push(
    ...unknownKeyErrors(data, MEETUP_KEYS, 'frontmatter', MEETUP_KEYS.filter((k) => k !== 'id')),
  );

  if (typeof data.date !== 'string' || !DATE_RE.test(data.date) || !isRealDate(data.date)) {
    errors.push(
      `date: required, a real calendar date in YYYY-MM-DD format ` +
        `(got ${JSON.stringify(data.date ?? null)})`,
    );
  }
  for (const f of ['startTime', 'endTime']) {
    if (data[f] !== undefined && (typeof data[f] !== 'string' || !TIME_RE.test(data[f]))) {
      errors.push(`${f}: must be "HH:MM" 24-hour — quote it in YAML (got ${JSON.stringify(data[f])})`);
    }
  }
  if (data.timezone !== undefined && !isValidTimeZone(data.timezone)) {
    errors.push(`timezone: "${data.timezone}" is not a valid IANA timezone name`);
  }

  if (!Array.isArray(data.segments)) {
    errors.push('segments: required, must be a list (use "segments: []" for a TBA week)');
  } else {
    data.segments.forEach((seg, i) => {
      const ctx = `segments[${i}]`;
      if (seg === null || typeof seg !== 'object' || Array.isArray(seg)) {
        errors.push(`${ctx}: must be a map with at least "type" and "title"`);
        return;
      }
      errors.push(...unknownKeyErrors(seg, SEGMENT_KEYS, ctx));
      if (seg.type !== 'talk' && seg.type !== 'chat') {
        errors.push(`${ctx}.type: must be "talk" or "chat" (got ${JSON.stringify(seg.type ?? null)})`);
      }
      errors.push(...bilingualErrors(seg.title, `${ctx}.title`, { required: true }));
      if (seg.speaker !== undefined && typeof seg.speaker !== 'string') {
        errors.push(`${ctx}.speaker: must be a plain string display name`);
      } else if (seg.type === 'talk' && (typeof seg.speaker !== 'string' || seg.speaker.trim() === '')) {
        errors.push(`${ctx}.speaker: required for talk segments (display name only — never contact info)`);
      }
      errors.push(...bilingualErrors(seg.speakerBio, `${ctx}.speakerBio`, { markdownLinks: true }));
      if (seg.materialsUrl !== undefined) {
        const e = urlError(seg.materialsUrl, `${ctx}.materialsUrl`);
        if (e) errors.push(e);
      }
    });
  }

  if (
    data.attendees !== undefined &&
    data.attendees !== null &&
    !(Number.isInteger(data.attendees) && data.attendees >= 0)
  ) {
    errors.push(`attendees: must be an integer >= 0 or null (got ${JSON.stringify(data.attendees)})`);
  }
  return errors;
}

export { TIME_RE, HTTP_URL_RE, EMAIL_RE, urlError, unknownKeyErrors, bilingualErrors };
