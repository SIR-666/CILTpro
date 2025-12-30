import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
} from "react-native";
import moment from "moment-timezone";
import ReportHeader from "../../../components/ReportHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// TIME PICKER MODAL COMPONENT (MEMOIZED)
const TimePickerModal = memo(({ visible, onClose, onSelect, initialValue }) => {
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");

  useEffect(() => {
    if (visible && initialValue) {
      const parts = initialValue.split(":");
      if (parts.length === 2) {
        setHour(parts[0].padStart(2, "0"));
        setMinute(parts[1].padStart(2, "0"));
      }
    }
  }, [visible, initialValue]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")), []);

  const handleConfirm = useCallback(() => {
    onSelect(`${hour}:${minute}`);
    onClose();
  }, [hour, minute, onSelect, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.timePickerContainer} onStartShouldSetResponder={() => true}>
          <Text style={styles.timePickerTitle}>Pilih Jam</Text>
          <View style={styles.timePickerRow}>
            <View style={styles.timePickerColumn}>
              <Text style={styles.timePickerLabel}>Jam</Text>
              <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                {hours.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.timeOption, hour === h && styles.timeOptionSelected]}
                    onPress={() => setHour(h)}
                  >
                    <Text style={[styles.timeOptionText, hour === h && styles.timeOptionTextSelected]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timePickerColumn}>
              <Text style={styles.timePickerLabel}>Menit</Text>
              <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                {minutes.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.timeOption, minute === m && styles.timeOptionSelected]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[styles.timeOptionText, minute === m && styles.timeOptionTextSelected]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={styles.timePickerButtons}>
            <TouchableOpacity style={styles.timePickerCancelBtn} onPress={onClose}>
              <Text style={styles.timePickerCancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timePickerConfirmBtn} onPress={handleConfirm}>
              <Text style={styles.timePickerConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

// SECTION COMPONENT (MEMOIZED)
const Section = memo(({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  }, []);

  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity onPress={toggle} style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
        <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
});

// HOSE CELL COMPONENT (MEMOIZED)
const HoseCell = memo(({ rowIdx, colIdx, cell, updateHose }) => {
  const handleHoseChange = useCallback((v) => updateHose(rowIdx, colIdx, "hose", v), [rowIdx, colIdx, updateHose]);
  const handleNozzleChange = useCallback((v) => updateHose(rowIdx, colIdx, "nozzle", v), [rowIdx, colIdx, updateHose]);

  return (
    <View style={styles.timeCol}>
      <TextInput
        style={styles.smallInput}
        placeholder="T"
        placeholderTextColor="#999"
        value={cell.hose}
        onChangeText={handleHoseChange}
        keyboardType="numeric"
        maxLength={4}
      />
      <TextInput
        style={styles.smallInput}
        placeholder="N"
        placeholderTextColor="#999"
        value={cell.nozzle}
        onChangeText={handleNozzleChange}
        keyboardType="numeric"
        maxLength={4}
      />
    </View>
  );
});

// HEADER TN CELL (MEMOIZED)
const HeaderTNCell = memo(({ index, tn, updateHeaderTN }) => {
  const handleTChange = useCallback((v) => updateHeaderTN(index, "T", v), [index, updateHeaderTN]);
  const handleNChange = useCallback((v) => updateHeaderTN(index, "N", v), [index, updateHeaderTN]);

  return (
    <View style={styles.timeColHeader}>
      <View style={styles.smallHeaderBox}>
        <TextInput
          style={styles.smallHeaderInput}
          value={tn.T}
          placeholder="T"
          placeholderTextColor="#999"
          onChangeText={handleTChange}
          keyboardType="numeric"
          maxLength={4}
        />
      </View>
      <View style={styles.smallHeaderBox}>
        <TextInput
          style={styles.smallHeaderInput}
          value={tn.N}
          placeholder="N"
          placeholderTextColor="#999"
          onChangeText={handleNChange}
          keyboardType="numeric"
          maxLength={4}
        />
      </View>
    </View>
  );
});

// GLUE ROW (MEMOIZED)
const GlueRow = memo(({ row, index, updateGlue, onOpenTimePicker }) => {
  const handleQtyChange = useCallback((v) => updateGlue(index, "qty", v), [index, updateGlue]);
  const handleTimePress = useCallback(() => onOpenTimePicker(index, row.jam), [index, row.jam, onOpenTimePicker]);

  return (
    <View style={styles.dataRow}>
      <Text style={[styles.dataCell, { width: 40 }]}>{row.no}</Text>
      <TouchableOpacity style={styles.timeInputBox} onPress={handleTimePress}>
        <Text style={[styles.timeText, !row.jam && styles.placeholderText]}>{row.jam || "HH:MM"}</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.qtyInput}
        value={row.qty}
        keyboardType="numeric"
        onChangeText={handleQtyChange}
        placeholder="1.0"
        placeholderTextColor="#999"
        maxLength={6}
      />
    </View>
  );
});

// NC ROW (MEMOIZED)
const NCRow = memo(({ row, index, updateNC }) => {
  const handlers = useMemo(() => ({
    stop: (v) => updateNC(index, "stop", v),
    start: (v) => updateNC(index, "start", v),
    durasi: (v) => updateNC(index, "durasi", v),
    masalah: (v) => updateNC(index, "masalah", v),
    corrective: (v) => updateNC(index, "corrective", v),
    pic: (v) => updateNC(index, "pic", v),
    lossPack: (v) => updateNC(index, "lossPack", v),
    lossKarton: (v) => updateNC(index, "lossKarton", v),
  }), [index, updateNC]);

  return (
    <View style={styles.dataRow}>
      <TextInput style={[styles.dataInput, { width: 70 }]} keyboardType="numeric" value={row.stop} onChangeText={handlers.stop} placeholder="00:00" placeholderTextColor="#999" />
      <TextInput style={[styles.dataInput, { width: 70 }]} keyboardType="numeric" value={row.start} onChangeText={handlers.start} placeholder="00:00" placeholderTextColor="#999" />
      <TextInput style={[styles.dataInput, { width: 70 }]} keyboardType="numeric" value={row.durasi} onChangeText={handlers.durasi} placeholder="0" placeholderTextColor="#999" />
      <TextInput style={[styles.dataInput, { width: 200 }]} value={row.masalah} onChangeText={handlers.masalah} placeholder="Masalah" placeholderTextColor="#999" />
      <TextInput style={[styles.dataInput, { width: 200 }]} value={row.corrective} onChangeText={handlers.corrective} placeholder="Tindakan" placeholderTextColor="#999" />
      <TextInput style={[styles.dataInput, { width: 80 }]} value={row.pic} onChangeText={handlers.pic} placeholder="PIC" placeholderTextColor="#999" />
      <TextInput style={[styles.dataInput, { width: 80 }]} keyboardType="numeric" value={row.lossPack} onChangeText={handlers.lossPack} placeholder="0" placeholderTextColor="#999" />
      <TextInput style={[styles.dataInput, { width: 90 }]} keyboardType="numeric" value={row.lossKarton} onChangeText={handlers.lossKarton} placeholder="0" placeholderTextColor="#999" />
    </View>
  );
});

// FIELD COMPONENT (MEMOIZED)
const Field = memo(({ label, val, onChange, keyboardType = "default" }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput style={styles.fieldInput} value={val} onChangeText={onChange} keyboardType={keyboardType} placeholderTextColor="#999" />
  </View>
));

// MAIN COMPONENT
const FransCasePackerInspectionTable = ({
  username,
  onDataChange,
  initialData = [],
  shouldClearData = false,
}) => {
  const isInit = useRef(true);
  const saveTimer = useRef(null);
  const STORAGE_KEY = `frans_casepacker_${(username || "user").replace(/\s+/g, "_")}`;
  const lastClearState = useRef(shouldClearData);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerIndex, setTimePickerIndex] = useState(null);
  const [timePickerValue, setTimePickerValue] = useState("");

  const [formData, setFormData] = useState({
    namaProduk: "", rasa: "", lineMc: "", airSupply: "",
    hoursStop: "", hoursStart: "", kodeProduksi: "", kodeKadaluwarsa: "",
    startProduksi: "", stopProduksi: "", tempHeader: "", tankHeader: "",
  });

  const [hoseTable, setHoseTable] = useState(
    Array(4).fill(null).map(() => Array(12).fill(null).map(() => ({ hose: "", nozzle: "" })))
  );

  const [glueData, setGlueData] = useState(
    Array(5).fill(null).map((_, i) => ({ no: i + 1, jam: "", qty: "" }))
  );

  const [ncData, setNCData] = useState(
    Array(5).fill(null).map(() => ({ stop: "", start: "", durasi: "", masalah: "", corrective: "", pic: "", lossPack: "", lossKarton: "" }))
  );

  const [headerTN, setHeaderTN] = useState(Array(12).fill(null).map(() => ({ T: "", N: "" })));

  const totalQty = useMemo(() => glueData.reduce((sum, d) => sum + (parseFloat(d.qty) || 0), 0).toFixed(1), [glueData]);

  const saveToStorage = useCallback(async (payload) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) { console.log("Error saving:", e); }
  }, [STORAGE_KEY]);

  const loadFromStorage = useCallback(async () => {
    try { const raw = await AsyncStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!isInit.current) return;
    loadFromStorage().then((cache) => {
      if (cache) {
        setFormData(cache.formData || formData);
        if (cache.hoseTable) setHoseTable(cache.hoseTable);
        if (cache.glueData) setGlueData(cache.glueData);
        if (cache.ncData) setNCData(cache.ncData);
        if (cache.headerTN) setHeaderTN(cache.headerTN);
      } else if (initialData.length > 0) {
        const d = initialData[0];
        setFormData((prev) => ({ ...prev, ...d }));
        if (d.hoseTable) setHoseTable(d.hoseTable);
        if (d.glueData) setGlueData(d.glueData);
        if (d.ncData) setNCData(d.ncData);
        if (d.headerTN) setHeaderTN(d.headerTN);
      }
      isInit.current = false;
    });
  }, []);

  useEffect(() => {
    if (isInit.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload = [{ id: 1, ...formData, hoseTable, glueData, ncData, headerTN, user: username, time: moment().tz("Asia/Jakarta").format("HH:mm:ss") }];
      onDataChange(payload);
      saveToStorage({ formData, hoseTable, glueData, ncData, headerTN });
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [formData, hoseTable, glueData, ncData, headerTN]);

  const updateField = useCallback((key, value) => setFormData((prev) => ({ ...prev, [key]: value })), []);

  // Detect perubahan shouldClearData
  useEffect(() => {
    if (shouldClearData && shouldClearData !== lastClearState.current) {
      clearAllData();
      lastClearState.current = shouldClearData;
    }
  }, [shouldClearData, clearAllData]);

  // Clear data saat screen focus jika ada flag
  useFocusEffect(
    useCallback(() => {
      const checkClearFlag = async () => {
        try {
          const clearFlag = await AsyncStorage.getItem(`${STORAGE_KEY}_clear`);
          if (clearFlag === 'true') {
            await clearAllData();
            await AsyncStorage.removeItem(`${STORAGE_KEY}_clear`);
          }
        } catch (error) {
          console.error("Error checking clear flag:", error);
        }
      };
      checkClearFlag();
    }, [STORAGE_KEY, clearAllData])
  );

  const updateHose = useCallback((r, c, key, v) => {
    setHoseTable((prev) => {
      const clone = prev.map((row) => row.map((cell) => ({ ...cell })));
      clone[r][c][key] = v;
      return clone;
    });
  }, []);

  const updateHeaderTN = useCallback((index, key, value) => {
    setHeaderTN((prev) => { const clone = [...prev]; clone[index] = { ...clone[index], [key]: value }; return clone; });
  }, []);

  const updateGlue = useCallback((i, key, v) => {
    setGlueData((prev) => {
      const next = prev.map((row) => ({ ...row }));
      next[i][key] = v;
      if (key === "qty" && v) {
        const currentJam = next[i].jam;
        if (currentJam && next[i + 1] && !next[i + 1].jam) {
          next[i + 1].jam = moment(currentJam, "HH:mm").add(1, "hour").format("HH:mm");
        }
      }
      const last = next[next.length - 1];
      if (last.jam !== "" || last.qty !== "") next.push({ no: next.length + 1, jam: "", qty: "" });
      return next;
    });
  }, []);

  const updateNC = useCallback((i, key, v) => {
    setNCData((prev) => {
      const next = prev.map((row) => ({ ...row }));
      next[i][key] = v;
      const last = next[next.length - 1];
      if (last.stop || last.masalah || last.corrective) {
        next.push({ stop: "", start: "", durasi: "", masalah: "", corrective: "", pic: "", lossPack: "", lossKarton: "" });
      }
      return next;
    });
  }, []);

  const openGlueTimePicker = useCallback((index, currentValue) => {
    setTimePickerIndex(index); setTimePickerValue(currentValue || ""); setTimePickerVisible(true);
  }, []);

  const handleTimeSelect = useCallback((time) => { if (timePickerIndex !== null) updateGlue(timePickerIndex, "jam", time); }, [timePickerIndex, updateGlue]);
  const closeTimePicker = useCallback(() => { setTimePickerVisible(false); setTimePickerIndex(null); setTimePickerValue(""); }, []);

  const headerColumns = useMemo(() => Array(12).fill(0).map((_, i) => (
    <View key={i} style={styles.timeColHeader}><Text style={styles.headerJam}>JAM {i + 1}</Text></View>
  )), []);

  // Function untuk reset semua data
  const clearAllData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);

      setFormData({
        namaProduk: "", rasa: "", lineMc: "", airSupply: "",
        hoursStop: "", hoursStart: "", kodeProduksi: "", kodeKadaluwarsa: "",
        startProduksi: "", stopProduksi: "", tempHeader: "", tankHeader: "",
      });

      setHoseTable(
        Array(4).fill(null).map(() => Array(12).fill(null).map(() => ({ hose: "", nozzle: "" })))
      );

      setGlueData(
        Array(5).fill(null).map((_, i) => ({ no: i + 1, jam: "", qty: "" }))
      );

      setNCData(
        Array(5).fill(null).map(() => ({
          stop: "", start: "", durasi: "", masalah: "",
          corrective: "", pic: "", lossPack: "", lossKarton: ""
        }))
      );

      setHeaderTN(Array(12).fill(null).map(() => ({ T: "", N: "" })));

      console.log("Frans data cleared successfully");
    } catch (error) {
      console.error("Error clearing Frans data:", error);
    }
  }, [STORAGE_KEY]);

  return (
    <ScrollView style={styles.container} nestedScrollEnabled removeClippedSubviews={Platform.OS === 'android'} showsVerticalScrollIndicator={true}>
      <ReportHeader title="LAPORAN FRANS WP 25 CASE PACKER" headerMeta={{ frm: "FIL-082-01", rev: "", berlaku: "15 Jan 2023", hal: "" }} />

      <Section title="Informasi Produk" defaultOpen>
        <View style={styles.grid2}>
          <Field label="Nama Produk" val={formData.namaProduk} onChange={(v) => updateField("namaProduk", v)} />
          <Field label="Kode Produksi" val={formData.kodeProduksi} onChange={(v) => updateField("kodeProduksi", v)} />
          <Field label="Rasa" val={formData.rasa} onChange={(v) => updateField("rasa", v)} />
          <Field label="Kode Kadaluwarsa" val={formData.kodeKadaluwarsa} onChange={(v) => updateField("kodeKadaluwarsa", v)} />
          <Field label="Line MC" val={formData.lineMc} onChange={(v) => updateField("lineMc", v)} />
          <Field label="Air Supply" val={formData.airSupply} onChange={(v) => updateField("airSupply", v)} />
          <Field label="Start Produksi" val={formData.startProduksi} onChange={(v) => updateField("startProduksi", v)} />
          <Field label="Stop Produksi" val={formData.stopProduksi} onChange={(v) => updateField("stopProduksi", v)} />
          <Field label="Hours Start" val={formData.hoursStart} onChange={(v) => updateField("hoursStart", v)} keyboardType="numeric" />
          <Field label="Hours Stop" val={formData.hoursStop} onChange={(v) => updateField("hoursStop", v)} keyboardType="numeric" />
        </View>
      </Section>

      <Section title="Pemeriksaan Temperature Hose (Kelipatan 3 Jam)">
        <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled removeClippedSubviews={Platform.OS === 'android'}>
          <View>
            <View style={[styles.row, styles.header]}>
              <TextInput style={[styles.hLabel, { width: 120, backgroundColor: "#fff", fontWeight: "700" }]} placeholder="TEMP (°C)" placeholderTextColor="#999" value={formData.tempHeader || ""} onChangeText={(v) => updateField("tempHeader", v)} />
              {headerColumns}
            </View>
            <View style={[styles.row, styles.subHeaderRow]}>
              <TextInput style={[styles.hLabel, { width: 120, backgroundColor: "#fff", fontWeight: "700" }]} placeholder="Tank / Nozzle" placeholderTextColor="#999" value={formData.tankHeader || ""} onChangeText={(v) => updateField("tankHeader", v)} />
              {headerTN.map((tn, i) => <HeaderTNCell key={i} index={i} tn={tn} updateHeaderTN={updateHeaderTN} />)}
            </View>
            {hoseTable.map((row, r) => (
              <View key={r} style={styles.row}>
                <Text style={styles.leftLabel}>{`${r + 1}. Tank / Nozzle`}</Text>
                {row.map((cell, c) => <HoseCell key={c} rowIdx={r} colIdx={c} cell={cell} updateHose={updateHose} />)}
              </View>
            ))}
          </View>
        </ScrollView>
      </Section>

      <Section title="Penambahan Glue 1kg (Setiap 1Jam / ±700 CTN)">
        <View style={styles.dataTable}>
          <View style={styles.dataHeaderRow}>
            <Text style={[styles.hLabel, { width: 40 }]}>No</Text>
            <Text style={[styles.hLabel, { flex: 1 }]}>Jam (Time)</Text>
            <Text style={[styles.hLabel, { flex: 1 }]}>Jumlah (Kg)</Text>
          </View>
          {glueData.map((row, i) => <GlueRow key={i} row={row} index={i} updateGlue={updateGlue} onOpenTimePicker={openGlueTimePicker} />)}
          <View style={styles.totalRow}>
            <Text style={[styles.dataCell, { width: 40, fontWeight: "700" }]}>∑</Text>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{totalQty} kg</Text>
          </View>
        </View>
      </Section>

      <Section title="Catatan Ketidaksesuaian Proses Produksi">
        <ScrollView horizontal nestedScrollEnabled removeClippedSubviews={Platform.OS === 'android'} showsHorizontalScrollIndicator>
          <View style={styles.dataTable}>
            <View style={styles.dataHeaderRow}>
              <Text style={[styles.hLabel, { width: 70 }]}>Stop</Text>
              <Text style={[styles.hLabel, { width: 70 }]}>Start</Text>
              <Text style={[styles.hLabel, { width: 70 }]}>Durasi</Text>
              <Text style={[styles.hLabel, { width: 200 }]}>Masalah</Text>
              <Text style={[styles.hLabel, { width: 200 }]}>Tindakan</Text>
              <Text style={[styles.hLabel, { width: 80 }]}>PIC</Text>
              <Text style={[styles.hLabel, { width: 80 }]}>Loss Pack</Text>
              <Text style={[styles.hLabel, { width: 90 }]}>Loss Karton</Text>
            </View>
            {ncData.map((row, i) => <NCRow key={i} row={row} index={i} updateNC={updateNC} />)}
          </View>
        </ScrollView>
      </Section>

      <TimePickerModal visible={timePickerVisible} onClose={closeTimePicker} onSelect={handleTimeSelect} initialValue={timePickerValue} />
      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#f4f5f6" },
  sectionCard: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 16, overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", padding: 14, backgroundColor: "#e7f2ed", borderBottomWidth: 1, borderColor: "#d7e9dd" },
  sectionHeaderText: { fontSize: 15, fontWeight: "700", color: "#255c41" },
  chevron: { fontSize: 16, color: "#255c41" },
  sectionBody: { padding: 14 },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  field: { width: "48%" },
  fieldLabel: { fontSize: 12, marginBottom: 4, fontWeight: "600", color: "#333" },
  fieldInput: { borderWidth: 1, borderColor: "#cbd5e1", padding: 8, backgroundColor: "#fff", borderRadius: 6, fontSize: 13, color: "#000" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e1e1e1", alignItems: "center" },
  header: { backgroundColor: "#dff3ea" },
  subHeaderRow: { backgroundColor: "#edf6f1" },
  hLabel: { padding: 6, fontSize: 11, textAlign: "center", fontWeight: "700", borderRightWidth: 1, borderColor: "#c9d4cf", color: "#333" },
  headerJam: { fontSize: 11, fontWeight: "700", textAlign: "center", color: "#255c41" },
  leftLabel: { width: 120, textAlign: "left", paddingVertical: 8, paddingHorizontal: 6, backgroundColor: "#f2f4f3", fontWeight: "600", borderRightWidth: 1, borderColor: "#ddd", fontSize: 11, color: "#333" },
  timeColHeader: { width: 80, borderRightWidth: 1, borderColor: "#d0d7d3", alignItems: "center", justifyContent: "center", paddingVertical: 4, flexDirection: "row" },
  smallHeaderBox: { flex: 1, marginHorizontal: 2, paddingVertical: 2, borderWidth: 1, borderColor: "#bfc8c3", borderRadius: 4, alignItems: "center" },
  smallHeaderInput: { fontSize: 10, textAlign: "center", paddingVertical: 2, paddingHorizontal: 4, color: "#000", minWidth: 30 },
  timeCol: { width: 80, borderRightWidth: 1, borderColor: "#d0d7d3", flexDirection: "row", paddingVertical: 4, paddingHorizontal: 2 },
  smallInput: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 4, paddingVertical: 4, paddingHorizontal: 2, marginHorizontal: 2, fontSize: 10, textAlign: "center", backgroundColor: "#fff", color: "#000" },
  dataTable: { borderWidth: 1, borderColor: "#cdd4d1", borderRadius: 8, overflow: "hidden" },
  dataHeaderRow: { flexDirection: "row", backgroundColor: "#e7eceb", borderBottomWidth: 1, borderColor: "#d1d8d5" },
  dataRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#ececec", alignItems: "center", minHeight: 44 },
  dataCell: { padding: 6, textAlign: "center", fontSize: 12, color: "#333" },
  dataInput: { borderWidth: 1, borderColor: "#ccc", padding: 6, fontSize: 12, backgroundColor: "#fff", color: "#000" },
  timeInputBox: { flex: 1, height: 40, borderWidth: 1, borderColor: "#bbb", borderRadius: 6, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 4 },
  timeText: { fontSize: 13, color: "#333", textAlign: "center" },
  placeholderText: { color: "#999" },
  qtyInput: { flex: 1, height: 40, borderWidth: 1, borderColor: "#bbb", borderRadius: 6, paddingHorizontal: 8, fontSize: 13, backgroundColor: "#fff", textAlign: "center", marginHorizontal: 4, color: "#000" },
  totalRow: { flexDirection: "row", backgroundColor: "#f1f5f4", borderTopWidth: 1, borderColor: "#cdd4d1", height: 42, alignItems: "center" },
  totalLabel: { flex: 1, fontSize: 13, fontWeight: "700", paddingLeft: 10, color: "#333" },
  totalValue: { flex: 1, fontSize: 14, fontWeight: "700", textAlign: "center", color: "#255c41" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  timePickerContainer: { backgroundColor: "#fff", borderRadius: 12, padding: 20, width: 280, maxHeight: 400 },
  timePickerTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 16, color: "#333" },
  timePickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  timePickerColumn: { alignItems: "center", width: 80 },
  timePickerLabel: { fontSize: 12, color: "#666", marginBottom: 8 },
  timePickerScroll: { height: 180, width: 70 },
  timeOption: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, marginVertical: 2 },
  timeOptionSelected: { backgroundColor: "#255c41" },
  timeOptionText: { fontSize: 16, textAlign: "center", color: "#333" },
  timeOptionTextSelected: { color: "#fff", fontWeight: "600" },
  timeSeparator: { fontSize: 24, fontWeight: "700", marginHorizontal: 10, color: "#333" },
  timePickerButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 12 },
  timePickerCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ccc", alignItems: "center" },
  timePickerCancelText: { fontSize: 14, color: "#666" },
  timePickerConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#255c41", alignItems: "center" },
  timePickerConfirmText: { fontSize: 14, color: "#fff", fontWeight: "600" },
});

export default FransCasePackerInspectionTable;
