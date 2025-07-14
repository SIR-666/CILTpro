import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";

const SegregasiInspectionTable = ({ username, onDataChange, initialData = [] }) => {
  const [tableData, setTableData] = useState(
    Array(3).fill().map((_, index) => ({
      id: index + 1,
      type: "",
      from: "",
      to: "",
      prodType: "",
      magazine: false,
      wastafel: false,
      palletPm: false,
      conveyor: false,
      user: "",
      time: "",
    }))
  );

  const dropdownItems = [
    { label: "Start", value: "Start" },
    { label: "Change Variant", value: "Change Variant" },
  ];

  useEffect(() => {
    if (initialData.length > 0) {
      setTableData(initialData);
      onDataChange(initialData);
    } else {
      const emptyData = Array(3).fill().map((_, index) => ({
        id: index + 1,
        type: "",
        from: "",
        to: "",
        prodType: "",
        magazine: false,
        wastafel: false,
        palletPm: false,
        conveyor: false,
        user: "",
        time: "",
      }));
      setTableData(emptyData);
      onDataChange(emptyData);
    }
  }, [initialData]);

  const handleChange = (value, index, field) => {
    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const updated = [...tableData];
    updated[index][field] = value;
    updated[index].user = username;
    updated[index].time = formattedTime;

    setTableData(updated);
    onDataChange(updated);
  };

  const checkboxFields = [
    { label: "Magazine", key: "magazine" },
    { label: "Wastafel", key: "wastafel" },
    { label: "Pallet PM", key: "palletPm" },
    { label: "Conveyor", key: "conveyor" },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SEGREGASI</Text>
      <View style={styles.rowWrapper}>
        {tableData.map((item, index) => (
          <View key={index} style={styles.box}>
            <Picker
              selectedValue={item.type}
              style={styles.picker}
              onValueChange={(value) => handleChange(value, index, "type")}
            >
              <Picker.Item label="Select Type" value="" />
              {dropdownItems.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>

            <View style={styles.rowInline}>
              <Text style={styles.label}>Prod Type</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="......"
                value={item.from}
                onChangeText={(text) => handleChange(text, index, "from")}
              />
            </View>

            {checkboxFields.map(({ label, key }) => (
              <View key={key} style={styles.rowInline}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity
                  style={[styles.checkbox, item[key] && styles.checked]}
                  onPress={() => handleChange(!item[key], index, key)}
                >
                  <Text>{item[key] ? "✔" : ""}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 16, borderWidth: 1, borderColor: "#ccc" },
  title: { fontWeight: "bold", fontSize: 16, margin: 8, textAlign: "center" },
  rowWrapper: { flexDirection: "row", justifyContent: "space-between" },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    margin: 4,
  },
  rowInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: { fontSize: 12, flex: 1 },
  inputSmall: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 4,
    fontSize: 12,
    backgroundColor: "#fff",
    marginHorizontal: 2,
  },
  checkbox: {
    flex: 2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    padding: 4,
  },
  checked: {
    backgroundColor: "#cce5ff",
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    marginBottom: 6,
  },
});

export default SegregasiInspectionTable;
