# juggler-video-test

**目的**: 「30秒のショート動画を1本生成できるか」を確認するための、独立した技術検証用フォルダです。

- このリポジトリの既存ファイル（`index.html` / `roulette/` など）には一切変更を加えていません。
- ジャグラーシミュレーター本体との連携は行っていません。今回は `data/sample-data.json` に書かれた**固定データ**のみを使用します。
- 生成した動画（MP4本体）はこのリポジトリにはコミットしていません。ソースコード（テンプレート・データ・スクリプト）のみを管理しています。

## Version 1 / 2 / 3

各バージョンはそのまま残しており、**別ファイル・別出力名**として並行して用意しています。古いバージョンのファイルは一切変更していません。

| | Version 1 | Version 2 | Version 3 |
| --- | --- | --- | --- |
| テーマ | 20人×8000G比較 | 20人×8000G比較 | 1000万Gの大規模シミュレーション（見出しのみ。数値はTEST DATA） |
| シーン定義 | `scenes/timeline.js` | `scenes/timeline.v2.js` | `scenes/timeline.v3.js` |
| テンプレート | `template/scene.html` | `template/scene.v2.html` | `template/scene.v3.html` |
| 描画方式 | 静止画スクショ→ffmpegループ | シーンごとに別ページを実時間録画→ffmpegで連結 | **全シーンを1枚のページに重ね、JSでopacityクロスフェード**→1本の連続録画をffmpegでトリム・書き出し |
| フォント | `assets/fonts/*.subset.woff2` | `assets/fonts/*.v2.subset.woff2` | `assets/fonts/*.v3.subset.woff2` |
| 実行コマンド | `npm run all` | `npm run all:v2` | `npm run all:v3` |
| 出力ファイル | `output/juggler-test-30s.mp4` | `output/juggler-test-30s-v2.mp4` | `output/juggler-test-30s-v3.mp4` |

`data/sample-data.json` は全バージョンで共有していますが、新しいバージョンのフィールドは**追加のみ**で、古いバージョンが参照する既存フィールドは変更していません。

### Version 3でのアーキテクチャ変更（白フラッシュ対策）

V2では「シーンごとに別のPlaywrightページを開いて録画→ffmpegで結合」という方式のため、シーンの数だけページ読み込みが発生し、その都度「読み込み直後の白い初期画面が一瞬映り込む」リスクがありました。

V3では **全シーンを1つのHTMLページの中に重ねて配置し、JavaScriptでopacityを操作してクロスフェードさせる**方式に変更しました。ページの読み込み（ナビゲーション）は動画全体で1回だけなので、白い初期画面が映り込みうる瞬間も1回だけになります。この1回についても、
- `html`/`body`に直接暗い背景色を指定
- 遷移前の空白ページにも暗い背景を強制する `addInitScript`
- 録画開始位置を実測してから安全マージ付きでトリム

という多重の対策を行い、実際に生成したMP4の**全900フレームの平均輝度(YAVG)を解析**して白飛びが無いことを数値で確認しています（詳細は本README末尾の検証結果を参照）。

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

# Version 3（1000万Gテーマ・白フラッシュ対策済み）
npm run render:v3              # scenes/timeline.v3.js を元に frames/v3/video.webm を1本の連続録画として書き出し
npm run video:v3                # frames/v3/video.webm から output/juggler-test-30s-v3.mp4 を生成
npm run all:v3                   # 上記まとめて実行
```

## フォルダ構成

```
juggler-video-test/
├── data/sample-data.json       … 今回の固定データ（V1〜V3共有。将来はシミュレーター出力に差し替え想定）
├── scenes/
│   ├── timeline.js              … V1: 各シーンの表示テキスト・秒数・強調ルール
│   ├── timeline.v2.js           … V2: 同上 + アニメーション指定（pop/delay/enter）+ スランプグラフ分岐
│   ├── timeline.v3.js           … V3: 同上 + 1000万Gテーマの冒頭3シーン + TEST DATAタグ
│   └── slump-graph.js           … 実データがある場合にSVG折れ線グラフを生成するユーティリティ（現状未使用、V2/V3共通）
├── template/
│   ├── scene.html                … V1: 共通HTMLテンプレート（静止画用）
│   ├── scene.v2.html              … V2: 共通HTMLテンプレート（シーンごとに別ページ、背景モーション・数字ポップイン）
│   └── scene.v3.html              … V3: 全シーンを1ページに重ねてopacityクロスフェード（白フラッシュ対策）
├── assets/fonts/                  … 同梱フォント（バージョンごとに *.subset.woff2 / *.v2.subset.woff2 / *.v3.subset.woff2、使用文字のみのsubset）
├── scripts/
│   ├── render-frames.mjs / build-video.mjs           … V1パイプライン
│   ├── render-frames.v2.mjs / build-video.v2.mjs      … V2パイプライン（シーンごとに動画録画→ffmpegで連結）
│   └── render-video.v3.mjs / build-video.v3.mjs        … V3パイプライン（1本の連続録画→ffmpegでトリム・書き出し）
├── frames/                        … 生成物（V1: *.png、V2: v2/*.webm、V3: v3/video.webm。gitignore対象）
└── output/                        … 最終MP4（V1〜V3とも。gitignore対象）
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

### Version 3（0〜30秒、テーマ変更）

| 時間 | 内容 | 備考 |
| --- | --- | --- |
| 0–1.5s | 「マイジャグラーV 設定6」 | `data.machine` / `data.setting` |
| 1.5–3.5s | 「1000万G」（動画中最大・最強調） | `data.totalGames` をフォーマットして表示。強めのポップ＋グロー |
| 3.5–5s | 「回した結果…」 | まだ結論は明かさない |
| 5–10s | TEST DATA タグ＋「平均差枚 +2,732枚」 | `data.averageDifference` |
| 10–14s | TEST DATA タグ＋「勝率 100%」 | `data.winRate` |
| 14–19s | TEST DATA タグ＋「1位 +5,915枚」「20位 +368枚」 | 実データがあればスランプグラフに自動切替 |
| 19–24s | TEST DATA タグ＋「BIG／REG／合算」 | `data.bigProbability` 等 |
| 24–30s | TEST DATA タグ＋「今回の20人は」→「全員プラス」（最大強調）→「でも毎回こうなるとは限らない」 | |

**テーマ変更点**: V3から基本テーマを「N人がG回した結果」から「1000万Gという大規模シミュレーション」に変更しました。ただし今回はまだ実際に1000万Gを回した結果が無いため、表示している平均差枚・勝率・BIG/REG/合算・順位などの数値は**V1/V2で使っていた固定値をそのまま流用したTEST DATA**です。架空の1000万G結果を新規に作ることはしていません。`data/sample-data.json` の `resultsAreTestData: true` フラグに連動して、該当シーンに小さな「TEST DATA」タグを表示し、実測値ではないことを明示しています。実際の1000万Gシミュレーション結果が得られたら、`totalGames` はそのまま、各数値フィールドを実測値に差し替え、`resultsAreTestData` を `false` にすればタグは自動的に消えます。

## スランプグラフについて

`scenes/timeline.v2.js` / `timeline.v3.js` のランキングシーンは、`data/sample-data.json` の `slumpGraphs.rank1`（ゲーム数ごとの差枚推移の配列）が存在する場合のみ、`scenes/slump-graph.js` でSVG折れ線グラフを自動生成して表示します。今回はシミュレーターからこのデータを取得していないため `null` のままにしてあり、架空のグラフは生成せず、代わりに1位/20位の数値表示にフォールバックしています。将来シミュレーターが `{ game, diff }` の配列を出力するようになれば、このフィールドを埋めるだけでグラフ表示に自動的に切り替わります。

## 白フラッシュ対策（Version 3）

V2で報告された「シーン切り替え時に一瞬白く光る」問題への対応として、V3では以下を実施しています。

1. **アーキテクチャ変更**: シーンごとに別ページを開いて録画していたV2に対し、V3は全シーンを1ページに重ねて配置し、JSでopacityをフレームごとに計算してクロスフェードさせる方式に変更。ページ読み込み（ナビゲーション）が動画全体で1回だけになり、「読み込み直後の白い初期画面」が映り込みうる箇所も1回に減少。
2. **多重の背景色ガード**: `<html style="background:...">` の直接指定、CSS内での再指定、`context.addInitScript` による毎ドキュメントへの強制適用（読み込み前の空白ページも含む）。
3. **録画開始位置の実測トリム**: Playwright録画開始からコンテンツのアニメーションが実際に始まるまでの時間を実測し、安全マージンを加えてffmpegでトリム。トリム後の長さが不足する場合はビルドスクリプトがエラーで止まる（無音のまま短い動画が出力されることはない）。
4. **検証**: 完成したMP4の全900フレーム（30fps×30秒）について `signalstats` でフレーム平均輝度(YAVG)を解析。最大でも39/255（0〜255スケール、255が白）に収まっており、白飛びは一切発生していないことを数値で確認済み。あわせて各シーン切り替え前後のフレームを画像として抽出し、目視でも確認しています。

## 注意事項

- 今回のデータはテスト用の固定値であり、シミュレーターからの自動出力ではありません。V3では該当シーンに「TEST DATA」タグを表示して明示しています。
- `assets/fonts/` の埋め込みフォントは各バージョンで使用する文字だけに絞ったサブセットです。テキスト内容を変更する場合はフォントの再生成が必要です。
- V2/V3の録画（`render-frames.v2.mjs` / `render-video.v3.mjs`）はPlaywrightの実時間ビデオ録画を使うため、実行に実時間で30秒強かかります（スクリーンショット方式のV1より遅いですが、実際にCSSアニメーションが再生された結果を記録しています）。
