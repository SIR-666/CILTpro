import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialIcons";
import moment from "moment";
import { COLORS } from "../../constants/theme";
import { api } from "../../utils/axiosInstance";
import ReportCIPInspectionTable from "../../components/package/filler/ReportCIPInspectionTable";
import ReportCIPInspectionTableBCD from "../../components/package/filler/ReportCIPInspectionTableBCD";

const EditCIP = ({ navigation, route }) => {
  const { cipData: existingCipData } = route.params;
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // CIP Types state
  const [cipTypes, setCipTypes] = useState([
    { id: 1, name: "CIP KITCHEN 1", value: "CIP_KITCHEN_1" },
    { id: 2, name: "CIP KITCHEN 2", value: "CIP_KITCHEN_2" },
    { id: 3, name: "CIP KITCHEN 3", value: "CIP_KITCHEN_3" },
  ]);

  // Status checks
  const isDraft = existingCipData.status === "In Progress";
  const isSubmitted = existingCipData.status === "Complete";
  const canEdit = isDraft || existingCipData.status === "Rejected";

  // ---------- Normalizers ----------
  const toStr = (v) => (v === null || v === undefined ? "" : String(v));

  const normalizeSteps = (steps = []) =>
    steps.map((s, i) => ({
      stepNumber: s.stepNumber ?? s.step_number ?? i + 1,
      stepName: s.stepName ?? s.step_name ?? s.name ?? "",
      temperatureSetpointMin: toStr(
        s.temperatureSetpointMin ?? s.temp_setpoint_min ?? s.temp_min
      ),
      temperatureSetpointMax: toStr(
        s.temperatureSetpointMax ?? s.temp_setpoint_max ?? s.temp_max
      ),
      temperatureActual: toStr(s.temperatureActual ?? s.temp_actual),
      timeSetpoint: toStr(s.timeSetpoint ?? s.time_setpoint ?? s.time_sp),
      timeActual: toStr(s.timeActual ?? s.time_actual),
      concentration:
        s.concentration === null || s.concentration === undefined
          ? null
          : toStr(s.concentration),
      concentrationActual: toStr(
        s.concentrationActual ?? s.conc_actual ?? s.conc
      ),
      startTime: s.startTime ?? s.start_time ?? "",
      endTime: s.endTime ?? s.end_time ?? "",
    }));

  const normalizeCop = (rows = []) =>
    rows.map((c) => ({
      stepType: c.stepType ?? c.step_type ?? "",
      time67Min: toStr(c.time67Min ?? c.t67 ?? c.time_67),
      time45Min: toStr(c.time45Min ?? c.t45 ?? c.time_45),
      time60Min: toStr(c.time60Min ?? c.t60 ?? c.time_60),
      startTime: c.startTime ?? c.start_time ?? "",
      endTime: c.endTime ?? c.end_time ?? "",
      tempMin: toStr(c.tempMin ?? c.temp_min ?? 105),
      tempMax: toStr(c.tempMax ?? c.temp_max ?? 128),
      tempActual: toStr(c.tempActual ?? c.temp_actual),
      kode: c.kode ?? c.code ?? "",
    }));

  const normalizeSpecial = (rows = []) =>
    rows.map((r) => ({
      stepType: r.stepType ?? r.step_type ?? "",
      tempMin: toStr(r.tempMin ?? r.temp_min),
      tempMax: toStr(r.tempMax ?? r.temp_max),
      tempActual: toStr(r.tempActual ?? r.temp_actual),
      tempBC: toStr(r.tempBC ?? r.temp_bc),
      tempDMin: toStr(r.tempDMin ?? r.temp_d_min),
      tempDMax: toStr(r.tempDMax ?? r.temp_d_max),
      concMin: toStr(r.concMin ?? r.conc_min),
      concMax: toStr(r.concMax ?? r.conc_max),
      concActual: toStr(r.concActual ?? r.conc_actual),
      time: toStr(r.time ?? r.duration ?? r.time_min),
      startTime: r.startTime ?? r.start_time ?? "",
      endTime: r.endTime ?? r.end_time ?? "",
      kode: r.kode ?? r.code ?? "",
    }));

  // Sumber data kemungkinan dari backend
  const stepsSrc =
    existingCipData?.steps ||
    existingCipData?.cipSteps ||
    existingCipData?.step_records ||
    existingCipData?.details?.steps ||
    [];

  const copSrc =
    existingCipData?.copRecords ||
    existingCipData?.cop_sop_sip ||
    existingCipData?.details?.copRecords ||
    [];

  const specialSrc =
    existingCipData?.specialRecords ||
    existingCipData?.special_records ||
    existingCipData?.details?.specialRecords ||
    [];

  const valveSrc =
    existingCipData?.valvePositions ||
    existingCipData?.valve_positions || { A: false, B: false, C: false };

  const normalizedFlowRates = {
    flowBC: toStr(
      existingCipData?.flowRates?.flowBC ??
        existingCipData?.flowRateBC ??
        existingCipData?.flow_rate_bc ??
        ""
    ),
    flowD: toStr(
      existingCipData?.flowRates?.flowD ??
        existingCipData?.flowRateD ??
        existingCipData?.flow_rate_d ??
        ""
    ),
  };

  // Initialize form data with existing data (lengkap header + detail)
  const [formData, setFormData] = useState({
    id: existingCipData.id,
    date: existingCipData.date ? new Date(existingCipData.date) : new Date(),
    processOrder:
      existingCipData.processOrder || existingCipData.process_order || "",
    plant: existingCipData.plant || "Milk Filling Packing",
    line: existingCipData.line || "",
    cipType: existingCipData.cipType || existingCipData.cip_type || "",
    operator: existingCipData.operator || "",
    posisi: existingCipData.posisi || "",
    flowRate:
      existingCipData.flowRate !== undefined
        ? existingCipData.flowRate
        : existingCipData.flow_rate || "",
    notes: existingCipData.notes || "",
    kodeOperator:
      existingCipData.kodeOperator || existingCipData.kode_operator || "",
    kodeTeknisi:
      existingCipData.kodeTeknisi || existingCipData.kode_teknisi || "",
    // detail untuk tabel
    steps: normalizeSteps(stepsSrc),
    copRecords: normalizeCop(copSrc), // LINE A
    specialRecords: normalizeSpecial(specialSrc), // LINE B/C/D
    valvePositions: valveSrc,
    flowRates: normalizedFlowRates,
  });

  // Options
  const [posisiOptions, setPosisiOptions] = useState([
    { label: "Final", value: "Final" },
    { label: "Intermediate", value: "Intermediate" },
  ]);

  useEffect(() => {
    fetchUserProfile();
    fetchCIPTypes();
    console.log("Editing CIP Data:", existingCipData);

    // Check if editing is allowed
    if (!canEdit) {
      Alert.alert(
        "Edit Restricted",
        "This report cannot be edited because it has been submitted. Contact admin if changes are needed.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    }
  }, []);

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

  const generateProcessOrder = () => {
    const date = moment().format("YYYY");
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const processOrder = `PO-MFP-${date}-${randomNum}`;
    setFormData((prev) => ({ ...prev, processOrder }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateBasicInfo = () => {
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

    // For LINE A, validate single flow rate
    if (formData.line === "LINE A" && !formData.flowRate) {
      Alert.alert("Validation Error", "Flow rate is required");
      return false;
    }

    return true;
  };

  const showWarningsDialog = (warnings, isDraft) => {
    if (!warnings || warnings.length === 0) return;

    const warningMessages = warnings.map((w) => `• ${w.message}`).join("\n\n");
    const title = isDraft
      ? "Draft Updated with Warnings"
      : "Submitted with Warnings";
    const message = isDraft
      ? `Your draft has been updated with the following warnings:\n\n${warningMessages}\n\nYou can continue editing to adjust the values if needed.`
      : `Your report has been submitted with the following warnings:\n\n${warningMessages}\n\nPlease note these for future reference.`;

    Alert.alert(title, message, [{ text: "OK" }]);
  };

  const validateDraftInfo = () => !!formData.line;

  const handleUpdateCIP = async (cipTableData, isDraft = false) => {
    if (!isDraft) {
      if (!validateBasicInfo()) return;
    } else {
      if (!validateDraftInfo()) {
        Alert.alert(
          "Validation Error",
          "Please select a line before saving as draft"
        );
        return;
      }
    }

    setLoading(true);
    try {
      let dataToSubmit = {
        // Basic info
        date: moment(formData.date).format("YYYY-MM-DD"),
        processOrder: formData.processOrder,
        plant: formData.plant,
        line: formData.line,
        cipType: formData.cipType,
        operator: formData.operator,
        posisi: formData.posisi,
        notes: formData.notes || "",
        isDraft, // Important flag for backend
      };

      // Handle LINE A data
      if (formData.line === "LINE A") {
        dataToSubmit = {
          ...dataToSubmit,
          flowRate:
            formData.flowRate !== "" && formData.flowRate !== null
              ? parseFloat(formData.flowRate)
              : null,
          kodeOperator:
            cipTableData.kodeOperator || formData.kodeOperator || "",
          kodeTeknisi: cipTableData.kodeTeknisi || formData.kodeTeknisi || "",

          // Steps data
          steps: (cipTableData.steps || []).map((step) => ({
            stepNumber: parseInt(step.stepNumber),
            stepName: step.stepName,
            temperatureSetpointMin:
              step.temperatureSetpointMin !== ""
                ? parseFloat(step.temperatureSetpointMin)
                : null,
            temperatureSetpointMax:
              step.temperatureSetpointMax !== ""
                ? parseFloat(step.temperatureSetpointMax)
                : null,
            temperatureActual:
              step.temperatureActual !== ""
                ? parseFloat(step.temperatureActual)
                : null,
            timeSetpoint:
              step.timeSetpoint !== "" ? parseInt(step.timeSetpoint) : null,
            timeActual:
              step.timeActual !== "" ? parseInt(step.timeActual) : null,
            concentration:
              step.concentration !== "" && step.concentration != null
                ? parseFloat(step.concentration)
                : null,
            concentrationActual:
              step.concentrationActual !== "" &&
              step.concentrationActual != null
                ? parseFloat(step.concentrationActual)
                : null,
            startTime: step.startTime || null,
            endTime: step.endTime || null,
          })),

          // COP records
          copRecords: (cipTableData.copRecords || []).map((cop) => ({
            stepType: cop.stepType,
            time67Min:
              cop.time67Min !== "" && cop.time67Min != null
                ? parseInt(cop.time67Min)
                : null,
            time45Min:
              cop.time45Min !== "" && cop.time45Min != null
                ? parseInt(cop.time45Min)
                : null,
            time60Min:
              cop.time60Min !== "" && cop.time60Min != null
                ? parseInt(cop.time60Min)
                : null,
            startTime: cop.startTime || null,
            endTime: cop.endTime || null,
            tempMin:
              cop.tempMin !== "" && cop.tempMin != null
                ? parseFloat(cop.tempMin)
                : null,
            tempMax:
              cop.tempMax !== "" && cop.tempMax != null
                ? parseFloat(cop.tempMax)
                : null,
            tempActual:
              cop.tempActual !== "" && cop.tempActual != null
                ? parseFloat(cop.tempActual)
                : null,
            kode: cop.kode || "",
          })),
        };
      }
      // Handle LINE B/C data
      else if (formData.line === "LINE B" || formData.line === "LINE C") {
        dataToSubmit = {
          ...dataToSubmit,
          flowRateBC:
            cipTableData?.flowRates?.flowBC !== "" &&
            cipTableData?.flowRates?.flowBC != null
              ? parseFloat(cipTableData.flowRates.flowBC)
              : null,
          valvePositions:
            cipTableData.valvePositions || { A: false, B: false, C: false },
          kodeOperator:
            cipTableData.kodeOperator || formData.kodeOperator || "",
          kodeTeknisi: cipTableData.kodeTeknisi || formData.kodeTeknisi || "",

          // Steps data
          steps: (cipTableData.steps || []).map((step) => ({
            stepNumber: parseInt(step.stepNumber),
            stepName: step.stepName,
            temperatureSetpointMin:
              step.temperatureSetpointMin !== ""
                ? parseFloat(step.temperatureSetpointMin)
                : null,
            temperatureSetpointMax:
              step.temperatureSetpointMax !== ""
                ? parseFloat(step.temperatureSetpointMax)
                : null,
            temperatureActual:
              step.temperatureActual !== ""
                ? parseFloat(step.temperatureActual)
                : null,
            timeSetpoint:
              step.timeSetpoint !== "" ? parseInt(step.timeSetpoint) : null,
            timeActual:
              step.timeActual !== "" ? parseInt(step.timeActual) : null,
            concentration:
              step.concentration !== "" && step.concentration != null
                ? parseFloat(step.concentration)
                : null,
            concentrationActual:
              step.concentrationActual !== "" &&
              step.concentrationActual != null
                ? parseFloat(step.concentrationActual)
                : null,
            startTime: step.startTime || null,
            endTime: step.endTime || null,
          })),

          // Special records for BCD (DRYING, FOAMING, DISINFECT)
          specialRecords: (cipTableData.specialRecords || []).map((record) => ({
            stepType: record.stepType,
            tempMin:
              record.tempMin !== "" && record.tempMin != null
                ? parseFloat(record.tempMin)
                : null,
            tempMax:
              record.tempMax !== "" && record.tempMax != null
                ? parseFloat(record.tempMax)
                : null,
            tempActual:
              record.tempActual !== "" && record.tempActual != null
                ? parseFloat(record.tempActual)
                : null,
            tempBC:
              record.tempBC !== "" && record.tempBC != null
                ? parseFloat(record.tempBC)
                : null,
            tempDMin:
              record.tempDMin !== "" && record.tempDMin != null
                ? parseFloat(record.tempDMin)
                : null,
            tempDMax:
              record.tempDMax !== "" && record.tempDMax != null
                ? parseFloat(record.tempDMax)
                : null,
            concMin:
              record.concMin !== "" && record.concMin != null
                ? parseFloat(record.concMin)
                : null,
            concMax:
              record.concMax !== "" && record.concMax != null
                ? parseFloat(record.concMax)
                : null,
            concActual:
              record.concActual !== "" && record.concActual != null
                ? parseFloat(record.concActual)
                : null,
            time:
              record.time !== "" && record.time != null
                ? parseInt(record.time)
                : null,
            startTime: record.startTime || null,
            endTime: record.endTime || null,
            kode: record.kode || "",
          })),
        };
      }
      // Handle LINE D data
      else if (formData.line === "LINE D") {
        dataToSubmit = {
          ...dataToSubmit,
          flowRateD:
            cipTableData?.flowRates?.flowD !== "" &&
            cipTableData?.flowRates?.flowD != null
              ? parseFloat(cipTableData.flowRates.flowD)
              : null,
          valvePositions:
            cipTableData.valvePositions || { A: false, B: false, C: false },
          kodeOperator:
            cipTableData.kodeOperator || formData.kodeOperator || "",
          kodeTeknisi: cipTableData.kodeTeknisi || formData.kodeTeknisi || "",

          // Steps data
          steps: (cipTableData.steps || []).map((step) => ({
            stepNumber: parseInt(step.stepNumber),
            stepName: step.stepName,
            temperatureSetpointMin:
              step.temperatureSetpointMin !== ""
                ? parseFloat(step.temperatureSetpointMin)
                : null,
            temperatureSetpointMax:
              step.temperatureSetpointMax !== ""
                ? parseFloat(step.temperatureSetpointMax)
                : null,
            temperatureActual:
              step.temperatureActual !== ""
                ? parseFloat(step.temperatureActual)
                : null,
            timeSetpoint:
              step.timeSetpoint !== "" ? parseInt(step.timeSetpoint) : null,
            timeActual:
              step.timeActual !== "" ? parseInt(step.timeActual) : null,
            concentration:
              step.concentration !== "" && step.concentration != null
                ? parseFloat(step.concentration)
                : null,
            concentrationActual:
              step.concentrationActual !== "" &&
              step.concentrationActual != null
                ? parseFloat(step.concentrationActual)
                : null,
            startTime: step.startTime || null,
            endTime: step.endTime || null,
          })),

          // Special records for D (pakai struktur B/C)
          specialRecords: (cipTableData.specialRecords || []).map((record) => ({
            stepType: record.stepType,
            tempMin:
              record.tempMin !== "" && record.tempMin != null
                ? parseFloat(record.tempMin)
                : null,
            tempMax:
              record.tempMax !== "" && record.tempMax != null
                ? parseFloat(record.tempMax)
                : null,
            tempActual:
              record.tempActual !== "" && record.tempActual != null
                ? parseFloat(record.tempActual)
                : null,
            tempBC:
              record.tempBC !== "" && record.tempBC != null
                ? parseFloat(record.tempBC)
                : null,
            tempDMin:
              record.tempDMin !== "" && record.tempDMin != null
                ? parseFloat(record.tempDMin)
                : null,
            tempDMax:
              record.tempDMax !== "" && record.tempDMax != null
                ? parseFloat(record.tempDMax)
                : null,
            concMin:
              record.concMin !== "" && record.concMin != null
                ? parseFloat(record.concMin)
                : null,
            concMax:
              record.concMax !== "" && record.concMax != null
                ? parseFloat(record.concMax)
                : null,
            concActual:
              record.concActual !== "" && record.concActual != null
                ? parseFloat(record.concActual)
                : null,
            time:
              record.time !== "" && record.time != null
                ? parseInt(record.time)
                : null,
            startTime: record.startTime || null,
            endTime: record.endTime || null,
            kode: record.kode || "",
          })),
        };
      }

      console.log("Updating CIP data:", JSON.stringify(dataToSubmit, null, 2));

      const response = await api.put(`/cip-report/${formData.id}`, dataToSubmit);

      if (response.status === 200) {
        // Show warnings if any
        if (response.data?.hasValidationWarnings) {
          showWarningsDialog(response.data.warnings, isDraft);
        }

        const successMessage = isDraft
          ? "CIP Report updated as draft successfully"
          : response.data?.hasValidationWarnings
          ? "CIP Report submitted successfully with some validation warnings. Check the details for recommendations."
          : "CIP Report submitted successfully";

        Alert.alert("Success", successMessage, [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to detail view
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (error) {
      console.error("Error updating CIP report:", error);
      console.error("Error response:", error?.response?.data);

      // More detailed error message
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message ||
        "Failed to update CIP report";

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Updating CIP Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.restrictedContainer}>
          <Icon name="lock" size={64} color={COLORS.gray} />
          <Text style={styles.restrictedTitle}>Edit Restricted</Text>
          <Text style={styles.restrictedText}>
            This report has been submitted and cannot be edited. Contact your
            administrator if changes are needed.
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={COLORS.blue} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit CIP Report</Text>
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isDraft ? "#FF9800" : "#4CAF50",
                  color: "#fff",
                },
              ]}
            >
              {isDraft ? "DRAFT" : "SUBMITTED"}
            </Text>
          </View>
        </View>

        {/* Edit Info Box */}
        {isDraft && (
          <View style={styles.draftInfoBox}>
            <Icon name="edit" size={20} color={COLORS.blue} />
            <Text style={styles.draftInfoText}>
              You are editing a draft. The "Save CIP Report" button will save
              and submit your changes directly.
            </Text>
          </View>
        )}

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          {/* Date Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="date-range" size={20} color={COLORS.blue} />
              <Text style={styles.dateText}>
                {moment(formData.date).format("DD/MM/YYYY")}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.date}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    handleInputChange("date", date);
                  }
                }}
              />
            )}
          </View>

          {/* Process Order */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Process Order</Text>
            <View style={styles.processOrderContainer}>
              <TextInput
                style={[styles.input, styles.processOrderInput]}
                value={formData.processOrder}
                onChangeText={(value) =>
                  handleInputChange("processOrder", value)
                }
                placeholder="PO-MFP-2025-XXXX"
              />
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={generateProcessOrder}
              >
                <Icon name="refresh" size={20} color={COLORS.blue} />
              </TouchableOpacity>
            </View>
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
            <Text style={styles.label}>Line</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.line}
                onValueChange={(value) => handleInputChange("line", value)}
                style={styles.picker}
              >
                <Picker.Item label="Select Line" value="" />
                <Picker.Item label="LINE A" value="LINE A" />
                <Picker.Item label="LINE B" value="LINE B" />
                <Picker.Item label="LINE C" value="LINE C" />
                <Picker.Item label="LINE D" value="LINE D" />
              </Picker>
            </View>
          </View>

          {/* CIP Type - Dropdown */}
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
                  <Picker.Item key={type.id} label={type.name} value={type.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Operator */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Operator</Text>
            <View style={styles.operatorContainer}>
              <TextInput
                style={[styles.input, styles.operatorInput]}
                value={formData.operator}
                onChangeText={(value) => handleInputChange("operator", value)}
                placeholder="Enter operator name"
              />
              {userProfile && (
                <TouchableOpacity
                  style={styles.resetOperatorButton}
                  onPress={() =>
                    handleInputChange(
                      "operator",
                      userProfile.name ||
                        userProfile.fullName ||
                        userProfile.username ||
                        ""
                    )
                  }
                >
                  <Icon name="person" size={20} color={COLORS.blue} />
                </TouchableOpacity>
              )}
            </View>
            {userProfile && (
              <Text style={styles.helperText}>
                Current profile:{" "}
                {userProfile.name ||
                  userProfile.fullName ||
                  userProfile.username}
              </Text>
            )}
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
                {posisiOptions.map((option, index) => (
                  <Picker.Item
                    key={index}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Flow Rate - Only for LINE A */}
          {formData.line === "LINE A" && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Flow Rate (L/hr)</Text>
              <TextInput
                style={styles.input}
                value={String(formData.flowRate ?? "")}
                onChangeText={(value) => handleInputChange("flowRate", value)}
                keyboardType="numeric"
                placeholder="e.g. 1500"
              />
            </View>
          )}

          {/* Info for LINE B/C/D */}
          {(formData.line === "LINE B" ||
            formData.line === "LINE C" ||
            formData.line === "LINE D") && (
            <View style={styles.infoBox}>
              <Icon name="info" size={20} color={COLORS.blue} />
              <Text style={styles.infoText}>
                Flow rates for {formData.line} will be configured in the
                inspection table below.
              </Text>
            </View>
          )}

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

        {/* Status Info Box for Draft */}
        <View style={styles.statusInfoBox}>
          <Icon name="info-outline" size={20} color={COLORS.blue} />
          <Text style={styles.statusInfoText}>
            The "Save CIP Report" button will save and submit your changes
            directly. Data will be saved even if values are outside recommended
            ranges with validation warnings shown for reference.
          </Text>
        </View>

        {/* CIP Inspection Table - Conditional based on Line */}
        {formData.line && (
          <>
            {formData.line === "LINE A" ? (
              <ReportCIPInspectionTable
                cipData={formData}
                onSave={(cipTableData, isDraft) =>
                  handleUpdateCIP(cipTableData, isDraft)
                }
                isEditable={true}
                allowUnrestrictedInput={true}
              />
            ) : (
              <ReportCIPInspectionTableBCD
                cipData={formData}
                selectedLine={formData.line}
                onSave={(cipTableData, isDraft) =>
                  handleUpdateCIP(cipTableData, isDraft)
                }
                isEditable={true}
                allowUnrestrictedInput={true}
              />
            )}
          </>
        )}

        {/* Instruction if no line selected */}
        {!formData.line && (
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
  statusContainer: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  draftInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.blue,
  },
  draftInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#0d47a1",
    flex: 1,
    lineHeight: 20,
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
  processOrderContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  processOrderInput: {
    flex: 1,
    marginRight: 8,
  },
  regenerateButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
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

  // Operator Section Styles
  operatorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  operatorInput: {
    flex: 1,
    marginRight: 8,
  },
  resetOperatorButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  helperText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    fontStyle: "italic",
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightBlue,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.blue,
    flex: 1,
  },
  statusInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    margin: 16,
    borderWidth: 1,
    borderColor: COLORS.blue,
  },
  statusInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#0d47a1",
    flex: 1,
    lineHeight: 20,
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
