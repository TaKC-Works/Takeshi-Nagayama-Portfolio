// assets/apps.js
(async function () {
  const grid   = document.getElementById('grid');
  const search = document.getElementById('search');
  const tpl    = document.getElementById('card-template');

  // ====== 共通ヘルパー ======
  function pauseOthers(current) {
    document.querySelectorAll('audio, video').forEach(m => {
      if (m !== current && !m.paused) m.pause();
    });
  }

  function withBust(url, key) {
    try {
      const u = new URL(url, location.href);
      u.searchParams.set('v', String(key));
      return u.toString();
    } catch {
      return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(key);
    }
  }

  function resolveFocus(item, imgKey, arrKey) {
    if (item[imgKey] && String(item[imgKey]).trim()) {
      return String(item[imgKey]).trim();
    }
    if (Array.isArray(item[arrKey]) && item[arrKey].length >= 2) {
      const clamp = v => Math.max(0, Math.min(100, Number(v)));
      const [x, y] = item[arrKey];
      return `${clamp(x)}% ${clamp(y)}%`;
    }
    return null;
  }

  // ====== メインレンダラー ======
  function render(list) {
    grid.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      grid.innerHTML = '<p>データが見つかりません。</p>';
      return;
    }

    list.forEach(item => {
      const node    = tpl.content.cloneNode(true);
      const img     = node.querySelector('img');
      const video   = node.querySelector('.video');
      const audio   = node.querySelector('audio');
      const title   = node.querySelector('.title');
      const desc    = node.querySelector('.desc');
      const tags    = node.querySelector('.tags');
      const link    = node.querySelector('.open-link');
      const overlay = node.querySelector('.play-overlay');

      // --- 基本情報 ---
      title.textContent = item.title || '';
      desc.textContent  = item.description || '';

      const fallback   = 'assets/art/sample1.png';
      const artworkSrc = (item.artwork && item.artwork.trim()) ? item.artwork : fallback;
      img.src = artworkSrc;
      img.alt = item.title || 'artwork';
      img.onerror = () => { if (img.src !== fallback) img.src = fallback; };

      // --- 焦点処理 ---
      const imgFocus = resolveFocus(item, 'focus', 'focal');
      if (imgFocus) img.style.objectPosition = imgFocus;
      const vidFocus = resolveFocus(item, 'focusVideo', 'focalVideo') || imgFocus;
      if (vidFocus) video.style.objectPosition = vidFocus;

      // --- タグ描画 ---
      (item.tags || []).forEach(t => {
        const s = document.createElement('span');
        s.className = 'tag';
        s.textContent = t;
        tags.appendChild(s);
      });

      // --- 種類判定 ---
      const hasVideo = !!(item.video && String(item.video).trim());
      const hasAudio = !!(item.audio && String(item.audio).trim());
      const hasLink  = !!(item.url   && String(item.url).trim());

      // --- 共通オーバーレイ描画 ---
      function setOverlay(kind) {
        overlay.className = `play-overlay ${kind ? 'is-'+kind : ''}`;
        overlay.replaceChildren(Object.assign(document.createElement('div'), { className: 'badge' }));
      }

      // --- 動作バインド ---
      if (hasVideo) {
        setOverlay('video');
        overlay.classList.remove('hidden');

        overlay.addEventListener('click', () => {
          if (!video.src) {
            video.src = withBust(item.video, `${item.title}::${item.video}`);
            video.setAttribute('poster', artworkSrc);
            video.load();
          }
          if (video.paused) { pauseOthers(video); video.play(); } else { video.pause(); }
        });

        video.addEventListener('play',  () => overlay.classList.add('playing'));
        video.addEventListener('pause', () => overlay.classList.remove('playing'));
        video.addEventListener('ended', () => overlay.classList.remove('playing'));
      }
      else if (hasAudio) {
        setOverlay('audio');
        overlay.classList.remove('hidden');

        overlay.addEventListener('click', () => {
          if (!audio.src) {
            audio.src = withBust(item.audio, `${item.title}::${item.audio}`);
            audio.load();
          }
          if (audio.paused) { pauseOthers(audio); audio.play(); } else { audio.pause(); }
        });

        audio.addEventListener('play',  () => overlay.classList.add('playing'));
        audio.addEventListener('pause', () => overlay.classList.remove('playing'));
        audio.addEventListener('ended', () => overlay.classList.remove('playing'));
      }
      else if (hasLink) {
        setOverlay('link');
        overlay.classList.remove('hidden');
        overlay.addEventListener('click', () => window.open(item.url, '_blank', 'noopener'));
        link.hidden = false;
        link.href = item.url;
        link.textContent = '外部リンク';
      } else {
        overlay.classList.add('hidden');
      }

      grid.appendChild(node);
    });
  }

  // ====== 検索処理 ======
  function normalize(s){ return (s||'').toString().toLowerCase(); }
  function matches(q, item){
    const n = normalize(q);
    return normalize(item.title).includes(n) ||
           normalize(item.description).includes(n) ||
           (item.tags || []).some(t => normalize(t).includes(n));
  }

  search.addEventListener('input', () => {
    const q = search.value.trim();
    render(q ? items.filter(it => matches(q, it)) : items);
  });

  // ====== 初期ロード ======
  let items = [];
  try {
    const res = await fetch('data/items.json', { cache: 'no-store' });
    items = await res.json();
    render(items);
  } catch (e) {
    grid.innerHTML = `<p style="color:#c00">items.json を読めませんでした：${String(e)}</p>`;
    console.error('items.json load error', e);
  }
})();
