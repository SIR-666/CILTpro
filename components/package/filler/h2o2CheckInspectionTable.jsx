import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const H2o2CheckInspectionTable = ({
  username,
  onDataChange,
  initialData = [],
}) => {
  const [tableData, setTableData] = useState(
    Array(3)
      .fill()
      .map((_, index) => ({
        id: index + 1,
        jam: "",
        konsentrasi: "",
        volume: "",
        kode: "",
        user: "",
        time: "",
      }))
  );

  const [showTimePickerIndex, setShowTimePickerIndex] = useState(null);

  useEffect(() => {
    if (initialData.length > 0) {
      setTableData(initialData);
      onDataChange(initialData);
    } else {
      const emptyData = Array(3)
        .fill()
        .map((_, index) => ({
          id: index + 1,
          jam: "",
          konsentrasi: "",
          volume: "",
          kode: "",
          user: "",
          time: "",
        }));
      setTableData(emptyData);
      onDataChange(emptyData);
    }
  }, [initialData]);

  const handleInputChange = (text, index, field) => {
    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const updated = [...tableData];
    updated[index][field] = text;
    updated[index].user = username;
    updated[index].time = formattedTime;

    setTableData(updated);
    onDataChange(updated);
  };

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>Jam Pengecekan</Text>
        <Text style={styles.headerCell}>
          Konsentrasi (&gt;35-50%) (MCCP 03)
        </Text>
        <Text style={styles.headerCell}>Volume</Text>
        <Text style={styles.headerCell}>Kode Operator</Text>
      </View>

      <FlatList
        data={tableData}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            {/* JAM: Time Picker */}
            <TouchableOpacity
              style={styles.cell}
              onPress={() => setShowTimePickerIndex(index)}
            >
              <Text>{item.jam ? item.jam : "Pilih Jam"}</Text>
            </TouchableOpacity>
            {showTimePickerIndex === index && (
              <DateTimePicker
                mode="time"
                value={new Date()}
                is24Hour={true}
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePickerIndex(null);
                  if (selectedTime) {
                    const formatted = `${String(
                      selectedTime.getHours()
                    ).padStart(2, "0")}:${String(
                      selectedTime.getMinutes()
                    ).padStart(2, "0")}`;
                    handleInputChange(formatted, index, "jam");
                  }
                }}
              />
            )}

            {/* KONSENTRASI */}
            <TextInput
              style={styles.cell}
              value={item.konsentrasi}
              placeholder="Konsentrasi"
              onChangeText={(text) =>
                handleInputChange(text, index, "konsentrasi")
              }
            />

            {/* VOLUME */}
            <TextInput
              style={styles.cell}
              value={item.volume}
              placeholder="Volume"
              onChangeText={(text) => handleInputChange(text, index, "volume")}
            />

            {/* KODE */}
            <TextInput
              style={styles.cell}
              value={item.kode}
              placeholder="Kode"
              onChangeText={(text) => handleInputChange(text, index, "kode")}
            />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  table: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#eee",
    padding: 8,
  },
  headerCell: {
    flex: 1,
    fontWeight: "bold",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  cell: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#ccc",
  },
});

export default H2o2CheckInspectionTable;
