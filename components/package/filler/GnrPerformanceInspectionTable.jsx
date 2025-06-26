import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../../../utils/axiosInstance";

const GnrPerformanceInspectionTable = ({
  username,
  onDataChange,
  plant,
  line,
  machine,
  type,
}) => {
  const [inspectionData, setInspectionData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInspection = async (plant, line, machine, type) => {
    setIsLoading(true);
    setInspectionData([]);

    try {
      const response = await api.get(
        `/gnr-master?plant=${plant}&line=${line}&machine=${machine}&type=${type}`
      );

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid response format");
      }

      const formattedData = response.data.map((item) => ({
        activity: item.activity,
        good: item.good,
        need: item.need,
        reject: item.reject,
        status: item.status,
        periode: item.frekuensi,
        results: "",
        done: false,
        content: item.content,
        user: "",
        time: "",
      }));

      setInspectionData(formattedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (plant && line && machine && type) {
      fetchInspection(plant, line, machine, type);
    }
  }, [plant, line, machine, type]);

  const handleInputChange = (text, index) => {
    const updated = [...inspectionData];
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    updated[index].results = text;
    updated[index].user = username;
    updated[index].time = formattedTime;
    updated[index].done = !!text;

    setInspectionData(updated);
    onDataChange(updated);
  };

  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.tableCaption, { width: "20%" }]}>Activity</Text>
        <Text style={[styles.tableCaption, { width: "10%" }]}>G</Text>
        <Text style={[styles.tableCaption, { width: "10%" }]}>N</Text>
        <Text style={[styles.tableCaption, { width: "10%" }]}>R</Text>
        <Text style={[styles.tableCaption, { width: "20%" }]}>Periode</Text>
        <Text style={[styles.tableCaption, { width: "20%" }]}>Hasil</Text>
      </View>

      {inspectionData.map((item, index) => (
        <View key={index} style={styles.tableBody}>
          <View style={{ width: "20%" }}>
            <Text style={styles.tableData}>{item.activity}</Text>
          </View>
          <View style={{ width: "10%" }}>
            <Text style={styles.tableData}>{item.good ?? "-"}</Text>
          </View>
          <View style={{ width: "10%" }}>
            <Text style={styles.tableData}>{item.need ?? "-"}</Text>
          </View>
          <View style={{ width: "10%" }}>
            <Text style={styles.tableData}>{item.reject ?? "-"}</Text>
          </View>
          <View style={{ width: "20%" }}>
            <Text style={styles.tableData}>{item.periode}</Text>
          </View>
          <View style={{ width: "20%" }}>
            <View style={[styles.tableData, styles.centeredContent]}>
              {item.status === 1 ? (
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
                  <Picker.Item label="OK" value="OK" />
                  <Picker.Item label="NOT OK" value="NOT OK" />
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
  tableCaption: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableData: {
    fontSize: 14,
    textAlign: "center",
  },
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  picker: {
    width: "100%",
    height: 40,
  },
});

export default GnrPerformanceInspectionTable;
