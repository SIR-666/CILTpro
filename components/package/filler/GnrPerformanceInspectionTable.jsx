import { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, TextInput, View, Alert, TouchableOpacity } from "react-native";
import { api } from "../../../utils/axiosInstance";
import moment from "moment-timezone";
import AsyncStorage from "@react-native-async-storage/async-storage";

const isNumericItem = (item) =>
  (() => {
    if (!item || item.useButtons) return false;
    const hasNumericCriteria =
      /\d+/.test(item?.good || "") ||
      /\d+/.test(item?.reject || "") ||
      /[<>]=?/.test(item?.good || "") ||
      /[<>]=?/.test(item?.reject || "") ||
      (item?.good || "").includes(" - ") ||
      (item?.reject || "").includes(" - ");

    return item?.status === 1 && hasNumericCriteria;
  })();

const sanitizeDecimal = (txt) =>
  txt
    .replace(",", ".")
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*?)\./g, "$1")
    .replace(/^0+(?=\d)/, "");

const nowTimeStr = () => {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

const parseHM = (str) => {
  if (!str || typeof str !== "string") return null;
  const m = str.trim().match(/^(\d{1,2})\D(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return { h, min };
};

// Helper function untuk extract group name dari sub-item
const extractGroupNameForSubItem = (activity, allData) => {
  const currentIndex = allData.findIndex(item => item.activity === activity);
  if (currentIndex === -1) return "";

  for (let i = currentIndex - 1; i >= 0; i--) {
    const item = allData[i];
    const isGroupHeader = /^\d+\.\s+([A-Z]+)$/.test(item.activity?.trim() || "");
    if (isGroupHeader) {
      const match = item.activity.match(/^\d+\.\s+([A-Z]+)$/);
      return match ? match[1] : "";
    }
  }
  return "";
};

const GnrPerformanceInspectionTable = ({
  username, onDataChange, initialData, plant, line, machine, type, shift: parentShift, processOrder
}) => {
  const [inspectionData, setInspectionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInspection, setLoadingInspection] = useState(false);
  const [selectedHourlySlot, setSelectedHourlySlot] = useState("");
  const [selected30MinSlot, setSelected30MinSlot] = useState("");
  const [lastHourCheck, setLastHourCheck] = useState(null);
  const [last30MinCheck, setLast30MinCheck] = useState(null);
  const [shift, setShift] = useState("");
  const [showHourlyTable, setShowHourlyTable] = useState(false);
  const [show30MinTable, setShow30MinTable] = useState(false);

  const [savedHourlyData, setSavedHourlyData] = useState({});
  const [saved30MinData, setSaved30MinData] = useState({});
  const [dataExpiryTimes, setDataExpiryTimes] = useState({});

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isUserActive, setIsUserActive] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [hasUnsavedData, setHasUnsavedData] = useState(false);

  const [isManualSelection, setIsManualSelection] = useState(false);
  const [lastManualSelectionTime, setLastManualSelectionTime] = useState(null);

  const selectedHourlySlotRef = useRef("");
  const selected30MinSlotRef = useRef("");

  const previousMachineRef = useRef(machine);
  const previousTypeRef = useRef(type);

  // Data per jam untuk semua item
  const [hourlyData, setHourlyData] = useState({});

  // State untuk tracking refresh confirmation
  const [hasConfirmedRefresh, setHasConfirmedRefresh] = useState(false);
  const [isCheckingExpiry, setIsCheckingExpiry] = useState(false);

  // Cutoff time = 06:30 WIB keesokan hari
  const getNextShift1CutoffTs = useCallback(() => {
    const now = moment().tz("Asia/Jakarta");
    let cutoff = now.clone().startOf("day").hour(6).minute(30).second(0).millisecond(0);
    if (now.isSameOrAfter(cutoff)) cutoff = cutoff.add(1, "day");
    return cutoff.valueOf();
  }, []);

  // Cek apakah data dari hari kemarin (sudah expired)
  const isDataFromYesterday = useCallback((expiryTs) => {
    if (!expiryTs) return false;
    const now = Date.now();
    return now >= expiryTs;
  }, []);

  // Cek apakah semua slot sudah terpenuhi untuk shift tertentu
  const isAllSlotsFilled = useCallback(() => {
    // Generate slots inline to avoid dependency on generateHourlySlots
    const currentShift = shift || (parentShift || (() => {
      const hour = moment().tz("Asia/Jakarta").hour();
      if (hour >= 6 && hour < 14) return "Shift 1";
      if (hour >= 14 && hour < 22) return "Shift 2";
      return "Shift 3";
    })());

    let slots = [];
    if (currentShift === "Shift 1") {
      for (let i = 6; i <= 14; i++) slots.push(`${String(i).padStart(2, "0")}:00`);
    } else if (currentShift === "Shift 2") {
      for (let i = 14; i <= 22; i++) slots.push(`${String(i).padStart(2, "0")}:00`);
    } else {
      [22, 23, 0, 1, 2, 3, 4, 5, 6].forEach(h => slots.push(`${String(h).padStart(2, "0")}:00`));
    }

    const hourlySlotsFilled = slots.filter(s =>
      hourlyData[s] && Object.keys(hourlyData[s]).length > 0
    ).length;

    const thirtyMinSlotsFilled = Object.keys(saved30MinData).filter(s =>
      saved30MinData[s]?.length > 0
    ).length;

    // Semua slot jam terpenuhi DAN semua slot 30 menit terpenuhi
    return hourlySlotsFilled >= slots.length && thirtyMinSlotsFilled >= (slots.length * 2);
  }, [hourlyData, saved30MinData, shift, parentShift]);

  const updateUserActivity = () => {
    setIsUserActive(true);
    setLastActivityTime(Date.now());
    if (globalThis.inactivityTimer) clearTimeout(globalThis.inactivityTimer);
    globalThis.inactivityTimer = setTimeout(() => setIsUserActive(false), 5 * 60 * 1000);
  };

  const getCurrentShift = () => {
    if (parentShift) return parentShift;
    const hour = moment().tz("Asia/Jakarta").hour();
    if (hour >= 6 && hour < 14) return "Shift 1";
    if (hour >= 14 && hour < 22) return "Shift 2";
    return "Shift 3";
  };

  // Storage key dengan processOrder untuk isolasi data per PO
  const getStorageKey = (typeKey) => {
    const now = moment().tz("Asia/Jakarta");
    const currentShift = shift || getCurrentShift();
    const shiftDate =
      currentShift === "Shift 3" && now.hour() < 6
        ? now.clone().subtract(1, "day").format("YYYY-MM-DD")
        : now.format("YYYY-MM-DD");
    return `gnr_${plant}_${line}_${machine}_${shiftDate}_${currentShift}_${typeKey}`;
  };

  // Get storage key untuk hari sebelumnya (untuk pengecekan data expired)
  const getYesterdayStorageKey = (typeKey) => {
    const now = moment().tz("Asia/Jakarta");
    const currentShift = shift || getCurrentShift();
    const yesterdayDate = now.clone().subtract(1, "day").format("YYYY-MM-DD");
    const userKey = username || "anon";
    return `gnr_${plant}_${line}_${machine}_${yesterdayDate}_${currentShift}_${typeKey}_${userKey}`;
  };

  const parse30MinSlot = (slot) => {
    if (!slot || !slot.includes("-")) return null;
    const [start] = slot.split("-").map(s => s.trim());
    const [HH, MM] = start.split(":");
    return { hour: HH, mmStart: MM };
  };

  const getDefault30MinSlot = (hourSlot) => {
    const slots = generate30MinSlots(hourSlot);
    if (!slots.length) return "";
    const now = moment().tz("Asia/Jakarta");
    for (const s of slots) {
      const [startStr, endStr] = s.split("-").map(x => x.trim());
      const [sh, sm] = startStr.split(":").map(Number);
      const [eh, em] = endStr.split(":").map(Number);
      const start = now.clone().hour(sh).minute(sm).second(0).millisecond(0);
      const end = now.clone().hour(eh).minute(em).second(0).millisecond(0);
      if (now.isSameOrAfter(start) && now.isBefore(end)) return s;
    }
    for (let i = slots.length - 1; i >= 0; i--) {
      if (is30SlotAccessible(slots[i])) return slots[i];
    }
    return slots[0];
  };

  const handleHourlySlotSelection = (slot) => {
    if (!isSlotAccessible(slot)) return;
    saveDataBeforeSubmit();
    setIsManualSelection(true);
    setLastManualSelectionTime(Date.now());
    selectedHourlySlotRef.current = slot;
    setSelectedHourlySlot(slot);
    const auto30 = getDefault30MinSlot(slot);
    selected30MinSlotRef.current = auto30;
    setSelected30MinSlot(auto30);
    setTimeout(() => loadSavedDataFor(slot, auto30), 0);
    updateUserActivity();
  };

  const handle30MinSlotSelection = (slot) => {
    saveDataBeforeSubmit();
    setIsManualSelection(true);
    setLastManualSelectionTime(Date.now());
    selected30MinSlotRef.current = slot;
    setSelected30MinSlot(slot);
    setTimeout(() => loadSavedDataFor(selectedHourlySlotRef.current || selectedHourlySlot, slot), 0);
    updateUserActivity();
  };

  // Mendapatkan nilai per jam untuk item tertentu
  const getHourlyValue = (activity, hourSlot = selectedHourlySlot) => {
    if (!hourSlot) return "";
    return hourlyData[hourSlot]?.[activity]?.results || "";
  };

  // Menyimpan nilai per jam untuk item tertentu
  const setHourlyValue = (activity, value, hourSlot = selectedHourlySlot) => {
    if (!hourSlot) return;

    setHourlyData(prev => ({
      ...prev,
      [hourSlot]: {
        ...prev[hourSlot],
        [activity]: {
          results: value,
          user: username,
          time: nowTimeStr(),
          done: !!value,
          hourSlot: hourSlot,
          evaluatedResult: prev[hourSlot]?.[activity]?.evaluatedResult || ""
        }
      }
    }));

    setHasUnsavedData(true);
    updateUserActivity();
  };

  // Mendapatkan background color berdasarkan nilai per jam
  const getHourlyBackgroundColor = (item, hourSlot = selectedHourlySlot) => {
    const value = getHourlyValue(item.activity, hourSlot);

    if (item.useButtons) {
      if (value === "OK") return "#c8ecd4";
      if (value === "NOT OK") return "#ffd6d6";
      return "#fff";
    }

    if (item.periode === "Tiap Jam") {
      const evaluatedResult = hourlyData[hourSlot]?.[item.activity]?.evaluatedResult || "";
      if (evaluatedResult === "R") return "#ffd6d6";
      if (evaluatedResult === "N") return "#fff7cc";
      if (evaluatedResult === "G") return "#c8ecd4";
      return "#fff";
    }

    return "#fff";
  };

  const loadSavedDataFromStorage = async () => {
    try {
      const hourlyKey = getStorageKey("hourly");
      const thirtyMinKey = getStorageKey("30min");
      const expiryKey = getStorageKey("expiry");
      const savedHourly = await AsyncStorage.getItem(hourlyKey);
      const saved30Min = await AsyncStorage.getItem(thirtyMinKey);
      const savedExpiry = await AsyncStorage.getItem(expiryKey);

      let loadedExpiryTimes = {};
      if (savedExpiry) {
        loadedExpiryTimes = JSON.parse(savedExpiry);
        setDataExpiryTimes(loadedExpiryTimes);
      }

      // Cek apakah ada data yang sudah expired SEBELUM loading
      const now = Date.now();
      let hasExpiredData = false;
      Object.keys(loadedExpiryTimes).forEach(key => {
        if (loadedExpiryTimes[key] < now) {
          hasExpiredData = true;
        }
      });

      // Jika ada data expired, trigger check setelah data loaded
      if (hasExpiredData && !hasConfirmedRefresh) {
        // Tetap load data dulu agar user bisa lihat
        if (savedHourly) {
          const parsedHourly = JSON.parse(savedHourly);
          setSavedHourlyData(parsedHourly);

          const newHourlyData = {};
          Object.keys(parsedHourly).forEach(slot => {
            newHourlyData[slot] = {};
            parsedHourly[slot].forEach(item => {
              newHourlyData[slot][item.activity] = {
                results: item.results || "",
                user: item.user || "",
                time: item.time || "",
                done: item.done || false,
                hourSlot: item.hourSlot || slot,
                evaluatedResult: item.evaluatedResult || ""
              };
            });
          });
          setHourlyData(newHourlyData);
        }

        if (saved30Min) setSaved30MinData(JSON.parse(saved30Min));
        setIsDataLoaded(true);

        // Trigger prompt setelah short delay
        setTimeout(() => {
          checkAndPromptExpiredData();
        }, 500);
        return;
      }

      // Normal load jika tidak ada expired data
      if (savedHourly) {
        const parsedHourly = JSON.parse(savedHourly);
        setSavedHourlyData(parsedHourly);

        const newHourlyData = {};
        Object.keys(parsedHourly).forEach(slot => {
          newHourlyData[slot] = {};
          parsedHourly[slot].forEach(item => {
            newHourlyData[slot][item.activity] = {
              results: item.results || "",
              user: item.user || "",
              time: item.time || "",
              done: item.done || false,
              hourSlot: item.hourSlot || slot,
              evaluatedResult: item.evaluatedResult || ""
            };
          });
        });
        setHourlyData(newHourlyData);
      }

      if (saved30Min) setSaved30MinData(JSON.parse(saved30Min));
      setIsDataLoaded(true);
    } catch (e) {
      console.error("Error loading saved data from storage:", e);
      setIsDataLoaded(true);
    }
  };

  const loadSavedDataFor = (hourSlot, thirtySlot) => {
    // Apply saved data ke inspectionData untuk ditampilkan di UI
    setInspectionData(prev => {
      return prev.map(item => {
        // Handle data tiap jam
        if (item.periode === "Tiap Jam" && hourSlot) {
          const savedData = hourlyData[hourSlot]?.[item.activity];
          if (savedData) {
            return {
              ...item,
              results: savedData.results || "",
              user: savedData.user || "",
              time: savedData.time || "",
              done: savedData.done || false,
              hourSlot: savedData.hourSlot || hourSlot,
              evaluatedResult: savedData.evaluatedResult || ""
            };
          } else {
            // Reset jika tidak ada data untuk slot ini
            return {
              ...item,
              results: "",
              user: "",
              time: "",
              done: false,
              hourSlot: hourSlot,
              evaluatedResult: ""
            };
          }
        }

        // Handle data 30 menit
        if (item.periode === "30 menit" && thirtySlot) {
          const slotData = saved30MinData[thirtySlot];
          if (Array.isArray(slotData)) {
            const savedItem = slotData.find(s => s.activity === item.activity);
            if (savedItem) {
              return {
                ...item,
                results: savedItem.results || "",
                user: savedItem.user || "",
                time: savedItem.time || "",
                done: savedItem.done || false,
                timeSlot: savedItem.timeSlot || thirtySlot,
                evaluatedResult: savedItem.evaluatedResult || ""
              };
            }
          }
          // Reset jika tidak ada data untuk slot ini
          return {
            ...item,
            results: "",
            user: "",
            time: "",
            done: false,
            timeSlot: thirtySlot,
            evaluatedResult: ""
          };
        }

        return item;
      });
    });
  };

  const loadSavedData = () =>
    loadSavedDataFor(selectedHourlySlotRef.current || selectedHourlySlot, selected30MinSlotRef.current || selected30MinSlot);

  useEffect(() => {
    const loadCustomData = async () => {
      try {
        const key = getStorageKey("custom");
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Untuk custom data, kita tetap menggunakan struktur lama
          setInspectionData((curr) =>
            curr.map((item) => {
              const match = parsed.find((x) => x.activity === item.activity);
              return match ? { ...item, ...match } : item;
            })
          );
        }
      } catch (err) {
        console.error("Error loading custom GNR:", err);
      }
    };
    loadCustomData();
  }, [plant, line, machine, type]);

  const saveDataToStorage = async () => {
    try {
      const hourlyKey = getStorageKey("hourly");
      const thirtyMinKey = getStorageKey("30min");
      const expiryKey = getStorageKey("expiry");

      // KONVERSI STRUKTUR BARU KE FORMAT LAMA UNTUK PENYIMPANAN
      const hourlyDataForStorage = {};
      Object.keys(hourlyData).forEach(slot => {
        hourlyDataForStorage[slot] = Object.keys(hourlyData[slot]).map(activity => ({
          activity,
          ...hourlyData[slot][activity]
        }));
      });

      await AsyncStorage.setItem(hourlyKey, JSON.stringify(hourlyDataForStorage));
      await AsyncStorage.setItem(thirtyMinKey, JSON.stringify(saved30MinData));
      await AsyncStorage.setItem(expiryKey, JSON.stringify(dataExpiryTimes));
    } catch (e) {
      console.error("Error saving data to storage:", e);
    }
  };

  useEffect(() => {
    if (plant && line && machine && type) {
      loadSavedDataFromStorage();
    }
  }, [plant, line, machine, type]);

  useEffect(() => {
    if (isDataLoaded && (Object.keys(hourlyData).length > 0 || Object.keys(saved30MinData).length > 0)) {
      saveDataToStorage();
    }
  }, [hourlyData, saved30MinData, dataExpiryTimes, isDataLoaded]);

  useEffect(() => {
    const interval = setInterval(() => checkAndPromptExpiredData(), 60000);
    return () => clearInterval(interval);
  }, [dataExpiryTimes, hasConfirmedRefresh]);

  // Cek apakah ada data expired dan tampilkan Alert konfirmasi
  const checkAndPromptExpiredData = useCallback(async () => {
    // Jika sudah dikonfirmasi refresh di sesi ini, skip
    if (hasConfirmedRefresh || isCheckingExpiry) return;

    const now = Date.now();
    let hasExpiredData = false;

    // Cek apakah ada data yang sudah expired
    Object.keys(dataExpiryTimes).forEach(key => {
      if (dataExpiryTimes[key] < now) {
        hasExpiredData = true;
      }
    });

    if (hasExpiredData) {
      setIsCheckingExpiry(true);

      Alert.alert(
        "Data Shift Sebelumnya",
        "Ditemukan data dari shift sebelumnya yang sudah melewati batas waktu (06:30). Apakah Anda ingin menghapus data lama dan memulai shift baru?\n\n• Pilih 'Ya' untuk memulai dengan data kosong\n• Pilih 'Tidak' untuk tetap menyimpan data lama",
        [
          {
            text: "Tidak",
            style: "cancel",
            onPress: () => {
              setHasConfirmedRefresh(true);
              setIsCheckingExpiry(false);
              console.log("User chose to keep old data");
            }
          },
          {
            text: "Ya, Hapus Data",
            style: "destructive",
            onPress: () => {
              performDataCleanup();
              setHasConfirmedRefresh(true);
              setIsCheckingExpiry(false);
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [dataExpiryTimes, hasConfirmedRefresh, isCheckingExpiry]);

  // Fungsi untuk membersihkan data expired setelah konfirmasi
  const performDataCleanup = async () => {
    const now = Date.now();
    const newDataExpiryTimes = { ...dataExpiryTimes };
    const newHourlyData = { ...hourlyData };
    const newSaved30MinData = { ...saved30MinData };

    Object.keys(dataExpiryTimes).forEach(key => {
      if (dataExpiryTimes[key] < now) {
        if (key.startsWith("hourly_")) {
          const slot = key.replace("hourly_", "");
          delete newHourlyData[slot];
        } else if (key.startsWith("30min_")) {
          const slot = key.replace("30min_", "");
          delete newSaved30MinData[slot];
        }
        delete newDataExpiryTimes[key];
      }
    });

    setHourlyData(newHourlyData);
    setSaved30MinData(newSaved30MinData);
    setDataExpiryTimes(newDataExpiryTimes);

    try {
      const hourlyKey = getStorageKey("hourly");
      const thirtyMinKey = getStorageKey("30min");
      const expiryKey = getStorageKey("expiry");

      const hourlyDataForStorage = {};
      Object.keys(newHourlyData).forEach(slot => {
        hourlyDataForStorage[slot] = Object.keys(newHourlyData[slot]).map(activity => ({
          activity,
          ...newHourlyData[slot][activity]
        }));
      });

      if (Object.keys(hourlyDataForStorage).length === 0) await AsyncStorage.removeItem(hourlyKey);
      else await AsyncStorage.setItem(hourlyKey, JSON.stringify(hourlyDataForStorage));

      if (Object.keys(newSaved30MinData).length === 0) await AsyncStorage.removeItem(thirtyMinKey);
      else await AsyncStorage.setItem(thirtyMinKey, JSON.stringify(newSaved30MinData));

      if (Object.keys(newDataExpiryTimes).length === 0) await AsyncStorage.removeItem(expiryKey);
      else await AsyncStorage.setItem(expiryKey, JSON.stringify(newDataExpiryTimes));

      // Reset inspectionData juga
      setInspectionData(prev => prev.map(item => ({
        ...item,
        results: "",
        user: "",
        time: "",
        done: false,
        evaluatedResult: "",
        hourSlot: "",
        timeSlot: ""
      })));

      Alert.alert("Berhasil", "Data shift sebelumnya telah dihapus. Anda bisa memulai input data baru.");
    } catch (e) {
      console.error("Error cleaning expired data from storage:", e);
      Alert.alert("Error", "Gagal menghapus data. Silakan coba lagi.");
    }
  };

  // Fungsi lama untuk backward compatibility (tidak auto-delete)
  const cleanExpiredData = async () => {
    // Tidak lagi auto-delete, hanya trigger check
    await checkAndPromptExpiredData();
  };

  const saveDataBeforeSubmit = useCallback(() => {
    const currentHourlySlot =
      selectedHourlySlotRef.current || selectedHourlySlot || "";
    const current30MinSlot =
      selected30MinSlotRef.current || selected30MinSlot || "";

    console.log("=== SAVE DATA BEFORE SUBMIT ===");
    console.log("hourlyData slots:", Object.keys(hourlyData));
    console.log("saved30MinData slots:", Object.keys(saved30MinData));

    // ============================================
    // BUILD COMPLETE SNAPSHOT DARI SEMUA JAM
    // ============================================
    const completeSnapshot = [];
    let idCounter = 1;

    // 1) DATA TIAP JAM - Ambil dari SEMUA slot di hourlyData
    Object.keys(hourlyData).forEach(slot => {
      const slotData = hourlyData[slot];
      if (!slotData) return;

      Object.keys(slotData).forEach(activity => {
        const itemData = slotData[activity];
        const baseItem = inspectionData.find(item => item.activity === activity);

        // Hanya tambahkan jika ada results
        if (baseItem && itemData && (itemData.results || itemData.results === 0 || itemData.results === "0")) {
          completeSnapshot.push({
            id: idCounter++,
            activity: baseItem.activity,
            good: baseItem.good,
            need: baseItem.need,
            reject: baseItem.reject,
            periode: baseItem.periode,
            status: baseItem.status,
            content: baseItem.content,
            useButtons: baseItem.useButtons,
            isGroupHeader: baseItem.isGroupHeader,
            isSubItem: baseItem.isSubItem,
            groupName: baseItem.groupName,
            // Data spesifik per jam - PENTING!
            results: itemData.results ?? "",
            user: itemData.user || username,
            time: itemData.time || nowTimeStr(),
            done: !!itemData.results,
            hourSlot: slot,  // ← PENTING: slot jam yang benar untuk setiap entry
            timeSlot: "",
            evaluatedResult: itemData.evaluatedResult || ""
          });

          console.log(`Added hourly item: ${activity} @ ${slot} = ${itemData.results}`);
        }
      });
    });

    // 2) DATA 30 MENIT - Ambil dari SEMUA slot di saved30MinData
    Object.keys(saved30MinData).forEach(slot => {
      const slotItems = saved30MinData[slot];
      if (!Array.isArray(slotItems)) return;

      slotItems.forEach(itemData => {
        const baseItem = inspectionData.find(item => item.activity === itemData.activity);

        if (baseItem && itemData && itemData.results) {
          completeSnapshot.push({
            id: idCounter++,
            activity: baseItem.activity,
            good: baseItem.good,
            need: baseItem.need,
            reject: baseItem.reject,
            periode: baseItem.periode,
            status: baseItem.status,
            content: baseItem.content,
            useButtons: baseItem.useButtons,
            isGroupHeader: baseItem.isGroupHeader,
            isSubItem: baseItem.isSubItem,
            groupName: baseItem.groupName,
            // Data spesifik per 30 menit
            results: itemData.results ?? "",
            user: itemData.user || username,
            time: itemData.time || nowTimeStr(),
            done: true,
            hourSlot: "",
            timeSlot: slot,  // ← PENTING: slot 30 menit yang benar
            evaluatedResult: itemData.evaluatedResult || ""
          });

          console.log(`Added 30min item: ${itemData.activity} @ ${slot} = ${itemData.results}`);
        }
      });
    });

    // 3) DATA CUSTOM (per shift, bukan per jam/30 menit)
    inspectionData.forEach(item => {
      if (item.periode !== "Tiap Jam" && item.periode !== "30 menit" && item.results) {
        completeSnapshot.push({
          id: idCounter++,
          activity: item.activity,
          good: item.good,
          need: item.need,
          reject: item.reject,
          periode: item.periode,
          status: item.status,
          content: item.content,
          useButtons: item.useButtons,
          isGroupHeader: item.isGroupHeader,
          isSubItem: item.isSubItem,
          groupName: item.groupName,
          results: item.results ?? "",
          user: item.user || username,
          time: item.time || nowTimeStr(),
          done: !!item.results,
          hourSlot: "",
          timeSlot: "",
          evaluatedResult: item.evaluatedResult || ""
        });

        console.log(`Added custom item: ${item.activity} = ${item.results}`);
      }
    });

    // === UPDATE EXPIRY TIME SEMUA SLOT ===
    const updatedExpiry = { ...dataExpiryTimes };
    Object.keys(hourlyData).forEach(slot => {
      updatedExpiry[`hourly_${slot}`] = getNextShift1CutoffTs();
    });
    Object.keys(saved30MinData).forEach(slot => {
      updatedExpiry[`30min_${slot}`] = getNextShift1CutoffTs();
    });
    setDataExpiryTimes(updatedExpiry);

    // === SIMPAN KE STORAGE ===
    const hourlyKey = getStorageKey("hourly");
    const thirtyMinKey = getStorageKey("30min");
    const expiryKey = getStorageKey("expiry");

    // Convert hourlyData ke format array untuk storage
    const hourlyForStorage = {};
    Object.keys(hourlyData).forEach(slot => {
      hourlyForStorage[slot] = Object.keys(hourlyData[slot]).map(activity => ({
        activity,
        ...hourlyData[slot][activity]
      }));
    });

    AsyncStorage.setItem(hourlyKey, JSON.stringify(hourlyForStorage));
    AsyncStorage.setItem(thirtyMinKey, JSON.stringify(saved30MinData));
    AsyncStorage.setItem(expiryKey, JSON.stringify(updatedExpiry));

    console.log("=== COMPLETE SNAPSHOT SUMMARY ===");
    console.log(`Total items in snapshot: ${completeSnapshot.length}`);
    console.log(`Hourly slots with data: ${Object.keys(hourlyData).filter(s => Object.keys(hourlyData[s]).length > 0).join(", ")}`);
    console.log(`30min slots with data: ${Object.keys(saved30MinData).filter(s => saved30MinData[s]?.length > 0).join(", ")}`);

    // RETURN COMPLETE SNAPSHOT untuk submit
    return completeSnapshot;
  }, [
    hourlyData, saved30MinData, inspectionData, dataExpiryTimes,
    selectedHourlySlot, selected30MinSlot, username, getNextShift1CutoffTs, getStorageKey
  ]);

  const clearAllSavedData = useCallback(async () => {
    console.log("clearAllSavedData called but data will NOT be cleared to maintain persistence");
    setHasUnsavedData(false);
  }, []);

  const generateHourlySlots = () => {
    const currentShift = shift || getCurrentShift();
    const slots = [];
    if (currentShift === "Shift 1") for (let i = 6; i <= 14; i++) slots.push(`${String(i).padStart(2, "0")}:00`);
    else if (currentShift === "Shift 2") for (let i = 14; i <= 22; i++) slots.push(`${String(i).padStart(2, "0")}:00`);
    else {
      [22, 23, 0, 1, 2, 3, 4, 5, 6].forEach(h => slots.push(`${String(h).padStart(2, "0")}:00`));
    }
    return slots;
  };

  const generate30MinSlots = (hourSlot) => {
    if (!hourSlot) return [];
    const hour = parseInt(hourSlot.split(":")[0], 10);
    const nextHour = (hour + 1) % 24;
    return [
      `${String(hour).padStart(2, "0")}:00 - ${String(hour).padStart(2, "0")}:30`,
      `${String(hour).padStart(2, "0")}:30 - ${String(nextHour).padStart(2, "0")}:00`,
    ];
  };

  const getCurrentHourSlot = () => {
    const now = moment().tz("Asia/Jakarta");
    const hour = now.hour();
    const currentShift = shift || getCurrentShift();
    if (currentShift === "Shift 1" && hour >= 6 && hour <= 14) return `${String(hour).padStart(2, "0")}:00`;
    if (currentShift === "Shift 2" && hour >= 14 && hour <= 22) return `${String(hour).padStart(2, "0")}:00`;
    if (currentShift === "Shift 3") {
      if (hour >= 22 && hour <= 23) return `${String(hour).padStart(2, "0")}:00`;
      if (hour >= 0 && hour <= 6) return `${String(hour).padStart(2, "0")}:00`;
    }
    return null;
  };

  const getCurrent30MinSlot = () => {
    const now = moment().tz("Asia/Jakarta");
    const hour = now.hour();
    const minute = now.minute();
    const nextHour = (hour + 1) % 24;
    return minute < 30
      ? `${String(hour).padStart(2, "0")}:00 - ${String(hour).padStart(2, "0")}:30`
      : `${String(hour).padStart(2, "0")}:30 - ${String(nextHour).padStart(2, "0")}:00`;
  };

  const is30SlotAccessible = (slot) => {
    const now = moment().tz("Asia/Jakarta");
    const [startStr, endStr] = slot.split("-").map(s => s.trim());
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);
    const start = now.clone().hour(sh).minute(sm).second(0).millisecond(0);
    const end = now.clone().hour(eh).minute(em).second(0).millisecond(0);
    return end.isSameOrBefore(now) || (now.isSameOrAfter(start) && now.isBefore(end));
  };

  const isSlotAccessible = (slot) => {
    const currentHour = moment().tz("Asia/Jakarta").hour();
    const slotHour = parseInt(slot.split(":")[0], 10);
    const currentShift = shift || getCurrentShift();
    if (currentShift === "Shift 1") return slotHour >= 6 && slotHour <= currentHour && currentHour <= 14;
    if (currentShift === "Shift 2") return slotHour >= 14 && slotHour <= currentHour && currentHour <= 22;
    if (currentShift === "Shift 3") {
      if (currentHour >= 22) return slotHour >= 22 || slotHour <= 6;
      if (currentHour <= 6) return (slotHour >= 22 && slotHour <= 23) || (slotHour >= 0 && slotHour <= currentHour);
    }
    return false;
  };

  useEffect(() => {
    setShift(parentShift || getCurrentShift());
    if (!isUserActive && !hasUnsavedData && !isManualSelection) {
      const now = moment().tz("Asia/Jakarta");
      const hour = now.hour();
      let slot = "";
      const currentShift = parentShift || getCurrentShift();
      if (currentShift === "Shift 1" && hour >= 6 && hour <= 14) slot = `${String(hour).padStart(2, "0")}:00`;
      else if (currentShift === "Shift 2" && hour >= 14 && hour <= 22) slot = `${String(hour).padStart(2, "0")}:00`;
      else if (currentShift === "Shift 3") {
        if (hour >= 22 && hour <= 23) slot = `${String(hour).padStart(2, "0")}:00`;
        else if (hour >= 0 && hour <= 6) slot = `${String(hour).padStart(2, "0")}:00`;
      }
      if (slot && slot !== selectedHourlySlot) {
        selectedHourlySlotRef.current = slot;
        setSelectedHourlySlot(slot);
      }
      if (slot) {
        const auto30 = getDefault30MinSlot(slot);
        if (auto30 && auto30 !== selected30MinSlot) {
          selected30MinSlotRef.current = auto30;
          setSelected30MinSlot(auto30);
        }
      }
    }
    const interval = setInterval(() => {
      checkTimeAlerts();
      if (!parentShift) setShift(getCurrentShift());
      if (hasUnsavedData) { saveDataBeforeSubmit(); setHasUnsavedData(false); }
    }, 60000);
    return () => clearInterval(interval);
  }, [
    lastHourCheck, last30MinCheck, parentShift, isUserActive, hasUnsavedData,
    selectedHourlySlot, selected30MinSlot, isManualSelection, lastManualSelectionTime
  ]);

  useEffect(() => {
    if (!isManualSelection) return;
    const t = setTimeout(() => setIsManualSelection(false), 10 * 60 * 1000);
    return () => clearTimeout(t);
  }, [isManualSelection, lastManualSelectionTime]);

  useEffect(() => {
    if (!selectedHourlySlot) return;
    const auto30 = getDefault30MinSlot(selectedHourlySlot);
    if (auto30 && auto30 !== selected30MinSlot) {
      selected30MinSlotRef.current = auto30;
      setSelected30MinSlot(auto30);
    }
  }, [selectedHourlySlot]);

  const checkTimeAlerts = () => {
    const now = moment().tz("Asia/Jakarta");
    const currentMinute = now.minute();
    const currentHour = now.hour();
    if (currentMinute === 0 && lastHourCheck !== currentHour) {
      Alert.alert("Pengingat Pemeriksaan Per Jam", "Saatnya melakukan pemeriksaan parameter mesin per jam!", [
        { text: "OK", onPress: () => setLastHourCheck(currentHour) },
      ]);
    }
    if ((currentMinute === 0 || currentMinute === 30) && last30MinCheck !== `${currentHour}:${currentMinute}`) {
      Alert.alert("Pengingat Pemeriksaan 30 Menit", "Saatnya melakukan pemeriksaan kondisi mesin per 30 menit!", [
        { text: "OK", onPress: () => setLast30MinCheck(`${currentHour}:${currentMinute}`) },
      ]);
    }
  };

  const fetchInspection = async () => {
    try {
      setLoading(true);
      console.log(`Fetching GNR data for: Plant=${plant}, Line=${line}, Machine=${machine}, Type=${type}`);
      const response = await api.get(
        `/gnr-master?plant=${encodeURIComponent(plant)}&line=${encodeURIComponent(line)}&machine=${encodeURIComponent(machine)}&type=${encodeURIComponent(type)}`
      );
      const fetched = Array.isArray(response.data) ? response.data : [];

      const visibleData = fetched.filter(item => item.visibility !== false);
      console.log(`Found ${fetched.length} total records, ${visibleData.length} visible for Line ${line}`);

      if (visibleData.length === 0) {
        console.warn("No data from API for selected line");
        Alert.alert(
          "Data Tidak Ditemukan",
          `Tidak ada data master GNR untuk:\nPlant: ${plant}\nLine: ${line}\nMachine: ${machine}\nType: ${type}\n\nSilakan hubungi admin untuk menambahkan data master.`,
          [{ text: "OK" }]
        );
        setInspectionData([]);
        return;
      }

      // Map data dari API
      const baseTemplate = visibleData.map((dbItem) => {
        const isGroupHeader = /^\d+\.\s+[A-Z]+$/.test(dbItem.activity?.trim() || "");
        const isSubItem = /^[a-z]\.\s+/.test(dbItem.activity?.trim() || "");

        let groupName = "";
        if (isGroupHeader) {
          const match = dbItem.activity.match(/^\d+\.\s+([A-Z]+)$/);
          groupName = match ? match[1] : "";
        } else if (isSubItem) {
          groupName = extractGroupNameForSubItem(dbItem.activity, visibleData);
        }

        const needsButtons = dbItem.status === 0 && (
          dbItem.activity?.toLowerCase().includes("level") ||
          dbItem.activity?.toLowerCase().includes("secondary water") ||
          dbItem.good?.toLowerCase() === "di garis hitam" ||
          dbItem.good?.toLowerCase() === "normal" ||
          dbItem.good?.toLowerCase() === "tidak dripping"
        );

        return {
          activity: dbItem.activity || "",
          good: dbItem.good || "-",
          reject: dbItem.reject || "-",
          need: dbItem.need || "-",
          periode:
            dbItem.frekuensi === "Tiap Jam" || dbItem.frekuensi === "30 menit"
              ? dbItem.frekuensi
              : dbItem.frekuensi
                ? dbItem.frekuensi
                : "Tiap Jam",
          status: dbItem.status !== undefined ? dbItem.status : 1,
          content: dbItem.content || "",
          results: "",
          done: false,
          user: "",
          time: "",
          timeSlot: "",
          hourSlot: "",
          evaluatedResult: "",
          useButtons: needsButtons,
          isGroupHeader: isGroupHeader,
          isSubItem: isSubItem,
          groupName: groupName
        };
      });

      let mergedData = baseTemplate;
      const paramsChanged =
        previousMachineRef.current !== machine ||
        previousTypeRef.current !== type;

      if (!paramsChanged && initialData && initialData.length > 0) {
        mergedData = baseTemplate.map(item => {
          const existingData = initialData.find(d => d.activity === item.activity);
          if (existingData && existingData.results) {
            return {
              ...item,
              results: existingData.results || "",
              user: existingData.user || "",
              time: existingData.time || "",
              done: existingData.done || false,
              hourSlot: existingData.hourSlot || "",
              timeSlot: existingData.timeSlot || "",
              evaluatedResult: existingData.evaluatedResult || ""
            };
          }
          return item;
        });
      }

      setInspectionData(mergedData);
      previousMachineRef.current = machine;
      previousTypeRef.current = type;

      console.log(`Loaded ${mergedData.length} inspection items for Line ${line} (${visibleData.length} visible / ${fetched.length} total from master)`);
    } catch (error) {
      console.error("Error fetching inspection data:", error);
      Alert.alert(
        "Error",
        "Gagal mengambil data master GNR dari server. Silakan coba lagi atau hubungi admin.",
        [{ text: "OK" }]
      );
      setInspectionData([]);

      setTimeout(() => {
        if (Object.keys(hourlyData).length > 0 || Object.keys(saved30MinData).length > 0) {
          console.log("Re-applying saved data after fetch...");
          loadSavedData();
        }
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (plant && line && machine && type && isDataLoaded) {
      console.log(`Triggering fetch for Line ${line}...`);
      fetchInspection();
    }
  }, [plant, line, machine, type, isDataLoaded]);

  useEffect(() => {
    const fetchInspectionWithLoading = async () => {
      try {
        setLoadingInspection(true);
        console.log(`Fetching GNR data for Line ${line}, Machine ${machine}, Type ${type}`);
        await fetchInspection();
      } finally {
        setLoadingInspection(false);
      }
    };

    globalThis.gnrForceRefresh = () => {
      console.log(`Force refreshing GNR data for Line ${line}...`);
      if (plant && line && machine && type) {
        fetchInspectionWithLoading();
      }
    };

    return () => {
      globalThis.gnrForceRefresh = null;
    };
  }, [plant, line, machine, type]);

  const parseRange = (rangeStr) => {
    if (!rangeStr || rangeStr === "-") return null;
    const single = rangeStr.match(/([<>=]+)\s*(\d+(?:\.\d+)?)/);
    if (single) {
      const operator = single[1];
      const value = parseFloat(single[2]);
      return { type: "single", operator, value };
    }
    if (rangeStr.includes(" - ")) {
      const parts = rangeStr.split(" - ");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        const max = parseFloat(parts[1]);
        if (!isNaN(min) && !isNaN(max)) return { type: "range", min, max };
      }
    }
    return null;
  };

  const parseReject = (rejectStr) => {
    if (!rejectStr || rejectStr === "-") return null;
    if (rejectStr.includes(" / ")) {
      const parts = rejectStr.split(" / ");
      const conditions = [];
      parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.startsWith(">=")) { const v = parseFloat(trimmed.substring(2)); if (!isNaN(v)) conditions.push({ operator: ">=", value: v }); }
        else if (trimmed.startsWith("<")) { const v = parseFloat(trimmed.substring(1)); if (!isNaN(v)) conditions.push({ operator: "<", value: v }); }
        else if (trimmed.startsWith(">")) { const v = parseFloat(trimmed.substring(1)); if (!isNaN(v)) conditions.push({ operator: ">", value: v }); }
      });
      return conditions;
    }
    return null;
  };

  const evaluateValue = (inputValue, goodCriteria, rejectCriteria) => {
    if (!inputValue || inputValue === "") return "default";
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) return "default";
    const goodRange = parseRange(goodCriteria);
    const rejectConditions = parseReject(rejectCriteria);
    if (rejectConditions && rejectConditions.length > 0) {
      for (const condition of rejectConditions) {
        if (condition.operator === "<" && numValue < condition.value) return "reject";
        if (condition.operator === ">" && numValue > condition.value) return "reject";
        if (condition.operator === ">=" && numValue >= condition.value) return "reject";
      }
    }
    if (goodRange) {
      if (goodRange.type === "range") {
        if (numValue >= goodRange.min && numValue <= goodRange.max) return "good";
      } else if (goodRange.type === "single") {
        if (goodRange.operator === "<" && numValue < goodRange.value) return "good";
        if (goodRange.operator === ">=" && numValue >= goodRange.value) return "good";
      }
    }
    return "need";
  };

  // Evaluate value untuk data per jam
  const evaluateHourlyValue = (activity, hourSlot = selectedHourlySlot) => {
    const value = getHourlyValue(activity, hourSlot);
    const item = inspectionData.find(item => item.activity === activity);
    if (!item) return "default";

    if (item.useButtons) {
      return value === "OK" ? "good" : value === "NOT OK" ? "reject" : "default";
    }

    return evaluateValue(value, item.good, item.reject);
  };

  const calculateGroupStatus = (groupName, currentSlot) => {
    const groupItems = inspectionData.filter(item =>
      item.groupName === groupName && item.isSubItem && (!currentSlot || item.timeSlot === currentSlot)
    );
    if (groupItems.length === 0) return "";
    const filledItems = groupItems.filter(item => item.results && item.results !== "");
    if (filledItems.length === 0) return "";
    if (filledItems.some(item => item.results === "R")) return "R";
    if (filledItems.some(item => item.results === "N")) return "N";
    if (filledItems.length === groupItems.length && filledItems.every(item => item.results === "G")) return "G";
    return "";
  };

  const isWithinHourWindow = (timeStr, hourSlot) => {
    if (!timeStr || !hourSlot) return null;
    const parsed = parseHM(timeStr);
    if (!parsed) return null;
    const { h, min } = parsed;
    const now = moment().tz("Asia/Jakarta");
    const t = now.clone().hour(h).minute(min).second(0).millisecond(0);
    const [slotHour] = hourSlot.split(":");
    const start = now.clone().hour(parseInt(slotHour, 10)).minute(0).second(0).millisecond(0);
    const end = start.clone().add(1, "hour");
    return t.isSameOrAfter(start) && t.isBefore(end);
  };

  const getBackgroundColor = (item) => {
    if (item.periode === "Tiap Jam") {
      const evaluatedResult = hourlyData[selectedHourlySlot]?.[item.activity]?.evaluatedResult || "";
      if (evaluatedResult === "R") return "#ffd6d6";
      if (evaluatedResult === "N") return "#fff7cc";
      if (evaluatedResult === "G") return "#c8ecd4";
      return "#fff";
    }

    if (item.isGroupHeader && item.groupName) {
      const groupStatus = calculateGroupStatus(item.groupName, selected30MinSlotRef.current || selected30MinSlot);
      if (groupStatus === "R") return "#ffd6d6";
      if (groupStatus === "N") return "#fff7cc";
      if (groupStatus === "G") return "#c8ecd4";
      return "#e8f4f8";
    }

    if (item.results === "R" || item.results === "Reject") return "#ffd6d6";
    if (item.results === "N" || item.results === "Need") return "#fff7cc";
    if (item.results === "G" || item.results === "Good") return "#c8ecd4";
    return "#fff";
  };

  const getTextColor = (bg) => {
    if (bg === "#ffd6d6") return "#a94442";
    if (bg === "#fff7cc") return "#8a6d3b";
    if (bg === "#c8ecd4") return "#207a3c";
    return "#333";
  };

  const getTimelinessBorder = (item) => {
    if (item.periode !== "Tiap Jam" || !getHourlyValue(item.activity)) return {};
    const timeValue = hourlyData[selectedHourlySlot]?.[item.activity]?.time || "";
    const ok = isWithinHourWindow(timeValue, selectedHourlySlot);
    if (ok === null) return {};
    return { borderLeftWidth: 4, borderLeftColor: ok ? "#28a745" : "#dc3545" };
  };

  const getFilteredHourlyData = () => inspectionData.filter(item => item.periode === "Tiap Jam");
  const getFiltered30MinData = () => inspectionData.filter(item => item.periode === "30 menit");

  const getFilteredCustomData = () =>
    inspectionData.filter(item => item.periode !== "Tiap Jam" && item.periode !== "30 menit");

  const handleInputChange = useCallback((text, index) => {
    updateUserActivity();
    setInspectionData(prevData => {
      const updated = [...prevData];
      const item = updated[index];
      const targetHourlySlot = item.periode === "Tiap Jam"
        ? (item.hourSlot || selectedHourlySlotRef.current || selectedHourlySlot)
        : null;
      const target30MinSlot = item.periode === "30 menit"
        ? (item.timeSlot || selected30MinSlotRef.current || selected30MinSlot)
        : null;

      if (item.periode === "Tiap Jam" && !targetHourlySlot) return prevData;
      if (item.periode === "30 menit" && !target30MinSlot) return prevData;

      const nextItem = { ...item, results: text };

      if (item.periode === "Tiap Jam") {
        nextItem.hourSlot = targetHourlySlot;
        nextItem.user = username;
        nextItem.time = nowTimeStr();
        nextItem.done = !!text;

        // EVALUATE VALUE DAN SIMPAN KE HOURLY DATA
        let evaluatedResult = "";
        if (!item.useButtons) {
          const ev = evaluateValue(text, item.good, item.reject);
          evaluatedResult = ev === "good" ? "G" : ev === "reject" ? "R" : ev === "need" ? "N" : "";
        } else {
          evaluatedResult = text === "OK" ? "G" : text === "NOT OK" ? "R" : "";
        }

        // SIMPAN KE HOURLY DATA STRUCTURE
        setHourlyValue(item.activity, text, targetHourlySlot);

        // UPDATE EVALUATED RESULT DI HOURLY DATA dan IMMEDIATE SAVE
        setHourlyData(prev => {
          const newData = {
            ...prev,
            [targetHourlySlot]: {
              ...prev[targetHourlySlot],
              [item.activity]: {
                ...prev[targetHourlySlot]?.[item.activity],
                evaluatedResult,
                results: text,
                user: username,
                time: nowTimeStr(),
                done: !!text,
                hourSlot: targetHourlySlot
              }
            }
          };

          // IMMEDIATE SAVE ke AsyncStorage
          const hourlyKey = getStorageKey("hourly");
          const hourlyDataForStorage = {};
          Object.keys(newData).forEach(slot => {
            hourlyDataForStorage[slot] = Object.keys(newData[slot]).map(activity => ({
              activity,
              ...newData[slot][activity]
            }));
          });
          AsyncStorage.setItem(hourlyKey, JSON.stringify(hourlyDataForStorage))
            .then(() => console.log("Hourly data saved immediately"))
            .catch(err => console.error("Error saving hourly data:", err));

          return newData;
        });

      } else if (item.periode === "30 menit") {
        nextItem.timeSlot = target30MinSlot;
        nextItem.user = username;
        nextItem.time = nowTimeStr();
        nextItem.done = !!text;

        // SIMPAN KE saved30MinData
        setSaved30MinData(prev => {
          const newData = { ...prev };
          if (!newData[target30MinSlot]) {
            newData[target30MinSlot] = [];
          }

          // Cari dan update atau tambah baru
          const existingIdx = newData[target30MinSlot].findIndex(x => x.activity === item.activity);
          const newEntry = {
            activity: item.activity,
            results: text,
            user: username,
            time: nowTimeStr(),
            done: !!text,
            timeSlot: target30MinSlot,
            evaluatedResult: ""
          };

          if (existingIdx >= 0) {
            newData[target30MinSlot][existingIdx] = newEntry;
          } else {
            newData[target30MinSlot].push(newEntry);
          }

          // IMMEDIATE SAVE ke AsyncStorage
          const thirtyMinKey = getStorageKey("30min");
          AsyncStorage.setItem(thirtyMinKey, JSON.stringify(newData))
            .then(() => console.log("30min data saved immediately"))
            .catch(err => console.error("Error saving 30min data:", err));

          return newData;
        });
      }

      // Handle custom data (non-hourly, non-30min)
      if (item.periode !== "Tiap Jam" && item.periode !== "30 menit") {
        nextItem.user = username;
        nextItem.time = nowTimeStr();
        nextItem.done = !!text;
        const ev = evaluateValue(text, item.good, item.reject);
        nextItem.evaluatedResult =
          ev === "good" ? "G" :
            ev === "reject" ? "R" :
              ev === "need" ? "N" : "";

        const customKey = getStorageKey("custom");
        const payload = {
          activity: nextItem.activity,
          results: nextItem.results || "",
          user: nextItem.user || username,
          time: nextItem.time || nowTimeStr(),
          done: nextItem.done || !!nextItem.results,
          evaluatedResult: nextItem.evaluatedResult || "",
          periode: nextItem.periode,
        };

        AsyncStorage.getItem(customKey)
          .then((existing) => {
            let parsed = [];
            if (existing) parsed = JSON.parse(existing);
            const idx = parsed.findIndex((x) => x.activity === payload.activity);
            if (idx >= 0) parsed[idx] = payload;
            else parsed.push(payload);
            AsyncStorage.setItem(customKey, JSON.stringify(parsed));
          })
          .catch((err) => console.error("Error saving custom GNR:", err));
      }

      updated[index] = nextItem;
      setHasUnsavedData(true);
      return updated;
    });
  }, [selectedHourlySlot, selected30MinSlot, username]);

  useEffect(() => {
    globalThis.gnrBeforeSubmit = saveDataBeforeSubmit;
    globalThis.gnrAfterSubmitClear = () => {
      console.log("gnrAfterSubmitClear called - data will NOT be cleared");
    };
  }, [saveDataBeforeSubmit, clearAllSavedData]);

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (Object.keys(hourlyData).length > 0 || inspectionData.some(item => item.results)) {
        saveDataBeforeSubmit();
      }
    }, 30000);
    return () => {
      if (globalThis.inactivityTimer) { clearTimeout(globalThis.inactivityTimer); globalThis.inactivityTimer = null; }
      clearInterval(autoSaveInterval);
    };
  }, [saveDataBeforeSubmit, hourlyData, inspectionData]);

  useEffect(() => {
    if (isDataLoaded && inspectionData.length > 0 && (Object.keys(hourlyData).length > 0 || Object.keys(saved30MinData).length > 0)) {
      loadSavedData();
    }
  }, [isDataLoaded, inspectionData.length]);

  useEffect(() => {
    if (inspectionData.length > 0 && (selectedHourlySlot || selected30MinSlot)) {
      if (!isUserActive && !hasUnsavedData) {
        loadSavedData();
      }
    }
  }, [selectedHourlySlot, selected30MinSlot, isUserActive, hasUnsavedData]);

  // ============================================
  // onDataChange - Kirim COMPLETE SNAPSHOT dari semua jam
  // ============================================
  useEffect(() => {
    // Build complete snapshot untuk dikirim ke parent
    const buildCompleteSnapshotForParent = () => {
      const completeSnapshot = [];
      let idCounter = 1;

      // 1) DATA TIAP JAM - dari SEMUA slot
      Object.keys(hourlyData).forEach(slot => {
        const slotData = hourlyData[slot];
        if (!slotData) return;

        Object.keys(slotData).forEach(activity => {
          const itemData = slotData[activity];
          const baseItem = inspectionData.find(item => item.activity === activity);

          if (baseItem && itemData && (itemData.results || itemData.results === 0 || itemData.results === "0")) {
            completeSnapshot.push({
              id: idCounter++,
              activity: baseItem.activity,
              good: baseItem.good,
              need: baseItem.need,
              reject: baseItem.reject,
              periode: baseItem.periode,
              status: baseItem.status,
              content: baseItem.content,
              useButtons: baseItem.useButtons,
              isGroupHeader: baseItem.isGroupHeader,
              isSubItem: baseItem.isSubItem,
              groupName: baseItem.groupName,
              results: itemData.results ?? "",
              user: itemData.user || username,
              time: itemData.time || nowTimeStr(),
              done: !!itemData.results,
              hourSlot: slot,
              timeSlot: "",
              evaluatedResult: itemData.evaluatedResult || ""
            });
          }
        });
      });

      // 2) DATA 30 MENIT - dari SEMUA slot
      Object.keys(saved30MinData).forEach(slot => {
        const slotItems = saved30MinData[slot];
        if (!Array.isArray(slotItems)) return;

        slotItems.forEach(itemData => {
          const baseItem = inspectionData.find(item => item.activity === itemData.activity);

          if (baseItem && itemData && itemData.results) {
            completeSnapshot.push({
              id: idCounter++,
              activity: baseItem.activity,
              good: baseItem.good,
              need: baseItem.need,
              reject: baseItem.reject,
              periode: baseItem.periode,
              status: baseItem.status,
              content: baseItem.content,
              useButtons: baseItem.useButtons,
              isGroupHeader: baseItem.isGroupHeader,
              isSubItem: baseItem.isSubItem,
              groupName: baseItem.groupName,
              results: itemData.results ?? "",
              user: itemData.user || username,
              time: itemData.time || nowTimeStr(),
              done: true,
              hourSlot: "",
              timeSlot: slot,
              evaluatedResult: itemData.evaluatedResult || ""
            });
          }
        });
      });

      // 3) DATA CUSTOM
      inspectionData.forEach(item => {
        if (item.periode !== "Tiap Jam" && item.periode !== "30 menit" && item.results) {
          completeSnapshot.push({
            id: idCounter++,
            activity: item.activity,
            good: item.good,
            need: item.need,
            reject: item.reject,
            periode: item.periode,
            status: item.status,
            content: item.content,
            useButtons: item.useButtons,
            isGroupHeader: item.isGroupHeader,
            isSubItem: item.isSubItem,
            groupName: item.groupName,
            results: item.results ?? "",
            user: item.user || username,
            time: item.time || nowTimeStr(),
            done: !!item.results,
            hourSlot: "",
            timeSlot: "",
            evaluatedResult: item.evaluatedResult || ""
          });
        }
      });

      return completeSnapshot;
    };

    const snapshot = buildCompleteSnapshotForParent();
    onDataChange?.(snapshot);
  }, [hourlyData, saved30MinData, inspectionData, onDataChange, username]);

  return (
    <View style={styles.container}>
      {loadingInspection ? (
        <View style={{ padding: 20, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, color: "#555" }}>
            🔄 Loading GNR data for Line {line}...
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading inspection data...</Text>
        </View>
      ) : inspectionData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tidak ada data master GNR untuk line ini.</Text>
          <Text style={styles.emptySubText}>Silakan pilih line lain atau hubungi admin.</Text>
        </View>
      ) : (
        <>
          <View style={styles.shiftInfo}>
            <Text style={styles.shiftText}>Shift Aktif: {shift}</Text>
            <Text style={styles.shiftTimeText}>
              {shift === "Shift 1" && "(06:00 - 14:00)"}
              {shift === "Shift 2" && "(14:00 - 22:00)"}
              {shift === "Shift 3" && "(22:00 - 06:00)"}
            </Text>
          </View>

          <View style={styles.toggleRowWrapper}>
            <TouchableOpacity style={[styles.toggleButton, showHourlyTable && styles.toggleButtonActive]} onPress={() => setShowHourlyTable(p => !p)}>
              <Text style={styles.toggleButtonText}>
                {showHourlyTable ? "Sembunyikan Pemeriksaan Per Jam" : "Tampilkan Pemeriksaan Per Jam"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleButton, show30MinTable && styles.toggleButtonActive]} onPress={() => setShow30MinTable(p => !p)}>
              <Text style={styles.toggleButtonText}>
                {show30MinTable ? "Sembunyikan Pemeriksaan Per 30 Menit" : "Tampilkan Pemeriksaan Per 30 Menit"}
              </Text>
            </TouchableOpacity>
          </View>

          {showHourlyTable && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PEMERIKSAAN PER JAM</Text>
                <View style={styles.timeSlotContainer}>
                  <Text style={styles.timeSlotLabel}>Jam:</Text>
                  <View style={styles.timeSlotGrid}>
                    {generateHourlySlots().map((slot) => {
                      const isAccessible = isSlotAccessible(slot);
                      const isCurrentSlot = slot === selectedHourlySlot;
                      const hasData = !!hourlyData[slot] && Object.keys(hourlyData[slot]).length > 0;
                      const hasUnsaved = hasUnsavedData && slot === selectedHourlySlot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[
                            styles.hourlySlotButton,
                            isCurrentSlot && styles.timeSlotButtonActive,
                            !isAccessible && styles.timeSlotButtonLocked,
                            hasData && styles.timeSlotButtonWithData,
                            hasUnsaved && styles.timeSlotButtonUnsaved
                          ]}
                          disabled={!isAccessible}
                          onPress={() => handleHourlySlotSelection(slot)}
                        >
                          <Text style={[
                            styles.timeSlotText,
                            isCurrentSlot && styles.timeSlotTextActive,
                            !isAccessible && styles.timeSlotTextLocked
                          ]}>
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {selectedHourlySlot && (
                <View style={styles.table}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.tableCaption, { width: "30%" }]}>Activity</Text>
                    <Text style={[styles.tableCaption, { width: "10%" }]}>G</Text>
                    <Text style={[styles.tableCaption, { width: "10%" }]}>N</Text>
                    <Text style={[styles.tableCaption, { width: "10%" }]}>R</Text>
                    <Text style={[styles.tableCaption, { width: "15%" }]}>Periode</Text>
                    <Text style={[styles.tableCaption, { width: "25%" }]}>Hasil</Text>
                  </View>

                  {getFilteredHourlyData().map((item, index) => {
                    const originalIndex = inspectionData.findIndex(data => data === item);
                    const backgroundColor = getHourlyBackgroundColor(item, selectedHourlySlot);
                    const textColor = getTextColor(backgroundColor);
                    const currentValue = getHourlyValue(item.activity, selectedHourlySlot);

                    return (
                      <View key={`hourly-${index}`} style={[styles.tableBody, { backgroundColor }, getTimelinessBorder(item)]}>
                        <View style={{ width: "30%" }}>
                          <Text style={[styles.tableData, { color: textColor }]}>{item.activity}</Text>
                        </View>
                        <View style={{ width: "10%" }}>
                          <Text style={[styles.tableData, { color: textColor }]}>{item.good || "-"}</Text>
                        </View>
                        <View style={{ width: "10%" }}>
                          <Text style={[styles.tableData, { color: textColor }]}>{item.need || "-"}</Text>
                        </View>
                        <View style={{ width: "10%" }}>
                          <Text style={[styles.tableData, { color: textColor }]}>{item.reject || "-"}</Text>
                        </View>
                        <View style={{ width: "15%" }}>
                          <Text style={[styles.tableData, { color: textColor }]}>{item.periode}</Text>
                        </View>
                        <View style={{ width: "25%" }}>
                          <View style={styles.centeredContent}>
                            {item.useButtons ? (
                              <View style={styles.buttonGroup}>
                                <TouchableOpacity
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  style={[
                                    styles.statusButton,
                                    currentValue === "OK" ? styles.statusButtonOK : styles.statusButtonInactive,
                                    currentValue === "OK" && styles.statusButtonActive,
                                    currentValue === "OK" && styles.statusButtonOKActive,
                                  ]}
                                  onPress={() => {
                                    const newValue = currentValue === "OK" ? "" : "OK";
                                    setHourlyValue(item.activity, newValue, selectedHourlySlot);

                                    // Update evaluated result
                                    const evaluatedResult = newValue === "OK" ? "G" : "";
                                    setHourlyData(prev => ({
                                      ...prev,
                                      [selectedHourlySlot]: {
                                        ...prev[selectedHourlySlot],
                                        [item.activity]: {
                                          ...prev[selectedHourlySlot]?.[item.activity],
                                          evaluatedResult,
                                          results: newValue,
                                          user: username,
                                          time: nowTimeStr(),
                                          done: !!newValue,
                                          hourSlot: selectedHourlySlot
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <Text numberOfLines={1} style={[styles.statusButtonText, currentValue === "OK" && styles.statusButtonTextActive]}>OK</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  style={[
                                    styles.statusButton,
                                    currentValue === "NOT OK" ? styles.statusButtonNotOK : styles.statusButtonInactive,
                                    currentValue === "NOT OK" && styles.statusButtonActive,
                                    currentValue === "NOT OK" && styles.statusButtonNotOKActive,
                                  ]}
                                  onPress={() => {
                                    const newValue = currentValue === "NOT OK" ? "" : "NOT OK";
                                    setHourlyValue(item.activity, newValue, selectedHourlySlot);

                                    // Update evaluated result
                                    const evaluatedResult = newValue === "NOT OK" ? "R" : "";
                                    setHourlyData(prev => ({
                                      ...prev,
                                      [selectedHourlySlot]: {
                                        ...prev[selectedHourlySlot],
                                        [item.activity]: {
                                          ...prev[selectedHourlySlot]?.[item.activity],
                                          evaluatedResult,
                                          results: newValue,
                                          user: username,
                                          time: nowTimeStr(),
                                          done: !!newValue,
                                          hourSlot: selectedHourlySlot
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <Text numberOfLines={1} style={[styles.statusButtonText, currentValue === "NOT OK" && styles.statusButtonTextActive]}>NOT OK</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TextInput
                                style={styles.input}
                                value={currentValue}
                                placeholder={isNumericItem(item) ? "_ _ _" : "isi disini"}
                                keyboardType={isNumericItem(item) ? "decimal-pad" : "default"}
                                inputMode={isNumericItem(item) ? "decimal" : "text"}
                                returnKeyType="done"
                                selectTextOnFocus
                                onChangeText={(text) => {
                                  const value = isNumericItem(item) ? sanitizeDecimal(text) : text;
                                  setHourlyValue(item.activity, value, selectedHourlySlot);

                                  // Evaluate dan update evaluated result
                                  const ev = evaluateValue(value, item.good, item.reject);
                                  const evaluatedResult = ev === "good" ? "G" : ev === "reject" ? "R" : ev === "need" ? "N" : "";

                                  setHourlyData(prev => ({
                                    ...prev,
                                    [selectedHourlySlot]: {
                                      ...prev[selectedHourlySlot],
                                      [item.activity]: {
                                        ...prev[selectedHourlySlot]?.[item.activity],
                                        evaluatedResult,
                                        results: value,
                                        user: username,
                                        time: nowTimeStr(),
                                        done: !!value,
                                        hourSlot: selectedHourlySlot
                                      }
                                    }
                                  }));
                                }}
                              />
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {getFilteredCustomData().length > 0 && (
                    <>
                      {getFilteredCustomData().map((item, index) => {
                        const bg = getBackgroundColor(item);
                        const tc = getTextColor(bg);
                        const originalIndex = inspectionData.findIndex((x) => x === item);
                        return (
                          <View
                            key={`custom-inline-${index}`}
                            style={[
                              styles.tableBody,
                              { backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: "#e9ecef" },
                            ]}
                          >
                            <View style={{ width: "30%" }}>
                              <Text style={[styles.tableData, { color: tc }]}>{item.activity}</Text>
                            </View>
                            <View style={{ width: "10%" }}>
                              <Text style={[styles.tableData, { color: tc }]}>{item.good || "-"}</Text>
                            </View>
                            <View style={{ width: "10%" }}>
                              <Text style={[styles.tableData, { color: tc }]}>{item.need || "-"}</Text>
                            </View>
                            <View style={{ width: "10%" }}>
                              <Text style={[styles.tableData, { color: tc }]}>{item.reject || "-"}</Text>
                            </View>
                            <View style={{ width: "15%" }}>
                              <Text style={[styles.tableData, { color: tc }]}>{item.periode}</Text>
                            </View>
                            <TextInput
                              style={[styles.input, { height: 46, paddingVertical: 10, width: "23%" }]}
                              placeholder={isNumericItem(item) ? "_ _ _" : "isi disini"}
                              value={String(item.results ?? "")}
                              keyboardType={isNumericItem(item) ? "decimal-pad" : "default"}
                              inputMode={isNumericItem(item) ? "decimal" : "text"}
                              returnKeyType="done"
                              selectTextOnFocus
                              onChangeText={(text) => {
                                const value = isNumericItem(item)
                                  ? sanitizeDecimal(text)
                                  : text;
                                handleInputChange(value, originalIndex);
                              }}
                            />
                          </View>
                        );
                      })}
                    </>
                  )}
                </View>
              )}
            </>
          )}

          {show30MinTable && (
            <View style={[styles.sectionHeader, { marginTop: 30 }]}>
              <Text style={styles.sectionTitle}>PEMERIKSAAN PER 30 MENIT</Text>
              <View style={styles.timeSlotContainer}>
                <Text style={styles.timeSlotLabel}>Pilih Slot 30 Menit {selectedHourlySlot && `(untuk jam ${selectedHourlySlot})`}:</Text>
                <View style={styles.timeSlotButtons}>
                  {generate30MinSlots(selectedHourlySlotRef.current || selectedHourlySlot || getCurrentHourSlot()).map((slot) => {
                    const canUse = is30SlotAccessible(slot);
                    const isSelected = slot === (selected30MinSlotRef.current || selected30MinSlot);
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.timeSlotButton, isSelected && styles.timeSlotButtonActive, !canUse && styles.timeSlotButtonLocked]}
                        disabled={!canUse}
                        onPress={() => handle30MinSlotSelection(slot)}
                      >
                        <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextActive, !canUse && styles.timeSlotTextLocked]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {selected30MinSlot && show30MinTable && (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[styles.tableCaption, { width: "30%" }]}>Activity</Text>
                <Text style={[styles.tableCaption, { width: "10%" }]}>G</Text>
                <Text style={[styles.tableCaption, { width: "10%" }]}>N</Text>
                <Text style={[styles.tableCaption, { width: "10%" }]}>R</Text>
                <Text style={[styles.tableCaption, { width: "15%" }]}>Periode</Text>
                <Text style={[styles.tableCaption, { width: "25%" }]}>Hasil</Text>
              </View>

              {getFiltered30MinData().map((item, index) => {
                const originalIndex = inspectionData.findIndex(data => data === item);
                const backgroundColor = getBackgroundColor(item);
                const textColor = getTextColor(backgroundColor);
                const groupStatus = (item.isGroupHeader && item.groupName)
                  ? calculateGroupStatus(item.groupName, selected30MinSlotRef.current || selected30MinSlot)
                  : "";

                return (
                  <View key={`halfhourly-${index}`} style={[
                    styles.tableBody,
                    { backgroundColor },
                    item.isGroupHeader && styles.groupHeader,
                    item.isSubItem && { paddingLeft: 20 }
                  ]}>
                    <View style={{ width: "30%" }}>
                      <Text style={[
                        styles.tableData,
                        { color: textColor },
                        item.isGroupHeader && styles.groupHeaderText,
                        item.isSubItem && styles.subItemText
                      ]}>
                        {item.activity}
                      </Text>
                    </View>
                    <View style={{ width: "10%" }}>
                      <Text style={[styles.tableData, { color: textColor }]}>
                        {item.isGroupHeader ? (item.good || "G") : (item.isSubItem ? "" : (item.good || "-"))}
                      </Text>
                    </View>
                    <View style={{ width: "10%" }}>
                      <Text style={[styles.tableData, { color: textColor }]}>
                        {item.isGroupHeader ? (item.need || "N") : (item.isSubItem ? "" : (item.need || "-"))}
                      </Text>
                    </View>
                    <View style={{ width: "10%" }}>
                      <Text style={[styles.tableData, { color: textColor }]}>
                        {item.isGroupHeader ? (item.reject || "R") : (item.isSubItem ? "" : (item.reject || "-"))}
                      </Text>
                    </View>
                    <View style={{ width: "15%" }}>
                      <Text style={[styles.tableData, { color: textColor }]}>
                        {item.isGroupHeader ? "" : item.periode}
                      </Text>
                    </View>
                    <View style={{ width: "25%" }}>
                      <View style={styles.centeredContent}>
                        {item.isGroupHeader ? (
                          <View style={styles.groupHeaderResultsContainer}>
                            <Text style={[styles.groupHeaderResults, { color: textColor, fontWeight: 'bold' }]}>
                              {groupStatus}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.gnrButtonsWrap}>
                            <View style={styles.gnrRow}>
                              <TouchableOpacity
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={[
                                  styles.gnrButton, styles.gnrHalf,
                                  item.results === "G" && styles.gnrButtonG,
                                  item.results === "G" && styles.gnrButtonActive,
                                  item.results === "G" && styles.gnrButtonGActive,
                                  item.results !== "G" && styles.gnrButtonInactive,
                                ]}
                                onPress={() => handleInputChange("G", originalIndex)}
                              >
                                <Text style={[styles.gnrButtonText, item.results === "G" && styles.gnrButtonTextActive]}>G</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={[
                                  styles.gnrButton, styles.gnrHalf,
                                  item.results === "N" && styles.gnrButtonN,
                                  item.results === "N" && styles.gnrButtonActive,
                                  item.results === "N" && styles.gnrButtonNActive,
                                  item.results !== "N" && styles.gnrButtonInactive,
                                ]}
                                onPress={() => handleInputChange("N", originalIndex)}
                              >
                                <Text style={[styles.gnrButtonText, item.results === "N" && styles.gnrButtonTextActive]}>N</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.gnrRowBottom}>
                              <TouchableOpacity
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={[
                                  styles.gnrButton, styles.gnrWideCenter,
                                  item.results === "R" && styles.gnrButtonR,
                                  item.results === "R" && styles.gnrButtonActive,
                                  item.results === "R" && styles.gnrButtonRActive,
                                  item.results !== "R" && styles.gnrButtonInactive,
                                ]}
                                onPress={() => handleInputChange("R", originalIndex)}
                              >
                                <Text style={[styles.gnrButtonText, item.results === "R" && styles.gnrButtonTextActive]}>R</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.progressSummary}>
            <Text style={styles.progressTitle}>Progress Pengisian:</Text>
            <Text style={styles.progressText}>• Slot Per Jam Terisi: {Object.keys(hourlyData).length}/{generateHourlySlots().length}</Text>
            <Text style={styles.progressText}>• Slot 30 Menit Terisi: {Object.keys(saved30MinData).length}/{generateHourlySlots().length * 2}</Text>
            <Text style={[styles.progressText, { marginTop: 5, fontStyle: 'italic' }]}>
              • Data Tersimpan: {Object.keys(hourlyData).length} jam, {Object.keys(saved30MinData).length} slot 30 menit
            </Text>
            {hasUnsavedData && (
              <Text style={[styles.progressText, { marginTop: 5, color: '#ff9800', fontWeight: 'bold' }]}>
                ⚠️ Ada data yang belum tersimpan
              </Text>
            )}
            {isManualSelection && (
              <Text style={[styles.progressText, { marginTop: 5, color: '#2196F3', fontWeight: 'bold' }]}>
                📌 Jam dipilih manual - Auto-pick dinonaktifkan untuk 10 menit
              </Text>
            )}
          </View>
        </>
      )
      }
    </View >
  );
};

const styles = StyleSheet.create({
  container: { width: "100%", marginTop: 20 },
  shiftInfo: { backgroundColor: "#17a2b8", padding: 10, marginBottom: 10, borderRadius: 5, alignItems: "center" },
  shiftText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  shiftTimeText: { color: "#fff", fontSize: 14, marginTop: 2 },
  sectionHeader: { backgroundColor: "#28a745", padding: 15, marginBottom: 10, borderRadius: 5 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", textAlign: "center" },
  timeSlotContainer: { marginTop: 10 },
  timeSlotLabel: { color: "#fff", fontSize: 14, marginBottom: 5 },
  timeSlotGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
  hourlySlotButton: { backgroundColor: "#fff", padding: 8, borderRadius: 5, margin: 3, minWidth: 60, alignItems: "center" },
  timeSlotButtons: { flexDirection: "row", justifyContent: "space-around" },
  timeSlotButton: { backgroundColor: "#fff", padding: 8, borderRadius: 5, flex: 1, marginHorizontal: 5, alignItems: "center" },
  timeSlotButtonActive: { backgroundColor: "#20c997" },
  timeSlotButtonWithData: { borderColor: '#28a745', borderWidth: 2 },
  timeSlotButtonUnsaved: { borderColor: '#ff9800', borderWidth: 3, borderStyle: 'dashed' },
  timeSlotText: { color: '#28a745', fontSize: 12, fontWeight: '500' },
  timeSlotTextActive: { color: '#fff' },
  table: { width: "100%", marginBottom: 20 },
  tableHead: { flexDirection: "row", backgroundColor: "#20c997", padding: 10 },
  tableBody: { flexDirection: "row", padding: 10, borderBottomWidth: 1, borderBottomColor: "#e9ecef" },
  groupHeader: { backgroundColor: "#e8f4f8", borderLeftWidth: 4, borderLeftColor: "#28a745" },
  tableCaption: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  tableData: { fontSize: 14, textAlign: "center" },
  input: { fontSize: 14, textAlign: "center", paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: "#dee2e6", borderRadius: 8, width: "90%", backgroundColor: "#fff" },
  groupHeaderText: { fontWeight: "bold", textAlign: "left" },
  subItemText: { textAlign: "left", paddingLeft: 10 },
  centeredContent: { justifyContent: "center", alignItems: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, backgroundColor: "#f8f9fa", borderRadius: 10, marginTop: 20 },
  emptyText: { fontSize: 16, fontWeight: "bold", color: "#6c757d", textAlign: "center", marginBottom: 10 },
  emptySubText: { fontSize: 14, color: "#6c757d", textAlign: "center" },
  groupHeaderResultsContainer: { width: "100%", height: 40, justifyContent: "center", alignItems: "center" },
  groupHeaderResults: { fontSize: 14, textAlign: "center" },
  progressSummary: { backgroundColor: "#f8f9fa", padding: 15, marginTop: 20, borderRadius: 5, borderWidth: 1, borderColor: "#dee2e6" },
  progressTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  progressText: { fontSize: 14, color: "#6c757d" },
  toggleRowWrapper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, marginTop: 0, gap: 10 },
  toggleButton: { backgroundColor: '#d2fbe6', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, minWidth: 90, alignItems: 'center', justifyContent: 'center', elevation: 1, flexDirection: 'row', marginHorizontal: 2, marginVertical: 0, borderWidth: 1, borderColor: '#b6e9d2' },
  toggleButtonActive: { backgroundColor: '#7be495', borderColor: '#20c997' },
  toggleButtonText: { color: '#207a3c', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  timeSlotButtonLocked: { backgroundColor: '#f7f7f7', opacity: 0.85, borderColor: '#cccccc', borderWidth: 1 },
  timeSlotTextLocked: { color: '#757575', fontWeight: 'bold', textDecorationLine: 'line-through', letterSpacing: 1 },
  buttonGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' },
  statusButton: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 40, minWidth: 82, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  statusButtonOK: { borderColor: '#28a745' },
  statusButtonNotOK: { borderColor: '#dc3545' },
  statusButtonActive: { borderWidth: 2 },
  statusButtonOKActive: { backgroundColor: '#28a745' },
  statusButtonNotOKActive: { backgroundColor: '#dc3545' },
  statusButtonText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5, color: '#666' },
  statusButtonTextActive: { color: '#fff' },
  statusButtonInactive: { opacity: 0.5 },
  gnrButtonsWrap: { width: '100%', paddingHorizontal: 4 },
  gnrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gnrRowBottom: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  gnrHalf: { flexBasis: '48%' },
  gnrWideCenter: { width: '48%', alignSelf: 'center' },
  gnrButton: { paddingHorizontal: 18, paddingVertical: 12, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  gnrButtonText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5, color: '#666' },
  gnrButtonInactive: { opacity: 0.5 },
  gnrButtonTextActive: { color: '#fff' },
  gnrButtonActive: { borderWidth: 2 },
  gnrButtonG: { borderColor: '#28a745' },
  gnrButtonN: { borderColor: '#ffc107' },
  gnrButtonR: { borderColor: '#dc3545' },
  gnrButtonGActive: { backgroundColor: '#28a745' },
  gnrButtonNActive: { backgroundColor: '#ffc107' },
  gnrButtonRActive: { backgroundColor: '#dc3545' },
});

export default GnrPerformanceInspectionTable;
