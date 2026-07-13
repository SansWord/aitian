// GitHub Actions error surfaces for validation failures (spec 2026-07-12 §3).
// Fork PRs run with a read-only token, so CI can't post PR comments — workflow
// commands (::error) and the step summary need no permissions at all.
// Annotations are file-level: errors come from parsed YAML frontmatter, so
// there are no reliable line numbers; the message carries the field path.

// Escaping per the workflow-command rules — total over every character class
// we emit, so no error text can break (or inject) a command.
function escapeData(s) {
  return s.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function escapeProperty(s) {
  return escapeData(s).replaceAll(':', '%3A').replaceAll(',', '%2C');
}

// buildData errors are "<path relative to data/>: <message>" strings; GitHub
// needs a repo-relative path to pin the annotation in the Files changed tab.
function splitError(error) {
  const i = error.indexOf(': ');
  if (i === -1) return { file: null, message: error };
  return { file: `data/${error.slice(0, i)}`, message: error.slice(i + 2) };
}

export function annotationLines(errors, env = process.env) {
  if (env.GITHUB_ACTIONS !== 'true') return [];
  return errors.map((error) => {
    const { file, message } = splitError(error);
    return file
      ? `::error file=${escapeProperty(file)}::${escapeData(message)}`
      : `::error::${escapeData(message)}`;
  });
}

// Markdown for $GITHUB_STEP_SUMMARY: errors grouped by file, shown on the
// check's summary page — the place the PR's red ✗ links to.
export function stepSummaryMarkdown(errors) {
  const byFile = new Map();
  for (const error of errors) {
    const { file, message } = splitError(error);
    const key = file ?? 'build';
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(message);
  }
  const lines = [
    `## ✗ Data validation failed (${errors.length} error${errors.length === 1 ? '' : 's'})`,
    '',
  ];
  for (const [file, messages] of byFile) {
    lines.push(`### \`${file}\``, '');
    for (const m of messages) lines.push(`- ${m}`);
    lines.push('');
  }
  return lines.join('\n');
}
