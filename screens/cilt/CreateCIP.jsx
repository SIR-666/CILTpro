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

const CreateCIP = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // CIP Types state
  const [cipTypes, setCipTypes] = useState([
    { id: 1, name: "CIP KITCHEN 1", value: "CIP_KITCHEN_1" },
    { id: 2, name: "CIP KITCHEN 2", value: "CIP_KITCHEN_2" },
    { id: 3, name: "CIP KITCHEN 3", value: "CIP_KITCHEN_3" },
  ]);

  // Initial form state
  const getInitialFormState = () => ({
    date: new Date(),
    processOrder: "",
    plant: "Milk Filling Packing",
    line: "",
    cipType: "",
    operator: "",
    posisi: "",
    flowRate: "",
    notes: "",
    kodeOperator: "",
    kodeTeknisi: "",
  });

  // Form data
  const [formData, setFormData] = useState(getInitialFormState());

  // Options
  const [lineOptions, setLineOptions] = useState([]);
  const [posisiOptions, setPosisiOptions] = useState([
    { label: "Final", value: "Final" },
    { label: "Intermediate", value: "Intermediate" },
  ]);

  useEffect(() => {
    fetchInitialData();
    fetchUserProfile();
    fetchCIPTypes();
  }, []);

  // Reset form to initial state
  const resetForm = () => {
    const initialForm = getInitialFormState();
    setFormData(prev => ({
      ...initialForm,
      operator: userProfile ? (userProfile.name || userProfile.fullName || userProfile.username || "") : ""
    }));
    generateProcessOrder();
  };

  const fetchInitialData = async () => {
    try {
      // Generate process order
      generateProcessOrder();
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  // Fixed fetchUserProfile with better error handling
  const fetchUserProfile = async () => {
    try {
      const response = await api.get("/user/profile");
      const userData = response.data;
      setUserProfile(userData);

      // Auto-set operator name from login
      setFormData(prev => ({
        ...prev,
        operator: userData.name || userData.fullName || userData.username || ""
      }));
    } catch (error) {
      // Silent handling - don't log error, allow manual input
      console.log("User profile not available, manual input enabled");
      // User can still input operator name manually
    }
  };

  // Fetch CIP types from backend
  const fetchCIPTypes = async () => {
    try {
      const response = await api.get("/cip-report/types/list");
      if (response.data && response.data.length > 0) {
        setCipTypes(response.data.map(type => ({
          id: type.id,
          name: type.name,
          value: type.value || type.name
        })));
      }
    } catch (error) {
      console.log("Using default CIP types");
      // Keep default CIP types if API fails
    }
  };

  const generateProcessOrder = () => {
    const date = moment().format("YYYY");
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const processOrder = `PO-MFP-${date}-${randomNum}`;
    setFormData(prev => ({ ...prev, processOrder }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    const warningMessages = warnings.map(w => `• ${w.message}`).join('\n\n');
    const title = isDraft ? "Draft Saved with Warnings" : "Submitted with Warnings";
    const message = isDraft
      ? `Your draft has been saved with the following warnings:\n\n${warningMessages}\n\nYou can edit and submit later.`
      : `Your report has been submitted with the following warnings:\n\n${warningMessages}\n\nPlease note these for future reference.`;

    Alert.alert(title, message, [{ text: "OK" }]);
  };

  const validateDraftInfo = () => {
    return !!formData.line;
  };

  const handleSaveCIP = async (cipTableData, isDraft = false) => {
    if (!isDraft) {
      if (!validateBasicInfo()) return;
    } else {
      if (!validateDraftInfo()) {
        Alert.alert("Draft Error", "Minimal pilih Line untuk menyimpan draft.");
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
          flowRate: parseFloat(formData.flowRate) || 0,
          kodeOperator: cipTableData.kodeOperator || formData.kodeOperator || "",
          kodeTeknisi: cipTableData.kodeTeknisi || formData.kodeTeknisi || "",

          // Steps data
          steps: cipTableData.steps.map(step => ({
            stepNumber: parseInt(step.stepNumber),
            stepName: step.stepName,
            temperatureSetpointMin: parseFloat(step.temperatureSetpointMin) || null,
            temperatureSetpointMax: parseFloat(step.temperatureSetpointMax) || null,
            temperatureActual: parseFloat(step.temperatureActual) || null,
            timeSetpoint: parseInt(step.timeSetpoint) || null,
            timeActual: parseInt(step.timeActual) || null,
            concentration: step.concentration ? parseFloat(step.concentration) : null,
            concentrationActual: step.concentrationActual ? parseFloat(step.concentrationActual) : null,
            startTime: step.startTime || null,
            endTime: step.endTime || null,
          })),

          // COP records
          copRecords: cipTableData.copRecords.map(cop => ({
            stepType: cop.stepType,
            time67Min: cop.time67Min ? parseInt(cop.time67Min) : null,
            time45Min: cop.time45Min ? parseInt(cop.time45Min) : null,
            time60Min: cop.time60Min ? parseInt(cop.time60Min) : null,
            startTime: cop.startTime || null,
            endTime: cop.endTime || null,
            tempMin: parseFloat(cop.tempMin) || null,
            tempMax: parseFloat(cop.tempMax) || null,
            tempActual: parseFloat(cop.tempActual) || null,
            kode: cop.kode || "",
          })),
        };
      }
      // Handle LINE B/C data
      else if (formData.line === "LINE B" || formData.line === "LINE C") {
        dataToSubmit = {
          ...dataToSubmit,
          // Only send flowRateBC for LINE B/C
          flowRateBC: cipTableData.flowRates?.flowBC || 0,
          valvePositions: cipTableData.valvePositions || { A: false, B: false, C: false },
          kodeOperator: cipTableData.kodeOperator || formData.kodeOperator || "",
          kodeTeknisi: cipTableData.kodeTeknisi || formData.kodeTeknisi || "",

          // Steps data (same structure as LINE A)
          steps: cipTableData.steps.map(step => ({
            stepNumber: parseInt(step.stepNumber),
            stepName: step.stepName,
            temperatureSetpointMin: parseFloat(step.temperatureSetpointMin) || null,
            temperatureSetpointMax: parseFloat(step.temperatureSetpointMax) || null,
            temperatureActual: parseFloat(step.temperatureActual) || null,
            timeSetpoint: parseInt(step.timeSetpoint) || null,
            timeActual: parseInt(step.timeActual) || null,
            concentration: step.concentration ? parseFloat(step.concentration) : null,
            concentrationActual: step.concentrationActual ? parseFloat(step.concentrationActual) : null,
            startTime: step.startTime || null,
            endTime: step.endTime || null,
          })),

          // Special records for BCD (DRYING, FOAMING, DISINFECT)
          specialRecords: cipTableData.specialRecords.map(record => ({
            stepType: record.stepType,
            tempMin: record.tempMin ? parseFloat(record.tempMin) : null,
            tempMax: record.tempMax ? parseFloat(record.tempMax) : null,
            tempActual: record.tempActual ? parseFloat(record.tempActual) : null,
            tempBC: record.tempBC ? parseFloat(record.tempBC) : null,
            tempDMin: record.tempDMin ? parseFloat(record.tempDMin) : null,
            tempDMax: record.tempDMax ? parseFloat(record.tempDMax) : null,
            concMin: record.concMin ? parseFloat(record.concMin) : null,
            concMax: record.concMax ? parseFloat(record.concMax) : null,
            concActual: record.concActual ? parseFloat(record.concActual) : null,
            time: record.time ? parseInt(record.time) : null,
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
          // Only send flowRateD for LINE D
          flowRateD: cipTableData.flowRates?.flowD || 0,
          valvePositions: cipTableData.valvePositions || { A: false, B: false, C: false },
          kodeOperator: cipTableData.kodeOperator || formData.kodeOperator || "",
          kodeTeknisi: cipTableData.kodeTeknisi || formData.kodeTeknisi || "",

          // Steps data (same structure as LINE A)
          steps: cipTableData.steps.map(step => ({
            stepNumber: parseInt(step.stepNumber),
            stepName: step.stepName,
            temperatureSetpointMin: parseFloat(step.temperatureSetpointMin) || null,
            temperatureSetpointMax: parseFloat(step.temperatureSetpointMax) || null,
            temperatureActual: parseFloat(step.temperatureActual) || null,
            timeSetpoint: parseInt(step.timeSetpoint) || null,
            timeActual: parseInt(step.timeActual) || null,
            concentration: step.concentration ? parseFloat(step.concentration) : null,
            concentrationActual: step.concentrationActual ? parseFloat(step.concentrationActual) : null,
            startTime: step.startTime || null,
            endTime: step.endTime || null,
          })),

          // Special records for BCD (DRYING, FOAMING, DISINFECT)
          specialRecords: cipTableData.specialRecords.map(record => ({
            stepType: record.stepType,
            tempMin: record.tempMin ? parseFloat(record.tempMin) : null,
            tempMax: record.tempMax ? parseFloat(record.tempMax) : null,
            tempActual: record.tempActual ? parseFloat(record.tempActual) : null,
            tempBC: record.tempBC ? parseFloat(record.tempBC) : null,
            tempDMin: record.tempDMin ? parseFloat(record.tempDMin) : null,
            tempDMax: record.tempDMax ? parseFloat(record.tempDMax) : null,
            concMin: record.concMin ? parseFloat(record.concMin) : null,
            concMax: record.concMax ? parseFloat(record.concMax) : null,
            concActual: record.concActual ? parseFloat(record.concActual) : null,
            time: record.time ? parseInt(record.time) : null,
            startTime: record.startTime || null,
            endTime: record.endTime || null,
            kode: record.kode || "",
          })),
        };
      }

      console.log("Submitting CIP data:", JSON.stringify(dataToSubmit, null, 2));

      const response = await api.post("/cip-report", dataToSubmit);

      if (response.status === 201) {
        // Show warnings if any
        if (response.data.hasValidationWarnings) {
          showWarningsDialog(response.data.warnings, isDraft);
        }

        const successMessage = isDraft
          ? "CIP Report saved as draft successfully"
          : response.data.hasValidationWarnings
            ? "CIP Report submitted successfully with some validation warnings. Check the details for recommendations."
            : "CIP Report submitted successfully";

        Alert.alert(
          "Success",
          successMessage,
          [
            {
              text: "Create New Report",
              onPress: () => {
                // Reset form for new input
                resetForm();
              },
            },
            {
              text: "View Reports",
              onPress: () => navigation.navigate("ReportCIP"),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error creating CIP report:", error);
      console.error("Error response:", error.response?.data);

      // More detailed error message
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        "Failed to create CIP report";

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
          <Text style={styles.loadingText}>Processing CIP Report...</Text>
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
          <Text style={styles.title}>Create CIP Report</Text>
          <TouchableOpacity onPress={resetForm} style={styles.resetButton}>
            <Icon name="refresh" size={24} color={COLORS.orange} />
          </TouchableOpacity>
        </View>

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
                onChangeText={(value) => handleInputChange("processOrder", value)}
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

          {/* CIP Type - Now as Dropdown */}
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

          {/* Operator (Auto-populated with manual override) */}
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
                  onPress={() => handleInputChange("operator", userProfile.name || userProfile.fullName || userProfile.username || "")}
                >
                  <Icon name="person" size={20} color={COLORS.blue} />
                </TouchableOpacity>
              )}
            </View>
            {userProfile && (
              <Text style={styles.helperText}>
                Auto-filled from your profile: {userProfile.name || userProfile.fullName || userProfile.username}
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
                value={formData.flowRate}
                onChangeText={(value) => handleInputChange("flowRate", value)}
                keyboardType="numeric"
                placeholder="e.g. 1500"
              />
            </View>
          )}

          {/* Info for LINE B/C/D */}
          {(formData.line === "LINE B" || formData.line === "LINE C" || formData.line === "LINE D") && (
            <View style={styles.infoBox}>
              <Icon name="info" size={20} color={COLORS.blue} />
              <Text style={styles.infoText}>
                Flow rates for {formData.line} will be configured in the inspection table below.
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

        {/* Status Info Box */}
        <View style={styles.statusInfoBox}>
          <Icon name="info-outline" size={20} color={COLORS.blue} />
          <Text style={styles.statusInfoText}>
            The "Save CIP Report" button is smart:
            1) If all fields are complete → it SUBMITS your report.
            2) If some fields are missing → it SAVES as DRAFT (In Progress) so you can finish later.
            Out-of-range values will still be saved with validation warnings for reference.
          </Text>
        </View>

        {/* CIP Inspection Table - Conditional based on Line */}
        {formData.line && (
          <>
            {formData.line === "LINE A" ? (
              <ReportCIPInspectionTable
                cipData={formData}
                onSave={(cipTableData, isDraft) => handleSaveCIP(cipTableData, isDraft)}
                isEditable={true}
                allowUnrestrictedInput={true}
              />
            ) : (
              <ReportCIPInspectionTableBCD
                cipData={formData}
                selectedLine={formData.line}
                onSave={(cipTableData, isDraft) => handleSaveCIP(cipTableData, isDraft)}
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

export default CreateCIP;