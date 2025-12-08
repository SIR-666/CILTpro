import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ScreenOrientation from "expo-screen-orientation";
import moment from "moment-timezone";
import { useEffect, useState, useCallback, useMemo } from "react";
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

// Helper function to check if description data has any meaningful content
const hasDescriptionData = (descriptionData) => {
  if (!descriptionData || !Array.isArray(descriptionData)) return false;

  return descriptionData.some(item =>
    item.flavour ||
    item.prodTypeStatus ||
    item.kodeProd ||
    item.kodeExp ||
    item.startTime ||
    item.stopTime ||
    item.startNum ||
    item.stopNum ||
    item.counterOutfeed ||
    item.totalOutfeed ||
    item.waste
  );
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
  // Cache untuk menyimpan data inspection per package type
  const [packageDataCache, setPackageDataCache] = useState({});
  // Cache untuk menyimpan description data (khusus Segregasi)
  const [packageDescriptionCache, setPackageDescriptionCache] = useState({});
  // state custom plants, machines, packages
  const [customPlants, setCustomPlants] = useState([]);
  const [customMachines, setCustomMachines] = useState([]);
  const [customPackages, setCustomPackages] = useState([]);
  const [isCustomDataLoaded, setIsCustomDataLoaded] = useState(false);

  const mergedMachineOptions = useMemo(() => {
    const base = Array.isArray(machineOptions) ? machineOptions : [];
    const custom = Array.isArray(customMachines) ? customMachines : [];
    return [...new Set([...base, ...custom].filter(Boolean))].sort();
  }, [machineOptions, customMachines]);

  // callbacks ke children (stabil, anti-loop)
  const handleInspectionChange = useCallback((data) => {
    setInspectionData(data);
    // Simpan ke cache berdasarkan package type
    if (packageType) {
      setPackageDataCache(prev => ({
        ...prev,
        [packageType]: data
      }));
      console.log(`Cached inspection data for: ${packageType}`, data.length, "items");
    }
  }, [packageType]);

  const handleSegregationDescriptionChange = useCallback((data) => {
    setSegregationDescriptionData(data);

    // Simpan description data ke cache
    if (packageType === "SEGREGASI") {
      setPackageDescriptionCache(prev => ({
        ...prev,
        [packageType]: data
      }));
      console.log(`Cached description data for: ${packageType}`, data.length, "items");
    }
  }, [packageType]);

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

    } catch (error) {
      console.error("❌ Failed to fetch custom data:", error);
      setCustomPlants([]);
      setCustomMachines([]);
      setCustomPackages([]);
      setIsCustomDataLoaded(true);
    }
  };

  // fetchPackageMaster function
  const fetchPackageMaster = async (selectedLine = null) => {
    try {
      const response = await api.get("/package-master");
      const data = response.data;

      // Merge plant options: package_master custom_plants
      const packageMasterPlants = [...new Set(data.map((item) => item.plant).filter(Boolean))];
      const mergedPlants = [...new Set([...packageMasterPlants, ...customPlants])].filter(Boolean);
      setPlantOptions(mergedPlants.sort());

      // Merge machine options: package_master custom_machines
      const packageMasterMachines = [...new Set(data.map((item) => item.machine).filter(Boolean))];
      const mergedMachines = [...new Set([...packageMasterMachines, ...customMachines])].filter(Boolean);
      setMachineOptions(mergedMachines.sort());

      // Line options (hanya dari package_master, karena custom package terikat ke line existing)
      const uniqueLines = [...new Set(data.map((item) => item.line).filter(Boolean))];
      setLineOptions(uniqueLines.sort());

      const filteredPackagesFromMaster = selectedLine
        ? data.filter(
          (item) =>
            item.line?.toUpperCase().trim() === selectedLine.toUpperCase().trim()
        )
        : data;

      const filteredCustomPackages = selectedLine
        ? customPackages.filter(
          (item) =>
            item.line?.toUpperCase().trim() === selectedLine.toUpperCase().trim()
        )
        : customPackages;

      // Merge package options dari package_master custom
      const packageMasterPackages = [...new Set(filteredPackagesFromMaster.map((item) => item.package).filter(Boolean))];
      const customPackageNames = filteredCustomPackages.map(item => item.package).filter(Boolean);
      const mergedPackages = [...new Set([...packageMasterPackages, ...customPackageNames])].filter(Boolean);

      setPackageOptions(mergedPackages.sort());
    } catch (error) {
      console.error("❌ Failed to fetch /package-master:", error);
    }
  };

  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      );
    };

    const initializeData = async () => {
      await lockOrientation();
      await fetchCustomData();
    };
    initializeData();
    setFormOpenTime(moment().tz("Asia/Jakarta").format());
  }, []);

  useEffect(() => {
    if (!line) return;
    if (!isCustomDataLoaded) return;

    console.log(`Fetching package master for line: ${line}`);
    fetchPackageMaster(line);
  }, [line, isCustomDataLoaded, customPackages]);

  useEffect(() => {
    const loadDate = async () => {
      setPlant(await AsyncStorage.getItem("plant"));
      setLine(await AsyncStorage.getItem("line"));
      const savedMachine = await AsyncStorage.getItem("machine");
      if (savedMachine) setMachine(savedMachine);
      const savedProduct = await AsyncStorage.getItem("product");
      if (savedProduct) {
        setBaseProduct(savedProduct);
        setProduct(savedProduct);
      }
    };
    loadDate();
  }, []);

  const shiftOptions = [
    { label: "Shift 1", value: "Shift 1" },
    { label: "Shift 2", value: "Shift 2" },
    { label: "Shift 3", value: "Shift 3" },
  ];

  useFocusEffect(
    useCallback(() => {
      refreshCustomDataSilently();
    }, [line])
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
      setIsCustomDataLoaded(false);
      await fetchCustomData();
    } catch (error) {
      console.error("Error auto refreshing custom data:", error);
    }
  };

  const checkIfDataExists = async () => {
    try {
      const response = await api.get(
        `/cilt/getCILTByProcessOrder?processOrder=${processOrder}`
      );

      if (response.data.exists) {
        // Jika sudah ada, preload data sebelumnya
        const parsedData = JSON.parse(response.data.data.inspectionData);
        setInspectionData(parsedData);

        // Simpan ke cache juga
        setPackageDataCache(prev => ({
          ...prev,
          [packageType]: parsedData
        }));

        // Load description data if exists for segregation
        if (packageType === "SEGREGASI" && response.data.data.descriptionData) {
          try {
            const parsedDescriptionData = JSON.parse(response.data.data.descriptionData);
            setSegregationDescriptionData(parsedDescriptionData);

            // Simpan description ke cache
            setPackageDescriptionCache(prev => ({
              ...prev,
              [packageType]: parsedDescriptionData
            }));
          } catch (error) {
            console.error("Failed to parse description data:", error);
            setSegregationDescriptionData([]);
          }
        }

        Alert.alert("Info", "Data ditemukan. Form akan dilanjutkan.");
      } else {
        console.log("No existing data found for processOrder:", processOrder);
      }
    } catch (error) {
      console.error("Failed to check existing data:", error);
      Alert.alert("Error", "Gagal cek data. Coba lagi.");
    }
  };

  // Function untuk clear storage spesifik berdasarkan package dan product setelah submit berhasil
  const clearPackageStorageAfterSubmit = async () => {
    try {
      if (packageType === "PEMAKAIAN PAPER" && globalThis.clearPaperStorage) {
        await globalThis.clearPaperStorage();
        console.log("Cleared paper storage after submit");
      } else if (packageType === "PEMAKAIAN SCREW CAP" && globalThis.clearScrewCapStorage) {
        await globalThis.clearScrewCapStorage();
        console.log("Cleared screw cap storage after submit");
      } else if (packageType === "SEGREGASI" && globalThis.clearSegregasiStorage) {
        await globalThis.clearSegregasiStorage();
        console.log("Cleared segregasi storage after submit");
      }
    } catch (error) {
      console.error("Error clearing package storage after submit:", error);
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
    fetchProductOptions(plant);
  }, [plant, line]);

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
    if (!plant || !line || !date || !shift || !machine || !packageType) return;
    checkIfDataExists();
  }, [processOrder]);

  useEffect(() => {
    if (!packageType) return;

    console.log(`Package changed to: ${packageType}`);

    // Load inspection data dari cache jika ada
    if (packageDataCache[packageType]) {
      console.log(` Loading inspection data from cache for: ${packageType}`);
      setInspectionData(packageDataCache[packageType]);
    } else {
      console.log(`No cache found for: ${packageType}, resetting inspection data`);
      setInspectionData([]);
    }

    // Load description data dari cache untuk Segregasi
    if (packageType === "SEGREGASI" && packageDescriptionCache[packageType]) {
      console.log(` Loading description data from cache for: ${packageType}`);
      setSegregationDescriptionData(packageDescriptionCache[packageType]);
    } else if (packageType === "SEGREGASI") {
      console.log(`No description cache found for: ${packageType}, resetting`);
      setSegregationDescriptionData([]);
    }
  }, [packageType]);

  const handleImageSelected = (uri, index) => {
    let data = [...inspectionData];
    data[index].picture = uri;
    setInspectionData(data);
  };

  // Function for refresh inspection data (line universal)
  const handleRefreshInspectionData = () => {
    try {
      console.log(`🔄 Refreshing inspection data for Line ${line}, Package ${packageType}...`);

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
            const submitTime = moment().tz("Asia/Jakarta").format();
            let order = {};

            try {
              // Call GNR save function before submit if it's GNR form
              let inspectionDataForSubmit = inspectionData;
              if (packageType === "PERFORMA RED AND GREEN" && globalThis.gnrBeforeSubmit) {
                console.log(`💾 Saving GNR data before submit for Line ${line}...`);
                await Promise.resolve(globalThis.gnrBeforeSubmit());
                await new Promise(r => setTimeout(r, 100));
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
                submitTime: moment(submitTime)
                  .tz("Asia/Jakarta")
                  .format("YYYY-MM-DD HH:mm:ss.SSS"),
              };

              // Always save description data for SEGREGASI package, even if partially filled
              if (packageType === "SEGREGASI") {
                console.log("=== SAVING DESCRIPTION DATA ===");
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

                console.log("order.descriptionData:", order.descriptionData);
                console.log("order.descriptionDataWithMeta:", order.descriptionDataWithMeta);
                console.log("=== END DESCRIPTION DATA ===");
              }

              console.log("Submitting order:", order);

              // Send to server
              const response = await api.post("/cilt", order);

              if (response.status === 201) {
                Alert.alert("Success", "Data submitted successfully!");
                await clearOfflineData();

                // Clear storage spesifik untuk package dan product ini setelah submit berhasil
                await clearPackageStorageAfterSubmit();

                // Clear cache untuk package yang sudah di-submit
                setPackageDataCache(prev => {
                  const newCache = { ...prev };
                  delete newCache[packageType];
                  return newCache;
                });

                setPackageDescriptionCache(prev => {
                  const newCache = { ...prev };
                  delete newCache[packageType];
                  return newCache;
                });

                if (packageType !== "PERFORMA RED AND GREEN") {
                  setInspectionData([]);
                  setSegregationDescriptionData([]);
                }

                setTimeout(() => {
                  navigation.goBack();
                }, 500);
              }
            } catch (error) {
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
                    {productOptions.map((option) => (
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
                    key={`screw-cap-${processOrder}-${product}`}
                    username={username}
                    onDataChange={handleInspectionChange}
                    initialData={packageDataCache["PEMAKAIAN SCREW CAP"] || []}
                    processOrder={processOrder}
                    product={product}
                  />
                )}
              {machine === "FILLER" && packageType === "PEMAKAIAN PAPER" && (
                <PaperUsageInspectionTable
                  key={`paper-${processOrder}-${product}`}
                  username={username}
                  onDataChange={handleInspectionChange}
                  initialData={packageDataCache["PEMAKAIAN PAPER"] || []}
                  processOrder={processOrder}
                  product={product}
                />
              )}
              {machine === "FILLER" &&
                packageType === "PENGECEKAN H2O2 ( SPRAY )" && (
                  <H2o2CheckInspectionTable
                    key="h2o2-check"
                    username={username}
                    onDataChange={handleInspectionChange}
                    initialData={packageDataCache["PENGECEKAN H2O2 ( SPRAY )"] || []}
                  />
                )}
              {machine === "FILLER" && packageType === "PERFORMA RED AND GREEN" ? (
                plant && line && shift ? (
                  <GnrPerformanceInspectionTable
                    key={`gnr-performance-${line}-${machine}-${packageType}`}
                    username={username}
                    onDataChange={handleInspectionChange}
                    initialData={packageDataCache["PERFORMA RED AND GREEN"] || []}
                    plant={plant}
                    line={line}
                    machine={machine}
                    type={packageType}
                    shift={shift}
                  />
                ) : (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <Text style={{ color: "#777" }}>Menyiapkan data GNR...</Text>
                  </View>
                )
              ) : null}
              {machine === "FILLER" && packageType === "CHECKLIST CILT" && (
                <ChecklistCILTInspectionTable
                  key={`checklist-cilt-${line}-${machine}`}
                  username={username}
                  onDataChange={handleInspectionChange}
                  initialData={packageDataCache["CHECKLIST CILT"] || []}
                  plant={plant}
                  line={line}
                  machine={machine}
                  type={packageType}
                />
              )}
              {machine === "FILLER" && packageType === "SEGREGASI" && (
                <SegregasiInspectionTable
                  key={`segregasi-${processOrder}`}
                  username={username}
                  onDataChange={handleInspectionChange}
                  onDescriptionChange={handleSegregationDescriptionChange}
                  initialData={packageDataCache["SEGREGASI"] || []}
                  initialDescription={packageDescriptionCache["SEGREGASI"] || []}
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

        {["CHANGE OVER", "CLEANING", "START UP", "GI/GR"].includes(
          packageType
        ) ? (
          <>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!agreed || !product) && styles.submitButtonDisabled,
                ]}
                onPress={() => handleSubmit(1)}
                disabled={!agreed || !product}
              >
                <Text style={styles.submitButtonText}>SAVE AS DRAFT</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <></>
        )}

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
