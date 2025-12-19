import { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ScrewCapInspectionTable = ({
  username,
  onDataChange,
  initialData = [],
  processOrder,
  product,
}) => {
  const [tableData, setTableData] = useState(
    Array(10)
      .fill()
      .map((_, index) => ({
        id: index + 1,
        jam: "",
        ofNo: "",
        boxNo: "",
        qtyLabel: "",
        user: "",
        time: "",
        saved: false,
      }))
  );

  const [showTimePickerIndex, setShowTimePickerIndex] = useState(null);

  // Storage key spesifik untuk screw cap usage dengan processOrder, product, dan username
  const getStorageKey = () =>
    `screwcap_usage_${processOrder || "default"}_${product || "no_product"}__${(username || "user").replace(/\s+/g, "_")}`;

  // Load data from AsyncStorage
  useEffect(() => {
    if (!processOrder || !product) return;
    (async () => {
      const stored = await AsyncStorage.getItem(getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        setTableData(parsed);
      } else if (initialData.length) {
        setTableData(initialData);
      }
    })();
  }, [processOrder, product, username]);

  // Save data to AsyncStorage
  const saveDataToStorage = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem(getStorageKey(), JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  }, [processOrder, product, username]);

  // Clear data from AsyncStorage (dipanggil setelah submit berhasil)
  const clearStorageData = async () => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.removeItem(storageKey);
      console.log(`Screw cap data cleared for key: ${storageKey}`);
    } catch (error) {
      console.error('Error clearing screw cap data from storage:', error);
    }
  };

  // Expose clearStorageData function untuk dipanggil dari parent
  useEffect(() => {
    window.clearScrewCapStorage = clearStorageData;
  }, [processOrder, product]);

  // flush on unmount
  useEffect(() => {
    return () => {
      try {
        AsyncStorage.setItem(getStorageKey(), JSON.stringify(tableData));
      } catch (e) {
        console.error(e);
      }
    };
  }, [processOrder, product, username, tableData]);

  const handleInputChange = (text, index, field) => {
    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    let updated = [...tableData];
    updated[index][field] = text;
    updated[index].user = username;
    updated[index].time = formattedTime;

    // Jika field yang diubah adalah qtyLabel dan sudah diisi, auto save
    if (field === 'qtyLabel' && text.trim() !== '') {
      updated[index].saved = true;
      setTimeout(() => {
        saveDataToStorage(updated);
      }, 500);
    } else if (field === 'qtyLabel' && text.trim() === '') {
      updated[index].saved = false;
      setTimeout(() => {
        saveDataToStorage(updated);
      }, 500);
    }

    // Tambah baris baru jika inputan terakhir diisi
    if (
      index === updated.length - 1 &&
      field !== 'saved' &&
      text.trim() !== '' &&
      updated.length < 100 // batas maksimal baris
    ) {
      updated.push({
        id: updated.length + 1,
        jam: "",
        ofNo: "",
        boxNo: "",
        qtyLabel: "",
        user: "",
        time: "",
        saved: false,
      });
    }

    setTableData(updated);
    onDataChange(updated);
  };

  /* HAPUS ROW */
  const removeRow = (index) => {
    if (showTimePickerIndex === index) setShowTimePickerIndex(null);

    let updated = [...tableData];
    updated.splice(index, 1);

    if (updated.length === 0) {
      updated = [
        { id: 1, jam: "", ofNo: "", boxNo: "", qtyLabel: "", user: "", time: "", saved: false },
      ];
    }
    updated = updated.map((r, i) => ({ ...r, id: i + 1 }));

    setTableData(updated);
    onDataChange(updated);
    saveDataToStorage(updated);
  };

  // Function untuk mendapatkan style row berdasarkan status saved
  const getRowStyle = (item) => {
    if (item.saved && item.qtyLabel.trim() !== '') {
      return [styles.row, styles.savedRow];
    }
    return styles.row;
  };

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>Jam</Text>
        <Text style={styles.headerCell}>Of No.</Text>
        <Text style={styles.headerCell}>Box No.</Text>
        <Text style={styles.headerCell}>Qty Label</Text>
        <Text style={[styles.headerCell, styles.actionsHead]}></Text>
      </View>

      {tableData.map((item, index) => (
        <View key={index} style={getRowStyle(item)}>
          {/* Jam dengan Time Picker */}
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

          {/* Kolom lainnya */}
          <TextInput
            style={styles.cell}
            value={item.ofNo}
            placeholder="Of No."
            keyboardType="numeric"
            onChangeText={(text) => handleInputChange(text, index, "ofNo")}
          />
          <TextInput
            style={styles.cell}
            value={item.boxNo}
            placeholder="Box No."
            keyboardType="numeric"
            onChangeText={(text) => handleInputChange(text, index, "boxNo")}
          />
          <TextInput
            style={[
              styles.cell,
              item.saved && item.qtyLabel.trim() !== '' ? styles.savedCell : null
            ]}
            value={item.qtyLabel}
            placeholder="Qty"
            keyboardType="numeric"
            onChangeText={(text) =>
              handleInputChange(text, index, "qtyLabel")
            }
          />

          {/* HAPUS (X) */}
          <TouchableOpacity style={[styles.cell, styles.actionsCell]} onPress={() => removeRow(index)}>
            <Text style={styles.xText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Indikator status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusIndicator}>
          <View style={styles.savedIndicator} />
          <Text style={styles.statusText}>
            Screw Cap - {product || 'No Product'} (Data tersimpan otomatis)
          </Text>
        </View>
      </View>
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
  actionsHead: { maxWidth: 40, flexBasis: 40, flexGrow: 0 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  savedRow: {
    backgroundColor: "#f0f8f0",
  },
  cell: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "transparent",
  },
  actionsCell: {
    maxWidth: 40,
    flexBasis: 40,
    flexGrow: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
  },
  xText: { fontSize: 18, lineHeight: 18, fontWeight: "800" },
  savedCell: {
    backgroundColor: "#e8f5e8",
    borderColor: "#4CAF50",
    borderWidth: 1,
  },
  statusContainer: {
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  savedIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
});

export default ScrewCapInspectionTable;
