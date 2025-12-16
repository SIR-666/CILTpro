import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import moment from "moment-timezone";
import ReportHeader from "../../../components/ReportHeader";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* REUSABLE ACCORDION SECTION */
const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity onPress={toggle} style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
        <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
};

/* MAIN COMPONENT */
const FransCasePackerInspectionTable = ({
  username,
  onDataChange,
  initialData = [],
}) => {
  const isInit = useRef(true);
  const [timePickerIndex, setTimePickerIndex] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const STORAGE_KEY = `frans_casepacker_${username || "user"}`;

  /* HEADER FIELDS */
  const [formData, setFormData] = useState({
    namaProduk: "",
    rasa: "",
    lineMc: "",
    airSupply: "",
    hoursStop: "",
    hoursStart: "",
    kodeProduksi: "",
    kodeKadaluwarsa: "",
    startProduksi: "",
    stopProduksi: "",
  });

  const [hoseTable, setHoseTable] = useState(
    Array(4)
      .fill(null)
      .map(() =>
        Array(12)
          .fill(null)
          .map(() => ({ hose: "", nozzle: "" }))
      )
  );

  const [glueData, setGlueData] = useState(
    Array(5)
      .fill(null)
      .map((_, i) => ({ no: i + 1, jam: "", qty: "" }))
  );

  const [ncData, setNCData] = useState(
    Array(10)
      .fill(null)
      .map(() => ({
        stop: "",
        start: "",
        durasi: "",
        masalah: "",
        corrective: "",
        pic: "",
        lossPack: "",
        lossKarton: "",
      }))
  );

  const [headerTN, setHeaderTN] = useState(
    Array(12).fill().map(() => ({ T: "", N: "" }))
  );

  const updateHeaderTN = (index, key, value) => {
    setHeaderTN(prev => {
      const clone = [...prev];
      clone[index][key] = value;
      return clone;
    });
  };

  const saveToStorage = async (payload) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.log("Error saving:", e);
    }
  };

  const loadFromStorage = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.log("Error loading:", e);
      return null;
    }
  };

  /* LOAD INITIAL DATA */
  useEffect(() => {
    if (!isInit.current) return;

    loadFromStorage().then((cache) => {
      if (cache) {
        setFormData(cache.formData || formData);
        setHoseTable(cache.hoseTable || hoseTable);
        setGlueData(cache.glueData || glueData);
        setNCData(cache.ncData || ncData);
        isInit.current = false;
        return;
      }

      // hanya dipakai jika storage kosong
      if (initialData.length > 0) {
        const d = initialData[0];
        setFormData((prev) => ({ ...prev, ...d }));
        if (d.hoseTable) setHoseTable(d.hoseTable);
        if (d.glueData) setGlueData(d.glueData);
        if (d.ncData) setNCData(d.ncData);
      }

      isInit.current = false;
    });
  }, []);


  /* AUTO SAVE */
  useEffect(() => {
    if (isInit.current) return;

    const payload = [
      {
        id: 1,
        ...formData,
        hoseTable,
        glueData,
        ncData,
        user: username,
        time: moment().tz("Asia/Jakarta").format("HH:mm:ss"),
      },
    ];

    onDataChange(payload);
    saveToStorage({
      formData,
      hoseTable,
      glueData,
      ncData,
    });
  }, [formData, hoseTable, glueData, ncData]);

  /* UPDATE FUNCTIONS */
  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateHose = (r, c, key, v) => {
    setHoseTable((prev) => {
      const clone = prev.map((row) => row.map((cell) => ({ ...cell })));
      clone[r][c][key] = v;
      return clone;
    });
  };

  const updateGlue = (i, key, v) => {
    setGlueData((prev) => {
      const next = [...prev];
      next[i][key] = v;

      if (key === "qty") {
        const currentJam = next[i].jam;
        if (currentJam && next[i + 1] && !next[i + 1].jam) {
          next[i + 1].jam = moment(currentJam, "HH:mm")
            .add(1, "hour")
            .format("HH:mm");
        }
      }

      const last = next[next.length - 1];
      if ((last.jam !== "" || last.qty !== "") && prev.length === next.length) {
        next.push({
          no: next.length + 1,
          jam: "",
          qty: "",
        });
      }

      return next;
    });
  };

  const updateNC = (i, key, v) => {
    setNCData((prev) => {
      const next = [...prev];
      next[i][key] = v;
      return next;
    });
  };

  const totalQty = glueData
    .map((d) => parseFloat(d.qty) || 0)
    .reduce((a, b) => a + b, 0)
    .toFixed(1);

  /* RENDER */
  return (
    <ScrollView style={styles.container} nestedScrollEnabled>
      <ReportHeader
        title="LAPORAN FRANS WP 25 CASE PACKER"
        headerMeta={{
          frm: "FIL-082-01",
          rev: "",
          berlaku: "15 Jan 2023",
          hal: "",
        }}
      />

      {/* INFORMASI PRODUK */}
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
          <Field label="Hours Start" val={formData.hoursStart} onChange={(v) => updateField("hoursStart", v)} />
          <Field label="Hours Stop" val={formData.hoursStop} onChange={(v) => updateField("hoursStop", v)} />
        </View>
      </Section>

      {/* TEMPERATURE HOSE */}
      <Section title="Pemeriksaan Temperature Hose (Kelipatan 3 Jam)">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={[styles.row, styles.header]}>
              <TextInput
                style={[
                  styles.hLabel,
                  { width: 120, backgroundColor: "#fff", fontWeight: "700" }
                ]}
                placeholder="TEMP (°C)"
                value={formData.tempHeader || ""}
                onChangeText={(v) => updateField("tempHeader", v)}
              />
              {Array(12).fill(0).map((_, i) => (
                <View key={i} style={styles.timeColHeader}>
                  <Text style={styles.headerJam}>JAM {i + 1}</Text>
                </View>
              ))}
            </View>

            {/* HEADER: T & N */}
            <View style={[styles.row, styles.subHeaderRow]}>
              <TextInput
                style={[
                  styles.hLabel,
                  { width: 120, backgroundColor: "#fff", fontWeight: "700" },
                ]}
                placeholder="Tank / Nozzle"
                value={formData.tankHeader || ""}
                onChangeText={(v) => updateField("tankHeader", v)}
              />
              {Array(12).fill(0).map((_, i) => (
                <View key={i} style={styles.timeColHeader}>
                  <View style={styles.smallHeaderBox}>
                    <TextInput
                      style={styles.smallHeaderInput}
                      value={headerTN[i].T}
                      placeholder="T"
                      onChangeText={(v) => updateHeaderTN(i, "T", v)}
                    />
                  </View>

                  <View style={styles.smallHeaderBox}>
                    <TextInput
                      style={styles.smallHeaderInput}
                      value={headerTN[i].N}
                      placeholder="N"
                      onChangeText={(v) => updateHeaderTN(i, "N", v)}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* BARIS 1–4 */}
            {hoseTable.map((row, r) => (
              <View key={r} style={styles.row}>
                <Text style={styles.leftLabel}>{`${r + 1}. Tank / Nozzle`}</Text>

                {row.map((cell, c) => (
                  <View key={c} style={styles.timeCol}>
                    <TextInput
                      style={styles.smallInput}
                      placeholder="T"
                      value={cell.hose}
                      onChangeText={(v) => updateHose(r, c, "hose", v)}
                    />
                    <TextInput
                      style={styles.smallInput}
                      placeholder="N"
                      value={cell.nozzle}
                      onChangeText={(v) => updateHose(r, c, "nozzle", v)}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </Section >

      {/* GLUE TABLE */}
      <Section title="Penambahan Glue 1kg (Setiap 1Jam / ±700 CTN)" >
        <View style={styles.dataTable}>
          <View style={styles.dataHeaderRow}>
            <Text style={[styles.hLabel, { width: 40 }]}>No</Text>
            <Text style={[styles.hLabel, { flex: 1 }]}>Jam (Time)</Text>
            <Text style={[styles.hLabel, { flex: 1 }]}>Jumlah (Kg)</Text>
          </View>

          {glueData.map((row, i) => (
            <View key={i} style={styles.dataRow}>

              <Text style={[styles.dataCell, { width: 40 }]}>
                {row.no}
              </Text>

              {/* JAM (TIME) → TOUCHABLE + CENTERED */}
              <TouchableOpacity
                style={styles.timeInputBox}
                onPress={() => {
                  setTimePickerIndex(i);
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.timeText}>
                  {row.jam || "HH:MM"}
                </Text>
              </TouchableOpacity>

              {/* JUMLAH (NUMERIC) */}
              <TextInput
                style={styles.qtyInput}
                value={row.qty}
                keyboardType="numeric"
                onChangeText={(v) => updateGlue(i, "qty", v)}
                placeholder="1.0"
                placeholderTextColor="#999"
              />
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.dataCell, { width: 40, fontWeight: "700" }]}>∑</Text>
            <Text style={[styles.totalLabel]}>TOTAL</Text>
            <Text style={[styles.totalValue]}>{totalQty}</Text>
          </View>
        </View>
      </Section >

      {/* NON CONFORMANCE */}
      <Section title="Catatan Ketidaksesuaian Proses Produksi" >
        <ScrollView horizontal>
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

            {ncData.map((row, i) => (
              <View key={i} style={styles.dataRow}>
                <TextInput style={[styles.dataInput, { width: 70 }]} keyboardType="numeric" value={row.stop} onChangeText={(v) => updateNC(i, "stop", v)} />
                <TextInput style={[styles.dataInput, { width: 70 }]} keyboardType="numeric" value={row.start} onChangeText={(v) => updateNC(i, "start", v)} />
                <TextInput style={[styles.dataInput, { width: 70 }]} keyboardType="numeric" value={row.durasi} onChangeText={(v) => updateNC(i, "durasi", v)} />
                <TextInput style={[styles.dataInput, { width: 200 }]} value={row.masalah} onChangeText={(v) => updateNC(i, "masalah", v)} />
                <TextInput style={[styles.dataInput, { width: 200 }]} value={row.corrective} onChangeText={(v) => updateNC(i, "corrective", v)} />
                <TextInput style={[styles.dataInput, { width: 80 }]} value={row.pic} onChangeText={(v) => updateNC(i, "pic", v)} />
                <TextInput style={[styles.dataInput, { width: 80 }]} keyboardType="numeric" value={row.lossPack} onChangeText={(v) => updateNC(i, "lossPack", v)} placeholder="0" />
                <TextInput style={[styles.dataInput, { width: 90 }]} keyboardType="numeric" value={row.lossKarton} onChangeText={(v) => updateNC(i, "lossKarton", v)} placeholder="0" />
              </View>
            ))}
          </View>
        </ScrollView>
      </Section >
      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={(event, selectedTime) => {
            if (event.type === "set") {
              const formatted = moment(selectedTime).format("HH:mm");
              updateGlue(timePickerIndex, "jam", formatted);
            }
            setShowTimePicker(false);
          }}
        />
      )}
    </ScrollView >
  );
};

/* REUSABLE FIELD */
const Field = ({ label, val, onChange }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput style={styles.fieldInput} value={val} onChangeText={onChange} />
  </View>
);

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#f4f5f6" },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#e7f2ed",
    borderBottomWidth: 1,
    borderColor: "#d7e9dd",
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#255c41",
  },
  chevron: { fontSize: 16, color: "#255c41" },
  sectionBody: { padding: 14 },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  field: { width: "48%" },
  fieldLabel: { fontSize: 12, marginBottom: 4, fontWeight: "600", color: "#333" },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e1e1e1",
    alignItems: "center",
  },
  header: { backgroundColor: "#dff3ea" },
  subHeaderRow: {
    backgroundColor: "#edf6f1",
  },

  hLabel: {
    padding: 6,
    fontSize: 11,
    textAlign: "center",
    fontWeight: "700",
    borderRightWidth: 1,
    borderColor: "#c9d4cf",
  },

  headerJam: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  leftLabel: {
    width: 120,
    textAlign: "left",
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "#f2f4f3",
    fontWeight: "600",
    borderRightWidth: 1,
    borderColor: "#ddd",
    fontSize: 11,
  },

  timeColHeader: {
    width: 80,
    borderRightWidth: 1,
    borderColor: "#d0d7d3",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    flexDirection: "row",
  },

  smallHeaderBox: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#bfc8c3",
    borderRadius: 4,
    alignItems: "center",
  },

  smallHeaderText: {
    fontSize: 10,
    fontWeight: "700",
  },

  timeCol: {
    width: 80,
    borderRightWidth: 1,
    borderColor: "#d0d7d3",
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  smallInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginHorizontal: 2,
    fontSize: 10,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  dataTable: {
    borderWidth: 1,
    borderColor: "#cdd4d1",
    borderRadius: 8,
    overflow: "hidden",
  },
  dataHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#e7eceb",
    borderBottomWidth: 1,
    borderColor: "#d1d8d5",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ececec",
    alignItems: "center",
  },
  dataCell: { padding: 6, textAlign: "center", fontSize: 12 },

  dataInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 6,
    fontSize: 12,
    backgroundColor: "#fff",
  },
  timeInputBox: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  timeText: {
    fontSize: 13,
    color: "#333",
    textAlign: "center",
  },

  qtyInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    backgroundColor: "#fff",
    textAlign: "center",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f4",
    borderTopWidth: 1,
    borderColor: "#cdd4d1",
    height: 42,
    alignItems: "center",
  },

  totalLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    paddingLeft: 10,
    color: "#333",
  },

  totalValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: "#255c41",
  },
  smallHeaderInput: {
    fontSize: 10,
    textAlign: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});

export default FransCasePackerInspectionTable;
