import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../../../utils/axiosInstance";

const defaultTemplate = [
  // Cek parameter mesin per jam
  {
    activity: "H2O2 Spray (MCCP 03) Flowrate",
    good: "22 - 26",
    reject: "<22 / >26",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Pressure H2O2 nozzle 1 (mb)",
    good: "1050 - 1350",
    reject: "<1050 / >1350",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Pressure H2O2 nozzle 2 (mb)",
    good: "1050 - 1350",
    reject: "<1050 / >1350",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Pressure H2O2 nozzle 3 (mb)",
    good: "1050 - 1350",
    reject: "<1050 / >1350",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Pressure H2O2 nozzle 4 (mb)",
    good: "1050 - 1350",
    reject: "<1050 / >1350",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Hepa pressure (1-4 mbar)",
    good: "1 - 4",
    reject: "<1 / >4",
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
    activity: "Temp. secondary water (<20C)",
    good: "< 20",
    reject: ">= 20",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Temp. Cooling Water <4C",
    good: "< 4",
    reject: ">= 4",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Pressure Cooling Water (3-4 Bar)",
    good: "3 - 4",
    reject: "<3 / >4",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Temp. bottom seal (C)",
    good: "380 - 390",
    reject: "<380 / >390",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "Temp. top seal (C)",
    good: "280 - 320",
    reject: "<280 / >320",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "cap welding energy (J)",
    good: "90 - 110",
    reject: "<90 / >110",
    periode: "Tiap Jam",
    status: 1,
  },
  {
    activity: "cap welding time (ms)",
    good: "70 - 180",
    reject: "<70 / >180",
    periode: "Tiap Jam",
    status: 1,
  },
  // Cek kondisi mesin per 30 menit
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
    reject: "rembes",
    periode: "30 menit",
    status: 0,
  },
  {
    activity: "Hose Cooling Bottom Pre Folder",
    good: "normal",
    reject: "bocor",
    periode: "30 menit",
    status: 0,
  },
  {
    activity: "Hose Cooling Bottom Seal",
    good: "normal",
    reject: "pecah",
    periode: "30 menit",
    status: 0,
  },
  {
    activity: "Hose Cooling Top Pre Folder",
    good: "normal",
    reject: "lepas",
    periode: "30 menit",
    status: 0,
  },
  {
    activity: "Hose Cooling Top Seal",
    good: "normal",
    reject: "napple",
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
    groupName: "TOTAL"
  },
  {
    activity: "a. Bentuk pack",
    good: "G",
    reject: "R",
    periode: "30 menit",
    status: 0,
    isSubItem: true,
    groupName: "TOTAL"
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
    good: "R",
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

const GnrPerformanceInspectionTable = ({ username, onDataChange, plant, line, machine, type }) => {
  const [inspectionData, setInspectionData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInspection = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/gnr-master?plant=${encodeURIComponent(plant)}&line=${encodeURIComponent(line)}&machine=${encodeURIComponent(machine)}&type=${encodeURIComponent(type)}`
      );

      const fetched = Array.isArray(response.data) ? response.data : [];
      console.log("Fetched data:", fetched); // Debug log

      const merged = defaultTemplate.map((templateItem) => {
        const dbItem = fetched.find((item) => item.activity === templateItem.activity);
        
        return {
          ...templateItem,
          // Use database values if available, otherwise use template defaults
          good: dbItem?.good || templateItem.good || "-",
          reject: dbItem?.reject || templateItem.reject || "-",
          need: dbItem?.need || templateItem.need || "-",
          periode: dbItem?.frekuensi || templateItem.periode,
          status: dbItem?.status !== undefined ? dbItem.status : templateItem.status,
          content: dbItem?.content || "",
          // Initialize user input fields
          results: "",
          done: false,
          user: "",
          time: "",
        };
      });

      setInspectionData(merged);
      onDataChange(merged);
    } catch (error) {
      console.error("Error fetching inspection data:", error);
      // Fallback to template data if API fails
      const fallbackData = defaultTemplate.map(item => ({
        ...item,
        results: "",
        done: false,
        user: "",
        time: "",
        content: "",
        need: item.need || "-"
      }));
      setInspectionData(fallbackData);
      onDataChange(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (plant && line && machine && type) {
      fetchInspection();
    }
  }, [plant, line, machine, type]);

  const parseRange = (rangeStr) => {
    if (!rangeStr || rangeStr === "-") return null;
    
    // Handle single comparison like "< 20", ">= 20", "< 4", ">= 4"
    if (rangeStr.includes("< ") || rangeStr.includes(">= ")) {
      const match = rangeStr.match(/([<>=]+)\s*(\d+)/);
      if (match) {
        const operator = match[1];
        const value = parseFloat(match[2]);
        return { type: "single", operator, value };
      }
    }
    
    // Handle range like "22 - 26", "1050 - 1350"
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
    
    // Handle reject conditions like "<22 / >26", "<1050 / >1350"
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
    
    return null;
  };

  const evaluateValue = (inputValue, goodCriteria, rejectCriteria) => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) return "default";
    
    const goodRange = parseRange(goodCriteria);
    const rejectConditions = parseReject(rejectCriteria);
    
    // Check reject conditions first
    if (rejectConditions) {
      for (const condition of rejectConditions) {
        if (condition.operator === "<" && numValue < condition.value) return "reject";
        if (condition.operator === ">" && numValue > condition.value) return "reject";
        if (condition.operator === ">=" && numValue >= condition.value) return "reject";
      }
    }
    
    // Check good conditions
    if (goodRange) {
      if (goodRange.type === "range") {
        if (numValue >= goodRange.min && numValue <= goodRange.max) return "good";
      } else if (goodRange.type === "single") {
        if (goodRange.operator === "< " && numValue < goodRange.value) return "good";
        if (goodRange.operator === ">= " && numValue >= goodRange.value) return "good";
      }
    }
    
    // If not good and not reject, it's need
    return "need";
  };

  const getBackgroundColor = (item) => {
    if (item.results) {
      if (item.status === 1) {
        // For TextInput - evaluate based on numerical value
        const evaluation = evaluateValue(item.results, item.good, item.reject);
        switch (evaluation) {
          case "good": return "#d4edda"; // Light green
          case "need": return "#fff3cd"; // Light yellow
          case "reject": return "#f8d7da"; // Light red
          default: return "transparent";
        }
      } else {
        // For Picker - evaluate based on selected value
        switch (item.results) {
          case "G": return "#d4edda"; // Light green
          case "N": return "#fff3cd"; // Light yellow
          case "R": return "#f8d7da"; // Light red
          default: return "transparent";
        }
      }
    }
    return "transparent";
  };

  const handleInputChange = (text, index) => {
    const updated = [...inspectionData];
    const now = new Date();
    updated[index].results = text;
    updated[index].user = username;
    updated[index].time = now.toLocaleTimeString("id-ID", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
    updated[index].done = !!text;
    setInspectionData(updated);
    onDataChange(updated);
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading inspection data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.tableCaption, { width: "30%" }]}>Activity</Text>
        <Text style={[styles.tableCaption, { width: "10%" }]}>G</Text>
        <Text style={[styles.tableCaption, { width: "10%" }]}>N</Text>
        <Text style={[styles.tableCaption, { width: "10%" }]}>R</Text>
        <Text style={[styles.tableCaption, { width: "15%" }]}>Periode</Text>
        <Text style={[styles.tableCaption, { width: "25%" }]}>Hasil</Text>
      </View>

      {inspectionData.map((item, index) => (
        <View key={`${item.activity}-${index}`} style={[
          styles.tableBody, 
          { backgroundColor: getBackgroundColor(item) },
          item.isGroupHeader && styles.groupHeader,
          item.isSubItem && styles.subItem
        ]}>
          <View style={{ width: "30%" }}>
            <Text style={[
              styles.tableData,
              item.isGroupHeader && styles.groupHeaderText,
              item.isSubItem && styles.subItemText
            ]}>
              {item.activity}
            </Text>
          </View>
          <View style={{ width: "10%" }}>
            <Text style={styles.tableData}>
              {item.isGroupHeader ? (item.good || "G") : (item.isSubItem ? "" : (item.good || "-"))}
            </Text>
          </View>
          <View style={{ width: "10%" }}>
            <Text style={styles.tableData}>
              {item.isGroupHeader ? (item.need || "N") : (item.isSubItem ? "" : (item.need || "-"))}
            </Text>
          </View>
          <View style={{ width: "10%" }}>
            <Text style={styles.tableData}>
              {item.isGroupHeader ? (item.reject || "R") : (item.isSubItem ? "" : (item.reject || "-"))}
            </Text>
          </View>
          <View style={{ width: "15%" }}>
            <Text style={styles.tableData}>
              {item.isGroupHeader ? "" : item.periode}
            </Text>
          </View>
          <View style={{ width: "25%" }}>
            <View style={styles.centeredContent}>
              {item.isGroupHeader ? (
                <View style={styles.groupHeaderResultsContainer}>
                  <Text style={styles.groupHeaderResults}></Text>
                </View>
              ) : item.status === 1 ? (
                <TextInput
                  placeholder="isi disini"
                  style={styles.tableData}
                  value={item.results}
                  onChangeText={(text) => handleInputChange(text, index)}
                />
              ) : (
                <Picker
                  selectedValue={item.results}
                  onValueChange={(value) => handleInputChange(value, index)}
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
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  table: {
    width: "100%",
    marginTop: 20,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
    padding: 10,
  },
  tableBody: {
    flexDirection: "row",
    padding: 10,
  },
  groupHeader: {
    backgroundColor: "#e8f4f8",
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
  },
  subItem: {
    backgroundColor: "#f8f9fa",
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
  groupHeaderText: {
    fontWeight: "bold",
    color: "#007bff",
    textAlign: "left",
  },
  subItemText: {
    color: "#333",
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
    color: "#666",
    textAlign: "center",
  },
});

export default GnrPerformanceInspectionTable;
