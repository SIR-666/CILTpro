import { Picker } from "@react-native-picker/picker";
import { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, TextInput, View, Alert, TouchableOpacity } from "react-native";
import { api } from "../../../utils/axiosInstance";
import moment from "moment-timezone";
import AsyncStorage from "@react-native-async-storage/async-storage";

const isNumericItem = (item) =>
  item?.status === 1 && item?.periode === "Tiap Jam" && !item?.useButtons;

const sanitizeDecimal = (txt) =>
  txt
    .replace(",", ".")
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*?)\./g, "$1")
    .replace(/^0+(?=\d)/, ""); // buang leading zero berlebih (bukan "0.xxx")

// Template khusus untuk LINE B dan LINE C - TANPA H2O2 SPRAY
const defaultTemplateBC = [
  {
    activity: "Flowrate nozzle 1 (ml/min)",
    good: "2.8 - 5",
    reject: "<2.8 / >5",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Flowrate nozzle 2 (ml/min)",
    good: "2.8 - 5",
    reject: "<2.8 / >5",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Flowrate nozzle 3 (ml/min)",
    good: "2.8 - 5",
    reject: "<2.8 / >5",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Flowrate nozzle 4 (ml/min)",
    good: "2.8 - 5",
    reject: "<2.8 / >5",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Hepa pressure (mbar)",
    good: "1.4 - 5",
    reject: "<1.4 / >5",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Level secondary water (di garis hitam)",
    good: "di garis hitam",
    reject: "> garis hitam",
    periode: "Tiap Jam",
    status: 0,
    useButtons: true, // Flag untuk menggunakan button OK/NOT OK
  },
  {
    activity: "Temp. secondary water (<C)",
    good: "≤ 4",
    reject: "> 4",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Temp. Cooling Water (<C)",
    good: "≤ 4",
    reject: "> 4",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Press. Cooling Water (Bar)",
    good: "3 - 4",
    reject: "<3 / >4",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Temp. bottom seal (<C)",
    good: "380 - 440",
    reject: "<380 / >440",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Temp. top seal (<C)",
    good: "380 - 440",
    reject: "<380 / >440",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "cap welding energy (J)",
    good: "100 - 120",
    reject: "<100 / >120",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "cap welding time (ms)",
    good: "100 - 150",
    reject: "<100 / >150",
    periode: "Tiap Jam",
    status: 1,
  },
  // Cek kondisi mesin per 30 menit (sama dengan LINE A)
  {
    activity: "Filling nozzle",
    good: "tidak dripping",
    reject: "dripping",
    periode: "30 menit",
    status: 0,
  },
  {
    activity: "Hose Cooling Mandrel",
    good: "normal",
    reject: "rembes, bocor, pecah, lepas dari napple",
    periode: "30 menit",
    status: 0,
  },
  {
    activity: "Hose Cooling Bottom Pre Folder",
    good: "normal",
    reject: "rembes, bocor, pecah, lepas dari napple",
    periode: "30 menit",
    status: 0,
  },
  {
    activity: "Hose Cooling Bottom Seal",
    good: "normal",
    reject: "rembes, bocor, pecah, lepas dari napple",
    periode: "30 menit",
    status: 0,
  },
  {
    activity: "Hose Cooling Top Pre Folder",
    good: "normal",
    reject: "rembes, bocor, pecah, lepas dari napple",
    periode: "30 menit",
    status: 0,
  },
  {
    activity: "Hose Cooling Top Seal",
    good: "normal",
    reject: "rembes, bocor, pecah, lepas dari napple",
    periode: "30 menit",
    status: 0,
  },
  // Packaging integrity - detailed breakdown with grouping
  {
    activity: "1. FORM",
    good: "G",
    need: "N",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isGroupHeader: true,
    groupName: "FORM"
  },
  {
    activity: "a. Bentuk pack",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "FORM"
  },
  {
    activity: "2. DESIGN",
    good: "G",
    need: "N",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isGroupHeader: true,
    groupName: "DESIGN"
  },
  {
    activity: "a. Desain gambar",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "DESIGN"
  },
  {
    activity: "b. Kualitas printing pack",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "DESIGN"
  },
  {
    activity: "3. TOP",
    good: "G",
    need: "N",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isGroupHeader: true,
    groupName: "TOP"
  },
  {
    activity: "a. Top sealing",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "TOP"
  },
  {
    activity: "b. Top Fin Gap",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "TOP"
  },
  {
    activity: "c. Miss Alignment",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "TOP"
  },
  {
    activity: "d. Top Fin",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "TOP"
  },
  {
    activity: "4. BOTTOM",
    good: "G",
    need: "N",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isGroupHeader: true,
    groupName: "BOTTOM"
  },
  {
    activity: "a. Bottom sealing",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "BOTTOM"
  },
  {
    activity: "b. Unfolded",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "BOTTOM"
  },
  {
    activity: "c. Bottom Closure",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "BOTTOM"
  },
  {
    activity: "d. Dented bottom/ corner",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "BOTTOM"
  },
  {
    activity: "e. Pin Bottom",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "BOTTOM"
  },
  {
    activity: "5. RECAP",
    good: "G",
    need: "N",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isGroupHeader: true,
    groupName: "RECAP"
  },
  {
    activity: "a. Cap sealing",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "RECAP"
  },
  {
    activity: "b. Ada cap/ tidak",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "RECAP"
  },
  {
    activity: "c. Posisi Cap",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "RECAP"
  },
  // Other parameters
  { activity: "Berat ( Gram )", periode: "Tiap Jam", status: 1 },
  { activity: "Speed < 7000", periode: "Tiap Jam", status: 1 },
  { activity: "Start Stop ( Jam )", periode: "Tiap Jam", status: 1 },
  { activity: "Jumlah Produksi (pack)", periode: "Tiap Jam", status: 1 },
  { activity: "Reject (pack)", periode: "Tiap Jam", status: 1 },
];

const GnrPerformanceInspectionTableBC = ({ username, onDataChange, initialData, plant, line, machine, type, shift: parentShift }) => {
  const [inspectionData, setInspectionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHourlySlot, setSelectedHourlySlot] = useState("");
  const [selected30MinSlot, setSelected30MinSlot] = useState("");
  const [lastHourCheck, setLastHourCheck] = useState(null);
  const [last30MinCheck, setLast30MinCheck] = useState(null);
  const [shift, setShift] = useState("");
  const [showHourlyTable, setShowHourlyTable] = useState(false);
  const [show30MinTable, setShow30MinTable] = useState(false);

  // State untuk menyimpan data yang sudah disubmit
  const [savedHourlyData, setSavedHourlyData] = useState({});
  const [saved30MinData, setSaved30MinData] = useState({});
  const [dataExpiryTimes, setDataExpiryTimes] = useState({});

  // State untuk tracking apakah data baru saja di-load
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Tambahkan state untuk track apakah user sedang aktif mengisi
  const [isUserActive, setIsUserActive] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [hasUnsavedData, setHasUnsavedData] = useState(false);

  // State baru untuk tracking manual selection
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [lastManualSelectionTime, setLastManualSelectionTime] = useState(null);

  // Prevent reset on machine/type change if data exists
  const previousMachineRef = useRef(machine);
  const previousTypeRef = useRef(type);

  // Track user activity
  const updateUserActivity = () => {
    setIsUserActive(true);
    setLastActivityTime(Date.now());

    // Set inactive after 5 minutes of no activity
    if (globalThis.inactivityTimer) clearTimeout(globalThis.inactivityTimer);
    globalThis.inactivityTimer = setTimeout(() => {
      setIsUserActive(false);
    }, 5 * 60 * 1000); // 5 minutes
  };

  // Get current shift based on time or use parent shift
  const getCurrentShift = () => {
    if (parentShift) return parentShift;

    const hour = moment().tz("Asia/Jakarta").hour();
    if (hour >= 6 && hour < 14) return "Shift 1";
    if (hour >= 14 && hour < 22) return "Shift 2";
    return "Shift 3";
  };

  // Generate storage key based on plant, line, machine, type, and date
  const getStorageKey = (type) => {
    const now = moment().tz("Asia/Jakarta");
    const currentShift = shift || getCurrentShift();
    // Shift 3 antara 00:00–06:00 → pakai tanggal kemarin (shiftDate)
    const shiftDate =
      currentShift === "Shift 3" && now.hour() < 6
        ? now.clone().subtract(1, "day").format("YYYY-MM-DD")
        : now.format("YYYY-MM-DD");
    // IMPORTANT: kunci penyimpanan harus unique per user
    const userKey = username || "anon";
    return `gnr_${plant}_${line}_${machine}_${shiftDate}_${currentShift}_${type}_${userKey}`;
  };

  // Helper untuk parsing slot 30 menit
  const parse30MinSlot = (slot) => {
    if (!slot || !slot.includes("-")) return null;
    const [start] = slot.split("-").map(s => s.trim());
    const [HH, MM] = start.split(":");
    return { hour: HH, mmStart: MM };
  };

  // === NEW: pilih default 30-menit yang paling relevan untuk suatu jam ===
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

  // Handler khusus untuk hourly slot selection
  const handleHourlySlotSelection = (slot) => {
    if (isSlotAccessible(slot)) {
      // Tandai sebagai manual selection
      setIsManualSelection(true);
      setLastManualSelectionTime(Date.now());

      // Save current data sebelum ganti slot
      if (hasUnsavedData) {
        saveDataBeforeSubmit();
      }

      setSelectedHourlySlot(slot);
      // Auto tentukan 30-menit yg relevan utk jam terpilih
      const auto30 = getDefault30MinSlot(slot);
      setSelected30MinSlot(auto30);
      // Force render data sesuai kombinasi jam + 30-menit yg baru
      setTimeout(() => loadSavedDataFor(slot, auto30), 0);
      updateUserActivity(); // Keep user active
    }
  };

  // Handler khusus untuk 30-min slot selection
  const handle30MinSlotSelection = (slot) => {
    setIsManualSelection(true);
    setLastManualSelectionTime(Date.now());
    setSelected30MinSlot(slot);
    // Force refresh konten untuk slot 30 menit yang baru
    setTimeout(() => loadSavedDataFor(selectedHourlySlot, slot), 0);
    updateUserActivity(); // Keep user active
  };

  // Load saved data from AsyncStorage
  const loadSavedDataFromStorage = async () => {
    try {
      const hourlyKey = getStorageKey('hourly');
      const thirtyMinKey = getStorageKey('30min');
      const expiryKey = getStorageKey('expiry');

      const savedHourly = await AsyncStorage.getItem(hourlyKey);
      const saved30Min = await AsyncStorage.getItem(thirtyMinKey);
      const savedExpiry = await AsyncStorage.getItem(expiryKey);

      if (savedHourly) setSavedHourlyData(JSON.parse(savedHourly));
      if (saved30Min) setSaved30MinData(JSON.parse(saved30Min));
      if (savedExpiry) setDataExpiryTimes(JSON.parse(savedExpiry));

      setIsDataLoaded(true);
    } catch (error) {
      console.error("Error loading saved data from storage:", error);
    }
  };

  // Save data to AsyncStorage
  const saveDataToStorage = async () => {
    try {
      const hourlyKey = getStorageKey('hourly');
      const thirtyMinKey = getStorageKey('30min');
      const expiryKey = getStorageKey('expiry');

      await AsyncStorage.setItem(hourlyKey, JSON.stringify(savedHourlyData));
      await AsyncStorage.setItem(thirtyMinKey, JSON.stringify(saved30MinData));
      await AsyncStorage.setItem(expiryKey, JSON.stringify(dataExpiryTimes));
    } catch (error) {
      console.error("Error saving data to storage:", error);
    }
  };

  // Load saved data when component mounts
  useEffect(() => {
    if (plant && line && machine && type) {
      loadSavedDataFromStorage();
    }
  }, [plant, line, machine, type]);

  // Save data to storage whenever it changes
  useEffect(() => {
    if (isDataLoaded && (Object.keys(savedHourlyData).length > 0 || Object.keys(saved30MinData).length > 0)) {
      saveDataToStorage();
    }
  }, [savedHourlyData, saved30MinData, dataExpiryTimes]);

  // Check and clean expired data
  useEffect(() => {
    const interval = setInterval(() => {
      cleanExpiredData();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Loader berbasis parameter agar bisa force refresh saat user ganti jam/slot
  const loadSavedDataFor = (hourSlot, thirtySlot) => {
    setInspectionData((current) => {
      return current.map(item => {
        if (item.periode === "Tiap Jam" && hourSlot) {
          const savedSlotData = savedHourlyData[hourSlot];
          if (savedSlotData) {
            const saved = savedSlotData.find(s => s.activity === item.activity);
            if (saved) {
              return {
                ...item,
                results: String(saved.results || ""),
                user: saved.user || "",
                time: saved.time || "",
                done: saved.done || false,
                hourSlot: hourSlot,
                evaluatedResult: saved.evaluatedResult || ""
              };
            }
          }
          return { ...item, results: "", user: "", time: "", done: false, hourSlot: "", evaluatedResult: "" };
        }
        if (item.periode === "30 menit" && thirtySlot) {
          const savedSlotData = saved30MinData[thirtySlot];
          if (savedSlotData) {
            const saved = savedSlotData.find(s => s.activity === item.activity);
            if (saved) {
              return { ...item, results: saved.results || "", user: saved.user || "", time: saved.time || "", done: saved.done || false, timeSlot: thirtySlot };
            }
          }
          return { ...item, results: "", user: "", time: "", done: false, timeSlot: "" };
        }
        return item;
      });
    });
  };
  const loadSavedData = () => loadSavedDataFor(selectedHourlySlot, selected30MinSlot);

  const cleanExpiredData = async () => {
    const now = new Date().getTime();
    let hasChanges = false;

    // Clean expired hourly data
    const newDataExpiryTimes = { ...dataExpiryTimes };
    const newSavedHourlyData = { ...savedHourlyData };
    const newSaved30MinData = { ...saved30MinData };

    Object.keys(dataExpiryTimes).forEach(key => {
      if (dataExpiryTimes[key] < now) {
        if (key.startsWith('hourly_')) {
          const slot = key.replace('hourly_', '');
          delete newSavedHourlyData[slot];
          hasChanges = true;
        } else if (key.startsWith('30min_')) {
          const slot = key.replace('30min_', '');
          delete newSaved30MinData[slot];
          hasChanges = true;
        }
        delete newDataExpiryTimes[key];
      }
    });

    if (hasChanges) {
      setSavedHourlyData(newSavedHourlyData);
      setSaved30MinData(newSaved30MinData);
      setDataExpiryTimes(newDataExpiryTimes);

      // Clear from AsyncStorage
      try {
        const hourlyKey = getStorageKey('hourly');
        const thirtyMinKey = getStorageKey('30min');
        const expiryKey = getStorageKey('expiry');

        if (Object.keys(newSavedHourlyData).length === 0) {
          await AsyncStorage.removeItem(hourlyKey);
        } else {
          await AsyncStorage.setItem(hourlyKey, JSON.stringify(newSavedHourlyData));
        }

        if (Object.keys(newSaved30MinData).length === 0) {
          await AsyncStorage.removeItem(thirtyMinKey);
        } else {
          await AsyncStorage.setItem(thirtyMinKey, JSON.stringify(newSaved30MinData));
        }

        if (Object.keys(newDataExpiryTimes).length === 0) {
          await AsyncStorage.removeItem(expiryKey);
        } else {
          await AsyncStorage.setItem(expiryKey, JSON.stringify(newDataExpiryTimes));
        }
      } catch (error) {
        console.error("Error cleaning expired data from storage:", error);
      }
    }
  };

  // Save ALL data before submit with proper expiry times (STRICT to active slots)
  const saveDataBeforeSubmit = useCallback(() => {
    const now = new Date().getTime();

    // Save all data from current inspectionData
    const allHourlyData = {};
    const all30MinData = {};

    // Group all data by their respective slots
    inspectionData.forEach(item => {
      // For hourly data
      if (item.periode === "Tiap Jam" && item.results) {
        const slot = item.hourSlot || selectedHourlySlot;
        // ⛔ HANYA simpan slot jam yang sedang dipilih
        if (!slot || slot !== selectedHourlySlot) return;
        if (slot) {
          if (!allHourlyData[slot]) {
            allHourlyData[slot] = [];
          }
          allHourlyData[slot].push({
            activity: item.activity,
            results: item.results || "",
            user: item.user || username,
            time: item.time || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            done: item.done || !!item.results,
            hourSlot: slot,
            evaluatedResult: item.evaluatedResult || ""
          });
        }
      }

      // For 30-min data
      if (item.periode === "30 menit" && item.results) {
        const slot = item.timeSlot || selected30MinSlot;
        // ⛔ HANYA simpan slot 30-menit yang sedang dipilih
        if (!slot || slot !== selected30MinSlot) return;
        if (slot) {
          if (!all30MinData[slot]) {
            all30MinData[slot] = [];
          }
          const payload = {
            activity: item.activity,
            results: item.results,
            user: item.user || username,
            time: item.time || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            done: item.done || !!item.results,
            timeSlot: slot,
            evaluatedResult: item.evaluatedResult || ""
          };
          // NEW: mirror minute key agar nanti CombinedInspectionData mudah bikin results[HH][MM]
          const p = parse30MinSlot(slot);
          if (p) {
            payload._hourKey = p.hour;     
            payload._minuteKey = p.mmStart; 
          }
          all30MinData[slot].push(payload);
        }
      }
    });

    // Merge with existing saved data
    const updatedHourlyData = { ...savedHourlyData };
    const updatedExpiryTimes = { ...dataExpiryTimes };

    // Save all hourly data with 1 hour expiry
    Object.keys(allHourlyData).forEach(slot => {
      updatedHourlyData[slot] = allHourlyData[slot];
      const expiryKey = `hourly_${slot}`;
      updatedExpiryTimes[expiryKey] = now + (60 * 60 * 1000); // 1 hour from now
    });

    // Merge with existing saved data for 30-min (REPLACE-BY-ACTIVITY, no overwrite)
    const updated30MinData = { ...saved30MinData };
    Object.keys(all30MinData).forEach(slot => {
      const existing = Array.isArray(updated30MinData[slot]) ? [...updated30MinData[slot]] : [];
      const incoming = all30MinData[slot]; // array payload per-activity untuk slot ini
      // replace-by-activity di dalam slot yang sama
      incoming.forEach(payload => {
        const idx = existing.findIndex(x => x.activity === payload.activity);
        if (idx >= 0) {
          existing[idx] = payload;   // edit nilai di activity yang sama -> replace
        } else {
          existing.push(payload);     // pertama kali isi activity tsb di slot ini
        }
      });
      updated30MinData[slot] = existing;
      const expiryKey = `30min_${slot}`;
      updatedExpiryTimes[expiryKey] = now + (30 * 60 * 1000); // 30 minutes from now
    });

    // Update state synchronously
    setSavedHourlyData(updatedHourlyData);
    setSaved30MinData(updated30MinData);
    setDataExpiryTimes(updatedExpiryTimes);

    // Save to AsyncStorage synchronously
    const hourlyKey = getStorageKey('hourly');
    const thirtyMinKey = getStorageKey('30min');
    const expiryKey = getStorageKey('expiry');

    AsyncStorage.setItem(hourlyKey, JSON.stringify(updatedHourlyData));
    AsyncStorage.setItem(thirtyMinKey, JSON.stringify(updated30MinData));
    AsyncStorage.setItem(expiryKey, JSON.stringify(updatedExpiryTimes));

    // Return the inspection data for parent to use
    return inspectionData;
  }, [inspectionData, savedHourlyData, saved30MinData, dataExpiryTimes, selectedHourlySlot, selected30MinSlot, username]);

  // === NEW: clear cache & input setelah submit berhasil (dipanggil parent) ===
  const clearAllSavedData = useCallback(async () => {
    try {
      setSavedHourlyData({});
      setSaved30MinData({});
      setDataExpiryTimes({});
      setHasUnsavedData(false);
      setInspectionData(prev =>
        prev.map(it => ({
          ...it,
          results: "",
          user: "",
          time: "",
          done: false,
          evaluatedResult: "",
          hourSlot: it.periode === "Tiap Jam" ? "" : it.hourSlot,
          timeSlot: it.periode === "30 menit" ? "" : it.timeSlot,
        }))
      );
      const hourlyKey = getStorageKey('hourly');
      const thirtyMinKey = getStorageKey('30min');
      const expiryKey = getStorageKey('expiry');
      await AsyncStorage.removeItem(hourlyKey);
      await AsyncStorage.removeItem(thirtyMinKey);
      await AsyncStorage.removeItem(expiryKey);
    } catch (e) {
      console.error("Error clearing saved data after submit:", e);
    }
  }, [getStorageKey]);

  // Generate hourly slots based on shift
  const generateHourlySlots = () => {
    const currentShift = shift || getCurrentShift();
    let slots = [];

    switch (currentShift) {
      case "Shift 1":
        // Shift 1: 06:00 - 14:00 (9 jam)
        for (let i = 6; i <= 14; i++) {
          slots.push(`${i.toString().padStart(2, '0')}:00`);
        }
        break;
      case "Shift 2":
        // Shift 2: 14:00 - 22:00 (9 jam)
        for (let i = 14; i <= 22; i++) {
          slots.push(`${i.toString().padStart(2, '0')}:00`);
        }
        break;
      case "Shift 3":
        // Shift 3: 22:00 - 06:00 (9 jam, cross day)
        const shift3Hours = [22, 23, 0, 1, 2, 3, 4, 5, 6];
        shift3Hours.forEach((hour) => {
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
        });
        break;
    }

    return slots;
  };

  // Generate 30-min slots for selected hour
  const generate30MinSlots = (hourSlot) => {
    if (!hourSlot) return [];
    const hour = parseInt(hourSlot.split(':')[0]);
    const nextHour = (hour + 1) % 24;
    return [
      `${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:30`,
      `${hour.toString().padStart(2, '0')}:30 - ${nextHour.toString().padStart(2, '0')}:00`
    ];
  };

  // Helper untuk menentukan slot jam dan slot 30 menit yang aktif
  const getCurrentHourSlot = () => {
    const now = moment().tz("Asia/Jakarta");
    const hour = now.hour();
    const currentShift = shift || getCurrentShift();
    if (currentShift === "Shift 1" && hour >= 6 && hour <= 14) {
      return `${hour.toString().padStart(2, '0')}:00`;
    } else if (currentShift === "Shift 2" && hour >= 14 && hour <= 22) {
      return `${hour.toString().padStart(2, '0')}:00`;
    } else if (currentShift === "Shift 3") {
      if (hour >= 22 && hour <= 23) {
        return `${hour.toString().padStart(2, '0')}:00`;
      } else if (hour >= 0 && hour <= 6) {
        return `${hour.toString().padStart(2, '0')}:00`;
      }
    }
    return null;
  };

  const getCurrent30MinSlot = () => {
    const now = moment().tz("Asia/Jakarta");
    const hour = now.hour();
    const minute = now.minute();
    const nextHour = (hour + 1) % 24;
    if (minute < 30) {
      return `${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:30`;
    } else {
      return `${hour.toString().padStart(2, '0')}:30 - ${nextHour.toString().padStart(2, '0')}:00`;
    }
  };

  // izinkan pilih slot 30-menint yang sedang berjalan atau sudah lewat (backfill)
  const is30SlotAccessible = (slot) => {
    // slot format: "HH:00 - HH:30" atau "HH:30 - HH+1:00"
    const now = moment().tz("Asia/Jakarta");
    const [startStr, endStr] = slot.split("-").map(s => s.trim());
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);
    const start = now.clone().hour(sh).minute(sm).second(0).millisecond(0);
    const end = now.clone().hour(eh).minute(em).second(0).millisecond(0);
    // Boleh jika periodenya sudah selesai ATAU sedang berjalan; (masa depan tetap terkunci)
    return end.isSameOrBefore(now) || (now.isSameOrAfter(start) && now.isBefore(end));
  };

  // Check if slot is accessible (current or past in same shift)
  const isSlotAccessible = (slot) => {
    const currentHour = moment().tz("Asia/Jakarta").hour();
    const slotHour = parseInt(slot.split(':')[0]);
    const currentShift = shift || getCurrentShift();

    if (currentShift === "Shift 1") {
      return slotHour >= 6 && slotHour <= currentHour && currentHour <= 14;
    } else if (currentShift === "Shift 2") {
      return slotHour >= 14 && slotHour <= currentHour && currentHour <= 22;
    } else if (currentShift === "Shift 3") {
      // Handle shift 3 yang melewati tengah malam
      if (currentHour >= 22) {
        return slotHour >= 22 || slotHour <= 6;
      } else if (currentHour <= 6) {
        return (slotHour >= 22 && slotHour <= 23) || (slotHour >= 0 && slotHour <= currentHour);
      }
    }
    return false;
  };

  // === NEW: evaluasi angka (G/N/R) & background color same as LINE ===
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
        const t = part.trim();
        if (t.startsWith(">=")) { const v = parseFloat(t.substring(2)); if (!isNaN(v)) conditions.push({ operator: ">=", value: v }); }
        else if (t.startsWith("<")) { const v = parseFloat(t.substring(1)); if (!isNaN(v)) conditions.push({ operator: "<", value: v }); }
        else if (t.startsWith(">")) { const v = parseFloat(t.substring(1)); if (!isNaN(v)) conditions.push({ operator: ">", value: v }); }
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
      for (const c of rejectConditions) {
        if (c.operator === "<" && numValue < c.value) return "reject";
        if (c.operator === ">" && numValue > c.value) return "reject";
        if (c.operator === ">=" && numValue >= c.value) return "reject";
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

  // Initialize time tracking dengan protection untuk manual selection & auto 30-min sinkron
  useEffect(() => {
    setShift(parentShift || getCurrentShift());

    // Jangan auto-pick jika ada manual selection dalam 10 menit terakhir
    const now = Date.now();
    const isRecentManualSelection = lastManualSelectionTime && (now - lastManualSelectionTime) < (10 * 60 * 1000);

    if (!isUserActive && !hasUnsavedData && !isRecentManualSelection) {
      const now = moment().tz("Asia/Jakarta");
      const hour = now.hour();
      let slot = "";
      const currentShift = parentShift || getCurrentShift();

      if (currentShift === "Shift 1" && hour >= 6 && hour <= 14) {
        slot = `${hour.toString().padStart(2, '0')}:00`;
      } else if (currentShift === "Shift 2" && hour >= 14 && hour <= 22) {
        slot = `${hour.toString().padStart(2, '0')}:00`;
      } else if (currentShift === "Shift 3") {
        if (hour >= 22 && hour <= 23) {
          slot = `${hour.toString().padStart(2, '0')}:00`;
        } else if (hour >= 0 && hour <= 6) {
          slot = `${hour.toString().padStart(2, '0')}:00`;
        }
      }

      // Only change slot if different from current AND no recent manual selection
      if (slot && slot !== selectedHourlySlot) {
        setSelectedHourlySlot(slot);
      }

      if (slot) {
        const auto30 = getDefault30MinSlot(slot);
        if (auto30 && auto30 !== selected30MinSlot) setSelected30MinSlot(auto30);
      }
    }

    const interval = setInterval(() => {
      checkTimeAlerts();
      if (!parentShift) {
        setShift(getCurrentShift());
      }

      // Auto-save every minute if there's unsaved data
      if (hasUnsavedData) {
        saveDataBeforeSubmit();
      }

      // Reset manual selection flag setelah 10 menit tidak ada aktivitas
      const now = Date.now();
      if (isManualSelection && lastManualSelectionTime && (now - lastManualSelectionTime) > (10 * 60 * 1000)) {
        setIsManualSelection(false);
        setLastManualSelectionTime(null);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [lastHourCheck, last30MinCheck, parentShift, isUserActive, hasUnsavedData, selectedHourlySlot, selected30MinSlot, isManualSelection, lastManualSelectionTime]);

  // === NEW: sinkronkan 30-menit saat selectedHourlySlot berubah (auto-pick) ===
  useEffect(() => {
    if (!selectedHourlySlot) return;
    const auto30 = getDefault30MinSlot(selectedHourlySlot);
    if (auto30 && auto30 !== selected30MinSlot) {
      setSelected30MinSlot(auto30);
      setTimeout(() => loadSavedDataFor(selectedHourlySlot, auto30), 0);
    }
  }, [selectedHourlySlot]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkTimeAlerts = () => {
    const now = moment().tz("Asia/Jakarta");
    const currentMinute = now.minute();
    const currentHour = now.hour();

    // Alert for hourly check
    if (currentMinute === 0 && lastHourCheck !== currentHour) {
      Alert.alert(
        "Pengingat Pemeriksaan Per Jam",
        "Saatnya melakukan pemeriksaan parameter mesin per jam!",
        [{ text: "OK", onPress: () => setLastHourCheck(currentHour) }]
      );
    }

    // Alert for 30-minute check
    if ((currentMinute === 0 || currentMinute === 30) &&
      last30MinCheck !== `${currentHour}:${currentMinute}`) {
      Alert.alert(
        "Pengingat Pemeriksaan 30 Menit",
        "Saatnya melakukan pemeriksaan kondisi mesin per 30 menit!",
        [{ text: "OK", onPress: () => setLast30MinCheck(`${currentHour}:${currentMinute}`) }]
      );
    }
  };

  const fetchInspection = async () => {
    // Check if this is just a prop update vs actual change
    const isMachineOrTypeChanged = previousMachineRef.current !== machine || previousTypeRef.current !== type;

    // If machine/type changed but we have saved data, don't reset
    if (isMachineOrTypeChanged && (Object.keys(savedHourlyData).length > 0 || Object.keys(saved30MinData).length > 0)) {
      previousMachineRef.current = machine;
      previousTypeRef.current = type;
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(
        `/gnr-master?plant=${encodeURIComponent(plant)}&line=${encodeURIComponent(line)}&machine=${encodeURIComponent(machine)}&type=${encodeURIComponent(type)}`
      );

      const fetched = Array.isArray(response.data) ? response.data : [];

      // First, create base template using BC template
      const baseTemplate = defaultTemplateBC.map((templateItem) => {
        const dbItem = fetched.find((item) => item.activity === templateItem.activity);

        return {
          ...templateItem,
          good: dbItem?.good || templateItem.good || "-",
          reject: dbItem?.reject || templateItem.reject || "-",
          need: dbItem?.need || templateItem.need || "-",
          periode: dbItem?.frekuensi || templateItem.periode,
          status: dbItem?.status !== undefined ? dbItem.status : templateItem.status,
          content: dbItem?.content || "",
          results: "",
          done: false,
          user: "",
          time: "",
          timeSlot: "",
          hourSlot: "",
          useButtons: templateItem.useButtons || false,
        };
      });

      // Check if there's initial data from parent (from previous submission)
      let mergedData = baseTemplate;
      if (initialData && initialData.length > 0) {
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

      // Delay onDataChange to prevent rendering warning
      setTimeout(() => {
        onDataChange(mergedData);
      }, 0);

      // Update refs
      previousMachineRef.current = machine;
      previousTypeRef.current = type;
    } catch (error) {
      console.error("Error fetching inspection data:", error);
      const fallbackData = defaultTemplateBC.map(item => ({
        ...item,
        results: "",
        done: false,
        user: "",
        time: "",
        content: "",
        need: item.need || "-",
        timeSlot: "",
        hourSlot: "",
        useButtons: item.useButtons || false,
      }));

      // Check initial data even on error
      let mergedFallback = fallbackData;
      if (initialData && initialData.length > 0) {
        mergedFallback = fallbackData.map(item => {
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

      setInspectionData(mergedFallback);

      // Delay onDataChange to prevent rendering warning
      setTimeout(() => {
        onDataChange(mergedFallback);
      }, 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (plant && line && machine && type && isDataLoaded) {
      fetchInspection();
    }
  }, [plant, line, machine, type, isDataLoaded]);

  // Fungsi untuk menghitung status grup
  const calculateGroupStatus = (groupName, currentSlot) => {
    const groupItems = inspectionData.filter(item =>
      item.groupName === groupName &&
      item.isSubItem &&
      (!currentSlot || item.timeSlot === currentSlot)
    );

    if (groupItems.length === 0) return "";

    // Hanya hitung item yang sudah diisi
    const filledItems = groupItems.filter(item => item.results && item.results !== "");
    if (filledItems.length === 0) return "";
    if (filledItems.some(item => item.results === "R")) return "R";
    if (filledItems.some(item => item.results === "N")) return "N";
    if (filledItems.length === groupItems.length && filledItems.every(item => item.results === "G")) return "G";

    return "";
  };

  // Update fungsi getBackgroundColor
  const getBackgroundColor = (item) => {
    // Special handling for OK/NOT OK buttons
    if (item.useButtons) {
      if (item.results === "OK") return "#c8ecd4";
      if (item.results === "NOT OK") return "#ffd6d6";
      return "#fff";
    }

    // Untuk per jam, gunakan hasil evaluasi
    if (item.periode === "Tiap Jam") {
      if (item.evaluatedResult === "R") return "#ffd6d6";
      if (item.evaluatedResult === "N") return "#fff7cc";
      if (item.evaluatedResult === "G") return "#c8ecd4";
      return "#fff";
    }

    // Untuk grup header, hitung berdasarkan sub-items
    if (item.isGroupHeader && item.groupName) {
      const groupStatus = calculateGroupStatus(item.groupName, selected30MinSlot);
      if (groupStatus === "R") return "#ffd6d6";
      if (groupStatus === "N") return "#fff7cc";
      if (groupStatus === "G") return "#c8ecd4";
      return "#e8f4f8";
    }

    // Untuk sub-items dan item biasa 30 menit
    if (item.results === "R" || item.results === "Reject") return "#ffd6d6";
    if (item.results === "N" || item.results === "Need") return "#fff7cc";
    if (item.results === "G" || item.results === "Good") return "#c8ecd4";

    // Default untuk item yang belum diisi
    return "#fff";
  };

  const getTextColor = (backgroundColor) => {
    if (backgroundColor === "#ffd6d6") return "#a94442";
    if (backgroundColor === "#fff7cc") return "#8a6d3b";
    if (backgroundColor === "#c8ecd4") return "#207a3c";
    return "#333";
  };

  // Filter data based on selected slots
  const getFilteredHourlyData = () => {
    // Always show ALL hourly items, regardless of their slot assignment
    return inspectionData.filter(item => item.periode === "Tiap Jam");
  };

  const getFiltered30MinData = () => {
    // Always show ALL 30-minute items, regardless of their slot assignment
    return inspectionData.filter(item => item.periode === "30 menit");
  };

  // Debounce function to prevent rapid updates
  const debounceTimeouts = useRef({});

  const handleInputChange = useCallback((text, index) => {
    setInspectionData(prevData => {
      const updated = [...prevData];
      const item = updated[index];
      if (item.periode === "Tiap Jam" && !selectedHourlySlot) return prevData;
      if (item.periode === "30 menit" && !selected30MinSlot) return prevData;
      setHasUnsavedData(true);
      const value = isNumericItem(item) ? sanitizeDecimal(text) : text;
      const nextItem = { ...item, results: value };
      if (item.periode === "Tiap Jam") {
        nextItem.hourSlot = selectedHourlySlot;
        if (!item.useButtons) {
          const ev = evaluateValue(value, item.good, item.reject);
          nextItem.evaluatedResult = ev === "good" ? "G" : ev === "reject" ? "R" : ev === "need" ? "N" : "";
        } else {
          nextItem.evaluatedResult = value === "OK" ? "G" : value === "NOT OK" ? "R" : "";
        }
      } else {
        nextItem.timeSlot = selected30MinSlot;
      }
      updated[index] = nextItem;
      return updated;
    });
  }, [selectedHourlySlot, selected30MinSlot, username, onDataChange, saveDataBeforeSubmit]);

  // === NEW: expose before/after submit hooks & autosave interval ===
  useEffect(() => {
    if (globalThis.gnrBeforeSubmit !== saveDataBeforeSubmit) {
      globalThis.gnrBeforeSubmit = saveDataBeforeSubmit;
    }
    if (globalThis.gnrAfterSubmitClear !== clearAllSavedData) {
      globalThis.gnrAfterSubmitClear = clearAllSavedData;
    }
    const autoSaveInterval = setInterval(() => {
      if (inspectionData.some(item => item.results)) {
        saveDataBeforeSubmit();
      }
    }, 30000); // 30s
    return () => clearInterval(autoSaveInterval);
  }, [saveDataBeforeSubmit, clearAllSavedData, inspectionData]);

  // Load all saved data when component mounts or storage changes
  useEffect(() => {
    if (isDataLoaded && inspectionData.length > 0 && (Object.keys(savedHourlyData).length > 0 || Object.keys(saved30MinData).length > 0)) {
      loadSavedData();
    }
  }, [isDataLoaded, inspectionData.length]);

  // Load saved data when slot changes
  useEffect(() => {
    if (inspectionData.length > 0 && (selectedHourlySlot || selected30MinSlot)) {
      loadSavedData();
    }
  }, [selectedHourlySlot, selected30MinSlot]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading inspection data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current Shift Info */}
      <View style={styles.shiftInfo}>
        <Text style={styles.shiftText}>Shift Aktif: {shift}</Text>
        <Text style={styles.shiftTimeText}>
          {shift === "Shift 1" && "(06:00 - 14:00)"}
          {shift === "Shift 2" && "(14:00 - 22:00)"}
          {shift === "Shift 3" && "(22:00 - 06:00)"}
        </Text>
      </View>

      {/* Toggle Buttons Horizontal */}
      <View style={styles.toggleRowWrapper}>
        <TouchableOpacity
          style={[styles.toggleButton, showHourlyTable && styles.toggleButtonActive]}
          onPress={() => setShowHourlyTable((prev) => !prev)}
        >
          <Text style={styles.toggleButtonText}>
            {showHourlyTable ? "Sembunyikan Pemeriksaan Per Jam" : "Tampilkan Pemeriksaan Per Jam"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, show30MinTable && styles.toggleButtonActive]}
          onPress={() => setShow30MinTable((prev) => !prev)}
        >
          <Text style={styles.toggleButtonText}>
            {show30MinTable ? "Sembunyikan Pemeriksaan Per 30 Menit" : "Tampilkan Pemeriksaan Per 30 Menit"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section Header - Pemeriksaan Per Jam */}
      {showHourlyTable && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PEMERIKSAAN PER JAM (LINE B & C)</Text>
            {/* Hourly Time Slot Selector */}
            <View style={styles.timeSlotContainer}>
              <Text style={styles.timeSlotLabel}>Jam:</Text>
              <View style={styles.timeSlotGrid}>
                {generateHourlySlots().map((slot) => {
                  const isAccessible = isSlotAccessible(slot);
                  const isCurrentSlot = slot === selectedHourlySlot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.hourlySlotButton,
                        isCurrentSlot && styles.timeSlotButtonActive,
                        !isAccessible && styles.timeSlotButtonLocked,
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

          {/* Hourly Inspection Table */}
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
                const backgroundColor = getBackgroundColor(item);
                const textColor = getTextColor(backgroundColor);

                return (
                  <View key={`hourly-${index}`} style={[
                    styles.tableBody,
                    { backgroundColor }
                  ]}>
                    <View style={{ width: "30%" }}>
                      <Text style={[styles.tableData, { color: textColor }]}>
                        {item.activity}
                      </Text>
                    </View>
                    <View style={{ width: "10%" }}>
                      <Text style={[styles.tableData, { color: textColor }]}>
                        {item.good || "-"}
                      </Text>
                    </View>
                    <View style={{ width: "10%" }}>
                      <Text style={[styles.tableData, { color: textColor }]}>
                        {item.need || "-"}
                      </Text>
                    </View>
                    <View style={{ width: "10%" }}>
                      <Text style={[styles.tableData, { color: textColor }]}>
                        {item.reject || "-"}
                      </Text>
                    </View>
                    <View style={{ width: "15%" }}>
                      <Text style={[styles.tableData, { color: textColor }]}>
                        {item.periode}
                      </Text>
                    </View>
                    <View style={{ width: "25%" }}>
                      <View style={styles.centeredContent}>
                        {item.useButtons ? (
                          <View style={styles.buttonGroup}>
                            <TouchableOpacity
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={[
                                styles.statusButton,
                                item.results === "OK" ? styles.statusButtonOK : styles.statusButtonInactive,
                                item.results === "OK" && styles.statusButtonActive,
                                item.results === "OK" && styles.statusButtonOKActive,
                              ]}
                              onPress={() => handleInputChange("OK", originalIndex)}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.statusButtonText,
                                  item.results === "OK" && styles.statusButtonTextActive
                                ]}
                              >
                                OK
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={[
                                styles.statusButton,
                                item.results === "NOT OK" ? styles.statusButtonNotOK : styles.statusButtonInactive,
                                item.results === "NOT OK" && styles.statusButtonActive,
                                item.results === "NOT OK" && styles.statusButtonNotOKActive,
                              ]}
                              onPress={() => handleInputChange("NOT OK", originalIndex)}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.statusButtonText,
                                  item.results === "NOT OK" && styles.statusButtonTextActive
                                ]}
                              >
                                NOT OK
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          /* TextInput seperti sebelumnya */
                          <TextInput
                            style={styles.input}
                            value={String(item.results ?? "")}
                            placeholder={isNumericItem(item) ? "_ _ _" : "isi disini"}
                            keyboardType={isNumericItem(item) ? "decimal-pad" : "default"}
                            inputMode={isNumericItem(item) ? "decimal" : "text"}
                            returnKeyType="done"
                            selectTextOnFocus
                            onChangeText={(text) => {
                              const value = isNumericItem(item) ? sanitizeDecimal(text) : text;
                              handleInputChange(value, originalIndex);
                            }}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Section Header - Pemeriksaan Per 30 Menit */}
      {show30MinTable && (
        <View style={[styles.sectionHeader, { marginTop: 30 }]}>
          <Text style={styles.sectionTitle}>PEMERIKSAAN PER 30 MENIT (LINE B & C)</Text>
          {/* 30-Min Time Slot Selector */}
          <View style={styles.timeSlotContainer}>
            <Text style={styles.timeSlotLabel}>Pilih Slot 30 Menit {selectedHourlySlot && `(untuk jam ${selectedHourlySlot.split(' - ')[0]})`}:</Text>
            <View style={styles.timeSlotButtons}>
              {generate30MinSlots(selectedHourlySlot || getCurrentHourSlot()).map((slot) => {
                const canUse = is30SlotAccessible(slot);
                const isCurrent = slot === getCurrent30MinSlot();
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeSlotButton,
                      isCurrent && styles.timeSlotButtonActive,
                      !canUse && styles.timeSlotButtonLocked,
                    ]}
                    disabled={!canUse}
                    onPress={() => handle30MinSlotSelection(slot)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      isCurrent && styles.timeSlotTextActive,
                      !canUse && styles.timeSlotTextLocked
                    ]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* 30-Minute Inspection Table */}
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

            // Untuk grup header, hitung status
            let groupStatus = "";
            if (item.isGroupHeader && item.groupName) {
              groupStatus = calculateGroupStatus(item.groupName, selected30MinSlot);
            }

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
                        {/* Row atas: G & N */}
                        <View style={styles.gnrRow}>
                          <TouchableOpacity
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={[
                              styles.gnrButton,
                              styles.gnrHalf,
                              item.results === "G" && styles.gnrButtonG,
                              item.results === "G" && styles.gnrButtonActive,
                              item.results === "G" && styles.gnrButtonGActive,
                              item.results !== "G" && styles.gnrButtonInactive,
                            ]}
                            onPress={() => handleInputChange("G", originalIndex)}
                          >
                            <Text style={[
                              styles.gnrButtonText,
                              item.results === "G" && styles.gnrButtonTextActive
                            ]}>G</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={[
                              styles.gnrButton,
                              styles.gnrHalf,
                              item.results === "N" && styles.gnrButtonN,
                              item.results === "N" && styles.gnrButtonActive,
                              item.results === "N" && styles.gnrButtonNActive,
                              item.results !== "N" && styles.gnrButtonInactive,
                            ]}
                            onPress={() => handleInputChange("N", originalIndex)}
                          >
                            <Text style={[
                              styles.gnrButtonText,
                              item.results === "N" && styles.gnrButtonTextActive
                            ]}>N</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Row bawah: R di tengah */}
                        <View style={styles.gnrRowBottom}>
                          <TouchableOpacity
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={[
                              styles.gnrButton,
                              styles.gnrWideCenter,
                              item.results === "R" && styles.gnrButtonR,
                              item.results === "R" && styles.gnrButtonActive,
                              item.results === "R" && styles.gnrButtonRActive,
                              item.results !== "R" && styles.gnrButtonInactive,
                            ]}
                            onPress={() => handleInputChange("R", originalIndex)}
                          >
                            <Text style={[
                              styles.gnrButtonText,
                              item.results === "R" && styles.gnrButtonTextActive
                            ]}>R</Text>
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

      {/* Progress Summary */}
      <View style={styles.progressSummary}>
        <Text style={styles.progressTitle}>Progress Pengisian:</Text>
        <Text style={styles.progressText}>
          • Slot Per Jam Terisi: {Object.keys(savedHourlyData).length}/{generateHourlySlots().length}
        </Text>
        <Text style={styles.progressText}>
          • Slot 30 Menit Terisi: {Object.keys(saved30MinData).length}/{generateHourlySlots().length * 2}
        </Text>
        {/* Show saved data info */}
        <Text style={[styles.progressText, { marginTop: 5, fontStyle: 'italic' }]}>
          • Data Tersimpan: {Object.keys(savedHourlyData).length} jam, {Object.keys(saved30MinData).length} slot 30 menit
        </Text>
        {hasUnsavedData && (
          <Text style={[styles.progressText, { marginTop: 5, color: '#ff9800', fontWeight: 'bold' }]}>
            ⚠️ Ada data yang belum tersimpan
          </Text>
        )}
        {/* Indikator manual selection */}
        {isManualSelection && (
          <Text style={[styles.progressText, { marginTop: 5, color: '#2196F3', fontWeight: 'bold' }]}>
            📌 Jam dipilih manual - Auto-pick dinonaktifkan untuk 10 menit
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 20,
  },
  shiftInfo: {
    backgroundColor: "#17a2b8",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  shiftText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  shiftTimeText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 2,
  },
  sectionHeader: {
    backgroundColor: "#28a745",
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  timeSlotContainer: {
    marginTop: 10,
  },
  timeSlotLabel: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 5,
  },
  timeSlotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  hourlySlotButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 5,
    margin: 3,
    minWidth: 60,
    alignItems: "center",
  },
  timeSlotButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  timeSlotButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  timeSlotButtonActive: {
    backgroundColor: "#20c997",
  },
  timeSlotButtonWithData: {
    borderColor: '#28a745',
    borderWidth: 2,
  },
  timeSlotButtonUnsaved: {
    borderColor: '#ff9800',
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  timeSlotText: {
    color: '#28a745',
    fontSize: 12,
    fontWeight: '500',
  },
  timeSlotTextActive: {
    color: '#fff',
  },
  table: {
    width: "100%",
    marginBottom: 20,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#20c997",
    padding: 10,
  },
  tableBody: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  groupHeader: {
    backgroundColor: "#e8f4f8",
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
  },
  subItem: {
    paddingLeft: 20,
  },
  tableCaption: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableData: {
    fontSize: 14,
    textAlign: "center",
  },
  tableInput: {
    fontSize: 14,
    textAlign: "center",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    width: "90%",
  },
  groupHeaderText: {
    fontWeight: "bold",
    textAlign: "left",
  },
  subItemText: {
    textAlign: "left",
    paddingLeft: 10,
  },
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  groupHeaderResultsContainer: {
    width: "100%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  groupHeaderResults: {
    fontSize: 14,
    textAlign: "center",
  },
  progressSummary: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    marginTop: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  progressText: {
    fontSize: 14,
    color: "#6c757d",
  },
  toggleRowWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 0,
    gap: 10,
  },
  toggleButton: {
    backgroundColor: '#d2fbe6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    flexDirection: 'row',
    marginHorizontal: 2,
    marginVertical: 0,
    borderWidth: 1,
    borderColor: '#b6e9d2',
  },
  toggleButtonActive: {
    backgroundColor: '#7be495',
    borderColor: '#20c997',
  },
  toggleButtonText: {
    color: '#207a3c',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  timeSlotButtonLocked: {
    backgroundColor: '#f7f7f7',
    opacity: 0.85,
    borderColor: '#cccccc',
    borderWidth: 1,
  },
  timeSlotTextLocked: {
    color: '#757575',
    fontWeight: 'bold',
    textDecorationLine: 'line-through',
    letterSpacing: 1,
  },
  // OK / NOT OK buttons 
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },

  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    minWidth: 82,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },

  statusButtonOK: { borderColor: '#28a745' },
  statusButtonNotOK: { borderColor: '#dc3545' },
  statusButtonActive: { borderWidth: 2 },
  statusButtonOKActive: { backgroundColor: '#28a745' },
  statusButtonNotOKActive: { backgroundColor: '#dc3545' },

  statusButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#666',
  },
  statusButtonTextActive: { color: '#fff' },
  statusButtonInactive: { opacity: 0.5 },

  // style tombol GNR
  gnrButtonsWrap: {
    width: '100%',
    paddingHorizontal: 4,
  },
  gnrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gnrRowBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ukuran sel
  gnrHalf: {
    flexBasis: '48%',
  },
  gnrWideCenter: {
    width: '48%',
    alignSelf: 'center',
  },

  // tombol dasar 
  gnrButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  gnrButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#666',
  },
  gnrButtonInactive: {
    opacity: 0.5,
  },
  statusButtonInactive: {
    opacity: 0.5,
  },
  gnrButtonTextActive: { color: '#fff' },

  // state/warna
  gnrButtonActive: { borderWidth: 2 },
  gnrButtonG: { borderColor: '#28a745' },
  gnrButtonN: { borderColor: '#ffc107' },
  gnrButtonR: { borderColor: '#dc3545' },
  gnrButtonGActive: { backgroundColor: '#28a745' },
  gnrButtonNActive: { backgroundColor: '#ffc107' },
  gnrButtonRActive: { backgroundColor: '#dc3545' },
});

export default GnrPerformanceInspectionTableBC;
