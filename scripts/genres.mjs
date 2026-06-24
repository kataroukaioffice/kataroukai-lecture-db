/**
 * 講演ジャンル定義
 * タイトル・備考・会の名称からキーワードマッチで自動分類
 */

export const GENRES = [
  {
    id: "medical-safety",
    label: "医療安全",
    patterns: [
      /医療安全/i,
      /インシデント/i,
      /グッドキャッチ/i,
      /ヒューマン/i,
      /安全文化/i,
      /Good Job/i,
      /リスクマネジ/i,
      /安全と質/i,
      /質マネジメント/i,
    ],
  },
  {
    id: "qa-qc",
    label: "QA/QC",
    patterns: [
      /QA/i,
      /QC/i,
      /品質管理/i,
      /精度管理/i,
      /PSQA/i,
      /患者\s*QA/i,
      /プランチェック/i,
      /線量検証/i,
      /EPID/i,
      /独立検証/i,
      /独立計算/i,
    ],
  },
  {
    id: "treatment-planning",
    label: "治療計画",
    patterns: [
      /治療計画/i,
      /IMRT/i,
      /VMAT/i,
      /\bSRS\b/i,
      /SBRT/i,
      /RapidPlan/i,
      /HyperArc/i,
      /最適化/i,
      /Optimization/i,
      /線量計算/i,
      /アルゴリズム/i,
    ],
  },
  {
    id: "equipment-physics",
    label: "装置・物理",
    patterns: [
      /リニアック/i,
      /直線加速/i,
      /線量計/i,
      /校正/i,
      /コミッショニング/i,
      /計測法/i,
      /遮へい/i,
      /ビーム/i,
      /装置/i,
      /Radixact/i,
      /CyberKnife/i,
      /MLC/i,
      /電子線/i,
      /Cross/i,
    ],
  },
  {
    id: "igrt",
    label: "IGRT・定位",
    patterns: [
      /IGRT/i,
      /SGRT/i,
      /定位/i,
      /iCBCT/i,
      /セットアップ/i,
      /固定精度/i,
      /AlignRT/i,
      /照合/i,
      /マーキング/i,
      /体動/i,
    ],
  },
  {
    id: "workflow",
    label: "業務・組織",
    patterns: [
      /タスク/i,
      /シフト/i,
      /シェア/i,
      /業務/i,
      /人材/i,
      /継承/i,
      /育成/i,
      /組織/i,
      /チーム/i,
      /効率化/i,
    ],
  },
  {
    id: "ai-digital",
    label: "AI・デジタル",
    patterns: [
      /AI/i,
      /生成AI/i,
      /動画/i,
      /スクリプト/i,
      /デジタル/i,
    ],
  },
  {
    id: "disaster-bcp",
    label: "災害・BCP",
    patterns: [/災害/i, /故障/i, /Fault/i, /BCP/i, /復旧/i, /緊急/i],
  },
  {
    id: "research-education",
    label: "研究・教育",
    patterns: [
      /研究/i,
      /論文/i,
      /執筆/i,
      /教育/i,
      /Rising Star/i,
      /アンケート/i,
      /学会/i,
    ],
  },
  {
    id: "patient-care",
    label: "患者ケア",
    patterns: [/患者説明/i, /ボーラス/i, /着衣/i, /乳房/i, /小児/i, /AYA/i],
  },
];

export function lectureText(lecture) {
  return [lecture.title, lecture.notes, lecture.eventName].filter(Boolean).join(" ");
}

export function assignGenres(lecture) {
  const text = lectureText(lecture);
  return GENRES.filter((genre) => genre.patterns.some((pattern) => pattern.test(text))).map(
    (genre) => genre.id
  );
}

export function genreLabel(id) {
  return GENRES.find((genre) => genre.id === id)?.label || id;
}
