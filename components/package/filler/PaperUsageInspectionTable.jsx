import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PaperUsageInspectionTable = ({
  username,
  onDataChange,
  initialData = [],
  processOrder,
  product,
}) => {
  const [tableData, setTableData] = useState(
    Array(20)
      .fill()
      .map((_, index) => ({
        id: index + 1,
        jam: "",
        boxNo: "",
        pdPaper: "",
        qtyLabel: "",
        user: "",
        time: "",
        saved: false,
      }))
  );

  const [showTimePickerIndex, setShowTimePickerIndex] = useState(null);
  const [showDatePickerIndex, setShowDatePickerIndex] = useState(null);

  // Format date as DD/MM/YYYY
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Storage key spesifik untuk paper usage dengan processOrder dan product
  const getStorageKey = () => 
    `paper_usage_${processOrder || 'default'}_${product || 'no_product'}`;

  // Load data from AsyncStorage
  const loadDataFromStorage = async () => {
    try {
      const storageKey = getStorageKey();
      const storedData = await AsyncStorage.getItem(storageKey);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setTableData(parsedData);
        onDataChange(parsedData);
        console.log(`Loaded paper data for key: ${storageKey}`);
      } else {
        // Jika tidak ada data tersimpan, set ke default empty
        const emptyData = Array(20)
          .fill()
          .map((_, index) => ({
            id: index + 1,
            jam: "",
            boxNo: "",
            pdPaper: "",
            qtyLabel: "",
            user: "",
            time: "",
            saved: false,
          }));
        setTableData(emptyData);
        onDataChange(emptyData);
        console.log(`No stored data found for key: ${storageKey}, using empty data`);
      }
    } catch (error) {
      console.error('Error loading paper data from storage:', error);
    }
  };

  // Save data to AsyncStorage
  const saveDataToStorage = async (data) => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`Paper data saved with key: ${storageKey}`);
    } catch (error) {
      console.error('Error saving paper data to storage:', error);
    }
  };

  // Clear data from AsyncStorage (dipanggil setelah submit berhasil)
  const clearStorageData = async () => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.removeItem(storageKey);
      console.log(`Paper data cleared for key: ${storageKey}`);
    } catch (error) {
      console.error('Error clearing paper data from storage:', error);
    }
  };

  // Expose clearStorageData function untuk dipanggil dari parent
  useEffect(() => {
    window.clearPaperStorage = clearStorageData;
  }, [processOrder, product]);

  // Load data ketika processOrder atau product berubah
  useEffect(() => {
    if (processOrder && product) {
      loadDataFromStorage();
    }
  }, [processOrder, product]);

  // Handle initialData dari parent (jika ada)
  useEffect(() => {
    if (initialData.length > 0) {
      setTableData(initialData);
      onDataChange(initialData);
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

    // Jika field yang diubah adalah qtyLabel dan sudah diisi, auto save
    if (field === 'qtyLabel' && text.trim() !== '') {
      updated[index].saved = true;
      
      // Auto save setelah delay singkat untuk memastikan input selesai
      setTimeout(() => {
        saveDataToStorage(updated);
      }, 500);
    } else if (field === 'qtyLabel' && text.trim() === '') {
      // Reset saved status jika qtyLabel dikosongkan
      updated[index].saved = false;
      // Juga save perubahan ini
      setTimeout(() => {
        saveDataToStorage(updated);
      }, 500);
    }

    setTableData(updated);
    onDataChange(updated);
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
        <Text style={styles.headerCell}>Box No.</Text>
        <Text style={styles.headerCell}>PD. Paper</Text>
        <Text style={styles.headerCell}>Qty Label</Text>
      </View>

      {tableData.map((item, index) => (
        <View key={index} style={getRowStyle(item)}>
          {/* JAM: Pakai Time Picker */}
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

          {/* Box No - Text Input */}
          <TextInput
            style={styles.cell}
            value={item.boxNo}
            placeholder="Box No."
            onChangeText={(text) => handleInputChange(text, index, "boxNo")}
          />
          
          {/* PD. Paper dengan Date Picker */}
          <TouchableOpacity
            style={styles.cell}
            onPress={() => setShowDatePickerIndex(index)}
          >
            <Text style={{ color: item.pdPaper ? '#000' : '#999' }}>
              {item.pdPaper ? item.pdPaper : "Pilih Tanggal"}
            </Text>
          </TouchableOpacity>
          {showDatePickerIndex === index && (
            <DateTimePicker
              mode="date"
              value={new Date()}
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePickerIndex(null);
                if (selectedDate) {
                  const formatted = formatDate(selectedDate);
                  handleInputChange(formatted, index, "pdPaper");
                }
              }}
            />
          )}
          
          {/* QTY Label - Numeric Input */}
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
        </View>
      ))}
      
      {/* Indikator status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusIndicator}>
          <View style={styles.savedIndicator} />
          <Text style={styles.statusText}>
            Paper Usage - {product || 'No Product'} (Data tersimpan otomatis)
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
    justifyContent: "center",
  },
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

export default PaperUsageInspectionTable;
