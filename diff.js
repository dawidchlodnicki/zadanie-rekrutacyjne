(function () {
  const KEYWORDS = new Set(
    'array as async await catch class const else export extends false foreach function if new null private public return static this throw true try use void'.split(' ')
  );
  const TOKEN = /('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\$[A-Za-z_]\w*)|([\p{L}_][\p{L}\p{N}_-]*)/gu;

  const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const span = (cls, text) => `<span class="tk-${cls}">${escapeHtml(text)}</span>`;
  const addedLines = (file) => file.hunks.reduce((n, h) => n + h.lines.filter((l) => l[0] === '+').length, 0);
  const fileName = (path) => path.slice(path.lastIndexOf('/') + 1);

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
    const lines = file.hunks.flatMap((h) => h.lines);
    for (const marker of markers) {
      if (marker.file !== file.path) continue;
      const index = lines.findIndex((l) => l.slice(1).includes(marker.match));
      if (index === -1) continue;
      if (!byLine.has(index)) byLine.set(index, []);
      byLine.get(index).push(marker);
    }
    return byLine;
  }

  function pathHtml(path) {
    const cut = path.lastIndexOf('/') + 1;
    return `<span class="d-dir">${escapeHtml(path.slice(0, cut))}</span><span class="d-name">${escapeHtml(path.slice(cut))}</span>`;
  }

  function renderFile(file, fileIndex, markers) {
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
        rows += `<tr class="${added ? 'd-add' : ''}${marked ? ' d-marked' : ''}"${marked ? ` id="line-${byLine.get(index)[0].key}"` : ''}>${markCell(index)}<td class="d-num" data-pick>${no++}</td><td class="d-sign">${added ? '+' : ''}</td><td class="d-code"><code>${highlight(line.slice(1), file.lang) || ' '}</code></td></tr>`;
        index++;
      }
    }
    return `<section class="d-file" id="file-${fileIndex}"><header><span class="d-path">${pathHtml(file.path)}</span><span class="d-plus">+${addedLines(file)}</span></header><div class="d-scroll"><table>${rows}</table></div></section>`;
  }

  function renderBrief(cr) {
    return {
      todo: `<section class="b-do"><span class="label">Co masz zrobić</span><p>${escapeHtml(cr.instructions)}</p></section>`,
      ticket: `<section class="b-card"><span class="label">${escapeHtml(cr.ticket.label)}</span><h3>${escapeHtml(cr.ticket.title)}</h3><ol>${cr.ticket.points.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ol></section>`,
      pr: `<section class="b-card"><span class="label">${escapeHtml(cr.label)}</span><h3>${escapeHtml(cr.title)}</h3><p>${escapeHtml(cr.description)}</p>
        <nav class="b-files">${cr.files.map((f, i) => `<button data-file="${i}"><span>${escapeHtml(fileName(f.path))}</span><span class="d-plus">+${addedLines(f)}</span></button>`).join('')}</nav>
      </section>`,
    };
  }

  document.addEventListener('click', (e) => {
    const file = e.target.closest('[data-file]');
    if (file) document.getElementById(`file-${file.dataset.file}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const pick = e.target.closest('[data-pick]');
    if (pick) pick.parentElement.classList.toggle('d-pick');
  });

  window.DiffView = {
    renderDiff: (files, markers = []) => files.map((f, i) => renderFile(f, i, markers)).join(''),
    renderBrief,
    escapeHtml,
    fileName,
  };
})();
