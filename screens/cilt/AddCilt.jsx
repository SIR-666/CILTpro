import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ScreenOrientation from "expo-screen-orientation";
import moment from "moment-timezone";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { Checkbox } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import ChecklistCILTInspectionTable from "../../components/package/filler/ChecklistCILTInspectionTable";
import GnrPerformanceInspectionTable from "../../components/package/filler/GnrPerformanceInspectionTable";
import H2o2CheckInspectionTable from "../../components/package/filler/h2o2CheckInspectionTable";
import PaperUsageInspectionTable from "../../components/package/filler/PaperUsageInspectionTable";
import ScrewCapInspectionTable from "../../components/package/filler/ScrewCapInspectionTable";
import SegregasiInspectionTable from "../../components/package/filler/SegregasiInspectionTable";
import ArtemaCardboardInspectionTable from "../../components/package/packer/ArtemaCardboardInspectionTable";
import FransCasePackerInspectionTable from "../../components/package/packer/FransCasePackerInspectionTable";
import A3FlexInspectionTable from "../../components/package/filler/A3FlexInspectionTable";
import A3FlexInspectionTablePage1 from "../../components/package/filler/A3FlexInspectionTablePage1";
import A3StartFinishInspectionTable from "../../components/package/filler/A3StartFinishInspectionTable";
import CombiXGSlim24ProductInspectionTable from "../../components/package/filler/CombiXGSlim24ProductInspectionTable";
import CombiXGSlim24CheckInspectionTable from "../../components/package/filler/CombiXGSlim24CheckInspectionTable";
import RobotPalletizerFillerInspectionTable from "../../components/package/robot/RobotPalletizerFillerInspectionTable";
import ReusableDatetime2 from "../../components/Reusable/ReusableDatetime2";
import { COLORS } from "../../constants/theme";
import { api, uploadImageApi } from "../../utils/axiosInstance";

// Image upload function with improved error handling
const uploadImageToServer = async (uri) => {
  const formData = new FormData();

  formData.append("images", {
    uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
    type: "image/jpeg",
    name: uri.split("/").pop(),
  });

  try {
    const response = await uploadImageApi.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.status !== 200 && response.status !== 201) {
      console.error(
        "Failed to upload image",
        response.status,
        response.statusText
      );
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    const serverImageUrl = response.data.uploadedFiles[0];
    return serverImageUrl;
  } catch (error) {
    console.error("Image upload failed:", error);
    throw new Error("Image upload failed");
  }
};

// Get shift by hour
const getShiftByHour = (hour) => {
  const shift1 = ["06", "07", "08", "09", "10", "11", "12", "13"];
  const shift2 = ["14", "15", "16", "17", "18", "19", "20", "21"];
  const shift3 = ["22", "23", "00", "01", "02", "03", "04", "05"];

  if (shift1.includes(hour)) return "Shift 1";
  if (shift2.includes(hour)) return "Shift 2";
  if (shift3.includes(hour)) return "Shift 3";
  return "Unknown Shift";
};

const getDraftContextCacheKey = (type, po, shiftName) => {
  if (!type || !po || !shiftName) return "";
  return `${type}__${po}__${shiftName}`;
};

const getDraftShiftCacheKey = (type, shiftName, plant, line, machine) => {
  if (!type || !shiftName) return "";
  return `${type}__${shiftName}__${plant || ""}__${line || ""}__${machine || ""}`;
};

const DRAFT_IGNORED_KEYS = new Set([
  "id",
  "plant",
  "line",
  "machine",
  "packageType",
  "processOrder",
  "product",
  "batch",
  "shift",
  "currentShift",
  "username",
  "user",
  "time",
  "done",
  "status",
  "content",
  "useButtons",
  "isGroupHeader",
  "isSubItem",
  "groupName",
  "periode",
  "good",
  "need",
  "reject",
  "hourSlot",
  "timeSlot",
  "evaluatedResult",
  "createdAt",
  "updatedAt",
  "formOpenTime",
  "submitTime",
  "date",
  "saved",
  "savedAt",
  "lastModifiedBy",
  "lastModifiedTime",
  "activeTab",
  "page",
  "data",
  "grouped",
  "type",
  "parameter_name",
  "unit",
  "value_type",
  "min_value",
  "max_value",
  "exact_value",
  "frm",
  "rev",
  "berlaku",
  "hal",
  "lineMc",
  "mesinLine",
  "no",
  "activity",
  "globalId",
]);

const hasMeaningfulDraftValue = (value, key = "") => {
  if (value === null || value === undefined) return false;

  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulDraftValue(item));
  }

  if (typeof value === "object") {
    return Object.entries(value).some(([childKey, childValue]) => {
      if (DRAFT_IGNORED_KEYS.has(childKey)) return false;
      return hasMeaningfulDraftValue(childValue, childKey);
    });
  }

  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value === true;

  return false;
};

const getMeaningfulDraftRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => hasMeaningfulDraftValue(row));
};

// PRODUCT FILTER BY LINE
const filterProductsByLine = (products, line) => {
  if (!line) return products;

  const upperLine = line.toUpperCase();

  // LINE A, B, C
  if (["LINE A", "LINE B", "LINE C"].includes(upperLine)) {
    return products.filter(p => {
      const label = p.label?.toUpperCase() || "";
      return (
        label.includes("GF MILK ESL") &&
        !label.includes("1890")
      );
    });
  }

  // LINE D
  if (upperLine === "LINE D") {
    return products.filter(p => {
      const label = p.label?.toUpperCase() || "";
      return (
        label.includes("GF MILK ESL") &&
        label.includes("1890")
      );
    });
  }

  // default → semua product
  return products;
};

const CILTinspection = ({ route, navigation }) => {
  const { username } = route.params;
  const [processOrder, setProcessOrder] = useState("");
  const [packageType, setPackageType] = useState("");
  const [plant, setPlant] = useState("");
  const [line, setLine] = useState("");
  const [date, setDate] = useState(new Date());
  const [shift, setShift] = useState(
    getShiftByHour(moment(new Date()).tz("Asia/Jakarta").format("HH"))
  );

  const [productOptions, setProductOptions] = useState([]);
  const [baseProduct, setBaseProduct] = useState("");
  const [product, setProduct] = useState("");
  const [machine, setMachine] = useState("");
  const [batch, setBatch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formOpenTime, setFormOpenTime] = useState(null);
  const [hideDateInput, setHideDateInput] = useState(false);
  const [inspectionData, setInspectionData] = useState([]);
  const [segregationDescriptionData, setSegregationDescriptionData] = useState([]);
  const [plantOptions, setPlantOptions] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);
  const [packageOptions, setPackageOptions] = useState([]);
  const [packageMasterRaw, setPackageMasterRaw] = useState([]);

  // Cache untuk menyimpan data inspection per package type
  const [packageDataCache, setPackageDataCache] = useState({});

  // Cache untuk menyimpan description data (khusus Segregasi)
  const [packageDescriptionCache, setPackageDescriptionCache] = useState({});

  // state custom plants, machines, packages
  const [customPlants, setCustomPlants] = useState([]);
  const [customMachines, setCustomMachines] = useState([]);
  const [customPackages, setCustomPackages] = useState([]);
  const [isCustomDataLoaded, setIsCustomDataLoaded] = useState(false);

  // State untuk trigger clear data inspection setelah submit
  const [shouldClearInspectionData, setShouldClearInspectionData] = useState(false);
  const clearTriggerRef = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const savedSelectionsRef = useRef({ plant: "", line: "", machine: "" });

  // autosave states
  const [draftId, setDraftId] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autosaveTimer = useRef(null);
  const isHydratingDraftRef = useRef(false);
  const shiftBoundaryInProgressRef = useRef(false);
  const packageDataCacheRef = useRef({});
  const packageDescriptionCacheRef = useRef({});
  const draftContextMetaRef = useRef({});
  const draftIdByContextRef = useRef({});
  const lastClockShiftRef = useRef(
    getShiftByHour(moment(new Date()).tz("Asia/Jakarta").format("HH"))
  );
  const lastAppliedContextRef = useRef("");
  const isFromDraftList = route?.params?.fromDraftList === true;

  const mergedMachineOptions = useMemo(() => {
    const base = Array.isArray(machineOptions) ? machineOptions : [];
    const custom = Array.isArray(customMachines) ? customMachines : [];
    return [...new Set([...base, ...custom].filter(Boolean))].sort();
  }, [machineOptions, customMachines]);

  const filteredProductOptions = useMemo(() => {
    return filterProductsByLine(productOptions, line);
  }, [productOptions, line]);

  const meaningfulInspectionData = useMemo(
    () => getMeaningfulDraftRows(inspectionData),
    [inspectionData]
  );
  const meaningfulDescriptionData = useMemo(
    () => getMeaningfulDraftRows(segregationDescriptionData),
    [segregationDescriptionData]
  );
  const hasMeaningfulDraftInput =
    meaningfulInspectionData.length > 0 || meaningfulDescriptionData.length > 0;
  const currentContextKey = useMemo(
    () => getDraftContextCacheKey(packageType, processOrder, shift),
    [packageType, processOrder, shift]
  );
  const currentShiftKey = useMemo(
    () => getDraftShiftCacheKey(packageType, shift, plant, line, machine),
    [packageType, shift, plant, line, machine]
  );
  const currentInspectionInitialData = useMemo(() => {
    if (!packageType) return [];
    if (
      currentContextKey &&
      Array.isArray(packageDataCache[currentContextKey])
    ) {
      return packageDataCache[currentContextKey];
    }
    if (currentShiftKey && Array.isArray(packageDataCache[currentShiftKey])) {
      return packageDataCache[currentShiftKey];
    }
    return [];
  }, [packageType, currentContextKey, currentShiftKey, packageDataCache]);
  const currentDescriptionInitialData = useMemo(() => {
    if (!packageType) return [];
    if (
      currentContextKey &&
      Array.isArray(packageDescriptionCache[currentContextKey])
    ) {
      return packageDescriptionCache[currentContextKey];
    }
    if (
      currentShiftKey &&
      Array.isArray(packageDescriptionCache[currentShiftKey])
    ) {
      return packageDescriptionCache[currentShiftKey];
    }
    return [];
  }, [packageType, currentContextKey, currentShiftKey, packageDescriptionCache]);

  useEffect(() => {
    packageDataCacheRef.current = packageDataCache;
  }, [packageDataCache]);

  useEffect(() => {
    packageDescriptionCacheRef.current = packageDescriptionCache;
  }, [packageDescriptionCache]);

  useEffect(() => {
    if (!currentContextKey) {
      if (draftId !== null) setDraftId(null);
      return;
    }
    const mappedId = draftIdByContextRef.current[currentContextKey] || null;
    if (mappedId !== draftId) {
      setDraftId(mappedId);
    }
  }, [currentContextKey, draftId]);

  // callbacks ke children (stabil, anti-loop)
  const handleInspectionChange = useCallback((data) => {
    setInspectionData(data);
    // Simpan ke cache berdasarkan package type
    if (packageType) {
      const contextKey = getDraftContextCacheKey(packageType, processOrder, shift);
      const shiftKey = getDraftShiftCacheKey(packageType, shift, plant, line, machine);
      setPackageDataCache(prev => ({
        ...prev,
        [packageType]: data,
        ...(contextKey ? { [contextKey]: data } : {}),
        ...(shiftKey ? { [shiftKey]: data } : {}),
      }));
      if (contextKey) {
        draftContextMetaRef.current[contextKey] = {
          packageType,
          processOrder,
          shift,
          plant,
          line,
          machine,
          product,
          batch,
        };
      }
      console.log(`Cached inspection data for: ${packageType}`, data.length, "items");
    }
  }, [packageType, processOrder, shift, plant, line, machine, product, batch]);

  const handleSegregationDescriptionChange = useCallback((data) => {
    setSegregationDescriptionData(data);

    // Simpan description data ke cache
    if (packageType === "SEGREGASI") {
      const contextKey = getDraftContextCacheKey(packageType, processOrder, shift);
      const shiftKey = getDraftShiftCacheKey(packageType, shift, plant, line, machine);
      setPackageDescriptionCache(prev => ({
        ...prev,
        [packageType]: data,
        ...(contextKey ? { [contextKey]: data } : {}),
        ...(shiftKey ? { [shiftKey]: data } : {}),
      }));
      if (contextKey) {
        draftContextMetaRef.current[contextKey] = {
          packageType,
          processOrder,
          shift,
          plant,
          line,
          machine,
          product,
          batch,
        };
      }
      console.log(`Cached description data for: ${packageType}`, data.length, "items");
    }
  }, [packageType, processOrder, shift, plant, line, machine, product, batch]);

  // fungsi fetch custom data
  const fetchCustomData = async () => {
    try {
      console.log("Fetching custom data from master...");
      setIsCustomDataLoaded(false);

      // Fetch custom plants
      const plantsResponse = await api.get("/custom/plants");
      const plantsData = plantsResponse.data;
      const plants = Array.isArray(plantsData.data)
        ? plantsData.data.map(p => p.plant)
        : [];
      setCustomPlants(plants);
      console.log(`Loaded ${plants.length} custom plants`);

      // Fetch custom machines
      const machinesResponse = await api.get("/custom/machines");
      const machinesData = machinesResponse.data;
      const machines = Array.isArray(machinesData.data)
        ? machinesData.data.map(m => m.machine)
        : [];
      setCustomMachines(machines);
      console.log(`Loaded ${machines.length} custom machines`);

      // Fetch custom packages
      const packagesResponse = await api.get("/custom/packages");
      const packagesData = packagesResponse.data;
      const packages = Array.isArray(packagesData.data)
        ? packagesData.data
        : [];
      setCustomPackages(packages);
      console.log(`Loaded ${packages.length} custom packages`);
      setIsCustomDataLoaded(true);
      await fetchPackageMaster();

    } catch (error) {
      console.error("Failed to fetch custom data:", error);
      setCustomPlants([]);
      setCustomMachines([]);
      setCustomPackages([]);
      setIsCustomDataLoaded(true);
    }
  };

  const fetchPackageMaster = async () => {
    try {
      const response = await api.get("/package-master");
      const data = Array.isArray(response.data) ? response.data : [];
      setPackageMasterRaw(data);

      // Merge plant options: package_master + custom_plants
      const packageMasterPlants = [...new Set(data.map((item) => item.plant).filter(Boolean))];
      const mergedPlants = [...new Set([...packageMasterPlants, ...customPlants])].filter(Boolean);
      setPlantOptions(mergedPlants.sort());

      // Merge machine options: package_master + custom_machines
      const packageMasterMachines = [...new Set(data.map((item) => item.machine).filter(Boolean))];
      const mergedMachines = [...new Set([...packageMasterMachines, ...customMachines])].filter(Boolean);
      setMachineOptions(mergedMachines.sort());

      // Line options (hanya dari package_master)
      const uniqueLines = [...new Set(data.map((item) => item.line).filter(Boolean))];
      setLineOptions(uniqueLines.sort());
      console.log("Package master loaded:", data.length, "items");
    } catch (error) {
      console.error("Failed to fetch /package-master:", error);
    }
  };

  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      );
    };

    const loadSavedSelections = async () => {
      const savedPlant = await AsyncStorage.getItem("plant");
      const savedLine = await AsyncStorage.getItem("line");
      const savedMachine = await AsyncStorage.getItem("machine");
      const savedProduct = await AsyncStorage.getItem("product");

      // Simpan ke ref untuk digunakan di filtering
      savedSelectionsRef.current = {
        plant: savedPlant || "",
        line: savedLine || "",
        machine: savedMachine || ""
      };

      if (savedPlant) setPlant(savedPlant);
      if (savedLine) setLine(savedLine);
      if (savedMachine) setMachine(savedMachine);
      if (savedProduct) {
        setBaseProduct(savedProduct);
        setProduct(savedProduct);
      }
      return { savedPlant, savedLine, savedMachine };
    };

    const initializeData = async () => {
      await lockOrientation();
      const saved = await loadSavedSelections();
      const resume = route?.params?.resumeDraft;
      if (resume?.draftId) {
        await loadDraftDetail(resume.draftId);
      }
      await fetchCustomData();
    };
    initializeData();
    setFormOpenTime(moment().tz("Asia/Jakarta").format());
  }, []);

  useEffect(() => {
    if (!packageMasterRaw.length) {
      setPackageOptions([]);
      return;
    }

    // Gunakan nilai dari state, ATAU dari ref jika state masih kosong (initial load)
    const effectivePlant = plant || savedSelectionsRef.current.plant;
    const effectiveLine = line || savedSelectionsRef.current.line;
    const effectiveMachine = machine || savedSelectionsRef.current.machine;

    // Skip filtering jika tidak ada filter sama sekali
    if (!effectivePlant && !effectiveLine && !effectiveMachine) {
      console.log("No filters set, showing empty packages");
      setPackageOptions([]);
      return;
    }

    // Filter dari package master dengan kombinasi plant + line + machine
    const filteredMaster = packageMasterRaw.filter(item => {
      const matchPlant = effectivePlant
        ? item.plant?.toUpperCase().trim() === effectivePlant.toUpperCase().trim()
        : true;
      const matchLine = effectiveLine
        ? item.line?.toUpperCase().trim() === effectiveLine.toUpperCase().trim()
        : true;
      const matchMachine = effectiveMachine
        ? item.machine?.toUpperCase().trim() === effectiveMachine.toUpperCase().trim()
        : true;

      return matchPlant && matchLine && matchMachine;
    });

    // Filter custom packages dengan kombinasi line + machine
    const filteredCustom = customPackages.filter(item => {
      const matchLine = effectiveLine
        ? item.line?.toUpperCase().trim() === effectiveLine.toUpperCase().trim()
        : true;
      const matchMachine = effectiveMachine && item.machine
        ? item.machine?.toUpperCase().trim() === effectiveMachine.toUpperCase().trim()
        : true;

      return matchLine && matchMachine;
    });

    const mergedPackages = [
      ...new Set([
        ...filteredMaster.map(i => i.package),
        ...filteredCustom.map(i => i.package),
      ].filter(Boolean)),
    ];

    console.log("Final filtered packages:", mergedPackages);

    setPackageOptions(mergedPackages.sort());

    // Reset packageType jika tidak ada dalam options yang baru
    if (packageType && !mergedPackages.includes(packageType)) {
      setPackageType("");
    }
  }, [plant, line, machine, packageMasterRaw, customPackages, packageType]);

  const shiftOptions = [
    { label: "Shift 1", value: "Shift 1" },
    { label: "Shift 2", value: "Shift 2" },
    { label: "Shift 3", value: "Shift 3" },
  ];

  useFocusEffect(
    useCallback(() => {
      if (!isCustomDataLoaded && packageMasterRaw.length === 0) {
        refreshCustomDataSilently();
      }
    }, [isCustomDataLoaded, packageMasterRaw.length])
  );

  // function untuk manual refresh custom data
  const handleRefreshCustomData = async () => {
    try {
      Alert.alert("Refreshing", "Loading latest custom data from master...");
      setIsCustomDataLoaded(false);
      await fetchCustomData();
    } catch (error) {
      console.error("Error refreshing custom data:", error);
      Alert.alert("Error", "Failed to refresh custom data. Please try again.");
    }
  };

  const refreshCustomDataSilently = async () => {
    try {
      console.log("Auto refreshing custom data on screen focus...");
      await fetchCustomData();
    } catch (error) {
      console.error("Error auto refreshing custom data:", error);
    }
  };

  const lastCheckRef = useRef("");
  const buildCheckKey = (po, pt) => `${po}__${pt}`;

  const checkIfDataExists = async () => {
    const po = processOrder;
    const pt = packageType;

    if (!po || !pt) return;
    const checkKey = buildCheckKey(po, pt);
    lastCheckRef.current = checkKey;

    try {
      const response = await api.get(`/cilt/getCILTByProcessOrder?processOrder=${po}`);

      if (lastCheckRef.current !== checkKey) return;

      if (response.data.exists) {
        const parsedData = JSON.parse(response.data.data.inspectionData || "[]");
        const contextKey = getDraftContextCacheKey(pt, po, shift);
        const shiftKey = getDraftShiftCacheKey(pt, shift, plant, line, machine);

        if (inspectionData.length === 0) {
          setInspectionData(parsedData);
        }

        setPackageDataCache(prev => ({
          ...prev,
          [pt]: parsedData,
          ...(contextKey ? { [contextKey]: parsedData } : {}),
          ...(shiftKey ? { [shiftKey]: parsedData } : {}),
        }));

        if (pt === "SEGREGASI" && response.data.data.descriptionData) {
          const parsedDesc = JSON.parse(response.data.data.descriptionData || "[]");
          setSegregationDescriptionData(parsedDesc);
          setPackageDescriptionCache(prev => ({
            ...prev,
            [pt]: parsedDesc,
            ...(contextKey ? { [contextKey]: parsedDesc } : {}),
            ...(shiftKey ? { [shiftKey]: parsedDesc } : {}),
          }));
        }

        Alert.alert("Info", "Data ditemukan. Form akan dilanjutkan.");
      }
    } catch (e) {
      console.error("Failed to check existing data:", e);
      Alert.alert("Error", "Gagal cek data. Coba lagi.");
    }
  };

  // Clear package-specific storage after successful submit
  const clearPackageStorageAfterSubmit = async () => {
    try {
      if (packageType === "PEMAKAIAN PAPER" && globalThis.clearPaperStorage) {
        await globalThis.clearPaperStorage();
        return;
      }

      if (packageType === "PEMAKAIAN SCREW CAP" && globalThis.clearScrewCapStorage) {
        await globalThis.clearScrewCapStorage();
        return;
      }

      if (packageType === "SEGREGASI" && globalThis.clearSegregasiStorage) {
        await globalThis.clearSegregasiStorage();
        return;
      }

      if (packageType === "LAPORAN ARTEMA & SMS CARDBOARD") {
        const storageKey = `artema_cardboard_${(username || "user").replace(/\s+/g, "_")}`;
        await AsyncStorage.removeItem(storageKey);
        return;
      }

      if (packageType === "LAPORAN FRANS WP 25 CASE") {
        const storageKey = `frans_casepacker_${(username || "user").replace(/\s+/g, "_")}`;
        await AsyncStorage.removeItem(storageKey);
        return;
      }

      if (packageType === "ROBOT PALLETIZER FILLER") {
        const storageKey = `robot_palletizer_${(username || "user").replace(/\s+/g, "_")}`;
        await AsyncStorage.removeItem(storageKey);
        return;
      }
    } catch (e) {
      console.error("Error clearing package storage after submit:", e);
    }
  };

  // Fetch product options from API
  const fetchProductOptions = async (plant) => {
    try {
      const response = await api.get(`/cilt/sku?plant=${plant}`);
      const options = response.data.map((item) => ({
        id: item.id,
        label: item.material,
        value: item.material,
        type: item.material,
      }));

      setBaseProduct("");
      setProduct("");
      setProductOptions(options);
      const saved = await AsyncStorage.getItem("product");
      if (saved) {
        setBaseProduct(saved);
        setProduct(saved);
      }
    } catch (error) {
      console.error("Error fetching product options:", error);
      Alert.alert("Error", "Failed to fetch product options.");
    }
  };

  useEffect(() => {
    if (!plant) return;
    fetchProductOptions(plant);
  }, [plant]);

  useEffect(() => {
    if (!plant || !line || !machine || !packageType || !shift) return;

    const formattedPlant = plant.replace(/\s+/g, "-");
    const formattedLine = line.replace(/\s+/g, "-");
    const formattedDate = moment(date).tz("Asia/Jakarta").format("YYYY-MM-DD");
    const formattedShift = shift.replace(/\s+/g, "-");
    const formattedMachine = machine.replace(/\s+/g, "-");
    const formattedPackage = packageType.replace(/\s+/g, "-");

    const updated = `${formattedPlant}_${formattedLine}_${formattedDate}_${formattedShift}_${formattedMachine}_${formattedPackage}`;
    setProcessOrder(updated);
  }, [plant, line, date, shift, machine, packageType]);

  useEffect(() => {
    if (!processOrder || !packageType) return;
    checkIfDataExists();
  }, [processOrder, packageType]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!packageType) return;

    if (isHydratingDraftRef.current === true) {
      console.log("Skip package reset - hydrating draft");
      return;
    }

    console.log(`Package changed to: ${packageType}`);

    if (isHydratingDraftRef.current) {
      console.log("Hydrating draft... skip reset on package change");
      return;
    }

    const contextKey = getDraftContextCacheKey(packageType, processOrder, shift);
    const shiftKey = getDraftShiftCacheKey(packageType, shift, plant, line, machine);
    const cachedInspectionByContext =
      contextKey && Array.isArray(packageDataCache[contextKey])
        ? packageDataCache[contextKey]
        : null;
    const cachedInspectionByShift =
      shiftKey && Array.isArray(packageDataCache[shiftKey])
        ? packageDataCache[shiftKey]
        : null;
    const cachedDescriptionByContext =
      contextKey && Array.isArray(packageDescriptionCache[contextKey])
        ? packageDescriptionCache[contextKey]
        : null;
    const cachedDescriptionByShift =
      shiftKey && Array.isArray(packageDescriptionCache[shiftKey])
        ? packageDescriptionCache[shiftKey]
        : null;

    // Load inspection data dari cache context jika ada
    if (cachedInspectionByContext && cachedInspectionByContext.length > 0) {
      console.log(` Loading inspection data from context cache for: ${packageType}`);
      setInspectionData(cachedInspectionByContext);
    }
    else if (cachedInspectionByShift && cachedInspectionByShift.length > 0) {
      console.log(` Loading inspection data from shift cache for: ${packageType}`);
      setInspectionData(cachedInspectionByShift);
    }
    else {
      if (!draftId) {
        setInspectionData([]);
      }
    }

    // Load description data dari cache untuk Segregasi
    if (packageType === "SEGREGASI" && cachedDescriptionByContext) {
      console.log(` Loading description data from context cache for: ${packageType}`);
      setSegregationDescriptionData(cachedDescriptionByContext);
    } else if (packageType === "SEGREGASI" && cachedDescriptionByShift) {
      console.log(` Loading description data from shift cache for: ${packageType}`);
      setSegregationDescriptionData(cachedDescriptionByShift);
    } else if (packageType === "SEGREGASI") {
      console.log(`No description cache found for: ${packageType}, resetting`);
      setSegregationDescriptionData([]);
    }
  }, [
    packageType,
    processOrder,
    shift,
    plant,
    line,
    machine,
    draftId,
    packageDataCache,
    packageDescriptionCache,
  ]);

  useEffect(() => {
    if (!packageType || !processOrder || !shift) return;
    if (isHydratingDraftRef.current) return;

    const contextKey = getDraftContextCacheKey(packageType, processOrder, shift);
    const shiftKey = getDraftShiftCacheKey(packageType, shift, plant, line, machine);
    if (!contextKey) return;
    if (lastAppliedContextRef.current === contextKey) return;
    lastAppliedContextRef.current = contextKey;

    const inspectionByContext = packageDataCache[contextKey];
    const inspectionByShift = packageDataCache[shiftKey];
    const descByContext = packageDescriptionCache[contextKey];
    const descByShift = packageDescriptionCache[shiftKey];

    if (Array.isArray(inspectionByContext)) {
      setInspectionData(inspectionByContext);
    } else if (Array.isArray(inspectionByShift)) {
      setInspectionData(inspectionByShift);
    } else if (!draftId) {
      setInspectionData([]);
    }

    if (packageType === "SEGREGASI") {
      if (Array.isArray(descByContext)) {
        setSegregationDescriptionData(descByContext);
      } else if (Array.isArray(descByShift)) {
        setSegregationDescriptionData(descByShift);
      } else if (!draftId) {
        setSegregationDescriptionData([]);
      }
    }
  }, [
    packageType,
    processOrder,
    shift,
    plant,
    line,
    machine,
    draftId,
    packageDataCache,
    packageDescriptionCache,
  ]);

  useEffect(() => {
    if (isSubmitting) return;
    if (!processOrder || !plant || !line || !machine || !packageType) return;
    if (!hasMeaningfulDraftInput) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(() => {
      autoSaveDraft();
    }, 4000);

  }, [
    inspectionData,
    segregationDescriptionData,
    isSubmitting,
    draftId,
    processOrder,
    packageType,
    plant,
    line,
    machine,
    shift,
    product,
    batch,
    hasMeaningfulDraftInput,
  ]);

  const loadDraftDetail = async (id) => {
    try {
      isHydratingDraftRef.current = true;
      const res = await api.get(`/draft/${id}`);
      const d = res.data;

      const parsedInspection =
        typeof d.inspectionData === "string"
          ? JSON.parse(d.inspectionData || "[]")
          : d.inspectionData || [];

      const parsedDesc =
        typeof d.descriptionData === "string"
          ? JSON.parse(d.descriptionData || "[]")
          : d.descriptionData || [];
      const draftShift = d.currentShift || d.shift;
      const contextKey = getDraftContextCacheKey(d.packageType, d.processOrder, draftShift);
      const shiftKey = getDraftShiftCacheKey(d.packageType, draftShift, d.plant, d.line, d.machine);

      setDraftId(d.id);
      if (contextKey) {
        draftIdByContextRef.current[contextKey] = d.id;
        draftContextMetaRef.current[contextKey] = {
          packageType: d.packageType,
          processOrder: d.processOrder,
          shift: draftShift,
          plant: d.plant,
          line: d.line,
          machine: d.machine,
          product: d.product,
          batch: d.batch,
        };
      }

      if (d.packageType) {
        setPackageDataCache(prev => ({
          ...prev,
          [d.packageType]: parsedInspection,
          ...(contextKey ? { [contextKey]: parsedInspection } : {}),
          ...(shiftKey ? { [shiftKey]: parsedInspection } : {}),
        }));
      }

      if (d.packageType === "SEGREGASI") {
        setPackageDescriptionCache(prev => ({
          ...prev,
          [d.packageType]: parsedDesc,
          ...(contextKey ? { [contextKey]: parsedDesc } : {}),
          ...(shiftKey ? { [shiftKey]: parsedDesc } : {}),
        }));
      }

      setProcessOrder(d.processOrder);
      setPlant(d.plant);
      setLine(d.line);
      setMachine(d.machine);
      setShift(draftShift);
      setPackageType(d.packageType);
      setProduct(d.product);
      setBatch(d.batch);

      if (d.date) {
        setDate(new Date(d.date));
      } else if (d.formOpenTime) {
        setDate(new Date(d.formOpenTime));
      }

      if (d.packageType) {
        setPackageDataCache(prev => ({
          ...prev,
          [d.packageType]: parsedInspection,
          ...(contextKey ? { [contextKey]: parsedInspection } : {}),
          ...(shiftKey ? { [shiftKey]: parsedInspection } : {}),
        }));
      }

      setInspectionData(parsedInspection);
      if (d.packageType) {
        setPackageDataCache(prev => ({
          ...prev,
          [d.packageType]: parsedInspection,
          ...(contextKey ? { [contextKey]: parsedInspection } : {}),
          ...(shiftKey ? { [shiftKey]: parsedInspection } : {}),
        }));
      }

      setSegregationDescriptionData(parsedDesc);
      if (d.packageType === "SEGREGASI") {
        setPackageDescriptionCache(prev => ({
          ...prev,
          [d.packageType]: parsedDesc,
          ...(contextKey ? { [contextKey]: parsedDesc } : {}),
          ...(shiftKey ? { [shiftKey]: parsedDesc } : {}),
        }));
      }
      if (contextKey) lastAppliedContextRef.current = contextKey;

    } catch (e) {
      console.log("Load draft failed", e.message);
    } finally {
      setTimeout(() => {
        isHydratingDraftRef.current = false;
      }, 0);
    }
  };

  // Function for refresh inspection data (line universal)
  const handleRefreshInspectionData = () => {
    try {
      console.log(`Refreshing inspection data for Line ${line}, Package ${packageType}...`);

      if (packageType === "PERFORMA RED AND GREEN" && globalThis.gnrForceRefresh) {
        globalThis.gnrForceRefresh();
        Alert.alert("Refresh", `Data GNR Line ${line} berhasil di-refresh!`);
      }
      else if (packageType === "CHECKLIST CILT" && globalThis.checklistForceRefresh) {
        globalThis.checklistForceRefresh();
        Alert.alert("Refresh", `Data Checklist Line ${line} berhasil di-refresh!`);
      } else {
        Alert.alert("Info", "Refresh data tidak tersedia untuk package type ini");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      Alert.alert("Error", "Gagal me-refresh data. Silakan coba lagi.");
    }
  };

  const autoSaveDraft = useCallback(async (options = {}) => {
    const {
      force = false,
      contextKeyOverride,
      draftIdOverride,
      packageTypeOverride,
      processOrderOverride,
      shiftOverride,
      plantOverride,
      lineOverride,
      machineOverride,
      productOverride,
      batchOverride,
      inspectionDataOverride,
      descriptionDataOverride,
    } = options;

    if (isSubmitting) return { saved: false, reason: "submitting" };
    if (!force && isAutoSaving) return { saved: false, reason: "already-saving" };

    const effectivePackageType = packageTypeOverride || packageType;
    const effectiveProcessOrder = processOrderOverride || processOrder;
    const effectiveShift = shiftOverride || shift;
    const effectivePlant = plantOverride || plant;
    const effectiveLine = lineOverride || line;
    const effectiveMachine = machineOverride || machine;
    const effectiveProduct =
      productOverride !== undefined ? productOverride : product;
    const effectiveBatch =
      batchOverride !== undefined ? batchOverride : batch;

    if (!effectiveProcessOrder || !effectivePackageType) {
      return { saved: false, reason: "missing-context" };
    }

    const inspectionSource = Array.isArray(inspectionDataOverride)
      ? inspectionDataOverride
      : meaningfulInspectionData;
    const descriptionSource = Array.isArray(descriptionDataOverride)
      ? descriptionDataOverride
      : meaningfulDescriptionData;

    const inspectionToSave = getMeaningfulDraftRows(inspectionSource);
    const descriptionToSave = getMeaningfulDraftRows(descriptionSource);
    if (!inspectionToSave.length && !descriptionToSave.length) {
      return { saved: false, reason: "no-meaningful-data" };
    }

    const resolvedContextKey =
      contextKeyOverride ||
      getDraftContextCacheKey(
        effectivePackageType,
        effectiveProcessOrder,
        effectiveShift
      );
    const mappedDraftId =
      resolvedContextKey && draftIdByContextRef.current[resolvedContextKey]
        ? draftIdByContextRef.current[resolvedContextKey]
        : undefined;
    const effectiveDraftId =
      draftIdOverride !== undefined
        ? draftIdOverride
        : mappedDraftId || (resolvedContextKey === currentContextKey ? draftId : undefined);

    try {
      setIsAutoSaving(true);

      const payload = {
        id: effectiveDraftId || undefined,
        processOrder: effectiveProcessOrder,
        packageType: effectivePackageType,
        plant: effectivePlant,
        line: effectiveLine,
        machine: effectiveMachine,
        shift: effectiveShift,
        product: effectiveProduct,
        batch: effectiveBatch,
        inspectionData: inspectionToSave,
        descriptionData: descriptionToSave,
      };

      const res = await api.post("/draft/autosave", payload);

      if (res.data?.mode === "skip") {
        console.log("Autosave skipped by backend (no meaningful inspection)");
        return { saved: false, reason: "backend-skip" };
      }

      const resolvedId = res.data?.id || effectiveDraftId || null;
      if (resolvedContextKey) {
        if (resolvedId) {
          draftIdByContextRef.current[resolvedContextKey] = resolvedId;
        }
        draftContextMetaRef.current[resolvedContextKey] = {
          packageType: effectivePackageType,
          processOrder: effectiveProcessOrder,
          shift: effectiveShift,
          plant: effectivePlant,
          line: effectiveLine,
          machine: effectiveMachine,
          product: effectiveProduct,
          batch: effectiveBatch,
        };
      }
      if (resolvedContextKey === currentContextKey && resolvedId !== draftId) {
        setDraftId(resolvedId);
      }

      return { saved: true, id: resolvedId, contextKey: resolvedContextKey };
    } catch (e) {
      console.log("Autosave failed", e.message);
      return { saved: false, reason: "request-failed", error: e };
    } finally {
      setIsAutoSaving(false);
    }
  }, [
    isSubmitting,
    isAutoSaving,
    packageType,
    processOrder,
    shift,
    plant,
    line,
    machine,
    product,
    batch,
    meaningfulInspectionData,
    meaningfulDescriptionData,
    currentContextKey,
    draftId,
  ]);

  const saveAllPendingDraftContexts = useCallback(async (targetShift) => {
    const shiftToSave = targetShift || shift;
    const contextsToSave = [];
    const seen = new Set();

    Object.entries(draftContextMetaRef.current || {}).forEach(([contextKey, meta]) => {
      if (!meta || meta.shift !== shiftToSave) return;

      const inspectionRows = getMeaningfulDraftRows(
        packageDataCacheRef.current?.[contextKey] || []
      );
      const descriptionRows = getMeaningfulDraftRows(
        packageDescriptionCacheRef.current?.[contextKey] || []
      );
      if (!inspectionRows.length && !descriptionRows.length) return;

      contextsToSave.push({
        contextKey,
        meta,
        inspectionRows,
        descriptionRows,
      });
      seen.add(contextKey);
    });

    const activeContextKey = getDraftContextCacheKey(
      packageType,
      processOrder,
      shiftToSave
    );
    if (activeContextKey && !seen.has(activeContextKey)) {
      const activeInspectionRows = getMeaningfulDraftRows(inspectionData);
      const activeDescriptionRows = getMeaningfulDraftRows(segregationDescriptionData);
      if (activeInspectionRows.length || activeDescriptionRows.length) {
        contextsToSave.push({
          contextKey: activeContextKey,
          meta: {
            packageType,
            processOrder,
            shift: shiftToSave,
            plant,
            line,
            machine,
            product,
            batch,
          },
          inspectionRows: activeInspectionRows,
          descriptionRows: activeDescriptionRows,
        });
      }
    }

    let savedCount = 0;
    for (const entry of contextsToSave) {
      const result = await autoSaveDraft({
        force: true,
        contextKeyOverride: entry.contextKey,
        draftIdOverride: draftIdByContextRef.current[entry.contextKey],
        packageTypeOverride: entry.meta.packageType,
        processOrderOverride: entry.meta.processOrder,
        shiftOverride: entry.meta.shift,
        plantOverride: entry.meta.plant,
        lineOverride: entry.meta.line,
        machineOverride: entry.meta.machine,
        productOverride: entry.meta.product,
        batchOverride: entry.meta.batch,
        inspectionDataOverride: entry.inspectionRows,
        descriptionDataOverride: entry.descriptionRows,
      });
      if (result?.saved) savedCount += 1;
    }

    return {
      total: contextsToSave.length,
      savedCount,
    };
  }, [
    shift,
    packageType,
    processOrder,
    plant,
    line,
    machine,
    product,
    batch,
    inspectionData,
    segregationDescriptionData,
    autoSaveDraft,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const liveShift = getShiftByHour(
        moment(new Date()).tz("Asia/Jakarta").format("HH")
      );
      const previousLiveShift = lastClockShiftRef.current;

      if (!liveShift || liveShift === previousLiveShift) return;
      lastClockShiftRef.current = liveShift;

      // Hanya trigger jika user sedang berada di shift yang baru saja berakhir.
      if (shift !== previousLiveShift) return;
      if (isSubmitting || isHydratingDraftRef.current) return;
      if (shiftBoundaryInProgressRef.current) return;

      shiftBoundaryInProgressRef.current = true;
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }

      const previousShift = shift;

      (async () => {
        try {
          const saveResult = await saveAllPendingDraftContexts(previousShift);

          const now = new Date();
          setProcessOrder("");
          lastAppliedContextRef.current = "";
          setDraftId(null);
          setInspectionData([]);
          setSegregationDescriptionData([]);
          setDate(now);
          setShift(liveShift);

          if ((saveResult?.savedCount || 0) > 0) {
            navigation.navigate("ListCILTDraft");
          }
        } catch (e) {
          console.log("Auto shift rollover handling failed", e?.message || e);
        } finally {
          shiftBoundaryInProgressRef.current = false;
        }
      })();
    }, 30000);

    return () => clearInterval(interval);
  }, [shift, isSubmitting, saveAllPendingDraftContexts, navigation]);

  // Updated handleSubmit function
  const handleSubmit = async (status) => {
    Alert.alert(
      "Konfirmasi Submit",
      "Apakah anda yakin dengan data yang anda inputkan?",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Ya, Submit",
          onPress: async () => {
            setIsSubmitting(true);
            // langsung pakai format final untuk disimpan ke DB
            const submitTime = moment()
              .tz("Asia/Jakarta")
              .format("YYYY-MM-DD HH:mm:ss.SSS");
            let order = {};

            try {
              // Call GNR save function before submit jika form PERFORMA
              let inspectionDataForSubmit = inspectionData;
              if (
                packageType === "PERFORMA RED AND GREEN" &&
                typeof globalThis.gnrBeforeSubmit === "function"
              ) {
                console.log(
                  `Saving GNR data sebelum submit untuk Line ${line}...`
                );
                try {
                  const snapshot = await Promise.resolve(
                    globalThis.gnrBeforeSubmit()
                  );
                  // kalau anak mengembalikan array snapshot, pakai itu
                  if (Array.isArray(snapshot) && snapshot.length > 0) {
                    inspectionDataForSubmit = snapshot;
                  }
                } catch (e) {
                  console.error("Error gnrBeforeSubmit:", e);
                }
              }
              let updatedInspectionData;

              // Process inspection data
              updatedInspectionData = await Promise.all(
                inspectionDataForSubmit.map(async (item, index) => {
                  let updatedItem = { ...item, id: index + 1 };

                  if (item.picture && item.picture.startsWith("file://")) {
                    const serverImageUrl = await uploadImageToServer(
                      item.picture
                    );
                    updatedItem.picture = serverImageUrl;
                  }

                  return updatedItem;
                })
              );

              // Prepare order object
              order = {
                processOrder,
                packageType,
                plant,
                line,
                date: hideDateInput
                  ? undefined
                  : moment(date)
                    .tz("Asia/Jakarta")
                    .format("YYYY-MM-DD HH:mm:ss.SSS"),
                shift,
                product,
                machine,
                batch,
                remarks,
                inspectionData: updatedInspectionData,
                status: status,
                formOpenTime: moment(formOpenTime)
                  .tz("Asia/Jakarta")
                  .format("YYYY-MM-DD HH:mm:ss.SSS"),
                submitTime,
              };

              // Always save description data for SEGREGASI package, even if partially filled
              if (packageType === "SEGREGASI") {
                console.log("segregationDescriptionData:", segregationDescriptionData);

                // Save description data even if partially filled or empty
                order.descriptionData = JSON.stringify(segregationDescriptionData);

                // Also save username and timestamp for each description entry
                const descriptionWithMeta = segregationDescriptionData.map(item => ({
                  ...item,
                  lastModifiedBy: username,
                  lastModifiedTime: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")
                }));
                order.descriptionDataWithMeta = JSON.stringify(descriptionWithMeta);
              }

              console.log("Submitting order:", order);

              // Send to server
              let response;

              if (draftId) {
                response = await api.post(`/draft/submit/${draftId}`);
              } else {
                response = await api.post("/cilt", order);
              }

              if (response.status === 201) {

                if (autosaveTimer.current) {
                  clearTimeout(autosaveTimer.current);
                  autosaveTimer.current = null;
                }

                setIsSubmitting(false);
                isHydratingDraftRef.current = false;

                const wasDraftSubmit = !!draftId;
                const submittedContextKey = getDraftContextCacheKey(
                  packageType,
                  processOrder,
                  shift
                );
                const submittedShiftKey = getDraftShiftCacheKey(
                  packageType,
                  shift,
                  plant,
                  line,
                  machine
                );
                if (submittedContextKey) {
                  delete draftIdByContextRef.current[submittedContextKey];
                  delete draftContextMetaRef.current[submittedContextKey];
                }
                setDraftId(null);

                Alert.alert("Success", "Data submitted successfully!");

                await clearOfflineData();

                // Clear storage spesifik untuk package dan product ini setelah submit berhasil
                await clearPackageStorageAfterSubmit();

                // Trigger clear untuk inspection components
                clearTriggerRef.current += 1;
                setShouldClearInspectionData(true);

                // Reset trigger setelah delay singkat
                setTimeout(() => {
                  setShouldClearInspectionData(false);
                }, 100);

                setPackageDataCache(prev => {
                  const newCache = { ...prev };
                  if (packageType !== "PERFORMA RED AND GREEN") {
                    delete newCache[packageType];
                  }
                  if (submittedContextKey) delete newCache[submittedContextKey];
                  if (submittedShiftKey) delete newCache[submittedShiftKey];
                  return newCache;
                });

                setPackageDescriptionCache(prev => {
                  const newCache = { ...prev };
                  delete newCache[packageType];
                  if (submittedContextKey) delete newCache[submittedContextKey];
                  if (submittedShiftKey) delete newCache[submittedShiftKey];
                  return newCache;
                });

                if (packageType !== "PERFORMA RED AND GREEN") {
                  setInspectionData([]);
                  setSegregationDescriptionData([]);
                }

                const targetRoute =
                  wasDraftSubmit && isFromDraftList ? "ListCILT" : "Home";
                setTimeout(() => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: targetRoute }],
                    })
                  );
                }, 200);
              }
            } catch (error) {
              setIsSubmitting(false);
              console.error("Submit failed, saving offline data:", error);
              await saveOfflineData(order);
              Alert.alert(
                "Offline",
                "No network connection. Data has been saved locally and will be submitted when you are back online."
              );
            }
          },
        },
      ]
    );
  };

  // Save offline data when API submission fails
  const saveOfflineData = async (order) => {
    try {
      console.log("Saving offline data:", order);
      let offlineData = await AsyncStorage.getItem("offlineData");
      offlineData = offlineData ? JSON.parse(offlineData) : [];
      offlineData.push(order);
      await AsyncStorage.setItem("offlineData", JSON.stringify(offlineData));
    } catch (error) {
      console.error("Failed to save offline data:", error);
    }
  };

  const clearOfflineData = async () => {
    try {
      await AsyncStorage.removeItem("offlineData");
    } catch (error) {
      console.error("Failed to clear offline data:", error);
    }
  };

  // RESET ALL selections & caches
  const resetForm = async () => {
    try {
      // Bersihkan storage yang menyimpan pilihan terakhir
      savedSelectionsRef.current = { plant: "", line: "", machine: "" };
      await AsyncStorage.multiRemove(["plant", "line", "machine", "product"]);

      // Jika ada storage paket khusus, bersihkan juga
      try {
        if (packageType === "PEMAKAIAN PAPER" && globalThis.clearPaperStorage) {
          await globalThis.clearPaperStorage();
        } else if (packageType === "PEMAKAIAN SCREW CAP" && globalThis.clearScrewCapStorage) {
          await globalThis.clearScrewCapStorage();
        }
      } catch (e) {
        console.log("Optional package storage clear error:", e);
      }

      // Reset semua state pilihan
      setProcessOrder("");
      setPackageType("");
      setPlant("");
      setLine("");
      const now = new Date();
      setDate(now);
      setShift(getShiftByHour(moment(now).tz("Asia/Jakarta").format("HH")));
      setProduct("");
      setProductOptions([]);
      setMachine("");
      setBatch("");
      setRemarks("");
      setAgreed(false);
      setInspectionData([]);
      setSegregationDescriptionData([]);

      // Clear all caches
      setPackageDataCache({});
      setPackageDescriptionCache({});
      packageDataCacheRef.current = {};
      packageDescriptionCacheRef.current = {};
      draftContextMetaRef.current = {};
      draftIdByContextRef.current = {};
      lastAppliedContextRef.current = "";
      lastClockShiftRef.current = getShiftByHour(
        moment(new Date()).tz("Asia/Jakarta").format("HH")
      );
      console.log("All caches cleared");

      Alert.alert("Reset", "Semua pilihan dan data cache telah dikosongkan.");
    } catch (error) {
      console.error("Reset failed:", error);
      Alert.alert("Error", "Gagal melakukan reset. Coba lagi.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} nestedScrollEnabled={true}>
        <View style={styles.header}>
          <Text style={styles.title}>New Inspection Schedule</Text>
          {/* Tombol Refresh Custom Data dari Master Web */}
          <TouchableOpacity
            onPress={handleRefreshCustomData}
            accessibilityLabel="Refresh custom data from master"
            style={[styles.resetBtn, {
              right: 90,
              backgroundColor: '#e3f2fd',
              borderColor: '#2196f3'
            }]}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <MaterialCommunityIcons name="database-refresh" size={20} color="#2196f3" />
          </TouchableOpacity>

          {/* Tombol Refresh Inspection Data (GNR/Checklist) */}
          {line && packageType && (packageType === "PERFORMA RED AND GREEN" || packageType === "CHECKLIST CILT") && (
            <TouchableOpacity
              onPress={handleRefreshInspectionData}
              accessibilityLabel="Refresh inspection data"
              style={[styles.resetBtn, { right: 45, backgroundColor: '#e8f5e9', borderColor: '#4caf50' }]}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#4caf50" />
            </TouchableOpacity>
          )}

          {/* Tombol Reset Form */}
          <TouchableOpacity
            onPress={resetForm}
            accessibilityLabel="Reset semua pilihan"
            style={styles.resetBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={COLORS.blue} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Process Order *</Text>
          <View style={styles.dropdownContainer}>
            <MaterialCommunityIcons
              name="identifier"
              size={20}
              color={COLORS.lightBlue}
            />
            <TextInput style={styles.input} value={processOrder} editable={false} />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.blue} />
        ) : (
          <>
            <View style={styles.row}>
              {/* Select Date and Select Time */}
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Date *</Text>
                <View style={styles.dropdownContainer}>
                  <ReusableDatetime2
                    date={date}
                    setDate={setDate}
                    setShift={setShift}
                    getShiftByHour={getShiftByHour}
                  />
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Shift *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={shift}
                    style={styles.dropdown}
                    onValueChange={(itemValue) => {
                      if (packageType === "PERFORMA RED AND GREEN" && globalThis.gnrBeforeSubmit) {
                        globalThis.gnrBeforeSubmit();
                      }
                      setProcessOrder("");
                      lastAppliedContextRef.current = "";
                      setDraftId(null);
                      setInspectionData([]);
                      setSegregationDescriptionData([]);
                      setShift(itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {shiftOptions.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Plant *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="factory"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={plant}
                    style={styles.dropdown}
                    onValueChange={async (itemValue) => {
                      setPlant(itemValue);
                      await AsyncStorage.setItem("plant", itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {plantOptions.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Line *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="line-scan"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={line}
                    style={styles.dropdown}
                    onValueChange={async (itemValue) => {
                      setLine(itemValue);
                      await AsyncStorage.setItem("line", itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {lineOptions.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Machine *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="robot-industrial"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={machine}
                    style={styles.dropdown}
                    onValueChange={async (itemValue) => {
                      if (packageType === "PERFORMA RED AND GREEN" && globalThis.gnrBeforeSubmit) {
                        await globalThis.gnrBeforeSubmit();
                        await new Promise(r => setTimeout(r, 100));
                      }
                      setMachine(itemValue);
                      await AsyncStorage.setItem("machine", itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {mergedMachineOptions.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Package *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={packageType}
                    style={styles.dropdown}
                    enabled={!!line}
                    onValueChange={async (itemValue) => {
                      if (packageType === "PERFORMA RED AND GREEN" && globalThis.gnrBeforeSubmit) {
                        await globalThis.gnrBeforeSubmit();
                        await new Promise(r => setTimeout(r, 100));
                      }
                      setPackageType(itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {packageOptions.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Product *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="cup-water"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={product}
                    style={styles.dropdown}
                    onValueChange={async (itemValue) => {
                      setBaseProduct(itemValue);
                      setProduct(itemValue);
                      await AsyncStorage.setItem("product", itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {filteredProductOptions.map((option) => (
                      <Picker.Item
                        key={option.id}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Batch *</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name="numeric"
                    size={20}
                    color={COLORS.lightBlue}
                  />
                  <TextInput
                    style={styles.input}
                    value={batch}
                    onChangeText={(text) => setBatch(text)}
                    placeholder="Isi batch (contoh: 2)"
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroupBawah}>
              <Text style={styles.label}>Remarks *</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="card-text"
                  size={20}
                  color={COLORS.lightBlue}
                />
                <TextInput
                  placeholder="Catatan"
                  style={styles.input}
                  value={remarks}
                  onChangeText={(text) => setRemarks(text)}
                />
              </View>
            </View>

            <View style={styles.wrapper}>
              {machine === "FILLER" &&
                packageType === "PEMAKAIAN SCREW CAP" && (
                  <ScrewCapInspectionTable
                    key={`screw-cap-${processOrder}-${product}-${draftId || "new"}`}
                    username={username}
                    onDataChange={handleInspectionChange}
                    initialData={currentInspectionInitialData}
                    processOrder={processOrder}
                    product={product}
                  />
                )}
              {machine === "FILLER" && packageType === "PEMAKAIAN PAPER" && (
                <PaperUsageInspectionTable
                  key={`paper-${processOrder}-${product}-${draftId || "new"}`}
                  username={username}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                  processOrder={processOrder}
                  product={product}
                />
              )}
              {machine === "FILLER" &&
                packageType === "PENGECEKAN H2O2 ( SPRAY )" && (
                  <H2o2CheckInspectionTable
                    key={`h2o2-check-${currentContextKey || processOrder}-${product || "no-product"}-${draftId || "new"}`}
                    username={username}
                    onDataChange={handleInspectionChange}
                    initialData={currentInspectionInitialData}
                    processOrder={processOrder}
                    product={product}
                  />
                )}
              {machine === "FILLER" && packageType === "PERFORMA RED AND GREEN" ? (
                plant && line && shift ? (
                  <GnrPerformanceInspectionTable
                    key={`gnr-performance-${currentContextKey || processOrder}-${draftId || "new"}`}
                    username={username}
                    onDataChange={handleInspectionChange}
                    initialData={currentInspectionInitialData}
                    selectedDate={date}
                    plant={plant}
                    line={line}
                    machine={machine}
                    type={packageType}
                    shift={shift}
                    processOrder={processOrder}
                  />
                ) : (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <Text style={{ color: "#777" }}>Menyiapkan data GNR...</Text>
                  </View>
                )
              ) : null}
              {machine === "FILLER" && packageType === "CHECKLIST CILT" && (
                <ChecklistCILTInspectionTable
                  key={`checklist-cilt-${currentContextKey || processOrder}-${product || "no-product"}-${draftId || "new"}`}
                  username={username}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                  plant={plant}
                  line={line}
                  machine={machine}
                  type={packageType}
                  processOrder={processOrder}
                  shift={shift}
                  product={product}
                />
              )}
              {machine === "FILLER" && packageType === "SEGREGASI" && (
                <SegregasiInspectionTable
                  key={`segregasi-${processOrder}-${draftId || "new"}`}
                  username={username}
                  onDataChange={handleInspectionChange}
                  onDescriptionChange={handleSegregationDescriptionChange}
                  initialData={currentInspectionInitialData}
                  initialDescription={currentDescriptionInitialData}
                  product={baseProduct}
                  productOptions={productOptions}
                  lineName={line}
                  packageType={packageType}
                  shift={shift}
                  processOrder={processOrder}
                  onEffectiveProductChange={(eff) => {
                    setProduct(eff || baseProduct);
                  }}
                />
              )}
              {machine === "FILLER" && packageType === "A3 / FLEX ( PAGE 1 )" && (
                <A3FlexInspectionTablePage1
                  key={`a3-flex-page1-${processOrder}`}
                  plant={plant}
                  line={line}
                  machine={machine}
                  packageName={packageType}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                />
              )}
              {machine === "FILLER" && packageType === "PENGECEKAN PRESSURE" && (
                <A3FlexInspectionTable
                  key={`pressure-${packageType}`}
                  plant={plant}
                  line={line}
                  machine={machine}
                  packageName={packageType}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                />
              )}
              {machine === "FILLER" && packageType === "START & FINISH" && (
                <A3StartFinishInspectionTable
                  key={`start-finish-${processOrder}`}
                  plant={plant}
                  line={line}
                  machine={machine}
                  packageName={packageType}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                />
              )}
              {machine === "PACKER" && packageType === "LAPORAN ARTEMA & SMS CARDBOARD" && (
                <ArtemaCardboardInspectionTable
                  key={`artema-cardboard-${processOrder}`}
                  username={username}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                  shouldClearData={shouldClearInspectionData}
                />
              )}
              {machine === "PACKER" && packageType === "LAPORAN FRANS WP 25 CASE" && (
                <FransCasePackerInspectionTable
                  key={`frans-case-packer-${processOrder}`}
                  username={username}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                  shouldClearData={shouldClearInspectionData}
                />
              )}
              {machine === "FILLER" && packageType === "INFORMASI PRODUK" && (
                <CombiXGSlim24ProductInspectionTable
                  key={`info-prod-${processOrder}`}
                  plant={plant}
                  line={line}
                  machine={machine}
                  packageName={packageType}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                />
              )}
              {machine === "FILLER" && packageType === "LAPORAN PRODUKSI MESIN" && (
                <CombiXGSlim24CheckInspectionTable
                  key={`prod-mesin-${processOrder}`}
                  plant={plant}
                  line={line}
                  machine={machine}
                  packageName={packageType}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                />
              )}
              {machine === "ROBOT" && packageType === "ROBOT PALLETIZER FILLER" && (
                <RobotPalletizerFillerInspectionTable
                  key={`robot-palletizer-${processOrder}`}
                  username={username}
                  onDataChange={handleInspectionChange}
                  initialData={currentInspectionInitialData}
                  shift={shift}
                  line={line}
                  machine={machine}
                  shouldClearData={shouldClearInspectionData}
                />
              )}
            </View>
          </>
        )}

        <View style={styles.checkboxContainer}>
          <Checkbox
            status={agreed ? "checked" : "unchecked"}
            onPress={() => setAgreed(!agreed)}
          />
          <Text style={styles.checkboxLabel}>
            Saya menyatakan telah memasukkan data dengan benar.
          </Text>
        </View>

        <View>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!agreed || !product) && styles.submitButtonDisabled,
            ]}
            onPress={() => handleSubmit(0)}
            disabled={!agreed || !product}
          >
            <Text style={styles.submitButtonText}>SUBMIT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    alignSelf: "center",
    color: COLORS.blue,
  },
  resetBtn: {
    position: "absolute",
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupBawah: {
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInputGroup: {
    flex: 1,
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderColor: COLORS.lightBlue,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 5,
    height: 40,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 5,
    height: 40,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  dropdown: {
    flex: 1,
    marginLeft: 10,
  },
  wrapper: {},
  table: {
    width: "100%",
    margin: 15,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
    padding: 20,
    width: "100%",
  },
  tableBody: {
    flexDirection: "row",
    padding: 20,
    width: "100%",
  },
  tableCaption: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableData: {
    fontSize: 16,
    textAlign: "center",
  },
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  checkboxLabel: {
    marginLeft: 8,
  },
  buttonContainer: {
    paddingBottom: 16,
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#aaa",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  picker: {
    width: "100%",
    height: 40,
    backgroundColor: "#f8f9fa",
  },
});

export default CILTinspection;
