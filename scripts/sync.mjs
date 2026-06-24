#!/usr/bin/env node
/**
 * Google スプレッドシートから講演データを取得し、
 * HP公開可（「可」）の講演のみ JSON に書き出す。
 */

import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GENRES, assignGenres } from "./genres.mjs";
import { ACTIVITY_TYPES, normalizeActivityType } from "./activity-types.mjs";

const SHEET_ID = "1O121_9rzHGKGg9a_zuvp4Vuv6IcilQlk6yyx3_UP_VI";
const GID = "622302178";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

const COLUMNS = {
  timestamp: "タイムスタンプ",
  name: "名前",
  category: "区分",
  title: "タイトル",
  eventName: "会の名称",
  date: "講演日",
  location: "開催場所",
  notes: "備考",
  publishable: "かたろう会HPでの公開の可否",
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "docs", "data", "lectures.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return rows;
}

function normalizeDate(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return { raw: "", iso: "" };

  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const [y, m, d] = parts.map((p) => Number(p));
    if (y && m && d) {
      const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { raw: trimmed, iso };
    }
  }

  return { raw: trimmed, iso: "" };
}

/** 氏名比較用キー（空白・全角スペースを除去） */
function nameKey(name) {
  return (name || "").replace(/[\s\u3000]+/g, "");
}

/** 全角スペースを半角に統一 */
function normalizeSpaces(name) {
  return (name || "").replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * 同一人物とみなせる表記ゆれから代表表記を選ぶ。
 * 出現回数が多いものを優先し、同数なら半角スペース入りを優先。
 */
function chooseCanonicalName(variants) {
  return normalizeSpaces(
    [...variants]
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        const aHasHalfSpace = /[^\s\u3000]\s[^\s\u3000]/.test(a.name);
        const bHasHalfSpace = /[^\s\u3000]\s[^\s\u3000]/.test(b.name);
        if (aHasHalfSpace && !bHasHalfSpace) return -1;
        if (!aHasHalfSpace && bHasHalfSpace) return 1;
        return a.name.localeCompare(b.name, "ja");
      })[0].name
  );
}

function buildCanonicalNameMap(rows) {
  const groups = new Map();

  for (const row of rows) {
    const raw = (row[COLUMNS.name] || "").trim();
    if (!raw) continue;

    const key = nameKey(raw);
    if (!groups.has(key)) groups.set(key, new Map());
    const variants = groups.get(key);
    variants.set(raw, (variants.get(raw) || 0) + 1);
  }

  const canonical = new Map();
  for (const [key, variants] of groups) {
    const list = [...variants.entries()].map(([name, count]) => ({ name, count }));
    canonical.set(key, chooseCanonicalName(list));
  }

  return canonical;
}

function normalizeSpeakerName(rawName, canonicalMap) {
  const trimmed = (rawName || "").trim();
  if (!trimmed) return "";
  return canonicalMap.get(nameKey(trimmed)) || normalizeSpaces(trimmed);
}

/** 表記ゆれグループ数を集計（同一キーに複数の raw 表記がある場合） */
function countNameMergeGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    const raw = (row[COLUMNS.name] || "").trim();
    if (!raw) continue;
    const key = nameKey(raw);
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(raw);
  }
  return [...groups.values()].filter((variants) => variants.size > 1).length;
}

function makeId(record) {
  const key = [record.timestamp, record.name, record.title, record.eventName].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

function isPublishable(value) {
  return (value || "").trim() === "可";
}

async function fetchCsv() {
  const response = await fetch(CSV_URL, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`スプレッドシートの取得に失敗しました: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function rowsToRecords(matrix) {
  if (matrix.length < 2) return [];

  const headers = matrix[0];
  const records = [];

  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i];
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = (cells[idx] || "").trim();
    });
    records.push(obj);
  }

  return records;
}

function toLecture(row, canonicalMap) {
  const date = normalizeDate(row[COLUMNS.date]);
  const categoryRaw = row[COLUMNS.category] || "";
  const eventName = row[COLUMNS.eventName] || "";
  return {
    id: "",
    timestamp: row[COLUMNS.timestamp] || "",
    name: normalizeSpeakerName(row[COLUMNS.name], canonicalMap),
    category: categoryRaw,
    activityType: normalizeActivityType(categoryRaw, eventName),
    title: row[COLUMNS.title] || "",
    eventName,
    date: date.raw,
    dateIso: date.iso,
    location: row[COLUMNS.location] || "",
    notes: row[COLUMNS.notes] || "",
  };
}

async function main() {
  console.log("スプレッドシートを取得中...");
  const csv = await fetchCsv();
  const matrix = parseCsv(csv);
  const allRows = rowsToRecords(matrix);
  const canonicalMap = buildCanonicalNameMap(allRows);
  const mergedCount = countNameMergeGroups(allRows);

  const lectures = allRows
    .filter((row) => isPublishable(row[COLUMNS.publishable]))
    .map((row) => {
      const lecture = toLecture(row, canonicalMap);
      lecture.id = makeId(lecture);
      lecture.genres = assignGenres(lecture);
      return lecture;
    })
    .sort((a, b) => {
      if (a.dateIso && b.dateIso) return b.dateIso.localeCompare(a.dateIso);
      if (a.dateIso) return -1;
      if (b.dateIso) return 1;
      return b.timestamp.localeCompare(a.timestamp);
    });

  const genreCounts = Object.fromEntries(
    GENRES.map((genre) => [
      genre.id,
      lectures.filter((lecture) => lecture.genres.includes(genre.id)).length,
    ])
  );

  const payload = {
    updatedAt: new Date().toISOString(),
    source: {
      spreadsheetId: SHEET_ID,
      gid: GID,
      url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${GID}`,
    },
    totalInSheet: allRows.length,
    publishedCount: lectures.length,
    speakerCount: new Set(lectures.map((l) => l.name)).size,
    nameMergeGroups: mergedCount,
    genres: GENRES.map((genre) => ({ id: genre.id, label: genre.label })),
    genreCounts,
    activityTypes: ACTIVITY_TYPES.map((type) => ({ id: type.id, label: type.label })),
    lectures,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`完了: 全${allRows.length}件中、HP公開可 ${lectures.length}件を書き出しました`);
  console.log(`講演者: ${payload.speakerCount}名（表記ゆれ統合: ${mergedCount}グループ）`);
  console.log(`出力先: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
