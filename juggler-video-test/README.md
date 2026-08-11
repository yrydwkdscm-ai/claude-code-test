# juggler-video-test

**目的**: 「30秒のショート動画を1本生成できるか」を確認するための、独立した技術検証用フォルダです。

- このリポジトリの既存ファイル（`index.html` / `roulette/` など）には一切変更を加えていません。
- ジャグラーシミュレーター本体との連携は行っていません。今回は `data/sample-data.json` に書かれた**固定データ**のみを使用します。
- 生成した動画（MP4本体）はこのリポジトリにはコミットしていません。ソースコード（テンプレート・データ・スクリプト）のみを管理しています。

## Version 1 と Version 2

Version 1（静止画スライド版）はそのまま残しています。Version 2 は「動画らしい動き」を追加した改善版で、**別ファイル・別出力名**として並行して用意しています。V1のファイルは一切変更していません。

| | Version 1 | Version 2 |
| --- | --- | --- |
| シーン定義 | `scenes/timeline.js` | `scenes/timeline.v2.js` |
| テンプレート | `template/scene.html` | `template/scene.v2.html` |
| 描画方式 | HTML/CSSを静止画スクリーンショット→ffmpegでループ | HTML/CSSアニメーションをPlaywrightで実時間録画（webm）→ffmpegでH.264化 |
| フォント | `assets/fonts/*.subset.woff2` | `assets/fonts/*.v2.subset.woff2`（新しい文言の文字を追加収録） |
| 実行コマンド | `npm run all` | `npm run all:v2` |
| 出力ファイル | `output/juggler-test-30s.mp4` | `output/juggler-test-30s-v2.mp4` |

`data/sample-data.json` はV1・V2で共有していますが、V2用に `slumpGraphs` フィールドを**追加しただけ**で、V1が参照する既存フィールドは変更していません。

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

# Version 1（静止画スライド）
npm run render                # scenes/timeline.js を元に frames/*.png を書き出し
npm run video                  # frames/*.png から output/juggler-test-30s.mp4 を生成
npm run all                     # 上記まとめて実行

# Version 2（動きあり）
npm run render:v2              # scenes/timeline.v2.js を元に frames/v2/*.webm を実時間録画
npm run video:v2                # frames/v2/*.webm から output/juggler-test-30s-v2.mp4 を生成
npm run all:v2                   # 上記まとめて実行
```

## フォルダ構成

```
juggler-video-test/
├── data/sample-data.json       … 今回の固定データ（V1/V2共有。将来はシミュレーター出力に差し替え想定）
├── scenes/
│   ├── timeline.js              … V1: 各シーンの表示テキスト・秒数・強調ルール
│   ├── timeline.v2.js           … V2: 同上 + アニメーション指定（pop/delay/enter）+ スランプグラフ分岐
│   └── slump-graph.js           … V2: 実データがある場合にSVG折れ線グラフを生成するユーティリティ（現状未使用）
├── template/
│   ├── scene.html                … V1: 共通HTMLテンプレート（静止画用）
│   └── scene.v2.html              … V2: 共通HTMLテンプレート（背景モーション・数字ポップイン・段階表示を含む）
├── assets/fonts/                  … 同梱フォント（V1用 *.subset.woff2 / V2用 *.v2.subset.woff2、使用文字のみのsubset）
├── scripts/
│   ├── render-frames.mjs / build-video.mjs         … V1パイプライン
│   └── render-frames.v2.mjs / build-video.v2.mjs    … V2パイプライン（Playwright動画録画→ffmpeg）
├── frames/                        … 生成物（V1: *.png、V2: v2/*.webm。gitignore対象）
└── output/                        … 最終MP4（V1・V2とも。gitignore対象）
```

## シーン構成

### Version 1（0〜30秒）

| 時間 | 内容 |
| --- | --- |
| 0–3s | 「設定6なら全員勝てる？」 |
| 3–7s | 「マイジャグラーV／設定6を20人が8000G回した結果」 |
| 7–12s | 「平均差枚 +2,732枚」 |
| 12–16s | 「勝率 100%」 |
| 16–21s | 「1位 +5,915枚」「20位 +368枚」 |
| 21–26s | 「BIG 1/228」「REG 1/241」「合算 1/117」 |
| 26–30s | 「今回の20人は全員プラス」「でも毎回こうなるとは限らない」 |

### Version 2（0〜30秒、改善点）

| 時間 | 内容 | 追加した動き |
| --- | --- | --- |
| 0–3s | 「設定6を20人が8000G回したら…」→ 少し遅れて「まさかの結果に」 | 段階表示（結論は明かさない） |
| 3–7s | 「マイジャグラーV／設定6を20人が8000G回した結果」 | フェード＋軽いズーム |
| 7–12s | 「平均差枚 +2,732枚」 | 強めのポップイン＋グロー（flagship） |
| 12–16s | 「勝率 100%」 | 強めのポップイン＋グロー（flagship） |
| 16–21s | 「1位 +5,915枚」「20位 +368枚」 | 数字ポップイン（実データがあればスランプグラフに自動切替） |
| 21–26s | 「BIG 1/228」「REG 1/241」「合算 1/117」 | 3行が時間差でポップイン |
| 26–30s | 「今回の20人は」→「全員プラス」（最大強調）→「でも毎回こうなるとは限らない」（小さく） | 結論を最も強くポップ＆グロー |

背景は共通して、非常にゆっくり動く光のグラデーション・薄い粒子・データ分析を思わせる細いグリッド線を重ねています（低速・低不透明度で、派手な演出にはしていません）。

## スランプグラフについて

`scenes/timeline.v2.js` の16〜21秒シーンは、`data/sample-data.json` の `slumpGraphs.rank1`（ゲーム数ごとの差枚推移の配列）が存在する場合のみ、`scenes/slump-graph.js` でSVG折れ線グラフを自動生成して表示します。今回はシミュレーターからこのデータを取得していないため `null` のままにしてあり、架空のグラフは生成せず、代わりに1位/20位の数値表示にフォールバックしています。将来シミュレーターが `{ game, diff }` の配列を出力するようになれば、このフィールドを埋めるだけでグラフ表示に自動的に切り替わります。

## 注意事項

- 今回のデータはテスト用の固定値であり、シミュレーターからの自動出力ではありません。
- `assets/fonts/` の埋め込みフォントは各バージョンで使用する文字だけに絞ったサブセットです。テキスト内容を変更する場合はフォントの再生成が必要です。
- V2の録画（`render-frames.v2.mjs`）はPlaywrightの実時間ビデオ録画を使うため、実行に実時間で30秒強かかります（スクリーンショット方式のV1より遅いですが、実際にCSSアニメーションが再生された結果を記録しています）。
