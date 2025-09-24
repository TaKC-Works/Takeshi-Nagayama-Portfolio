// assets/apps.js
(async function () {
  const grid   = document.getElementById('grid');
  const search = document.getElementById('search');
  const tpl    = document.getElementById('card-template');

  let items = [];

  // ===== 共通ヘルパー =====
  function pauseOthers(current) {
    document.querySelectorAll('audio, video').forEach(m => {
      if (m !== current && !m.paused) {
        m.pause();
        // ★ 停止時に src を破棄して発熱を防ぐ
        if (m.tagName === 'VIDEO' || m.tagName === 'AUDIO') {
          m.removeAttribute('src');
          try { m.load(); } catch {}
        }
      }
    });
  }
　
  // ★ 再生アイコン状態を常に同期するヘルパー
function bindOverlayState(media, overlay) {
  const set = () => {
    const isPlaying = !(media.paused || media.ended);
    overlay.classList.toggle('playing', isPlaying);
  };
  
  // 再生状態に影響する主要イベントをすべて拾う
  ['play','playing','pause','ended','waiting','seeking',
   'stalled','suspend','abort','emptied','error','loadstart'
  ].forEach(ev => media.addEventListener(ev, set));

  set(); // 初期同期
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

  function resolveFocus(item, strKey, arrKey) {
    if (item[strKey] && String(item[strKey]).trim()) return String(item[strKey]).trim();
    if (Array.isArray(item[arrKey]) && item[arrKey].length >= 2) {
      const clamp = v => Math.max(0, Math.min(100, Number(v)));
      const [x, y] = item[arrKey];
      return `${clamp(x)}% ${clamp(y)}%`;
    }
    return null;
  }

  function setOverlay(overlay, kind) {
    overlay.className = `play-overlay ${kind ? 'is-'+kind : ''}`;
    overlay.innerHTML = `<div class="badge"></div>`;
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
      img.src = artworkSrc;
      img.alt = item.title || 'artwork';
      img.onerror = () => { if (img.src !== fallback) img.src = fallback; };

      // --- 焦点 ---
      const imgFocus = resolveFocus(item, 'focus', 'focal');
      if (imgFocus) img.style.objectPosition = imgFocus;
      const vidFocus = resolveFocus(item, 'focusVideo', 'focalVideo') || imgFocus;
      if (vidFocus) video.style.objectPosition = vidFocus;

      // --- タグ ---
      if (item.tags?.length) {
        tags.innerHTML = item.tags.map(t => `<span class="tag">${t}</span>`).join('');
      }

      // --- 種別判定 ---
      const hasVideo = !!(item.video && String(item.video).trim());
      const hasAudio = !!(item.audio && String(item.audio).trim());
      const hasLink  = !!(item.url   && String(item.url).trim());

      if (hasVideo) {
  setOverlay(overlay, 'video');
  overlay.classList.remove('hidden');

  // サムネは隠し、video を主役に
  img.style.display = 'none';
  video.hidden = false;
  video.preload = 'metadata';
  video.poster  = artworkSrc;
video.playsInline = true;          // ★ 追加（iOS対策）
        
  // 状態同期（←これがポイント）
  bindOverlayState(video, overlay);

  overlay.onclick = () => {
    if (!video.src) {
      const key = `${item.title}::${item.video}`;
      video.src = withBust(item.video, key);
      video.load();
    }
    if (video.paused) {
      pauseOthers(video);
      video.play().catch(err => console.error('再生エラー:', err));
    } else {
      video.pause();
      // src クリアはイベントが流れた後に行うと安全
      setTimeout(() => {
        video.removeAttribute('src');
        try { video.load(); } catch {}
      }, 0);
    }
    // クリック後に状態を再同期（イベント順序対策）
    requestAnimationFrame(() => {
      const isPlaying = !(video.paused || video.ended);
      overlay.classList.toggle('playing', isPlaying);
    });
  };

  // ★ 縦長レイアウト切替（必要なら維持）
  const cardEl = overlay.closest('.card');
  video.addEventListener('play',  () => {
    video.classList.add('is-playing-vertical');
    if (cardEl) cardEl.classList.add('is-vertical-playing');
  });
  const removeVertical = () => {
    video.classList.remove('is-playing-vertical');
    if (cardEl) cardEl.classList.remove('is-vertical-playing');
  };
  video.addEventListener('pause',  removeVertical);
  video.addEventListener('ended',  removeVertical);
  video.addEventListener('emptied', removeVertical);
}
        else if (hasAudio) {
  setOverlay(overlay, 'audio');
  overlay.classList.remove('hidden');

  // 再生アイコン状態を同期
  bindOverlayState(audio, overlay);

  overlay.onclick = () => {
    if (!audio.src) {
      const key = `${item.title}::${item.audio}`;
      audio.src = withBust(item.audio, key);
      audio.load();
    }
    if (audio.paused) {
      pauseOthers(audio);
      audio.play().catch(err => console.error('再生エラー:', err));
    } else {
      audio.pause();
      // src クリアは次フレームで安全に
      setTimeout(() => {
        audio.removeAttribute('src');
        try { audio.load(); } catch {}
      }, 0);
    }
    requestAnimationFrame(() => {
      const isPlaying = !(audio.paused || audio.ended);
      overlay.classList.toggle('playing', isPlaying);
    });
  };
}
      else if (hasLink) {
        setOverlay(overlay, 'link');
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
  try {
    const res = await fetch('data/items.json', { cache: 'no-store' });
    items = await res.json();
    render(items);
  } catch (e) {
    grid.innerHTML = `<p style="color:#c00">items.json を読めませんでした：${String(e)}</p>`;
    console.error('items.json load error', e);
  }
})();
