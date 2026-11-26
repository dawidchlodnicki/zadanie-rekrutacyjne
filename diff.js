(function () {
  const KEYWORDS = new Set(
    'array as async await catch class const else export extends false foreach function if new null private public return static this throw true try use void'.split(' ')
  );
  const TOKEN = /('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\$[A-Za-z_]\w*)|([\p{L}_][\p{L}\p{N}_-]*)/gu;

  const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const span = (cls, text) => `<span class="tk-${cls}">${escapeHtml(text)}</span>`;

  function highlight(code, lang) {
    const markup = lang === 'vue' && code.trimStart().startsWith('<');
    let out = '';
    let last = 0;
    for (const m of code.matchAll(TOKEN)) {
      const [text, str, variable, ident] = m;
      out += escapeHtml(code.slice(last, m.index));
      if (str) out += span('str', text);
      else if (variable) out += span('var', text);
      else if (markup) out += escapeHtml(text);
      else if (KEYWORDS.has(ident)) out += span('kw', text);
      else out += escapeHtml(text);
      last = m.index + text.length;
    }
    return out + escapeHtml(code.slice(last));
  }

  function markersFor(file, markers) {
    const byLine = new Map();
    for (const marker of markers) {
      if (marker.file !== file.path) continue;
      const lines = file.hunks.flatMap((h) => h.lines);
      const index = lines.findIndex((l) => l.slice(1).includes(marker.match));
      if (index === -1) continue;
      if (!byLine.has(index)) byLine.set(index, []);
      byLine.get(index).push(marker);
    }
    return byLine;
  }

  function renderFile(file, markers) {
    const byLine = markersFor(file, markers);
    const markCell = (index) => markers.length
      ? `<td class="d-mark">${(byLine.get(index) || []).map((m) => `<button data-marker="${m.key}" class="${m.critical ? 'crit' : ''}">${m.label}</button>`).join('')}</td>`
      : '';
    let rows = '';
    let index = 0;
    for (const hunk of file.hunks) {
      rows += `<tr class="d-hunk">${markers.length ? '<td></td>' : ''}<td></td><td colspan="2">${escapeHtml(hunk.header)}</td></tr>`;
      let no = hunk.newStart;
      for (const line of hunk.lines) {
        const added = line[0] === '+';
        const marked = byLine.has(index);
        rows += `<tr class="${added ? 'd-add' : ''}${marked ? ' d-marked' : ''}"${marked ? ` id="line-${byLine.get(index)[0].key}"` : ''}>${markCell(index)}<td class="d-num">${no++}</td><td class="d-sign">${added ? '+' : ''}</td><td><code>${highlight(line.slice(1), file.lang) || ' '}</code></td></tr>`;
        index++;
      }
    }
    return `<section class="d-file"><header>${escapeHtml(file.path)}</header><table>${rows}</table></section>`;
  }

  function renderBrief(cr) {
    return `<div class="brief">
      <div class="brief-box instructions"><h4>Co masz zrobić</h4><p>${escapeHtml(cr.instructions)}</p></div>
      <div class="brief-box"><h4>${escapeHtml(cr.ticket.title)}</h4><ul>${cr.ticket.points.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>
      <div class="brief-box"><h4>${escapeHtml(cr.title)}</h4><p>${escapeHtml(cr.description)}</p></div>
    </div>`;
  }

  window.DiffView = {
    renderDiff: (files, markers = []) => files.map((f) => renderFile(f, markers)).join(''),
    renderBrief,
    escapeHtml,
  };
})();
