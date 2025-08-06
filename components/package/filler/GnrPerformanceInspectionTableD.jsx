import { Picker } from "@react-native-picker/picker";
import { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, TextInput, View, Alert, TouchableOpacity } from "react-native";
import { api } from "../../../utils/axiosInstance";
import moment from "moment-timezone";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Template khusus untuk LINE D
const defaultTemplateD = [
  // Cek parameter mesin per jam
  {
    activity: "H2O2 Spray nozzle 1 (ml/min)",
    good: "2.00",
    reject: "<2.0",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "H2O2 Spray nozzle 2 (ml/min)",
    good: "2.00",
    reject: "<2.0",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "H2O2 Spray (MCCP 03) nozzle 3 (ml/min)",
    good: "2.00",
    reject: "<2.0",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "H2O2 Spray (MCCP 03) nozzle 4 (ml/min)",
    good: "2.00",
    reject: "<2.0",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Flowrate",
    good: "2.00",
    reject: "<2.0",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Periode Pressure [mbar]",
    good: "750 - 950",
    reject: "<750 / >950",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Hepa pressure [mmmwg]",
    good: "10 - 25",
    reject: "<10 / >25",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Level secondary water (di garis hitam)",
    good: "di garis hitam",
    reject: "> garis hitam",
    periode: "Tiap Jam",
    status: 0,
  },
  {
    activity: "Temp. secondary water (<C)",
    good: "17 - 24",
    reject: "<17 / >24",
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
    good: "410 - 430",
    reject: "<410 / >430",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Temp. top seal (<C)",
    good: "260 - 280",
    reject: "<260 / >280",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "cap welding energy (J)",
    good: "130 - 170",
    reject: "<130 / >170",
    periode: "Tiap Jam",
    status: 1,
  },
  // Cek kondisi mesin per 30 menit (sama dengan LINE lainnya)
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

const GnrPerformanceInspectionTableD = ({ username, onDataChange, initialData, plant, line, machine, type, shift: parentShift }) => {
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

  // Prevent reset on machine/type change if data exists
  const previousMachineRef = useRef(machine);
  const previousTypeRef = useRef(type);

  // Track user activity
  const updateUserActivity = () => {
    setIsUserActive(true);
    setLastActivityTime(Date.now());

    // Set inactive after 5 minutes of no activity
    clearTimeout(window.inactivityTimer);
    window.inactivityTimer = setTimeout(() => {
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
    const date = moment().tz("Asia/Jakarta").format("YYYY-MM-DD");
    const currentShift = shift || getCurrentShift();
    return `gnr_${plant}_${line}_${machine}_${date}_${currentShift}_${type}`;
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

  const loadSavedData = () => {
    const now = new Date().getTime();

    // Clear previous results first for current slot
    setInspectionData(current => {
      return current.map(item => {
        // For hourly items, only show results for selected slot
        if (item.periode === "Tiap Jam" && selectedHourlySlot) {
          const savedSlotData = savedHourlyData[selectedHourlySlot];
          if (savedSlotData) {
            const saved = savedSlotData.find(s => s.activity === item.activity);
            if (saved) {
              return {
                ...item,
                results: String(saved.results || ""),
                user: saved.user || "",
                time: saved.time || "",
                done: saved.done || false,
                hourSlot: selectedHourlySlot,
                evaluatedResult: saved.evaluatedResult || ""
              };
            }
          }
          // Clear results if no saved data for this slot
          return {
            ...item,
            results: "",
            user: "",
            time: "",
            done: false,
            hourSlot: "",
            evaluatedResult: ""
          };
        }

        // For 30-min items, only show results for selected slot
        if (item.periode === "30 menit" && selected30MinSlot) {
          const savedSlotData = saved30MinData[selected30MinSlot];
          if (savedSlotData) {
            const saved = savedSlotData.find(s => s.activity === item.activity);
            if (saved) {
              return {
                ...item,
                results: saved.results || "",
                user: saved.user || "",
                time: saved.time || "",
                done: saved.done || false,
                timeSlot: selected30MinSlot
              };
            }
          }
          // Clear results if no saved data for this slot
          return {
            ...item,
            results: "",
            user: "",
            time: "",
            done: false,
            timeSlot: ""
          };
        }

        return item;
      });
    });
  };

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

  // Save ALL data before submit with proper expiry times - FIXED VERSION
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
        if (slot) {
          if (!all30MinData[slot]) {
            all30MinData[slot] = [];
          }
          all30MinData[slot].push({
            activity: item.activity,
            results: item.results,
            user: item.user || username,
            time: item.time || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            done: item.done || !!item.results,
            timeSlot: slot
          });
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

    // Merge with existing saved data for 30-min
    const updated30MinData = { ...saved30MinData };

    // Save all 30-min data with 30 minutes expiry
    Object.keys(all30MinData).forEach(slot => {
      updated30MinData[slot] = all30MinData[slot];
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

  // Initialize time tracking with user activity check
  useEffect(() => {
    setShift(parentShift || getCurrentShift());

    // Auto-pick slot HANYA jika user tidak aktif atau tidak ada unsaved data
    if (!isUserActive && !hasUnsavedData) {
      const now = moment().tz("Asia/Jakarta");
      const hour = now.hour();
      const minute = now.minute();
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

      // Only change slot if different from current
      if (slot && slot !== selectedHourlySlot) {
        // Save current data before changing slot
        if (hasUnsavedData) {
          saveDataBeforeSubmit();
        }
        setSelectedHourlySlot(slot);
      }

      // Similar logic for 30-min slot
      if (slot) {
        const nextHour = (hour + 1) % 24;
        let slot30 = "";
        if (minute < 30) {
          slot30 = `${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:30`;
        } else {
          slot30 = `${hour.toString().padStart(2, '0')}:30 - ${nextHour.toString().padStart(2, '0')}:00`;
        }
        if (slot30 && slot30 !== selected30MinSlot) {
          setSelected30MinSlot(slot30);
        }
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
    }, 60000);

    return () => clearInterval(interval);
  }, [lastHourCheck, last30MinCheck, parentShift, isUserActive, hasUnsavedData, selectedHourlySlot, selected30MinSlot]);

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

      // First, create base template using D template
      const baseTemplate = defaultTemplateD.map((templateItem) => {
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
      const fallbackData = defaultTemplateD.map(item => ({
        ...item,
        results: "",
        done: false,
        user: "",
        time: "",
        content: "",
        need: item.need || "-",
        timeSlot: "",
        hourSlot: "",
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

  const parseRange = (rangeStr) => {
    if (!rangeStr || rangeStr === "-") return null;

    // Handle special case for exact values like "2.00"
    if (!isNaN(parseFloat(rangeStr)) && !rangeStr.includes(" - ")) {
      const value = parseFloat(rangeStr);
      return { type: "exact", value };
    }

    // Handle special case for "≤ 4" format
    if (rangeStr.includes("≤ ")) {
      const value = parseFloat(rangeStr.replace("≤ ", ""));
      if (!isNaN(value)) {
        return { type: "single", operator: "<=", value };
      }
    }

    if (rangeStr.includes("< ") || rangeStr.includes(">= ")) {
      const match = rangeStr.match(/([<>=]+)\s*(\d+)/);
      if (match) {
        const operator = match[1];
        const value = parseFloat(match[2]);
        return { type: "single", operator, value };
      }
    }

    if (rangeStr.includes(" - ")) {
      const parts = rangeStr.split(" - ");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        const max = parseFloat(parts[1]);
        if (!isNaN(min) && !isNaN(max)) {
          return { type: "range", min, max };
        }
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
        if (trimmed.startsWith("<")) {
          const value = parseFloat(trimmed.substring(1));
          if (!isNaN(value)) {
            conditions.push({ operator: "<", value });
          }
        } else if (trimmed.startsWith(">")) {
          const value = parseFloat(trimmed.substring(1));
          if (!isNaN(value)) {
            conditions.push({ operator: ">", value });
          }
        } else if (trimmed.startsWith(">=")) {
          const value = parseFloat(trimmed.substring(2));
          if (!isNaN(value)) {
            conditions.push({ operator: ">=", value });
          }
        }
      });

      return conditions;
    }

    // Handle single condition like "<2.0"
    const trimmed = rejectStr.trim();
    if (trimmed.startsWith("<")) {
      const value = parseFloat(trimmed.substring(1));
      if (!isNaN(value)) {
        return [{ operator: "<", value }];
      }
    }

    return null;
  };

  const evaluateValue = (inputValue, goodCriteria, rejectCriteria) => {
    // Handle empty or non-numeric values
    if (!inputValue || inputValue === "") return "default";

    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) return "default";

    const goodRange = parseRange(goodCriteria);
    const rejectConditions = parseReject(rejectCriteria);

    // Check reject conditions first
    if (rejectConditions && rejectConditions.length > 0) {
      for (const condition of rejectConditions) {
        if (condition.operator === "<" && numValue < condition.value) return "reject";
        if (condition.operator === ">" && numValue > condition.value) return "reject";
        if (condition.operator === ">=" && numValue >= condition.value) return "reject";
      }
    }

    // Check good range
    if (goodRange) {
      if (goodRange.type === "range") {
        if (numValue >= goodRange.min && numValue <= goodRange.max) return "good";
      } else if (goodRange.type === "single") {
        if (goodRange.operator === "< " && numValue < goodRange.value) return "good";
        if (goodRange.operator === ">= " && numValue >= goodRange.value) return "good";
        if (goodRange.operator === "<=" && numValue <= goodRange.value) return "good";
      } else if (goodRange.type === "exact") {
        if (numValue === goodRange.value) return "good";
      }
    }

    // If not reject and not good, then it's need
    return "need";
  };

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

    // Cek apakah ada yang reject
    if (filledItems.some(item => item.results === "R")) return "R";
    // Cek apakah ada yang need
    if (filledItems.some(item => item.results === "N")) return "N";
    // Cek apakah semua good
    if (filledItems.length === groupItems.length && filledItems.every(item => item.results === "G")) return "G";

    return "";
  };

  // Update fungsi getBackgroundColor
  const getBackgroundColor = (item) => {
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
      return "#e8f4f8"; // Default color untuk grup header
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

  // Filter data based on selected slots - FIXED VERSION
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
    // Track user activity
    updateUserActivity();

    // Clear existing timeout for this index
    if (debounceTimeouts.current[index]) {
      clearTimeout(debounceTimeouts.current[index]);
    }

    // Update immediately with local state
    setInspectionData(prevData => {
      const updated = [...prevData];
      const item = updated[index];

      // Return early if conditions not met
      if (item.periode === "Tiap Jam" && !selectedHourlySlot) return prevData;
      if (item.periode === "30 menit" && !selected30MinSlot) return prevData;

      // Mark that we have unsaved data
      setHasUnsavedData(true);

      // Update only the results field to preserve the input
      updated[index] = {
        ...item,
        results: text
      };

      return updated;
    });

    // Debounce the full update
    debounceTimeouts.current[index] = setTimeout(() => {
      setInspectionData(prevData => {
        const updated = [...prevData];
        const now = new Date();
        const item = updated[index];

        // Full update with metadata
        updated[index] = {
          ...item,
          results: text,
          user: username,
          time: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          done: !!text
        };

        // Assign time slot and evaluation
        if (item.periode === "Tiap Jam") {
          updated[index].hourSlot = selectedHourlySlot;
          const evalResult = evaluateValue(text, item.good, item.reject);
          updated[index].evaluatedResult = evalResult === "good" ? "G" : evalResult === "reject" ? "R" : evalResult === "need" ? "N" : "";
        } else if (item.periode === "30 menit") {
          updated[index].timeSlot = selected30MinSlot;
        }

        // Delay onDataChange to prevent rendering warning
        setTimeout(() => {
          onDataChange(updated);
        }, 0);

        // Save data immediately after change
        setTimeout(() => {
          saveDataBeforeSubmit();
          setHasUnsavedData(false); // Reset after saving
        }, 100);

        return updated;
      });
    }, 300); // 300ms debounce
  }, [selectedHourlySlot, selected30MinSlot, username, onDataChange, saveDataBeforeSubmit]);

  // Hook to handle data persistence after parent submit - FIXED VERSION
  useEffect(() => {
    // Expose save function to parent
    if (window.gnrDBeforeSubmit !== saveDataBeforeSubmit) {
      window.gnrDBeforeSubmit = saveDataBeforeSubmit;
    }

    // Auto-save every 30 seconds
    const autoSaveInterval = setInterval(() => {
      if (inspectionData.some(item => item.results)) {
        saveDataBeforeSubmit();
      }
    }, 30000);

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [saveDataBeforeSubmit]);

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

  // Add visual indicator for unsaved changes
  const getSlotButtonStyle = (slot, isActive, hasSavedData) => {
    const buttonStyles = [styles.hourlySlotButton];

    if (isActive) {
      buttonStyles.push(styles.timeSlotButtonActive);
    }

    if (hasSavedData) {
      buttonStyles.push(styles.timeSlotButtonWithData);
    }

    // Add special style for slot with unsaved data
    if (isActive && hasUnsavedData) {
      buttonStyles.push(styles.timeSlotButtonUnsaved);
    }

    return buttonStyles;
  };

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
            <Text style={styles.sectionTitle}>PEMERIKSAAN PER JAM (LINE D)</Text>
            {/* Hourly Time Slot Selector */}
            <View style={styles.timeSlotContainer}>
              <Text style={styles.timeSlotLabel}>Jam:</Text>
              <View style={styles.timeSlotGrid}>
                {generateHourlySlots().map((slot) => {
                  const isCurrentSlot = slot === getCurrentHourSlot();
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.hourlySlotButton,
                        isCurrentSlot ? styles.timeSlotButtonActive : styles.timeSlotButtonLocked,
                      ]}
                      disabled={!isCurrentSlot}
                      onPress={() => {
                        if (isCurrentSlot) setSelectedHourlySlot(slot);
                      }}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        isCurrentSlot ? styles.timeSlotTextActive : styles.timeSlotTextLocked
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
                        <TextInput
                          placeholder="isi disini"
                          style={[styles.tableInput, { color: textColor }]}
                          value={item.results || ""}
                          onChangeText={(text) => handleInputChange(text, originalIndex)}
                          placeholderTextColor={textColor === "#fff" ? "#ccc" : "#999"}
                          keyboardType="default"
                          autoCorrect={false}
                          autoCapitalize="none"
                          selectTextOnFocus={false}
                          multiline={false}
                          blurOnSubmit={true}
                          underlineColorAndroid="transparent"
                        />
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
          <Text style={styles.sectionTitle}>PEMERIKSAAN PER 30 MENIT (LINE D)</Text>
          {/* 30-Min Time Slot Selector */}
          <View style={styles.timeSlotContainer}>
            <Text style={styles.timeSlotLabel}>Pilih Slot 30 Menit {selectedHourlySlot && `(untuk jam ${selectedHourlySlot.split(' - ')[0]})`}:</Text>
            <View style={styles.timeSlotButtons}>
              {generate30MinSlots(getCurrentHourSlot()).map((slot) => {
                const isCurrentSlot = slot === getCurrent30MinSlot();
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeSlotButton,
                      isCurrentSlot ? styles.timeSlotButtonActive : styles.timeSlotButtonLocked,
                    ]}
                    disabled={!isCurrentSlot}
                    onPress={() => {
                      if (isCurrentSlot) setSelected30MinSlot(slot);
                    }}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      isCurrentSlot ? styles.timeSlotTextActive : styles.timeSlotTextLocked
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
                      <Picker
                        selectedValue={item.results}
                        onValueChange={(value) => handleInputChange(value, originalIndex)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select" value="" />
                        <Picker.Item label="Good" value="G" />
                        <Picker.Item label="Need" value="N" />
                        <Picker.Item label="Reject" value="R" />
                      </Picker>
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
  picker: {
    width: "100%",
    height: 40,
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
  unsavedIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff9800',
    borderRadius: 10,
    padding: 5,
  },
  unsavedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
});

export default GnrPerformanceInspectionTableD;
