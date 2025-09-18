# Audio Portfolio (WAV / URL / Artwork)
GitHub Pages にそのままデプロイできる、WAV・外部URL・サムネイル画像対応の静的テンプレートです。

## 使い方（超概要）
- `index.html` と `assets/`, `data/` をリポジトリ直下に配置
- `data/items.json` に作品データを追加
- GitHub Pages を有効化（Settings → Pages）

## データの書き方
`data/items.json` の各要素は以下の通り：
```json
{
  "title": "作品タイトル",
  "description": "説明文",
  "artwork": "assets/art/your-art.png",
  "audio": "assets/audio/your-audio.wav",
  "url": "https://example.com",
  "tags": ["ambient","cinematic"]
}
```

## 制限とヒント
- GitHub は単一ファイル **100MB** を超えるアップロードを拒否します。WAVは短尺/低ビット深度で運用するか、外部CDN等に置いて `audio` をURL指定してください。
- リポジトリは **1GB** 未満推奨。大容量を多用する場合は外部ホスティング（例: Cloudflare R2, Backblaze B2 等）を検討してください。
- ローカルで `index.html` を直接開くと `fetch('data/items.json')` が動かない場合があります（CORS）。ローカルプレビューは簡易HTTPサーバー（例: `python -m http.server`）を使ってください。
