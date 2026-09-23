'use strict';
const root = document.body.dataset.root || './';
const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/iss-(\d{3})(?!\d)/g, (_, n) => `iss-${n.padStart(4,'0')}`);
const searchForm = document.querySelector('[data-search-form]');
if (searchForm) searchForm.addEventListener('submit', event => {
  event.preventDefault();
  const q = new FormData(searchForm).get('q').trim();
  location.href = `${root}search/?q=${encodeURIComponent(q)}`;
});
const filters = [...document.querySelectorAll('[data-filter]')];
function filterCards() {
  const cards = [...document.querySelectorAll('[data-record]')];
  let visible = 0;
  for (const card of cards) {
    const match = filters.every(control => !control.value || card.dataset[control.dataset.filter] === control.value);
    card.hidden = !match;
    if (match) visible++;
  }
  const count = document.querySelector('[data-count]');
  if (count) count.textContent = `顯示 ${visible} / ${cards.length} 項`;
  const empty = document.querySelector('[data-filter-empty]');
  if (empty) empty.hidden = visible > 0;
}
filters.forEach(control => control.addEventListener('change', filterCards));
if (filters.length) filterCards();
const results = document.querySelector('[data-search-results]');
if (results) {
  let index = [], activeType = '';
  const q = new URLSearchParams(location.search).get('q') || '';
  document.querySelector('input[name=q]').value = q;
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  function render() {
    results.replaceChildren();
    const matches = terms.length ? index.filter(item => (!activeType || item.type === activeType) && terms.every(t => normalize(`${item.id} ${item.title} ${item.text}`).includes(t))) : [];
    matches.sort((a,b) => Number(terms.some(t => normalize(b.title).includes(t))) - Number(terms.some(t => normalize(a.title).includes(t))));
    document.querySelector('[data-result-count]').textContent = terms.length ? `「${q}」找到 ${matches.length} 筆資料` : '輸入關鍵字，搜尋議題、文件及會議全文。';
    if (!matches.length) {
      const box = document.createElement('div'); box.className = 'empty';
      const heading = document.createElement('h2'); heading.textContent = terms.length ? '沒有符合的結果' : '想了解社區的哪件事？';
      const hint = document.createElement('p'); hint.textContent = terms.length ? '試試較短的關鍵字，或切換其他資料類型。' : '例如：電梯、公共冰箱、管理費，或議題編號。';
      box.append(heading,hint); results.append(box); return;
    }
    for (const item of matches) {
      const card = document.createElement('article'); card.className = 'card';
      const meta = document.createElement('div'); meta.className = 'card-top';
      const badge = document.createElement('span'); badge.className = 'badge neutral'; badge.textContent = item.type;
      const id = document.createElement('span'); id.className = 'id'; id.textContent = item.id;
      meta.append(badge,id);
      const title = document.createElement('h3'); const link = document.createElement('a'); link.href = root + item.url; link.textContent = item.title; title.append(link);
      const snippet = document.createElement('p'); snippet.className = 'result-snippet';
      const pos = Math.max(0, normalize(item.text).indexOf(terms[0]));
      const start = Math.max(0,pos-35); snippet.textContent = `${start ? '…' : ''}${item.text.slice(start,start+180)}${item.text.length > start+180 ? '…' : ''}`;
      card.append(meta,title,snippet); results.append(card);
    }
  }
  document.querySelectorAll('[data-search-type]').forEach(button => button.addEventListener('click', () => {
    activeType = button.dataset.searchType;
    document.querySelectorAll('[data-search-type]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
    render();
  }));
  fetch(root + 'data/search-index.json').then(response => {
    if (!response.ok) throw new Error('無法讀取搜尋資料');
    return response.json();
  }).then(data => {index=data; render();}).catch(() => {
    document.querySelector('[data-result-count]').textContent = '搜尋資料暫時無法載入，請重新整理。';
  });
}
