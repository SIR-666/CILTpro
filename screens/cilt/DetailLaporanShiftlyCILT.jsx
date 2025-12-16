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
  const [masterActivities, setMasterActivities] = useState([]);
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

  // Refs
  const hBodyRef = useRef(null);
  const verticalScrollRef = useRef(null);

  const { width } = Dimensions.get("window");
  const modalImageSize = width * 0.8;

  const pad2 = (n) => String(n).padStart(2, "0");
  const rowKey = (row, index) => `${row?.id ?? row?.activity ?? "row"}|${index}`;

  // SCROLL: header kanan ikut body via Animated translateX
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // ============================================
  // CELL WIDTHS - Setiap jam dibagi 2 untuk 30 menit
  // ============================================
  const CELL_WIDTHS = {
    no: 40,
    activity: 200,
    status: 50,
    hour: 80,        // Total width per jam
    halfHour: 40,    // Width per 30 menit (setengah dari hour)
    fixedTotal: 390,
  };
  
  const hoursWidth = useMemo(
    () => (Array.isArray(shiftHours) ? shiftHours.length : 0) * CELL_WIDTHS.hour,
    [shiftHours]
  );

  // ============================================
  // FIXED ROW HEIGHT - Tidak menggunakan dynamic measurement
  // ============================================
  const ROW_HEIGHT = 50;

  const getShiftHours = (shift) => {
    if (shift === "Shift 1") return [6, 7, 8, 9, 10, 11, 12, 13, 14];
    if (shift === "Shift 2") return [14, 15, 16, 17, 18, 19, 20, 21, 22];
    if (shift === "Shift 3") return [22, 23, 0, 1, 2, 3, 4, 5, 6];
    return [];
  };

  const isNonEmpty = (v) =>
    v !== undefined &&
    v !== null &&
    String(v).trim() !== "" &&
    String(v).trim() !== "-";

  // ============================================
  // FETCH MASTER DATA
  // ============================================
  const fetchMasterData = async () => {
    try {
      const { data: masterData } = await api.get(
        `/gnr-master?plant=${encodeURIComponent(item.plant)}&line=${encodeURIComponent(item.line)}&machine=${encodeURIComponent(item.machine)}&type=PERFORMA RED AND GREEN`
      );
      const activities = Array.isArray(masterData) ? masterData.filter(m => m.visibility !== false) : [];
      console.log(`📊 Fetched ${activities.length} master activities`);
      return activities;
    } catch (error) {
      console.error("Error fetching master data:", error);
      return [];
    }
  };

  // ============================================
  // PARSE hourSlot untuk mendapatkan jam
  // ============================================
  const parseHourFromSlot = (hourSlot) => {
    if (!hourSlot) return undefined;
    const match = String(hourSlot).match(/^(\d{1,2})/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return undefined;
  };

  // ============================================
  // GENERATE 30-MIN SLOT KEYS untuk jam tertentu
  // ============================================
  const get30MinSlots = (hour) => {
    const h = pad2(hour);
    const nextH = pad2((hour + 1) % 24);
    return {
      first: `${h}:00 - ${h}:30`,   // 14:00 - 14:30
      second: `${h}:30 - ${nextH}:00` // 14:30 - 15:00
    };
  };

  // ============================================
  // EXTRACT UNIQUE INSPECTION DATA
  // ============================================
  const extractUniqueInspectionData = (records, masterList = []) => {
    const uniqueActivities = {};

    // 1) Inisialisasi dari MASTER DATA
    masterList.forEach((master, idx) => {
      const key = `master|${master.activity}`;
      uniqueActivities[key] = {
        activity: master.activity,
        good: master.good ?? "-",
        need: master.need ?? "-",
        reject: master.reject ?? "-",
        periode: master.frekuensi || "Tiap Jam",
        results: {},        // { 14: "1050", 15: "1100" } - untuk Tiap Jam
        actualTimes: {},    // { 14: ["14:02"], 15: ["15:05"] }
        picture: {},
        results30: {},      // { "14:00 - 14:30": "G", "14:30 - 15:00": "N" } - untuk 30 menit
      };
    });

    // 2) Parse data dari CombinedInspectionData
    const safe = Array.isArray(records) ? [...records] : [];

    for (const record of safe) {
      try {
        const chunks = String(record?.CombinedInspectionData || "").match(/\[[\s\S]*?\]/g);
        if (!chunks || chunks.length === 0) continue;

        for (const txt of chunks) {
          let arr = [];
          try {
            arr = JSON.parse(txt);
          } catch {
            continue;
          }

          for (const inspection of arr) {
            let matchKey = Object.keys(uniqueActivities).find(k =>
              uniqueActivities[k].activity === inspection.activity
            );

            if (!matchKey) {
              matchKey = `data|${inspection.activity}`;
              uniqueActivities[matchKey] = {
                activity: inspection.activity,
                good: inspection.good ?? "-",
                need: inspection.need ?? "-",
                reject: inspection.reject ?? "-",
                periode: inspection.periode || "Tiap Jam",
                results: {},
                actualTimes: {},
                picture: {},
                results30: {},
              };
            }

            // Check if this is 30-minute data
            const is30Min = inspection.periode && 
              String(inspection.periode).toLowerCase().includes("30");

            if (is30Min) {
              // Handle 30 menit data - simpan ke results30 dengan key timeSlot
              const timeSlot = inspection.timeSlot || inspection.time_slot;
              if (timeSlot && isNonEmpty(inspection.results)) {
                const sKey = normSlot(timeSlot);
                if (sKey) {
                  uniqueActivities[matchKey].results30[sKey] = String(inspection.results);
                  uniqueActivities[matchKey].periode = "30 menit";
                  
                  // Simpan actual time
                  const hour = parseHourFromSlot(timeSlot);
                  if (hour !== undefined && inspection.time) {
                    if (!uniqueActivities[matchKey].actualTimes[hour]) {
                      uniqueActivities[matchKey].actualTimes[hour] = [];
                    }
                    const timeStr = String(inspection.time);
                    if (!uniqueActivities[matchKey].actualTimes[hour].includes(timeStr)) {
                      uniqueActivities[matchKey].actualTimes[hour].push(timeStr);
                    }
                  }
                }
              }
            } else {
              // Handle Tiap Jam data
              const hourSlot = inspection.hourSlot || inspection.hour_slot;
              const hour = parseHourFromSlot(hourSlot);

              if (hour !== undefined && isNonEmpty(inspection.results)) {
                uniqueActivities[matchKey].results[hour] = String(inspection.results);

                if (inspection.time) {
                  if (!uniqueActivities[matchKey].actualTimes[hour]) {
                    uniqueActivities[matchKey].actualTimes[hour] = [];
                  }
                  const timeStr = String(inspection.time);
                  if (!uniqueActivities[matchKey].actualTimes[hour].includes(timeStr)) {
                    uniqueActivities[matchKey].actualTimes[hour].push(timeStr);
                  }
                }

                if (inspection.picture) {
                  uniqueActivities[matchKey].picture[hour] = inspection.picture;
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error parsing CombinedInspectionData:", e);
      }
    }

    const result = Object.values(uniqueActivities);
    console.log(`📊 Extracted ${result.length} unique activities`);
    return result;
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

  // ============================================
  // KUMPULKAN ACTUAL TIMES PER JAM
  // ============================================
  const actualTimesPerHour = useMemo(() => {
    const result = {};
    shiftHours.forEach(h => {
      result[h] = new Set();
    });

    uniqueData.forEach(row => {
      if (row.actualTimes) {
        Object.entries(row.actualTimes).forEach(([hourStr, times]) => {
          const hour = parseInt(hourStr, 10);
          if (result[hour] && Array.isArray(times)) {
            times.forEach(t => result[hour].add(t));
          }
        });
      }
    });

    const sorted = {};
    Object.keys(result).forEach(h => {
      sorted[h] = Array.from(result[h]).sort();
    });

    return sorted;
  }, [uniqueData, shiftHours]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const master = await fetchMasterData();
      setMasterActivities(master);

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
        setData(result);
        setUniqueData(extractUniqueInspectionData(result, master));
      } else {
        setData([]);
        setUniqueData(extractUniqueInspectionData([], master));
      }
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
      } else {
        console.error("Error fetching data:", error);
        setData([]);
        setUniqueData(extractUniqueInspectionData([], masterActivities));
        setShiftHours(getShiftHours(item.shift));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchData();
    });
    return () => {
      task.cancel?.();
      try { fetchData.controller?.abort?.(); } catch { }
    };
  }, [item]);

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
    if (!result || String(result).trim() === "") return "#f8f9fa";

    if (["G", "N", "R"].includes(result)) {
      if (result === "G") return "#d4edda";
      if (result === "N") return "#fff3cd";
      if (result === "R") return "#f8d7da";
    }

    if (String(result).toUpperCase() === "OK") return "#d4edda";
    if (String(result).toUpperCase() === "NOT OK") return "#f8d7da";

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

    // Check 30 menit data first
    if (itemRow?.results30 && itemRow.results30[slot] !== undefined) {
      return itemRow.results30[slot];
    }

    // Fallback to hourly data
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

    const actualTimeRow = `
      <tr>
        <td colspan="5" style="font-weight: bold; text-align: center;">Actual Time</td>
        ${halfHourSlots
        .map(({ hour, mm }) => {
          const hNum = parseInt(hour, 10);
          if (mm === "30") {
            return `<td style="text-align:center; font-weight:bold; background:#f8f9fa">-</td>`;
          }
          const times = actualTimesPerHour[hNum] || [];
          if (!times.length) {
            return `<td style="text-align:center; font-weight:bold; background:#f8f9fa">-</td>`;
          }
          const chips = times
            .map((timeStr) => {
              const [hh] = timeStr.split(":");
              const timeHour = parseInt(hh, 10);
              const late = Math.abs(timeHour - hNum) >= 1;
              const bg = late ? "#ffebee" : "#e8f5e9";
              const color = late ? "#d32f2f" : "#2e7d32";
              return `<div style="background:${bg};color:${color};font-weight:bold;padding:2px 4px;margin:2px;border-radius:3px;display:inline-block;">${timeStr}</div>`;
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

  // ============================================
  // RENDER CELL untuk setiap jam
  // Jika periode 30 menit, tampilkan 2 sub-cell
  // ============================================
  const renderHourCell = (row, hour, rkey) => {
    const is30Min = row.periode && String(row.periode).toLowerCase().includes("30");
    
    if (is30Min) {
      // Render 2 sub-cells untuk 30 menit
      const slots = get30MinSlots(hour);
      const val1 = row.results30?.[slots.first] || "";
      const val2 = row.results30?.[slots.second] || "";
      
      return (
        <View 
          key={`cell-${rkey}-${hour}`} 
          style={[styles.splitCell, { width: CELL_WIDTHS.hour }]}
        >
          {/* Sub-cell 1: XX:00 - XX:30 */}
          <View style={[
            styles.halfCell,
            { backgroundColor: getResultColor(val1, row.good, row.reject) }
          ]}>
            <Text style={[styles.cellText, { fontWeight: val1 ? "bold" : "normal", fontSize: 11 }]}>
              {val1}
            </Text>
          </View>
          
          {/* Divider */}
          <View style={styles.cellDivider} />
          
          {/* Sub-cell 2: XX:30 - (XX+1):00 */}
          <View style={[
            styles.halfCell,
            { backgroundColor: getResultColor(val2, row.good, row.reject) }
          ]}>
            <Text style={[styles.cellText, { fontWeight: val2 ? "bold" : "normal", fontSize: 11 }]}>
              {val2}
            </Text>
          </View>
        </View>
      );
    } else {
      // Render single cell untuk Tiap Jam
      const val = row.results?.[hour] || "";
      return (
        <TouchableOpacity
          key={`cell-${rkey}-${hour}`}
          style={[
            styles.cell,
            {
              width: CELL_WIDTHS.hour,
              backgroundColor: getResultColor(val, row.good, row.reject),
            }
          ]}
          onPress={() => row.picture?.[hour] && handlePress(row.picture[hour])}
          disabled={!row.picture?.[hour]}
        >
          <Text style={[styles.cellText, { fontWeight: val ? "bold" : "normal" }]}>
            {val}
          </Text>
        </TouchableOpacity>
      );
    }
  };

  // ============================================
  // RENDER HEADER untuk jam (dengan sub-header 30 menit)
  // ============================================
  const renderHourHeaders = () => {
    return shiftHours.map((hour, index) => (
      <View 
        key={`header-${hour}-${index}`}
        style={[styles.hourHeaderContainer, { width: CELL_WIDTHS.hour }]}
      >
        {/* Main hour header */}
        <View style={styles.hourHeaderMain}>
          <Text style={styles.headerText}>{pad2(hour)}:00</Text>
        </View>
        {/* Sub-headers for 30 min */}
        <View style={styles.hourHeaderSub}>
          <View style={styles.halfHeader}>
            <Text style={styles.subHeaderText}>:00</Text>
          </View>
          <View style={styles.halfHeaderDivider} />
          <View style={styles.halfHeader}>
            <Text style={styles.subHeaderText}>:30</Text>
          </View>
        </View>
      </View>
    ));
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
              <View style={{ flexDirection: "row" }}>
                {/* KIRI: fixed headers */}
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

                {/* KANAN: scrollable headers */}
                <View style={{ flex: 1, overflow: "hidden" }}>
                  <Animated.View
                    style={{
                      width: hoursWidth,
                      transform: [{ translateX: Animated.multiply(scrollX, -1) }],
                    }}
                  >
                    {/* Baris actual time */}
                    <View
                      style={[styles.actualTimeContent, { backgroundColor: "#f8f9fa" }]}
                      onLayout={(e) => setActualTimeHeight(e.nativeEvent.layout.height)}
                    >
                      {shiftHours.map((hour, idx) => {
                        const timesForHour = actualTimesPerHour[hour] || [];
                        return (
                          <View
                            key={`time-${hour}-${idx}`}
                            style={[styles.actualTimeCell, { width: CELL_WIDTHS.hour }]}
                          >
                            {timesForHour.length === 0 ? (
                              <Text style={styles.actualTimeEmpty}>-</Text>
                            ) : (
                              timesForHour.map((timeStr, idy) => {
                                const [hh] = timeStr.split(":");
                                const timeHour = parseInt(hh, 10);
                                const isLate = Math.abs(timeHour - Number(hour)) >= 1;
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
                                      {timeStr}
                                    </Text>
                                  </View>
                                );
                              })
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Baris header jam dengan sub-header */}
                    <View style={styles.hourHeaderRow}>
                      {renderHourHeaders()}
                    </View>
                  </Animated.View>
                </View>
              </View>
            </View>

            {/* Konten table */}
            <ScrollView
              ref={verticalScrollRef}
              style={styles.tableContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={{ flexDirection: "row" }}>
                {/* KIRI: kolom fixed */}
                <View>
                  {uniqueData.map((row, index) => {
                    const rkey = rowKey(row, index);
                    const isSeparatorRow = shouldShowSeparator(index);
                    return (
                      <View key={`fixed-${rkey}`}>
                        <View style={[
                          styles.tableRow,
                          index % 2 === 1 && styles.tableRowAlt,
                          { height: ROW_HEIGHT }
                        ]}>
                          <View style={styles.fixedColumns}>
                            <View style={[styles.cell, { width: CELL_WIDTHS.no }]}>
                              <Text style={styles.cellText}>{index + 1}</Text>
                            </View>
                            <View style={[styles.cell, { width: CELL_WIDTHS.activity }]}>
                              <Text style={styles.activityText} numberOfLines={2}>
                                {row.activity}
                              </Text>
                            </View>
                            <View style={[styles.cell, { width: CELL_WIDTHS.status }]}>
                              <Text style={styles.cellText}>{row.good ?? "-"}</Text>
                            </View>
                            <View style={[styles.cell, { width: CELL_WIDTHS.status }]}>
                              <Text style={styles.cellText}>{row.need ?? "-"}</Text>
                            </View>
                            <View style={[styles.cell, { width: CELL_WIDTHS.status }]}>
                              <Text style={styles.cellText}>{row.reject ?? "-"}</Text>
                            </View>
                          </View>
                        </View>
                        {isSeparatorRow && <View style={styles.sectionSeparator} />}
                      </View>
                    );
                  })}
                </View>

                {/* KANAN: scrollable cells */}
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
                      const isSeparatorRow = shouldShowSeparator(index);
                      return (
                        <View key={`cells-${rkey}`}>
                          <View style={[
                            styles.tableRow,
                            index % 2 === 1 && styles.tableRowAlt,
                            { height: ROW_HEIGHT }
                          ]}>
                            <View style={styles.scrollableContent}>
                              {shiftHours.map((hour) => renderHourCell(row, hour, rkey))}
                            </View>
                          </View>
                          {isSeparatorRow && <View style={styles.sectionSeparator} />}
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
    minHeight: 50,
  },
  actualTimeBox: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginVertical: 1,
  },
  actualTimeValue: {
    fontSize: 10,
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
  // Hour header with sub-headers
  hourHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
  },
  hourHeaderContainer: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.3)",
  },
  hourHeaderMain: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.3)",
  },
  hourHeaderSub: {
    flexDirection: "row",
    height: 20,
  },
  halfHeader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  halfHeaderDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  subHeaderText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 10,
  },
  tableContent: {
    maxHeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
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
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  // Split cell for 30-minute data
  splitCell: {
    flexDirection: "row",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  halfCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  cellDivider: {
    width: 1,
    backgroundColor: "#ccc",
  },
  cellText: {
    fontSize: 12,
    textAlign: "center",
    color: "#333",
  },
  activityText: {
    fontSize: 11,
    color: "#333",
    paddingHorizontal: 6,
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
