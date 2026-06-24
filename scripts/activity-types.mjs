/**
 * 活動種別（区分）の正規化
 *
 * スプレッドシートの「区分」は入力ゆれがあるため、
 * 会の名称なども参照して検索しやすい活動種別に統一する。
 */

export const ACTIVITY_TYPES = [
  { id: "lecture", label: "講演" },
  { id: "society", label: "学会発表" },
  { id: "kataroukai", label: "かたろう会関連事業" },
  { id: "study-group", label: "研究会" },
  { id: "paper", label: "論文" },
  { id: "textbook", label: "教科書" },
  { id: "other", label: "その他" },
];

/**
 * @param {string} category スプレッドシートの区分（生データ）
 * @param {string} eventName 会の名称
 * @returns {string} 正規化後の活動種別ラベル
 */
export function normalizeActivityType(category, eventName) {
  const cat = (category || "").trim();
  const event = (eventName || "").trim();

  if (cat === "論文") return "論文";
  if (cat === "教科書") return "教科書";
  if (cat === "学会発表") return "学会発表";
  if (cat === "かたろう会関連事業") return "かたろう会関連事業";

  // 区分欄に研究会名が入っているケース（例: 第73回千葉県放射線治療研究会）
  if (cat === "研究会" || cat.includes("研究会")) return "研究会";

  // 講演だが会の名称が研究会のケース
  if (cat === "講演" && event.includes("研究会")) return "研究会";

  if (cat === "講演") return "講演";

  return cat || "その他";
}

export function activityTypeId(label) {
  return ACTIVITY_TYPES.find((type) => type.label === label)?.id || "other";
}
