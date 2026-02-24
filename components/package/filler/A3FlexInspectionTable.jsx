import React, { useEffect, useState, memo, useCallback, useRef, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReportHeader from "../../../components/ReportHeader";
import { api } from "../../../utils/axiosInstance";

const normalizeLine = (line) =>
  (line || "").toUpperCase().replace(/\s+/g, "_");

const HOUR_VALUE_KEYS = Array.from({ length: 12 }, (_, idx) => `jam${idx + 1}`);
const THIRTY_MIN_VALUE_KEYS = Array.from({ length: 12 }, (_, idx) => [
  `p${idx + 1}_1`,
  `p${idx + 1}_2`,
]).flat();
const TABLE_MIN_WIDTH = 320;
const SCREEN_HORIZONTAL_GUTTER = 32;

const normalizeShift = (value) => {
  const raw = String(value || "")
    .trim()
    .toUpperCase();
  if (raw === "SHIFT 1" || raw === "1" || raw === "I") return "Shift 1";
  if (raw === "SHIFT 2" || raw === "2" || raw === "II") return "Shift 2";
  if (raw === "SHIFT 3" || raw === "3" || raw === "III") return "Shift 3";
  return "";
};

const inferShiftFromCurrentHour = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return "Shift 1";
  if (hour >= 14 && hour < 22) return "Shift 2";
  return "Shift 3";
};

const getShiftHours = (shift) => {
  if (shift === "Shift 1") return [6, 7, 8, 9, 10, 11, 12, 13, 14];
  if (shift === "Shift 2") return [14, 15, 16, 17, 18, 19, 20, 21, 22];
  return [22, 23, 0, 1, 2, 3, 4, 5, 6];
};

const getShiftTimeRangeText = (shift) => {
  if (shift === "Shift 1") return "06:00 - 14:00";
  if (shift === "Shift 2") return "14:00 - 22:00";
  return "22:00 - 06:00";
};

const getThirtyMinuteLabels = () => {
  return ["00-30", "30-00"];
};

const SHIFT_CYCLE_MS = 24 * 60 * 60 * 1000;
const PRESSURE_STORAGE_PREFIX = "pressure_cache";

const normalizeCellValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (text === "-" || text.toLowerCase() === "null") return "";
  return String(value);
};

const hasNonEmptyValuesObject = (obj = {}) =>
  Object.values(obj || {}).some((value) => String(value ?? "").trim() !== "");

const hasFilledDataRows = (rows = []) =>
  Array.isArray(rows) &&
  rows.some((row) => hasNonEmptyValuesObject(row?.values || {}));

const hasFilledTableRows = (rows = []) =>
  Array.isArray(rows) &&
  rows.some((row) => hasNonEmptyValuesObject(row || {}));

const normalizeStoragePart = (value) => {
  const text = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  return text || "NA";
};

const formatDateKey = (timestamp) => {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const buildTableStateFromPressureData = (rows = []) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) =>
    Object.fromEntries(
      HOUR_VALUE_KEYS.map((key) => [key, normalizeCellValue(row?.values?.[key])])
    )
  );
};

const buildTableStateFromThirtyData = (rows = []) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) =>
    Object.fromEntries(
      THIRTY_MIN_VALUE_KEYS.map((key) => [key, normalizeCellValue(row?.values?.[key])])
    )
  );
};

const getShiftStartTimestamp = (shiftName, nowTs = Date.now()) => {
  const now = new Date(nowTs);
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  if (shiftName === "Shift 1") {
    start.setHours(6, 0, 0, 0);
    if (now.getHours() < 6) start.setDate(start.getDate() - 1);
    return start.getTime();
  }

  if (shiftName === "Shift 2") {
    start.setHours(14, 0, 0, 0);
    if (now.getHours() < 14) start.setDate(start.getDate() - 1);
    return start.getTime();
  }

  start.setHours(22, 0, 0, 0);
  if (now.getHours() < 22) start.setDate(start.getDate() - 1);
  return start.getTime();
};

const buildShiftCycleMeta = (shiftName) => {
  const shiftStartTs = getShiftStartTimestamp(shiftName);
  return {
    shift: shiftName,
    shiftStartTs,
    expiresAt: shiftStartTs + SHIFT_CYCLE_MS,
    savedAt: Date.now(),
  };
};

const isShiftCycleExpired = (meta, currentShift) => {
  if (!meta || typeof meta !== "object") return false;
  const expiresAtNum = Number(meta.expiresAt);
  if (!Number.isFinite(expiresAtNum)) return false;

  if (meta.shift && normalizeShift(meta.shift) && normalizeShift(meta.shift) !== normalizeShift(currentShift)) {
    return true;
  }
  return Date.now() >= expiresAtNum;
};

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
const PressureCheckTable = ({
  line,
  onTableDataChange,
  tableState,
  onTableStateChange,
  onUserEdit,
  layout,
  hourSlots,
  selectedHourKey,
  onSelectedHourKeyChange,
}) => {
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);
  const slots = Array.isArray(hourSlots) && hourSlots.length > 0
    ? hourSlots
    : getShiftHours("Shift 1").map((hour, idx) => ({
      key: idx + 1,
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
    }));
  const effectiveSelectedHourKey = slots.some((slot) => slot.key === selectedHourKey)
    ? selectedHourKey
    : (slots[0]?.key ?? 1);
  const selectedSlot = slots.find((slot) => slot.key === effectiveSelectedHourKey) || slots[0];
  const selectedValueKey = `jam${selectedSlot?.key || 1}`;
  const parameterColumnWidth = layout?.parameterWidth ?? 200;
  const singleValueColumnWidth = layout?.singleValueWidth ?? 120;
  const tableWidth = parameterColumnWidth + singleValueColumnWidth;

  const [table, setTable] = useState(tableState || []);
  const isSyncingFromParent = useRef(false);
  const tableRef = useRef(tableState || []);

  useEffect(() => {
    if (Array.isArray(tableState) && !isSyncingFromParent.current) {
      isSyncingFromParent.current = true;
      setTable(tableState);
      tableRef.current = tableState;
    }
  }, [tableState]);

  useEffect(() => {
    tableRef.current = table;
    isSyncingFromParent.current = false;
  }, [table]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/pressure-check?line=${line}`);
        if (cancelled) return;
        setParams(res.data);
        const hasExistingTable =
          Array.isArray(tableRef.current) && tableRef.current.length > 0;
        if (!hasExistingTable) {
          setTable(
            res.data.map(() =>
              Object.fromEntries(
                HOUR_VALUE_KEYS.map((key) => [key, ""])
              )
            )
          );
        }
      } catch (e) {
        console.log("Fetch 1 Jam error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [line]);

  const notifyParent = useCallback(() => {
    if (
      isSyncingFromParent.current ||
      table.length === 0 ||
      params.length === 0
    ) return;

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
    onTableDataChange?.(formattedData, "1jam");
  }, [table, params]);

  useEffect(() => {
    if (isSyncingFromParent.current) return;
    notifyParent();
  }, [table]);

  const updateValue = (row, col, val) => {
    onUserEdit?.();
    const base = Array.isArray(tableRef.current) ? tableRef.current : [];
    const updated = [...base];
    updated[row] = { ...(updated[row] || {}), [col]: val };
    tableRef.current = updated;
    setTable(updated);
    onTableStateChange?.(updated);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20c997" />
        <Text style={styles.loadingText}>Loading inspection data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.tableSection}>
      <View style={styles.timeSlotContainer}>
        <Text style={styles.timeSlotLabelDark}>Pilih Jam:</Text>
        <View style={styles.timeSlotGrid}>
          {slots.map((slot) => {
            const isSelected = effectiveSelectedHourKey === slot.key;
            return (
              <TouchableOpacity
                key={`hour-slot-${slot.key}`}
                style={[
                  styles.hourlySlotButton,
                  isSelected && styles.timeSlotButtonActive
                ]}
                onPress={() => onSelectedHourKeyChange?.(slot.key)}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    isSelected && styles.timeSlotTextActive
                  ]}
                >
                  {slot.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.tableCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={[styles.tableInner, { minWidth: tableWidth }]}>
            <View style={styles.headerRow}>
              <View style={[styles.headerCell, { width: parameterColumnWidth }]}>
                <Text style={styles.headerText}>Parameter</Text>
              </View>

              <View style={[styles.headerCell, { width: singleValueColumnWidth }]}>
                <Text style={styles.headerText}>Jam {selectedSlot?.label || "-"}</Text>
              </View>
            </View>

            {params.map((p, ri) => (
              <View key={ri} style={[styles.dataRow, ri % 2 === 1 && styles.dataRowAlt]}>
                <View style={[styles.paramCell, { width: parameterColumnWidth }]}>
                  <Text style={styles.paramLabel}>
                    {p.parameter_name} {p.unit ? `(${p.unit})` : ""}
                  </Text>

                  {p.value_type === "range" && (
                    <Text style={styles.rangeHint}>
                      {p.min_value} - {p.max_value} {p.unit}
                    </Text>
                  )}

                  {p.value_type === "exact" && (
                    <Text style={styles.rangeHint}>
                      Exact: {p.exact_value} {p.unit}
                    </Text>
                  )}
                </View>

                <View style={[styles.dataCell, { width: singleValueColumnWidth }]}>
                  <CellInput
                    value={table[ri]?.[selectedValueKey] || ""}
                    onChange={(v) => updateValue(ri, selectedValueKey, v)}
                    borderColor={validateValue(table[ri]?.[selectedValueKey], p)}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

/* 30 MENIT */
const ThirtyMinuteTable = ({
  line,
  onTableDataChange,
  tableState,
  onTableStateChange,
  onUserEdit,
  layout,
  hourSlots,
  selectedHourKey,
  onSelectedHourKeyChange,
}) => {
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);
  const slots = Array.isArray(hourSlots) && hourSlots.length > 0
    ? hourSlots
    : getShiftHours("Shift 1").map((hour, idx) => ({
      key: idx + 1,
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
    }));
  const effectiveSelectedHourKey = slots.some((slot) => slot.key === selectedHourKey)
    ? selectedHourKey
    : (slots[0]?.key ?? 1);
  const selectedSlot = slots.find((slot) => slot.key === effectiveSelectedHourKey) || slots[0];
  const selectedFirstHalfKey = `p${selectedSlot?.key || 1}_1`;
  const selectedSecondHalfKey = `p${selectedSlot?.key || 1}_2`;
  const [firstHalfLabel, secondHalfLabel] = getThirtyMinuteLabels();
  const parameterColumnWidth = layout?.parameterWidth ?? 200;
  const firstHalfWidth = layout?.dualValueFirstWidth ?? 70;
  const secondHalfWidth = layout?.dualValueSecondWidth ?? 70;
  const packColumnWidth = firstHalfWidth + secondHalfWidth;
  const tableWidth = parameterColumnWidth + packColumnWidth;

  const [table, setTable] = useState(() => tableState || []);
  const isSyncingFromParent = useRef(false);
  const tableRef = useRef(tableState || []);

  useEffect(() => {
    if (Array.isArray(tableState) && !isSyncingFromParent.current) {
      isSyncingFromParent.current = true;
      setTable(tableState);
      tableRef.current = tableState;
    }
  }, [tableState]);

  useEffect(() => {
    tableRef.current = table;
    isSyncingFromParent.current = false;
  }, [table]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/pressure-check-30min?line=${line}`);
        setParams(res.data);
        const hasExistingTable =
          Array.isArray(tableRef.current) && tableRef.current.length > 0;
        if (!hasExistingTable) {
          setTable(
            res.data.map(() =>
              Object.fromEntries(
                THIRTY_MIN_VALUE_KEYS.map((key) => [key, ""])
              )
            )
          );
        }
      } catch (e) {
        console.log("Fetch 30 menit error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [line]);

  const notifyParent = useCallback(() => {
    if (
      isSyncingFromParent.current ||
      table.length === 0 ||
      params.length === 0
    ) return;
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
  }, [table, params]);

  useEffect(() => {
    if (isSyncingFromParent.current) return;
    notifyParent();
  }, [table]);

  const updateValue = (rowIdx, colKey, value) => {
    onUserEdit?.();
    const base = Array.isArray(tableRef.current) ? tableRef.current : [];
    const updated = [...base];
    updated[rowIdx] = { ...(updated[rowIdx] || {}), [colKey]: value };
    tableRef.current = updated;
    setTable(updated);
    onTableStateChange?.(updated);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20c997" />
        <Text style={styles.loadingText}>Loading inspection data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.tableSection}>
      <View style={styles.timeSlotContainer}>
        <Text style={styles.timeSlotLabelDark}>Pilih Jam:</Text>
        <View style={styles.timeSlotGrid}>
          {slots.map((slot) => {
            const isSelected = effectiveSelectedHourKey === slot.key;
            return (
              <TouchableOpacity
                key={`hour-slot-30min-${slot.key}`}
                style={[
                  styles.hourlySlotButton,
                  isSelected && styles.timeSlotButtonActive
                ]}
                onPress={() => onSelectedHourKeyChange?.(slot.key)}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    isSelected && styles.timeSlotTextActive
                  ]}
                >
                  {slot.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.tableCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={[styles.tableInner, { minWidth: tableWidth }]}>
            <View style={styles.headerRow}>
              <View style={[styles.headerCell, { width: parameterColumnWidth }]}>
                <Text style={styles.headerText}>Parameter</Text>
              </View>

              <View style={[styles.headerCell, { width: packColumnWidth }]}>
                <Text style={styles.headerText}>Jam {selectedSlot?.label || "-"}</Text>
              </View>
            </View>

            <View style={styles.headerRow}>
              <View style={[styles.headerCell, { width: parameterColumnWidth }]} />

              <View style={{ flexDirection: "row" }}>
                <View style={[styles.subHeaderCell, { width: firstHalfWidth }]}>
                  <Text style={styles.subHeaderText}>{firstHalfLabel}</Text>
                </View>
                <View style={[styles.subHeaderCell, { width: secondHalfWidth }]}>
                  <Text style={styles.subHeaderText}>{secondHalfLabel}</Text>
                </View>
              </View>
            </View>

            {params.map((p, ri) => (
              <View key={ri} style={[styles.dataRow, ri % 2 === 1 && styles.dataRowAlt]}>
                <View style={[styles.paramCell, { width: parameterColumnWidth }]}>
                  <Text style={styles.paramLabel}>
                    {p.parameter_name} {p.unit ? `(${p.unit})` : ""}
                  </Text>

                  {p.value_type === "range" && (
                    <Text style={styles.rangeHint}>
                      {p.min_value} - {p.max_value} {p.unit}
                    </Text>
                  )}
                  {p.value_type === "exact" && (
                    <Text style={styles.rangeHint}>
                      Exact: {p.exact_value} {p.unit}
                    </Text>
                  )}
                </View>

                <View style={[styles.dataCell, { width: firstHalfWidth }]}>
                  <CellInput
                    value={table[ri]?.[selectedFirstHalfKey] || ""}
                    onChange={(v) => updateValue(ri, selectedFirstHalfKey, v)}
                    borderColor={validateValue(table[ri]?.[selectedFirstHalfKey], p)}
                  />
                </View>

                <View style={[styles.dataCell, { width: secondHalfWidth }]}>
                  <CellInput
                    value={table[ri]?.[selectedSecondHalfKey] || ""}
                    onChange={(v) => updateValue(ri, selectedSecondHalfKey, v)}
                    borderColor={validateValue(table[ri]?.[selectedSecondHalfKey], p)}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

/* MAIN VIEW WRAPPER */
const A3FlexInspectionTable = ({
  plant = "",
  line = "LINE_E",
  machine = "",
  shift,
  username = "",
  packageName,
  contextKey,
  onDataChange,  // Terima callback dari parent
  initialData
}) => {
  const [tab, setTab] = useState("1jam");
  const [selectedHourKey, setSelectedHourKey] = useState(1);
  const [pressureData, setPressureData] = useState([]);
  const [thirtyMinData, setThirtyMinData] = useState([]);
  const [readyToEmit, setReadyToEmit] = useState(false);
  const [tableChangeVersion, setTableChangeVersion] = useState(0);
  const tableCacheRef = useRef({});
  const latestPayloadRef = useRef(null);
  const hydratedContextRef = useRef("");
  const userEditedRef = useRef(false);
  const pressureDataRef = useRef([]);
  const thirtyMinDataRef = useRef([]);
  const { width: screenWidth } = useWindowDimensions();

  const tableLayout = useMemo(() => {
    const availableWidth = Math.max(
      TABLE_MIN_WIDTH,
      Math.round(screenWidth - SCREEN_HORIZONTAL_GUTTER)
    );
    const parameterWidth = Math.round(availableWidth * 0.6);
    const singleValueWidth = availableWidth - parameterWidth;
    const dualValueFirstWidth = Math.floor(singleValueWidth / 2);
    const dualValueSecondWidth = singleValueWidth - dualValueFirstWidth;

    return {
      parameterWidth,
      singleValueWidth,
      dualValueFirstWidth,
      dualValueSecondWidth,
    };
  }, [screenWidth]);

  const activeShift = useMemo(
    () => normalizeShift(shift) || inferShiftFromCurrentHour(),
    [shift]
  );
  const storageKeys = useMemo(() => {
    const shiftStartTs = getShiftStartTimestamp(activeShift);
    const shiftDateKey = formatDateKey(shiftStartTs);
    const shiftScopedKey = [
      PRESSURE_STORAGE_PREFIX,
      normalizeStoragePart(plant),
      normalizeStoragePart(line),
      normalizeStoragePart(machine),
      normalizeStoragePart(activeShift),
      shiftDateKey,
    ].join("_");

    return {
      context: contextKey
        ? `${PRESSURE_STORAGE_PREFIX}_ctx_${normalizeStoragePart(contextKey)}`
        : null,
      shiftScoped: shiftScopedKey,
    };
  }, [plant, line, machine, activeShift, contextKey]);

  const hourSlots = useMemo(
    () =>
      getShiftHours(activeShift).map((hour, idx) => ({
        key: idx + 1,
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
      })),
    [activeShift]
  );

  useEffect(() => {
    if (!hourSlots.length) return;
    const currentHour = new Date().getHours();
    const currentSlot = hourSlots.find((slot) => slot.hour === currentHour);
    if (currentSlot) {
      setSelectedHourKey(currentSlot.key);
      return;
    }

    // Fallback jika jam realtime tidak masuk rentang shift terpilih.
    let nearestSlot = hourSlots[0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const slot of hourSlots) {
      const direct = Math.abs(slot.hour - currentHour);
      const wrap = 24 - direct;
      const distance = Math.min(direct, wrap);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSlot = slot;
      }
    }
    setSelectedHourKey(nearestSlot.key);
  }, [hourSlots]);

  const getTableCacheKey = useCallback((mode) => `${line}_${mode}`, [line]);

  const getCachedTable = useCallback((mode) => {
    const key = getTableCacheKey(mode);
    const cached = tableCacheRef.current[key];
    if (!Array.isArray(cached) || cached.length === 0) return undefined;
    return cached;
  }, [getTableCacheKey]);

  const setCachedTable = useCallback((mode, tableState) => {
    const key = getTableCacheKey(mode);
    tableCacheRef.current[key] = Array.isArray(tableState) ? tableState : [];
  }, [getTableCacheKey]);

  const handleTableStateChange = useCallback((mode, tableState) => {
    if (hasFilledTableRows(tableState)) {
      userEditedRef.current = true;
    }
    setCachedTable(mode, tableState);
    setTableChangeVersion((prev) => prev + 1);
  }, [setCachedTable]);
  const markUserEdited = useCallback(() => {
    userEditedRef.current = true;
  }, []);
  const persistPayloadToStorage = useCallback(async (payload) => {
    if (!Array.isArray(payload) || payload.length === 0) return;
    const serialized = JSON.stringify(payload);
    const keys = [storageKeys.context, storageKeys.shiftScoped].filter(Boolean);
    await Promise.all(
      keys.map((key) =>
        AsyncStorage.setItem(key, serialized).catch((err) => {
          console.log("Save pressure cache error:", err);
        })
      )
    );
  }, [storageKeys]);
  const clearStoragePayload = useCallback(async () => {
    const keys = [storageKeys.context, storageKeys.shiftScoped].filter(Boolean);
    await Promise.all(
      keys.map((key) =>
        AsyncStorage.removeItem(key).catch((err) => {
          console.log("Clear pressure cache error:", err);
        })
      )
    );
  }, [storageKeys]);
  const loadPayloadFromStorage = useCallback(async () => {
    const keys = [storageKeys.context, storageKeys.shiftScoped].filter(Boolean);
    for (const key of keys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.log("Load pressure cache error:", err);
      }
    }
    return null;
  }, [storageKeys]);

  const isPressure = packageName === "PENGECEKAN PRESSURE";

  // Callback untuk menerima data dari child tables
  const handleTableDataChange = useCallback((data, type) => {
    if (hasFilledDataRows(data)) {
      userEditedRef.current = true;
    }
    if (type === "1jam") {
      setPressureData(data);
    } else if (type === "30min") {
      setThirtyMinData(data);
    }
  }, []);
  useEffect(() => {
    pressureDataRef.current = pressureData;
  }, [pressureData]);
  useEffect(() => {
    thirtyMinDataRef.current = thirtyMinData;
  }, [thirtyMinData]);
  const clearInspectionState = useCallback(() => {
    userEditedRef.current = false;
    setPressureData([]);
    setThirtyMinData([]);
    setCachedTable("1jam", []);
    setCachedTable("30min", []);
    setTab("1jam");
  }, [setCachedTable]);
  const applyHydratedPayload = useCallback((payloadRows, contextMarker) => {
    const initial = Array.isArray(payloadRows) && payloadRows.length > 0
      ? payloadRows[0]
      : null;
    if (!initial) return false;

    const nextPressure = Array.isArray(initial?.pressureCheck1Jam)
      ? initial.pressureCheck1Jam
      : [];
    const nextThirty = Array.isArray(initial?.pressureCheck30Min)
      ? initial.pressureCheck30Min
      : [];
    const nextTable1 = Array.isArray(initial?.tableState1Jam) && initial.tableState1Jam.length > 0
      ? initial.tableState1Jam
      : buildTableStateFromPressureData(nextPressure);
    const nextTable30 = Array.isArray(initial?.tableState30Min) && initial.tableState30Min.length > 0
      ? initial.tableState30Min
      : buildTableStateFromThirtyData(nextThirty);

    userEditedRef.current = false;
    setPressureData(nextPressure);
    setThirtyMinData(nextThirty);
    setCachedTable("1jam", nextTable1);
    setCachedTable("30min", nextTable30);
    setTab(initial?.activeTab === "30min" ? "30min" : "1jam");

    const incomingHourKey = Number(initial?.selectedHourKey);
    if (
      Number.isFinite(incomingHourKey) &&
      hourSlots.some((slot) => slot.key === incomingHourKey)
    ) {
      setSelectedHourKey(incomingHourKey);
    }

    hydratedContextRef.current = contextMarker;
    setReadyToEmit(true);
    return true;
  }, [hourSlots, setCachedTable]);

  useEffect(() => {
    let cancelled = false;
    const contextMarker = contextKey || `${line}|${activeShift}`;
    const isFirstHydrationForContext = hydratedContextRef.current !== contextMarker;

    const hydrate = async () => {
      const incomingRows = Array.isArray(initialData) && initialData.length > 0
        ? initialData
        : null;
      const incomingInitial = incomingRows?.[0] || null;

      if (incomingInitial) {
        // Prevent feedback-loop rehydrate while user is editing in same context.
        // Parent cache updates can push new initialData references frequently.
        if (!isFirstHydrationForContext) {
          if (userEditedRef.current) {
            return;
          }

          const tableKey1 = `${line}_1jam`;
          const tableKey30 = `${line}_30min`;
          const hasLocalInput =
            hasFilledDataRows(pressureDataRef.current) ||
            hasFilledDataRows(thirtyMinDataRef.current) ||
            hasFilledTableRows(tableCacheRef.current[tableKey1]) ||
            hasFilledTableRows(tableCacheRef.current[tableKey30]);

          // Still allow hydrate if local state is empty and new data arrives later.
          if (hasLocalInput) {
            return;
          }
        }

        if (isShiftCycleExpired(incomingInitial?.cacheMeta, activeShift)) {
          await clearStoragePayload();
          if (cancelled) return;
          clearInspectionState();
          hydratedContextRef.current = contextMarker;
          setReadyToEmit(true);
          return;
        }

        if (!cancelled) {
          applyHydratedPayload(incomingRows, contextMarker);
        }
        return;
      }

      if (!isFirstHydrationForContext) {
        if (!cancelled) {
          setReadyToEmit(true);
        }
        return;
      }

      const localRows = await loadPayloadFromStorage();
      if (cancelled) return;

      const localInitial = Array.isArray(localRows) ? localRows[0] : null;
      if (localInitial) {
        if (isShiftCycleExpired(localInitial?.cacheMeta, activeShift)) {
          await clearStoragePayload();
        } else {
          applyHydratedPayload(localRows, contextMarker);
          return;
        }
      }

      clearInspectionState();
      hydratedContextRef.current = contextMarker;
      setReadyToEmit(true);
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [
    initialData,
    contextKey,
    line,
    activeShift,
    clearInspectionState,
    applyHydratedPayload,
    loadPayloadFromStorage,
    clearStoragePayload,
  ]);

  const buildCombinedPayload = useCallback(() => {
    const tableState1Jam =
      getCachedTable("1jam") || buildTableStateFromPressureData(pressureData);
    const tableState30Min =
      getCachedTable("30min") || buildTableStateFromThirtyData(thirtyMinData);

    return [
      {
        pressureCheck1Jam: pressureData,
        pressureCheck30Min: thirtyMinData,
        tableState1Jam,
        tableState30Min,
        selectedHourKey,
        submittedBy: username || undefined,
        submitBy: username || undefined,
        username: username || undefined,
        packageType: packageName,
        line,
        shift: activeShift,
        activeTab: tab,
        cacheMeta: buildShiftCycleMeta(activeShift),
      }
    ];
  }, [
    pressureData,
    thirtyMinData,
    selectedHourKey,
    username,
    packageName,
    line,
    activeShift,
    tab,
    getCachedTable,
  ]);

  const savePressureSnapshot = useCallback(() => {
    if (!readyToEmit) return null;
    const payload = buildCombinedPayload();
    latestPayloadRef.current = payload;
    persistPayloadToStorage(payload);
    onDataChange?.(payload);
    return payload;
  }, [readyToEmit, buildCombinedPayload, persistPayloadToStorage, onDataChange]);

  useEffect(() => {
    if (!readyToEmit) return;

    const combinedData = buildCombinedPayload();
    latestPayloadRef.current = combinedData;
    persistPayloadToStorage(combinedData);

    const timeoutId = setTimeout(() => {
      onDataChange?.(combinedData);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    readyToEmit,
    buildCombinedPayload,
    tableChangeVersion,
    persistPayloadToStorage,
    onDataChange,
  ]);

  useEffect(() => {
    const clearPressureSnapshot = async () => {
      await clearStoragePayload();
      latestPayloadRef.current = null;
    };

    globalThis.pressureBeforeSubmit = savePressureSnapshot;
    globalThis.pressureAfterSubmitClear = clearPressureSnapshot;
    return () => {
      if (globalThis.pressureBeforeSubmit === savePressureSnapshot) {
        delete globalThis.pressureBeforeSubmit;
      }
      if (globalThis.pressureAfterSubmitClear === clearPressureSnapshot) {
        delete globalThis.pressureAfterSubmitClear;
      }
    };
  }, [savePressureSnapshot, clearStoragePayload]);

  useEffect(() => {
    return () => {
      if (!readyToEmit) return;
      const payload = buildCombinedPayload();
      latestPayloadRef.current = payload;
      persistPayloadToStorage(payload);
      onDataChange?.(payload);
    };
  }, [readyToEmit, buildCombinedPayload, persistPayloadToStorage, onDataChange]);

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
    <View style={styles.container}>
      <ReportHeader
        title="LAPORAN MESIN A3 / FLEX"
        headerMeta={getHeaderMeta(line)}
      />

      <View style={styles.shiftInfo}>
        <Text style={styles.shiftText}>Input Pengecekan Pressure</Text>
        <Text style={styles.shiftTimeText}>Line Aktif: {line}</Text>
        <Text style={styles.shiftTimeText}>
          Shift: {activeShift} ({getShiftTimeRangeText(activeShift)})
        </Text>
      </View>

      {/* TOGGLE */}
      <View style={styles.toggleRowWrapper}>
        <TouchableOpacity
          style={[styles.toggleButton, tab === "1jam" && styles.toggleButtonActive]}
          onPress={() => {
            setTab("1jam");
          }}
        >
          <Text style={[styles.toggleButtonText, tab === "1jam" && styles.toggleButtonTextActive]}>
            Per Jam
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, tab === "30min" && styles.toggleButtonActive]}
          onPress={() => {
            setTab("30min");
          }}
        >
          <Text style={[styles.toggleButtonText, tab === "30min" && styles.toggleButtonTextActive]}>
            Per 30 Menit
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {isPressure && tab === "1jam" && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PEMERIKSAAN PER JAM</Text>
            </View>
            <PressureCheckTable
              key={`pressure1-${line}`}
              line={line}
              onTableDataChange={handleTableDataChange}
              tableState={getCachedTable("1jam")}
              onTableStateChange={(t) => handleTableStateChange("1jam", t)}
              onUserEdit={markUserEdited}
              layout={tableLayout}
              hourSlots={hourSlots}
              selectedHourKey={selectedHourKey}
              onSelectedHourKeyChange={setSelectedHourKey}
            />
          </>
        )}

        {isPressure && tab === "30min" && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PEMERIKSAAN PER 30 MENIT</Text>
            </View>
            <ThirtyMinuteTable
              key={`30min-${line}`}
              line={line}
              onTableDataChange={handleTableDataChange}
              tableState={getCachedTable("30min")}
              onTableStateChange={(t) => handleTableStateChange("30min", t)}
              onUserEdit={markUserEdited}
              layout={tableLayout}
              hourSlots={hourSlots}
              selectedHourKey={selectedHourKey}
              onSelectedHourKeyChange={setSelectedHourKey}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
};

/* STYLES */
const styles = StyleSheet.create({
  container: { width: "100%", marginTop: 12, paddingBottom: 8 },
  contentContainer: { paddingHorizontal: 12, paddingBottom: 24 },
  shiftInfo: {
    backgroundColor: "#1497ac",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0e7f90",
  },
  shiftText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  shiftTimeText: { color: "#eefbff", fontSize: 13, marginTop: 2, fontWeight: "500" },
  toggleRowWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: "#ecfff5",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 18,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#baeccc",
    marginHorizontal: 4,
  },
  toggleButtonActive: { backgroundColor: "#17b466", borderColor: "#149e59" },
  toggleButtonText: { color: "#1c8f4a", fontWeight: "700", fontSize: 12, textAlign: "center" },
  toggleButtonTextActive: { color: "#fff" },
  sectionHeader: {
    backgroundColor: "#28a745",
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center", letterSpacing: 0.2 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 10, color: "#6c757d", fontSize: 14 },
  tableSection: { marginBottom: 6 },
  timeSlotContainer: { marginBottom: 10 },
  timeSlotLabelDark: { color: "#212529", fontSize: 14, marginBottom: 8, fontWeight: "600" },
  timeSlotGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
  hourlySlotButton: {
    backgroundColor: "#fff",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
    minWidth: 66,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d9e6df",
  },
  timeSlotButtonActive: { backgroundColor: "#20c997", borderColor: "#20c997" },
  timeSlotText: { color: "#28a745", fontSize: 12, fontWeight: "600" },
  timeSlotTextActive: { color: "#fff" },
  tableCard: {
    borderWidth: 1,
    borderColor: "#dce6e1",
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  tableScrollContent: {
    paddingBottom: 2,
  },
  tableInner: {
    backgroundColor: "#fff",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  headerCell: {
    borderWidth: 1,
    borderColor: "#e3ebe7",
    paddingVertical: 8,
    backgroundColor: "#20c997",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  headerText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 12,
  },
  subHeaderCell: {
    borderWidth: 1,
    borderColor: "#e3ebe7",
    padding: 6,
    backgroundColor: "#20c997",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
  },
  subHeaderText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#fff",
  },
  dataRowAlt: {
    backgroundColor: "#fcfdfd",
  },
  dataCell: {
    borderWidth: 1,
    borderColor: "#e3ebe7",
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 56,
    backgroundColor: "#fff",
  },
  paramCell: {
    borderWidth: 1,
    borderColor: "#e3ebe7",
    backgroundColor: "#f6f8f9",
    paddingVertical: 10,
    paddingHorizontal: 10,
    minHeight: 56,
    justifyContent: "center",
  },
  paramLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2933",
    lineHeight: 17,
  },
  rangeHint: {
    fontSize: 11,
    color: "#6c757d",
    marginTop: 2,
    lineHeight: 14,
  },
  input: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 7,
    width: "100%",
    maxWidth: 120,
    minHeight: 38,
    backgroundColor: "#fff",
    color: "#1f2933",
  },
});

export default A3FlexInspectionTable;
