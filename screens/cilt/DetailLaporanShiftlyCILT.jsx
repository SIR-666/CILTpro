import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment-timezone";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
  InteractionManager,
  Animated,
} from "react-native";
import { COLORS } from "../../constants/theme";
import { api } from "../../utils/axiosInstance";
import { useFocusEffect } from "@react-navigation/native";

const DetailLaporanShiftly = ({ route, navigation }) => {
  const { item } = route.params;
  const [data, setData] = useState([]);
  const [uniqueData, setUniqueData] = useState([]);
  const [shiftHours, setShiftHours] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ==== FAST BACK ====
  const leavingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (modalVisible) {
          setModalVisible(false);
          return true;
        }
        leavingRef.current = true;
        navigation.goBack();
        return true;
      });
      return () => sub.remove();
    }, [modalVisible, navigation])
  );

  // tinggi baris "Actual Time" agar kiri-kanan sama
  const [actualTimeHeight, setActualTimeHeight] = useState(50);

  // Kunci "Actual Time" per record
  const [actualLocks, setActualLocks] = useState({}); // recordKey -> hour
  const [locksReady, setLocksReady] = useState(false);

  // Refs
  const hBodyRef = useRef(null); // body horizontal (kanan)
  const verticalScrollRef = useRef(null);

  // ---- Tinggi baris (ukur kiri saja, kanan mengikuti) ----
  const [leftHeights, setLeftHeights] = useState({});
  const lhRef = useRef({});
  const rafRef = useRef(null);

  const flushHeights = () => {
    rafRef.current = null;
    setLeftHeights(prev => {
      if (!Object.keys(lhRef.current).length) return prev;
      const next = { ...prev, ...lhRef.current };
      lhRef.current = {};
      return next;
    });
  };
  const queueFlush = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(flushHeights);
  };
  const setLH = (i, h) => {
    const v = Math.round(h);
    if (leavingRef.current || leftHeights[i] === v) return;
    lhRef.current[i] = v;
    queueFlush();
  };
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);
  const rowHeight = (i) => Math.max(50, leftHeights[i] || 0);

  const { width } = Dimensions.get("window");
  const modalImageSize = width * 0.8;

  const pad2 = (n) => String(n).padStart(2, "0");
  const rowKey = (row, index) => `${row?.id ?? row?.activity ?? "row"}|${index}`;

  // SCROLL TANPA DELAY: header kanan ikut body via Animated translateX
  const scrollX = useRef(new Animated.Value(0)).current;
  const CELL_WIDTHS = {
    no: 40,
    activity: 200,
    status: 50,
    hour: 60,
    fixedTotal: 390, // no + activity + 3 status cells
  };
  const hoursWidth = useMemo(
    () => (Array.isArray(shiftHours) ? shiftHours.length : 0) * CELL_WIDTHS.hour,
    [shiftHours]
  );

  const getShiftHours = (shift) => {
    if (shift === "Shift 1") return [6, 7, 8, 9, 10, 11, 12, 13, 14];
    if (shift === "Shift 2") return [14, 15, 16, 17, 18, 19, 20, 21, 22];
    if (shift === "Shift 3") return [22, 23, 0, 1, 2, 3, 4, 5, 6];
    return [];
  };

  // cache timestamp submit (ms) supaya tidak parsing moment berulang
  const getSubmitMs = (rec) => {
    const raw = rec?.submitTime || rec?.submit_time || rec?.createdAt || rec?.created_at;
    const m = parseWIBNaive(raw);
    return m?.isValid?.() ? m.valueOf() : null;
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const formattedDate = (item?.date ? String(item.date) : "")
        .split("T")[0] || moment().format("YYYY-MM-DD");

      const controller = new AbortController();
      fetchData.controller = controller;
      const { data: result, status } = await api.get(
        `/cilt/reportCILTAll/PERFORMA RED AND GREEN/${encodeURIComponent(
          item.plant
        )}/${encodeURIComponent(item.line)}/${encodeURIComponent(
          item.shift
        )}/${encodeURIComponent(item.machine)}/${formattedDate}`,
        { signal: controller.signal }
      );
      if (status !== 200) throw new Error(`HTTP Error: ${status}`);

      setShiftHours(getShiftHours(item.shift));

      if (Array.isArray(result) && result.length > 0) {
        const enriched = result.map(r => ({ ...r, __ts: getSubmitMs(r) }));
        setData(enriched);
        setUniqueData(extractUniqueInspectionData(enriched));
      } else {
        setData([]);
        setUniqueData([]);
      }
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
      } else {
        console.error("Error fetching data:", error);
        setData([]);
        setUniqueData([]);
        setShiftHours(getShiftHours(item.shift));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const normSlot = (s) => {
    // normalisasi "timeSlot" -> "HH:MM - HH:MM"
    const m = String(s ?? "").match(/(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/);
    if (!m) return undefined;
    const h1 = String(parseInt(m[1], 10)).padStart(2, "0");
    const m1 = m[2];
    const h2 = String(parseInt(m[3], 10)).padStart(2, "0");
    const m2 = m[4];
    return `${h1}:${m1} - ${h2}:${m2}`;
  };

  const isNonEmpty = (v) =>
    v !== undefined &&
    v !== null &&
    String(v).trim() !== "" &&
    String(v).trim() !== "-";

  // Ekstraksi & merge semua snapshot CombinedInspectionData (tahan newline, dukung 30 menit)
  const extractUniqueInspectionData = (records) => {
    const uniqueActivities = {};
    const safe = Array.isArray(records) ? [...records] : [];

    try {
      safe.sort((a, b) => (a?.__ts ?? 0) - (b?.__ts ?? 0));
    } catch {}

    for (const record of safe) {
      try {
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
                results: {},    // per jam
                results30: {},  // per 30 menit
                picture: {},    // foto per jam
              };
            }

            // simpan per JAM jika ada nilai
            {
              const selectedH =
                selectedHourFromInspection(inspection) ??
                selectedHourFromRecord(record);
              if (selectedH !== undefined && isNonEmpty(inspection.results)) {
                uniqueActivities[key].results[selectedH] = String(inspection.results);
                if (inspection.picture) {
                  uniqueActivities[key].picture[selectedH] = inspection.picture;
                }
              }
            }

            // simpan per 30 MENIT
            if (
              inspection.periode &&
              String(inspection.periode).toLowerCase().includes("30")
            ) {
              const sKey = normSlot(inspection.timeSlot);
              if (sKey && isNonEmpty(inspection.results)) {
                uniqueActivities[key].results30[sKey] = String(inspection.results);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error parsing CombinedInspectionData:", e);
      }
    }

    return Object.values(uniqueActivities);
  };

  // --- Scope kunci per halaman/PO ---
  const scopeKey = useMemo(() => {
    const d = (item?.date || "").split("T")[0];
    return `cilt_actual_locks:${item?.processOrder}|${d}|${item?.shift}|${item?.line}|${item?.machine}`;
  }, [item]);

  // Load kunci saat mount / scope berubah
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(scopeKey);
        if (!cancelled) {
          setActualLocks(raw ? JSON.parse(raw) : {});
          setLocksReady(true);
        }
      } catch {
        if (!cancelled) {
          setActualLocks({});
          setLocksReady(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [scopeKey]);

  // Simpan kunci dengan debounce, dan skip saat sedang back
  const locksSaveTimerRef = useRef(null);
  useEffect(() => {
    if (!locksReady || leavingRef.current) return;
    if (locksSaveTimerRef.current) clearTimeout(locksSaveTimerRef.current);
    locksSaveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(scopeKey, JSON.stringify(actualLocks)).catch(() => {});
    }, 300);
    return () => {
      if (locksSaveTimerRef.current) clearTimeout(locksSaveTimerRef.current);
    };
  }, [actualLocks, locksReady, scopeKey]);

  // Key stabil untuk setiap record
  const recordKey = (rec) => {
    return String(
      rec?.id ??
      rec?.ID ??
      rec?.recordId ??
      rec?.RecordID ??
      rec?.InputID ??
      rec?.input_id ??
      rec?.cilt_id ??
      `${rec?.submitBy || rec?.createdBy || rec?.user || "unknown"}|${rec?.submitTime || rec?.createdAt || "ts"}`
    );
  };

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchData();
    });
    return () => {
      task.cancel?.();
      try { fetchData.controller?.abort?.(); } catch {}
    };
  }, [item]);

  // Setelah data di-load, tetapkan kunci yang belum ada
  useEffect(() => {
    if (!locksReady) return;
    if (!Array.isArray(data) || data.length === 0) return;
    let changed = false;
    const next = { ...actualLocks };
    for (const rec of data) {
      const k = recordKey(rec);
      if (next[k] == null) {
        const h = intendedHourForRecord(rec);
        if (h != null) { next[k] = h; changed = true; }
      }
    }
    if (changed) setActualLocks(next);
  }, [data, locksReady]);

  const handlePress = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const evaluateValue = (inputValue, goodCriteria, rejectCriteria) => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) return "default";

    const parseRange = (s) => {
      if (!s || s === "-") return null;
      const m = String(s).match(/^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/);
      return m ? { type: "range", min: parseFloat(m[1]), max: parseFloat(m[2]) } : null;
    };

    const parseReject = (s) => {
      if (!s || s === "-") return null;
      return String(s)
        .split("/")
        .map((t) => t.trim())
        .map((t) => {
          const m = t.match(/^(<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/);
          return m ? { operator: m[1], value: parseFloat(m[2]) } : null;
        })
        .filter(Boolean);
    };

    const goodRange = parseRange(goodCriteria);
    const rejectConditions = parseReject(rejectCriteria);

    if (rejectConditions) {
      for (const cond of rejectConditions) {
        if (cond.operator === "<" && numValue < cond.value) return "reject";
        if (cond.operator === ">" && numValue > cond.value) return "reject";
        if (cond.operator === ">=" && numValue >= cond.value) return "reject";
        if (cond.operator === "<=" && numValue <= cond.value) return "reject";
      }
    }

    if (goodRange) {
      if (numValue >= goodRange.min && numValue <= goodRange.max) return "good";
    }

    return "need";
  };

  const getResultColor = (result, good, reject) => {
    if (["G", "N", "R"].includes(result)) {
      if (result === "G") return "#d4edda";
      if (result === "N") return "#fff3cd";
      if (result === "R") return "#f8d7da";
    }
    const evalResult = evaluateValue(result, good, reject);
    if (evalResult === "good") return "#d4edda";
    if (evalResult === "need") return "#fff3cd";
    if (evalResult === "reject") return "#f8d7da";
    return "#f8f9fa";
  };

  const shouldShowSeparator = (index) => {
    const separatorIndices = [13, 20, 39];
    return separatorIndices.includes(index);
  };

  const _stripTZ = (s) => String(s ?? "").replace(/([Zz]|[+-]\d{2}:?\d{2})$/, "");
  const parseWIBNaive = (ts) => {
    if (ts == null) return moment.invalid();
    if (typeof ts === "number") return moment(ts).tz("Asia/Jakarta");
    const raw = _stripTZ(ts);
    const m = raw.match(/(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const [, d, HH, MM, SS = "00"] = m;
      return moment.tz(`${d} ${HH}:${MM}:${SS}`, "YYYY-MM-DD HH:mm:ss", "Asia/Jakarta");
    }
    return moment.tz(raw, "Asia/Jakarta");
  };
  const hourFromHourGroup = (hg) => {
    const m = String(hg ?? "").match(/\d{1,2}/);
    return m ? parseInt(m[0], 10) : null;
  };
  const _parseHourLoose = (s) => {
    const m = String(s ?? "").match(/\b(\d{1,2})(?::\d{2})?\b/);
    if (!m) return undefined;
    const h = Number(m[1]);
    return Number.isFinite(h) ? h : undefined;
  };
  const selectedHourFromInspection = (ins) => {
    const candidates = [
      ins?.hourSlot, ins?.hour_slot,
      ins?.timeSlot, ins?.time_slot,
      ins?.hour, ins?.selectedHour, ins?.hourSelected
    ];
    for (const c of candidates) {
      const h = _parseHourLoose(c);
      if (h !== undefined) return h;
    }
    return undefined;
  };
  const selectedHourFromRecord = (rec) => {
    const g =
      rec?.HourGroup ??
      rec?.hourGroup ??
      rec?.hour_slot ??
      rec?.hourSlot ??
      rec?.timeSlot ??
      rec?.selectedHour ??
      rec?.hour;
    const rg = String(g ?? "");
    const mRange = rg.match(/(\d{1,2})(?::\d{2})?\s*[-–]\s*(\d{1,2})/);
    if (mRange) return Number(mRange[1]);
    return _parseHourLoose(rg);
  };
  const hourFromSubmitTime = (rec) => {
    const t = rec?.__ts;
    if (t == null) return undefined;
    const H = moment.tz(t, "Asia/Jakarta").hour();
    const hours = (Array.isArray(shiftHours) && shiftHours.length > 0)
      ? shiftHours
      : getShiftHours(item.shift);
    return hours.includes(H) ? H : undefined;
  };

  // Urutan prioritas: item inspection -> submitTime -> header record
  const intendedHourForRecord = (rec) => {
    const inspections = parseCombinedInspections(rec);
    for (let i = inspections.length - 1; i >= 0; i--) {
      const h = selectedHourFromInspection(inspections[i]);
      if (h !== undefined) return h;
    }
    const h3 = hourFromSubmitTime(rec);
    if (h3 !== undefined) return h3;
    const h2 = selectedHourFromRecord(rec);
    if (h2 !== undefined) return h2;
    return undefined;
  };

  const parseCombinedInspections = (rec) => {
    const chunks = String(rec?.CombinedInspectionData || "").match(/\[[\s\S]*?\]/g) || [];
    const out = [];
    for (const txt of chunks) {
      try {
        const arr = JSON.parse(txt);
        if (Array.isArray(arr)) out.push(...arr);
      } catch {}
    }
    return out;
  };

  // --- Pemetaan chip "Actual Time" berdasarkan kunci yang sudah tersimpan ---
  const actualTimeMap = useMemo(() => {
    const map = new Map();
    if (!locksReady) return map;
    for (const rec of data) {
      const k = recordKey(rec);
      const h = actualLocks[k]; // gunakan jam terkunci
      if (h == null) continue;
      if (!map.has(h)) map.set(h, []);
      map.get(h).push(rec);
    }
    for (const entry of map) {
      const arr = entry[1];
      arr.sort((a, b) => (a.__ts ?? 0) - (b.__ts ?? 0));
    }
    return map;
  }, [data, actualLocks, locksReady]);

  // === Half-hour helper (untuk PDF) ===
  const getHalfHourSlots = (hours) =>
    hours.flatMap((h) => {
      const HH = String(h).padStart(2, "0");
      return [{ hour: HH, mm: "00" }, { hour: HH, mm: "30" }];
    });

  const getResultAtHalfHour = (
    itemRow,
    hour,
    mm,
    { duplicateHourlyToBoth = true } = {}
  ) => {
    const h = String(hour).padStart(2, "0");
    const nextH = String((hour + 1) % 24).padStart(2, "0");
    const slot = mm === "00" ? `${h}:00 - ${h}:30` : `${h}:30 - ${nextH}:00`;

    if (itemRow?.results30 && itemRow.results30[slot] !== undefined) {
      return itemRow.results30[slot];
    }

    const r = itemRow?.results?.[h] ?? itemRow?.results?.[Number(h)];
    if (r === undefined || r === null || String(r).trim() === "") return "";

    if (typeof r === "object") {
      return r?.[mm] ?? "";
    }
    return duplicateHourlyToBoth ? r : mm === "00" ? r : "";
  };

  const getHalfHourBg = (raw, good, reject) => {
    const evalResult = evaluateValue(raw, good, reject);
    if (evalResult === "good") return "#d4edda";
    if (evalResult === "need") return "#fff3cd";
    if (evalResult === "reject") return "#f8d7da";
    return "#ffffff";
  };

  const printToFile = async () => {
    const formattedData = `
        <p><strong>Process Order:</strong> ${item.processOrder}</p>
        <table class="general-info-table">
          <tr>
            <td><strong>Date:</strong> ${moment(
              item.date,
              "YYYY-MM-DD HH:mm:ss.SSS"
            ).format("DD/MM/YY HH:mm:ss")}</td>
            <td><strong>Product:</strong> ${item.product}</td>
          </tr>
          <tr>
            <td><strong>Plant:</strong> ${item.plant}</td>
            <td><strong>Line:</strong> ${item.line}</td>
          </tr>
          <tr>
            <td><strong>Machine:</strong> ${item.machine}</td>
            <td><strong>Shift:</strong> ${item.shift}</td>
          </tr>
          <tr>
            <td><strong>Package:</strong> ${item.packageType}</td>
            <td><strong>Group:</strong>  </td>
          </tr>
        </table>
      `;

    const halfHourSlots = getHalfHourSlots(shiftHours);

    const actualByHour = {};
    for (const rec of data) {
      const k = recordKey(rec);
      const h = actualLocks[k];
      if (h == null) continue;
      (actualByHour[h] ||= []).push(rec);
    }
    for (const k of Object.keys(actualByHour)) {
      actualByHour[+k].sort((a, b) => (a.__ts ?? 0) - (b.__ts ?? 0));
    }

    const actualTimeRow = `
      <tr>
        <td colspan="5" style="font-weight: bold; text-align: center;">Actual Time</td>
        ${halfHourSlots
          .map(({ hour, mm }) => {
            const hNum = parseInt(hour, 10);
            if (mm === "30") {
              return `<td style="text-align:center; font-weight:bold; background:#f8f9fa">-</td>`;
            }
            const related = actualByHour[hNum] || [];
            if (!related.length) {
              return `<td style="text-align:center; font-weight:bold; background:#f8f9fa">-</td>`;
            }
            const chips = related
              .map((rec) => {
                const s = moment.tz(rec.__ts, "Asia/Jakarta");
                const late = Math.abs(s.hour() - hNum) >= 1;
                const bg = late ? "#ffebee" : "#e8f5e9";
                const color = late ? "#d32f2f" : "#2e7d32";
                return `<div style="background:${bg};color:${color};font-weight:bold;padding:2px 4px;margin:2px;border-radius:3px;display:inline-block;">${s.format(
                  "HH:mm"
                )}</div>`;
              })
              .join("");
            return `<td style="text-align:center; background:#f8f9fa">${chips}</td>`;
          })
          .join("")}
      </tr>
    `;

    const inspectionRows = uniqueData
      .map((row, index) => {
        return `
      <tr>
        <td class="col-no">${index + 1}</td>
        <td class="col-activity">${row.activity}</td>
        <td class="col-good">${row.good ?? "-"}</td>
        <td class="col-need">${row.need ?? "-"}</td>
        <td class="col-red">${row.reject ?? "-"}</td>
        ${getHalfHourSlots(shiftHours)
          .map(({ hour, mm }) => {
            const rawValue = getResultAtHalfHour(row, +hour, mm, {
              duplicateHourlyToBoth: true,
            });
            const bg = getHalfHourBg(rawValue, row.good, row.reject);
            return `<td class="col-shift" style="background-color:${bg}; font-weight:bold; text-align:center;">${rawValue || ""
              }</td>`;
          })
          .join("")}
      </tr>
    `;
      })
      .join("");

    const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; font-size: 14px; margin: 20px; }
              h2 { text-align: center; }
              .report-info { text-align: left; margin-bottom: 12px; }
              .general-info-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .general-info-table td:first-child { width: 35%; }
              .general-info-table td:last-child { width: 65%; }
              .general-info-table td { border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid black; padding: 8px; text-align: left; word-wrap: break-word; }
              th { background-color: #f2f2f2; }
              img { display: block; margin: auto; }

              th.col-no, td.col-no { width: 5%; }
              th.col-activity, td.col-activity { width: 20%; }
              th.col-good, td.col-good { width: 7%; }
              th.col-need, td.col-need { width: 7%; }
              th.col-red, td.col-red { width: 7%; }

              th.col-shift, td.col-shift { width: ${(100 - (5 + 20 + 7 + 7 + 7)) / getHalfHourSlots(shiftHours).length}%; }
            </style>
          </head>
          <body>
            <h2>PT. GREENFIELDS INDONESIA</h2>
            <div class="report-info">
              ${formattedData}
            </div>
              <table>
                <thead>
                  ${actualTimeRow}
                  <tr>
                    <th class="col-no">No</th>
                    <th class="col-activity">Activity</th>
                    <th class="col-good">G</th>
                    <th class="col-need">N</th>
                    <th class="col-red">R</th>
                    ${getHalfHourSlots(shiftHours)
                      .map(({ hour, mm }) => `<th class="col-shift">${hour}:${mm}</th>`)
                      .join("")}
                  </tr>
                </thead>
                <tbody>
                  ${inspectionRows}
                </tbody>
              </table>
          </body>
        </html>
      `;

    try {
      const { uri } = await Print.printToFileAsync({
        html,
        orientation: "landscape",
      });
      console.log("File has been saved to:", uri);
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <View style={styles.header}>
          <Text style={styles.title}>Detail Data Shiftly</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>
                {moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Process Order:</Text>
              <Text style={styles.infoValue}>{item.processOrder}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Package:</Text>
              <Text style={styles.infoValue}>{item.packageType}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plant:</Text>
              <Text style={styles.infoValue}>{item.plant}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Line:</Text>
              <Text style={styles.infoValue}>{item.line}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Shift:</Text>
              <Text style={styles.infoValue}>{item.shift}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Machine:</Text>
              <Text style={styles.infoValue}>{item.machine}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={printToFile}>
            <Text style={styles.submitButtonText}>DOWNLOAD REPORT</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3bcd6b" />
          </View>
        ) : (
          <View style={styles.tableWrapper}>
            {/* Sticky Header Container */}
            <View style={styles.stickyContainer}>
              {/* KIRI fixed (label) + KANAN header ikut translateX(scrollX) */}
              <View style={{ flexDirection: "row" }}>
                {/* KIRI: dua baris fixed */}
                <View style={{ width: CELL_WIDTHS.fixedTotal }}>
                  <View style={[styles.actualTimeLabel, { height: actualTimeHeight }]}>
                    <Text style={styles.actualTimeText}>Actual Time</Text>
                  </View>
                  <View style={styles.fixedHeaderColumns}>
                    <View style={[styles.headerCell, { width: CELL_WIDTHS.no }]}>
                      <Text style={styles.headerText}>No</Text>
                    </View>
                    <View style={[styles.headerCell, { width: CELL_WIDTHS.activity }]}>
                      <Text style={styles.headerText}>Activity</Text>
                    </View>
                    <View style={[styles.headerCell, { width: CELL_WIDTHS.status }]}>
                      <Text style={styles.headerText}>G</Text>
                    </View>
                    <View style={[styles.headerCell, { width: CELL_WIDTHS.status }]}>
                      <Text style={styles.headerText}>N</Text>
                    </View>
                    <View style={[styles.headerCell, { width: CELL_WIDTHS.status }]}>
                      <Text style={styles.headerText}>R</Text>
                    </View>
                  </View>
                </View>

                {/* KANAN: header TIDAK discroll; ikut body via translateX */}
                <View style={{ flex: 1, overflow: "hidden" }}>
                  <Animated.View
                    style={{
                      width: hoursWidth,
                      transform: [{ translateX: Animated.multiply(scrollX, -1) }],
                    }}
                  >
                    {/* Baris actual time (abu) */}
                    <View
                      style={[styles.actualTimeContent, { backgroundColor: "#f8f9fa" }]}
                      onLayout={(e) => setActualTimeHeight(e.nativeEvent.layout.height)}
                    >
                      {shiftHours.map((hour, idx) => {
                        const relatedItems = actualTimeMap.get(Number(hour)) || [];
                        return (
                          <View
                            key={`time-${hour}-${idx}`}
                            style={[styles.actualTimeCell, { width: CELL_WIDTHS.hour }]}
                          >
                            {relatedItems.length === 0 ? (
                              <Text style={styles.actualTimeEmpty}>-</Text>
                            ) : (
                              relatedItems.map((rec, idy) => {
                                const s = moment.tz(rec.__ts, "Asia/Jakarta");
                                const actualStr = s.format("HH:mm");
                                const isLate = Math.abs(s.hour() - Number(hour)) >= 1;
                                return (
                                  <View
                                    key={`time-chip-${hour}-${idy}`}
                                    style={[
                                      styles.actualTimeBox,
                                      { backgroundColor: isLate ? "#ffebee" : "#e8f5e9" },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.actualTimeValue,
                                        { color: isLate ? "#d32f2f" : "#2e7d32" },
                                      ]}
                                    >
                                      {actualStr}
                                    </Text>
                                  </View>
                                );
                              })
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Baris header jam (hijau) */}
                    <View style={{ flexDirection: "row", backgroundColor: "#3bcd6b", minHeight: 45 }}>
                      {shiftHours.map((hour, index) => (
                        <View
                          key={`header-${hour}-${index}`}
                          style={[styles.headerCell, { width: CELL_WIDTHS.hour, borderRightColor: "rgba(255,255,255,0.3)" }]}
                        >
                          <Text style={styles.headerText}>{pad2(hour)}:00</Text>
                        </View>
                      ))}
                    </View>
                  </Animated.View>
                </View>
              </View>
            </View>

            {/* Konten (scroll vertikal + satu scroll horizontal untuk seluruh body kanan) */}
            <ScrollView
              ref={verticalScrollRef}
              style={styles.tableContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={{ flexDirection: "row" }}>
                {/* KIRI: kolom fixed semua baris */}
                <View>
                  {uniqueData.map((row, index) => {
                    const rkey = rowKey(row, index);
                    return (
                      <View key={`fixed-${rkey}`}
                        onLayout={(e) => setLH(index, e.nativeEvent.layout.height)}>
                        <View style={[
                          styles.tableRow,
                          index % 2 === 1 && styles.tableRowAlt,
                          { height: rowHeight(index) }
                        ]}>
                          <View style={styles.fixedColumns}>
                            <View style={[styles.cell, { width: CELL_WIDTHS.no }]}><Text style={styles.cellText}>{index + 1}</Text></View>
                            <View style={[styles.cell, { width: CELL_WIDTHS.activity }]}><Text style={styles.activityText}>{row.activity}</Text></View>
                            <View style={[styles.cell, { width: CELL_WIDTHS.status }]}><Text style={styles.cellText}>{row.good ?? "-"}</Text></View>
                            <View style={[styles.cell, { width: CELL_WIDTHS.status }]}><Text style={styles.cellText}>{row.need ?? "-"}</Text></View>
                            <View style={[styles.cell, { width: CELL_WIDTHS.status }]}><Text style={styles.cellText}>{row.reject ?? "-"}</Text></View>
                          </View>
                        </View>
                        {shouldShowSeparator(index) && <View style={styles.sectionSeparator} />}
                      </View>
                    );
                  })}
                </View>

                {/* KANAN: Animated.ScrollView sebagai satu-satunya sumber scroll horizontal */}
                <Animated.ScrollView
                  ref={hBodyRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                  )}
                  scrollEventThrottle={1}
                  decelerationRate="fast"
                >
                  <View>
                    {uniqueData.map((row, index) => {
                      const rkey = rowKey(row, index);
                      return (
                        <View key={`cells-${rkey}`}>
                          <View style={[
                            styles.tableRow,
                            index % 2 === 1 && styles.tableRowAlt,
                            { height: rowHeight(index) }
                          ]}>
                            <View style={styles.scrollableContent}>
                              {shiftHours.map((hour, idx) => {
                                const val = row.results?.[hour];
                                return (
                                  <TouchableOpacity
                                    key={`cell-${rkey}-${hour}-${idx}`}
                                    style={[
                                      styles.cell,
                                      {
                                        width: CELL_WIDTHS.hour,
                                        backgroundColor: getResultColor(val, row.good, row.reject),
                                        height: '100%'
                                      }
                                    ]}
                                    onPress={() => row.picture?.[hour] && handlePress(row.picture[hour])}
                                    disabled={!row.picture?.[hour]}
                                  >
                                    <Text style={[styles.cellText, { fontWeight: val ? "bold" : "normal" }]}>
                                      {val || ""}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                          {shouldShowSeparator(index) && <View style={styles.sectionSeparator} />}
                        </View>
                      );
                    })}
                  </View>
                </Animated.ScrollView>
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalView}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={{
                  width: modalImageSize,
                  height: modalImageSize,
                  borderRadius: 10,
                }}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
  },
  tableWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stickyContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
    zIndex: 100,
    elevation: 4,
  },
  actualTimeLabel: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  actualTimeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  actualTimeContent: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  actualTimeCell: {
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  actualTimeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 2,
  },
  actualTimeValue: {
    fontSize: 11,
    fontWeight: "600",
  },
  actualTimeEmpty: {
    fontSize: 12,
    color: "#999",
  },
  fixedHeaderColumns: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
    minHeight: 45,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.3)",
  },
  headerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
  },
  tableContent: {
    maxHeight: 757.7,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    minHeight: 45,
    alignItems: "stretch",
  },
  tableRowAlt: {
    backgroundColor: "#f8f9fa",
  },
  fixedColumns: {
    flexDirection: "row",
  },
  scrollableContent: {
    flexDirection: "row",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  cellText: {
    fontSize: 13,
    textAlign: "center",
    color: "#333",
  },
  activityText: {
    fontSize: 13,
    color: "#333",
    paddingHorizontal: 10,
    flexWrap: "wrap"
  },
  sectionSeparator: {
    height: 3,
    backgroundColor: "#2196F3",
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default DetailLaporanShiftly;
