# 放射線治療かたろう会 世話人講演データベース

世話人の講演・学会発表・関連活動を検索できるWebデータベースです。  
データは [Googleスプレッドシート](https://docs.google.com/spreadsheets/d/1O121_9rzHGKGg9a_zuvp4Vuv6IcilQlk6yyx3_UP_VI/edit?gid=622302178) から自動同期され、**「かたろう会HPでの公開の可否」が「可」の講演のみ**公開されます。

## 構成

```
scripts/sync.mjs          # スプレッドシート → JSON 同期スクリプト
docs/
  index.html              # 公開ページ
  css/style.css
  js/app.js
  data/lectures.json      # 同期で生成されるデータ（git管理）
.github/workflows/
  sync-lectures.yml       # 毎日自動同期（GitHub Actions）
```

## ローカル開発

```bash
# データ同期
npm run sync

# ローカルプレビュー（http://localhost:3000）
npm run dev
```

## 公開方法（GitHub Pages）

1. このリポジトリを GitHub に push
2. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `main` / folder: `/docs`
3. 数分後、`https://<username>.github.io/<repo>/` で公開されます

## 自動更新

`sync-lectures.yml` により、毎日 6:00（JST）にスプレッドシートを取得し、変更があれば `lectures.json` を自動コミットします。手動実行も可能です（Actions → Sync lecture database → Run workflow）。

## スプレッドシート側の設定

同期には **スプレッドシートのCSV公開** が必要です。

- 現在のシートは「リンクを知っている全員が閲覧可」で動作確認済み
- 非公開にする場合は、サービスアカウント等の別方式への変更が必要です

## 公開条件

| 列名 | 公開条件 |
|------|----------|
| かたろう会HPでの公開の可否 | `可` の行のみ掲載 |

## かたろう会HPへの組み込み

公開URLが決まったら、既存HP（[katarou-kai.kenkyuukai.jp](https://katarou-kai.kenkyuukai.jp/)）からリンクを設置するか、iframeで埋め込むことができます。
