import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import moment from "moment";
import { COLORS } from "../../constants/theme";
import { api } from "../../utils/axiosInstance";
import ReportCIPInspectionTable from "../../components/package/filler/ReportCIPInspectionTable";

const getEditStorageKey = (reportId) => `cip_edit_form_${reportId}`;

const EditCIP = ({ navigation, route }) => {
  const { cipData: existingCipData } = route.params;
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [hasEdits, setHasEdits] = useState(false);
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);
  const [shouldClearTableData, setShouldClearTableData] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Storage key
  const EDIT_STORAGE_KEY = getEditStorageKey(existingCipData?.id);

  // Refs
  const tableRef = useRef(null);
  const autoSaveTimer = useRef(null);
  const hasLoadedData = useRef(false);
  const originalData = useRef(null);

  // CIP Types state
  const [cipTypes, setCipTypes] = useState([
    { id: 1, name: "CIP KITCHEN 1", value: "CIP KITCHEN 1" },
    { id: 2, name: "CIP KITCHEN 2", value: "CIP KITCHEN 2" },
    { id: 3, name: "CIP KITCHEN 3", value: "CIP KITCHEN 3" },
  ]);

  // Status checks
  const isDraft = existingCipData?.status === "In Progress";
  const isSubmitted = existingCipData?.status === "Complete";
  const canEdit = isDraft || existingCipData?.status === "Rejected";

  // Normalizers
  const toStr = (v) => (v === null || v === undefined ? "" : String(v));

  const normalizeSteps = (steps = []) =>
    steps.map((s, i) => ({
      stepNumber: s.stepNumber ?? s.step_number ?? i + 1,
      stepName: s.stepName ?? s.step_name ?? s.name ?? "",
      temperatureSetpointMin: toStr(s.temperatureSetpointMin ?? s.temp_setpoint_min ?? s.temp_min),
      temperatureSetpointMax: toStr(s.temperatureSetpointMax ?? s.temp_setpoint_max ?? s.temp_max),
      temperatureActual: toStr(s.temperatureActual ?? s.temp_actual),
      timeSetpoint: toStr(s.timeSetpoint ?? s.time_setpoint ?? s.time_sp),
      timeActual: toStr(s.timeActual ?? s.time_actual),
      concentrationMin: s.concentration_min || s.concentrationMin || (s.stepName === "ALKALI" || s.step_name === "ALKALI" ? "1.5" : s.stepName === "ACID" || s.step_name === "ACID" ? "0.5" : null),
      concentrationMax: s.concentration_max || s.concentrationMax || (s.stepName === "ALKALI" || s.step_name === "ALKALI" ? "2.0" : s.stepName === "ACID" || s.step_name === "ACID" ? "1.0" : null),
      concentrationActual: toStr(s.concentrationActual ?? s.conc_actual ?? s.conc),
      startTime: s.startTime ?? s.start_time ?? "",
      endTime: s.endTime ?? s.end_time ?? "",
    }));

  const normalizeCop = (rows = []) =>
    rows.map((c) => ({
      stepType: c.stepType ?? c.step_type ?? "",
      time: toStr(c.time ?? c.time67Min ?? c.time45Min ?? c.time60Min ?? c.duration),
      startTime: c.startTime ?? c.start_time ?? "",
      endTime: c.endTime ?? c.end_time ?? "",
      tempMin: toStr(c.tempMin ?? c.temp_min ?? 105),
      tempMax: toStr(c.tempMax ?? c.temp_max ?? 128),
      tempActual: toStr(c.tempActual ?? c.temp_actual),
    }));

  const normalizeSpecial = (rows = []) =>
    rows.map((r) => ({
      stepType: r.stepType ?? r.step_type ?? "",
      tempMin: toStr(r.tempMin ?? r.temp_min),
      tempMax: toStr(r.tempMax ?? r.temp_max),
      tempActual: toStr(r.tempActual ?? r.temp_actual),
      tempBC: toStr(r.tempBC ?? r.temp_bc ?? 40),
      tempDMin: toStr(r.tempDMin ?? r.temp_d_min ?? 20),
      tempDMax: toStr(r.tempDMax ?? r.temp_d_max ?? 35),
      concMin: toStr(r.concMin ?? r.conc_min ?? 0.3),
      concMax: toStr(r.concMax ?? r.conc_max ?? 0.5),
      concActual: toStr(r.concActual ?? r.conc_actual),
      time: toStr(r.time ?? r.duration ?? r.time_min),
      startTime: r.startTime ?? r.start_time ?? "",
      endTime: r.endTime ?? r.end_time ?? "",
      hasTemperature: r.hasTemperature ?? (r.stepType !== "FOAMING" && r.step_type !== "FOAMING"),
      hasConcentration: r.hasConcentration ?? (r.stepType === "DISINFECT/SANITASI" || r.step_type === "DISINFECT/SANITASI"),
    }));

  // Get initial form data with proper flowRate mapping
  const getInitialFormData = () => {
    const stepsSrc = existingCipData?.steps || existingCipData?.cipSteps || existingCipData?.step_records || [];
    const copSrc = existingCipData?.copRecords || existingCipData?.cop_sop_sip || [];
    const specialSrc = existingCipData?.specialRecords || existingCipData?.special_records || [];
    const valveSrc = existingCipData?.valvePositions || existingCipData?.valve_positions || { A: false, B: false, C: false };

    const line = existingCipData.line || "";
    const isBCDLine = ['LINE B', 'LINE C', 'LINE D'].includes(line);

    // Properly extract flowRate based on line
    let flowRateValue = "";

    if (line === "LINE A") {
      flowRateValue = toStr(
        existingCipData.flowRate ??
        existingCipData.flow_rate ??
        ""
      );
    } else if (isBCDLine) {
      if (line === "LINE D") {
        flowRateValue = toStr(
          existingCipData?.flowRateD ??
          existingCipData?.flow_rate_d ??
          existingCipData?.flowRates?.flowD ??
          ""
        );
      } else { // LINE B or C
        flowRateValue = toStr(
          existingCipData?.flowRateBC ??
          existingCipData?.flow_rate_bc ??
          existingCipData?.flowRates?.flowBC ??
          ""
        );
      }
    }

    console.log("[EditCIP] Initial flowRate:", flowRateValue, "for line:", line);

    return {
      id: existingCipData.id,
      date: existingCipData.date ? new Date(existingCipData.date) : new Date(),
      processOrder: existingCipData.processOrder || existingCipData.process_order || "",
      plant: existingCipData.plant || "Milk Filling Packing",
      line: line,
      cipType: existingCipData.cipType || existingCipData.cip_type || "",
      operator: existingCipData.operator || "",
      posisi: existingCipData.posisi || "",
      flowRate: flowRateValue,
      notes: existingCipData.notes || "",
      steps: normalizeSteps(stepsSrc),
      copRecords: normalizeCop(copSrc),
      specialRecords: normalizeSpecial(specialSrc),
      valvePositions: valveSrc,
      // Keep flowRates object for reference
      flowRates: {
        flowBC: toStr(existingCipData?.flowRates?.flowBC ?? existingCipData?.flowRateBC ?? existingCipData?.flow_rate_bc ?? ""),
        flowD: toStr(existingCipData?.flowRates?.flowD ?? existingCipData?.flowRateD ?? existingCipData?.flow_rate_d ?? ""),
      },
    };
  };

  // Form data
  const [formData, setFormData] = useState(getInitialFormData());

  // Options
  const [lineOptions] = useState([
    { label: "LINE A", value: "LINE A" },
    { label: "LINE B", value: "LINE B" },
    { label: "LINE C", value: "LINE C" },
    { label: "LINE D", value: "LINE D" },
  ]);
  const [posisiOptions] = useState([
    { label: "Final", value: "Final" },
    { label: "Intermediate", value: "Intermediate" },
  ]);

  // ASYNC STORAGE
  const loadEdits = async (triggerReload = true) => {
    try {
      const storedData = await AsyncStorage.getItem(EDIT_STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);

        // Map flowRate properly based on line
        const line = parsed.line || formData.line;
        const isBCDLine = ['LINE B', 'LINE C', 'LINE D'].includes(line);
        let flowRateValue = parsed.flowRate || "";

        // If flowRate is empty but flowRates exists, extract from there
        if ((!flowRateValue || flowRateValue === "") && isBCDLine && parsed.flowRates) {
          if (line === 'LINE D' && parsed.flowRates.flowD) {
            flowRateValue = parsed.flowRates.flowD;
          } else if ((line === 'LINE B' || line === 'LINE C') && parsed.flowRates.flowBC) {
            flowRateValue = parsed.flowRates.flowBC;
          }
        }

        console.log("[EditCIP] Loaded edits with flowRate:", flowRateValue, "for line:", line);

        setFormData({
          ...getInitialFormData(),
          ...parsed,
          flowRate: flowRateValue,
          date: parsed.date ? new Date(parsed.date) : new Date(),
        });
        if (triggerReload) {
          setReloadKey((k) => k + 1);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error loading edits:", error);
      return false;
    }
  };

  // Save edits with proper structure
  const saveEdits = async (data) => {
    try {
      const isBCDLine = ['LINE B', 'LINE C', 'LINE D'].includes(data.line);
      const toSave = {
        ...data,
        date: data.date?.toISOString() || new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };

      // Store flowRates object for BCD lines for proper persistence
      if (isBCDLine && data.flowRate !== undefined && data.flowRate !== null && data.flowRate !== "") {
        if (!toSave.flowRates) {
          toSave.flowRates = {};
        }
        if (data.line === 'LINE D') {
          toSave.flowRates.flowD = data.flowRate;
          toSave.flowRateD = data.flowRate; // Also store in direct field
        } else {
          toSave.flowRates.flowBC = data.flowRate;
          toSave.flowRateBC = data.flowRate; // Also store in direct field
        }
      }

      console.log("[EditCIP] Saving edits:", {
        line: data.line,
        flowRate: data.flowRate,
        flowRates: toSave.flowRates,
        flowRateBC: toSave.flowRateBC,
        flowRateD: toSave.flowRateD
      });

      await AsyncStorage.setItem(EDIT_STORAGE_KEY, JSON.stringify(toSave));
      setHasEdits(true);
      setAutoSaveIndicator(true);
      setTimeout(() => setAutoSaveIndicator(false), 1000);
    } catch (error) {
      console.error("Error saving edits:", error);
    }
  };

  const clearEdits = async () => {
    try {
      await AsyncStorage.removeItem(EDIT_STORAGE_KEY);
      if (userProfile?.username && formData.line) {
        const tableKey = `cip_inspection_${userProfile.username}_${formData.id}_${formData.line.replace(" ", "_")}`;
        await AsyncStorage.removeItem(tableKey);
      }
      setHasEdits(false);
    } catch (error) {
      console.error("Error clearing edits:", error);
    }
  };

  // AUTO-SAVE EFFECT
  useEffect(() => {
    if (!hasLoadedData.current || !hasEdits) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      saveEdits(formData);
    }, 500);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formData]);

  // INITIAL LOAD
  useEffect(() => {
    const initializeForm = async () => {
      originalData.current = getInitialFormData();

      await fetchUserProfile();
      await fetchCIPTypes();

      const hasEditData = await loadEdits();
      if (!hasEditData) {
        setFormData(getInitialFormData());
      }
      hasLoadedData.current = true;
    };

    if (!canEdit) {
      Alert.alert(
        "Edit Restricted",
        "This report cannot be edited because it has been submitted. Contact admin if changes are needed.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } else {
      initializeForm();
    }
  }, []);

  // FOCUS EFFECT
  useFocusEffect(
    useCallback(() => {
      if (hasLoadedData.current) {
        loadEdits(false);
      }

      const onBackPress = () => {
        return false;
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [])
  );

  // FETCH FUNCTIONS
  const fetchUserProfile = async () => {
    try {
      const response = await api.get("/user/profile");
      const userData = response.data;
      setUserProfile(userData);
    } catch (error) {
      console.log("User profile not available for edit mode");
    }
  };

  const fetchCIPTypes = async () => {
    try {
      const response = await api.get("/cip-report/types/list");
      if (response.data && response.data.length > 0) {
        setCipTypes(
          response.data.map((type) => ({
            id: type.id,
            name: type.name,
            value: type.value || type.name,
          }))
        );
      }
    } catch (error) {
      console.log("Using default CIP types");
    }
  };

  // HANDLERS
  const handleInputChange = (field, value) => {
    setHasEdits(true);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetToOriginal = () => {
    Alert.alert(
      "Reset to Original",
      "Are you sure you want to discard all changes and restore the original data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await clearEdits();
            setFormData(originalData.current || getInitialFormData());
            setShouldClearTableData(true);
            setReloadKey((k) => k + 1);
            setTimeout(() => setShouldClearTableData(false), 100);
          },
        },
      ]
    );
  };

  // VALIDATION (LESS STRICT)
  const validateBasicInfo = () => {
    if (!formData.line) {
      Alert.alert("Validation Error", "Please select a line");
      return false;
    }
    return true;
  };

  const validateForSubmit = () => {
    if (!formData.processOrder) {
      Alert.alert("Validation Error", "Process Order is required");
      return false;
    }
    if (!formData.line) {
      Alert.alert("Validation Error", "Please select a line");
      return false;
    }
    if (!formData.cipType) {
      Alert.alert("Validation Error", "Please select a CIP Type");
      return false;
    }
    if (!formData.operator) {
      Alert.alert("Validation Error", "Operator is required");
      return false;
    }
    if (!formData.posisi) {
      Alert.alert("Validation Error", "Please select a posisi");
      return false;
    }
    return true;
  };

  // Update handler with proper flowRate mapping
  const handleUpdateCIP = async (cipTableData, isDraft = false) => {
    if (!validateBasicInfo()) return;
    if (!isDraft && !validateForSubmit()) return;

    setLoading(true);
    try {
      const isBCDLine = ["LINE B", "LINE C", "LINE D"].includes(formData.line);

      // Get flowRate value from table data
      const flowRateActual = cipTableData.flowRate?.flowRateActual ?? null;

      console.log("[EditCIP] Updating with:", {
        line: formData.line,
        flowRateActual,
        isDraft
      });

      let dataToSubmit = {
        date: moment(formData.date).format("YYYY-MM-DD"),
        processOrder: formData.processOrder,
        plant: formData.plant,
        line: formData.line,
        cipType: formData.cipType || "",
        operator: formData.operator || "",
        posisi: formData.posisi || "",
        notes: formData.notes || "",
        isDraft,
        steps: cipTableData.steps?.map((step) => ({
          stepNumber: parseInt(step.stepNumber),
          stepName: step.stepName,
          temperatureSetpointMin: parseFloat(step.temperatureSetpointMin) || null,
          temperatureSetpointMax: parseFloat(step.temperatureSetpointMax) || null,
          temperatureActual: parseFloat(step.temperatureActual) || null,
          timeSetpoint: parseInt(step.timeSetpoint) || null,
          timeActual: parseInt(step.timeActual) || null,
          concentration: step.concentrationMin ? parseFloat(step.concentrationMin) : null,
          concentrationActual: step.concentrationActual ? parseFloat(step.concentrationActual) : null,
          startTime: step.startTime || null,
          endTime: step.endTime || null,
        })) || [],
      };

      // Handle LINE A specific data
      if (formData.line === "LINE A") {
        dataToSubmit.flowRate = flowRateActual ? parseFloat(flowRateActual) : null;
        dataToSubmit.copRecords = cipTableData.copRecords?.map((cop) => ({
          stepType: cop.stepType,
          time: cop.time ? parseInt(cop.time) : null,
          startTime: cop.startTime || null,
          endTime: cop.endTime || null,
          tempMin: parseFloat(cop.tempMin) || null,
          tempMax: parseFloat(cop.tempMax) || null,
          tempActual: parseFloat(cop.tempActual) || null,
        })) || [];
      }
      // Handle LINE B/C/D specific data
      else if (isBCDLine) {
        // Properly set flowRateD or flowRateBC based on line
        if (formData.line === "LINE D") {
          dataToSubmit.flowRateD = flowRateActual ? parseFloat(flowRateActual) : null;
          dataToSubmit.flowRateBC = null;
        } else {
          dataToSubmit.flowRateBC = flowRateActual ? parseFloat(flowRateActual) : null;
          dataToSubmit.flowRateD = null;
        }

        dataToSubmit.valvePositions = cipTableData.valvePositions || { A: false, B: false, C: false };
        dataToSubmit.specialRecords = cipTableData.specialRecords?.map((record) => ({
          stepType: record.stepType,
          time: record.time ? parseInt(record.time) : null,
          tempActual: parseFloat(record.tempActual) || null,
          concActual: parseFloat(record.concActual) || null,
          startTime: record.startTime || null,
          endTime: record.endTime || null,
        })) || [];
      }

      console.log("Updating CIP data:", JSON.stringify(dataToSubmit, null, 2));

      const response = await api.put(`/cip-report/${formData.id}`, dataToSubmit);

      if (response.data.success || response.data.data) {
        await clearEdits();

        Alert.alert(
          "Success",
          isDraft ? "CIP report updated as draft" : "CIP report updated successfully",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Error", response.data.message || "Failed to update CIP report");
      }
    } catch (error) {
      console.error("Error updating CIP report:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update CIP report. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // STATUS BADGE HELPER
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "In Progress":
        return { backgroundColor: "#FFF3E0", color: "#FF9800" };
      case "Complete":
        return { backgroundColor: "#E8F5E9", color: "#4CAF50" };
      case "Approved":
        return { backgroundColor: "#E8F5E9", color: "#2E7D32" };
      case "Rejected":
        return { backgroundColor: "#FFEBEE", color: "#F44336" };
      default:
        return { backgroundColor: "#F5F5F5", color: "#757575" };
    }
  };

  // RENDER
  if (!canEdit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.restrictedContainer}>
          <Icon name="lock" size={64} color={COLORS.gray} />
          <Text style={styles.restrictedTitle}>Edit Restricted</Text>
          <Text style={styles.restrictedText}>
            This report has been submitted and cannot be edited.
            Contact admin if changes are needed.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={styles.loadingText}>Updating CIP Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusBadgeStyle(existingCipData?.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.blue} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit CIP Report</Text>
        <TouchableOpacity onPress={resetToOriginal} style={styles.resetButton}>
          <Icon name="restore" size={24} color={COLORS.orange} />
        </TouchableOpacity>
      </View>

      {/* Status badge */}
      <View style={styles.statusBadgeContainer}>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
          <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
            {existingCipData?.status || "Unknown"}
          </Text>
        </View>
      </View>

      {/* Auto-save indicator */}
      {autoSaveIndicator && (
        <View style={styles.autoSaveIndicator}>
          <Icon name="cloud-done" size={16} color={COLORS.green} />
          <Text style={styles.autoSaveText}>Changes saved automatically</Text>
        </View>
      )}

      {/* Has edits indicator */}
      {hasEdits && (
        <View style={styles.editIndicator}>
          <Icon name="edit" size={16} color={COLORS.orange} />
          <Text style={styles.editText}>Unsaved edits - Auto-saved</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          {/* Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar-today" size={20} color={COLORS.blue} />
              <Text style={styles.dateText}>
                {moment(formData.date).format("DD MMMM YYYY")}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={formData.date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  handleInputChange("date", selectedDate);
                }
              }}
            />
          )}

          {/* Process Order */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Process Order</Text>
            <TextInput
              style={styles.input}
              value={formData.processOrder}
              onChangeText={(value) => handleInputChange("processOrder", value)}
              placeholder="PO-MFP-YYYY-XXXX"
            />
          </View>

          {/* Plant (Read-only) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Plant</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text style={styles.readOnlyText}>{formData.plant}</Text>
              <Icon name="lock" size={16} color={COLORS.gray} />
            </View>
          </View>

          {/* Line */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Line *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.line}
                onValueChange={(value) => handleInputChange("line", value)}
                style={styles.picker}
              >
                <Picker.Item label="Select Line" value="" />
                {lineOptions.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* CIP Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>CIP Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.cipType}
                onValueChange={(value) => handleInputChange("cipType", value)}
                style={styles.picker}
              >
                <Picker.Item label="Select CIP Type" value="" />
                {cipTypes.map((type) => (
                  <Picker.Item
                    key={type.id}
                    label={type.name}
                    value={type.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Operator */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Operator</Text>
            <TextInput
              style={styles.input}
              value={formData.operator}
              onChangeText={(value) => handleInputChange("operator", value)}
              placeholder="Operator name"
            />
          </View>

          {/* Posisi */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Posisi</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.posisi}
                onValueChange={(value) => handleInputChange("posisi", value)}
                style={styles.picker}
              >
                <Picker.Item label="Select Posisi" value="" />
                {posisiOptions.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(value) => handleInputChange("notes", value)}
              placeholder="Add any additional notes..."
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* CIP Inspection Table */}
        {formData.line ? (
          <ReportCIPInspectionTable
            ref={tableRef}
            cipData={formData}
            selectedLine={formData.line}
            username={userProfile?.username}
            posisi={formData.posisi || "Final"}
            mode="edit"
            onSave={(cipTableData, isDraft) => handleUpdateCIP(cipTableData, isDraft)}
            isEditable={true}
            shouldClearData={shouldClearTableData}
            allowUnrestrictedInput={true}
            reloadKey={reloadKey}
            reportId={formData.id}
          />
        ) : (
          <View style={styles.instructionBox}>
            <Icon name="info-outline" size={24} color={COLORS.orange} />
            <Text style={styles.instructionText}>
              Please select a line to see the inspection table
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  restrictedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.darkGray,
    marginTop: 16,
    marginBottom: 12,
  },
  restrictedText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.blue,
  },
  resetButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#fff5e6",
  },
  statusBadgeContainer: {
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  autoSaveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 4,
  },
  autoSaveText: {
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.green,
  },
  editIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 4,
  },
  editText: {
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.orange,
  },
  section: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.blue,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.black,
  },
  readOnlyInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0f0f0",
  },
  readOnlyText: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
  },
  instructionBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.orange,
    borderStyle: "dashed",
  },
  instructionText: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.darkGray,
    textAlign: "center",
  },
});

export default EditCIP;