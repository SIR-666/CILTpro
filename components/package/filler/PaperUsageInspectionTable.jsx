import { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** ====== GLOBAL JAM BUS (event dengan sumber, index, user, processOrder, product) ====== */
const SHARED_JAM_LISTENERS = "__sharedJamListeners";
function setSharedJamEvent(evt) {
  // evt: { value: "HH:MM", from: "paper"|"h2o2", rowIndex: number, user: string, processOrder?: string, product?: string }
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

const COMPONENT_ID = "paper";

const PaperUsageInspectionTable = ({
  username,
  onDataChange,
  initialData = [],
  processOrder,
  product,
}) => {
  const [cekAlergenKemasan, setCekAlergenKemasan] = useState(false);

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

  const [lastPdPaper, setLastPdPaper] = useState("");
  const [showTimePickerIndex, setShowTimePickerIndex] = useState(null);
  const [showDatePickerIndex, setShowDatePickerIndex] = useState(null);

  // guard anti “ping-pong”
  const applyingExternalRef = useRef(false);

  const formatDate = (date) => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const getStorageKey = () =>
    `paper_usage_${processOrder || "default"}_${product || "no_product"}__${(username || "user").replace(/\s+/g, "_")}`;
  const getFlagKey = () => `${getStorageKey()}_cekAlergen`;

  const propagatePdPaperDownIfJamFilled = (data, fromIndex, value) => {
    const next = [...data];
    for (let i = fromIndex + 1; i < next.length; i++) {
      if (String(next[i].jam || "").trim()) {
        next[i].pdPaper = value;
      }
    }
    return next;
  };

  const loadDataFromStorage = async () => {
    try {
      const storageKey = getStorageKey();
      const storedData = await AsyncStorage.getItem(storageKey);
      const storedFlag = await AsyncStorage.getItem(getFlagKey());
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setTableData(parsedData);
        setCekAlergenKemasan(storedFlag === "true");

        const lastNonEmpty = [...parsedData]
          .reverse()
          .find((r) => r.pdPaper && String(r.pdPaper).trim() !== "");
        setLastPdPaper(lastNonEmpty?.pdPaper || "");

        onDataChange(
          parsedData.map((r) => ({
            ...r,
            cekAlergenKemasan: storedFlag === "true",
          }))
        );
      } else {
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
        setCekAlergenKemasan(false);
        setLastPdPaper("");
        onDataChange(emptyData.map((r) => ({ ...r, cekAlergenKemasan: false })));
      }
    } catch (e) {
      console.error("Error loading paper data:", e);
    }
  };

  const saveDataToStorage = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem(getStorageKey(), JSON.stringify(data));
    } catch (e) {
      console.error("Error saving paper data:", e);
    }
  }, [processOrder, product, username]);

  const saveFlagToStorage = async (flag) => {
    try {
      await AsyncStorage.setItem(getFlagKey(), flag ? "true" : "false");
    } catch (e) {
      console.error("Error saving flag:", e);
    }
  };

  useEffect(() => {
    // util dev opsional
    // @ts-ignore
    window.clearPaperStorage = async () => {
      try {
        await AsyncStorage.removeItem(getStorageKey());
        await AsyncStorage.removeItem(getFlagKey());
      } catch { }
    };
  }, [processOrder, product]);

  useEffect(() => {
    if (processOrder && product) {
      loadDataFromStorage();
    }
  }, [processOrder, product, username]);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setTableData(initialData);
      const flag = !!initialData[0]?.cekAlergenKemasan;
      setCekAlergenKemasan(flag);

      const lastNonEmpty = [...initialData]
        .reverse()
        .find((r) => r.pdPaper && String(r.pdPaper).trim() !== "");
      setLastPdPaper(lastNonEmpty?.pdPaper || "");
    } else {
      loadDataFromStorage();
    }
  }, []);

  useEffect(() => {
    onDataChange(tableData.map((r) => ({ ...r, cekAlergenKemasan })));
  }, [tableData, cekAlergenKemasan]);

  /** ====== LISTEN shared jam (user, PO, product harus sama; bukan event sendiri) ====== */
  useEffect(() => {
    const applyShared = (evt) => {
      if (!evt) return;
      const { value, rowIndex, from, user, processOrder: evtPO, product: evtProd } = evt;
      if (!value || rowIndex == null) return;
      if (from === COMPONENT_ID) return;
      if (user !== username) return;
      if (evtPO !== processOrder) return;
      if (evtProd !== product) return;
      if (applyingExternalRef.current) return;

      if (rowIndex < 0 || rowIndex >= tableData.length) return;

      // Jangan overwrite jika sudah sama/terisi
      if (String(tableData[rowIndex].jam || "").trim() === value) return;

      const now = new Date();
      const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      const updated = [...tableData];

      // isi hanya kalau masih kosong
      if (!String(updated[rowIndex].jam || "").trim()) {
        updated[rowIndex].jam = value;
        updated[rowIndex].user = username;
        updated[rowIndex].time = nowTime;

        // auto isi pdPaper jika kosong
        if (!String(updated[rowIndex].pdPaper || "").trim()) {
          const todayDate = formatDate(now);
          updated[rowIndex].pdPaper = lastPdPaper || todayDate;
        }

        applyingExternalRef.current = true;
        setTableData(updated);
        onDataChange(updated.map((r) => ({ ...r, cekAlergenKemasan })));
        setTimeout(() => (applyingExternalRef.current = false), 0);
      }
    };

    const unsub = subscribeSharedJam(applyShared);
    return unsub;
  }, [tableData, cekAlergenKemasan, lastPdPaper, username, processOrder, product]);

  useEffect(() => {
    return () => {
      try { AsyncStorage.setItem(getStorageKey(), JSON.stringify(tableData)); }
      catch (e) { console.error(e); }
    };
  }, [processOrder, product, username, tableData]);

  const handleInputChange = (text, index, field) => {
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    const todayDate = formatDate(now);

    let updated = [...tableData];
    updated[index][field] = text;
    updated[index].user = username;
    updated[index].time = nowTime;

    // Saat isi Jam → auto isi pdPaper jika kosong + broadcast
    if (field === "jam" && String(text).trim() !== "") {
      if (
        !updated[index].pdPaper ||
        String(updated[index].pdPaper).trim() === ""
      ) {
        updated[index].pdPaper = lastPdPaper || todayDate;
      }
      setSharedJamEvent({
        value: text,
        from: COMPONENT_ID,
        rowIndex: index,
        user: username,
        processOrder,
        product,
      });
    }

    // Saat pilih PD. Paper manual → validasi jam, update lastPdPaper, propagate ke bawah
    if (field === "pdPaper") {
      if (!String(updated[index].jam || "").trim()) {
        setTableData(updated);
        Alert.alert(
          "Isi Jam terlebih dahulu",
          "Silakan isi kolom Jam sebelum memilih PD. Paper."
        );
        return;
      }
      const newLast = text;
      setLastPdPaper(newLast);
      updated = propagatePdPaperDownIfJamFilled(updated, index, newLast);
    }

    // Auto-save bila qtyLabel terisi
    if (field === "qtyLabel") {
      updated[index].saved = String(text).trim() !== "";
      setTimeout(() => saveDataToStorage(updated), 500);
    }

    // Tambah baris baru bila mengisi baris terakhir
    if (
      index === updated.length - 1 &&
      field !== "saved" &&
      String(text).trim() !== "" &&
      updated.length < 100
    ) {
      updated.push({
        id: updated.length + 1,
        jam: "",
        boxNo: "",
        pdPaper: "",
        qtyLabel: "",
        user: "",
        time: "",
        saved: false,
      });
    }

    setTableData(updated);
    onDataChange(updated.map((r) => ({ ...r, cekAlergenKemasan })));
  };

  /** ====== HAPUS ROW ====== */
  const removeRow = (index) => {
    if (showTimePickerIndex === index) setShowTimePickerIndex(null);
    if (showDatePickerIndex === index) setShowDatePickerIndex(null);

    let updated = [...tableData];
    updated.splice(index, 1);
    if (updated.length === 0) {
      updated = [
        { id: 1, jam: "", boxNo: "", pdPaper: "", qtyLabel: "", user: "", time: "", saved: false },
      ];
    }
    updated = updated.map((r, i) => ({ ...r, id: i + 1 }));

    setTableData(updated);
    onDataChange(updated.map((r) => ({ ...r, cekAlergenKemasan })));
    saveDataToStorage(updated);
  };

  const getRowStyle = (item) => {
    if (item.saved && String(item.qtyLabel).trim() !== "") {
      return [styles.row, styles.savedRow];
    }
    return styles.row;
  };

  return (
    <View style={styles.table}>
      {/* === Baris Checkbox Alergen === */}
      <View style={styles.alergenRow}>
        <TouchableOpacity
          onPress={() => {
            const next = !cekAlergenKemasan;
            setCekAlergenKemasan(next);
            saveFlagToStorage(next);
            onDataChange(
              tableData.map((r) => ({ ...r, cekAlergenKemasan: next }))
            );
          }}
          style={[styles.checkbox, cekAlergenKemasan && styles.checkboxChecked]}
        >
          {cekAlergenKemasan && <Text style={styles.checkboxTick}>✓</Text>}
        </TouchableOpacity>
        <Text style={styles.alergenLabel}>CEK LABEL ALERGEN KEMASAN</Text>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>Jam</Text>
        <Text style={styles.headerCell}>Box No.</Text>
        <Text style={styles.headerCell}>PD. Paper</Text>
        <Text style={styles.headerCell}>Qty Label</Text>
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
                  const formatted = `${String(
                    selectedTime.getHours()
                  ).padStart(2, "0")}:${String(
                    selectedTime.getMinutes()
                  ).padStart(2, "0")}`;
                  handleInputChange(formatted, index, "jam");
                  // broadcast (redundan tidak masalah)
                  setSharedJamEvent({
                    value: formatted,
                    from: COMPONENT_ID,
                    rowIndex: index,
                    user: username,
                    processOrder,
                    product,
                  });
                }
              }}
            />
          )}

          {/* Box No */}
          <TextInput
            style={styles.cell}
            value={item.boxNo}
            placeholder="Box No."
            keyboardType="numeric"
            onChangeText={(text) => handleInputChange(text, index, "boxNo")}
          />

          {/* PD. Paper */}
          <TouchableOpacity
            style={styles.cell}
            onPress={() => {
              if (!String(item.jam || "").trim()) {
                Alert.alert(
                  "Isi Jam terlebih dahulu",
                  "Silakan isi kolom Jam sebelum memilih PD. Paper."
                );
                return;
              }
              setShowDatePickerIndex(index);
            }}
          >
            <Text style={{ color: item.pdPaper ? "#000" : "#999" }}>
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

          {/* QTY Label */}
          <TextInput
            style={[
              styles.cell,
              item.saved && String(item.qtyLabel).trim() !== ""
                ? styles.savedCell
                : null,
            ]}
            value={item.qtyLabel}
            placeholder="Qty"
            keyboardType="numeric"
            onChangeText={(text) => handleInputChange(text, index, "qtyLabel")}
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
            Paper Usage - {product || "No Product"} (Data tersimpan otomatis)
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
  alergenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fafafa",
  },
  alergenLabel: { fontWeight: "700" },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#e6ffe6", borderColor: "#22c55e" },
  checkboxTick: { fontSize: 14, fontWeight: "900" },
});

export default PaperUsageInspectionTable;
