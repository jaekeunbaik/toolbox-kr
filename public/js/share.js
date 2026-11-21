// Keeps every input of a calculator in the URL (?p=...&r=...) so a link reopens the same result,
// and adds a "링크 복사" button under the answer. Load after the page's own script.
const main = document.querySelector('main');
const fields = [...main.querySelectorAll('input, select')].filter(e => (e.name || e.id) && !e.classList.contains('hp') && e.type !== 'search');
const key = e => e.name || e.id;
const fire = e => e.dispatchEvent(new Event('input', { bubbles: true }));
const query = () => {
  const q = new URLSearchParams();
  for (const e of fields) if (e.type !== 'radio' || e.checked) q.set(key(e), e.value);
  return q;
};

// restore in DOM order, firing input after each so dependent fields (e.g. unit lists) rebuild first
const params = new URLSearchParams(location.search);
for (const e of fields) {
  if (!params.has(key(e))) continue;
  const v = params.get(key(e));
  if (e.type === 'radio') { if (e.value === v) { e.checked = true; fire(e); } }
  else { e.value = v; fire(e); }
}

let timer;
main.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => history.replaceState(null, '', `${location.pathname}?${query()}`), 300);
});

const answer = document.querySelector('.answer') ?? [...document.querySelectorAll('.sentence')].at(-1);
if (answer) {
  const p = document.createElement('p');
  p.className = 'share';
  p.innerHTML = '<button type="button" class="quiet">이 계산 링크 복사</button><span role="status"></span>';
  const [btn, status] = p.children;
  btn.addEventListener('click', async () => {
    clearTimeout(timer);
    const url = `${location.origin}${location.pathname}?${query()}`;
    try { await navigator.clipboard.writeText(url); status.textContent = '복사했어요. 붙여넣어 보내 보세요.'; }
    catch { prompt('이 링크를 복사하세요', url); }
  });
  answer.after(p);
}
