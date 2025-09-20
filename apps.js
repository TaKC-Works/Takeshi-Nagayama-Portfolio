//apps.js
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
  // 他のaudio/videoを止めるユーティリティ
  function pauseAllMedia() {
    document.querySelectorAll('audio').forEach(a => { if (!a.paused) a.pause(); });
    document.querySelectorAll('video').forEach(v => { if (!v.paused) v.pause(); });
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

      // 要素取得
      const img   = node.querySelector('img');
      const video = node.querySelector('.video');      // ★ 追加：video
      const audio = node.querySelector('audio');
      const title = node.querySelector('.title');
      const desc  = node.querySelector('.desc');
      const tags  = node.querySelector('.tags');
      const btn   = node.querySelector('.play-btn');
      const link  = node.querySelector('.open-link');

      // テキスト
      title.textContent = item.title || '';
      desc.textContent  = item.description || '';

      // サムネ（fallback運用）
      const fallback = 'assets/art/sample1.png';
      const artworkSrc = (item.artwork && item.artwork.trim()) ? item.artwork : fallback;
      img.src = artworkSrc;
      img.alt = (item.title || 'artwork');

      // タグ
      if (Array.isArray(item.tags)) {
        item.tags.forEach(t => {
          const s = document.createElement('span');
          s.className = 'tag';
          s.textContent = t;
          tags.appendChild(s);
        });
      }

   // ▼▼ メディア分岐：video
if (item.video && String(item.video).trim()) {
  video.hidden = false;
  video.src = item.video;
  if (item.artwork && item.artwork.trim()) video.setAttribute('poster', item.artwork);
  img.hidden = true;
  btn.hidden = true;

  video.addEventListener('play', () => { pauseAllMedia(); });

  // ★ 追加：再生トラブルの可視化
  const meta = node.querySelector('.meta');
  function showErr(msg){
    const p = document.createElement('p');
    p.style.color = '#c00';
    p.style.fontSize = '0.8rem';
    p.textContent = `Video error: ${msg}`;
    meta.appendChild(p);
  }
  video.addEventListener('error', () => {
    const err = video.error;
    if (!err) return showErr('unknown');
    const map = {
      1: 'ABORTED',      // ユーザー中断
      2: 'NETWORK',      // ネットワークエラー
      3: 'DECODE',       // デコード不可（コーデック不一致など）
      4: 'SRC_NOT_SUPPORTED' // MIME/CORS/Range等
    };
    showErr(map[err.code] || `code=${err.code}`);
  });
}
      else if (item.audio && String(item.audio).trim()) {
        // 従来のオーディオ表示
        audio.src = item.audio;
        btn.hidden = false;

        btn.addEventListener('click', () => {
          if (audio.paused) {
            pauseAllMedia();
            audio.play();
            btn.textContent = '⏸ 停止';
          } else {
            audio.pause();
            btn.textContent = '▶︎ 再生';
          }
        });
        audio.addEventListener('pause', () => { btn.textContent = '▶︎ 再生'; });
        audio.addEventListener('ended', () => { btn.textContent = '▶︎ 再生'; });
      } else {
        // どちらもない場合は再生ボタン非表示
        btn.hidden = true;
      }

      // 外部リンク
      if (item.url && String(item.url).trim()) {
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






