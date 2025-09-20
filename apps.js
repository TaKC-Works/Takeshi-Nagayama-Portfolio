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
  const node  = tpl.content.cloneNode(true);
  const img   = node.querySelector('img');
  const video = node.querySelector('.video');
  const audio = node.querySelector('audio');
  const title = node.querySelector('.title');
  const desc  = node.querySelector('.desc');
  const tags  = node.querySelector('.tags');
  const btn   = node.querySelector('.play-btn');
  const link  = node.querySelector('.open-link');

  // ★ 追加：オーバーレイ要素
  const overlay = node.querySelector('.play-overlay');

  // テキスト等は既存のまま
  title.textContent = item.title || '';
  desc.textContent  = item.description || '';

  const fallback = 'assets/art/sample1.png';
  const artworkSrc = (item.artwork && item.artwork.trim()) ? item.artwork : fallback;
// 既存
img.src = artworkSrc;
img.alt = (item.title || 'artwork');

// 追加：画像エラーフォールバック
img.onerror = () => {
  if (img.src !== fallback) img.src = fallback;
};

// ▼▼ “焦点”ユーティリティ（0–100に丸める）
function resolveFocus(imgKey = 'focus', arrKey = 'focal') {
  if (item[imgKey] && String(item[imgKey]).trim()) {
    return String(item[imgKey]).trim();  // e.g. "center top"
  }
  if (Array.isArray(item[arrKey]) && item[arrKey].length >= 2) {
    const clamp = v => Math.max(0, Math.min(100, Number(v)));
    const [x, y] = item[arrKey];
    return `${clamp(x)}% ${clamp(y)}%`;  // e.g. [50,30] -> "50% 30%"
  }
  return null;
}

// 画像（サムネ）の焦点
const imgFocus = resolveFocus('focus', 'focal');
if (imgFocus) img.style.objectPosition = imgFocus;

// 動画の焦点（あれば専用、なければ画像と同じ）
const vidFocus = resolveFocus('focusVideo', 'focalVideo') || imgFocus;
if (vidFocus) {
  video.style.objectPosition = vidFocus;
}
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

  // overlay の内容をセット（種類別バッジ）
function setOverlay(kind) {
  overlay.className = `play-overlay ${kind ? 'is-'+kind : ''}`;
  const badge = document.createElement('div');
  badge.className = 'badge';
  // badge.textContent = ... ← 削除！
  overlay.replaceChildren(badge);
}

  // クリックで再生/停止・リンク遷移
  function bindOverlayForVideo() {
    overlay.addEventListener('click', () => {
      if (video.paused) { pauseOthers(video); video.play(); } else { video.pause(); }
    });
  // video 側
video.addEventListener('play',  () => overlay.classList.add('playing'));
video.addEventListener('pause', () => overlay.classList.remove('playing'));
video.addEventListener('ended', () => overlay.classList.remove('playing'));
  }
  function bindOverlayForAudio() {
    overlay.addEventListener('click', () => {
      if (audio.paused) { pauseOthers(audio); audio.play(); }
      else { audio.pause(); }
    });
// audio 側
audio.addEventListener('play',  () => overlay.classList.add('playing'));
audio.addEventListener('pause', () => overlay.classList.remove('playing'));
audio.addEventListener('ended', () => overlay.classList.remove('playing'));
  }
  function bindOverlayForLink() {
    overlay.addEventListener('click', () => {
      window.open(item.url, '_blank', 'noopener');
    });
  }

  // ▼▼ 優先順位：video > audio > link
  if (hasVideo) {
  video.hidden = false;
  video.src = item.video;

  // ★ 差し替え：常に artworkSrc を poster に使う
  // （fallback の sample1.png でも必ず効くようになる）
  video.setAttribute('poster', artworkSrc);

  // ★ 追加：動画専用 or 共通の焦点を反映
  const vidFocus = resolveFocus('focusVideo', 'focalVideo') || imgFocus;
  if (vidFocus) {
    video.style.objectPosition = vidFocus;
  }

  img.hidden = true;
  btn.hidden = true;

  setOverlay('video');           // ▶︎
  overlay.classList.remove('hidden');
  bindOverlayForVideo();

  // エラーハンドリング（任意）
  video.addEventListener('play', () => pauseOthers(video));
}
 else if (hasAudio) {
  audio.src = item.audio;

  // ▼ テキストの再生ボタンは使わない（常に隠す）
  btn.hidden = true;

  // ▼ サムネ中央の種別アイコン（🎧）だけで操作
  setOverlay('audio');           // 🎧
  overlay.classList.remove('hidden');
  bindOverlayForAudio();

  // （btn.addEventListener... や btnテキスト更新は全て削除）
  }
  else {
    // 再生メディアなし
    btn.hidden = true;
    if (hasLink) {
      link.hidden = false; link.href = item.url; link.textContent = '外部リンク';
      setOverlay('link');         // 🔗
      overlay.classList.remove('hidden');
      bindOverlayForLink();
    } else {
      // 何もないならオーバーレイ非表示
      overlay.classList.add('hidden');
    }
  }

  // 既存：外部リンクの表示（音声/動画があっても併記でOK）
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
