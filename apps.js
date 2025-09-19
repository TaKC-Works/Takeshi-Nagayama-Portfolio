// assets/app.js
(async function () {
  const grid = document.getElementById('grid');
  const search = document.getElementById('search');
  const tpl = document.getElementById('card-template');

  // 1) JSONを読み込み（失敗時は画面に原因表示）
  let items = [];
  try {
    const res = await fetch('data/items.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    items = await res.json();
  } catch (e) {
    grid.innerHTML = `<p style="color:#c00">items.json を読めませんでした：${String(e)}</p>`;
    console.error('items.json load error', e);
    return;
  }

  // 2) レンダリング
  function render(list) {
    grid.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      grid.innerHTML = '<p>データが見つかりません。</p>';
      return;
    }
    list.forEach(item => {
      const node = tpl.content.cloneNode(true);
      const img = node.querySelector('img');
      const title = node.querySelector('.title');
      const desc = node.querySelector('.desc');
      const tags = node.querySelector('.tags');
      const audio = node.querySelector('audio');
      const btn = node.querySelector('.play-btn');
      const link = node.querySelector('.open-link');

      title.textContent = item.title || '';
      desc.textContent = item.description || '';

      if (item.artwork) {
        img.src = item.artwork;
      } else {
        img.remove(); // サムネ無ければ枠ごと省略
      }

      if (Array.isArray(item.tags)) {
        item.tags.forEach(t => {
          const s = document.createElement('span');
          s.className = 'tag';
          s.textContent = t;
          tags.appendChild(s);
        });
      }

      if (item.audio) {
        audio.src = item.audio;
        btn.hidden = false;
        btn.addEventListener('click', () => {
          if (audio.paused) { audio.play(); btn.textContent = '⏸ 停止'; }
          else { audio.pause(); btn.textContent = '▶︎ 再生'; }
        });
      }

      if (item.url) {
        link.hidden = false;
        link.href = item.url;
        link.textContent = '外部リンク';
      }

      grid.appendChild(node);
    });
  }

  // 3) 検索
  function normalize(s){ return (s||'').toString().toLowerCase(); }
  function matches(q, item){
    const n = normalize(q);
    return normalize(item.title).includes(n) ||
           normalize(item.description).includes(n) ||
           (Array.isArray(item.tags) && item.tags.some(t=>normalize(t).includes(n)));
  }
  search.addEventListener('input', () => {
    const q = search.value.trim();
    render(q ? items.filter(it => matches(q, it)) : items);
  });

  render(items);
})();
