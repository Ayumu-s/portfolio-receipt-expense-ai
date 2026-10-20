# Receipt Expense AI

レシート画像を支出データへ変換し、一覧・編集・集計まで行うレシート分析アプリです。

> 公開用の決定的なMockモードを実装済みです。APIキーなしで、架空のレシート解析結果を使った一覧・編集・集計を確認できます。

## デモの状態

- Mockモード: 外部サービスへ接続せず、固定の架空データを返す
- 公開版のデモでは、架空のレシートデータだけを使用
- `/upload` に、食料品・カフェ・文具・飲食店・日用品の架空レシートサンプルを用意
- サンプルをクリックすると、ドラッグ＆ドロップなしで解析対象へセットできる
- `/receipts` のデモ一覧には、2024〜2026年・複数月のサンプルを自動表示

Mockモードでは、アップロード処理の後に「Demo Market」「1,280円」などの架空データを返します。実画像の内容を解析した結果ではありません。
サンプル画像を選んだ場合は、ファイル名に対応した固定の架空結果を表示します。
デモ一覧へは不足しているサンプルだけを追加するため、再起動しても重複しません。

## 解決する課題

レシート画像の内容を手入力する負担を減らし、日付・店舗・金額・カテゴリなどを再利用可能な支出データとして管理します。

## 主な機能

- レシート画像のアップロード
- 公開デモ用のサンプルレシート選択
- 画像解析結果の構造化
- 支出の一覧表示、詳細表示、編集
- カテゴリ管理と集計

## アーキテクチャ

- `main.py`: FastAPIアプリ、静的ファイルとAPIの配信
- `public/`: HTMLシェル、通常のJavaScript、画面用CSS/アセット
- `/api/...`: 画面データを返すJSON API。更新系はCSRFトークンを検証
- `services/`、`routers/`: Mock解析、認証、データ処理とAPI境界
- `assets/demo/receipts/`: 公開デモ用の生成済み架空レシート画像

ブラウザは同一オリジンのJSON APIを`fetch()`で呼び出し、Jinja2による画面HTMLのサーバー描画は行いません。APIエラーはJSONで返し、認証CookieはHttpOnlyのまま維持します。レシート画像・ZIPなどのダウンロードはバイナリ応答です。

## 画面API

- `GET /api/session`: デモ状態、CSRFトークン、サンプル画像情報
- `GET /api/receipts`、`GET /api/receipts/{id}`: 一覧と編集用データ
- `GET /api/summary`: 年別集計
- `POST /api/receipts/upload`、`POST /api/receipts/{id}/edit` など: 更新操作
- `GET /api/receipts/{id}/image`、`GET /api/receipts/export`: 画像・出力ファイル

画面上の文字列はHTMLとして挿入せず、JavaScriptの`textContent`で表示します。APIの所有者・権限確認はサーバー側で行います。

## 起動方法

### Mockモード

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
New-Item -ItemType Directory -Force .runtime | Out-Null
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

ブラウザで `http://127.0.0.1:8000` を開くと、ログイン画面を経由せずMockデモへ直接入れます。架空画像をアップロードすると、固定のMockデータが表示されます。`/login`へアクセスした場合もトップ画面へ戻ります。

Mockモードは `services/mock_analysis.py` の固定データを使い、Gemini APIへ接続しません。公開デモ用のサンプル画像と架空一覧データは引き続き利用できます。デモ用DBは一時SQLiteで、ローカル開発では `.runtime`、Vercelでは実行環境の一時領域を使います。いずれも永続保存を前提にしません。

E2E検証では、Vercel用の `api/index.py` ではなく `main.py` を直接読み込む `tests/serve_migration_app.py` を使います。これにより検証ごとに指定したSQLite、localhost向けCookie設定、Mock解析を使用できます。

## Vercel公開デモ

[Receipt Expense AI デモ](https://portfolio-receipt-expense-ai.vercel.app/)

`api/index.py` をVercel Functionsの入口として使用します。Vercel上では`PORTFOLIO_DEMO_MODE=true`と一時SQLiteを使用するため、登録・編集データはデプロイ環境に永続保存されません。公開デモは架空データ専用です。

VercelのProject Rootはリポジトリ直下に設定します。

## テストと確認範囲

Jinja2撤去後のローカル版・デモ版のAPIと画面確認は保留中です。移行用の検証コマンドは `../docs/MIGRATION_JINJA2.md` に記載しています。Playwright確認と6.1 sol / highによる2巡のレビューは、親タスクで実施するまで完了扱いにしません。

## 未実装・制約

- Mock結果は実画像の内容や実AIの品質を再現しない
- Vercel公開デモは一時データで動作し、本番運用向けの永続DB・認証構成ではない

## セキュリティとサンプルデータ

APIキー、認証情報、実レシート画像、個人情報をリポジトリへ含めません。公開版では架空データを使用します。

## ライセンス / 作者

ポートフォリオ公開用。
