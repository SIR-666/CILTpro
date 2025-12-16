import React, { useEffect, useState, memo, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import ReportHeader from "../../../components/ReportHeader";
import { api } from "../../../utils/axiosInstance";

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
        hal: "2 dari 5"
      };
    case "LINE_F":
    case "LINE_G":
      return {
        frm: "FIL - 081 - 08",
        rev: "",
        berlaku: "10 - Oct - 24",
        hal: "2 dari 5"
      };
    default:
      return {
        frm: "-",
        rev: "-",
        berlaku: "-",
        hal: "-"
      };
  }
};

/* INPUT COMPONENT WITH COLOR STATE */
const CellInput = memo(({ value, onChange, borderColor }) => (
  <TextInput
    style={[styles.input, { borderColor }]}
    value={value}
    onChangeText={onChange}
    placeholder="-"
    placeholderTextColor="#9aa2a8"
    keyboardType="numeric"
    inputMode="numeric"
  />
));

/* VALIDATION FUNCTION */
const validateValue = (value, param) => {
  if (!value) return "#ccc";

  const numeric = parseFloat(value);
  if (isNaN(numeric)) return "#ccc";

  if (param.value_type === "range") {
    const min = parseFloat(param.min_value);
    const max = parseFloat(param.max_value);
    if (numeric >= min && numeric <= max) return "#4CAF50";
    return "#D32F2F";
  }

  if (param.value_type === "exact") {
    const exact = parseFloat(param.exact_value);
    return numeric === exact ? "#4CAF50" : "#D32F2F";
  }

  return "#ccc";
};

/* TABLE 1 JAM */
const PressureCheckTable = ({ line, onTableDataChange }) => {
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSide, setActiveSide] = useState("left");

  const hoursLeft = [1, 2, 3, 4, 5, 6];
  const hoursRight = [7, 8, 9, 10, 11, 12];
  const hours = activeSide === "left" ? hoursLeft : hoursRight;

  const [table, setTable] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/pressure-check?line=${line}`);
        setParams(res.data);

        setTable(
          res.data.map(() =>
            Object.fromEntries(
              [...hoursLeft, ...hoursRight].map((h) => [`jam${h}`, ""])
            )
          )
        );
      } catch (e) {
        console.log("Fetch 1 Jam error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [line]);

  // ✅ FIX: Panggil callback ketika table berubah
  useEffect(() => {
    if (table.length > 0 && params.length > 0) {
      const formattedData = params.map((p, idx) => ({
        parameter_name: p.parameter_name,
        unit: p.unit,
        value_type: p.value_type,
        min_value: p.min_value,
        max_value: p.max_value,
        exact_value: p.exact_value,
        values: table[idx] || {},
        type: "pressure_1jam"
      }));
      onTableDataChange?.(formattedData, "pressure");
    }
  }, [table, params, onTableDataChange]);

  const updateValue = (row, col, val) => {
    const updated = [...table];
    updated[row][col] = val;
    setTable(updated);
  };

  if (loading) return <ActivityIndicator size="large" color="green" />;

  return (
    <View>
      {/* SWITCH LEFT / RIGHT */}
      <View style={styles.switchRow}>
        <TouchableOpacity
          onPress={() => setActiveSide("left")}
          style={[styles.switchBtn, activeSide === "left" && styles.switchActive]}
        >
          <Text style={[styles.switchText, activeSide === "left" && styles.switchTextActive]}>
            Jam 1–6
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSide("right")}
          style={[styles.switchBtn, activeSide === "right" && styles.switchActive]}
        >
          <Text style={[styles.switchText, activeSide === "right" && styles.switchTextActive]}>
            Jam 7–12
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN TABLE */}
      <ScrollView horizontal>
        <View>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={[styles.headerCell, { width: 220 }]}>
              <Text style={styles.headerText}>Parameter</Text>
            </View>

            {hours.map((h) => (
              <View key={h} style={[styles.headerCell, { width: 140 }]}>
                <Text style={styles.headerText}>Jam {h}</Text>
              </View>
            ))}
          </View>

          {/* BODY */}
          {params.map((p, ri) => (
            <View key={ri} style={styles.dataRow}>
              <View style={[styles.paramCell, { width: 220 }]}>
                <Text style={styles.paramLabel}>
                  {p.parameter_name} {p.unit ? `(${p.unit})` : ""}
                </Text>

                {/* DISPLAY RANGE */}
                {p.value_type === "range" && (
                  <Text style={styles.rangeHint}>
                    {p.min_value} – {p.max_value} {p.unit}
                  </Text>
                )}

                {p.value_type === "exact" && (
                  <Text style={styles.rangeHint}>
                    Exact: {p.exact_value} {p.unit}
                  </Text>
                )}
              </View>

              {hours.map((h) => {
                const key = `jam${h}`;
                return (
                  <View key={h} style={[styles.dataCell, { width: 140 }]}>
                    <CellInput
                      value={table[ri]?.[key] || ""}
                      onChange={(v) => updateValue(ri, key, v)}
                      borderColor={validateValue(table[ri]?.[key], p)}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/* 30 MENIT */
const ThirtyMinuteTable = ({ line, onTableDataChange }) => {
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);

  const packsLeft = Array.from({ length: 6 }, (_, i) => ({
    pack: `Pack ${i + 1}`,
    keys: [`p${i + 1}_1`, `p${i + 1}_2`],
  }));

  const packsRight = Array.from({ length: 6 }, (_, i) => ({
    pack: `Pack ${i + 7}`,
    keys: [`p${i + 7}_1`, `p${i + 7}_2`],
  }));

  const [activeSide, setActiveSide] = useState("left");
  const packCols = activeSide === "left" ? packsLeft : packsRight;

  const [table, setTable] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/pressure-check-30min?line=${line}`);
        setParams(res.data);

        setTable(
          res.data.map(() =>
            Object.fromEntries(
              [...packsLeft, ...packsRight].flatMap((c) => [
                [c.keys[0], ""],
                [c.keys[1], ""],
              ])
            )
          )
        );
      } catch (e) {
        console.log("Fetch 30 menit error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [line]);

  // ✅ FIX: Panggil callback ketika table berubah
  useEffect(() => {
    if (table.length > 0 && params.length > 0) {
      const formattedData = params.map((p, idx) => ({
        parameter_name: p.parameter_name,
        unit: p.unit,
        value_type: p.value_type,
        min_value: p.min_value,
        max_value: p.max_value,
        exact_value: p.exact_value,
        values: table[idx] || {},
        type: "pressure_30min"
      }));
      onTableDataChange?.(formattedData, "30min");
    }
  }, [table, params, onTableDataChange]);

  const updateValue = (rowIdx, colKey, value) => {
    const updated = [...table];
    updated[rowIdx][colKey] = value;
    setTable(updated);
  };

  if (loading) return <ActivityIndicator size="large" color="green" />;

  return (
    <View>
      {/* SWITCH PACK */}
      <View style={styles.switchRow}>
        <TouchableOpacity
          onPress={() => setActiveSide("left")}
          style={[styles.switchBtn, activeSide === "left" && styles.switchActive]}
        >
          <Text style={[styles.switchText, activeSide === "left" && styles.switchTextActive]}>
            Pack 1–6
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSide("right")}
          style={[styles.switchBtn, activeSide === "right" && styles.switchActive]}
        >
          <Text style={[styles.switchText, activeSide === "right" && styles.switchTextActive]}>
            Pack 7–12
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN TABLE */}
      <ScrollView horizontal>
        <View>
          {/* HEADER PACK */}
          <View style={styles.headerRow}>
            <View style={[styles.headerCell, { width: 220 }]}>
              <Text style={styles.headerText}>Parameter</Text>
            </View>

            {packCols.map((pc) => (
              <View key={pc.pack} style={[styles.headerCell, { width: 160 }]}>
                <Text style={styles.headerText}>{pc.pack}</Text>
              </View>
            ))}
          </View>

          {/* SUBHEADER 1 & 2 */}
          <View style={styles.headerRow}>
            <View style={[styles.headerCell, { width: 220 }]} />

            {packCols.map((pc) => (
              <View key={pc.pack + "_sub"} style={{ flexDirection: "row" }}>
                <View style={[styles.subHeaderCell, { width: 80 }]}>
                  <Text>1</Text>
                </View>
                <View style={[styles.subHeaderCell, { width: 80 }]}>
                  <Text>2</Text>
                </View>
              </View>
            ))}
          </View>

          {/* BODY */}
          {params.map((p, ri) => (
            <View key={ri} style={styles.dataRow}>
              <View style={[styles.paramCell, { width: 220 }]}>
                <Text style={styles.paramLabel}>
                  {p.parameter_name} {p.unit ? `(${p.unit})` : ""}
                </Text>

                {p.value_type === "range" && (
                  <Text style={styles.rangeHint}>
                    {p.min_value} – {p.max_value} {p.unit}
                  </Text>
                )}
                {p.value_type === "exact" && (
                  <Text style={styles.rangeHint}>
                    Exact: {p.exact_value} {p.unit}
                  </Text>
                )}
              </View>

              {packCols.map((pc) => (
                <React.Fragment key={pc.pack}>
                  {/* INPUT 1 */}
                  <View style={[styles.dataCell, { width: 80 }]}>
                    <CellInput
                      value={table[ri]?.[pc.keys[0]] || ""}
                      onChange={(v) => updateValue(ri, pc.keys[0], v)}
                      borderColor={validateValue(table[ri]?.[pc.keys[0]], p)}
                    />
                  </View>

                  {/* INPUT 2 */}
                  <View style={[styles.dataCell, { width: 80 }]}>
                    <CellInput
                      value={table[ri]?.[pc.keys[1]] || ""}
                      onChange={(v) => updateValue(ri, pc.keys[1], v)}
                      borderColor={validateValue(table[ri]?.[pc.keys[1]], p)}
                    />
                  </View>
                </React.Fragment>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/* MAIN VIEW WRAPPER */
const A3FlexInspectionTable = ({ 
  line = "LINE_E", 
  packageName, 
  onDataChange,  // ✅ FIX: Terima callback dari parent
  initialData 
}) => {
  const [tab, setTab] = useState("pressure");
  const [pressureData, setPressureData] = useState([]);
  const [thirtyMinData, setThirtyMinData] = useState([]);

  const isPressure = packageName === "PENGECEKAN PRESSURE";

  // ✅ FIX: Callback untuk menerima data dari child tables
  const handleTableDataChange = useCallback((data, type) => {
    if (type === "pressure") {
      setPressureData(data);
    } else if (type === "30min") {
      setThirtyMinData(data);
    }
  }, []);

  // ✅ FIX: Gabungkan data dan kirim ke parent setiap kali berubah
  useEffect(() => {
    const combinedData = [
      {
        pressureCheck1Jam: pressureData,
        pressureCheck30Min: thirtyMinData,
        packageType: packageName,
        line: line,
        activeTab: tab
      }
    ];
    
    // Panggil callback ke parent
    onDataChange?.(combinedData);
  }, [pressureData, thirtyMinData, packageName, line, tab, onDataChange]);

  // Load initial data jika ada
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const initial = initialData[0];
      if (initial?.pressureCheck1Jam) {
        setPressureData(initial.pressureCheck1Jam);
      }
      if (initial?.pressureCheck30Min) {
        setThirtyMinData(initial.pressureCheck30Min);
      }
    }
  }, [initialData]);

  if (!isPressure) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 14, color: "red" }}>
          Package "{packageName}" tidak cocok untuk A3FlexInspectionTable
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ReportHeader
        title="LAPORAN MESIN A3 / FLEX"
        headerMeta={getHeaderMeta(line)}
      />

      {/* TABS */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "pressure" && styles.tabActive]}
          onPress={() => setTab("pressure")}
        >
          <Text style={[styles.tabText, tab === "pressure" && styles.tabTextActive]}>
            1 Jam
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === "30" && styles.tabActive]}
          onPress={() => setTab("30")}
        >
          <Text style={[styles.tabText, tab === "30" && styles.tabTextActive]}>
            30 Menit
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView style={{ padding: 12 }}>
        {/* Render hanya jika package = PENGECEKAN PRESSURE */}
        {isPressure && tab === "pressure" && (
          <PressureCheckTable 
            line={line} 
            onTableDataChange={handleTableDataChange}
          />
        )}

        {isPressure && tab === "30" && (
          <ThirtyMinuteTable 
            line={line}
            onTableDataChange={handleTableDataChange}
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
  tabText: {
    color: "#2e7d32",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 42
  },
  headerCell: {
    borderWidth: 1,
    paddingVertical: 6,
    backgroundColor: "#d9f0e3",
    alignItems: "center",
    justifyContent: "center",
    height: 42
  },
  headerText: {
    fontWeight: "700",
    fontSize: 12
  },
  subHeaderCell: {
    borderWidth: 1,
    padding: 6,
    backgroundColor: "#cfe8d8",
    alignItems: "center",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 50
  },
  dataCell: {
    borderWidth: 1,
    padding: 6,
    width: 140,
    justifyContent: "center",
    alignItems: "center",
    height: 50
  },
  paramCell: {
    borderWidth: 1,
    backgroundColor: "#f4f7f5",
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: 220,
    height: 50,
    justifyContent: "center"
  },
  paramLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  rangeHint: {
    fontSize: 10,
    color: "#666",
  },
  input: {
    borderWidth: 1.6,
    borderRadius: 6,
    fontSize: 12,
    paddingVertical: 3,
    paddingHorizontal: 6,
    width: "95%",
    height: 30,
    textAlign: "center",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 6,
  },
  switchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#7fb88a",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 5,
  },
  switchActive: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },
  switchText: {
    fontSize: 11,
    color: "#2e7d32",
    fontWeight: "600",
  },
  switchTextActive: {
    color: "#fff",
  },
});

export default A3FlexInspectionTable;