// assets/apps.js
(async function () {
  const grid = document.getElementById('grid');
  const search = document.getElementById('search');
  const tpl = document.getElementById('card-template');

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

  // 自分以外だけ止める
  function pauseOthers(current) {
    document.querySelectorAll('audio, video').forEach(m => {
      if (m !== current && !m.paused) m.pause();
    });
  }

  function render(list) {
    grid.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      grid.innerHTML = '<p>データが見つかりません。</p>';
      return;
    }

    list.forEach(item => {
      const node = tpl.content.cloneNode(true);

      const img   = node.querySelector('img');
      const video = node.querySelector('.video');
      const audio = node.querySelector('audio');
      const title = node.querySelector('.title');
      const desc  = node.querySelector('.desc');
      const tags  = node.querySelector('.tags');
      const btn   = node.querySelector('.play-btn');
      const link  = node.querySelector('.open-link');

      title.textContent = item.title || '';
      desc.textContent  = item.description || '';

      const fallback = 'assets/art/sample1.png';
      const artworkSrc = (item.artwork && item.artwork.trim()) ? item.artwork : fallback;
      img.src = artworkSrc;
      img.alt = (item.title || 'artwork');

      if (Array.isArray(item.tags)) {
        item.tags.forEach(t => {
          const s = document.createElement('span');
          s.className = 'tag';
          s.textContent = t;
          tags.appendChild(s);
        });
      }

      if (item.video && String(item.video).trim()) {
        video.hidden = false;
        video.src = item.video;
        if (item.artwork && item.artwork.trim()) video.setAttribute('poster', item.artwork);
        img.hidden = true;
        btn.hidden = true;

        video.addEventListener('play', () => { pauseOthers(video); });

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
          const map = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
          showErr(err ? (map[err.code] || `code=${err.code}`) : 'unknown');
        });

      } else if (item.audio && String(item.audio).trim()) {
        audio.src = item.audio;
        btn.hidden = false;

        btn.addEventListener('click', () => {
          if (audio.paused) {
            pauseOthers(audio);
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
        btn.hidden = true;
      }

      if (item.url && String(item.url).trim()) {
        link.hidden = false;
        link.href = item.url;
        link.textContent = '外部リンク';
      }

      grid.appendChild(node);
    });
  }

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
