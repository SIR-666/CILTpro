import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import { api } from "../../../utils/axiosInstance";

// CONSTANTS
const COLORS = {
  blue: "#1E88E5",
  lightBlue: "#E3F2FD",
  black: "#000000",
  darkGray: "#757575",
  green: "#4CAF50",
  red: "#F44336",
  orange: "#FF9800",
  gray: "#9E9E9E",
  warningOrange: "#FFA726",
  warningYellow: "#FFF9C4",
  warningText: "#F57C00",
};

const AUTO_SAVE_DELAY = 500;

const getStorageKey = (username, line, reportId) =>
  `cip_inspection_${username || "anonymous"}_${reportId || "draft"}_${line?.replace(" ", "_") || "unknown"}`;

// FlexibleNumericInput Component
const FlexibleNumericInput = ({
  value,
  onChangeText,
  placeholder,
  minRange,
  maxRange,
  unit = "",
  style = {},
  editable = true,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const isOutOfRange = () => {
    if (value === "" || value == null) return false;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;
    if (minRange !== undefined && numValue < minRange) return true;
    if (maxRange !== undefined && numValue > maxRange) return true;
    return false;
  };

  const getInputStyle = () => {
    const baseStyle = [styles.input, style];
    if (!editable) baseStyle.push(styles.disabledInput);
    if (isOutOfRange()) baseStyle.push(styles.warningInput);
    else if (isFocused) baseStyle.push(styles.focusedInput);
    return baseStyle;
  };

  const getRangeMessage = () => {
    if (!isOutOfRange()) return null;
    let message = "Out of range";
    if (minRange !== undefined && maxRange !== undefined) {
      message += ` (${minRange}-${maxRange}${unit})`;
    } else if (minRange !== undefined) {
      message += ` (min: ${minRange}${unit})`;
    }
    return message;
  };

  return (
    <View style={styles.flexibleInputContainer}>
      <TextInput
        value={value?.toString() || ""}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType="numeric"
        style={getInputStyle()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={editable}
        {...props}
      />
      {isOutOfRange() && <Text style={styles.warningText}>{getRangeMessage()}</Text>}
    </View>
  );
};

// Time Picker Input Component
const TimePickerInput = ({ value, onChange, placeholder, editable = true }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());

  useEffect(() => {
    if (value && value.includes(":")) {
      const [hours, minutes] = value.split(":");
      const date = new Date();
      date.setHours(parseInt(hours) || 0);
      date.setMinutes(parseInt(minutes) || 0);
      setTempTime(date);
    }
  }, [value]);

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selectedTime) {
      setTempTime(selectedTime);
      onChange(moment(selectedTime).format("HH:mm"));
    }
  };

  const handleConfirm = () => {
    onChange(moment(tempTime).format("HH:mm"));
    setShowPicker(false);
  };

  if (!editable) {
    return (
      <View style={[styles.input, styles.timeInput, styles.disabledInput]}>
        <Text style={styles.timeText}>{value || placeholder}</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.input, styles.timeInput, styles.timePickerButton]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.timeText, !value && styles.placeholderText]}>{value || placeholder}</Text>
        <Icon name="access-time" size={16} color={COLORS.blue} />
      </TouchableOpacity>

      {Platform.OS === "ios" ? (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Time</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={tempTime} mode="time" is24Hour display="spinner" onChange={handleTimeChange} />
            </View>
          </View>
        </Modal>
      ) : (
        showPicker && <DateTimePicker value={tempTime} mode="time" is24Hour display="default" onChange={handleTimeChange} />
      )}
    </>
  );
};

// Checkbox Component (for Valve Positions)
const Checkbox = ({ value, onValueChange, label, disabled = false }) => (
  <TouchableOpacity
    style={styles.checkboxContainer}
    onPress={() => !disabled && onValueChange(!value)}
    disabled={disabled}
  >
    <View style={[styles.checkbox, value && styles.checkboxChecked, disabled && styles.checkboxDisabled]}>
      {value && <Icon name="check" size={16} color="#fff" />}
    </View>
    <Text style={[styles.checkboxLabel, disabled && styles.checkboxLabelDisabled]}>{label}</Text>
  </TouchableOpacity>
);

// FALLBACK DATA
// const getFallbackCipSteps = () => [
//   { stepNumber: 1, stepName: "COLD RINSE", temperatureSetpointMin: "20", temperatureSetpointMax: "35", timeSetpoint: "8", concentrationMin: null, concentrationMax: null, temperatureActual: "", timeActual: "8", concentrationActual: "", startTime: "", endTime: "" },
//   { stepNumber: 2, stepName: "WARM RINSE", temperatureSetpointMin: "70", temperatureSetpointMax: "80", timeSetpoint: "8", concentrationMin: null, concentrationMax: null, temperatureActual: "", timeActual: "8", concentrationActual: "", startTime: "", endTime: "" },
//   { stepNumber: 3, stepName: "ALKALI", temperatureSetpointMin: "70", temperatureSetpointMax: "80", timeSetpoint: "24", concentrationMin: "1.5", concentrationMax: "2.0", temperatureActual: "", timeActual: "24", concentrationActual: "", startTime: "", endTime: "" },
//   { stepNumber: 4, stepName: "COLD RINSE", temperatureSetpointMin: "20", temperatureSetpointMax: "35", timeSetpoint: "8", concentrationMin: null, concentrationMax: null, temperatureActual: "", timeActual: "8", concentrationActual: "", startTime: "", endTime: "" },
//   { stepNumber: 5, stepName: "ACID", temperatureSetpointMin: "60", temperatureSetpointMax: "70", timeSetpoint: "16", concentrationMin: "0.5", concentrationMax: "1.0", temperatureActual: "", timeActual: "16", concentrationActual: "", startTime: "", endTime: "" },
//   { stepNumber: 6, stepName: "WARM RINSE", temperatureSetpointMin: "70", temperatureSetpointMax: "80", timeSetpoint: "16", concentrationMin: null, concentrationMax: null, temperatureActual: "", timeActual: "16", concentrationActual: "", startTime: "", endTime: "" },
//   { stepNumber: 7, stepName: "COLD RINSE", temperatureSetpointMin: "20", temperatureSetpointMax: "35", timeSetpoint: "8", concentrationMin: null, concentrationMax: null, temperatureActual: "", timeActual: "8", concentrationActual: "", startTime: "", endTime: "" },
// ];

// const getFallbackSpecialRecords = (lineCode) => {
//   const isLineA = lineCode === "LINE A" || lineCode === "LINE_A";

//   if (isLineA) {
//     return [
//       { stepType: "COP", time: "67", tempMin: "105", tempMax: "128", hasTemperature: true, hasConcentration: false, tempActual: "", startTime: "", endTime: "" },
//       { stepType: "SOP", time: "45", tempMin: "105", tempMax: "128", hasTemperature: true, hasConcentration: false, tempActual: "", startTime: "", endTime: "" },
//       { stepType: "SIP", time: "60", tempMin: "105", tempMax: "128", hasTemperature: true, hasConcentration: false, tempActual: "", startTime: "", endTime: "" },
//     ];
//   } else {
//     return [
//       { stepType: "DRYING", time: "57", tempMin: "118", tempMax: "125", hasTemperature: true, hasConcentration: false, tempActual: "", startTime: "", endTime: "" },
//       { stepType: "FOAMING", time: "41", hasTemperature: false, hasConcentration: false, startTime: "", endTime: "" },
//       { stepType: "DISINFECT/SANITASI", time: "30", tempBC: "40", tempDMin: "20", tempDMax: "35", concMin: "0.3", concMax: "0.5", hasTemperature: true, hasConcentration: true, tempActual: "", concActual: "", startTime: "", endTime: "" },
//     ];
//   }
// };

// const getFallbackFlowRate = (lineCode) => {
//   const flowRates = {
//     "LINE A": { flowRateMin: 12000, flowRateUnit: "L/H", flowRateActual: "" },
//     "LINE_A": { flowRateMin: 12000, flowRateUnit: "L/H", flowRateActual: "" },
//     "LINE B": { flowRateMin: 9000, flowRateUnit: "L/H", flowRateActual: "" },
//     "LINE_B": { flowRateMin: 9000, flowRateUnit: "L/H", flowRateActual: "" },
//     "LINE C": { flowRateMin: 9000, flowRateUnit: "L/H", flowRateActual: "" },
//     "LINE_C": { flowRateMin: 9000, flowRateUnit: "L/H", flowRateActual: "" },
//     "LINE D": { flowRateMin: 6000, flowRateUnit: "L/H", flowRateActual: "" },
//     "LINE_D": { flowRateMin: 6000, flowRateUnit: "L/H", flowRateActual: "" },
//   };
//   return flowRates[lineCode] || { flowRateMin: 12000, flowRateUnit: "L/H", flowRateActual: "" };
// };

// const getFallbackValveConfig = (posisi) => {
//   if (posisi === "Final") {
//     return [
//       { valveCode: "A", checked: false, label: "Valve A (Close)" },
//       { valveCode: "B", checked: true, label: "Valve B (Open)" },
//       { valveCode: "C", checked: true, label: "Valve C (Open)" },
//     ];
//   } else {
//     return [
//       { valveCode: "A", checked: false, label: "Valve A (Close)" },
//       { valveCode: "B", checked: true, label: "Valve B (Open)" },
//       { valveCode: "C", checked: false, label: "Valve C (Close)" },
//     ];
//   }
// };

// MAIN COMPONENT
const ReportCIPInspectionTable = forwardRef(({
  cipData,
  onSave,
  isEditable = true,
  selectedLine,
  username,
  posisi = "Final",
  shouldClearData = false,
  allowUnrestrictedInput = true,
  mode = "create",
  reloadKey,
  reportId,
}, ref) => {
  const line = selectedLine || cipData?.line || "LINE A";
  const STORAGE_KEY = getStorageKey(username, line, reportId);
  const isLineBCD = ["LINE B", "LINE C", "LINE D", "LINE_B", "LINE_C", "LINE_D"].includes(line);
  const isLineA = !isLineBCD;

  // STATE
  const [isLoading, setIsLoading] = useState(true);
  const [cipSteps, setCipSteps] = useState([]);
  const [specialRecords, setSpecialRecords] = useState([]);
  const [copRecords, setCopRecords] = useState([]);
  const [flowRate, setFlowRate] = useState({ flowRateMin: 0, flowRateUnit: "L/H", flowRateActual: "" });
  const [valveConfig, setValveConfig] = useState([]);
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);
  const [dataSource, setDataSource] = useState("loading");

  // Refs
  const hasLoadedData = useRef(false);
  const autoSaveTimer = useRef(null);
  const templatesRef = useRef(null);

  useEffect(() => {
    if (reloadKey === undefined) return;

    console.log("reloadKey changed → forcing reload", reloadKey);

    // reset internal guard
    hasLoadedData.current = false;

    // clear autosave timer to avoid race
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
  }, [reloadKey]);

  // EXPOSE METHODS
  useImperativeHandle(ref, () => ({
    clearAllData: async () => {
      await clearStoredData();
      resetToDefaults();
    },
    getData: () => getAllData(),
    isComplete: () => isTableComplete(),
  }));

  // FETCH TEMPLATES FROM API
  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(`Fetching templates for line: ${line}, posisi: ${posisi}`);

      const response = await api.get(`/cip-report/templates/steps`, {
        params: { line, posisi },
      });

      console.log(`API Response:`, JSON.stringify(response.data, null, 2));

      if (response.data.success && response.data.data) {
        const templateData = response.data.data;

        console.log(`Successfully fetched from API:`, {
          cipStepsCount: templateData.cipSteps?.length || 0,
          specialRecordsCount: templateData.specialRecords?.length || 0,
          flowRate: templateData.flowRate,
          valveConfigCount: templateData.valveConfig?.length || 0,
        });

        templatesRef.current = templateData;
        setDataSource("api");
        return templateData;
      }

      if (response.data.cipSteps || response.data.steps) {
        console.log(`Using alternative response format`);
        const templateData = {
          cipSteps: response.data.cipSteps || response.data.steps,
          specialRecords: response.data.specialRecords,
          flowRate: response.data.flowRate,
          valveConfig: response.data.valveConfig,
        };
        templatesRef.current = templateData;
        setDataSource("api");
        return templateData;
      }

      throw new Error(response.data.message || "Invalid response format from API");
    } catch (error) {
      // console.warn(`Error fetching templates, using fallback:`, error.message);
      // setDataSource("fallback");
      // const fallbackData = {
      //   cipSteps: getFallbackCipSteps(),
      //   specialRecords: getFallbackSpecialRecords(line),
      //   flowRate: getFallbackFlowRate(line),
      //   valveConfig: isLineBCD ? getFallbackValveConfig(posisi) : [],
      // };

      // // IMPORTANT: Store fallback in ref
      // templatesRef.current = fallbackData;

      // return fallbackData;
      console.error("Failed to fetch templates:", error.message);
      setDataSource("error");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [line, posisi, isLineBCD]);

  // ASYNC STORAGE
  const loadStoredData = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      console.error("Error loading stored data:", error);
      return null;
    }
  };

  const saveDataToStorage = async (data) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setAutoSaveIndicator(true);
      setTimeout(() => setAutoSaveIndicator(false), 1000);
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const clearStoredData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log("Cleared storage:", STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing stored data:", error);
    }
  };

  // DATA MANAGEMENT
  const getAllData = () => {
    const safeFlowRate =
      flowRate ?? {
        flowRateMin: 0,
        flowRateUnit: "L/H",
        flowRateActual: "",
      };

    const data = {
      steps: cipSteps,
      specialRecords: isLineA ? undefined : specialRecords,
      copRecords: isLineA ? copRecords : undefined,
      flowRate: {
        ...safeFlowRate,
        flowRateActual: String(safeFlowRate.flowRateActual ?? ""),
      },
      valvePositions: isLineBCD ? valveConfig.reduce((acc, v) => ({ ...acc, [v.valveCode]: v.checked }), {}) : undefined,
      line,
      isLineBCD,
    };

    console.log("getAllData returning:", {
      line: data.line,
      flowRateActual: data.flowRate.flowRateActual,
    });

    return data;
  };

  const resetToDefaults = () => {
    // const templates = templatesRef.current || {
    //   cipSteps: getFallbackCipSteps(),
    //   specialRecords: getFallbackSpecialRecords(line),
    //   flowRate: getFallbackFlowRate(line),
    //   valveConfig: isLineBCD ? getFallbackValveConfig(posisi) : [],
    // };
    const templates = templatesRef.current;

    if (!templates) {
      console.warn("resetToDefaults called but templatesRef is empty");
      return;
    }

    console.log("Resetting to defaults:", {
      cipStepsCount: templates.cipSteps?.length || 0,
      specialRecordsCount: templates.specialRecords?.length || 0,
    });

    // setCipSteps(templates.cipSteps || getFallbackCipSteps());
    setCipSteps(templates.cipSteps || []);
    if (isLineA) {
      // setCopRecords(templates.specialRecords || getFallbackSpecialRecords(line));
      setCopRecords(templates.specialRecords || []);
      setSpecialRecords([]);
    } else {
      // setSpecialRecords(templates.specialRecords || getFallbackSpecialRecords(line));
      setSpecialRecords(templates.specialRecords || []);
      setCopRecords([]);
    }
    // setFlowRate(templates.flowRate || getFallbackFlowRate(line));
    // setValveConfig(templates.valveConfig || (isLineBCD ? getFallbackValveConfig(posisi) : []));
    setFlowRate(
      templates.flowRate
        ? {
          flowRateMin: templates.flowRate.flowRateMin ?? 0,
          flowRateUnit: templates.flowRate.flowRateUnit ?? "L/H",
          flowRateActual: templates.flowRate.flowRateActual ?? "",
        }
        : {
          flowRateMin: 0,
          flowRateUnit: "L/H",
          flowRateActual: "",
        }
    );
    setValveConfig(templates.valveConfig || []);
  };

  // AUTO-SAVE EFFECT
  useEffect(() => {
    if (!hasLoadedData.current || !isEditable || isLoading) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      saveDataToStorage({
        cipSteps,
        specialRecords,
        copRecords,
        flowRate: {
          ...flowRate,
          flowRateActual: String(flowRate.flowRateActual ?? ""),
        },
        valveConfig,
        savedAt: new Date().toISOString(),
      });
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [cipSteps, specialRecords, copRecords, flowRate, valveConfig, isEditable]);

  useEffect(() => {
    if (mode === "create") {
      console.log("CREATE mode → clearing storage");
      clearStoredData();
    }
  }, [mode, line, posisi]);

  // INITIAL LOAD
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      console.log(`Initializing data for line: ${line}`);

      const templates = await fetchTemplates();
      const storedData = await loadStoredData();

      const hasPropsData = cipData && (
        (cipData.steps && cipData.steps.length > 0) ||
        (cipData.copRecords && cipData.copRecords.length > 0) ||
        (cipData.specialRecords && cipData.specialRecords.length > 0)
      );

      console.log(`Data sources:`, {
        hasPropsData,
        hasStoredData: !!storedData,
        templateSource: dataSource,
        templatesRefHasData: !!templatesRef.current,
        propsFlowRate: cipData?.flowRate,
        propsFlowRates: cipData?.flowRates,
      });

      if (mode === "edit" && storedData) {
        console.log("Loading from AsyncStorage");
        setDataSource("storage");
        setCipSteps(storedData.cipSteps || templates.cipSteps || []);
        if (isLineA) {
          if (Array.isArray(storedData.copRecords) && storedData.copRecords.length > 0) {
            setCopRecords(storedData.copRecords);
          } else {
            setCopRecords(templates.specialRecords || []);
          }
          setSpecialRecords([]);
        } else {
          setSpecialRecords(storedData.specialRecords || templates.specialRecords || []);
          setCopRecords([]);
        }

        const storedFlowRateActual =
          storedData?.flowRate?.flowRateActual ??
          storedData?.flowRateActual ??   // backward compatibility
          "";

        console.log("Loading flowRateActual from storage:", storedFlowRateActual);

        setFlowRate({
          ...(templates.flowRate || { flowRateMin: 0, flowRateUnit: "L/H", flowRateActual: "" }),
          ...(storedData.flowRate || {}), // merge min/unit jika ada
          flowRateActual: String(storedFlowRateActual),
        });

        setValveConfig(
          storedData.valveConfig ||
          templates.valveConfig ||
          []
        );
      } else if (hasPropsData) {
        console.log("Loading from props (edit mode)");
        setDataSource("props");
        setCipSteps(cipData.steps || templates.cipSteps || []);
        if (isLineA) {
          setCopRecords(cipData.copRecords || templates.specialRecords || []);
          setSpecialRecords([]);
        } else {
          setSpecialRecords(cipData.specialRecords || templates.specialRecords || []);
          setCopRecords([]);
        }

        // Properly load flowRate for all lines
        let flowRateValue = "";

        // Priority 1: Direct flowRate from props (already properly mapped in parent)
        if (cipData.flowRate !== undefined && cipData.flowRate !== null && cipData.flowRate !== "") {
          flowRateValue = cipData.flowRate.toString();
          console.log("Loading direct flowRate from props:", flowRateValue);
        }
        // Priority 2: From flowRates object (legacy support)
        else if (cipData.flowRates) {
          if (line === "LINE D" && cipData.flowRates.flowD !== undefined) {
            flowRateValue = cipData.flowRates.flowD.toString();
            console.log("Loading flowD from flowRates:", flowRateValue);
          } else if ((line === "LINE B" || line === "LINE C") && cipData.flowRates.flowBC !== undefined) {
            flowRateValue = cipData.flowRates.flowBC.toString();
            console.log("Loading flowBC from flowRates:", flowRateValue);
          }
        }
        // Priority 3: From line-specific fields (backward compatibility)
        else if (line === "LINE D" && cipData.flowRateD !== undefined) {
          flowRateValue = cipData.flowRateD.toString();
          console.log("Loading from flowRateD:", flowRateValue);
        } else if ((line === "LINE B" || line === "LINE C") && cipData.flowRateBC !== undefined) {
          flowRateValue = cipData.flowRateBC.toString();
          console.log("Loading from flowRateBC:", flowRateValue);
        }

        setFlowRate({
          ...(templates.flowRate || { flowRateMin: 0, flowRateUnit: "L/H", flowRateActual: "" }),
          flowRateActual: flowRateValue
        });

        if (cipData.valvePositions && isLineBCD) {
          const valves = (templates.valveConfig || []).map(v => ({
            ...v,
            checked: cipData.valvePositions[v.valveCode] ?? v.checked,
          }));
          setValveConfig(valves);
        } else {
          setValveConfig(templates.valveConfig || []);
        }
      } else {
        console.log("Loading from templates (new mode)");
        setCipSteps(templates.cipSteps || []);
        if (isLineA) {
          setCopRecords(templates.specialRecords || []);
          setSpecialRecords([]);
        } else {
          setSpecialRecords(templates.specialRecords || []);
          setCopRecords([]);
        }
        setFlowRate(
          templates.flowRate ||
          { flowRateMin: 0, flowRateUnit: "L/H", flowRateActual: "" }
        );
        setValveConfig(templates.valveConfig || []);
      }

      hasLoadedData.current = true;
      setIsLoading(false);
    };

    initializeData();
  }, [line, posisi, fetchTemplates, reloadKey]);

  // HANDLE CLEAR DATA
  useEffect(() => {
    if (shouldClearData) {
      console.log("shouldClearData triggered - clearing and resetting");
      clearStoredData();
      resetToDefaults();
    }
  }, [shouldClearData]);

  // UPDATE FUNCTIONS
  const updateCipStep = (index, field, value) => {
    setCipSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if ((field === "startTime" || field === "timeActual") && updated[index].startTime && updated[index].timeActual) {
        const startMoment = moment(updated[index].startTime, "HH:mm");
        const duration = parseInt(updated[index].timeActual) || 0;
        updated[index].endTime = startMoment.add(duration, "minutes").format("HH:mm");
      }

      return updated;
    });
  };

  const updateSpecialRecord = (index, field, value) => {
    const setter = isLineA ? setCopRecords : setSpecialRecords;

    setter((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      const timeField = isLineA ? "time" : "time";

      if (
        (field === "startTime" || field === timeField) &&
        updated[index].startTime &&
        updated[index][timeField]
      ) {
        const startMoment = moment(updated[index].startTime, "HH:mm");
        const duration = parseInt(updated[index][timeField]) || 0;
        updated[index].endTime = startMoment.add(duration, "minutes").format("HH:mm");
      }

      return updated;
    });
  };

  const updateFlowRate = (value) => {
    console.log("Updating flowRate to:", value);
    setFlowRate((prev) => {
      const updated = { ...prev, flowRateActual: String(value ?? "") };
      console.log("FlowRate state updated:", updated);
      return updated;
    });
  };

  const updateValve = (index) => {
    setValveConfig((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], checked: !updated[index].checked };
      return updated;
    });
  };

  // VALIDATION
  const isTableComplete = () => {
    const stepsOk = cipSteps.every(
      (s) => {
        const hasTemp = s.temperatureActual && s.temperatureActual.trim() !== "";
        const hasTime = s.timeActual && s.timeActual.trim() !== "";
        const hasStart = s.startTime && s.startTime.trim() !== "";
        const hasEnd = s.endTime && s.endTime.trim() !== "";
        const hasConc = s.concentrationMin == null ||
          (s.concentrationActual && s.concentrationActual.trim() !== "");
        const stepComplete = hasTemp && hasTime && hasStart && hasEnd && hasConc;
        return stepComplete;
      }
    );

    // Check Special Records
    let specialOk = false;

    if (isLineA) {
      specialOk = copRecords.every((r) => {
        const ok = r.tempActual && r.tempActual.trim() !== "" &&
          r.time && r.time.trim() !== "" &&
          r.startTime && r.startTime.trim() !== "" &&
          r.endTime && r.endTime.trim() !== "";
        return ok;
      });
    } else {
      specialOk = specialRecords.every((r) => {
        let ok = false;

        if (r.stepType === "FOAMING") {
          ok = r.time && r.time.trim() !== "" &&
            r.startTime && r.startTime.trim() !== "" &&
            r.endTime && r.endTime.trim() !== "";
        } else if (r.hasConcentration) {
          ok = r.tempActual && r.tempActual.trim() !== "" &&
            r.concActual && r.concActual.trim() !== "" &&
            r.time && r.time.trim() !== "" &&
            r.startTime && r.startTime.trim() !== "" &&
            r.endTime && r.endTime.trim() !== "";
        } else if (r.hasTemperature === false) {
          ok = r.time && r.time.trim() !== "" &&
            r.startTime && r.startTime.trim() !== "" &&
            r.endTime && r.endTime.trim() !== "";
        } else {
          ok = r.tempActual && r.tempActual.trim() !== "" &&
            r.time && r.time.trim() !== "" &&
            r.startTime && r.startTime.trim() !== "" &&
            r.endTime && r.endTime.trim() !== "";
        }
        return ok;
      });
    }

    const flowOk = flowRate.flowRateActual && flowRate.flowRateActual.toString().trim() !== "";
    const allComplete = stepsOk && specialOk && flowOk;
    return allComplete;
  };

  // SAVE HANDLER
  const handleSave = async () => {
    const isComplete = isTableComplete();
    const isDraft = !isComplete;
    const data = getAllData();

    if (onSave) {
      // Parameter kedua (isDraft) sekarang otomatis
      onSave(data, isDraft);

      // CLEAR STORAGE after successful save/submit
      if (isComplete) {
        await clearStoredData();
      }
    }
  };

  // RENDER: LOADING
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text style={styles.loadingText}>Loading CIP templates for {line}...</Text>
      </View>
    );
  }

  // RENDER: CIP STEPS
  const renderCipStepsTable = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>LAPORAN CIP MESIN GALDI RG 280 UC5</Text>

      {__DEV__ && (
        <Text style={styles.dataSourceIndicator}>
          Data source: {dataSource} | Steps: {cipSteps.length} | Special: {specialRecords.length}
        </Text>
      )}

      <View style={styles.tableHeader}>
        <View style={styles.stepNumberHeader}><Text style={styles.headerText}>Step</Text></View>
        <View style={styles.stepNameHeader}><Text style={styles.headerText}>Posisi</Text></View>
        <View style={styles.temperatureHeader}><Text style={styles.headerText}>Temp (°C)</Text></View>
        <View style={styles.timeHeader}><Text style={styles.headerText}>Time (Min)</Text></View>
        <View style={styles.durationHeader}><Text style={styles.headerText}>Time</Text></View>
      </View>

      {cipSteps.map((step, index) => (
        <View key={`step-${index}`} style={styles.stepRow}>
          <View style={styles.stepNumberCell}>
            <Text style={styles.stepNumber}>{step.stepNumber}</Text>
          </View>

          <View style={styles.stepNameCell}>
            <Text style={styles.stepName}>{step.stepName}</Text>
            {(step.concentrationMin || step.stepName === "ALKALI" || step.stepName === "ACID") && (
              <View style={styles.concentrationContainer}>
                <Text style={styles.concentrationLabel}>Conc:</Text>
                <Text style={styles.concentrationRange}>
                  ({step.concentrationMin || (step.stepName === "ALKALI" ? "1.5" : "0.5")} - {step.concentrationMax || (step.stepName === "ALKALI" ? "2.0" : "1.0")}) %
                </Text>
              </View>
            )}
          </View>

          <View style={styles.temperatureCell}>
            <Text style={styles.cellLabel}>Temp (°C)</Text>
            <View style={styles.inputRow}>
              <Text style={styles.setpointText}>{step.temperatureSetpointMin}</Text>
              <Text style={styles.rangeSeparator}>-</Text>
              <Text style={styles.setpointText}>{step.temperatureSetpointMax}</Text>
              <Text style={styles.separator}>/</Text>
              <FlexibleNumericInput
                value={step.temperatureActual}
                onChangeText={(val) => updateCipStep(index, "temperatureActual", val)}
                placeholder="Temp"
                minRange={parseFloat(step.temperatureSetpointMin)}
                maxRange={parseFloat(step.temperatureSetpointMax)}
                unit="°C"
                style={styles.smallInput}
                editable={isEditable}
              />
              {(step.concentrationMin || step.stepName === "ALKALI" || step.stepName === "ACID") && (
                <>
                  <Text style={styles.separator}>|</Text>
                  <FlexibleNumericInput
                    value={step.concentrationActual}
                    onChangeText={(val) => updateCipStep(index, "concentrationActual", val)}
                    placeholder="Conc"
                    minRange={parseFloat(step.concentrationMin) || (step.stepName === "ALKALI" ? 1.5 : 0.5)}
                    maxRange={parseFloat(step.concentrationMax) || (step.stepName === "ALKALI" ? 2.0 : 1.0)}
                    unit="%"
                    style={styles.smallInput}
                    editable={isEditable}
                  />
                </>
              )}
            </View>
          </View>

          <View style={styles.timeCell}>
            <Text style={styles.cellLabel}>Time (Min)</Text>
            <FlexibleNumericInput
              value={step.timeActual}
              onChangeText={(val) => updateCipStep(index, "timeActual", val)}
              placeholder={step.timeSetpoint}
              minRange={parseFloat(step.timeSetpoint) * 0.8}
              maxRange={parseFloat(step.timeSetpoint) * 1.2}
              unit=" min"
              style={styles.timeActualInput}
              editable={isEditable}
            />
          </View>

          <View style={styles.durationCell}>
            <Text style={styles.cellLabel}>Time</Text>
            <View style={styles.timeInputRow}>
              <TimePickerInput
                value={step.startTime}
                onChange={(val) => updateCipStep(index, "startTime", val)}
                placeholder="Start"
                editable={isEditable}
              />
              <Text style={styles.timeSeparator}>-</Text>
              <TimePickerInput
                value={step.endTime}
                onChange={(val) => updateCipStep(index, "endTime", val)}
                placeholder="End"
                editable={isEditable}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // RENDER: SPECIAL RECORDS LINE A (COP/SOP/SIP)
  const renderLineASpecialRecords = () => {
    // console.log("Rendering LINE A COP records:", copRecords.length);
    if (!hasLoadedData.current) return null;

    if (!copRecords || copRecords.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LAPORAN COP, SOP DAN SIP MESIN GALDI RG 280 UC5</Text>
          <Text style={styles.emptyText}>No COP/SOP/SIP records. Please contact administrator.</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LAPORAN COP, SOP DAN SIP MESIN GALDI RG 280 UC5</Text>
        {copRecords.map((record, index) => (
          <View key={`special-${index}`} style={styles.copRow}>
            <View style={styles.copTypeCell}>
              <Text style={styles.copType}>{record.stepType}</Text>
            </View>

            <View style={styles.copTimeSection}>
              <View style={styles.copTimeItem}>
                <Text style={styles.copTimeLabel}>{record.time} Menit</Text>
                <FlexibleNumericInput
                  value={record.time}
                  onChangeText={(val) => updateSpecialRecord(index, "time", val)}
                  placeholder={record.time}
                  style={styles.copTimeInput}
                  editable={isEditable}
                />
              </View>
            </View>

            <View style={styles.copTempSection}>
              <Text style={styles.copTempLabel}>Temp ({record.tempMin}-{record.tempMax}°C)</Text>
              <FlexibleNumericInput
                value={record.tempActual}
                onChangeText={(val) => updateSpecialRecord(index, "tempActual", val)}
                placeholder="Actual"
                minRange={parseFloat(record.tempMin)}
                maxRange={parseFloat(record.tempMax)}
                unit="°C"
                style={styles.copTempInput}
                editable={isEditable}
              />
            </View>

            <View style={styles.copTimeRangeSection}>
              <Text style={styles.cellLabel}>Time</Text>
              <View style={styles.timeInputRow}>
                <TimePickerInput
                  value={record.startTime}
                  onChange={(val) => updateSpecialRecord(index, "startTime", val)}
                  placeholder="Start"
                  editable={isEditable}
                />
                <Text style={styles.timeSeparator}>-</Text>
                <TimePickerInput
                  value={record.endTime}
                  onChange={(val) => updateSpecialRecord(index, "endTime", val)}
                  placeholder="End"
                  editable={isEditable}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // RENDER: SPECIAL RECORDS LINE B/C/D
  const renderLineBCDSpecialRecords = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>LAPORAN DRYING, FOAMING, DISINFECT/SANITASI</Text>
      {specialRecords.map((record, index) => (
        <View key={`special-${index}`} style={styles.specialRow}>
          <View style={styles.specialTypeCell}>
            <Text style={styles.specialType}>{record.stepType}</Text>
          </View>

          <View style={styles.specialContent}>
            <View style={styles.specialDetails}>
              {record.stepType === "DRYING" && (
                <>
                  <View style={styles.specialItem}>
                    <Text style={styles.specialLabel}>Temp ({record.tempMin}-{record.tempMax}°C):</Text>
                    <FlexibleNumericInput
                      value={record.tempActual}
                      onChangeText={(val) => updateSpecialRecord(index, "tempActual", val)}
                      placeholder="Actual"
                      minRange={parseFloat(record.tempMin)}
                      maxRange={parseFloat(record.tempMax)}
                      unit="°C"
                      style={styles.specialTempInput}
                      editable={isEditable}
                    />
                  </View>
                  <View style={styles.specialItem}>
                    <Text style={styles.specialLabel}>Time (min):</Text>
                    <FlexibleNumericInput
                      value={record.time}
                      onChangeText={(val) => updateSpecialRecord(index, "time", val)}
                      placeholder="57"
                      style={styles.specialTimeInput}
                      editable={isEditable}
                    />
                  </View>
                </>
              )}

              {record.stepType === "FOAMING" && (
                <View style={styles.specialItem}>
                  <Text style={styles.specialLabel}>Time (min):</Text>
                  <FlexibleNumericInput
                    value={record.time}
                    onChangeText={(val) => updateSpecialRecord(index, "time", val)}
                    placeholder="41"
                    style={styles.specialTimeInput}
                    editable={isEditable}
                  />
                </View>
              )}

              {record.stepType === "DISINFECT/SANITASI" && (
                <>
                  <View style={styles.specialItem}>
                    <Text style={styles.specialLabel}>
                      {line === "LINE D"
                        ? `Temp (${record.tempDMin}-${record.tempDMax}°C):`
                        : `Temp (${record.tempBC}°C):`}
                    </Text>
                    <FlexibleNumericInput
                      value={record.tempActual}
                      onChangeText={(val) => updateSpecialRecord(index, "tempActual", val)}
                      placeholder="Actual"
                      minRange={line === "LINE D" ? parseFloat(record.tempDMin) : parseFloat(record.tempBC) - 5}
                      maxRange={line === "LINE D" ? parseFloat(record.tempDMax) : parseFloat(record.tempBC) + 5}
                      unit="°C"
                      style={styles.specialTempInput}
                      editable={isEditable}
                    />
                  </View>
                  <View style={styles.specialItem}>
                    <Text style={styles.specialLabel}>Conc ({record.concMin}-{record.concMax}%):</Text>
                    <FlexibleNumericInput
                      value={record.concActual}
                      onChangeText={(val) => updateSpecialRecord(index, "concActual", val)}
                      placeholder="Actual"
                      minRange={parseFloat(record.concMin)}
                      maxRange={parseFloat(record.concMax)}
                      unit="%"
                      style={styles.concInput}
                      editable={isEditable}
                    />
                  </View>
                  <View style={styles.specialItem}>
                    <Text style={styles.specialLabel}>Time (min):</Text>
                    <FlexibleNumericInput
                      value={record.time}
                      onChangeText={(val) => updateSpecialRecord(index, "time", val)}
                      placeholder="30"
                      style={styles.specialTimeInput}
                      editable={isEditable}
                    />
                  </View>
                </>
              )}
            </View>

            <View style={styles.specialTimeRange}>
              <Text style={styles.cellLabel}>Time</Text>
              <View style={styles.timeInputRow}>
                <TimePickerInput
                  value={record.startTime}
                  onChange={(val) => updateSpecialRecord(index, "startTime", val)}
                  placeholder="Start"
                  editable={isEditable}
                />
                <Text style={styles.timeSeparator}>-</Text>
                <TimePickerInput
                  value={record.endTime}
                  onChange={(val) => updateSpecialRecord(index, "endTime", val)}
                  placeholder="End"
                  editable={isEditable}
                />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // RENDER: VALVE POSITIONS
  const renderValvePositions = () => {
    if (isLineA) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>POSISI VALVE</Text>
        <View style={styles.valveInfo}>
          <Text style={styles.valveInfoText}>
            Posisi: {posisi} {posisi === "Final" ? "(B & C Open)" : "(B Open, C Close)"}
          </Text>
        </View>
        <View style={styles.valveContainer}>
          {valveConfig.map((valve, index) => (
            <Checkbox
              key={valve.valveCode}
              value={valve.checked}
              onValueChange={() => updateValve(index)}
              label={valve.label}
              disabled={!isEditable}
            />
          ))}
        </View>
      </View>
    );
  };

  // RENDER: FLOW RATE
  const renderFlowRate = () => {
    console.log("Rendering flowRate:", {
      line,
      flowRateActual: flowRate.flowRateActual,
      flowRateMin: flowRate.flowRateMin,
      flowRateUnit: flowRate.flowRateUnit
    });

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FLOW RATE</Text>
        <View style={styles.flowContainer}>
          <View style={styles.flowItem}>
            <Text style={styles.flowLabel}>
              Flow {line === "LINE A" ? "A" : line === "LINE D" ? "D" : "B,C"} (Min {flowRate.flowRateMin} {flowRate.flowRateUnit}):
            </Text>
            <FlexibleNumericInput
              value={flowRate.flowRateActual}
              onChangeText={(val) => {
                console.log("FlowRate input changed to:", val);
                updateFlowRate(val);
              }}
              placeholder={`e.g. ${flowRate.flowRateMin + 500}`}
              minRange={flowRate.flowRateMin}
              unit={` ${flowRate.flowRateUnit}`}
              style={styles.flowInput}
              editable={isEditable}
            />
          </View>
        </View>
      </View>
    );
  };

  // RENDER: MAIN
  return (
    <ScrollView style={styles.container}>
      {autoSaveIndicator && (
        <View style={styles.autoSaveIndicator}>
          <Icon name="cloud-done" size={16} color={COLORS.green} />
          <Text style={styles.autoSaveText}>Data tersimpan otomatis</Text>
        </View>
      )}

      {renderValvePositions()}
      {renderFlowRate()}
      {renderCipStepsTable()}
      {isLineA ? renderLineASpecialRecords() : renderLineBCDSpecialRecords()}

      {isEditable && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Icon name="save" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>Save CIP Report</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
});

export default ReportCIPInspectionTable;

// STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.darkGray },
  autoSaveIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#E8F5E9", padding: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 4 },
  autoSaveText: { marginLeft: 8, fontSize: 12, color: COLORS.green },
  dataSourceIndicator: { fontSize: 10, color: COLORS.gray, textAlign: "center", marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.gray, fontStyle: "italic", textAlign: "center", padding: 16 },

  flexibleInputContainer: { marginBottom: 8, width: "100%" },
  focusedInput: { borderColor: COLORS.blue, borderWidth: 2 },
  warningInput: { borderColor: COLORS.warningOrange, backgroundColor: COLORS.warningYellow, borderWidth: 2 },
  warningText: { fontSize: 9, color: COLORS.warningText, marginTop: 2, fontStyle: "italic", textAlign: "center", lineHeight: 11, paddingHorizontal: 2 },

  section: { margin: 16, backgroundColor: "#fff", borderRadius: 8, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.blue, marginBottom: 16, textAlign: "center" },

  tableHeader: { flexDirection: "row", backgroundColor: COLORS.lightBlue, paddingVertical: 8, borderRadius: 4, marginBottom: 8 },
  headerText: { fontSize: 12, fontWeight: "bold", color: COLORS.blue, textAlign: "center" },
  stepNumberHeader: { width: 40, alignItems: "center" },
  stepNameHeader: { flex: 2, paddingHorizontal: 8 },
  temperatureHeader: { flex: 2.5, alignItems: "center" },
  timeHeader: { flex: 1.5, alignItems: "center" },
  durationHeader: { flex: 2.5, alignItems: "center" },

  stepRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e0e0e0", paddingVertical: 8, alignItems: "center" },
  stepNumberCell: { width: 40, alignItems: "center" },
  stepNumber: { fontSize: 14, fontWeight: "bold", color: COLORS.blue },
  stepNameCell: { flex: 2, paddingHorizontal: 8 },
  stepName: { fontSize: 12, fontWeight: "600", color: COLORS.black },
  concentrationContainer: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  concentrationLabel: { fontSize: 11, color: COLORS.darkGray, marginRight: 4 },
  concentrationRange: { fontSize: 11, color: COLORS.blue, fontWeight: "600", marginLeft: 4 },
  temperatureCell: { flex: 2.5, alignItems: "center" },
  timeCell: { flex: 1.5, alignItems: "center" },
  durationCell: { flex: 2.5, alignItems: "center" },
  cellLabel: { fontSize: 10, color: COLORS.darkGray, marginBottom: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, backgroundColor: "#fff" },
  smallInput: { width: 48, textAlign: "center", marginHorizontal: 1 },
  timeActualInput: { width: 52, textAlign: "center" },
  setpointText: { fontSize: 11, color: COLORS.darkGray },
  rangeSeparator: { marginHorizontal: 2, fontSize: 12, color: COLORS.darkGray, fontWeight: "500" },
  separator: { marginHorizontal: 4, fontSize: 12, color: COLORS.darkGray },
  timeInputRow: { flexDirection: "row", alignItems: "center" },
  timeInput: { width: 60, textAlign: "center", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timePickerButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6 },
  timeText: { fontSize: 11, color: COLORS.black, marginRight: 4 },
  placeholderText: { color: COLORS.gray },
  disabledInput: { backgroundColor: "#f0f0f0" },
  timeSeparator: { marginHorizontal: 4, fontSize: 12, color: COLORS.darkGray },

  // COP/SOP/SIP styles (LINE A)
  copRow: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: "#f9f9f9" },
  copTypeCell: { marginBottom: 8 },
  copType: { fontSize: 16, fontWeight: "bold", color: COLORS.blue },
  copTimeSection: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  copTimeItem: { marginRight: 16, marginBottom: 8 },
  copTimeLabel: { fontSize: 12, color: COLORS.darkGray, marginBottom: 4 },
  copTimeInput: { width: 62, textAlign: "center" },
  copTempSection: { marginBottom: 8 },
  copTempLabel: { fontSize: 12, color: COLORS.darkGray, marginBottom: 4 },
  copTempInput: { width: 82, textAlign: "center" },
  copTimeRangeSection: { marginBottom: 8 },

  // Special Records styles (LINE B/C/D)
  specialRow: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: "#f9f9f9" },
  specialTypeCell: { marginBottom: 8 },
  specialType: { fontSize: 16, fontWeight: "bold", color: COLORS.orange },
  specialContent: { flex: 1 },
  specialDetails: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8, alignItems: "flex-start" },
  specialItem: { marginRight: 16, marginBottom: 8, flexDirection: "column", alignItems: "flex-start", minWidth: 100 },
  specialLabel: { fontSize: 12, color: COLORS.darkGray, marginBottom: 4, fontWeight: "500" },
  specialNote: { fontSize: 12, color: COLORS.gray, fontStyle: "italic" },
  specialTempInput: { width: 70, textAlign: "center" },
  specialTimeInput: { width: 60, textAlign: "center" },
  concInput: { width: 70, textAlign: "center" },
  specialTimeRange: { borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8 },

  // Valve styles
  valveInfo: { backgroundColor: COLORS.lightBlue, padding: 12, borderRadius: 8, marginBottom: 12 },
  valveInfoText: { fontSize: 14, color: COLORS.blue, fontWeight: "600", textAlign: "center" },
  valveContainer: { flexDirection: "row", justifyContent: "space-around", flexWrap: "wrap" },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginHorizontal: 8 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: COLORS.blue, borderRadius: 4, marginRight: 8, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: COLORS.blue },
  checkboxDisabled: { borderColor: COLORS.gray, backgroundColor: "#f0f0f0" },
  checkboxLabel: { fontSize: 14, color: COLORS.black },
  checkboxLabelDisabled: { color: COLORS.gray },

  // Flow rate styles
  flowContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  flowItem: { flex: 1, minWidth: 200, marginHorizontal: 4 },
  flowLabel: { fontSize: 14, fontWeight: "600", color: COLORS.darkGray, marginBottom: 8 },
  flowInput: { textAlign: "center", paddingVertical: 8, fontSize: 14 },

  // Save button
  saveButton: { flexDirection: "row", backgroundColor: COLORS.green, margin: 16, padding: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", marginLeft: 8 },

  // Status indicator
  statusContainer: { marginHorizontal: 16, marginBottom: 24, alignItems: "center" },
  statusText: { fontSize: 14, fontWeight: "600", padding: 8, borderRadius: 4 },
  statusComplete: { color: COLORS.green, backgroundColor: "#E8F5E9" },
  statusIncomplete: { color: COLORS.orange, backgroundColor: "#FFF3E0" },

  // Modal styles
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.5)" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  modalTitle: { fontSize: 18, fontWeight: "600", color: COLORS.black, flex: 1, textAlign: "center" },
  cancelButton: { fontSize: 16, color: COLORS.red },
  doneButton: { fontSize: 16, color: COLORS.blue, fontWeight: "600" },
});