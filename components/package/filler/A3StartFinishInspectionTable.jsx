import React, { memo, useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import ReportHeader from "../../../components/ReportHeader";

const normalizeLine = (line) =>
  (line || "").toUpperCase().replace(/\s+/g, "_");

const getHeaderMeta = (line) => {
  const ln = normalizeLine(line);

  switch (ln) {
    case "LINE_E":
      return {
        frm: "FIL - 052 - 12",
        rev: "",
        berlaku: "1 - Jul - 24",
        hal: "2 dari 5",
      };
    case "LINE_F":
    case "LINE_G":
      return {
        frm: "FIL - 081 - 08",
        rev: "",
        berlaku: "10 - Oct - 22",
        hal: "2 dari 5",
      };
    default:
      return {
        frm: "-",
        rev: "-",
        berlaku: "-",
        hal: "2 dari 5",
      };
  }
};

const CellInput = memo(({ value, onChange, placeholder }) => {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder || "-"}
      placeholderTextColor="#9aa2a8"
    />
  );
});

/* DYNAMIC TABLE */
const DynamicTable = ({ columns, onRowsChange, initialRows }) => {
  const createEmptyRow = () =>
    Object.fromEntries(columns.map((c) => [c.key, ""]));

  const [rows, setRows] = useState(() => {
    if (initialRows && initialRows.length > 0) {
      return initialRows;
    }
    return [createEmptyRow(), createEmptyRow()];
  });

  // ✅ FIX: Load initial rows saat prop berubah
  useEffect(() => {
    if (initialRows && initialRows.length > 0) {
      setRows(initialRows);
    }
  }, [initialRows]);

  // ✅ FIX: Kirim data ke parent setiap kali rows berubah
  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  const handleChange = (rowIndex, key, value) => {
    const updated = [...rows];
    updated[rowIndex][key] = value;
    setRows(updated);

    // AUTO ADD ROW
    const lastRow = updated[updated.length - 1];
    const isFilled = Object.values(lastRow).some(
      (v) => (v || "").toString().trim() !== ""
    );

    if (isFilled) {
      setRows([...updated, createEmptyRow()]);
    }
  };

  return (
    <ScrollView horizontal>
      <View>
        {/* HEADER */}
        <View style={styles.headerRow}>
          {columns.map((col, idx) => (
            <View key={idx} style={[styles.headerCell, { width: 150 }]}>
              <Text style={styles.headerText}>{col.label}</Text>
            </View>
          ))}
        </View>

        {/* BODY */}
        {rows.map((row, ri) => (
          <View key={ri} style={styles.dataRow}>
            {columns.map((col, ci) => (
              <View key={ci} style={[styles.dataCell, { width: 150 }]}>
                <CellInput
                  value={row[col.key]}
                  placeholder={col.label}
                  onChange={(v) => handleChange(ri, col.key, v)}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const A3StartFinishInspectionTable = ({
  line,
  plant,
  machine,
  packageName,
  onDataChange,  // ✅ FIX: Menerima callback dari parent
  initialData,
}) => {
  const [tab, setTab] = useState("start");
  const [startRows, setStartRows] = useState([]);
  const [finishRows, setFinishRows] = useState([]);

  const startColumns = [
    { key: "weight", label: "Weight" },
    { key: "twist", label: "Tube Twist" },
    { key: "overlap", label: "LS Overlap" },
    { key: "datePrint", label: "Date Printing" },
    { key: "surface", label: "Surface Printing" },
    { key: "ls", label: "LS" },
    { key: "ts", label: "TS" },
    { key: "sa", label: "SA" },
    { key: "inj", label: "Injection Test" },
    { key: "elec", label: "Electrolity Test" },
  ];

  const finishColumns = [
    ...startColumns,
    { key: "remarks", label: "Remarks" },
  ];

  // ✅ FIX: Callbacks untuk menerima data dari DynamicTable
  const handleStartRowsChange = useCallback((rows) => {
    setStartRows(rows);
  }, []);

  const handleFinishRowsChange = useCallback((rows) => {
    setFinishRows(rows);
  }, []);

  // ✅ FIX: Gabungkan dan kirim data ke parent setiap kali berubah
  useEffect(() => {
    const combinedData = [
      {
        startProduksi: startRows.filter(row => 
          Object.values(row).some(v => v && v.toString().trim() !== "")
        ),
        finishProduksi: finishRows.filter(row => 
          Object.values(row).some(v => v && v.toString().trim() !== "")
        ),
        packageType: packageName,
        line: line,
        plant: plant,
        machine: machine,
        activeTab: tab
      }
    ];
    
    // Panggil callback ke parent
    onDataChange?.(combinedData);
  }, [startRows, finishRows, packageName, line, plant, machine, tab, onDataChange]);

  // ✅ FIX: Load initial data jika ada
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const initial = initialData[0];
      if (initial?.startProduksi && initial.startProduksi.length > 0) {
        setStartRows(initial.startProduksi);
      }
      if (initial?.finishProduksi && initial.finishProduksi.length > 0) {
        setFinishRows(initial.finishProduksi);
      }
    }
  }, [initialData]);

  return (
    <View style={{ flex: 1 }}>
      <ReportHeader
        title="START & FINISH PRODUKSI"
        headerMeta={getHeaderMeta(line)}
      />

      {/* TABS */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "start" && styles.tabActive]}
          onPress={() => setTab("start")}
        >
          <Text
            style={[styles.tabText, tab === "start" && styles.tabTextActive]}
          >
            START PRODUKSI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === "finish" && styles.tabActive]}
          onPress={() => setTab("finish")}
        >
          <Text
            style={[styles.tabText, tab === "finish" && styles.tabTextActive]}
          >
            FINISH PRODUKSI
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView style={{ padding: 12 }}>
        {tab === "start" && (
          <DynamicTable 
            columns={startColumns} 
            onRowsChange={handleStartRowsChange}
            initialRows={startRows.length > 0 ? startRows : undefined}
          />
        )}
        {tab === "finish" && (
          <DynamicTable 
            columns={finishColumns}
            onRowsChange={handleFinishRowsChange}
            initialRows={finishRows.length > 0 ? finishRows : undefined}
          />
        )}
      </ScrollView>
    </View>
  );
};

/* STYLES */
const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#e2f0e8",
    padding: 6,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#b6cfc1",
  },
  tabActive: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },
  tabText: { color: "#2e7d32", fontSize: 13 },
  tabTextActive: { color: "#fff", fontWeight: "700" },

  headerRow: { flexDirection: "row" },
  headerCell: {
    borderWidth: 1,
    padding: 6,
    backgroundColor: "#d9f0e3",
    alignItems: "center",
  },
  headerText: { fontWeight: "700", fontSize: 12 },

  dataRow: { flexDirection: "row" },
  dataCell: {
    borderWidth: 1,
    padding: 4,
    justifyContent: "center",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
});

export default A3StartFinishInspectionTable;