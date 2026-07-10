// The string-or-{en,zh} shape (spec §1.3): a plain string renders for both
// languages; a map may omit one key (at least one required).

export function bilingualShapeError(value, fieldPath) {
  if (typeof value === 'string') return null;
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    const unknown = keys.filter((k) => k !== 'en' && k !== 'zh');
    if (unknown.length > 0) {
      return `${fieldPath}: unknown language key(s) ${unknown.join(', ')} — only "en"/"zh"`;
    }
    if (keys.length === 0) {
      return `${fieldPath}: language map needs at least one of "en"/"zh"`;
    }
    for (const k of keys) {
      if (typeof value[k] !== 'string') return `${fieldPath}.${k}: must be a string`;
    }
    return null;
  }
  return `${fieldPath}: must be a plain string or an {en, zh} map`;
}

// Split a markdown body on "## en" / "## zh" headings. No language headings →
// the whole body serves both languages; a missing language falls back to the
// one provided.
export function splitBodySections(body) {
  const text = (body ?? '').trim();
  if (text === '') return { en: '', zh: '' };
  const matches = [...text.matchAll(/^##\s+(en|zh)\s*$/gm)];
  if (matches.length === 0) return { en: text, zh: text };
  const out = { en: '', zh: '' };
  matches.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    out[m[1]] = text.slice(start, end).trim();
  });
  if (out.en === '') out.en = out.zh;
  if (out.zh === '') out.zh = out.en;
  return out;
}
