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
import { useFocusEffect } from "@react-navigation/native";
import moment from "moment";
import { COLORS } from "../../constants/theme";
import { api } from "../../utils/axiosInstance";
import ReportCIPInspectionTable from "../../components/package/filler/ReportCIPInspectionTable";

const CreateCIP = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [shouldClearTableData, setShouldClearTableData] = useState(false);
  const hasLoadedServerDraft = useRef(false);

  // Refs
  const tableRef = useRef(null);

  // CIP Types state
  const [cipTypes, setCipTypes] = useState([
    { id: 1, name: "CIP KITCHEN 1", value: "CIP KITCHEN 1" },
    { id: 2, name: "CIP KITCHEN 2", value: "CIP KITCHEN 2" },
    { id: 3, name: "CIP KITCHEN 3", value: "CIP KITCHEN 3" },
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
    notes: "",
  });

  // Form data
  const [formData, setFormData] = useState(getInitialFormState());

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

  // FETCH FUNCTIONS
  const fetchUserProfile = async () => {
    try {
      const response = await api.get("/user/profile");
      const userData = response.data;
      setUserProfile(userData);

      // Auto-set operator name from login
      setFormData((prev) => ({
        ...prev,
        operator: userData.name || userData.fullName || userData.username || "",
      }));
    } catch (error) {
      console.log("User profile not available, manual input enabled");
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
    const year = moment().format("YYYY");
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    setFormData((prev) => ({
      ...prev,
      processOrder: `PO-MFP-${year}-${randomNum}`,
    }));
  };

  // Server draft functions with PROPER FLOW RATE HANDLING
  const fetchServerDraft = async (processOrder, line) => {
    if (!processOrder || !line) return;
    try {
      const res = await api.get("/cip-report/draft", {
        params: { processOrder, line },
      });
      if (res.data?.data) {
        hasLoadedServerDraft.current = true;

        const draftData = res.data.data;
        const mappedData = {
          ...draftData,
          date: draftData.date ? new Date(draftData.date) : new Date(),
          flowRate: "",
        };

        // Map flowRate properly for ReportCIPInspectionTable
        // The table component expects a SINGLE flowRate field regardless of line
        if (line === 'LINE A') {
          mappedData.flowRate = draftData.flowRate ?? "";
        } else if (['LINE B', 'LINE C'].includes(line)) {
          mappedData.flowRate = draftData.flowRates?.flowBC ?? draftData.flowRateBC ?? "";
        } else if (line === 'LINE D') {
          mappedData.flowRate = draftData.flowRates?.flowD ?? draftData.flowRateD ?? "";
        }

        console.log("[CreateCIP] Loaded draft with flowRate:", mappedData.flowRate, "for line:", line);
        setFormData((prev) => ({ ...prev, ...mappedData }));
      } else {
        hasLoadedServerDraft.current = true;
      }
    } catch (e) {
      hasLoadedServerDraft.current = true;
      console.log("No server draft found");
    }
  };

  // Save server draft with proper structure
  const saveServerDraft = async (payload) => {
    if (!payload.processOrder || !payload.line) return;

    const draftPayload = { ...payload };
    const isBCDLine = ['LINE B', 'LINE C', 'LINE D'].includes(payload.line);

    // Always store flowRate in BOTH formats for persistence
    if (payload.flowRate !== undefined && payload.flowRate !== null && payload.flowRate !== "") {
      // LINE A: store in flowRate field
      if (payload.line === 'LINE A') {
        draftPayload.flowRate = payload.flowRate;
      }

      // LINE B/C/D: store in BOTH flowRate AND flowRates for proper persistence
      if (isBCDLine) {
        if (!draftPayload.flowRates) draftPayload.flowRates = {};

        if (payload.line === 'LINE D') {
          draftPayload.flowRates.flowD = payload.flowRate;
          draftPayload.flowRateD = payload.flowRate; // Also store in direct field
        } else {
          draftPayload.flowRates.flowBC = payload.flowRate;
          draftPayload.flowRateBC = payload.flowRate; // Also store in direct field
        }
      }
    }

    console.log("[CreateCIP] Saving draft:", {
      line: payload.line,
      flowRate: payload.flowRate,
      flowRates: draftPayload.flowRates,
      flowRateBC: draftPayload.flowRateBC,
      flowRateD: draftPayload.flowRateD
    });

    await api.post("/cip-report/draft", {
      processOrder: payload.processOrder,
      line: payload.line,
      posisi: payload.posisi,
      plant: payload.plant,
      payload: draftPayload,
    });
  };

  // AUTO-SAVE EFFECT ke server draft
  useEffect(() => {
    if (!formData.processOrder || !formData.line) return;
    if (!hasLoadedServerDraft.current) return;

    const timer = setTimeout(() => {
      saveServerDraft(formData);
    }, 800);

    return () => clearTimeout(timer);
  }, [formData]);

  // INITIAL LOAD
  useEffect(() => {
    const init = async () => {
      await fetchUserProfile();
      await fetchCIPTypes();
      generateProcessOrder();
    };
    init();
  }, []);

  // LOAD SERVER DRAFT saat PO+Line ada
  useEffect(() => {
    if (formData.processOrder && formData.line) {
      fetchServerDraft(formData.processOrder, formData.line);
    }
  }, [formData.processOrder, formData.line]);

  // FOCUS EFFECT
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        return false;
      };
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [])
  );

  // HANDLERS
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    Alert.alert(
      "Reset Form",
      "Are you sure you want to clear all data and start fresh?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            if (formData.processOrder && formData.line) {
              await api.delete("/cip-report/draft", {
                params: {
                  processOrder: formData.processOrder,
                  line: formData.line,
                },
              });
            }
            const initialForm = getInitialFormState();
            setFormData({
              ...initialForm,
              operator: userProfile ? userProfile.name || userProfile.fullName || userProfile.username || "" : "",
            });
            generateProcessOrder();
            setShouldClearTableData(true);
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

  // SAVE HANDLER with PROPER FLOW RATE MAPPING
  const handleSaveCIP = async (cipTableData, isDraft = false) => {
    if (!validateBasicInfo()) return;
    if (!isDraft && !validateForSubmit()) return;

    setLoading(true);
    try {
      const isBCDLine = ["LINE B", "LINE C", "LINE D"].includes(formData.line);

      // Get flowRate value from table data
      const flowRateActual = cipTableData.flowRate?.flowRateActual ?? null;

      console.log("[CreateCIP] Submitting with:", {
        line: formData.line,
        flowRateActual,
        isDraft
      });

      let dataToSubmit = {
        date: moment(formData.date).format("YYYY-MM-DD"),
        processOrder: formData.processOrder || `PO-MFP-${moment().format("YYYY")}-${Math.floor(Math.random() * 9000) + 1000}`,
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

      // Handle LINE A specific data (COP/SOP/SIP)
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

      console.log("Submitting CIP data:", JSON.stringify(dataToSubmit, null, 2));

      const response = await api.post("/cip-report", dataToSubmit);

      if (response.data.success || response.data.data) {
        // Clear server draft after successful save
        await api.delete("/cip-report/draft", {
          params: {
            processOrder: formData.processOrder,
            line: formData.line,
          },
        });

        Alert.alert(
          "Success",
          isDraft ? "CIP report saved as draft" : "CIP report submitted successfully",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Error", response.data.message || "Failed to save CIP report");
      }
    } catch (error) {
      console.error("Error saving CIP report:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save CIP report. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // RENDER
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={styles.loadingText}>Saving CIP Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            <View style={styles.processOrderContainer}>
              <TextInput
                style={[styles.input, styles.processOrderInput]}
                value={formData.processOrder}
                onChangeText={(value) => handleInputChange("processOrder", value)}
                placeholder="PO-MFP-YYYY-XXXX"
              />
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={generateProcessOrder}
              >
                <Icon name="autorenew" size={20} color={COLORS.blue} />
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
            <Text style={styles.helperText}>Auto-filled from login, editable if needed</Text>
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

        {/* Status Info Box */}
        <View style={styles.statusInfoBox}>
          <Icon name="info-outline" size={20} color={COLORS.blue} />
          <Text style={styles.statusInfoText}>
            The "Save CIP Report" button is smart:{"\n"}
            1) If all fields are complete → it SUBMITS your report.{"\n"}
            2) If some fields are missing → it SAVES as DRAFT so you can finish later.{"\n"}
            Data is auto-saved when you navigate away. All values are accepted without restrictions.
          </Text>
        </View>

        {/* CIP Inspection Table */}
        {formData.line ? (
          <ReportCIPInspectionTable
            ref={tableRef}
            cipData={formData}
            selectedLine={formData.line}
            username={userProfile?.username}
            posisi={formData.posisi || "Final"}
            mode="create"
            onSave={(cipTableData, isDraft) => handleSaveCIP(cipTableData, isDraft)}
            isEditable={true}
            shouldClearData={shouldClearTableData}
            allowUnrestrictedInput={true}
            reportId={formData.processOrder}
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
  helperText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    fontStyle: "italic",
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