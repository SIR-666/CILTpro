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

const CreateCIP = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    date: new Date(),
    processOrder: "",
    plant: "Milk Filling Packing",
    line: "",
    cipType: "CIP KITCHEN",
    operator: "",
    posisi: "",
    flowRate: "",
    notes: "",
  });

  // Options
  const [lineOptions, setLineOptions] = useState([]);
  const [posisiOptions, setPosisiOptions] = useState([
    { label: "Final", value: "Final" },
    { label: "Intermediate", value: "Intermediate" },
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch line options for Milk Filling Packing
      const lineResponse = await api.get(`/mastercilt/line?plant=Milk Filling Packing`);
      setLineOptions(lineResponse.data);

      // Generate process order
      generateProcessOrder();
    } catch (error) {
      console.error("Error fetching initial data:", error);
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
    if (!formData.operator) {
      Alert.alert("Validation Error", "Operator is required");
      return false;
    }
    if (!formData.posisi) {
      Alert.alert("Validation Error", "Please select a posisi");
      return false;
    }
    if (!formData.flowRate) {
      Alert.alert("Validation Error", "Flow rate is required");
      return false;
    }
    return true;
  };

  const handleSaveCIP = async (cipTableData) => {
    if (!validateBasicInfo()) {
      return;
    }

    setLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        date: moment(formData.date).format("YYYY-MM-DD"),
        flowRate: parseFloat(formData.flowRate) || 0,
        steps: cipTableData.steps,
        copRecords: cipTableData.copRecords,
      };

      const response = await api.post("/cip-report", dataToSubmit);

      if (response.status === 201) {
        Alert.alert(
          "Success",
          "CIP Report created successfully",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("ReportCIP"),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error creating CIP report:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create CIP report"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Creating CIP Report...</Text>
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
          <View style={{ width: 24 }} />
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

          {/* CIP Type (Fixed to CIP KITCHEN) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>CIP Type</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text style={styles.readOnlyText}>{formData.cipType}</Text>
              <Icon name="lock" size={16} color={COLORS.gray} />
            </View>
          </View>

          {/* Operator (Text Input) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Operator</Text>
            <TextInput
              style={styles.input}
              value={formData.operator}
              onChangeText={(value) => handleInputChange("operator", value)}
              placeholder="Enter operator code"
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

          {/* Flow Rate */}
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
        <ReportCIPInspectionTable
          cipData={null}
          onSave={handleSaveCIP}
          isEditable={true}
        />
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
});

export default CreateCIP;
