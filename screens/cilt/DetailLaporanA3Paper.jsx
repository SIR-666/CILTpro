import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/theme";
import { resolveCiltDetailItem } from "../../utils/ciltDetailRouteCache";
import { escapeHtml as esc } from "../../utils/htmlEscape";
import {
  REPORT_PDF_HEADER_STYLES,
  renderReportPdfHeader,
} from "../../utils/reportPdfHeader";

const META_KEYS = new Set([
  "id",
  "saved",
  "cekLabelAlergenKemasan",
  "cekAlergenKemasan",
  "_user",
  "_time",
  "user",
  "time",
]);

const normalizeText = (value) => String(value ?? "");
const normalizeToken = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toFallbackLabel = (value) =>
  normalizeText(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toPaperA3ColumnLabel = (field) => {
  const token = normalizeToken(field);

  if (token === "jam" || token === "mpmstripjam") return "Jam";
  if (token === "roll") return "Roll";
  if (token === "paperorder") return "Paper Order";
  if (token === "qtylabel") return "Qty Label";
  if (token === "globalid") return "Global ID";
  if (token === "count1reading") return "Count 1 Reading";
  if (token === "kondisipaper" || token === "kondisi") return "Kondisi";
  if (token === "splicingpaper" || token === "splicing") return "Splicing";
  if (token === "mpmstriplotno" || token === "lotno") return "Lot No.";
  if (token === "mpmstripkode" || token === "kode") return "Kode";

  return toFallbackLabel(field);
};

const getPaperA3ColumnOrder = (field, index) => {
  const token = normalizeToken(field);

  if (token === "jam") return 1;
  if (token === "roll") return 2;
  if (token === "paperorder") return 3;
  if (token === "qtylabel") return 4;
  if (token === "globalid") return 5;
  if (token === "count1reading") return 6;
  if (token === "kondisipaper" || token === "kondisi") return 7;
  if (token === "splicingpaper" || token === "splicing") return 8;
  if (token === "mpmstripjam") return 9;
  if (token === "mpmstriplotno" || token === "lotno") return 10;
  if (token === "mpmstripkode" || token === "kode") return 11;

  return 100 + index;
};

const resolveSubmittedBy = (item, rows = []) => {
  const fromItem = [
    item?.submitBy,
    item?.createdBy,
    item?.created_by,
    item?.userName,
    item?.username,
    item?.user,
  ].find((value) => normalizeText(value).trim() !== "");

  if (fromItem) return normalizeText(fromItem).trim();

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const rowUser = normalizeText(rows[index]?.user ?? rows[index]?._user).trim();
    if (rowUser) return rowUser;
  }

  return "-";
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
    } catch {
      return [];
    }
  }
  return [];
};

const hasInspectionValue = (row = {}) =>
  Object.entries(row).some(([key, value]) => {
    if (META_KEYS.has(key)) return false;
    return normalizeText(value).trim() !== "";
  });

const extractRows = (payload) =>
  parseInspectionPayload(payload).filter((row) => row && typeof row === "object");

const extractAlergenFlag = (payload) => {
  const rows = parseInspectionPayload(payload);
  if (rows.length === 0) return false;
  return rows.some(
    (row) => !!row?.cekLabelAlergenKemasan || !!row?.cekAlergenKemasan
  );
};

const extractColumns = (rows = []) => {
  const orderedKeys = [];
  const seen = new Set();
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (META_KEYS.has(key)) return;
      if (seen.has(key)) return;
      seen.add(key);
      orderedKeys.push(key);
    });
  });

  const columns = orderedKeys
    .map((key, index) => {
      const label = toPaperA3ColumnLabel(key);
      return {
        key,
        label,
        order: getPaperA3ColumnOrder(key, index),
        width: Math.min(Math.max(label.length * 7 + 28, 90), 170),
      };
    })
    .sort((a, b) => a.order - b.order);

  const hasUser = rows.some((row) =>
    normalizeText(row?.user ?? row?._user).trim() !== ""
  );
  const hasTime = rows.some((row) =>
    normalizeText(row?.time ?? row?._time).trim() !== ""
  );
  if (hasUser) {
    columns.push({ key: "__audit_user", label: "User", width: 90 });
  }
  if (hasTime) {
    columns.push({ key: "__audit_time", label: "Time", width: 90 });
  }
  return columns;
};

const getCellValue = (row = {}, key) => {
  if (key === "__audit_user") return row?.user ?? row?._user ?? "";
  if (key === "__audit_time") return row?.time ?? row?._time ?? "";
  return row?.[key] ?? "";
};

const normalizeLine = (line) => String(line || "").toUpperCase().replace(/\s+/g, "_");
const pad2 = (value) => String(value).padStart(2, "0");
const monthsShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const formatDDMonYY = (dateLike) => {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  return `${pad2(date.getDate())}-${monthsShort[date.getMonth()]}-${String(
    date.getFullYear()
  ).slice(-2)}`;
};

const getHeaderMeta = (line) => {
  const normalized = normalizeLine(line);
  switch (normalized) {
    case "LINE_E":
      return { frm: "FIL - 052 - 12", rev: "", berlaku: "1 - Jul - 24", hal: "3 dari 5" };
    case "LINE_F":
    case "LINE_G":
      return {
        frm: "FIL - 081 - 08",
        rev: "",
        berlaku: "10 - Oct - 22",
        hal: "3 dari 5",
      };
    default:
      return {
        frm: "FIL - 052 - 12",
        rev: "-",
        berlaku: formatDDMonYY(new Date()),
        hal: "3 dari 5",
      };
  }
};

const formatDateTime = (value) => {
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format("DD/MM/YY HH:mm:ss") : "-";
};

const renderValue = (value) => {
  const text = normalizeText(value).trim();
  return text ? text : "-";
};

export const generatePDFHTML = (item) => {
  const allRows = extractRows(item?.inspectionData);
  const dataRows = allRows.filter((row) => hasInspectionValue(row));
  const columns = extractColumns(allRows);
  const cekAlergenKemasan = extractAlergenFlag(item?.inspectionData);
  const headerMeta = getHeaderMeta(item?.line);
  const submittedBy = resolveSubmittedBy(item, allRows);

  const headerCells = columns
    .map((column) => `<th>${esc(column.label)}</th>`)
    .join("");

  const bodyRows =
    dataRows.length > 0
      ? dataRows
          .map((row, index) => {
            const cells = columns
              .map((column) => `<td>${esc(renderValue(getCellValue(row, column.key)))}</td>`)
              .join("");
            return `<tr><td>${index + 1}</td>${cells}</tr>`;
          })
          .join("")
      : `<tr><td colspan="${columns.length + 1}" class="empty-cell">Tidak ada data yang diinput</td></tr>`;

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

      .general-info-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }

      .general-info-table td {
        border: 1px solid #000;
        padding: 5px;
      }

      .alergen-row {
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .alergen-box {
        width: 14px;
        height: 14px;
        border: 2px solid #111;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        line-height: 1;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-top: 8px;
      }

      .data-table th,
      .data-table td {
        border: 1px solid #000;
        padding: 4px 5px;
        text-align: center;
        font-size: 10px;
        word-wrap: break-word;
      }

      .data-table th {
        background: #dcfce7;
        font-weight: 700;
      }

      .empty-cell {
        padding: 14px;
        font-style: italic;
        color: #666;
      }
    </style>

    <section class="report-section a3-paper-section">
      ${renderReportPdfHeader({
        title: "PAPER A3",
        headerMeta,
        escapeHtml: esc,
      })}

      <div class="report-info">
        <p><strong>Process Order:</strong> ${esc(item?.processOrder)}</p>
        <table class="general-info-table">
          <tr><td><strong>Date:</strong> ${esc(formatDateTime(item?.date))}</td><td><strong>Product:</strong> ${esc(item?.product)}</td></tr>
          <tr><td><strong>Plant:</strong> ${esc(item?.plant)}</td><td><strong>Line:</strong> ${esc(item?.line)}</td></tr>
          <tr><td><strong>Machine:</strong> ${esc(item?.machine)}</td><td><strong>Shift:</strong> ${esc(item?.shift)}</td></tr>
          <tr><td><strong>Package:</strong> ${esc(item?.packageType)}</td><td><strong>Submitted By:</strong> ${esc(submittedBy)}</td></tr>
        </table>
      </div>

      <div class="alergen-row">
        <span class="alergen-box">${cekAlergenKemasan ? "v" : ""}</span>
        <span><strong>CEK LABEL ALERGEN KEMASAN</strong></span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width:35px;">No</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </section>
  `;
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const DetailLaporanA3Paper = ({ route, navigation }) => {
  const item = resolveCiltDetailItem(route?.params);
  const allRows = useMemo(() => extractRows(item?.inspectionData), [item?.inspectionData]);
  const dataRows = useMemo(
    () => allRows.filter((row) => hasInspectionValue(row)),
    [allRows]
  );
  const columns = useMemo(() => extractColumns(allRows), [allRows]);
  const cekAlergenKemasan = useMemo(
    () => extractAlergenFlag(item?.inspectionData),
    [item?.inspectionData]
  );
  const headerMeta = useMemo(() => getHeaderMeta(item?.line), [item?.line]);
  const submittedBy = useMemo(() => resolveSubmittedBy(item, allRows), [item, allRows]);

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
    } catch {
      // Ignore share errors when user cancels or share target fails.
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Detail Data Paper A3</Text>

          <InfoRow label="Date" value={formatDateTime(item?.date)} />
          <InfoRow label="PO" value={renderValue(item?.processOrder)} />
          <InfoRow label="Package" value={renderValue(item?.packageType)} />
          <InfoRow label="Plant" value={renderValue(item?.plant)} />
          <InfoRow label="Line" value={renderValue(item?.line)} />
          <InfoRow label="Shift" value={renderValue(item?.shift)} />
          <InfoRow label="Machine" value={renderValue(item?.machine)} />
          <InfoRow label="Product" value={renderValue(item?.product)} />
          <InfoRow label="FRM" value={renderValue(headerMeta?.frm)} />
          <InfoRow
            label="Cek Alergen"
            value={cekAlergenKemasan ? "Checked" : "Tidak dicentang"}
          />
          <InfoRow label="Submitted By" value={renderValue(submittedBy)} />

          {item?.status === 1 ? (
            <TouchableOpacity style={styles.submitButton} onPress={handleLanjutkanDraft}>
              <Text style={styles.submitButtonText}>LANJUTKAN DRAFT</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={printToFile}>
              <Text style={styles.submitButtonText}>DOWNLOAD REPORT</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tableWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: 48 }]}>No</Text>
                {columns.map((column) => (
                  <Text
                    key={`head-${column.key}`}
                    style={[styles.tableHeaderCell, { width: column.width }]}
                  >
                    {column.label}
                  </Text>
                ))}
              </View>

              {dataRows.length === 0 ? (
                <View style={styles.noDataRow}>
                  <Text style={styles.noDataText}>Tidak ada data yang diinput</Text>
                </View>
              ) : (
                dataRows.map((row, index) => (
                  <View
                    key={`row-${index}`}
                    style={[styles.tableBodyRow, index % 2 === 1 && styles.tableBodyRowAlt]}
                  >
                    <Text style={[styles.tableBodyCell, { width: 48 }]}>{index + 1}</Text>
                    {columns.map((column) => (
                      <Text
                        key={`cell-${index}-${column.key}`}
                        style={[styles.tableBodyCell, { width: column.width }]}
                      >
                        {renderValue(getCellValue(row, column.key))}
                      </Text>
                    ))}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },
  scrollContent: {
    paddingBottom: 18,
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  infoLabel: {
    width: 110,
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  submitButton: {
    marginTop: 12,
    backgroundColor: COLORS.blue,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  tableWrapper: {
    marginHorizontal: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#0f9f67",
  },
  tableHeaderCell: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.35)",
  },
  tableBodyRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  tableBodyRowAlt: {
    backgroundColor: "#f9fafb",
  },
  tableBodyCell: {
    textAlign: "center",
    fontSize: 11,
    color: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  noDataRow: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  noDataText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default DetailLaporanA3Paper;
