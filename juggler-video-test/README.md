# juggler-video-test

**目的**: 「30秒のショート動画を1本生成できるか」を確認するための、独立した技術検証用フォルダです。

- このリポジトリの既存ファイル（`index.html` / `roulette/` など）には一切変更を加えていません。
- ジャグラーシミュレーター本体との連携は行っていません。今回は `data/sample-data.json` に書かれた**固定データ**のみを使用します。
- 生成した動画（MP4本体）はこのリポジトリにはコミットしていません。ソースコード（テンプレート・データ・スクリプト）のみを管理しています。

## 何を作るか

マイジャグラーV・設定6を20人が8000G回した検証結果を、縦型9:16・約30秒のショート動画（無音・日本語・暗い背景＋金色ハイライト）にまとめたMP4を生成します。TikTok / YouTube Shorts / X 想定。

## 技術構成

| 用途 | 技術 |
| --- | --- |
| 各シーンの画像化 | HTML/CSS を Playwright（Chromiumヘッドレス）で 1080×1920 のPNGにスクリーンショット |
| 動画への合成 | ffmpeg（各PNGをシーン尺のクリップ化 → フェードIN/OUT → 連結 → MP4書き出し） |
| フォント | Noto Sans JP（Bold / Black）を今回使用する文字だけに subset した woff2 を `assets/fonts/` に同梱（自己完結・環境非依存） |

Remotionではなくこの構成を選んだ理由や比較は、実装前にチャットで説明した提案メッセージを参照してください。

## 必要な環境

- Node.js（`playwright-core` のみを devDependency として使用。ブラウザ本体はダウンロードせず、環境に用意済みの Chromium を `PLAYWRIGHT_CHROMIUM_PATH`（既定 `/opt/pw-browsers/chromium`）経由で再利用します）
- `ffmpeg`（H.264 / AAC 対応のフルビルド。Playwright付属の ffmpeg は H.264/MP4 非対応なため使えません。Ubuntu系なら `apt-get install -y ffmpeg` で導入できます）

## 使い方

```bash
cd juggler-video-test
npm install                 # playwright-core のみ取得
npm run render               # scenes/timeline.js を元に frames/*.png を書き出し
npm run video                 # frames/*.png から output/juggler-test-30s.mp4 を生成
# まとめて実行する場合:
npm run all
```

## フォルダ構成

```
juggler-video-test/
├── data/sample-data.json     … 今回の固定データ
├── scenes/timeline.js         … 各シーンの表示テキスト・秒数・強調ルール
├── template/scene.html        … 共通HTMLテンプレート（暗背景+CSS、フォント埋め込み、はみ出し防止の自動縮小スクリプト）
├── assets/fonts/               … 同梱フォント（今回の文言のみに subset 済み。文言を変える場合は再subsetが必要）
├── scripts/render-frames.mjs   … シーン→PNG化
├── scripts/build-video.mjs      … PNG→MP4化（ffmpeg呼び出し）
├── frames/                      … 生成物（gitignore対象）
└── output/                      … 最終MP4（gitignore対象）
```

## シーン構成（0〜30秒）

| 時間 | 内容 |
| --- | --- |
| 0–3s | 「設定6なら全員勝てる？」 |
| 3–7s | 「マイジャグラーV／設定6を20人が8000G回した結果」 |
| 7–12s | 「平均差枚 +2,732枚」 |
| 12–16s | 「勝率 100%」 |
| 16–21s | 「1位 +5,915枚」「20位 +368枚」 |
| 21–26s | 「BIG 1/228」「REG 1/241」「合算 1/117」 |
| 26–30s | 「今回の20人は全員プラス」「でも毎回こうなるとは限らない」 |

## 注意事項

- 今回のデータはテスト用の固定値であり、シミュレーターからの自動出力ではありません。
- `assets/fonts/` の埋め込みフォントは今回使用する文字（数字・記号・上記シーンで使う漢字仮名）だけに絞ったサブセットです。テキスト内容を変更する場合はフォントの再生成が必要です。
