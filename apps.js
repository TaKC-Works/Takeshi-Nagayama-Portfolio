// assets/apps.js
(async function () {
  const grid   = document.getElementById('grid');
  const search = document.getElementById('search');
  const tpl    = document.getElementById('card-template');

  // ===== 共通ヘルパー =====
  function pauseOthers(current) {
    document.querySelectorAll('audio, video').forEach(m => {
      if (m !== current && !m.paused) m.pause();
    });
  }

  // キャッシュバスター（同じURLでもカードごとに一意化）
  function withBust(url, key) {
    try {
      const u = new URL(url, location.href);
      u.searchParams.set('v', String(key));
      return u.toString();
    } catch {
      return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(key);
    }
  }

  // object-position を items.json から反映
  function resolveFocus(item, strKey, arrKey) {
    if (item[strKey] && String(item[strKey]).trim()) return String(item[strKey]).trim();
    if (Array.isArray(item[arrKey]) && item[arrKey].length >= 2) {
      const clamp = v => Math.max(0, Math.min(100, Number(v)));
      const [x, y] = item[arrKey];
      return `${clamp(x)}% ${clamp(y)}%`;
    }
    return null;
  }

  // ===== レンダリング =====
  function render(list) {
    grid.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      grid.innerHTML = '<p>データが見つかりません。</p>';
      return;
    }

    list.forEach((item, idx) => {
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
      img.src = artworkSrc;                         // サムネは即表示（遅延させない）
      img.alt = item.title || 'artwork';
      img.onerror = () => { if (img.src !== fallback) img.src = fallback; };

      // --- 焦点 ---
      const imgFocus = resolveFocus(item, 'focus', 'focal');
      if (imgFocus) img.style.objectPosition = imgFocus;
      const vidFocus = resolveFocus(item, 'focusVideo', 'focalVideo') || imgFocus;
      if (vidFocus) video.style.objectPosition = vidFocus;

      // --- タグ ---
      if (item.tags && item.tags.length) {
        tags.innerHTML = item.tags.map(t => `<span class="tag">${t}</span>`).join('');
      }

      // --- 種別判定 ---
      const hasVideo = !!(item.video && String(item.video).trim());
      const hasAudio = !!(item.audio && String(item.audio).trim());
      const hasLink  = !!(item.url   && String(item.url).trim());

      // --- オーバーレイ共通 ---
      function setOverlay(kind) {
        overlay.className = `play-overlay ${kind ? 'is-'+kind : ''}`;
        overlay.innerHTML = `<div class="badge"></div>`;
      }

      // --- 動作（クリックで src を付与 → 再生）---
      if (hasVideo) {
        setOverlay('video');
        overlay.classList.remove('hidden');
        video.setAttribute('preload', 'none');  // 省電力
        video.hidden = false;
        video.setAttribute('poster', artworkSrc);

        overlay.onclick = () => {
          if (!video.src) video.src = withBust(item.video, idx); // 付与は初回のみ
          if (video.paused) { pauseOthers(video); video.play(); } else { video.pause(); }
        };
        video.onplay  = () => overlay.classList.add('playing');
        video.onpause = () => overlay.classList.remove('playing');
        video.onended = () => overlay.classList.remove('playing');

        // サムネとテキストボタンは非表示のまま
      }
      else if (hasAudio) {
        setOverlay('audio');
        overlay.classList.remove('hidden');
        audio.setAttribute('preload', 'none');

        overlay.onclick = () => {
          if (!audio.src) audio.src = withBust(item.audio, idx);
          if (audio.paused) { pauseOthers(audio); audio.play(); } else { audio.pause(); }
        };
        audio.onplay  = () => overlay.classList.add('playing');
        audio.onpause = () => overlay.classList.remove('playing');
        audio.onended = () => overlay.classList.remove('playing');
      }
      else if (hasLink) {
        setOverlay('link');
        overlay.classList.remove('hidden');
        overlay.onclick = () => window.open(item.url, '_blank', 'noopener');
        link.hidden = false;
        link.href = item.url;
        link.textContent = '外部リンク';
      } else {
        overlay.classList.add('hidden');
      }

      grid.appendChild(node);
    });
  }

  // ===== 検索 =====
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

  // ===== 初期ロード =====
  let items = [];
  try {
    const res = await fetch('data/items.json', { cache: 'no-store' });
    items = await res.json();
    render(items);
  } catch (e) {
    grid.innerHTML = `<p style="color:#c00">items.json を読めませんでした：${String(e)}`;
    console.error('items.json load error', e);
  }
})();
