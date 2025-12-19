import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* GLOBAL JAM */
const SHARED_JAM_LISTENERS = "__sharedJamListeners";
function setSharedJamEvent(evt) {
  (globalThis[SHARED_JAM_LISTENERS] || []).forEach((fn) => {
    try { fn(evt); } catch { }
  });
}
function subscribeSharedJam(fn) {
  if (!globalThis[SHARED_JAM_LISTENERS]) globalThis[SHARED_JAM_LISTENERS] = [];
  globalThis[SHARED_JAM_LISTENERS].push(fn);
  return () => {
    const arr = globalThis[SHARED_JAM_LISTENERS];
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  };
}

const COMPONENT_ID = "h2o2";

const H2o2CheckInspectionTable = ({
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
        konsentrasi: "",
        volume: "",
        kode: "",
        user: "",
        time: "",
        saved: false,
      }))
  );

  const [showTimePickerIndex, setShowTimePickerIndex] = useState(null);
  const [lastKode, setLastKode] = useState("");
  
  // Guard anti ping-pong saat menerima event eksternal
  const applyingExternalRef = useRef(false);
  // Ref untuk track storage key terakhir (untuk flush saat ganti)
  const prevStorageKeyRef = useRef("");

  /* STORAGE KEYS */
  const getStorageKey = (po = processOrder, pd = product) =>
    `h2o2_usage_${po || "default"}_${pd || "no_product"}__${(username || "user").replace(/\s+/g, "_")}`;

  /* STORAGE OPERATIONS */
  const loadDataFromStorage = async () => {
    try {
      const storageKey = getStorageKey();
      const storedData = await AsyncStorage.getItem(storageKey);
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setTableData(parsedData);
        
        // Extract last kode yang terisi
        const lastNonEmpty = [...parsedData]
          .reverse()
          .find((r) => r.kode && String(r.kode).trim() !== "");
        setLastKode(lastNonEmpty?.kode || "");
        
        onDataChange(parsedData);
        console.log(`Loaded H2O2 data for key: ${storageKey}`);
      } else {
        // Jika tidak ada data tersimpan, set ke default empty
        const emptyData = Array(20)
          .fill()
          .map((_, index) => ({
            id: index + 1,
            jam: "",
            konsentrasi: "",
            volume: "",
            kode: "",
            user: "",
            time: "",
            saved: false,
          }));
        setTableData(emptyData);
        setLastKode("");
        onDataChange(emptyData);
        console.log(`No stored data found for key: ${storageKey}, using empty data`);
      }
    } catch (error) {
      console.error("Error loading H2O2 data from storage:", error);
    }
  };

  const saveDataToStorage = async (data) => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`H2O2 data saved with key: ${storageKey}`);
    } catch (error) {
      console.error("Error saving H2O2 data to storage:", error);
    }
  };

  const clearStorageData = async () => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.removeItem(storageKey);
      console.log(`H2O2 data cleared for key: ${storageKey}`);
    } catch (error) {
      console.error("Error clearing H2O2 data from storage:", error);
    }
  };

  /* EXPOSE CLEAR FUNCTION */
  useEffect(() => {
    // Expose function untuk dipanggil dari parent setelah submit berhasil
    window.clearH2o2Storage = clearStorageData;
  }, [processOrder, product]);

  /* FLUSH & LOAD SAAT STORAGE KEY BERUBAH */
  useEffect(() => {
    const currentKey = getStorageKey();
    const prevKey = prevStorageKeyRef.current;

    // Jika key berubah (ganti package), flush data lama ke storage lama
    if (prevKey && prevKey !== currentKey) {
      console.log(`Storage key changed from ${prevKey} to ${currentKey}`);
      // Flush snapshot terakhir ke key lama
      AsyncStorage.setItem(prevKey, JSON.stringify(tableData))
        .then(() => console.log(`Flushed data to old key: ${prevKey}`))
        .catch((e) => console.error("Error flushing old data:", e));
    }

    // Update ref
    prevStorageKeyRef.current = currentKey;

    // Load data untuk key yang baru
    if (processOrder && product) {
      loadDataFromStorage();
    }
  }, [processOrder, product, username]); // Trigger saat PO atau product berubah

  /* HANDLE INITIAL DATA DARI PARENT (jika ada) */
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const hasData = initialData.some(r => 
        String(r.jam || r.konsentrasi || r.volume || r.kode || "").trim() !== ""
      );
      
      if (hasData) {
        setTableData(initialData);
        
        // Extract last kode
        const lastNonEmpty = [...initialData]
          .reverse()
          .find((r) => r.kode && String(r.kode).trim() !== "");
        setLastKode(lastNonEmpty?.kode || "");
        
        onDataChange(initialData);
        console.log("Using initialData from parent");
      }
    }
  }, []); // Mount only

  /* ke baris di bawah yang SUDAH isi Jam */
  const propagateKodeDownIfJamFilled = (data, fromIndex, value) => {
    const next = [...data];
    for (let i = fromIndex + 1; i < next.length; i++) {
      if (String(next[i].jam || "").trim()) {
        next[i].kode = value;
        // Mark propagated rows as saved juga
        next[i].saved = String(value).trim() !== "";
      }
    }
    return next;
  };

  /* LISTEN SHARED JAM (user+PO+product sama) */
  useEffect(() => {
    const applyShared = (evt) => {
      if (!evt) return;
      const { value, rowIndex, from, user, processOrder: evtPO, product: evtProd } = evt;
      
      // Filter kondisi
      if (!value || rowIndex == null) return;
      if (from === COMPONENT_ID) return; // Jangan apply event dari diri sendiri
      if (user !== username) return;
      if (evtPO !== processOrder) return;
      if (evtProd !== product) return;
      if (applyingExternalRef.current) return; // Guard ping-pong
      
      // Validasi index
      if (rowIndex < 0 || rowIndex >= tableData.length) return;
      
      // Jangan overwrite jika sudah sama/terisi
      if (String(tableData[rowIndex].jam || "").trim() === value) return;

      const now = new Date();
      const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      let updated = [...tableData];
      
      // Isi hanya kalau masih kosong
      if (!String(updated[rowIndex].jam || "").trim()) {
        updated[rowIndex].jam = value;
        updated[rowIndex].user = username;
        updated[rowIndex].time = formattedTime;
        
        // Auto-fill kode jika kosong dan ada lastKode
        if (!String(updated[rowIndex].kode || "").trim() && lastKode) {
          updated[rowIndex].kode = lastKode;
          // BUG FIX #2: Langsung mark as saved saat auto-fill
          updated[rowIndex].saved = true;
        }

        applyingExternalRef.current = true;
        setTableData(updated);
        onDataChange(updated);
        saveDataToStorage(updated);
        
        setTimeout(() => (applyingExternalRef.current = false), 0);
      }
    };

    const unsub = subscribeSharedJam(applyShared);
    return unsub;
  }, [tableData, lastKode, username, processOrder, product]);

  /* INPUT HANDLER */
  const handleInputChange = (text, index, field) => {
    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    let updated = [...tableData];
    updated[index][field] = text;
    updated[index].user = username;
    updated[index].time = formattedTime;

    // Saat isi Jam → auto-fill kode jika kosong + broadcast event
    if (field === "jam" && String(text).trim() !== "") {
      if (!String(updated[index].kode || "").trim() && lastKode) {
        updated[index].kode = lastKode;
        // Langsung mark saved saat auto-fill
        updated[index].saved = true;
      }
      
      // Broadcast event ke komponen lain
      setSharedJamEvent({
        value: text,
        from: COMPONENT_ID,
        rowIndex: index,
        user: username,
        processOrder,
        product,
      });
    }

    // Saat isi Kode → validasi jam, update lastKode, propagate ke bawah
    if (field === "kode") {
      if (!String(updated[index].jam || "").trim()) {
        setTableData(updated);
        Alert.alert(
          "Isi Jam terlebih dahulu",
          "Silakan isi kolom Jam sebelum mengisi Kode Operator."
        );
        return;
      }
      
      const filled = String(text).trim() !== "";
      updated[index].saved = filled;
      
      if (filled) {
        const newKode = text;
        setLastKode(newKode);
        updated = propagateKodeDownIfJamFilled(updated, index, newKode);
      }
    }

    // Save langsung setiap ada perubahan apapun
    // Tidak peduli field mana yang diisi, selama ada perubahan → langsung save
    setTableData(updated);
    onDataChange(updated);
    saveDataToStorage(updated); // Langsung save tanpa debounce

    // Tambah baris baru jika inputan terakhir diisi
    if (
      index === updated.length - 1 &&
      field !== "saved" &&
      String(text).trim() !== "" &&
      updated.length < 100 // batas maksimal baris
    ) {
      const newRow = {
        id: updated.length + 1,
        jam: "",
        konsentrasi: "",
        volume: "",
        kode: "",
        user: "",
        time: "",
        saved: false,
      };
      updated.push(newRow);
      setTableData(updated);
      onDataChange(updated);
    }
  };

  /* HAPUS ROW */
  const removeRow = (index) => {
    if (showTimePickerIndex === index) setShowTimePickerIndex(null);
    
    let updated = [...tableData];
    updated.splice(index, 1);
    
    if (updated.length === 0) {
      updated = [
        { 
          id: 1, 
          jam: "", 
          konsentrasi: "", 
          volume: "", 
          kode: "", 
          user: "", 
          time: "", 
          saved: false 
        },
      ];
    }
    
    // Re-index
    updated = updated.map((r, i) => ({ ...r, id: i + 1 }));
    
    setTableData(updated);
    onDataChange(updated);
    saveDataToStorage(updated);
  };

  /* ROW STYLE HELPER */
  const getRowStyle = (item) => {
    if (item.saved && String(item.kode).trim() !== "") {
      return [styles.row, styles.savedRow];
    }
    return styles.row;
  };

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>Jam Pengecekan</Text>
        <Text style={styles.headerCell}>Konsentrasi (&gt;35-50%) (MCCP 03)</Text>
        <Text style={styles.headerCell}>Volume</Text>
        <Text style={styles.headerCell}>Kode Operator</Text>
        <Text style={[styles.headerCell, styles.actionsHead]}></Text>
      </View>

      {tableData.map((item, index) => (
        <View key={index} style={getRowStyle(item)}>
          {/* JAM */}
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
                  const formatted = `${String(selectedTime.getHours()).padStart(2, "0")}:${String(
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
            keyboardType="decimal-pad"
            onChangeText={(text) => handleInputChange(text, index, "konsentrasi")}
          />

          {/* VOLUME */}
          <TextInput
            style={styles.cell}
            value={item.volume}
            placeholder="Volume"
            keyboardType="numeric"
            onChangeText={(text) => handleInputChange(text, index, "volume")}
          />

          {/* KODE */}
          <TextInput
            style={[
              styles.cell,
              item.saved && String(item.kode).trim() !== "" ? styles.savedCell : null
            ]}
            value={item.kode}
            placeholder="Kode"
            onChangeText={(text) => handleInputChange(text, index, "kode")}
          />

          {/* HAPUS (X) */}
          <TouchableOpacity 
            style={[styles.cell, styles.actionsCell]} 
            onPress={() => removeRow(index)}
          >
            <Text style={styles.xText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Indikator status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusIndicator}>
          <View style={styles.savedIndicator} />
          <Text style={styles.statusText}>
            H2O2 Check - {product || "No Product"} (Data tersimpan otomatis)
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
    borderColor: "#ccc" 
  },
  headerRow: { 
    flexDirection: "row", 
    backgroundColor: "#eee", 
    padding: 8 
  },
  headerCell: { 
    flex: 1, 
    fontWeight: "bold", 
    textAlign: "center" 
  },
  actionsHead: { 
    maxWidth: 40, 
    flexBasis: 40, 
    flexGrow: 0 
  },
  row: { 
    flexDirection: "row", 
    borderBottomWidth: 1, 
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  savedRow: { 
    backgroundColor: "#f0f8f0" 
  },
  cell: { 
    flex: 1, 
    padding: 8, 
    borderRightWidth: 1, 
    borderColor: "#ccc",
    backgroundColor: "transparent",
    justifyContent: "center",
  },
  actionsCell: {
    maxWidth: 40,
    flexBasis: 40,
    flexGrow: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
  },
  xText: { 
    fontSize: 18, 
    lineHeight: 18, 
    fontWeight: "800" 
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

export default H2o2CheckInspectionTable;
