import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import moment from "moment-timezone";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Searchbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS } from "../../constants/theme";
import { Badge } from "react-native-paper";
import { sqlApi } from "../../utils/axiosInstance";
import { api } from "../../utils/axiosInstance";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generatePDFHTML as htmlA3Flex } from "./DetailLaporanA3Flex";
import { generatePDFHTML as htmlA3StartFinish } from "./DetailLaporanA3StartFinish";
import { generatePDFHTML as htmlCombiXG } from "./DetailLaporanCombiXG";
import { generatePDFHTML as htmlArtemaCardboard } from "./DetailLaporanArtemaCardboard";
import { generatePDFHTML as htmlFransCasePacker } from "./DetailLaporanFransCasePacker";
import { generatePDFHTML as htmlRobotPalletizer } from "./DetailLaporanRobotPalletizerFiller";
import { generatePDFHTML as htmlH2O2Imported } from "./DetailLaporanH2O2Check";
import { generatePDFHTML as htmlScrewCapImported } from "./DetailLaporanScrewCap";
import { generatePDFHTML as htmlPaperUsageImported } from "./DetailLaporanPaperUsage";

/* =========================================
 * ========== PDF HELPERS & TEMPLATES ======
 * ========================================= */

const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Color palette
const COLOR_G = "#CFF5D0";
const COLOR_N = "#FFE9B0";
const COLOR_R = "#F8C9CC";
const COLOR_EMPTY = "#F4F6F8";

function classifyResult(value, goodRef, rejectRef) {
  if (value === null || value === undefined) return "default";
  const raw = String(value).trim();
  if (raw === "" || raw === "-") return "default";

  const v = raw.toUpperCase();

  // Literal huruf
  if (v === "G") return "good";
  if (v === "N") return "need";
  if (v === "R") return "reject";

  // Literal teks
  if (["OK", "GOOD", "PASS"].includes(v)) return "good";
  if (["BAD", "FAIL", "NOT OK", "NG"].includes(v)) return "reject";

  // Angka → pakai evaluator range
  const st = evaluateValue(raw, goodRef, rejectRef);
  return st;
}

function getResultColor(value, goodRef, rejectRef) {
  const st = classifyResult(value, goodRef, rejectRef);
  if (st === "good") return COLOR_G;
  if (st === "reject") return COLOR_R;
  if (st === "need") return COLOR_N;
  return COLOR_EMPTY;
}

// Tentukan warna teks agar tetap terbaca di atas BG
function getTextColor(bg) {
  // hitung luminance sederhana untuk kontras
  const hex = bg.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // formula luminance approx
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  // threshold ~ 150 → teks hitam; selain itu teks gelap
  return lum > 150 ? "#1F2937" : "#111827";
}

const _stripTZ = (s) => String(s ?? "").replace(/([Zz]|[+-]\d{2}:?\d{2})$/, "");
const parseWIBNaive = (ts) => {
  if (ts == null) return moment.invalid();
  if (typeof ts === "number") return moment(ts).tz("Asia/Jakarta");
  const raw = String(ts);
  const m = raw.match(/(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, d, HH, MM, SS = "00"] = m;
    return moment.tz(`${d} ${HH}:${MM}:${SS}`, "YYYY-MM-DD HH:mm:ss", "Asia/Jakarta");
  }
  return moment.tz(raw, "Asia/Jakarta");
};

const fmtDT = (d) => parseWIBNaive(d).format("DD/MM/YY HH:mm:ss");
const formatDDMonYY = (dateLike) => {
  const monthsShort = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(d.getDate())}-${monthsShort[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

/* FRM/Rev mapping per package */
const FRM_REV_MAP = {
  SEGREGASI: { frm: "FIL - 010 - 02", rev: "-", berlaku: "11-Jun-25", hal: "1 dari 3" },
  "PEMAKAIAN SCREW CAP": { frm: "FIL - 010 - 02", rev: "-", berlaku: "11-Jun-25", hal: "1 dari 3" },
  "PEMAKAIAN PAPER": { frm: "FIL - 010 - 02", rev: "-", berlaku: "11-Jun-25", hal: "1 dari 3" },
  "PENGECEKAN H2O2 ( SPRAY )": { frm: "FIL - 010 - 02", rev: "-", berlaku: "11-Jun-25", hal: "1 dari 3" },
  "PERFORMA RED AND GREEN": { frm: "FIL - 010", rev: "02", berlaku: "11-Jun-25", hal: "2 dari 3" },
  // Checklist – khusus per LINE sesuai instruksi
  "CHECKLIST CILT|LINE A": { frm: "FIL - 014", rev: "00", berlaku: "01-April-2025", hal: "1 dari 5" },
  "CHECKLIST CILT|LINE B": { frm: "FIL - 015", rev: "00", berlaku: "01-April-2025", hal: "1 dari 5" },
  "CHECKLIST CILT|LINE C": { frm: "FIL - 016", rev: "00", berlaku: "01-April-2025", hal: "1 dari 5" },
  "CHECKLIST CILT|LINE D": { frm: "FIL - 017", rev: "00", berlaku: "01-April-2025", hal: "1 dari 5" },
  // CIP — per LINE sesuai permintaan
  "CIP|LINE A": { frm: "FIL - 009", rev: "00", berlaku: "21-Juli-2023", hal: "1 dari 3" },
  "CIP|LINE B": { frm: "FIL - 075", rev: "05", berlaku: "10-Februari-2025", hal: "1 dari 3" },
  "CIP|LINE C": { frm: "FIL - 075", rev: "05", berlaku: "10-Februari-2025", hal: "1 dari 3" },
  "CIP|LINE D": { frm: "FIL - 075", rev: "05", berlaku: "10-Februari-2025", hal: "1 dari 3" },
  // fallback jika LINE tidak cocok/ kosong
  "CHECKLIST CILT": { frm: "FIL - 014", rev: "00", berlaku: "01-April-2025", hal: "1 dari 5" },
  CILTGIGR: { frm: "FIL - 015 - 01", rev: "-", berlaku: "11-Jun-25", hal: "1 dari 3" },
  CIP: { frm: "FIL - 009", rev: "00", berlaku: "21-Juli-2023", hal: "1 dari 3" },
};

const PACKAGE_CONFIG = {
  // PACKAGES (dengan imported generator)
  "PEMAKAIAN SCREW CAP": {
    screen: "DetailLaporanScrewCap",
    htmlGenerator: htmlScrewCapImported,
  },
  "PENGECEKAN H2O2 ( SPRAY )": {
    screen: "DetailLaporanH2O2Check",
    htmlGenerator: htmlH2O2Imported,
  },
  "PEMAKAIAN PAPER": {
    screen: "DetailLaporanPaperUsage",
    htmlGenerator: htmlPaperUsageImported,
  },

  // PACKAGES YANG TETAP PAKAI INLINE FUNCTION
  // (karena logic kompleks dan terintegrasi dengan helper di ListCILT)
  "PERFORMA RED AND GREEN": {
    screen: "DetailLaporanShiftlyCILT",
    htmlGenerator: null, // tetap pakai htmlShiftly inline
  },
  "CHECKLIST CILT": {
    screen: "DetailLaporanChecklistCILT",
    htmlGenerator: null, // tetap pakai htmlChecklist inline
  },
  "SEGREGASI": {
    screen: "DetailLaporanSegregasi",
    htmlGenerator: null, // tetap pakai htmlSegregasi inline
  },
  "CILTGIGR": {
    screen: "DetailLaporanCILTGIGR",
    htmlGenerator: null, // tetap pakai htmlCILTGIGR inline
  },
  "REPORT CIP": {
    screen: "DetailReportCIP",
    htmlGenerator: null, // tetap pakai htmlCIP inline (async)
    useIdParam: true,
  },

  // PACKAGES (dengan imported generator)
  // A3 Flex
  "PENGECEKAN PRESSURE": {
    screen: "DetailLaporanA3Flex",
    htmlGenerator: htmlA3Flex,
  },
  "A3 FLEX PAGE 1": {
    screen: "DetailLaporanA3Flex",
    htmlGenerator: htmlA3Flex,
  },
  "A3 FLEX": {
    screen: "DetailLaporanA3Flex",
    htmlGenerator: htmlA3Flex,
  },

  // A3 Start/Finish
  "START FINISH PRODUKSI": {
    screen: "DetailLaporanA3StartFinish",
    htmlGenerator: htmlA3StartFinish,
  },
  "START & FINISH PRODUKSI": {
    screen: "DetailLaporanA3StartFinish",
    htmlGenerator: htmlA3StartFinish,
  },

  // Combi XG Slim 24
  "COMBI XG SLIM 24": {
    screen: "DetailLaporanCombiXG",
    htmlGenerator: htmlCombiXG,
  },
  "COMBI XG CHECK": {
    screen: "DetailLaporanCombiXG",
    htmlGenerator: htmlCombiXG,
  },
  "COMBI XG PRODUCT": {
    screen: "DetailLaporanCombiXG",
    htmlGenerator: htmlCombiXG,
  },

  // Artema Cardboard
  "LAPORAN ARTEMA & SMS CARDBOARD": {
    screen: "DetailLaporanArtemaCardboard",
    htmlGenerator: htmlArtemaCardboard,
  },

  // Frans Case Packer
  "LAPORAN FRANS WP 25 CASE": {
    screen: "DetailLaporanFransCasePacker",
    htmlGenerator: htmlFransCasePacker,
  },

  // Robot Palletizer
  "ROBOT PALLETIZER FILLER": {
    screen: "DetailLaporanRobotPalletizerFiller",
    htmlGenerator: htmlRobotPalletizer,
  },
};

const DEFAULT_PACKAGE_CONFIG = {
  screen: "DetailLaporanPaperUsage",
  htmlGenerator: htmlPaperUsageImported,
};

// Helper untuk memilih meta berdasar package + LINE
const getFrmMeta = (pkg, line) => {
  const keyByLine = `${pkg}|${(line || "").toUpperCase()}`;
  return (
    FRM_REV_MAP[keyByLine] || FRM_REV_MAP[pkg] || { frm: "FIL - 010 - 02", rev: "-", berlaku: "11-Jun-25", hal: "1 dari 3" }
  );
};

// Perbarui renderPDFHeader agar terima pkg, line, dan title
const renderPDFHeader = (pkg, line, titleText) => {
  const meta = getFrmMeta(pkg, line);
  const title = esc(titleText || "LAPORAN PRODUKSI MESIN GALDI 280 UCS");
  return `
    <div class="header-container">
      <table class="header-main-table">
        <tr>
          <td class="logo-section">
            <div class="greenfields-logo">
              <span class="logo-green">Greenfields</span>
            </div>
          </td>
          <td class="company-section">
            <div class="company-name">PT. GREENFIELDS INDONESIA</div>
          </td>
          <td class="meta-section">
            <table class="meta-info-table">
              <tr><td class="meta-label">FRM</td><td class="meta-colon">:</td><td class="meta-value">${esc(meta.frm)}</td></tr>
              <tr><td class="meta-label">Rev</td><td class="meta-colon">:</td><td class="meta-value">${esc(meta.rev || "-")}</td></tr>
              <tr><td class="meta-label">Berlaku</td><td class="meta-colon">:</td><td class="meta-value">${esc(meta.berlaku)}</td></tr>
              <tr><td class="meta-label">Hal</td><td class="meta-colon">:</td><td class="meta-value"><span class="page-xofn"></span></td></tr>
            </table>
          </td>
        </tr>
      </table>
      <table class="header-title-table">
        <tr>
          <td class="title-label">JUDUL</td>
          <td class="title-content">${title}</td>
        </tr>
      </table>
    </div>
  `;
};

const commonHeaderTable = () => ``;

const parseInspection = (raw) => {
  try {
    return Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
  } catch {
    return [];
  }
};

/* Helper functions for PERFORMA processing */
const getShiftHours = (shift) => {
  if (shift === "Shift 1") return [6, 7, 8, 9, 10, 11, 12, 13, 14];
  if (shift === "Shift 2") return [14, 15, 16, 17, 18, 19, 20, 21, 22];
  if (shift === "Shift 3") return [22, 23, 0, 1, 2, 3, 4, 5, 6];
  return [];
};

const evaluateValue = (inputValue, goodCriteria, rejectCriteria) => {
  const numValue = parseFloat(inputValue);
  if (isNaN(numValue)) return "default";

  const parseRange = (rangeStr) => {
    if (!rangeStr || rangeStr === "-") return null;
    if (rangeStr.includes(" - ")) {
      const [min, max] = rangeStr.split(" - ").map(parseFloat);
      if (!isNaN(min) && !isNaN(max)) return { type: "range", min, max };
    }
    return null;
  };

  const parseReject = (rejectStr) => {
    if (!rejectStr || rejectStr === "-") return null;
    if (rejectStr.includes(" / ")) {
      const parts = rejectStr.split(" / ");
      return parts
        .map((part) => {
          const trimmed = part.trim();
          if (trimmed.startsWith("<")) return { operator: "<", value: parseFloat(trimmed.slice(1)) };
          if (trimmed.startsWith(">")) return { operator: ">", value: parseFloat(trimmed.slice(1)) };
          if (trimmed.startsWith(">=")) return { operator: ">=", value: parseFloat(trimmed.slice(2)) };
          return null;
        })
        .filter(Boolean);
    }
    return null;
  };

  const goodRange = parseRange(goodCriteria);
  const rejectConditions = parseReject(rejectCriteria);

  if (rejectConditions) {
    for (const cond of rejectConditions) {
      if (cond.operator === "<" && numValue < cond.value) return "reject";
      if (cond.operator === ">" && numValue > cond.value) return "reject";
      if (cond.operator === ">=" && numValue >= cond.value) return "reject";
    }
  }

  if (goodRange) {
    if (numValue >= goodRange.min && numValue <= goodRange.max) return "good";
  }

  return "need";
};

const _parseHourLoose = (s) => {
  const m = String(s ?? "").match(/\b(\d{1,2})(?::\d{2})?\b/);
  if (!m) return undefined;
  const h = Number(m[1]);
  return Number.isFinite(h) ? h : undefined;
};
const selectedHourFromInspection = (ins) => {
  const candidates = [ins?.hourSlot, ins?.hour_slot, ins?.timeSlot, ins?.time_slot, ins?.hour, ins?.selectedHour, ins?.hourSelected];
  for (const c of candidates) {
    const h = _parseHourLoose(c);
    if (h !== undefined) return h;
  }
  return undefined;
};

const selectedHourFromRecord = (rec) => {
  const g = rec?.HourGroup ?? rec?.hourGroup ?? rec?.hour_slot ?? rec?.hourSlot ?? rec?.timeSlot ?? rec?.selectedHour ?? rec?.hour;
  const rg = String(g ?? "");
  const mRange = rg.match(/(\d{1,2})(?::\d{2})?\s*[-–]\s*(\d{1,2})/);
  if (mRange) return Number(mRange[1]);
  return _parseHourLoose(rg);
};

// Function to get latest PERFORMA data for a specific item
const parseCombinedInspections = (rec) => {
  const chunks = String(rec?.CombinedInspectionData || "").match(/\[[\s\S]*?\]/g) || [];
  const out = [];
  for (const txt of chunks) {
    try {
      const arr = JSON.parse(txt);
      if (Array.isArray(arr)) out.push(...arr);
    } catch { }
  }
  return out;
};

const intendedHourForRecord = (rec) => {
  const inspections = parseCombinedInspections(rec);
  for (let i = inspections.length - 1; i >= 0; i--) {
    const h = selectedHourFromInspection(inspections[i]);
    if (h !== undefined) return h;
  }
  const h2 = selectedHourFromRecord(rec);
  if (h2 !== undefined) return h2;
  return undefined;
};

// fungsi jam dari submitTime utk guard saat inisialisasi ===
const hourFromSubmitTime = (rec, shiftHours) => {
  const m = parseWIBNaive(rec?.submitTime || rec?.submit_time || rec?.createdAt || rec?.created_at);
  if (!m || !m.isValid?.()) return undefined;
  const H = m.hour();
  return Array.isArray(shiftHours) && shiftHours.includes(H) ? H : undefined;
};

// fungsi normalisasi jam agar selalu masuk range shift ===
const nearestHourInShift = (H, hours) => {
  if (hours.includes(H)) return H;
  let best = hours[0],
    bestD = 24;
  for (const hh of hours) {
    const d = Math.min((H - hh + 24) % 24, (hh - H + 24) % 24);
    if (d < bestD) {
      bestD = d;
      best = hh;
    }
  }
  return best;
};

// key scope dan key record (sama dengan DetailLaporanShiftly) ===
const scopeKeyForItem = (item) => {
  const d = (item?.date || "").split("T")[0];
  return `cilt_actual_locks:${item?.processOrder}|${d}|${item?.shift}|${item?.line}|${item?.machine}`;
};

const recordKey = (rec) =>
  String(
    rec?.id ??
    rec?.ID ??
    rec?.recordId ??
    rec?.RecordID ??
    rec?.InputID ??
    rec?.input_id ??
    rec?.cilt_id ??
    `${rec?.submitBy || rec?.createdBy || rec?.user || "unknown"}|${rec?.submitTime || rec?.createdAt || "ts"}`
  );

// baca & pastikan kunci (jika belum ada, tetapkan sekali) ===
const loadAndEnsureLocks = async (scopeKey, records, shiftHours) => {
  let locks = {};
  try {
    const raw = await AsyncStorage.getItem(scopeKey);
    locks = raw ? JSON.parse(raw) : {};
  } catch {
    locks = {};
  }

  let changed = false;
  const next = { ...locks };
  for (const rec of records || []) {
    const k = recordKey(rec);
    if (next[k] == null) {
      // tetapkan awal
      let h = intendedHourForRecord(rec);
      if (h == null) h = hourFromSubmitTime(rec, shiftHours);
      if (h != null && Array.isArray(shiftHours) && shiftHours.length) {
        h = nearestHourInShift(Number(h), shiftHours);
        next[k] = Number(h);
        changed = true;
      }
    }
  }

  if (changed) {
    try {
      await AsyncStorage.setItem(scopeKey, JSON.stringify(next));
    } catch { }
  }
  return next;
};

// (Masih boleh dipakai utk fallback lain)
const collectActualTimes = (records, shiftHours) => {
  const map = {};
  shiftHours.forEach((h) => {
    map[h] = [];
  });
  for (const rec of records || []) {
    const tsWIB = parseWIBNaive(rec?.submitTime || rec?.submit_time || rec?.createdAt || rec?.created_at || new Date());
    const label = tsWIB.format("HH:mm");
    const targetHour = intendedHourForRecord(rec);
    if (targetHour !== undefined && shiftHours.includes(targetHour)) {
      map[targetHour].push({ ts: tsWIB, label });
    }
  }

  shiftHours.forEach((h) => map[h].sort((a, b) => a.ts.diff(b.ts)));
  return map;
};

const normSlot = (s) => {
  const m = String(s ?? "").match(/(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/);
  if (!m) return undefined;
  const h1 = String(parseInt(m[1], 10)).padStart(2, "0");
  const m1 = m[2];
  const h2 = String(parseInt(m[3], 10)).padStart(2, "0");
  const m2 = m[4];
  return `${h1}:${m1} - ${h2}:${m2}`;
};
const getLatestPerformaData = async (item) => {
  try {
    const formattedDate = item.date.split("T")[0];
    const response = await api.get(
      `/cilt/reportCILTAll/PERFORMA RED AND GREEN/${encodeURIComponent(item.plant)}/${encodeURIComponent(
        item.line
      )}/${encodeURIComponent(item.shift)}/${encodeURIComponent(item.machine)}/${formattedDate}`
    );

    if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching latest PERFORMA data:", error);
    return [];
  }
};

const extractUniqueInspectionData = (records) => {
  const uniqueActivities = {};
  // Kumpulkan semua actual times per jam
  const allActualTimes = {};

  const safe = Array.isArray(records) ? [...records] : [];

  // Urutkan berdasarkan submitTime supaya yang terbaru dieksekusi terakhir
  safe.sort((a, b) => parseWIBNaive(a?.submitTime).diff(parseWIBNaive(b?.submitTime)));

  const isNonEmpty = (v) => v !== undefined && v !== null && String(v).trim() !== "" && v !== "-";

  for (const record of safe) {
    try {
      // Ambil SEMUA snapshot array di CombinedInspectionData
      const chunks = String(record?.CombinedInspectionData || "").match(/\[[\s\S]*?\]/g);
      if (!chunks || chunks.length === 0) continue;

      for (const txt of chunks) {
        let arr = [];
        try {
          arr = JSON.parse(txt);
        } catch {
          arr = [];
        }

        for (const inspection of arr) {
          const key = `${inspection.id}|${inspection.activity}`;
          if (!uniqueActivities[key]) {
            uniqueActivities[key] = {
              activity: inspection.activity,
              standard: inspection.standard,
              good: inspection.good ?? "-",
              need: inspection.need ?? "-",
              reject: inspection.reject ?? "-",
              results: {},
              results30: {},
              picture: {},
            };
          }

          // Ambil jam dari hourSlot atau timeSlot
          const hKey = selectedHourFromInspection(inspection) ?? selectedHourFromRecord(record);

          // Tabel per JAM
          if (hKey !== undefined && isNonEmpty(inspection.results)) {
            uniqueActivities[key].results[hKey] = inspection.results;
            if (inspection.picture) uniqueActivities[key].picture[hKey] = inspection.picture;

            // Kumpulkan actual time dari inspection.time
            if (inspection.time) {
              if (!allActualTimes[hKey]) {
                allActualTimes[hKey] = new Set();
              }
              // Ambil hanya HH:mm dari time string
              const timeStr = String(inspection.time);
              const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
              if (timeMatch) {
                const formattedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
                allActualTimes[hKey].add(formattedTime);
              }
            }
          }

          // Tabel per 30 MENIT
          if (inspection.periode && String(inspection.periode).toLowerCase().includes("30")) {
            const sKey = normSlot(inspection.timeSlot);
            if (sKey && isNonEmpty(inspection.results)) {
              uniqueActivities[key].results30[sKey] = inspection.results;
            }

            // Juga kumpulkan actual time untuk 30 menit
            if (hKey !== undefined && inspection.time) {
              if (!allActualTimes[hKey]) {
                allActualTimes[hKey] = new Set();
              }
              const timeStr = String(inspection.time);
              const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
              if (timeMatch) {
                const formattedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
                allActualTimes[hKey].add(formattedTime);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  }

  // Convert Set to sorted Array
  const actualTimesPerHour = {};
  Object.keys(allActualTimes).forEach(h => {
    actualTimesPerHour[h] = Array.from(allActualTimes[h]).sort();
  });

  return {
    activities: Object.values(uniqueActivities),
    actualTimesPerHour: actualTimesPerHour
  };
};

/* =======================
 * ==== CIP HELPER FUNCTIONS ===
 * ======================= */

// Helper function to generate flow rate rows based on line type
const generateFlowRateRows = (cip) => {
  let flowRateRows = "";

  // LINE A
  if (cip.line === "LINE A" && cip.flowRate) {
    flowRateRows += `
      <tr>
        <td class="cip-info-label">Flow Rate:</td>
        <td class="cip-info-value">${cip.flowRate} L/hr</td>
      </tr>
    `;
  }

  // LINE B/C
  if ((cip.line === "LINE B" || cip.line === "LINE C") && cip.flowRateBC) {
    flowRateRows += `
      <tr>
        <td class="cip-info-label">Flow B,C:</td>
        <td class="cip-info-value">${cip.flowRateBC} L/H</td>
      </tr>
    `;
  }

  // LINE D
  if (cip.line === "LINE D" && cip.flowRateD) {
    flowRateRows += `
      <tr>
        <td class="cip-info-label">Flow D:</td>
        <td class="cip-info-value">${cip.flowRateD} L/H</td>
      </tr>
    `;
  }

  return flowRateRows;
};

// Helper function to generate valve positions rows for LINE B/C/D
const generateValvePositionsRows = (cip) => {
  if (["LINE B", "LINE C", "LINE D"].includes(cip.line) && cip.valvePositions) {
    return `
      <tr>
        <td class="cip-info-label">Valve Positions:</td>
        <td class="cip-info-value cip-valve-positions">
          A: ${cip.valvePositions.A ? "Open" : "Close"} | 
          B: ${cip.valvePositions.B ? "Open" : "Close"} | 
          C: ${cip.valvePositions.C ? "Open" : "Close"}
        </td>
      </tr>
    `;
  }
  return "";
};

// Helper function to generate kode operator & teknisi rows
const generateKodeRows = (cip) => {
  let kodeRows = "";

  if (cip.kodeOperator || cip.kodeTeknisi) {
    if (cip.kodeOperator) {
      kodeRows += `
        <tr>
          <td class="cip-info-label">Kode Operator:</td>
          <td class="cip-info-value">${esc(cip.kodeOperator)}</td>
        </tr>
      `;
    }
    if (cip.kodeTeknisi) {
      kodeRows += `
        <tr>
          <td class="cip-info-label">Kode Teknisi:</td>
          <td class="cip-info-value">${esc(cip.kodeTeknisi)}</td>
        </tr>
      `;
    }
  }

  return kodeRows;
};

// Helper function to generate special record details based on step type
const generateSpecialRecordDetails = (record, line) => {
  let details = "";

  // DRYING
  if (record.stepType === "DRYING") {
    details = `
      <div class="cip-special-detail-group">
        <span class="cip-special-label">Temp:</span>
        <span class="cip-special-value">${record.tempActual || "-"}°C (${record.tempMin || "-"}-${record.tempMax || "-"}°C)</span>
      </div>
      <div class="cip-special-detail-group">
        <span class="cip-special-label">Time:</span>
        <span class="cip-special-value">${record.time || "-"} min</span>
      </div>
    `;
  }

  // FOAMING
  else if (record.stepType === "FOAMING") {
    details = `
      <div class="cip-special-detail-group">
        <span class="cip-special-label">Time:</span>
        <span class="cip-special-value">${record.time || "-"} min</span>
      </div>
      <div class="cip-special-detail-group">
        <span class="cip-special-note">(No Temperature)</span>
      </div>
    `;
  }

  // DISINFECT/SANITASI
  else if (record.stepType === "DISINFECT/SANITASI") {
    const tempDisplay =
      line === "LINE D"
        ? `${record.tempActual || "-"}°C (${record.tempDMin || "-"}-${record.tempDMax || "-"}°C)`
        : `${record.tempActual || "-"}°C (${record.tempBC || "-"}°C)`;

    details = `
      <div class="cip-special-detail-group">
        <span class="cip-special-label">Conc:</span>
        <span class="cip-special-value">${record.concActual || "-"}% (${record.concMin || "-"}-${record.concMax || "-"}%)</span>
      </div>
      <div class="cip-special-detail-group">
        <span class="cip-special-label">Time:</span>
        <span class="cip-special-value">${record.time || "-"} min</span>
      </div>
      <div class="cip-special-detail-group">
        <span class="cip-special-label">Temp:</span>
        <span class="cip-special-value">${tempDisplay}</span>
      </div>
    `;
  }

  return details;
};

/* =======================
 * ==== TEMPLATES ========
 * ======================= */

const isSegregasiRowFilled = (r) => {
  if (!r) return false;
  // Row dianggap filled jika memiliki minimal type/prodType/equipment status atau description data
  return (
    String(r.type || "").trim() !== "" ||
    String(r.prodType || "").trim() !== "" ||
    r.magazine === true || r.wastafel === true || r.palletPm === true || r.conveyor === true ||
    String(r.flavour || "").trim() !== "" ||
    String(r.kodeProd || "").trim() !== "" ||
    String(r.kodeExp || "").trim() !== "" ||
    String(r.startTime || "").trim() !== "" ||
    String(r.stopTime || "").trim() !== ""
  );
};

/** ============
 * 1) SEGREGASI 
 * =============
 */
const htmlSegregasi = (item) => {
  const inspectionData = parseInspection(item.inspectionData);

  // Filter hanya row yang memiliki data bermakna
  const filledData = inspectionData.filter(isSegregasiRowFilled);

  // Generate combined section HTML - Description + Segregasi dalam satu entry
  // karena pada SegregasiInspectionTable, data description dan segregasi ada dalam satu entry
  const combinedSection = filledData.length > 0
    ? filledData.map((entry, idx) => `
        <div class="seg-column">
          <div class="seg-column-header">Entry ${idx + 1}</div>
          
          ${entry.lastModifiedBy ? `
            <div class="audit-trail">
              <div>User: ${esc(entry.lastModifiedBy)}</div>
              <div>Time: ${esc(entry.lastModifiedTime)}</div>
            </div>
          ` : ''}

          <!-- Segregasi Info -->
          <table class="seg-detail-table">
            <tr>
              <td class="seg-label">Type</td>
              <td class="seg-value">${esc(entry.type || entry.job_type || "-")}</td>
            </tr>
            <tr>
              <td class="seg-label">Prod Type</td>
              <td class="seg-value">${esc(entry.prodType || "-")}</td>
            </tr>
            <tr>
              <td class="seg-label">TO</td>
              <td class="seg-value ${entry.type !== "Change Variant" ? "seg-value-disabled" : ""}">${entry.type === "Change Variant" ? esc(entry.to || "-") : "—"}</td>
            </tr>
          </table>

          <!-- Description Info -->
          <table class="desc-detail-table" style="margin-top: 10px;">
            <tr>
              <td class="desc-label">Flavour</td>
              <td class="desc-value">${esc(entry.flavour || "-")}</td>
            </tr>
            <tr>
              <td class="desc-label">Kode Prod.</td>
              <td class="desc-value">${esc(entry.kodeProd || "-")}</td>
            </tr>
            <tr>
              <td class="desc-label">Kode Exp</td>
              <td class="desc-value">${esc(entry.kodeExp || "-")}</td>
            </tr>
            <tr>
              <td class="desc-label">Start</td>
              <td class="desc-value">${esc(entry.startTime || "-")}</td>
            </tr>
            <tr>
              <td class="desc-label">Stop</td>
              <td class="desc-value">${esc(entry.stopTime || "-")}</td>
            </tr>
            <tr>
              <td class="desc-label">Outfeed</td>
              <td class="desc-value">${esc(entry.counterOutfeed || "-")}</td>
            </tr>
            <tr>
              <td class="desc-label">Total Outfeed</td>
              <td class="desc-value">${esc(entry.totalOutfeed || "-")}</td>
            </tr>
            <tr>
              <td class="desc-label">Waste</td>
              <td class="desc-value">${esc(entry.waste || "-")}</td>
            </tr>
            <tr>
              <td class="desc-label">Start Hours</td>
              <td class="desc-value">${esc(entry.startNum || "-")}</td>
            </tr>
            <tr>
              <td class="desc-label">Stop Hours</td>
              <td class="desc-value">${esc(entry.stopNum || "-")}</td>
            </tr>
          </table>

          <!-- Equipment Status -->
          <div class="equipment-status">
            <div class="equipment-title">Equipment Status</div>
            <table class="equipment-table">
              <tr>
                <td class="eq-label">Magazine</td>
                <td class="eq-checkbox">${entry.magazine ? "✓" : ""}</td>
              </tr>
              <tr>
                <td class="eq-label">Wastafel</td>
                <td class="eq-checkbox">${entry.wastafel ? "✓" : ""}</td>
              </tr>
              <tr>
                <td class="eq-label">Pallet PM</td>
                <td class="eq-checkbox">${entry.palletPm ? "✓" : ""}</td>
              </tr>
              <tr>
                <td class="eq-label">Conveyor</td>
                <td class="eq-checkbox">${entry.conveyor ? "✓" : ""}</td>
              </tr>
            </table>
          </div>

          ${entry.user && entry.time ? `
            <div class="audit-trail" style="margin-top: 8px;">
              <div>User: ${esc(entry.user)}</div>
              <div>Time: ${esc(entry.time)}</div>
            </div>
          ` : ''}
        </div>
      `).join("")
    : '<div class="no-description-data">No data entered</div>';

  return `
    <section class="report-section segregasi-section">
      <div class="report-date">${formatDDMonYY(item.date)}</div>
      ${renderPDFHeader("SEGREGASI", item.line, "SEGREGASI & DESCRIPTION")}
      <h2 style="font-weight: bold; text-align: center; font-size: 18px; margin: 8px 0;">SEGREGASI & DESCRIPTION</h2>
      
      <!-- COMBINED DATA SECTION (Description + Segregasi digabung dalam satu entry) -->
      <div class="segregasi-container">
        <div class="seg-header-bar">
          <div class="seg-header-cell seg-header-narrow">Type</div>
          <div class="seg-header-cell">Prod Type</div>
          <div class="seg-header-cell">TO</div>
          <div class="seg-header-cell seg-header-wide">Equipment Status & Detail</div>
        </div>
        <div class="seg-grid">
          ${combinedSection}
        </div>
      </div>
    </section>
  `;
};

/** =======================
 * 2) PERFORMA RED & GREEN 
 * ========================
 */
const htmlShiftly = async (item) => {
  const latestData = await getLatestPerformaData(item);
  // extractUniqueInspectionData sekarang return object
  const { activities: uniqueData, actualTimesPerHour } = extractUniqueInspectionData(latestData);
  const shiftHours = getShiftHours(item.shift);

  const performaHeader = renderPDFHeader("PERFORMA RED AND GREEN", item.line, "PERFORMA RED AND GREEN");

  // Item information section 
  const itemInfo = `
    <div class="report-info">
      <p><strong>Process Order:</strong> ${esc(item.processOrder)}</p>
      <table class="general-info-table">
        <tr>
          <td><strong>Date:</strong> ${moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}</td>
          <td><strong>Product:</strong> ${esc(item.product)}</td>
        </tr>
        <tr>
          <td><strong>Plant:</strong> ${esc(item.plant)}</td>
          <td><strong>Line:</strong> ${esc(item.line)}</td>
        </tr>
        <tr>
          <td><strong>Machine:</strong> ${esc(item.machine)}</td>
          <td><strong>Shift:</strong> ${esc(item.shift)}</td>
        </tr>
        <tr>
          <td><strong>Package:</strong> ${esc(item.packageType)}</td>
          <td><strong>Group:</strong> </td>
        </tr>
      </table>
    </div>
  `;

  // Actual Time Row menggunakan actualTimesPerHour dari inspection.time
  const actualTimeRow = `
    <tr>
      <td colspan="5" style="font-weight: bold; text-align: center; background-color: #f8f9fa;">Actual Time</td>
      ${shiftHours
      .map((hour) => {
        const times = actualTimesPerHour[hour] || [];
        if (times.length === 0) {
          return `<td style="text-align:center; background:#f8f9fa; padding:4px;">-</td>`;
        }
        const chips = times
          .map((timeStr) => {
            // Parse jam dari timeStr (format HH:mm)
            const [hh] = timeStr.split(":");
            const timeHour = parseInt(hh, 10);
            // Terlambat jika jam berbeda >= 1 dari slot
            const isLate = Math.abs(timeHour - Number(hour)) >= 1;
            const bg = isLate ? "#ffebee" : "#e8f5e9";
            const fg = isLate ? "#d32f2f" : "#2e7d32";
            return `<div style="background:${bg};color:${fg};font-weight:bold;padding:2px 4px;margin:2px;border-radius:3px;display:inline-block;">${timeStr}</div>`;
          })
          .join("");
        return `<td style="text-align:center; background:#f8f9fa; padding:2px; vertical-align:top;">${chips}</td>`;
      })
      .join("")}
    </tr>
  `;

  // Data rows
  const inspectionRows = uniqueData
    .map(
      (inspectionItem, index) => `
    <tr>
      <td class="col-no" style="text-align: center; width: 5%;">${index + 1}</td>
      <td class="col-activity" style="padding: 8px; width: 20%;">${esc(inspectionItem.activity)}</td>
      <td class="col-good" style="text-align: center; width: 7%;">${esc(inspectionItem.good ?? "-")}</td>
      <td class="col-need" style="text-align: center; width: 7%;">${esc(inspectionItem.need ?? "-")}</td>
      <td class="col-red" style="text-align: center; width: 7%;">${esc(inspectionItem.reject ?? "-")}</td>
      ${shiftHours
          .map((hour) => {
            const h = String(hour).padStart(2, "0");
            const nextH = String((hour + 1) % 24).padStart(2, "0");
            const slot1 = normSlot(`${h}:00 - ${h}:30`);
            const slot2 = normSlot(`${h}:30 - ${nextH}:00`);
            const v1 = slot1 ? inspectionItem.results30?.[slot1] ?? "" : "";
            const v2 = slot2 ? inspectionItem.results30?.[slot2] ?? "" : "";

            const fallback =
              inspectionItem.results?.[hour] ??
              inspectionItem.results?.[Number(hour)] ??
              inspectionItem.results?.[`${h}:00`] ??
              "";

            const leftVal = v1 !== "" ? v1 : fallback || "";
            const rightVal = v2 !== "" ? v2 : "";

            const c1 = getResultColor(leftVal, inspectionItem.good, inspectionItem.reject);
            const c2 = getResultColor(rightVal, inspectionItem.good, inspectionItem.reject);
            const cellWidth = `${(100 - (5 + 20 + 7 + 7 + 7)) / shiftHours.length}%`;

            return `
          <td class="col-shift slot-cell" style="width:${cellWidth};">
            <div class="slot-wrap">
              <div class="slot-half left" style="background:${c1}; color:${getTextColor(c1)};">${leftVal || "-"}</div>
              <div class="slot-half" style="background:${c2}; color:${getTextColor(c2)};">${rightVal || "-"}</div>
            </div>
          </td>
        `;
          })
          .join("")}
    </tr>
  `
    )
    .join("");

  return `
    <section class="report-section performa-section">
      <div class="report-date">${formatDDMonYY(item.date)}</div>
      ${performaHeader}
      <h2 style="font-weight: bold; text-align: center; font-size: 18px; margin: 8px 0;">PERFORMA RED AND GREEN</h2>
      <div class="legend">
        <span><i class="dot" style="background: #CFF5D0"></i> G (Good)</span>
        <span><i class="dot" style="background: #FFE9B0"></i> N (Need Attention)</span>
        <span><i class="dot" style="background: #F8C9CC"></i> R (Reject)</span>
      </div>
      ${itemInfo}
      <table class="performa-table">
        <thead>
          ${actualTimeRow}
          <tr>
            <th class="col-no" style="width: 5%;">No</th>
            <th class="col-activity" style="width: 20%;">Activity</th>
            <th class="col-good" style="width: 7%;">G</th>
            <th class="col-need" style="width: 7%;">N</th>
            <th class="col-red" style="width: 7%;">R</th>
            ${shiftHours
      .map((hour) => {
        const cellWidth = `${(100 - (5 + 20 + 7 + 7 + 7)) / shiftHours.length}%`;
        return `<th class="col-shift" style="width: ${cellWidth};">${hour}:00</th>`;
      })
      .join("")}
          </tr>
        </thead>
        <tbody>
          ${inspectionRows}
        </tbody>
      </table>
    </section>
  `;
};

/** ================
 * 3 CHECKLIST CILT
 * ================= */
const checklistLayerCss = `
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; font-size: 10px; text-align: center; padding: 0; }
    th { background: #3bcd6b; color: #fff; }

    /* Pewarnaan hasil */
    .result-good { background: #CFF5D0; font-weight: 700; }
    .result-bad  { background: #F8C9CC; font-weight: 700; }
    .result-need { background: #FFE9B0; font-weight: 700; }
    .result-default {}

    /* ==== GRID PER-SHIFT DI SEL TANGGAL ==== */
    .day-cell{ padding:0 !important; }
    .shift-slot{
      position: relative;
      height: 14px;
      display:flex; align-items:center; justify-content:center;
      border-bottom:1px solid #bfbfbf;
      opacity:.35;
    }
    .shift-slot:last-child{ border-bottom:none; }
    .shift-slot.on{ opacity:1; }
    .slot-num{
      position:absolute; left:2px; top:0px;
      font-size:8px; font-weight:700; color:#374151;
    }

    /* ==== KOLOM USER DENGAN 3 SHIFT ==== */
    .user-td{ padding:0; }
    .user-cell{ display:flex; align-items:stretch; height:100%; }
    .user-name{ flex:1; padding:2px 4px; font-size:9px; text-align:left; }
    .shift-badges{ width:56px; display:flex; flex-direction:column; border-left:1px solid #999; }
    .shift-badge{
      position:relative;
      height:14px;
      display:flex; align-items:center; justify-content:center;
      border-bottom:1px solid #bfbfbf;
      color:#111; opacity:.35; font-weight:700;
    }
    .shift-badge:last-child{ border-bottom:none; }
    .shift-active{ opacity:1; }
    .s1{ background:#dbeafe; }
    .s2{ background:#dcfce7; }
    .s3{ background:#fef9c3; }
    .sb-num{ position:absolute; left:2px; top:0px; font-size:9px; }
  </style>
`;

const getEntryDay = (entryTime, itemDate) => {
  const base = moment(itemDate, "YYYY-MM-DD HH:mm:ss.SSS");
  if (!entryTime) return base.date();
  if (/^\d{1,2}:\d{2}$/.test(String(entryTime).trim())) {
    return base.date();
  }

  const fmts = [
    "YYYY-MM-DD HH:mm:ss.SSS",
    "YYYY-MM-DD HH:mm:ss",
    "DD/MM/YY HH:mm:ss",
    "DD/MM/YYYY HH:mm:ss",
    "YYYY-MM-DD",
    "YYYY/MM/DD",
    "DD/MM/YY",
    "DD/MM/YYYY",
  ];
  const m = moment(entryTime, fmts, true);
  return m.isValid() ? m.date() : base.date();
};

// Cek apakah 'ts' masih di bulan yang sama dengan anchor (item.date).
// Jika 'ts' hanya HH:mm atau tidak valid → dianggap sama bulan (pakai anchor).
const sameMonth = (ts, anchorDate) => {
  const base = moment(anchorDate, "YYYY-MM-DD HH:mm:ss.SSS");
  if (!ts) return true;

  // "HH:mm" (jam saja) → pakai anchor (anggap sama bulan)
  if (/^\d{1,2}:\d{2}$/.test(String(ts).trim())) return true;

  const fmts = [
    "YYYY-MM-DD HH:mm:ss.SSS",
    "YYYY-MM-DD HH:mm:ss",
    "DD/MM/YY HH:mm:ss",
    "DD/MM/YYYY HH:mm:ss",
    "YYYY-MM-DD",
    "YYYY/MM/DD",
    "DD/MM/YY",
    "DD/MM/YYYY",
  ];
  const m = moment(ts, fmts, true);
  if (!m.isValid()) return true;
  return m.year() === base.year() && m.month() === base.month();
};

// Helper: Tentukan shift dari time (atau dari field e.shift bila ada)
const getShiftFromTime = (timeStr, fallbackShift) => {
  if (fallbackShift) {
    const s = String(fallbackShift).toLowerCase();
    if (s.includes("1")) return 1;
    if (s.includes("2")) return 2;
    if (s.includes("3")) return 3;
  }
  if (!timeStr) return null;
  const m = moment(String(timeStr).trim(), ["YYYY-MM-DD HH:mm:ss.SSS", "YYYY-MM-DD HH:mm:ss", "DD/MM/YY HH:mm:ss", "DD/MM/YYYY HH:mm:ss", "HH:mm", "H:mm"], true);
  if (!m.isValid()) return null;
  const h = m.hour();
  if (h >= 6 && h < 14) return 1;
  if (h >= 14 && h < 22) return 2;
  return 3;
};

const htmlChecklist = (item) => {
  const inspectionData = parseInspection(item.inspectionData);
  const baseMoment = moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS");
  const monthLabel = baseMoment.format("MMM-YY");
  const daysInMonth = baseMoment.daysInMonth();

  const buildHeaderDays = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => `<th>${start + i}</th>`).join("");

  // helper untuk klasifikasi tampilan “OK/NOT OK/Need”
  const getResultClass = (raw, goodRef, rejectRef) => {
    const st = classifyResult(raw, goodRef, rejectRef);
    if (st === "good") return "result-good";
    if (st === "reject") return "result-bad";
    if (st === "need") return "result-need";
    return "result-default";
  };

  // Build rows untuk satu layer; menggabungkan multi entri per hari jadi satu sel
  const buildRows = (data, start, end, anchorDate) => {
    // key baris = "job_type|componen|shift"
    const map = new Map();

    data.forEach((e) => {
      // gunakan anchor tanggal per entri
      const entryAnchor = e._anchorDate || anchorDate;
      if (!sameMonth(e.time, entryAnchor)) return;

      const day = getEntryDay(e.time, entryAnchor);
      if (day < start || day > end) return;

      // Pisahkan baris per shift
      const key = `${(e.job_type || "").trim()}|${(e.componen || "").trim()}|${e.shift ?? ""}`;
      if (!map.has(key)) {
        map.set(key, {
          job_type: e.job_type || "-",
          componen: e.componen || "-",
          picture: e.picture || null,
          // cells[day] = [{time, result, user}, ...]
          cells: {},
        });
      }

      const row = map.get(key);
      if (!row.cells[day]) row.cells[day] = [];

      // buildRows: pastikan shift selalu diisi
      const effShift = e.shift ?? getShiftFromTime(e.time, null);
      row.cells[day].push({
        time: e.time || null,
        shift: effShift,
        result: e.results ?? e.result ?? "-",
        user: e.user || "-",
      });
    });

    // render baris
    let idx = 0;
    const rows = [];
    for (const [, r] of map) {
      let latestUser = "-";
      let latestTs = -1;
      let shiftsSeen = { 1: false, 2: false, 3: false };
      let shiftUsers = { 1: new Set(), 2: new Set(), 3: new Set() };

      // siapkan sel tanggal 1..N
      const dayCells = Array.from({ length: end - start + 1 }, (_, i) => {
        const d = start + i;
        const cellItems = r.cells[d] || [];
        const fmts = [
          "YYYY-MM-DD HH:mm:ss.SSS",
          "YYYY-MM-DD HH:mm:ss",
          "DD/MM/YY HH:mm:ss",
          "DD/MM/YYYY HH:mm:ss",
          "YYYY-MM-DD",
          "YYYY/MM/DD",
          "DD/MM/YY",
          "DD/MM/YYYY",
          "HH:mm",
        ];
        const sorted = [...cellItems].sort((a, b) => {
          const ma = a.time && moment(a.time, fmts, true).isValid() ? moment(a.time, fmts, true).valueOf() : -1;
          const mb = b.time && moment(b.time, fmts, true).isValid() ? moment(b.time, fmts, true).valueOf() : -1;
          return ma - mb;
        });
        // slot sebagai array, ambil entri terakhir per shift
        const slot = { 1: [], 2: [], 3: [] };
        sorted.forEach((it, idx) => {
          const s = getShiftFromTime(it.time, it.shift);
          if (!s) return;
          const ts = it.time && moment(it.time, fmts, true).isValid() ? moment(it.time, fmts, true).valueOf() : idx;
          slot[s].push({ ts, result: it.result ?? it.results ?? "-", user: it.user || "-" });
          shiftsSeen[s] = true;
          if (it.user) shiftUsers[s].add(String(it.user));
        });
        const pickLatest = (arr) => (arr.length ? arr.reduce((a, b) => (b.ts > a.ts ? b : a)) : null);
        const latest = { 1: pickLatest(slot[1]), 2: pickLatest(slot[2]), 3: pickLatest(slot[3]) };
        // simpan user terakhir (berdasarkan waktu paling akhir)
        if (sorted.length > 0) {
          const last = sorted[sorted.length - 1];
          const tsLast = last.time && moment(last.time, fmts, true).isValid() ? moment(last.time, fmts, true).valueOf() : -1;
          if (tsLast > latestTs) {
            latestTs = tsLast;
            latestUser = last.user || "-";
          }
        }
        // builder box per shift
        const renderSlot = (s) => {
          const val = latest[s]?.result;
          const cls = !val ? "result-default" : getResultClass(val, r.good, r.reject);
          const on = val ? "on" : "";
          const label = cls === "result-good" ? "OK" : cls === "result-bad" ? "NOT OK" : val ? String(val) : "";
          return `<div class="shift-slot ${on} ${cls}"><span class="slot-num">${s}</span>${esc(label)}</div>`;
        };
        return `<td class="day-cell">${renderSlot(1)}${renderSlot(2)}${renderSlot(3)}</td>`;
      });
      // badge generator
      const renderBadge = (s) =>
        `<div class="shift-badge s${s} ${shiftsSeen[s] ? "shift-active" : ""}">
           <div class="sb-num">${s}</div>
         </div>`;
      rows.push(`
        <tr class="checklist-table-row">
          <td>${++idx}</td>
          <td>${esc(r.job_type)}</td>
          <td>${esc(r.componen)}</td>
          <td>${r.picture ? "N/A" : "N/A"}</td>
          <!-- kolom USER: nama kecil selalu tampil -->
          <td class="user-only"><div class="user-name">${esc(latestUser)}</div></td>
          <!-- kolom SHIFT: 3 kotak bernomor -->
          <td class="user-td">
            <div class="user-cell">
              <div class="shift-badges">
                ${renderBadge(1)}
                ${renderBadge(2)}
                ${renderBadge(3)}
              </div>
            </div>
          </td>
          ${dayCells.join("")}
        </tr>
      `);
    }

    return rows.join("");
  };

  // Build satu tabel untuk layer tertentu
  const buildLayerTable = (start, end, label, align = "center") => {
    const rowsHtml = buildRows(inspectionData, start, end, item.date);
    if (!rowsHtml) return "";

    return `
      <div style="margin-bottom: 30px;">
        <h3 style="font-weight: bold; text-align: ${align}; font-size: 13px; margin: 8px 0; color: #1d4ed8;">
          ${monthLabel} - Tanggal ${label}
        </h3>
        <table class="checklist-table">
          <thead>
            <tr>
              <th style="width:5%;">No</th>
              <th style="width:14%;">Job Type</th>
              <th style="width:14%;">Component</th>
              <th style="width:4%;">Picture</th>
              <th style="width:9%;">User</th>
              <th style="width:6%;">Shift</th>
              ${buildHeaderDays(start, end)}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  };

  // Render KEDUA layer
  const layer1Html = buildLayerTable(1, 15, "1–15", "center"); // << rata tengah
  const layer2Html = buildLayerTable(16, daysInMonth, `16–${daysInMonth}`, "center");

  return `
    ${checklistLayerCss}
    <section class="report-section checklist-section">
      ${renderPDFHeader("CHECKLIST CILT", item.line, `CHECKLIST CILT ${esc(item.machine || "")} ${esc(item.line || "")}`)}
      <div class="report-date">${formatDDMonYY(item.date)}</div>
      <h2 style="font-weight: bold; text-align: center; font-size: 18px; margin: 8px 0;">
        CHECKLIST CILT
      </h2>
      ${layer1Html}
      ${layer2Html}
      ${!layer1Html && !layer2Html ? '<p style="text-align: center; padding: 20px;">Belum ada data untuk bulan ini.</p>' : ""}
    </section>
  `;
};

/** ============
 * 7) CILT GIGR
 * =============
 */
const htmlCILTGIGR = (item) => {
  const rows = parseInspection(item.inspectionData)
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(r.noPalet)}</td>
        <td>${esc(r.noCarton)}</td>
        <td>${esc(r.jumlahCarton)}</td>
        <td>${esc(r.waktu)}</td>
        <td>${esc(r.user)}</td>
        <td>${esc(r.time)}</td>
      </tr>
    `
    )
    .join("");

  return `
    <section class="report-section ciltgigr-section">
      ${renderPDFHeader("CILTGIGR", item.line, "CILT GIGR")}
      <div class="report-date">${formatDDMonYY(item.date)}</div>
      <h2 style="font-weight: bold; text-align: center; font-size: 18px; margin: 8px 0;">CILT GIGR</h2>
      <table>
        <thead>
          <tr><th>No</th><th>No Palet</th><th>No Carton</th><th>Jumlah Carton</th><th>Waktu</th><th>User</th><th>Time</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
};

/** ======
 * 8) CIP
 * =======
 */
const htmlCIP = async (cipSummary) => {
  // 1) Pastikan data detail tersedia
  let header = { ...(cipSummary || {}) };
  let steps = header.steps || [];
  let specialRecords = header.specialRecords || [];

  // Kalau steps/special kosong, fetch detail berdasarkan id
  if (!steps.length || !specialRecords.length) {
    try {
      const id = header.id || header.cipReportId || header.cip_id;
      if (id) {
        const res = await api.get(`/cip-report/${id}`);
        const payload = res?.data || {};
        const core = payload.cipReport || payload.cip || payload;

        header = { ...header, ...core };
        steps = payload.steps || core?.steps || [];
        specialRecords = payload.specialRecords || core?.specialRecords || [];
      }
    } catch (e) {
      console.warn("PDF CIP fetch error:", e?.response?.data || e?.message);
      // biarkan kosong kalau gagal, halaman tetap terbuat
    }
  }

  // 2) Header PDF (judul berbeda untuk LINE A vs B/C/D)
  const cipHeaderTitle =
    String(header.line || "").toUpperCase() === "LINE A"
      ? "LAPORAN CIP MESIN GALDI RG 280 UCS (LINE A)"
      : "LAPORAN CIP MESIN GALDI (LINE B,C,D)";

  // 3) MAIN INFO (sama seperti layar Detail)
  const mainInfoSection = `
    <div class="cip-main-info">
      <div class="cip-info-title">CIP Report Detail</div>
      <table class="cip-info-table">
        <tr>
          <td class="cip-info-label">Process Order:</td>
          <td class="cip-info-value">${esc(header.processOrder || header.process_order || header.poNo || header.po_no || "-")}</td>
        </tr>
        <tr>
          <td class="cip-info-label">Date:</td>
          <td class="cip-info-value">${formatDDMonYY(header.date || new Date())}</td>
        </tr>
        <tr>
          <td class="cip-info-label">Plant:</td>
          <td class="cip-info-value">${esc(header.plant || "-")}</td>
        </tr>
        <tr>
          <td class="cip-info-label">Line:</td>
          <td class="cip-info-value">${esc(header.line || "-")}</td>
        </tr>
        <tr>
          <td class="cip-info-label">CIP Type:</td>
          <td class="cip-info-value">${esc(header.cipType || header.cip_type || "-")}</td>
        </tr>
        <tr>
          <td class="cip-info-label">Operator:</td>
          <td class="cip-info-value">${esc(header.operator || "-")}</td>
        </tr>
        <tr>
          <td class="cip-info-label">Posisi:</td>
          <td class="cip-info-value">${esc(header.posisi || "-")}</td>
        </tr>
        ${generateFlowRateRows(header)}
        ${generateValvePositionsRows(header)}
        ${generateKodeRows(header)}
      </table>
    </div>
  `;

  // 4) SECTION: CIP Steps (robust mapping)
  const stepsSection =
    steps && steps.length > 0
      ? `
    <div class="cip-section">
      <div class="cip-section-title">CIP Steps</div>
      <div class="cip-steps-container">
        ${steps
        .map((s, idx) => {
          const name = s.stepName ?? s.step_name ?? s.name ?? "-";
          const n = s.stepNumber ?? s.step_number ?? idx + 1;

          const tMin = s.temperature_setpoint_min ?? s.temperatureSetpointMin ?? s.tempMin ?? "-";
          const tMax = s.temperature_setpoint_max ?? s.temperatureSetpointMax ?? s.tempMax ?? "-";
          const tAct = s.temperature_actual ?? s.temperatureActual ?? s.temp_actual ?? "-";

          const timeSet = s.time_setpoint ?? s.timeSetpoint ?? s.time_set ?? s.time ?? "-";
          const concSet = s.concentration_setpoint ?? s.concentrationSetpoint ?? s.conc_setpoint ?? s.concSetpoint;
          const concAct = s.concentration_actual ?? s.concentrationActual ?? s.conc_actual ?? s.concActual;

          const start = (s.start_time || s.startTime || "").toString().slice(0, 5);
          const end = (s.end_time || s.endTime || "").toString().slice(0, 5);
          const duration = start && end ? `${start} - ${end}` : "-";

          return `
            <div class="cip-step-row">
              <div class="cip-step-number">${n}</div>
              <div class="cip-step-content">
                <div class="cip-step-name">${esc(name)}</div>
                <div class="cip-step-details">
                  <div class="cip-step-detail-group">
                    <span class="cip-step-label">Temp:</span>
                    <span class="cip-step-value">${tMin}–${tMax}°C / ${tAct}°C</span>
                  </div>
                  <div class="cip-step-detail-group">
                    <span class="cip-step-label">Time:</span>
                    <span class="cip-step-value">${timeSet} min</span>
                  </div>
                  ${concSet != null || concAct != null
              ? `
                    <div class="cip-step-detail-group">
                      <span class="cip-step-label">Conc:</span>
                      <span class="cip-step-value">${concSet ?? "-"}% / ${concAct ?? "-"}%</span>
                    </div>`
              : ""
            }
                  <div class="cip-step-detail-group">
                    <span class="cip-step-label">Duration:</span>
                    <span class="cip-step-value">${duration}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join("")}
      </div>
    </div>
  `
      : "";

  // 5) SECTION: COP/SOP/SIP (LINE A)
  const copSection =
    Array.isArray(header.copRecords) && header.copRecords.length > 0
      ? `
    <div class="cip-section">
      <div class="cip-section-title">COP/SOP/SIP Records</div>
      <div class="cip-cop-container">
        ${header.copRecords
        .map((cop) => {
          const tMin = cop.tempMin ?? cop.temp_min ?? "-";
          const tMax = cop.tempMax ?? cop.temp_max ?? "-";
          const tAct = cop.tempActual ?? cop.temp_actual ?? "-";
          const cMin = cop.concMin ?? cop.conc_min;
          const cMax = cop.concMax ?? cop.conc_max;
          const cAct = cop.concActual ?? cop.conc_actual;
          return `
            <div class="cip-cop-row">
              <div class="cip-cop-header">
                <div class="cip-cop-type">${esc(cop.stepType || cop.step_type || "-")}</div>
                <div class="cip-cop-time">${cop.startTime || cop.start_time || "-"} - ${cop.endTime || cop.end_time || "-"}</div>
              </div>
              <div class="cip-cop-details">
                <div class="cip-cop-detail-group"><span class="cip-cop-label">Temp:</span>
                  <span class="cip-cop-value">${tAct}°C (${tMin}-${tMax}°C)</span>
                </div>
                ${cAct != null || cMin != null || cMax != null
              ? `
                  <div class="cip-cop-detail-group"><span class="cip-cop-label">Conc:</span>
                    <span class="cip-cop-value">${cAct ?? "-"}% (${cMin ?? "-"}–${cMax ?? "-"}%)</span>
                  </div>`
              : ""
            }
                ${cop.flowRate ? `<div class="cip-cop-detail-group"><span class="cip-cop-label">Flow:</span><span class="cip-cop-value">${cop.flowRate}</span></div>` : ""}
                ${cop.time67Min ? `<div class="cip-cop-detail-group"><span class="cip-cop-label">67 min:</span><span class="cip-cop-value">${cop.time67Min}</span></div>` : ""}
                ${cop.time45Min ? `<div class="cip-cop-detail-group"><span class="cip-cop-label">45 min:</span><span class="cip-cop-value">${cop.time45Min}</span></div>` : ""}
                ${cop.time60Min ? `<div class="cip-cop-detail-group"><span class="cip-cop-label">60 min:</span><span class="cip-cop-value">${cop.time60Min}</span></div>` : ""}
              </div>
            </div>
          `;
        })
        .join("")}
      </div>
    </div>
  `
      : "";

  // 6) SECTION: DRYING/FOAMING/DISINFECT (LINE B/C/D)
  const specialSection =
    ["LINE B", "LINE C", "LINE D"].includes(String(header.line || "").toUpperCase()) &&
      Array.isArray(specialRecords) &&
      specialRecords.length > 0
      ? `
    <div class="cip-section">
      <div class="cip-section-title">DRYING, FOAMING, DISINFECT/SANITASI Records</div>
      <div class="cip-special-container">
        ${specialRecords
        .map(
          (rec) => `
          <div class="cip-special-row">
            <div class="cip-special-header">
              <div class="cip-special-type">${esc(rec.stepType || rec.step_type || "-")}</div>
              <div class="cip-special-time">${rec.startTime || rec.start_time || "-"} - ${rec.endTime || rec.end_time || "-"}</div>
            </div>
            <div class="cip-special-details">
              ${generateSpecialRecordDetails(rec, header.line)}
            </div>
            <div class="cip-special-footer">
              <span class="cip-special-footer-text">Kode: ${esc(rec.kode || rec.code || "-")}</span>
            </div>
          </div>
        `
        )
        .join("")}
      </div>
    </div>
  `
      : "";

  // 7) Susun halaman CIP
  return `
    <section class="report-section cip-section-main">
      ${renderPDFHeader("CIP", header.line, cipHeaderTitle)}
      <div class="report-date">${formatDDMonYY(header.date || new Date())}</div>
      <h2 style="font-weight: bold; text-align: center; font-size: 18px; margin: 8px 0;">
        CIP REPORT
      </h2>
      ${mainInfoSection}
      ${stepsSection}
      ${copSection}
      ${specialSection}
    </section>
  `;
};

// Router template - Updated to handle async PERFORMA
const htmlByPackage = async (item) => {
  const packageType = item.packageType;
  const config = PACKAGE_CONFIG[packageType];

  // Prioritas 1: Gunakan imported generator jika ada
  if (config?.htmlGenerator) {
    const html = config.htmlGenerator;
    return typeof html === 'function' ? html(item) : html;
  }

  // Prioritas 2: Hanya untuk package yang memang perlu fungsi inline khusus
  switch (packageType) {
    case "SEGREGASI":
      return htmlSegregasi(item);      // fungsi inline di ListCILT
    case "PERFORMA RED AND GREEN":
      return await htmlShiftly(item);       // fungsi inline di ListCILT (async)
    case "CHECKLIST CILT":
      return htmlChecklist(item);      // fungsi inline di ListCILT
    case "CILTGIGR":
      return htmlCILTGIGR(item);
    case "REPORT CIP":
      return await htmlCIP(item);     // fungsi inline di ListCILT
    default:
      // Untuk package yang tidak dikenali, gunakan default
      return `<div class="package-error">No template found for package: ${esc(packageType)}</div>`;
  }
};

/* Package orientation mapping */
const PACKAGE_ORIENTATIONS = {
  // PORTRAIT packages (data tidak terlalu lebar)
  "SEGREGASI": "portrait",
  "PEMAKAIAN SCREW CAP": "portrait",
  "PEMAKAIAN PAPER": "portrait",
  "PENGECEKAN H2O2 ( SPRAY )": "portrait",
  "CILTGIGR": "portrait",
  "REPORT CIP": "portrait",
  "LAPORAN ARTEMA & SMS CARDBOARD": "portrait",
  "LAPORAN FRANS WP 25 CASE": "portrait",
  "ROBOT PALLETIZER FILLER": "portrait",
  "COMBI XG SLIM 24": "portrait",
  "COMBI XG CHECK": "portrait",
  "COMBI XG PRODUCT": "portrait",

  // LANDSCAPE packages
  "PERFORMA RED AND GREEN": "landscape",
  "CHECKLIST CILT": "landscape",
  "PENGECEKAN PRESSURE": "landscape",
  "A3 FLEX PAGE 1": "landscape",
  "A3 FLEX": "landscape",
  "START FINISH PRODUKSI": "landscape",
  "START & FINISH PRODUKSI": "landscape",
};

const getPackageOrientation = (packageType) => {
  return PACKAGE_ORIENTATIONS[packageType] || "portrait"; // default portrait
};

/* Global CSS untuk PDF - base (tetap) */
const globalPdfCss = `
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
    @page { size: A4 portrait; margin: 12mm; }
    /* Matikan footer page counter supaya tidak tampil di kanan bawah */
    @page { @bottom-right { content: none; } }
    @media print { html, body { counter-reset: page 1; } }
    /* Biarkan counter tampil di sel FRM → Hal */
    .meta-value .page-xofn::after { content: counter(page) " dari " counter(pages); }
    .pkg-root { counter-reset: page 1; }

    /* Section wrapper untuk orientation control */
    .pkg-section[data-orientation="landscape"] {
      page-break-before: always;
    }
    
    .pkg-section[data-orientation="portrait"] {
      page-break-before: always;
    }
    
    /* Ensure sections respect their orientation */
    @media print {
      .pkg-section[data-orientation="landscape"] {
        page: landscape-page;
      }
      
      .pkg-section[data-orientation="portrait"] {
        page: portrait-page;
      }
    }
    
    @page portrait-page {
      size: A4 portrait;
      margin: 12mm;
    }
    
    @page landscape-page {
      size: A4 landscape;
      margin: 10mm;
    }
    h1, h2 { color: #1d4ed8; margin: 15px 0 8px; text-align: center; }
    h3 { margin: 12px 0 6px; }
    .header-container { border: 2px solid #d7d7d7; border-radius: 8px; background: #fff; margin-bottom: 12px; overflow: hidden; page-break-after: avoid; }
    .segregasi-section .header-container,
    .performa-section  .header-container,
    .checklist-section .header-container { margin-bottom: 10px; }
    .header-main-table { width: 100%; border-collapse: collapse; }
    .logo-section { width: 130px; height: 60px; text-align: center; vertical-align: middle; padding: 8px; }
    .greenfields-logo { text-align: center; }
    .logo-green { font-weight: bold; font-size: 18px; color: #2E7D32; font-style: italic; font-family: 'Times New Roman', serif; }
    .company-section { text-align: center; vertical-align: middle; padding: 8px; }
    .company-name { font-size: 16px; font-weight: bold; color: #333; text-align: center; }
    .meta-section { width: 140px; vertical-align: top; padding: 8px; border-left: 1px solid #e5e5e5; }
    .meta-info-table { width: 100%; border-collapse: collapse; }
    .meta-info-table td { padding: 2px 0; font-size: 11px; vertical-align: top; }
    .meta-label { width: 50px; color: #333; font-weight: 600; }
    .meta-colon { width: 8px; text-align: center; color: #333; }
    .meta-value { font-weight: 600; color: #333; }
    .header-title-table { width: 100%; border-collapse: collapse; border-top: 1px solid #e5e5e5; }
    .title-label { width: 110px; padding: 6px; text-align: center; font-weight: 600; font-size: 11px; color: #333; background: #fafafa; border-right: 1px solid #e5e5e5; }
    .title-content { padding: 6px; text-align: center; font-weight: bold; font-size: 12px; color: #333; }
    .report-info { text-align: left; margin-bottom: 12px; }
    p { margin-bottom: 0; }
    .general-info-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
    .general-info-table td { border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; }
    .general-info-table td:first-child { width: 35%; }
    .general-info-table td:last-child { width: 65%; }
    .report-section.cip-section-main,
    .report-section.segregasi-section,
    .report-section.performa-section,
    .report-section.checklist-section,
    .report-section.screwcap-section,
    .report-section.paper-section,
    .report-section.h2o2-section,
    .report-section.ciltgigr-section {
      page-break-before: always;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid black; padding: 6px; text-align: center; font-size: 11px; }
    th { background-color: #f2f2f2; font-weight: bold; }
    .performa-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .performa-table th, .performa-table td { border: 1px solid black; padding: 4px; font-size: 10px; }
    .performa-table th { background-color: #3bcd6b; color: white; font-weight: bold; text-align: center; }
    .actual-time-row td { background-color: #f8f9fa !important; font-weight: bold; }
    .report-section { margin-bottom: 25px; }
    .header-container { page-break-after: avoid; }
    .report-date { page-break-after: avoid; }
    h1, h2, h3 { page-break-after: avoid; }
    .cip-steps-container .cip-step-row { page-break-inside: avoid; }
    .cip-cop-row, .cip-special-row { page-break-inside: avoid; }
    .report-section.performa-section { page-break-before: always; margin-bottom: 30px; }
    .section-title { background-color: #e8f4fd; padding: 8px; margin: 15px 0 10px 0; text-align: center; font-weight: bold; font-size: 16px; border-radius: 6px; border: 1px solid #1d4ed8; color: #333; }
    .section-description { text-align: center; margin-bottom: 10px; font-style: italic; color: #666; font-size: 11px; line-height: 14px; }
    img { display: block; margin: auto; }
    .cover { margin-bottom: 20px; text-align: center; page-break-after: avoid; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
    .date-group-header { 
      background-color: #e3f2fd; 
      padding: 8px; 
      margin: 15px 0 8px 0; 
      text-align: center; 
      font-weight: bold; 
      font-size: 16px; 
      border: 2px solid #1976d2; 
      border-radius: 8px; 
      color: #0d47a1;
      page-break-before: always;
    }
    .date-group-header:first-child { page-break-before: avoid; }
    .single-package-section { margin-bottom: 5px; }
    .multiple-package-section { margin-bottom: 20px; }
    .slot-cell { padding:0; }
    .slot-wrap { display:flex; width:100%; height:100%; border-left:1px solid #ddd; border-right:1px solid #ddd; }
    .slot-half {
      flex:1; text-align:center; padding:6px 0;
    }
      .package-error {
     padding: 20px;
     text-align: center;
     background-color: #fee;
     border: 2px solid #f99;
     border-radius: 8px;
     margin: 20px 0;
     color: #c00;
     font-weight: bold;
   }
</style>
`;

/* Segregasi-specific styles */
const segregasiPdfStyles = `
  <style>
  .segregasi-section { 
    page-break-inside: avoid; 
    margin-bottom: 25px;
  }
  .description-container {
    margin-bottom: 16px;
    padding: 12px;
    background-color: #fff;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
  }
  .desc-header-bar {
    display: flex;
    align-items: center;
    background-color: #DDF5E4;
    border: 1px solid #B6E3C5;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 10px;
    gap: 8px;
  }
  .desc-header-cell { flex: 1; text-align: center; font-weight: 700; font-size: 12px; color: #2E6B3E; }
  .desc-header-narrow { flex: 0.9; }
  .desc-header-wide { flex: 1.4; }
  .desc-grid { display: flex; gap: 10px; overflow-x: auto; padding-right: 6px; }
  .desc-column { width: 300px; background-color: #fff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px; margin-right: 4px; box-shadow: 0 2px 3px rgba(0,0,0,0.05); }
  .desc-column-header { font-size: 12px; font-weight: 700; text-align: center; padding: 6px; margin-bottom: 8px; color: #374151; background-color: #F8FAFC; border-radius: 6px; border: 1px solid #EEF2F7; }
  .desc-detail-table { width: 100%; border-collapse: collapse; }
  .desc-detail-table td { padding: 6px 8px; border: 1px solid #E5E7EB; font-size: 11px; }
  .desc-label { font-weight: 700; color: #374151; background-color: #F8FAFC; width: 40%; }
  .desc-label-help { font-weight: 700; color: #374151; background-color: #F8FAFC; width: 40%; font-size: 10px; }
  .desc-value { color: #374151; font-weight: 500; }
  .no-description-data { text-align: center; padding: 10px; font-style: italic; color: #999; }

  .segregasi-container { margin-top: 8px; padding: 12px; background-color: #fff; border: 1px solid #E2E8F0; border-radius: 8px; }
  .seg-header-bar { display: flex; align-items: center; background-color: #DDF5E4; border: 1px solid #B6E3C5; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; gap: 8px; }
  .seg-header-cell { flex: 1; text-align: center; font-weight: 700; font-size: 12px; color: #2E6B3E; }
  .seg-header-narrow { flex: 0.9; }
  .seg-header-wide { flex: 1.4; }
  .seg-grid { display: flex; gap: 10px; overflow-x: auto; padding-right: 6px; }
  .seg-column { width: 300px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px; margin-right: 4px; box-shadow: 0 2px 3px rgba(0,0,0,0.05); }
  .seg-column-header { font-size: 12px; font-weight: 700; text-align: center; padding: 6px; margin-bottom: 8px; color: #374151; background-color: #F8FAFC; border-radius: 6px; border: 1px solid #EEF2F7; }
  .seg-detail-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .seg-detail-table td { padding: 6px 8px; border: 1px solid #E5E7EB; font-size: 11px; }
  .seg-label { font-weight: 700; color: #374151; background-color: #F8FAFC; width: 40%; }
  .seg-value { color: #374151; font-weight: 500; }
  .seg-value-disabled { color: #9CA3AF; background-color: #F8FAFC; }
  .equipment-status { margin-top: 4px; border-top: 1px solid #F1F5F9; padding-top: 8px; }
  .equipment-title { font-size: 11px; font-weight: 700; color: #374151; margin-bottom: 6px; }
  .equipment-table { width: 100%; border-collapse: collapse; }
  .equipment-table td { padding: 4px 6px; border: 1px solid #E5E7EB; font-size: 11px; }
  .eq-label { color: #374151; background-color: #F8FAFC; width: 70%; }
  .eq-checkbox { text-align: center; font-weight: 900; color: #22C55E; background-color: #FFFFFF; width: 30%; }
  .audit-trail { margin-top: 8px; background-color: #F3F4F6; border-radius: 6px; padding: 6px; border-left: 3px solid #9CA3AF; }
  .audit-trail div { font-size: 10px; color: #4B5563; margin-bottom: 2px; }
  </style>
`;

/* Checklist-specific styles */
const checklistPdfStyles = `
  <style>
  /* Force landscape untuk CHECKLIST section */
  .checklist-section { 
    page-break-inside: avoid; 
    margin-bottom: 25px; 
  }
  
  /* Landscape page untuk CHECKLIST */
  @media print {
    .checklist-section {
      page: landscape-page;
    }
  }
  
  @page landscape-page {
    size: A4 landscape;
    margin: 12mm;
  }

  /* Detail Data super kecil */
  .checklist-report-info { background:#fff; padding:10px; margin-bottom:12px; border:1px solid #EAEAEA; border-radius:5px; }
  .checklist-info-title { font-size:10px; font-weight:700; margin-bottom:8px; text-align:center; color:#333; }
  .checklist-info-table { width:100%; border-collapse:collapse; }
  .checklist-info-table td { padding:1px 0; font-size:9px; line-height:1.1; }
  .info-label { font-weight:600; color:#444; width:90px; }
  .info-value { font-weight:700; color:#111; padding-left:10px; }

  .checklist-table-container { margin-top:10px; border:1px solid #D9E3DB; border-radius:6px; overflow:hidden; }
  .checklist-table { width:100%; border-collapse:collapse; margin:0; }
  .checklist-table-header { background:#CDEFD8; }
  .checklist-header-cell { color:#1f2937; font-weight:800; text-align:center; padding:12px 8px; font-size:12px; border-right:1px solid #9ED4B5; }
  .checklist-header-cell:last-child { border-right:none; }

  .checklist-table-row { border-bottom:1px solid #EAEAEA; }
  .checklist-table-row:nth-child(even){ background:#f9f9f9; }
  .checklist-cell, .checklist-cell-center { padding:12px 8px; font-size:12px; color:#111; border-right:1px solid #EAEAEA; }
  .checklist-cell-center { text-align:center; }
  .checklist-cell:last-child, .checklist-cell-center:last-child { border-right:none; }

  .result-good { background:#d4edda !important; color:#155724; font-weight:800; }
  .result-bad { background:#fde2e2 !important; color:#b91c1c; font-weight:800; }
  .result-need { background:#fff3cd !important; color:#856404; font-weight:800; }
  .result-default { color:#111; font-weight:700; }

  .picture-indicator { color:#0b63c9; text-decoration:underline; font-style:italic; }
  </style>
`;

/* CIP-specific styles */
const cipPdfStyles = `
  <style>
  /* CIP Report specific styles */
  .cip-section-main { 
    page-break-before: always;
    page-break-inside: avoid; 
    margin-bottom: 30px;
  }
  
  /* Main Info Section */
  .cip-main-info {
    background-color: #f5f5f5;
    padding: 16px;
    margin: 16px 0;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }
  
  .cip-info-title {
    font-size: 20px;
    font-weight: bold;
    color: #1d4ed8;
    margin-bottom: 16px;
    text-align: center;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 8px;
  }
  
  .cip-info-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .cip-info-table tr {
    margin-bottom: 8px;
  }
  
  .cip-info-table td {
    padding: 4px 0;
    border: none;
    font-size: 14px;
    vertical-align: top;
  }
  
  .cip-info-label {
    font-weight: 600;
    color: #374151;
    width: 150px;
  }
  
  .cip-info-value {
    color: #000;
    font-weight: normal;
  }
  
  .cip-status {
    font-weight: bold;
    color: #1d4ed8;
  }
  
  .cip-valve-positions {
    font-family: monospace;
    background-color: #f8f9fa;
    padding: 4px 8px;
    border-radius: 4px;
  }
  
  .cip-notes {
    line-height: 1.4;
    padding: 4px 0;
  }

  /* Section Styles */
  .cip-section {
    margin: 16px 0;
  }
  
  .cip-section-title {
    font-size: 18px;
    font-weight: bold;
    color: #1d4ed8;
    margin-bottom: 12px;
    padding-bottom: 4px;
    border-bottom: 2px solid #1d4ed8;
  }

  /* CIP Steps Styles */
  .cip-steps-container {
    margin-bottom: 16px;
  }
  
  .cip-step-row {
    display: flex;
    background-color: #f9f9f9;
    padding: 12px;
    margin-bottom: 8px;
    border-radius: 8px;
    border-left: 3px solid #22c55e;
  }
  
  .cip-step-number {
    font-size: 16px;
    font-weight: bold;
    color: #1d4ed8;
    margin-right: 12px;
    min-width: 20px;
  }
  
  .cip-step-content {
    flex: 1;
  }
  
  .cip-step-name {
    font-size: 16px;
    font-weight: 600;
    color: #000;
    margin-bottom: 4px;
  }
  
  .cip-step-details {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .cip-step-detail-group {
    display: flex;
    margin-top: 4px;
  }
  
  .cip-step-label {
    font-size: 12px;
    color: #374151;
    margin-right: 4px;
    font-weight: 500;
  }
  
  .cip-step-value {
    font-size: 12px;
    color: #000;
    font-weight: 500;
  }

  /* COP Records Styles */
  .cip-cop-container {
    margin-bottom: 16px;
  }
  
  .cip-cop-row {
    background-color: #f9f9f9;
    padding: 12px;
    margin-bottom: 8px;
    border-radius: 8px;
    border-left: 3px solid #f59e0b;
  }
  
  .cip-cop-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    align-items: center;
  }
  
  .cip-cop-type {
    font-size: 16px;
    font-weight: bold;
    color: #1d4ed8;
  }
  
  .cip-cop-time {
    font-size: 14px;
    color: #374151;
  }
  
  .cip-cop-details {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 8px;
  }
  
  .cip-cop-detail-group {
    display: flex;
    margin-bottom: 4px;
  }
  
  .cip-cop-label {
    font-size: 12px;
    color: #374151;
    margin-right: 4px;
    font-weight: 500;
  }
  
  .cip-cop-value {
    font-size: 12px;
    color: #000;
    font-weight: 500;
  }
  
  .cip-cop-footer {
    border-top: 1px solid #e0e0e0;
    padding-top: 8px;
  }
  
  .cip-cop-footer-text {
    font-size: 12px;
    color: #374151;
  }

  /* Special Records Styles */
  .cip-special-container {
    margin-bottom: 16px;
  }
  
  .cip-special-row {
    background-color: #f9f9f9;
    padding: 12px;
    margin-bottom: 8px;
    border-radius: 8px;
    border-left: 3px solid #f59e0b;
  }
  
  .cip-special-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    align-items: center;
  }
  
  .cip-special-type {
    font-size: 16px;
    font-weight: bold;
    color: #f59e0b;
  }
  
  .cip-special-time {
    font-size: 14px;
    color: #374151;
  }
  
  .cip-special-details {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 8px;
  }
  
  .cip-special-detail-group {
    display: flex;
    margin-bottom: 4px;
  }
  
  .cip-special-label {
    font-size: 12px;
    color: #374151;
    margin-right: 4px;
    font-weight: 500;
  }
  
  .cip-special-value {
    font-size: 12px;
    color: #000;
    font-weight: 500;
  }
  
  .cip-special-note {
    font-size: 12px;
    color: #6b7280;
    font-style: italic;
  }
  
  .cip-special-footer {
    border-top: 1px solid #e0e0e0;
    padding-top: 8px;
  }
  
  .cip-special-footer-text {
    font-size: 12px;
    color: #374151;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .cip-step-details,
    .cip-cop-details,
    .cip-special-details {
      flex-direction: column;
      gap: 4px;
    }
    
    .cip-step-row,
    .cip-cop-row,
    .cip-special-row {
      flex-direction: column;
    }
    
    .cip-step-number {
      margin-bottom: 8px;
    }
  }
  </style>
`;

/* PERFORMA-specific styles */
const performaPdfStyles = `
  <style>
  /* PERFORMA Report specific styles matching DetailLaporanShiftly */
  .performa-section { 
    page-break-before: always;
    page-break-inside: avoid; 
    margin-bottom: 30px;
  }

  /* Landscape page untuk PERFORMA */
  @media print {
    .performa-section {
      page: landscape-page;
    }
  }
  
  @page landscape-page {
    size: A4 landscape;
    margin: 10mm;
  }
  
  /* Report info section matching DetailLaporanShiftly */
  .report-info { 
    text-align: left; 
    margin-bottom: 12px; 
    background: #fff;
    padding: 10px;
    border: 1px solid #e0e0e0;
    border-radius: 5px;
  }
  
  /* General info table matching DetailLaporanShiftly */
  .general-info-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin-top: 10px; 
    margin-bottom: 15px;
  }
  
  .general-info-table td { 
    border: 1px solid black; 
    padding: 5px; 
    text-align: left; 
    vertical-align: top; 
    font-size: 14px;
  }
  
  .general-info-table td:first-child { 
    width: 35%; 
  }
  
  .general-info-table td:last-child { 
    width: 65%; 
  }
  
  /* PERFORMA table styling matching DetailLaporanShiftly */
  .performa-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin-top: 20px; 
    page-break-inside: auto;
    table-layout: fixed;
  }
  
  .performa-table th, 
  .performa-table td { 
    border: 1px solid black; 
    padding: 8px; 
    text-align: center;
    word-wrap: break-word; 
    font-size: 12px;
    vertical-align: middle;
  }
  
  .performa-table th { 
    background-color: #3bcd6b; 
    color: white; 
    font-weight: bold; 
    text-align: center !important;
  }
  
  /* Column width specifications matching DetailLaporanShiftly */
  .col-no { 
    width: 5% !important; 
    text-align: center !important;
  }
  
  .col-activity { 
    width: 20% !important; 
    text-align: left !important;
    padding-left: 8px !important;
  }
  
  .col-good, .col-need, .col-red { 
    width: 7% !important; 
    text-align: center !important;
  }
  
  .col-shift { 
    text-align: center !important;
    font-weight: bold !important;
    padding: 4px !important;
  }
  
  /* Actual time row styling */
  .performa-table thead tr:first-child td {
    background-color: #f8f9fa !important;
    font-weight: bold !important;
    text-align: center !important;
    padding: 4px !important;
    vertical-align: middle !important;
    border: 1px solid black !important;
  }
  
  /* Header row styling */
  .performa-table thead tr:last-child th {
    background-color: #3bcd6b !important;
    color: white !important;
    font-weight: bold !important;
    text-align: center !important;
    padding: 8px !important;
    vertical-align: middle !important;
  }
  
  /* Late/On-time color indicators */
  .time-late {
    background-color: #ffebee !important;
    color: #d32f2f !important;
  }
  
  .time-ontime {
    background-color: #e8f5e9 !important;
    color: #2e7d32 !important;
  }
  
  /* Result background colors */
  .result-good {
    background-color: #d4edda !important;
  }
  
  .result-need {
    background-color: #fff3cd !important;
  }
  
  .result-reject {
    background-color: #f8d7da !important;
  }
  
  .result-default {
    background-color: #f8f9fa !important;
  }
  
  /* Page orientation for PERFORMA */
  @page {
    size: A4 landscape;
    margin: 10mm;
  }
  
  /* Print-specific adjustments */
  @media print {
    .performa-section {
      page-break-before: always;
    }
    
    .performa-table {
      font-size: 11px;
    }
    
    .col-activity {
      font-size: 10px;
    }
  }
  </style>
`;

const artemaFransPdfStyles = `
  <style>
  /* ARTEMA SECTION STYLES - PORTRAIT OPTIMIZED */
  .artema-section {
    page-break-before: always;
    page-break-inside: avoid;
    margin-bottom: 25px;
  }
  
  .artema-section .section-title {
    font-weight: bold;
    background-color: #d9f0e3;
    padding: 12px 15px;
    margin: 20px 0 12px 0;
    border-radius: 6px;
    color: #2f5d43;
    font-size: 14px;
    text-align: center;
    border: 1px solid #b8d4c2;
  }
  
  .artema-section .section-note {
    font-size: 12px;
    color: #555;
    margin: 10px 0;
    font-style: italic;
  }
  
  /* Data Table untuk Artema */
  .artema-section .data-table {
    width: 100%;
    font-size: 12px;
    border-collapse: collapse;
    margin-bottom: 15px;
  }
  
  .artema-section .data-table th,
  .artema-section .data-table td {
    border: 1px solid #bbb;
    padding: 10px 12px;
    text-align: center;
    vertical-align: middle;
  }
  
  .artema-section .data-table th {
    background-color: #e7f2ed;
    font-weight: 700;
    color: #2f5d43;
    font-size: 12px;
  }
  
  /* Temperature Table */
  .artema-section .temp-table th,
  .artema-section .temp-table td {
    border: 1px solid #bbb;
    padding: 10px 8px;
    text-align: center;
    vertical-align: middle;
    font-size: 12px;
  }
  
  .artema-section .temp-header-label,
  .artema-section .temp-header-jam {
    background-color: #d7e9dd;
    font-weight: 700;
    color: #2f5d43;
    font-size: 12px;
  }
  
  .artema-section .temp-label {
    font-weight: 700;
    background-color: #f8faf9;
    width: 80px;
    text-align: center;
  }
  
  .artema-section .temp-cell {
    padding: 10px 8px;
    min-width: 70px;
    font-size: 12px;
  }
  
  /* Info Table */
  .artema-section .info-table th {
    width: 140px;
    text-align: left;
    padding-left: 15px;
    background-color: #e7f2ed;
    font-size: 12px;
  }
  
  .artema-section .info-table td {
    text-align: left;
    padding-left: 15px;
    font-size: 12px;
  }
  
  /* Glue Table */
  .artema-section .glue-table th,
  .artema-section .glue-table td {
    padding: 10px 12px;
    font-size: 12px;
  }
  
  /* Loss Table */
  .artema-section .loss-table th,
  .artema-section .loss-table td {
    padding: 10px 12px;
    font-size: 12px;
  }
  
  /* Problem Table */
  .artema-section .problem-table th,
  .artema-section .problem-table td {
    padding: 10px 8px;
    font-size: 12px;
  }
  
  .artema-section .problem-table th:nth-child(4),
  .artema-section .problem-table td:nth-child(4),
  .artema-section .problem-table th:nth-child(5),
  .artema-section .problem-table td:nth-child(5) {
    text-align: left;
    padding-left: 12px;
    min-width: 150px;
  }
  
  .artema-section .notes-box {
    background-color: #f8f9fa;
    padding: 14px;
    border-radius: 6px;
    border-left: 4px solid #2e7d32;
    margin-top: 15px;
    font-size: 12px;
    line-height: 1.5;
  }
  
  .artema-section .general-info-table td {
    border: 1px solid #ccc;
    padding: 10px 12px;
    font-size: 12px;
  }
  
  /* FRANS SECTION STYLES */
  .frans-section {
    page-break-before: always;
    page-break-inside: avoid;
    margin-bottom: 25px;
  }
  
  .frans-section .section-title {
    font-weight: bold;
    background-color: #d9f0e3;
    padding: 12px 15px;
    margin: 20px 0 12px 0;
    border-radius: 6px;
    color: #2f5d43;
    font-size: 14px;
    text-align: center;
    border: 1px solid #b8d4c2;
  }
  
  .frans-section .data-table th,
  .frans-section .data-table td {
    border: 1px solid #bbb;
    padding: 10px 12px;
    text-align: center;
    vertical-align: middle;
    font-size: 12px;
  }
  
  .frans-section .data-table th {
    background-color: #e7f2ed;
    font-weight: 700;
    color: #2f5d43;
    font-size: 12px;
  }
  
  .frans-section .hose-table th,
  .frans-section .hose-table td {
    border: 1px solid #bbb;
    padding: 10px 8px;
    text-align: center;
    font-size: 12px;
  }
  
  .frans-section .hose-table th {
    background-color: #d7e9dd;
    font-weight: 700;
    color: #2f5d43;
  }
  
  .frans-section .info-table th {
    width: 140px;
    text-align: left;
    padding-left: 15px;
    background-color: #e7f2ed;
    font-size: 12px;
  }
  
  .frans-section .info-table td {
    text-align: left;
    padding-left: 15px;
    font-size: 12px;
  }
  
  .frans-section .glue-table th,
  .frans-section .glue-table td {
    padding: 10px 12px;
    font-size: 12px;
  }
  
  .frans-section .nc-table th,
  .frans-section .nc-table td {
    padding: 10px 8px;
    font-size: 12px;
  }
  
  .frans-section .total-row {
    background-color: #e7f2ed;
    font-weight: 700;
  }
  
  .frans-section .notes-box {
    background-color: #f8f9fa;
    padding: 14px;
    border-radius: 6px;
    border-left: 4px solid #2e7d32;
    margin-top: 15px;
    font-size: 12px;
  }
  
  .frans-section .general-info-table td {
    border: 1px solid #ccc;
    padding: 10px 12px;
    font-size: 12px;
  }
  
  /* Common utilities */
  .text-left {
    text-align: left !important;
    padding-left: 12px !important;
  }
  
  .no-data {
    color: #999;
    font-style: italic;
    text-align: center;
    padding: 15px;
  }
  </style>
`;

const updatedGlobalPdfCssWithAll = globalPdfCss + segregasiPdfStyles + checklistPdfStyles + cipPdfStyles + performaPdfStyles + artemaFransPdfStyles;

/* =======================
 * Grouping CHECKLIST CILT 
 * ======================= */

// Kelompokkan semua item CHECKLIST CILT => satu item per (plant,line,machine, bulan)
const groupMonthlyChecklistCILT = (items) => {
  const groups = new Map(); // key: plant|line|machine|YYYY-MM

  items
    .filter((it) => (it.packageType || "") === "CHECKLIST CILT")
    .forEach((it) => {
      const m = moment(it.date, "YYYY-MM-DD HH:mm:ss.SSS");
      const yymm = m.format("YYYY-MM");
      const key = [it.plant, it.line, it.machine, yymm].map((v) => (v || "").trim()).join("|");

      if (!groups.has(key)) {
        groups.set(key, {
          ...it,
          // tanggal "sintetik" utk judul; real anchor per entri akan dibawa di setiap entri
          date: `${yymm}-01 00:00:00.000`,
          // kita gabungkan semua entries dari berbagai tanggal ke satu array
          inspectionData: [],
        });
      }

      const g = groups.get(key);

      // Ambil array inspection dari item ini
      let arr;
      try {
        arr = Array.isArray(it.inspectionData) ? it.inspectionData : JSON.parse(it.inspectionData || "[]");
      } catch {
        arr = [];
      }

      // Sisipkan _anchorDate utk setiap entri (supaya tahu "tanggal asli" entrinya)
      arr.forEach((e) => g.inspectionData.push({ ...e, _anchorDate: it.date }));
    });

  // Kembalikan daftar item agregat & sisakan item non-checklist seperti semula
  const aggregated = Array.from(groups.values()).map((g) => ({
    ...g,
    // pastikan bentuknya string JSON jika kode lain mengharapkan string
    inspectionData: JSON.stringify(g.inspectionData),
  }));

  const nonChecklist = items.filter((it) => (it.packageType || "") !== "CHECKLIST CILT");
  return [...nonChecklist, ...aggregated];
};

/* =======================
 * Grouping CHECKLIST CILT 
 * ======================= */

// Gabungkan semua item CHECKLIST CILT per (plant,line,machine,bulan)
// & simpan tanggal asli tiap entri ke _anchorDate agar mapping kolom harinya benar.
const mergeChecklistCILTMonthly = (items) => {
  const groups = new Map();

  items.forEach((it) => {
    if (it.packageType !== "CHECKLIST CILT") return;

    const m = moment(it.date, "YYYY-MM-DD HH:mm:ss.SSS");
    const key = [it.packageType, it.plant || "", it.line || "", it.machine || "", m.format("YYYY-MM")].join("|");

    if (!groups.has(key)) {
      groups.set(key, {
        ...it,
        // Anchor tabel boleh diset ke akhir bulan (biar judul rapi),
        // tapi PER HARI akan dihitung dari _anchorDate per entri.
        date: m.endOf("month").format("YYYY-MM-DD HH:mm:ss.SSS"),
        inspectionData: [],
      });
    }

    const holder = groups.get(key);

    // Ambil inspectionData dari item harian
    let src = [];
    try {
      src = Array.isArray(it.inspectionData) ? it.inspectionData : JSON.parse(it.inspectionData || "[]");
    } catch {
      src = [];
    }

    // sisipkan _anchorDate = tanggal ASLI item harian ini
    src.forEach((e) => {
      holder.inspectionData.push({
        ...e,
        _anchorDate: it.date, // mapping kolom tanggal
      });
    });
  });

  // Items non-CHECKLIST CILT tetap apa adanya + hasil gabungan bulanan
  const nonCilt = items.filter((x) => x.packageType !== "CHECKLIST CILT");
  return nonCilt.concat(Array.from(groups.values()));
};

/* =======================
 * Helpers utk REPORT CIP 
 * ======================= */

const toMoment = (val) => {
  // Terima format date-only, datetime, ISO, dsb.
  const tryFormats = ["YYYY-MM-DD HH:mm:ss.SSS", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD", "DD/MM/YYYY HH:mm", moment.ISO_8601];
  return moment(val, tryFormats, true).isValid() ? moment(val, tryFormats, true) : moment(val); // fallback
};

// Aturan shift baru:
// 06:00-13:59 => Shift 1, 14:00-21:59 => Shift 2, 22:00-05:59 => Shift 3
const deriveShift = (dateOrString) => {
  if (!dateOrString) return "-";
  const m = toMoment(dateOrString);
  if (!m.isValid()) return "-";
  const h = m.hour();
  if (h >= 6 && h < 14) return "Shift 1";
  if (h >= 14 && h < 22) return "Shift 2";
  return "Shift 3";
};

// Ubah "CIP_KITCHEN_1" => "Cip Kitchen 1"
const humanize = (s = "") =>
  String(s)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Optional label mapping utk beberapa kode yang umum
const CIP_PRODUCT_LABELS = {
  CIP1: "CIP 1",
  CIP2: "CIP 2",
  CIP_KITCHEN_1: "CIP Kitchen 1",
  CIP_KITCHEN_2: "CIP Kitchen 2",
  CIP_KITCHEN_3: "CIP Kitchen 3",
};
const labelCipProduct = (raw) => CIP_PRODUCT_LABELS[String(raw || "").toUpperCase()] || humanize(raw || "-");

/* ===============
 * KOMPONEN LAYAR
 * =============== */

const ListCILT = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dataGreentag, setDataGreentag] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "ascending" });
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [plantOptions, setPlantOptions] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const [packageOptions, setPackageOptions] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const shiftOptions = ["Shift 1", "Shift 2", "Shift 3"];
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);

  // Bulan & Tahun (khusus Checklist CILT)
  const [selectedMonth, setSelectedMonth] = useState(""); // "01".."12" atau "" (semua)
  const [selectedYear, setSelectedYear] = useState(""); // "2024".."2026" atau "" (semua)

  // Daftar tahun yang tersedia dari data (supaya tidak duplikat)
  const yearOptions = useMemo(() => {
    const years = new Set(
      dataGreentag
        .filter((x) => x.packageType === "CHECKLIST CILT" && x.date)
        .map((x) => moment(x.date).format("YYYY"))
    );
    return Array.from(years).sort((a, b) => b.localeCompare(a)); // terbaru dulu
  }, [dataGreentag]);

  // state khusus list CIP yang akan digabung ke tabel List CILT
  const [cipRows, setCipRows] = useState([]);

  // ubah data CIP dari API ke bentuk baris tabel List CILT
  const mapCipToRow = useCallback(
    (x) => ({
      id: Number(x.id), // penting: numeric utk DetailReportCIP
      date: x.date || x.created_at, // date-only OK (tabel tetap render tgl saja)
      processOrder: x.processOrder || x.process_order || x.poNo || x.po_no || "-",
      packageType: "REPORT CIP", // supaya filter "Package" mengenali
      plant: x.plant || "Milk Filling Packing",
      line: (x.line || "").toUpperCase(),

      // Shift: gunakan field shift jika ada; bila kosong, turunkan dari timestamp (aturan 06-14/14-22/22-06)
      shift: x.shift ? `Shift ${x.shift}` : deriveShift(x.created_at || x.date),

      // Product = CIP type/kitchen yang dipilih user saat input
      product: labelCipProduct(x.cipType || x.cip_type || x.kitchen),

      // Machine: ambil dari properti yang ada (jika back-end kirim), jika tidak ada tampil "-"
      machine: x.machine || x.machine_name || "-",

      status: x.status || x.status_text || "-",

      approval_coor: x.approval_coor ?? 0,
      approval_spv: x.approval_spv ?? 0,
      approval_coor_by: x.approval_coor_by,
      approval_coor_at: x.approval_coor_at,
      approval_spv_by: x.approval_spv_by,
      approval_spv_at: x.approval_spv_at,
    }),
    []
  );

  /* Lifecycle */
  useEffect(() => {
    fetchDataFromAPI();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchDataFromAPI();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchUserData = async () => {
    try {
      const email = await AsyncStorage.getItem("user");
      const userData = await AsyncStorage.getItem("userData");
      if (userData != null) {
        const roleNum = parseInt(userData, 10);
        setUserRole(Number.isFinite(roleNum) ? roleNum : null);
      }
      try {
        const me = await greatApi.get("/users/me");
        const data = me?.data || {};
        if (data?.username) setUsername(data.username);
        if (data?.role?.name) setProfile(data.role.name);
      } catch (e) {
        // console.warn("getUser fallback warning:", e?.message || e);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem("userProfile");
      if (stored) setUserProfile(JSON.parse(stored));
    } catch (e) {
      console.error("Error loading user profile:", e);
    }
  };

  const handleApproval = async (reportId, action) => {
    Alert.alert(
      `${action === "approve" ? "Approve" : "Reject"} Report`,
      `Are you sure you want to ${action} this report?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await api.put(`/cip-report/${reportId}/${action}`, {
                roleId: userProfile?.role_id,
                userName: userProfile?.fullName || userProfile?.username,
              });
              Alert.alert("Success", `Report ${action}d successfully`);
              fetchData();
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Failed to update approval");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    (async () => {
      try { await fetchPlantOptions(); }
      catch (e) { console.warn("fetchPlantOptions:", e?.message || e); }

      try { await fetchPackageOptions(); }
      catch (e) { console.warn("fetchPackageOptions:", e?.message || e); }
    })();
  }, []);

  useEffect(() => {
    if (!lineOptions?.length && dataGreentag?.length) {
      const uniq = Array.from(
        new Set(
          dataGreentag.map((x) => (x?.line ? String(x.line).trim() : "")).filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
      if (uniq.length) setLineOptions(uniq);
    }
  }, [dataGreentag]);

  // ambil CIP ketika filter berubah / halaman fokus
  useEffect(() => {
    // hanya tarik bila user pilih "REPORT CIP" atau tidak memilih Package (biar gabungan jalan)
    const needCip = !selectedPackage || selectedPackage === "REPORT CIP";
    if (!needCip) {
      setCipRows([]);
      return;
    }

    (async () => {
      const list = await fetchCIPForFilters(); // fungsi ini sudah ada di file Anda
      setCipRows((list || []).map(mapCipToRow));
    })();
    // ikut re-fetch saat filter yang relevan berubah
  }, [selectedDate, selectedPlant, selectedLine, selectedShift, searchQuery, selectedPackage, mapCipToRow]);

  // istener focus untuk refresh data CILT dan CIP
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      // refresh data CILT dan CIP
      fetchDataFromAPI();
      if (!selectedPackage || selectedPackage === "REPORT CIP") {
        (async () => {
          const list = await fetchCIPForFilters();
          setCipRows((list || []).map(mapCipToRow));
        })();
      }
    });
    return unsub;
  }, [navigation, selectedPackage, mapCipToRow]);

  /* API CALLS */
  const fetchDataFromAPI = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/cilt/?status=0`);
      setDataGreentag(response.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlantOptions = async () => {
    try {
      const response = await api.get(`/mastercilt/plant`);
      setPlantOptions(response.data || []);
    } catch (error) {
      console.error("Error fetching plant data:", error);
    }
  };

  const fetchPackageOptions = async () => {
    try {
      const response = await api.get(`/package-master/package`);
      const fromApi = response.data || [];

      // Fallback/merge dari dataGreentag yang sudah ter-load
      const fromData = Array.from(
        new Set(
          (dataGreentag || [])
            .map((x) => (x?.packageType ? String(x.packageType).trim() : ""))
            .filter(Boolean)
        )
      ).map((pkg) => ({ package: pkg }));

      // gabungkan unik berdasar label
      const merged = [];
      const seen = new Set();
      [...fromApi, ...fromData].forEach((it) => {
        const key = (it.package || "").trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          merged.push({ package: key });
        }
      });

      // inject REPORT CIP option if not present
      const withCip = merged.some((p) => (p.package || "").trim() === "REPORT CIP")
        ? merged
        : [...merged, { package: "REPORT CIP" }];

      setPackageOptions(withCip);
    } catch (error) {
      console.error("Error fetching package data:", error);
      // minimal tetap isi dari dataGreentag kalau API gagal
      const fallback = Array.from(
        new Set(
          (dataGreentag || [])
            .map((x) => (x?.packageType ? String(x.packageType).trim() : ""))
            .filter(Boolean)
        )
      ).map((pkg) => ({ package: pkg }));
      setPackageOptions(fallback);
    }
  };

  const fetchAllLineOptions = async () => {
    const endpoints = ["/mastercilt/line/all", "/mastercilt/lines", "/mastercilt/all-line", "/mastercilt/line"];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDataFromAPI();
    setRefreshing(false);
  };

  const fetchCIPForFilters = async () => {
    try {
      if (selectedPackage && selectedPackage !== "REPORT CIP" && selectedPackage !== "CIP") {
        return [];
      }
      const params = {};
      if (selectedDate) params.date = moment(selectedDate).format("YYYY-MM-DD");
      if (selectedShift && selectedShift.trim() !== "") params.shift = selectedShift.trim();
      if (selectedPlant && selectedPlant.trim() !== "") params.plant = selectedPlant.trim();
      if (selectedLine && selectedLine.trim() !== "") params.line = selectedLine.trim();
      if (searchQuery && searchQuery.trim() !== "") params.q = searchQuery.trim();

      const possibleEndpoints = ["/cip-report", "/cip-report/list", "/cip", "/cip/list"];
      let cipData = [];
      for (const endpoint of possibleEndpoints) {
        try {
          const res = await api.get(endpoint, { params });
          if (res?.data) {
            cipData = Array.isArray(res.data) ? res.data : [];
            break;
          }
        } catch {
          // continue to next endpoint
        }
      }
      return cipData;
    } catch (error) {
      console.log("fetchCIPForFilters error:", error?.response?.data || error?.message);
      return [];
    }
  };

  /* Download & PDF */
  const handleDownloadByShift = async () => {
    if (!selectedShift) {
      Alert.alert("Error", "Silakan pilih shift terlebih dahulu untuk download data");
      return;
    }
    Alert.alert("Download Konfirmasi", `Apakah Anda ingin mendownload seluruh data untuk ${selectedShift}?`, [
      { text: "Batal", style: "cancel" },
      { text: "Download", onPress: () => { downloadShiftData().catch(e => console.warn("downloadShiftData failed:", e?.message || e)); } },
    ]);
  };

  const downloadShiftData = async () => {
    setIsDownloading(true);
    try {
      const shiftData = dataGreentag.filter((item) => {
        const matchesShift = selectedShift ? item.shift === selectedShift : true;
        const matchesSearch = item.processOrder.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDate = selectedDate
          ? item.packageType === "CHECKLIST CILT"
            ? moment(item.date).isSame(moment(selectedDate), "month")
            : moment(item.date).isSame(moment(selectedDate), "day")
          : true;
        const matchesPlant = selectedPlant ? item.plant === selectedPlant : true;
        const matchesLine = selectedLine ? item.line === selectedLine : true;
        const matchesPackage = selectedPackage ? item.packageType === selectedPackage : true;
        return matchesShift && matchesSearch && matchesDate && matchesPlant && matchesLine && matchesPackage;
      });

      const includeCIP = !selectedPackage || selectedPackage === "REPORT CIP" || selectedPackage === "CIP";
      const cipList = includeCIP ? await fetchCIPForFilters() : [];

      if (shiftData.length === 0 && cipList.length === 0) {
        Alert.alert("Info", "Tidak ada data untuk filter yang dipilih");
        return;
      }

      await generatePDFFile(selectedShift, shiftData, cipList);
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Gagal mendownload data: " + (error?.message || "Unknown error"));
    } finally {
      setIsDownloading(false);
    }
  };

  // Download berdasarkan filter apapun yang aktif (tanpa wajib pilih Shift)
  const handleDownloadFiltered = async () => {
    if (!filteredData || filteredData.length === 0) {
      Alert.alert("Info", "Tidak ada data sesuai filter saat ini.");
      return;
    }
    Alert.alert("Download Konfirmasi", `Download ${filteredData.length} item sesuai filter saat ini?`, [
      { text: "Batal", style: "cancel" },
      { text: "Download", onPress: () => { downloadFilteredData().catch(e => console.warn("downloadFilteredData failed:", e?.message || e)); } },
    ]);
  };

  const downloadFilteredData = async () => {
    setIsDownloading(true);
    try {
      // data utama sesuai filter aktif pada List (sudah dihitung oleh useMemo filteredData)
      const rawData = filteredData;

      const includeCIP = !selectedPackage || selectedPackage === "REPORT CIP" || selectedPackage === "CIP";
      const cipList = includeCIP && typeof fetchCIPForFilters === "function" ? await fetchCIPForFilters() : [];

      if ((rawData?.length ?? 0) === 0 && (cipList?.length ?? 0) === 0) {
        Alert.alert("Info", "Tidak ada data untuk filter yang dipilih.");
        return;
      }

      // Label judul - gunakan shift jika dipilih, kalau tidak pakai 'Filtered'
      const label = selectedShift || "Filtered";
      await generatePDFFile(label, rawData, cipList);
    } catch (err) {
      console.error("Download error:", err);
      Alert.alert("Error", "Gagal mendownload data: " + (err?.message || "Unknown error"));
    } finally {
      setIsDownloading(false);
    }
  };

  // Group by date
  const groupDataByDate = (data, cipList) => {
    const grouped = {};

    // Group CILT data by date
    data.forEach((item) => {
      const dateKey = moment(item.date).format("YYYY-MM-DD");
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          ciltData: [],
          cipData: [],
        };
      }
      grouped[dateKey].ciltData.push(item);
    });

    // Group CIP data by date
    cipList.forEach((cip) => {
      const dateKey = moment(cip.date).format("YYYY-MM-DD");
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          ciltData: [],
          cipData: [],
        };
      }
      grouped[dateKey].cipData.push(cip);
    });

    // Sort dates and return
    return Object.keys(grouped)
      .sort()
      .map((dateKey) => grouped[dateKey]);
  };

  const generatePDFFile = async (shift, rawData, cipList) => {
    // Get latest PERFORMA data only
    const performaItems = rawData.filter((x) => x.packageType === "PERFORMA RED AND GREEN");
    let latestPerforma = [];

    if (performaItems.length > 0) {
      const performaGroups = performaItems.reduce((groups, item) => {
        const key = `${item.processOrder}-${item.plant}-${item.line}-${item.machine}`;
        if (!groups[key] || moment(item.date).isAfter(moment(groups[key].date))) {
          groups[key] = item;
        }
        return groups;
      }, {});

      latestPerforma = Object.values(performaGroups);
    }

    // Non-PERFORMA data
    const otherData = rawData.filter((x) => x.packageType !== "PERFORMA RED AND GREEN");

    // Combine latest PERFORMA with other data
    let data = [...otherData, ...latestPerforma];

    // Satukan semua item CHECKLIST CILT menjadi SATU item per bulan
    data = mergeChecklistCILTMonthly(data);

    // Group per tanggal (CILT bulanan akan punya anchor di akhir bulan -> satu section)
    const groupedData = groupDataByDate(data, cipList || []);

    try {
      const htmlContent = await generateCombinedHTML(shift, groupedData);
      const monthPart = selectedMonth ? moment(`${selectedYear || moment().format("YYYY")}-${selectedMonth}-01`).format("MMM-YY") : "";
      const nameSuffix =
        selectedPackage === "CHECKLIST CILT" && (selectedMonth || selectedYear)
          ? `_CILT_${selectedPlant || "ALL"}_${selectedLine || "ALL"}_${monthPart || (selectedYear || "")}`
          : "";
      const pdfFileName = `Report${nameSuffix || "_CILTpro"}.pdf`;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const newUri = `${FileSystem.documentDirectory}${pdfFileName}`;
      await FileSystem.moveAsync({ from: uri, to: newUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: "application/pdf",
          dialogTitle: `Data ${shift}`,
        });
      }
      Alert.alert("Success", `Data ${shift} berhasil didownload sebagai PDF`);
    } catch (err) {
      console.warn(
        "PDF generation error:", err?.name, err?.code, err?.message || err
      );
      Alert.alert("Error", "Gagal membuat PDF: " + (err?.message || "Unknown error"));
    }
  };

  // Generate HTML with date grouping
  const generateCombinedHTML = async (shift, groupedData) => {
    const timestamp = moment().format("DD/MM/YYYY HH:mm:ss");
    const filterInfo = [];
    if (selectedDate) filterInfo.push(`Tanggal: ${moment(selectedDate).format("DD/MM/YYYY")}`);
    if (selectedPlant) filterInfo.push(`Plant: ${selectedPlant}`);
    if (selectedLine) filterInfo.push(`Line: ${selectedLine}`);
    if (selectedPackage) filterInfo.push(`Package: ${selectedPackage}`);
    if (searchQuery) filterInfo.push(`Search: ${searchQuery}`);

    const mainHeader = renderPDFHeader("SEGREGASI");

    // Process each date group
    const dateGroupSections = [];

    for (const group of groupedData) {
      const dateFormatted = moment(group.date).format("DD MMMM YYYY");

      // Add date header
      const dateHeader = `<div class="report-date">${dateFormatted}</div>`;

      const regularSections = [];
      const performaSections = [];

      // Sort data according to package priority for this date
      const packageOrder = [
        // ESL (FILLER + PACKER + ROBOT)
        "SEGREGASI",
        "PEMAKAIAN PAPER",
        "PEMAKAIAN SCREW CAP",
        "PENGECEKAN H2O2 ( SPRAY )",
        "PERFORMA RED AND GREEN",
        "CHECKLIST CILT",
        "LAPORAN ARTEMA & SMS CARDBOARD",
        "LAPORAN FRANS WP 25 CASE",
        "ROBOT PALLETIZER FILLER",
        "CILTGIGR",

        // UHT (FILLER)
        "A3 / FLEX ( PAGE 1 )",
        "PENGECEKAN PRESSURE",
        "START FINISH PRODUKSI",
        "START & FINISH",

        // LINE H
        "INFORMASI PRODUK",
        "LAPORAN PRODUKSI MESIN",
      ];

      const sortedData = group.ciltData.sort((a, b) => {
        const aOrder = packageOrder.indexOf(a.packageType);
        const bOrder = packageOrder.indexOf(b.packageType);
        const aIndex = aOrder === -1 ? 999 : aOrder;
        const bIndex = bOrder === -1 ? 999 : bOrder;
        return aIndex - bIndex;
      });

      // Process each item for this date
      for (const item of sortedData) {
        const orientation = getPackageOrientation(item.packageType);
        if (item.packageType === "PERFORMA RED AND GREEN") {
          const performaHtml = await htmlByPackage(item);
          performaSections.push(`<div class="pkg-section" data-orientation="${orientation}">${performaHtml}</div>`);
        } else {
          const itemHtml = await htmlByPackage(item);
          regularSections.push(`<div class="pkg-section" data-orientation="${orientation}">${itemHtml}</div>`);
        }
      }

      // Process CIP data for this date
      const cipSections = await Promise.all(group.cipData.map(async (c) => {
        const cipHtml = await htmlCIP(c);
        return `<div class="pkg-section" data-orientation="portrait">${cipHtml}</div>`;
      }));

      // Combine all sections for this date
      const allSectionsForDate = [...regularSections, ...performaSections, ...cipSections];
      const dateSections = allSectionsForDate.join("");

      if (dateSections.trim()) {
        const totalPackages = allSectionsForDate.length;
        const spacingClass = totalPackages === 1 ? "single-package-section" : "multiple-package-section";
        const wrappedSections = `<div class="${spacingClass}">${dateSections}</div>`;
        dateGroupSections.push(dateHeader + wrappedSections);
      }
    }

    const totalItems = groupedData.reduce((total, group) => total + group.ciltData.length + group.cipData.length, 0);

    return `
      <html>
        <head><meta charset="utf-8" />${updatedGlobalPdfCssWithAll}</head>
        <body>
          ${mainHeader}
          <div class="cover">
            <h2>Laporan CILT - ${esc(shift)}</h2>
            <div>Generated: ${timestamp} | Total Detail: ${totalItems}</div>
            ${filterInfo.length ? `<div>Filter: ${filterInfo.join(" | ")}</div>` : ""}
            <div><strong>Data dikelompokkan berdasarkan tanggal</strong></div>
          </div>
          ${dateGroupSections.join("")}
          <div class="footer">CILT/CIP Report - generated automatically</div>
        </body>
      </html>
    `;
  };

  /* List & Filter */
  // helper: deteksi package CILT (aman terhadap null / variasi kapital)
  const isChecklistCILT = (pkg) => String(pkg || "").toUpperCase().includes("CHECKLIST CILT");

  // cara menyiapkan baris untuk tabel
  const baseRows = dataGreentag; // baris paket-paket CILT existing (CHECKLIST CILT, SEGREGASI, dll.)
  let rowsForTable;

  if (selectedPackage === "REPORT CIP") {
    // user hanya ingin lihat CIP
    rowsForTable = cipRows;
  } else if (!selectedPackage || selectedPackage.trim() === "") {
    // tanpa filter package: gabungkan semua
    rowsForTable = [...baseRows, ...cipRows];
  } else {
    // filter package lain: tetap hanya dari baseRows
    rowsForTable = baseRows;
  }

  const filteredData = useMemo(() => {
    let baseFilter = rowsForTable.filter((item) => {
      const matchesSearch = item.processOrder?.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesDate = true;
      if (selectedDate) {
        if (item.packageType === "CHECKLIST CILT") {
          matchesDate = moment(item.date).isSame(moment(selectedDate), "month");
        } else {
          const itemDateUTC = moment.utc(item.date).format('YYYY-MM-DD');
          const selectedDateUTC = moment(selectedDate).format('YYYY-MM-DD');
          matchesDate = itemDateUTC === selectedDateUTC;
        }
      }
      const matchesPlant = selectedPlant ? item.plant === selectedPlant : true;
      const matchesLine = selectedLine ? item.line === selectedLine : true;
      const matchesPackage = selectedPackage ? item.packageType === selectedPackage : true;
      const matchesShift = selectedShift ? item.shift === selectedShift : true;
      const monthOk =
        selectedPackage === "CHECKLIST CILT"
          ? (selectedMonth ? moment(item.date).format("MM") === selectedMonth : true)
          : true;
      const yearOk =
        selectedPackage === "CHECKLIST CILT"
          ? (selectedYear ? moment(item.date).format("YYYY") === selectedYear : true)
          : true;
      return (
        matchesSearch &&
        matchesDate &&
        matchesPlant &&
        matchesLine &&
        matchesPackage &&
        matchesShift &&
        monthOk &&
        yearOk
      );
    });

    return baseFilter.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [
    rowsForTable,
    searchQuery,
    selectedDate,
    selectedPlant,
    selectedLine,
    selectedPackage,
    selectedShift,
    selectedMonth,
    selectedYear,
  ]);

  const getApprovalStatusBadge = (item) => {
    const isCIP = item.packageType === "REPORT CIP";

    if (isCIP) {
      // Untuk CIP: cek approval_coor dan approval_spv
      const coorApproved = item.approval_coor === 1;
      const spvApproved = item.approval_spv === 1;
      const coorRejected = item.approval_coor === 2;
      const spvRejected = item.approval_spv === 2;
      const status = item.status || item.approval_status;

      console.log(`CIP Badge Status for ID ${item.id}:`, {
        status,
        coorApproved,
        spvApproved,
        coorRejected,
        spvRejected,
        approval_coor: item.approval_coor,
        approval_spv: item.approval_spv
      });

      // Cek rejection dulu
      if (coorRejected || spvRejected) {
        return (
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}>
              <Icon name="cancel" size={14} color="#ef4444" />
              <Text style={[styles.badgeText, { color: '#7f1d1d' }]}>Rejected</Text>
            </View>
          </View>
        );
      }

      // Fully approved
      if (coorApproved && spvApproved) {
        return (
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: '#d1fae5', borderColor: '#10b981' }]}>
              <Icon name="check-circle" size={14} color="#10b981" />
              <Text style={[styles.badgeText, { color: '#065f46' }]}>Approved</Text>
            </View>
          </View>
        );
      }

      // Partial approval - Coor approved, waiting SPV
      if (coorApproved && !spvApproved) {
        return (
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: '#fffbeb', borderColor: '#f59e0b' }]}>
              <Icon name="hourglass-empty" size={14} color="#f59e0b" />
              <Text style={[styles.badgeText, { color: '#92400e' }]}>Coor ✓ • Waiting SPV</Text>
            </View>
          </View>
        );
      }

      // Partial approval - SPV approved, waiting Coor (unusual case)
      if (spvApproved && !coorApproved) {
        return (
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: '#e0f2fe', borderColor: '#0ea5e9' }]}>
              <Icon name="info" size={14} color="#0ea5e9" />
              <Text style={[styles.badgeText, { color: '#075985' }]}>SPV ✓ • Waiting Coor</Text>
            </View>
          </View>
        );
      }

      // Draft/In Progress
      if (status === "In Progress") {
        return (
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: '#e0f2fe', borderColor: '#0ea5e9' }]}>
              <Icon name="edit" size={14} color="#0ea5e9" />
              <Text style={[styles.badgeText, { color: '#075985' }]}>Draft</Text>
            </View>
          </View>
        );
      }

      // Complete but not reviewed
      if (status === "Complete") {
        return (
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: '#fffbeb', borderColor: '#f59e0b' }]}>
              <Icon name="pending" size={14} color="#f59e0b" />
              <Text style={[styles.badgeText, { color: '#92400e' }]}>Awaiting..</Text>
            </View>
          </View>
        );
      }

      // Default - belum ada status approval
      return (
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: '#f3f4f6', borderColor: '#9ca3af' }]}>
            <Icon name="remove-circle-outline" size={14} color="#6b7280" />
            <Text style={[styles.badgeText, { color: '#374151' }]}>Not Reviewed</Text>
          </View>
        </View>
      );
    }

    // CILT Items logic (hanya dieksekusi jika BUKAN CIP)
    const coorApproved = item.approval_coor === 1;
    const spvApproved = item.approval_spv === 1;
    const rejected =
      item.status === -1 || item.approval === -1 || item.approval_coor === -1 || item.approval_spv === -1;

    if (coorApproved && spvApproved) {
      return (
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: '#d1fae5', borderColor: '#10b981' }]}>
            <Icon name="check-circle" size={14} color="#10b981" />
            <Text style={[styles.badgeText, { color: '#065f46' }]}>Approved</Text>
          </View>
        </View>
      );
    }

    if (rejected) {
      return (
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}>
            <Icon name="cancel" size={14} color="#ef4444" />
            <Text style={[styles.badgeText, { color: '#7f1d1d' }]}>Rejected</Text>
          </View>
        </View>
      );
    }

    if (coorApproved && !spvApproved) {
      return (
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: '#fffbeb', borderColor: '#f59e0b' }]}>
            <Icon name="hourglass-empty" size={14} color="#f59e0b" />
            <Text style={[styles.badgeText, { color: '#92400e' }]}>Coor ✓ • Waiting SPV</Text>
          </View>
        </View>
      );
    }

    if (!coorApproved && spvApproved) {
      return (
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: '#e0f2fe', borderColor: '#0ea5e9' }]}>
            <Icon name="info" size={14} color="#0ea5e9" />
            <Text style={[styles.badgeText, { color: '#075985' }]}>SPV ✓ • Waiting Coor</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.statusBadgeContainer}>
        <View style={[styles.statusBadge, { backgroundColor: '#f3f4f6', borderColor: '#9ca3af' }]}>
          <Icon name="remove-circle-outline" size={14} color="#6b7280" />
          <Text style={[styles.badgeText, { color: '#374151' }]}>Not Reviewed</Text>
        </View>
      </View>
    );
  };

  const hasAnyFilter = useMemo(
    () => [searchQuery, selectedDate, selectedPlant, selectedLine, selectedPackage, selectedShift, selectedMonth, selectedYear].some(Boolean),
    [searchQuery, selectedDate, selectedPlant, selectedLine, selectedPackage, selectedShift, selectedMonth, selectedYear]
  );

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleApprove = async (item) => {
    const isCIP = item.packageType === "REPORT CIP";

    try {
      const roleRaw = await AsyncStorage.getItem("userData");
      const role = roleRaw ? parseInt(roleRaw, 10) : null;
      const username = await AsyncStorage.getItem("username");
      const roleLabel = role === 11 ? "Coordinator" : role === 9 ? "Supervisor" : "Unknown";

      console.log(`Approve initiated:`, {
        itemId: item.id,
        packageType: item.packageType,
        role,
        roleLabel,
        username
      });

      Alert.alert(
        "Konfirmasi Approval",
        `Approve item ini sebagai ${roleLabel}?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Approve",
            onPress: async () => {
              try {
                let endpoint, payload;

                if (isCIP) {
                  endpoint = `/cip-report/${item.id}/approve`;
                  payload = {
                    roleId: role,
                    userName: username || "Unknown User",
                  };
                  console.log(`Approving CIP report:`, { endpoint, payload });
                } else {
                  endpoint =
                    role === 11
                      ? `/cilt/approve-coordinator/${item.id}`
                      : `/cilt/approve-supervisor/${item.id}`;
                  payload = { username: username, role: role };
                  console.log(`Approving CILT item:`, { endpoint, payload });
                }

                const res = await api.put(endpoint, payload);
                console.log(`Approve response:`, res.data);

                const resData = res.data ?? res;
                if (res.status >= 400 || resData?.success === false) {
                  throw new Error(resData?.message || "Gagal approve");
                }

                // Refresh data
                await fetchDataFromAPI();
                if (isCIP && (!selectedPackage || selectedPackage === "REPORT CIP")) {
                  const list = await fetchCIPForFilters();
                  setCipRows((list || []).map(mapCipToRow));
                }

                Alert.alert("Sukses", `${isCIP ? 'CIP Report' : 'CILT Item'} berhasil di-approve`);
              } catch (err) {
                console.error(`Approve error:`, err);
                Alert.alert(
                  "Error",
                  err?.response?.data?.message || err?.message || "Gagal approve"
                );
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (e) {
      console.error(`handleApprove error:`, e);
      Alert.alert("Error", e?.message || "Gagal approve");
    }
  };

  const renderApproveButton = (item) => {
    const isCIP = item.packageType === "REPORT CIP";

    // console.log(`Render Approve Button for ID ${item.id}:`, {
    //   packageType: item.packageType,
    //   isCIP,
    //   userRole,
    //   status: item.status,
    //   approval_coor: item.approval_coor,
    //   approval_spv: item.approval_spv
    // });

    if (isCIP) {
      const status = item.status || item.approval_status;
      const coorApproved = item.approval_coor === 1;
      const spvApproved = item.approval_spv === 1;
      const coorRejected = item.approval_coor === 2;
      const spvRejected = item.approval_spv === 2;

      // Jangan tampilkan button jika sudah rejected
      if (coorRejected || spvRejected) {
        console.log(`  → Hidden: Already rejected`);
        return null;
      }

      // Jangan tampilkan button jika sudah fully approved
      if (coorApproved && spvApproved) {
        console.log(`  → Hidden: Fully approved`);
        return null;
      }

      // Status harus "Complete" untuk bisa di-approve
      if (status !== "Complete") {
        console.log(`  → Hidden: Status not Complete (${status})`);
        return null;
      }

      // SPV (role 9) - bisa approve jika Coor sudah approve
      if (userRole === 9 && coorApproved && !spvApproved) {
        console.log(`  → SHOW: SPV can approve`);
        return (
          <TouchableOpacity
            style={[styles.approveBtn, { marginTop: 4 }]}
            onPress={() => handleApprove(item)}
          >
            <Icon name="check-circle" size={16} color="#fff" />
            <Text style={[styles.approveBtnText, { marginLeft: 4 }]}>Approve (SPV)</Text>
          </TouchableOpacity>
        );
      }

      // Coordinator (role 11) - bisa approve jika belum di-approve sama sekali
      if (userRole === 11 && !coorApproved) {
        console.log(`  → SHOW: Coor can approve`);
        return (
          <TouchableOpacity
            style={[styles.approveBtn, { marginTop: 4 }]}
            onPress={() => handleApprove(item)}
          >
            <Icon name="check-circle" size={16} color="#fff" />
            <Text style={[styles.approveBtnText, { marginLeft: 4 }]}>Approve (Coor)</Text>
          </TouchableOpacity>
        );
      }

      console.log(`  → Hidden: No approval permission`);
      return null;
    }

    // CILT approval logic
    if (userRole === 11 && item.approval_coor === 0 && item.status === 0) {
      return (
        <TouchableOpacity style={[styles.approveBtn, { marginTop: 4 }]} onPress={() => handleApprove(item)}>
          <Icon name="check-circle" size={16} color="#fff" />
          <Text style={[styles.approveBtnText, { marginLeft: 4 }]}>Approve (Coor)</Text>
        </TouchableOpacity>
      );
    }
    if (userRole === 9 && item.approval_coor === 1 && item.approval_spv === 0 && item.status === 0) {
      return (
        <TouchableOpacity style={[styles.approveBtn, { marginTop: 4 }]} onPress={() => handleApprove(item)}>
          <Icon name="check-circle" size={16} color="#fff" />
          <Text style={[styles.approveBtnText, { marginLeft: 4 }]}>Approve (SPV)</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const handleDetailPress = (item) => {
    const packageType = item.packageType;
    const config = PACKAGE_CONFIG[packageType] || DEFAULT_PACKAGE_CONFIG;

    if (config.useIdParam) {
      // Special case for CIP
      navigation.navigate(config.screen, { cipReportId: Number(item.id) });
    } else {
      navigation.navigate(config.screen, { item });
    }
  };

  const sortData = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setDataGreentag(
      [...dataGreentag].sort((a, b) => {
        if (a[key] < b[key]) return direction === "ascending" ? -1 : 1;
        if (a[key] > b[key]) return direction === "ascending" ? 1 : -1;
        return 0;
      })
    );
  };

  const TableHeader = () => (
    <View className="tableHeader" style={styles.tableHeader}>
      {["Date", "Process Order", "Package", "Plant", "Line", "Shift", "Product", "Machine", "Approval"].map((col, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => sortData(["date", "processOrder", "packageType", "plant", "line", "shift", "product", "machine"][i])}
          style={styles.tableHeaderCell}
        >
          <Text style={styles.tableHeaderText}>{col}</Text>
          <Icon name="arrow-drop-down" size={24} color={COLORS.blue} />
        </TouchableOpacity>
      ))}
    </View>
  );

  // Updated rendering logic to show latest PERFORMA only
  const seenPerformaItems = new Set();
  const countOccurrences = {};
  paginatedData.forEach((item) => {
    const key = `${item.processOrder}-${item.packageType}-${item.product}`;
    countOccurrences[key] = (countOccurrences[key] || 0) + 1;
  });

  const renderItem = (item) => {
    const key = `${item.processOrder}-${item.packageType}-${item.product}`;
    const isCIP = item.packageType === "REPORT CIP";

    // For PERFORMA, only show the latest one
    if (item.packageType === "PERFORMA RED AND GREEN") {
      if (seenPerformaItems.has(key)) return null;
      seenPerformaItems.add(key);
    }

    // Check if approval button should be shown
    const shouldShowApproveButton = (() => {
      if (isCIP) {
        const status = item.status || item.approval_status;
        if (status === "Complete" && (userRole === 11 || userRole === 9)) {
          return true;
        }
      } else {
        if (userRole === 11 && item.approval_coor === 0 && item.status === 0) {
          return true;
        }
        if (userRole === 9 && item.approval_coor === 1 && item.approval_spv === 0 && item.status === 0) {
          return true;
        }
      }
      return false;
    })();

    return (
      <TouchableOpacity key={item.id} onPress={() => handleDetailPress(item)}>
        <View style={[
          styles.tableRow,
          isCIP && styles.tableRowCIP,
          shouldShowApproveButton && styles.tableRowWithAction
        ]}>
          <Text style={styles.tableCell}>
            {item.packageType === "REPORT CIP"
              ? moment(item.date).format("DD/MM/YY")
              : moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}
          </Text>
          <View style={styles.tableCellWithBadge}>
            <Text style={styles.tableCell} numberOfLines={2}>{item.processOrder}</Text>
            {isCIP && (
              <View style={styles.cipBadgeSmall}>
                <Text style={styles.cipBadgeText}>CIP</Text>
              </View>
            )}
          </View>
          <Text style={styles.tableCell}>
            {item.packageType} {item.packageType === "PERFORMA RED AND GREEN" ? "(Latest)" : ""}
          </Text>
          <Text style={styles.tableCell}>{item.plant}</Text>
          <Text style={styles.tableCell}>{item.line}</Text>
          <Text style={styles.tableCell}>{item.shift}</Text>
          <Text style={styles.tableCell}>{item.product}</Text>
          <Text style={styles.tableCell}>{item.machine}</Text>
          <View style={styles.approvalCell}>
            {getApprovalStatusBadge(item)}
            {renderApproveButton(item)}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Searchbar placeholder="Search by Process Order" onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Searchbar placeholder="Search by Process Order" onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />
      <Text style={styles.title}>List CILT</Text>

      {/* Filter Bar */}
      <View className="row" style={styles.row}>
        {/* Date */}
        <View style={styles.halfInputGroup}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dropdownContainer}>
            <Text style={{ marginLeft: 5 }}>{selectedDate ? moment(selectedDate).format("DD/MM/YYYY") : "Date"}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
            />
          )}
          {selectedDate && (
            <TouchableOpacity style={{ marginTop: 4 }} onPress={() => setSelectedDate(null)}>
              <Text style={{ color: COLORS.red }}>Reset Date</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Plant */}
        <View style={styles.halfInputGroup}>
          <View style={styles.dropdownContainer}>
            <Picker selectedValue={selectedPlant} style={styles.dropdown} onValueChange={setSelectedPlant}>
              <Picker.Item label="Plant" value="" />
              {plantOptions.map((option, index) => (
                <Picker.Item key={index} label={option.plant} value={option.plant} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Line */}
        <View style={styles.halfInputGroup}>
          <View style={styles.dropdownContainer}>
            <Picker selectedValue={selectedLine} style={styles.dropdown} onValueChange={setSelectedLine}>
              <Picker.Item label="Line" value="" />
              {lineOptions.map((val, index) => (
                <Picker.Item key={index} label={val} value={val} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Package */}
        <View style={styles.halfInputGroup}>
          <View style={styles.dropdownContainer}>
            <Picker selectedValue={selectedPackage} style={styles.dropdown} onValueChange={setSelectedPackage}>
              <Picker.Item label="Package" value="" />
              {packageOptions.map((option, index) => (
                <Picker.Item key={index} label={option.package} value={option.package} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Bulan & Tahun khusus Checklist CILT */}
        {selectedPackage === "CHECKLIST CILT" && (
          <>
            {/* Bulan */}
            <View style={styles.halfInputGroup}>
              <View style={styles.dropdownContainer}>
                <Picker selectedValue={selectedMonth} onValueChange={setSelectedMonth} style={styles.dropdown}>
                  <Picker.Item label="All Months" value="" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Picker.Item key={i} label={moment().month(i).format("MMM")} value={String(i + 1).padStart(2, "0")} />
                  ))}
                </Picker>
              </View>
            </View>
            {/* Tahun */}
            <View style={styles.halfInputGroup}>
              <View style={styles.dropdownContainer}>
                <Picker selectedValue={selectedYear} onValueChange={setSelectedYear} style={styles.dropdown}>
                  <Picker.Item label="All Years" value="" />
                  {yearOptions.map((y) => (
                    <Picker.Item key={y} label={y} value={y} />
                  ))}
                </Picker>
              </View>
            </View>
          </>
        )}

        {/* Shift */}
        <View style={styles.halfInputGroup}>
          <View style={styles.dropdownContainer}>
            <Picker selectedValue={selectedShift} style={styles.dropdown} onValueChange={setSelectedShift}>
              <Picker.Item label="Shift" value="" />
              {shiftOptions.map((option, index) => (
                <Picker.Item key={index} label={option} value={option} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Download Section */}
      <View style={styles.downloadSection}>
        <View style={styles.downloadInfo}>
          <Text style={styles.downloadInfoText}>
            {hasAnyFilter ? `Data ditampilkan: ${filteredData.length} item` : "Pilih minimal satu filter untuk mengaktifkan download"}
          </Text>
        </View>
        {/* Notifikasi kecil di UI jika package = CHECKLIST CILT dan tanggal dipilih */}
        {selectedDate && selectedPackage === "CHECKLIST CILT" && (
          <Text style={{ textAlign: "center", fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Catatan: Saat package = CHECKLIST CILT, tombol Download akan mengambil data untuk 1 bulan penuh.
          </Text>
        )}
        <TouchableOpacity
          style={[styles.downloadButton, (isDownloading || !hasAnyFilter || filteredData.length === 0) && styles.downloadButtonDisabled]}
          onPress={handleDownloadFiltered}
          disabled={isDownloading || !hasAnyFilter || filteredData.length === 0}
        >
          <Icon name={isDownloading ? "hourglass-empty" : "picture-as-pdf"} size={20} color="#fff" style={styles.downloadIcon} />
          <Text style={styles.downloadButtonText}>{isDownloading ? "Generating PDF..." : "Download Data PDF"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.content}>
          <View style={styles.roleIndicator}>
            <Icon
              name={userRole === 11 ? "admin-panel-settings" : userRole === 9 ? "supervisor-account" : "person"}
              size={16}
              color="#fff"
            />
            <Text style={styles.roleText}>
              {userRole === 11 ? "Coordinator" : userRole === 9 ? "Supervisor" : "User"}
            </Text>
          </View>
          <TableHeader />
          {paginatedData.map(renderItem)}
          <View style={styles.paginationContainer}>
            <Button title="Previous" onPress={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
            <Text style={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </Text>
            <Button title="Next" onPress={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ======
 * Styles 
 * ====== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginVertical: 8, alignSelf: "center", color: COLORS.blue },
  content: { padding: 10 },
  searchBar: { marginVertical: 10, marginHorizontal: 5 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.blue,
    paddingBottom: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.blue,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 4,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  tableRowWithAction: {
    paddingVertical: 16,
    minHeight: 70,
  },
  tableRowCIP: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    paddingHorizontal: 2,
  },
  approvalCell: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  approveButtonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  tableCellWithBadge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cipBadgeSmall: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  cipBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  paginationContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  pageInfo: { fontSize: 16 },
  row: { flexDirection: "row", marginHorizontal: 10, gap: 10 },
  halfInputGroup: { width: "19%", marginVertical: 4 },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 5,
    height: 40,
    paddingHorizontal: 5,
    backgroundColor: "#ffffff",
  },
  dropdown: { flex: 1, marginLeft: 5 },
  downloadSection: {
    marginHorizontal: 10,
    marginVertical: 10,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.blue,
  },
  downloadInfo: { marginBottom: 10 },
  downloadInfoText: { fontSize: 14, color: "#666", textAlign: "center" },
  downloadButton: {
    flexDirection: "row",
    backgroundColor: "#dc3545",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  downloadButtonDisabled: { backgroundColor: "#aaa", elevation: 0 },
  downloadIcon: { marginRight: 8 },
  downloadButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  badgeApproved: { backgroundColor: "#E8FFF5", color: "#065f46" },
  badgeWaiting: { backgroundColor: "#FFF7E6", color: "#92400e" },
  badgeNeutral: { backgroundColor: "#F3F4F6", color: "#374151" },
  approveBtn: {
    backgroundColor: "#10b981",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    minWidth: 80,
    maxWidth: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  approveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 10,
  },
  statusBadgeContainer: { alignItems: "center", justifyContent: "center", width: '100%', },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: '100%',
  },
  badgeText: { marginLeft: 3, fontSize: 7.3, fontWeight: "700" },
});

export default ListCILT;
