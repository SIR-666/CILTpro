import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/theme";
import { escapeHtml as esc } from "../../utils/htmlEscape";
import {
  REPORT_PDF_HEADER_STYLES,
  renderReportPdfHeader,
} from "../../utils/reportPdfHeader";
import { resolveCiltDetailItem } from "../../utils/ciltDetailRouteCache";

const NO_COL_WIDTH = 52;
const CELL_COL_WIDTH = 122;

const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n) => String(n).padStart(2, "0");
const formatDDMonYY = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  return `${pad2(d.getDate())}-${monthsShort[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    const normalized = text.toLowerCase();
    if (normalized === "-" || normalized === "null" || normalized === "undefined") continue;
    return text;
  }
  return "-";
};

const hasRowValue = (row = {}) =>
  Object.values(row || {}).some((value) => String(value ?? "").trim() !== "");

const getSubmitterFromRows = (rows = []) => {
  if (!Array.isArray(rows)) return "";
  for (const row of rows) {
    const found = firstNonEmpty(
      row?.submittedBy,
      row?.submitBy,
      row?.username,
      row?.user,
      row?.lastModifiedBy
    );
    if (found !== "-") return found;
  }
  return "";
};

const parseInspectionPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") return [payload];
  if (typeof payload === "string") {
    const raw = payload.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
      return [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

const normalizeRows = (rows, columns) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) =>
      Object.fromEntries(columns.map((column) => [column.key, String(row?.[column.key] ?? "")]))
    )
    .filter((row) => hasRowValue(row));
};

const normalizeLine = (line) => (line || "").toUpperCase().replace(/\s+/g, "_");
const getHeaderMeta = (line) => {
  const ln = normalizeLine(line);
  switch (ln) {
    case "LINE_E":
      return { frm: "FIL - 052 - 12", rev: "", berlaku: "1 - Jul - 24", hal: "2 dari 5" };
    case "LINE_F":
    case "LINE_G":
      return { frm: "FIL - 081 - 08", rev: "", berlaku: "10 - Oct - 22", hal: "2 dari 5" };
    default:
      return { frm: "FIL - 052 - 12", rev: "-", berlaku: formatDDMonYY(new Date()), hal: "2 dari 5" };
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

const toDisplayText = (value) => {
  const text = String(value ?? "").trim();
  return text ? text : "-";
};

const buildTableRowsHtml = (rows, columns) => {
  if (!rows.length) return `<tr><td colspan="${columns.length + 1}">No data</td></tr>`;
  return rows
    .map((row, index) => {
      const cells = columns.map((column) => `<td>${esc(toDisplayText(row?.[column.key]))}</td>`).join("");
      return `<tr><td>${index + 1}</td>${cells}</tr>`;
    })
    .join("");
};

export const generatePDFHTML = (item) => {
  const headerMeta = getHeaderMeta(item.line);
  const inspectionData = parseInspectionPayload(item?.inspectionData);
  const data = inspectionData[0] || (item && typeof item === "object" ? item : {});
  const startProduksi = normalizeRows(data.startProduksi, START_COLUMNS);
  const finishProduksi = normalizeRows(data.finishProduksi, FINISH_COLUMNS);
  const submittedBy = firstNonEmpty(
    item?.username,
    item?.submitBy,
    item?.submit_by,
    item?.createdBy,
    item?.created_by,
    item?.user,
    item?.userName,
    data?.submittedBy,
    data?.submitBy,
    data?.username,
    getSubmitterFromRows(startProduksi),
    getSubmitterFromRows(finishProduksi)
  );

  const startHeaders = START_COLUMNS.map((column) => `<th>${esc(column.label)}</th>`).join("");
  const finishHeaders = FINISH_COLUMNS.map((column) => `<th>${esc(column.label)}</th>`).join("");

  return `
    <style>
      @page {
        size: A3 landscape;
        margin: 10mm;
      }
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        color: #000;
      }
      ${REPORT_PDF_HEADER_STYLES}
      .section-title {
        text-align: center;
        font-weight: bold;
        font-size: 14px;
        margin: 10px 0 6px;
        padding: 0;
        border: none;
        background: transparent !important;
        color: #1f4fd8;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-bottom: 18px;
      }
      .data-table th,
      .data-table td {
        border: 0.5px solid #000;
        padding: 4px 6px;
        font-size: 10px;
        text-align: center;
      }
      .data-table th {
        background: #c6efce;
        color: #000;
        font-weight: bold;
      }
      .data-table th:first-child,
      .data-table td:first-child {
        width: 4%;
      }
      .data-table td:nth-child(2),
      .data-table th:nth-child(2) {
        text-align: left;
      }
    </style>
    <section class="report-section a3startfinish-section">
      ${renderReportPdfHeader({
        title: "START & FINISH PRODUKSI",
        headerMeta,
        escapeHtml: esc,
      })}

      <div class="report-info">
        <p><strong>Process Order:</strong> ${esc(item.processOrder)}</p>
        <table class="general-info-table">
          <tr><td><strong>Date:</strong> ${moment(item.date).format("DD/MM/YY HH:mm:ss")}</td><td><strong>Product:</strong> ${esc(item.product)}</td></tr>
          <tr><td><strong>Plant:</strong> ${esc(item.plant)}</td><td><strong>Line:</strong> ${esc(item.line)}</td></tr>
          <tr><td><strong>Machine:</strong> ${esc(item.machine)}</td><td><strong>Shift:</strong> ${esc(item.shift)}</td></tr>
          <tr><td><strong>Submitted By:</strong> ${esc(submittedBy)}</td><td><strong>Package:</strong> ${esc(item.packageType || "START & FINISH")}</td></tr>
        </table>
      </div>

      <h3 class="section-title">START PRODUKSI</h3>
      <table class="data-table start-table">
        <thead><tr><th>No</th>${startHeaders}</tr></thead>
        <tbody>${buildTableRowsHtml(startProduksi, START_COLUMNS)}</tbody>
      </table>

      <h3 class="section-title">FINISH PRODUKSI</h3>
      <table class="data-table finish-table">
        <thead><tr><th>No</th>${finishHeaders}</tr></thead>
        <tbody>${buildTableRowsHtml(finishProduksi, FINISH_COLUMNS)}</tbody>
      </table>
    </section>
  `;
};

const DetailLaporanA3StartFinish = ({ route, navigation }) => {
  const item = resolveCiltDetailItem(route?.params);
  const headerMeta = getHeaderMeta(item.line);
  const [inspectionData] = useState(() => parseInspectionPayload(item?.inspectionData));
  const data = inspectionData[0] || (item && typeof item === "object" ? item : {});
  const startRows = normalizeRows(data.startProduksi, START_COLUMNS);
  const finishRows = normalizeRows(data.finishProduksi, FINISH_COLUMNS);
  const submittedBy = firstNonEmpty(
    item?.username,
    item?.submitBy,
    item?.submit_by,
    item?.createdBy,
    item?.created_by,
    item?.user,
    item?.userName,
    data?.submittedBy,
    data?.submitBy,
    data?.username,
    getSubmitterFromRows(startRows),
    getSubmitterFromRows(finishRows)
  );

  const handleLanjutkanDraft = () => navigation.navigate("EditCilt", { item });

  const printToFile = async () => {
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body>${generatePDFHTML(item)}</body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (error) {
      Alert.alert("Error", "Gagal generate PDF report");
    }
  };

  const renderSectionTable = (title, columns, rows, sectionKey) => (
    <View style={styles.tableWrapper} key={sectionKey}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeaderRow}>
            <View style={[styles.tableHeaderCell, { width: NO_COL_WIDTH }]}>
              <Text style={styles.tableHeaderText}>No</Text>
            </View>
            {columns.map((column) => (
              <View key={`${sectionKey}-header-${column.key}`} style={[styles.tableHeaderCell, { width: CELL_COL_WIDTH }]}>
                <Text style={styles.tableHeaderText}>{column.label}</Text>
              </View>
            ))}
          </View>

          {rows.length === 0 ? (
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { width: NO_COL_WIDTH + columns.length * CELL_COL_WIDTH }]}>
                <Text style={styles.noDataText}>Belum ada data inspeksi</Text>
              </View>
            </View>
          ) : (
            rows.map((row, rowIndex) => (
              <View
                key={`${sectionKey}-row-${rowIndex}`}
                style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]}
              >
                <View style={[styles.tableNoCell, { width: NO_COL_WIDTH }]}>
                  <Text style={styles.tableCellText}>{rowIndex + 1}</Text>
                </View>
                {columns.map((column) => (
                  <View key={`${sectionKey}-cell-${rowIndex}-${column.key}`} style={[styles.tableCell, { width: CELL_COL_WIDTH }]}>
                    <Text style={styles.tableCellText}>{toDisplayText(row?.[column.key])}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Detail Data Start & Finish</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>
                {moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Process Order:</Text>
              <Text style={styles.infoValue}>{item.processOrder || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Package:</Text>
              <Text style={styles.infoValue}>{item.packageType || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plant:</Text>
              <Text style={styles.infoValue}>{item.plant || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Line:</Text>
              <Text style={styles.infoValue}>{item.line || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Shift:</Text>
              <Text style={styles.infoValue}>{item.shift || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Machine:</Text>
              <Text style={styles.infoValue}>{item.machine || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Submitted By:</Text>
              <Text style={styles.infoValue}>{submittedBy}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>FRM:</Text>
              <Text style={styles.infoValue}>{headerMeta.frm}</Text>
            </View>
          </View>

          {item.status === 1 ? (
            <TouchableOpacity style={styles.submitButton} onPress={handleLanjutkanDraft}>
              <Text style={styles.submitButtonText}>LANJUTKAN DRAFT</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={printToFile}>
              <Text style={styles.submitButtonText}>DOWNLOAD REPORT</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderSectionTable("START PRODUKSI", START_COLUMNS, startRows, "start")}
        {renderSectionTable("FINISH PRODUKSI", FINISH_COLUMNS, finishRows, "finish")}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  infoSection: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  tableWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 10,
    marginTop: 10,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    marginHorizontal: 12,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginHorizontal: 12,
    marginBottom: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
  },
  tableHeaderCell: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.3)",
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tableHeaderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  tableRowAlt: {
    backgroundColor: "#f8f9fa",
  },
  tableNoCell: {
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  tableCellText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  noDataText: {
    color: "#999",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 10,
  },
});

export default DetailLaporanA3StartFinish;
