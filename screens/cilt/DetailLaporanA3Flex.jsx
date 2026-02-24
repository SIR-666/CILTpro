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

const normalizePressureInspection = (inspectionData = []) => {
  if (!Array.isArray(inspectionData)) return { jam: [], min30: [] };

  // hasil submit sekarang
  if (inspectionData[0]?.pressureCheck1Jam || inspectionData[0]?.pressureCheck30Min) {
    return {
      jam: inspectionData[0]?.pressureCheck1Jam || [],
      min30: inspectionData[0]?.pressureCheck30Min || [],
    };
  }

  return { jam: [], min30: [] };
};

/* Utils */
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const normalizeLine = (line) => (line || "").toUpperCase().replace(/\s+/g, "_");
const normalizeShift = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "SHIFT 1" || raw === "1" || raw === "I") return "Shift 1";
  if (raw === "SHIFT 2" || raw === "2" || raw === "II") return "Shift 2";
  if (raw === "SHIFT 3" || raw === "3" || raw === "III") return "Shift 3";
  return "Shift 1";
};
const getShiftHours = (shift) => {
  if (shift === "Shift 1") return [6, 7, 8, 9, 10, 11, 12, 13, 14];
  if (shift === "Shift 2") return [14, 15, 16, 17, 18, 19, 20, 21, 22];
  return [22, 23, 0, 1, 2, 3, 4, 5, 6];
};
const getShiftHourSlots = (shiftValue) => {
  const shiftName = normalizeShift(shiftValue);
  return getShiftHours(shiftName).map((hour, idx) => ({
    key: idx + 1,
    hour,
    label: `${pad2(hour)}:00`,
  }));
};

const getHeaderMeta = (line) => {
  const ln = normalizeLine(line);
  switch (ln) {
    case "LINE_E":
      return { frm: "FIL - 052 - 12", rev: "", berlaku: "1 - Jul - 24", hal: "1 dari 5" };
    case "LINE_F":
    case "LINE_G":
      return { frm: "FIL - 081 - 08", rev: "", berlaku: "10 - Oct - 22", hal: "1 dari 5" };
    default:
      return { frm: "FIL - 052 - 12", rev: "-", berlaku: formatDDMonYY(new Date()), hal: "1 dari 5" };
  }
};

const COLUMN_WIDTH = 64;
const PARAM_WIDTH = 180;

const renderHeaderRow = (type, hourSlots = []) => {
  const slots = Array.isArray(hourSlots) && hourSlots.length > 0
    ? hourSlots
    : getShiftHourSlots("Shift 1");
  if (type !== "30min") {
    return (
      <View style={styles.tableHeaderRow}>
        <View style={[styles.tableHeaderCell, { width: PARAM_WIDTH }]}>
          <Text style={styles.tableHeaderText}>Parameter</Text>
        </View>
        {slots.map((slot) => (
          <View key={`${type}-header-${slot.key}`} style={[styles.tableHeaderCell, { width: COLUMN_WIDTH }]}>
            <Text style={styles.tableHeaderText}>{slot.label}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.tableHeaderRow}>
        <View style={[styles.tableHeaderCell, { width: PARAM_WIDTH }]}>
          <Text style={styles.tableHeaderText}>Parameter</Text>
        </View>
        {slots.map((slot) => (
          <View key={`30min-pack-${slot.key}`} style={[styles.tableHeaderCell, { width: COLUMN_WIDTH }]}>
            <Text style={styles.tableHeaderText}>{slot.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tableSubHeaderRow}>
        <View style={[styles.tableSubHeaderSpacer, { width: PARAM_WIDTH }]} />
        {slots.map((slot) => (
          <View key={`30min-sub-${slot.key}`} style={[styles.tableSubHeaderGroup, { width: COLUMN_WIDTH }]}>
            <View style={styles.tableSubHeaderHalf}>
              <Text style={styles.tableSubHeaderText}>:00</Text>
            </View>
            <View style={styles.tableSubHeaderHalfDivider} />
            <View style={styles.tableSubHeaderHalf}>
              <Text style={styles.tableSubHeaderText}>:30</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const renderNoDataRow = (slotCount) => (
  <View style={styles.tableRow}>
    <View style={[styles.tableCell, { width: PARAM_WIDTH + COLUMN_WIDTH * slotCount }]}>
      <Text style={styles.noDataText}>Belum ada data inspeksi</Text>
    </View>
  </View>
);

const renderPressureRows = (rows, type, hourSlots = []) => {
  const slots = Array.isArray(hourSlots) && hourSlots.length > 0
    ? hourSlots
    : getShiftHourSlots("Shift 1");
  if (!rows.length) return renderNoDataRow(slots.length);

  return rows.map((param, rowIndex) => (
    <View
      key={`${type}-row-${param.parameter_name || "param"}-${rowIndex}`}
      style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]}
    >
      <View style={[styles.tableCellParam, { width: PARAM_WIDTH }]}>
        <Text style={styles.tableCellText}>
          {param.parameter_name}
          {param.unit ? ` (${param.unit})` : ""}
        </Text>
      </View>
      {slots.map((slot) => {
        if (type === "1jam") {
          const value = param.values?.[`jam${slot.key}`] ?? "-";
          return (
            <View key={`${type}-${rowIndex}-${slot.key}`} style={[styles.tableCell, { width: COLUMN_WIDTH }]}>
              <Text style={styles.tableCellText}>{value}</Text>
            </View>
          );
        }

        const value1 = param.values?.[`p${slot.key}_1`] ?? "-";
        const value2 = param.values?.[`p${slot.key}_2`] ?? "-";
        return (
          <View key={`${type}-${rowIndex}-${slot.key}`} style={[styles.tableCellSplit, { width: COLUMN_WIDTH }]}>
            <View style={styles.tableCellHalf}>
              <Text style={styles.tableCellTextSmall}>{value1}</Text>
            </View>
            <View style={styles.tableCellHalfDivider} />
            <View style={styles.tableCellHalf}>
              <Text style={styles.tableCellTextSmall}>{value2}</Text>
            </View>
          </View>
        );
      })}
    </View>
  ));
};

// Generate PDF HTML untuk dipakai di ListCILT
export const generatePDFHTML = (item) => {
  const headerMeta = getHeaderMeta(item.line);
  const hourSlots = getShiftHourSlots(item.shift);
  let inspectionData = [];
  try {
    inspectionData = JSON.parse(item.inspectionData);
  } catch (e) {
    inspectionData = [];
  }

  // Pressure Inspection Data
  const {
    jam: pressureCheck1Jam,
    min30: pressureCheck30Min,
  } = normalizePressureInspection(inspectionData);

  // Generate Pressure Check 1 Jam
  const pressure1JamRows = pressureCheck1Jam.length > 0
    ? pressureCheck1Jam.map((param) => {
      const values = param.values || {};
      const cells = hourSlots.map((slot) => `<td>${esc(values[`jam${slot.key}`])}</td>`).join("");
      return `<tr><td style="text-align:left;">${esc(param.parameter_name)} ${param.unit ? `(${param.unit})` : ""}</td>${cells}</tr>`;
    }).join("")
    : `<tr><td colspan="${1 + hourSlots.length}">No data</td></tr>`;

  // Generate Pressure Check 30 Min
  const pressure30MinRows = pressureCheck30Min.length > 0
    ? pressureCheck30Min.map((param) => {
      const values = param.values || {};
      const cells = hourSlots.map((slot) => {
        const v1 = values[`p${slot.key}_1`] || "-";
        const v2 = values[`p${slot.key}_2`] || "-";
        return `
          <td class="slot-cell">
            <div class="slot-wrap">
              <div class="slot-half left">${esc(v1)}</div>
              <div class="slot-half">${esc(v2)}</div>
            </div>
          </td>
        `;
      }).join("");
      return `<tr><td style="text-align:left;">${esc(param.parameter_name)} ${param.unit ? `(${param.unit})` : ""}</td>${cells}</tr>`;
    }).join("")
    : `<tr><td colspan="${1 + hourSlots.length}">No data</td></tr>`;

  const pressure30MinSubHeader = hourSlots.map(() => `
    <th class="slot-cell sub-header-slot">
      <div class="slot-wrap">
        <div class="slot-half left">:00</div>
        <div class="slot-half">:30</div>
      </div>
    </th>
  `).join("");

  return `
   <style>
    /* ===== PAGE SETUP ===== */
    @page {
      size: A3 landscape;
      margin: 10mm;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
    }

    /* ===== SECTION TITLE ===== */
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

    /* ===== TABLE GENERAL ===== */
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
      font-size: 11px;
    }

    /* ===== HEADER ===== */
    .data-table th {
      background: #c6efce;
      color: #000;
      font-weight: bold;
      text-align: center;
    }

    /* ===== PARAMETER COLUMN ===== */
    .data-table td:first-child,
    .data-table th:first-child {
      text-align: left;
      font-weight: bold;
      width: 22%;
      border-right: 0px solid #555;
    }

    /* ===== JAM / PACK COLUMN ===== */
    .data-table th:not(:first-child),
    .data-table td:not(:first-child) {
      width: calc(78% / ${Math.max(hourSlots.length, 1)});
      text-align: center;
    }

    /* ===== PRESSURE TABLE SPECIFIC ===== */
    .pressure-table td {
      height: 22px;
    }
    .pressure-table thead {
      display: table-header-group;
    }
    .pressure-table tbody {
      display: table-row-group;
    }
    .pressure-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ===== 30 MENIT FORMAT ===== */
    .pressure-table .slot-cell { padding: 0; }
    .pressure-table .slot-wrap {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 20px;
    }
    .pressure-table .slot-half {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      padding: 2px 0;
    }
    .pressure-table .slot-half.left {
      border-right: 0.5px solid #000;
    }
    .pressure-table .sub-header-row th {
      background: #dff3e5;
      font-weight: bold;
    }
    .pressure-table .sub-header-row th:first-child {
      background: #f4fbf6;
    }
  </style>
    <section class="report-section a3flex-section">
      <div class="header-container">
        <table class="header-main-table">
          <tr>
            <td class="logo-section"><div class="logo-green">Greenfields</div></td>
            <td class="company-section">PT. GREENFIELDS INDONESIA</td>
            <td class="meta-section">
              <table class="meta-info-table">
                <tr><td class="meta-label">FRM</td><td>:</td><td>${headerMeta.frm}</td></tr>
                <tr><td class="meta-label">Rev</td><td>:</td><td>${headerMeta.rev || "-"}</td></tr>
                <tr><td class="meta-label">Berlaku</td><td>:</td><td>${headerMeta.berlaku}</td></tr>
                <tr><td class="meta-label">Hal</td><td>:</td><td>${headerMeta.hal}</td></tr>
              </table>
            </td>
          </tr>
        </table>
        <table class="header-title-table">
          <tr>
            <td class="title-label">JUDUL</td>
            <td class="title-content">LAPORAN MESIN A3 / FLEX</td>
          </tr>
        </table>
      </div>

      <div class="report-info">
        <p><strong>Process Order:</strong> ${esc(item.processOrder)}</p>
        <table class="general-info-table">
          <tr><td><strong>Date:</strong> ${moment(item.date).format("DD/MM/YY HH:mm:ss")}</td><td><strong>Product:</strong> ${esc(item.product)}</td></tr>
          <tr><td><strong>Plant:</strong> ${esc(item.plant)}</td><td><strong>Line:</strong> ${esc(item.line)}</td></tr>
          <tr><td><strong>Machine:</strong> ${esc(item.machine)}</td><td><strong>Shift:</strong> ${esc(item.shift)}</td></tr>
        </table>
      </div>

      <h3 class="section-title">PENGECEKAN PRESSURE (1 JAM)</h3>
      <table class="data-table pressure-table">
        <thead>
          <tr>
            <th>Parameter</th>
            ${hourSlots.map((slot) => `<th>${slot.label}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${pressure1JamRows}
        </tbody>
      </table>

      <h3 class="section-title">PENGECEKAN PRESSURE (30 MENIT)</h3>
      <table class="data-table pressure-table">
        <thead>
          <tr>
            <th>Parameter</th>
            ${hourSlots.map((slot) => `<th>${slot.label}</th>`).join("")}
          </tr>
          <tr class="sub-header-row">
            <th></th>
            ${pressure30MinSubHeader}
          </tr>
        </thead>
        <tbody>
          ${pressure30MinRows}
        </tbody>
      </table>
    </section>
  `;
};

// COMPONENT: Detail View untuk navigasi
const DetailLaporanA3Flex = ({ route, navigation }) => {
  const { item } = route.params;
  const headerMeta = getHeaderMeta(item.line);
  const hourSlots = getShiftHourSlots(item.shift);

  const [inspectionData] = useState(() => {
    try { return JSON.parse(item.inspectionData); }
    catch (e) { return []; }
  });
  const metaFromInspection = Array.isArray(inspectionData) ? inspectionData[0] || {} : {};
  const {
    jam: pressureCheck1Jam,
    min30: pressureCheck30Min,
  } = normalizePressureInspection(inspectionData);
  const submittedBy = firstNonEmpty(
    item?.username,
    item?.submitBy,
    item?.submit_by,
    item?.createdBy,
    item?.created_by,
    item?.user,
    item?.userName,
    item?.user_name,
    metaFromInspection?.submittedBy,
    metaFromInspection?.submitBy,
    metaFromInspection?.submit_by,
    metaFromInspection?.username,
    metaFromInspection?.user,
    metaFromInspection?.lastModifiedBy,
    getSubmitterFromRows(pressureCheck1Jam),
    getSubmitterFromRows(pressureCheck30Min),
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Detail Data A3 / Flex</Text>

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

        <View style={styles.tableWrapper}>
          <Text style={styles.sectionTitle}>PENGECEKAN PRESSURE (1 JAM)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableContainer}>
              {renderHeaderRow("1jam", hourSlots)}
              {renderPressureRows(pressureCheck1Jam, "1jam", hourSlots)}
            </View>
          </ScrollView>
        </View>

        <View style={styles.tableWrapper}>
          <Text style={styles.sectionTitle}>PENGECEKAN PRESSURE (30 MENIT)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableContainer}>
              {renderHeaderRow("30min", hourSlots)}
              {renderPressureRows(pressureCheck30Min, "30min", hourSlots)}
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
  },
  tableSubHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#32b95f",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.3)",
  },
  tableSubHeaderSpacer: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.3)",
  },
  tableSubHeaderGroup: {
    flexDirection: "row",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.3)",
    height: 24,
  },
  tableSubHeaderHalf: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tableSubHeaderHalfDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  tableSubHeaderText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  tableRowAlt: {
    backgroundColor: "#f8f9fa",
  },
  tableCellParam: {
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tableCellSplit: {
    flexDirection: "row",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    minHeight: 34,
  },
  tableCellHalf: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  tableCellHalfDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
  },
  tableCellText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  tableCellTextSmall: {
    fontSize: 11,
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

export default DetailLaporanA3Flex;