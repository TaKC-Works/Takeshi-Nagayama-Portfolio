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

  // ★ キャッシュバスター用ヘルパー
  function withBust(url, key) {
    try {
      const u = new URL(url, location.href);
      u.searchParams.set('v', String(key));
      return u.toString();
    } catch {
      return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(key);
    }
  }

  function render(list) {
    grid.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      grid.innerHTML = '<p>データが見つかりません。</p>';
      return;
    }

    list.forEach(item => {
      const node  = tpl.content.cloneNode(true);
      const img   = node.querySelector('img');
      const video = node.querySelector('.video');
      const audio = node.querySelector('audio');
      const title = node.querySelector('.title');
      const desc  = node.querySelector('.desc');
      const tags  = node.querySelector('.tags');
      const btn   = node.querySelector('.play-btn');
      const link  = node.querySelector('.open-link');
      const overlay = node.querySelector('.play-overlay');

      // ★ 旧ソースをリセット
      img.removeAttribute('src');
      video.removeAttribute('src');
      audio.removeAttribute('src');
      video.removeAttribute('poster');
      try { video.load(); } catch {}
      try { audio.load(); } catch {}

      // テキスト等
      title.textContent = item.title || '';
      desc.textContent  = item.description || '';

      const fallback = 'assets/art/sample1.png';
      const artworkSrc = (item.artwork && item.artwork.trim()) ? item.artwork : fallback;
      img.src = artworkSrc;
      img.alt = (item.title || 'artwork');

      img.onerror = () => {
        if (img.src !== fallback) img.src = fallback;
      };

      // “焦点”ユーティリティ
      function resolveFocus(imgKey = 'focus', arrKey = 'focal') {
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

      const imgFocus = resolveFocus('focus', 'focal');
      if (imgFocus) img.style.objectPosition = imgFocus;
      const vidFocus = resolveFocus('focusVideo', 'focalVideo') || imgFocus;
      if (vidFocus) video.style.objectPosition = vidFocus;

      if (Array.isArray(item.tags)) {
        item.tags.forEach(t => {
          const s = document.createElement('span');
          s.className = 'tag';
          s.textContent = t;
          tags.appendChild(s);
        });
      }

      // 種類フラグ
      const hasVideo = !!(item.video && String(item.video).trim());
      const hasAudio = !!(item.audio && String(item.audio).trim());
      const hasLink  = !!(item.url   && String(item.url).trim());

      function setOverlay(kind) {
        overlay.className = `play-overlay ${kind ? 'is-'+kind : ''}`;
        const badge = document.createElement('div');
        badge.className = 'badge';
        overlay.replaceChildren(badge);
      }

      function bindOverlayForVideo() {
        overlay.addEventListener('click', () => {
          if (video.paused) { pauseOthers(video); video.play(); } else { video.pause(); }
        });
        video.addEventListener('play',  () => overlay.classList.add('playing'));
        video.addEventListener('pause', () => overlay.classList.remove('playing'));
        video.addEventListener('ended', () => overlay.classList.remove('playing'));
      }
      function bindOverlayForAudio() {
        overlay.addEventListener('click', () => {
          if (audio.paused) { pauseOthers(audio); audio.play(); } else { audio.pause(); }
        });
        audio.addEventListener('play',  () => overlay.classList.add('playing'));
        audio.addEventListener('pause', () => overlay.classList.remove('playing'));
        audio.addEventListener('ended', () => overlay.classList.remove('playing'));
      }
      function bindOverlayForLink() {
        overlay.addEventListener('click', () => {
          window.open(item.url, '_blank', 'noopener');
        });
      }

      // ▼ 優先順位：video > audio > link
      if (hasVideo) {
        const key = `${item.title}::${item.video}`;   // ← 一意なキー
        video.hidden = false;
        video.src = withBust(item.video, key);
        video.setAttribute('poster', artworkSrc);
        video.load();

        img.hidden = true;
        btn.hidden = true;

        setOverlay('video');
        overlay.classList.remove('hidden');
        bindOverlayForVideo();
        video.addEventListener('play', () => pauseOthers(video));
      }
      else if (hasAudio) {
        const key = `${item.title}::${item.audio}`;   // ← 一意なキー
        audio.src = withBust(item.audio, key);
        audio.load();

        btn.hidden = true;
        setOverlay('audio');
        overlay.classList.remove('hidden');
        bindOverlayForAudio();
      }
      else {
        btn.hidden = true;
        if (hasLink) {
          link.hidden = false; 
          link.href = item.url; 
          link.textContent = '外部リンク';
          setOverlay('link');
          overlay.classList.remove('hidden');
          bindOverlayForLink();
        } else {
          overlay.classList.add('hidden');
        }
      }

      if (hasLink) {
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
