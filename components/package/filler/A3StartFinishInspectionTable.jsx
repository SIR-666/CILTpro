import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReportHeader from "../../../components/ReportHeader";

const TABLE_MIN_WIDTH = 360;
const SCREEN_HORIZONTAL_GUTTER = 32;
const NO_COL_WIDTH = 56;
const START_FINISH_STORAGE_PREFIX = "cilt_start_finish_draft";

const normalizeLine = (line) => (line || "").toUpperCase().replace(/\s+/g, "_");
const normalizeShift = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "SHIFT 1" || raw === "1" || raw === "I") return "Shift 1";
  if (raw === "SHIFT 2" || raw === "2" || raw === "II") return "Shift 2";
  if (raw === "SHIFT 3" || raw === "3" || raw === "III") return "Shift 3";
  return "Shift 1";
};

const getShiftTimeRangeText = (shift) => {
  if (shift === "Shift 1") return "06:00 - 14:00";
  if (shift === "Shift 2") return "14:00 - 22:00";
  return "22:00 - 06:00";
};

const getHeaderMeta = (line) => {
  const ln = normalizeLine(line);
  switch (ln) {
    case "LINE_E":
      return { frm: "FIL - 052 - 12", rev: "", berlaku: "1 - Jul - 24", hal: "2 dari 5" };
    case "LINE_F":
    case "LINE_G":
      return { frm: "FIL - 081 - 08", rev: "", berlaku: "10 - Oct - 22", hal: "2 dari 5" };
    default:
      return { frm: "-", rev: "-", berlaku: "-", hal: "2 dari 5" };
  }
};

const START_COLUMNS = [
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

const FINISH_COLUMNS = [...START_COLUMNS, { key: "remarks", label: "Remarks" }];

const createEmptyRowFromColumns = (columns) =>
  Object.fromEntries(columns.map((column) => [column.key, ""]));

const hasRowValue = (row = {}) =>
  Object.values(row || {}).some((value) => String(value ?? "").trim() !== "");

const createInitialRows = (columns) => [createEmptyRowFromColumns(columns), createEmptyRowFromColumns(columns)];

const hydrateRows = (rows, columns) => {
  if (!Array.isArray(rows) || rows.length === 0) return createInitialRows(columns);
  const normalized = rows.map((row) =>
    Object.fromEntries(columns.map((column) => [column.key, String(row?.[column.key] ?? "")]))
  );
  return hasRowValue(normalized[normalized.length - 1])
    ? [...normalized, createEmptyRowFromColumns(columns)]
    : normalized;
};

const cleanRowsForSubmit = (rows = []) =>
  (Array.isArray(rows) ? rows : []).filter((row) => hasRowValue(row));

const normalizeRows = (rows, columns) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) =>
      Object.fromEntries(columns.map((column) => [column.key, String(row?.[column.key] ?? "")]))
    )
    .filter((row) => hasRowValue(row));
};

const buildSnapshotPayload = (startRows, finishRows, tab) =>
  JSON.stringify({
    startProduksi: cleanRowsForSubmit(startRows),
    finishProduksi: cleanRowsForSubmit(finishRows),
    activeTab: tab === "finish" ? "finish" : "start",
  });

const normalizeStoragePart = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "na";

const hasMeaningfulPayloadRows = (item = {}) => {
  const startCount = Array.isArray(item?.startProduksi) ? item.startProduksi.length : 0;
  const finishCount = Array.isArray(item?.finishProduksi) ? item.finishProduksi.length : 0;
  return startCount > 0 || finishCount > 0;
};

const CellInput = memo(({ value, onChange, placeholder }) => (
  <TextInput
    style={styles.input}
    value={value}
    onChangeText={onChange}
    placeholder={placeholder || "-"}
    placeholderTextColor="#9aa2a8"
    keyboardType="numeric"
    inputMode="numeric"
  />
));
CellInput.displayName = "CellInput";

const DynamicTable = ({ columns, rows, onRowsChange, layout }) => {
  const columnWidth = layout?.columnWidth ?? 130;
  const tableWidth = NO_COL_WIDTH + columns.length * columnWidth;

  const handleChange = useCallback(
    (rowIndex, key, value) => {
      const baseRows = Array.isArray(rows) && rows.length > 0 ? rows : createInitialRows(columns);
      const updated = baseRows.map((row) => ({ ...row }));
      if (!updated[rowIndex]) updated[rowIndex] = createEmptyRowFromColumns(columns);
      updated[rowIndex][key] = value;

      const lastRow = updated[updated.length - 1] || {};
      if (hasRowValue(lastRow)) {
        updated.push(createEmptyRowFromColumns(columns));
      }

      onRowsChange?.(updated);
    },
    [rows, columns, onRowsChange]
  );

  return (
    <View style={styles.tableCard}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tableScrollContent}
      >
        <View style={[styles.tableInner, { minWidth: tableWidth }]}>
          <View style={styles.headerRow}>
            <View style={[styles.headerCell, { width: NO_COL_WIDTH }]}>
              <Text style={styles.headerText}>No</Text>
            </View>
            {columns.map((column) => (
              <View key={column.key} style={[styles.headerCell, { width: columnWidth }]}>
                <Text style={styles.headerText}>{column.label}</Text>
              </View>
            ))}
          </View>

          {rows.map((row, rowIndex) => (
            <View
              key={`row-${rowIndex}`}
              style={[styles.dataRow, rowIndex % 2 === 1 && styles.dataRowAlt]}
            >
              <View style={[styles.rowNumberCell, { width: NO_COL_WIDTH }]}>
                <Text style={styles.rowNumberText}>{rowIndex + 1}</Text>
              </View>
              {columns.map((column) => (
                <View key={`${rowIndex}-${column.key}`} style={[styles.dataCell, { width: columnWidth }]}>
                  <CellInput
                    value={row?.[column.key] || ""}
                    placeholder={column.label}
                    onChange={(text) => handleChange(rowIndex, column.key, text)}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const A3StartFinishInspectionTable = ({
  line,
  plant,
  machine,
  shift,
  username,
  packageName,
  contextKey,
  onDataChange,
  initialData,
}) => {
  const [tab, setTab] = useState("start");
  const [startRows, setStartRows] = useState(() => createInitialRows(START_COLUMNS));
  const [finishRows, setFinishRows] = useState(() => createInitialRows(FINISH_COLUMNS));
  const [readyToEmit, setReadyToEmit] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastEmittedSnapshotRef = useRef("");
  const lastAppliedIncomingSnapshotRef = useRef("");
  const { width: screenWidth } = useWindowDimensions();

  const activeShift = useMemo(() => normalizeShift(shift), [shift]);
  const tableLayout = useMemo(() => {
    const availableWidth = Math.max(TABLE_MIN_WIDTH, Math.round(screenWidth - SCREEN_HORIZONTAL_GUTTER));
    const columnWidth = Math.max(120, Math.round(availableWidth * 0.32));
    return { columnWidth };
  }, [screenWidth]);
  const storageKeys = useMemo(() => {
    const contextStorageKey = contextKey
      ? `${START_FINISH_STORAGE_PREFIX}_ctx_${normalizeStoragePart(contextKey)}`
      : null;
    const shiftStorageKey = contextStorageKey
      ? null
      : [
          START_FINISH_STORAGE_PREFIX,
          normalizeStoragePart(plant),
          normalizeStoragePart(line),
          normalizeStoragePart(machine),
          normalizeStoragePart(activeShift),
        ].join("_");
    return {
      context: contextStorageKey,
      shiftScoped: shiftStorageKey,
    };
  }, [contextKey, plant, line, machine, activeShift]);
  const persistPayloadToStorage = useCallback(async (payload) => {
    if (!Array.isArray(payload) || payload.length === 0) return;
    const serialized = JSON.stringify(payload);
    const keys = [storageKeys.context, storageKeys.shiftScoped].filter(Boolean);
    await Promise.all(
      keys.map((key) =>
        AsyncStorage.setItem(key, serialized).catch((err) => {
          console.log("Save Start&Finish cache error:", err);
        })
      )
    );
  }, [storageKeys]);
  const clearStoragePayload = useCallback(async () => {
    const keys = [storageKeys.context, storageKeys.shiftScoped].filter(Boolean);
    await Promise.all(
      keys.map((key) =>
        AsyncStorage.removeItem(key).catch((err) => {
          console.log("Clear Start&Finish cache error:", err);
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
        console.log("Load Start&Finish cache error:", err);
      }
    }
    return null;
  }, [storageKeys]);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const initial = Array.isArray(initialData) && initialData.length > 0 ? initialData[0] : null;
      if (!initial) {
        if (!hasInitializedRef.current) {
          const localRows = await loadPayloadFromStorage();
          if (cancelled) return;
          const localInitial =
            Array.isArray(localRows) && localRows.length > 0 ? localRows[0] : null;
          if (hasMeaningfulPayloadRows(localInitial)) {
            const localStart = normalizeRows(localInitial?.startProduksi, START_COLUMNS);
            const localFinish = normalizeRows(localInitial?.finishProduksi, FINISH_COLUMNS);
            const localTab = localInitial?.activeTab === "finish" ? "finish" : "start";
            const nextStartRows = hydrateRows(localStart, START_COLUMNS);
            const nextFinishRows = hydrateRows(localFinish, FINISH_COLUMNS);
            setStartRows(nextStartRows);
            setFinishRows(nextFinishRows);
            setTab(localTab);
            setReadyToEmit(true);
            hasInitializedRef.current = true;
            lastAppliedIncomingSnapshotRef.current = JSON.stringify({
              startProduksi: localStart,
              finishProduksi: localFinish,
              activeTab: localTab,
            });
            return;
          }

          const defaultStart = createInitialRows(START_COLUMNS);
          const defaultFinish = createInitialRows(FINISH_COLUMNS);
          setStartRows(defaultStart);
          setFinishRows(defaultFinish);
          setTab("start");
          setReadyToEmit(true);
          hasInitializedRef.current = true;
          lastAppliedIncomingSnapshotRef.current = buildSnapshotPayload(defaultStart, defaultFinish, "start");
        }
        return;
      }

      const normalizedStart = normalizeRows(initial?.startProduksi, START_COLUMNS);
      const normalizedFinish = normalizeRows(initial?.finishProduksi, FINISH_COLUMNS);
      const nextTab = initial?.activeTab === "finish" ? "finish" : "start";
      const incomingSnapshot = JSON.stringify({
        startProduksi: normalizedStart,
        finishProduksi: normalizedFinish,
        activeTab: nextTab,
      });

      // Ignore parent echo from our own latest emit to prevent rehydrate loop.
      if (incomingSnapshot === lastEmittedSnapshotRef.current) {
        if (!hasInitializedRef.current) {
          setReadyToEmit(true);
          hasInitializedRef.current = true;
        }
        return;
      }

      // Ignore duplicate hydrate payload.
      if (incomingSnapshot === lastAppliedIncomingSnapshotRef.current) {
        if (!hasInitializedRef.current) {
          setReadyToEmit(true);
          hasInitializedRef.current = true;
        }
        return;
      }

      const nextStartRows = hydrateRows(normalizedStart, START_COLUMNS);
      const nextFinishRows = hydrateRows(normalizedFinish, FINISH_COLUMNS);
      setStartRows(nextStartRows);
      setFinishRows(nextFinishRows);
      setTab(nextTab);
      setReadyToEmit(true);
      hasInitializedRef.current = true;
      lastAppliedIncomingSnapshotRef.current = incomingSnapshot;
      if (hasMeaningfulPayloadRows({ startProduksi: normalizedStart, finishProduksi: normalizedFinish })) {
        persistPayloadToStorage([
          {
            startProduksi: normalizedStart,
            finishProduksi: normalizedFinish,
            activeTab: nextTab,
          },
        ]);
      }
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [initialData, loadPayloadFromStorage, persistPayloadToStorage]);

  const buildCombinedPayload = useCallback(() => {
    const cleanedStartRows = cleanRowsForSubmit(startRows);
    const cleanedFinishRows = cleanRowsForSubmit(finishRows);

    return [
      {
        startProduksi: cleanedStartRows,
        finishProduksi: cleanedFinishRows,
        submittedBy: username || undefined,
        submitBy: username || undefined,
        username: username || undefined,
        packageType: packageName,
        line,
        plant,
        machine,
        activeTab: tab,
      },
    ];
  }, [startRows, finishRows, username, packageName, line, plant, machine, tab]);

  useEffect(() => {
    if (!readyToEmit) return;
    const combinedData = buildCombinedPayload();
    const payloadItem = combinedData[0] || {};
    if (!hasMeaningfulPayloadRows(payloadItem)) return;
    const snapshot = JSON.stringify({
      startProduksi: payloadItem.startProduksi || [],
      finishProduksi: payloadItem.finishProduksi || [],
      activeTab: payloadItem.activeTab || "start",
    });
    if (snapshot === lastEmittedSnapshotRef.current) return;

    lastEmittedSnapshotRef.current = snapshot;
    persistPayloadToStorage(combinedData);
    onDataChange?.(combinedData);
  }, [readyToEmit, buildCombinedPayload, persistPayloadToStorage, onDataChange]);

  const saveStartFinishSnapshot = useCallback(() => {
    const payload = buildCombinedPayload();
    const payloadItem = payload[0] || {};
    if (!hasMeaningfulPayloadRows(payloadItem)) return null;
    lastEmittedSnapshotRef.current = JSON.stringify({
      startProduksi: payloadItem.startProduksi || [],
      finishProduksi: payloadItem.finishProduksi || [],
      activeTab: payloadItem.activeTab || "start",
    });
    persistPayloadToStorage(payload);
    onDataChange?.(payload);
    return payload;
  }, [buildCombinedPayload, persistPayloadToStorage, onDataChange]);

  useEffect(() => {
    const clearStartFinishSnapshot = async () => {
      await clearStoragePayload();
    };
    globalThis.startFinishBeforeSubmit = saveStartFinishSnapshot;
    globalThis.startFinishAfterSubmitClear = clearStartFinishSnapshot;
    return () => {
      if (globalThis.startFinishBeforeSubmit === saveStartFinishSnapshot) {
        delete globalThis.startFinishBeforeSubmit;
      }
      if (globalThis.startFinishAfterSubmitClear === clearStartFinishSnapshot) {
        delete globalThis.startFinishAfterSubmitClear;
      }
    };
  }, [saveStartFinishSnapshot, clearStoragePayload]);

  return (
    <View style={styles.container}>
      <ReportHeader title="START & FINISH PRODUKSI" headerMeta={getHeaderMeta(line)} />

      <View style={styles.shiftInfo}>
        <Text style={styles.shiftText}>Input Start & Finish Produksi</Text>
        <Text style={styles.shiftTimeText}>Line Aktif: {line}</Text>
        <Text style={styles.shiftTimeText}>
          Shift: {activeShift} ({getShiftTimeRangeText(activeShift)})
        </Text>
      </View>

      <View style={styles.toggleRowWrapper}>
        <TouchableOpacity
          style={[styles.toggleButton, tab === "start" && styles.toggleButtonActive]}
          onPress={() => setTab("start")}
        >
          <Text style={[styles.toggleButtonText, tab === "start" && styles.toggleButtonTextActive]}>
            START PRODUKSI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, tab === "finish" && styles.toggleButtonActive]}
          onPress={() => setTab("finish")}
        >
          <Text style={[styles.toggleButtonText, tab === "finish" && styles.toggleButtonTextActive]}>
            FINISH PRODUKSI
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tab === "start" ? "PEMERIKSAAN START PRODUKSI" : "PEMERIKSAAN FINISH PRODUKSI"}
          </Text>
        </View>

        {tab === "start" ? (
          <DynamicTable
            columns={START_COLUMNS}
            rows={startRows}
            onRowsChange={setStartRows}
            layout={tableLayout}
          />
        ) : (
          <DynamicTable
            columns={FINISH_COLUMNS}
            rows={finishRows}
            onRowsChange={setFinishRows}
            layout={tableLayout}
          />
        )}
      </ScrollView>
    </View>
  );
};

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
    minHeight: 42,
  },
  headerText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 12,
    paddingHorizontal: 4,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  dataRowAlt: {
    backgroundColor: "#f8fbf9",
  },
  rowNumberCell: {
    borderWidth: 1,
    borderColor: "#e6efea",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  rowNumberText: {
    color: "#51635a",
    fontWeight: "600",
    fontSize: 12,
  },
  dataCell: {
    borderWidth: 1,
    borderColor: "#e6efea",
    paddingVertical: 6,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d4ded8",
    borderRadius: 8,
    fontSize: 12,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    color: "#1f2f26",
  },
});

export default A3StartFinishInspectionTable;
