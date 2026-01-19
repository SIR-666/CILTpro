import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
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
};

const renderPressureTable = (title, data, type) => {
  if (!data.length) return null;

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal>
        <View>
          {data.map((row, idx) => (
            <View key={idx} style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ width: 180, fontSize: 11 }}>
                {row.parameter_name} {row.unit ? `(${row.unit})` : ""}
              </Text>

              {Array.from({ length: 12 }).map((_, i) => {
                const v =
                  type === "1jam"
                    ? row.values?.[`jam${i + 1}`] ?? "-"
                    : `${row.values?.[`p${i + 1}_1`] ?? "-"} / ${row.values?.[`p${i + 1}_2`] ?? "-"}`;

                return (
                  <Text
                    key={i}
                    style={{
                      width: 60,
                      textAlign: "center",
                      fontSize: 11,
                      borderWidth: 0.5,
                      borderColor: "#ccc",
                    }}
                  >
                    {v}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
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

const normalizeLine = (line) => (line || "").toUpperCase().replace(/\s+/g, "_");

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

// Generate PDF HTML untuk dipakai di ListCILT
export const generatePDFHTML = (item) => {
  const headerMeta = getHeaderMeta(item.line);
  let inspectionData = [];
  try {
    inspectionData = JSON.parse(item.inspectionData);
  } catch (e) {
    inspectionData = [];
  }
  const data = inspectionData[0] || {};
  const headerInfo = data.headerInfo || {};

  // Pressure Inspection Data
  const {
    jam: pressureCheck1Jam,
    min30: pressureCheck30Min,
  } = normalizePressureInspection(inspectionData);

  // Generate Pressure Check 1 Jam
  const pressure1JamRows = pressureCheck1Jam.length > 0
    ? pressureCheck1Jam.map((param) => {
      const values = param.values || {};
      const cells = Array.from({ length: 12 }, (_, i) => `<td>${esc(values[`jam${i + 1}`])}</td>`).join("");
      return `<tr><td style="text-align:left;">${esc(param.parameter_name)} ${param.unit ? `(${param.unit})` : ""}</td>${cells}</tr>`;
    }).join("")
    : '<tr><td colspan="13">No data</td></tr>';

  // Generate Pressure Check 30 Min
  const pressure30MinRows = pressureCheck30Min.length > 0
    ? pressureCheck30Min.map((param) => {
      const values = param.values || {};
      const cells = Array.from({ length: 12 }, (_, i) => {
        const v1 = values[`p${i + 1}_1`] || "-";
        const v2 = values[`p${i + 1}_2`] || "-";
        return `
          <td class="dual-value">
            ${esc(v1)}<br/>
            ${esc(v2)}
          </td>
        `;
      }).join("");
      return `<tr><td style="text-align:left;">${esc(param.parameter_name)} ${param.unit ? `(${param.unit})` : ""}</td>${cells}</tr>`;
    }).join("")
    : '<tr><td colspan="13">No data</td></tr>';

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
      border: 0.5 px solid #000;
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
      width: calc(78% / 12);
      text-align: center;
    }

    /* ===== PRESSURE TABLE SPECIFIC ===== */
    .pressure-table td {
      height: 22px;
    }

    /* ===== 30 MENIT FORMAT ===== */
    .pressure-table .dual-value {
      font-size: 10px;
      letter-spacing: 0.5px;
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

      <div style="page-break-before: always;"></div>
      <h3 class="section-title">PENGECEKAN PRESSURE (1 JAM)</h3>
      <table class="data-table pressure-table">
        <tr>
        <th>Parameter</th>
        ${Array.from({ length: 12 }, (_, i) => `<th>Jam ${i + 1}</th>`).join("")}
        </tr>
        ${pressure1JamRows}
      </table>

      <h3 class="section-title">PENGECEKAN PRESSURE (30 MENIT)</h3>
      <table class="data-table pressure-table">
        <tr>
        <th>Parameter</th>
        ${Array.from({ length: 12 }, (_, i) => `<th>Pack ${i + 1}</th>`).join("")}
        </tr>
        ${pressure30MinRows}
      </table>
    </section>
  `;
};

// COMPONENT: Detail View untuk navigasi
const DetailLaporanA3Flex = ({ route, navigation }) => {
  const { item } = route.params;
  const headerMeta = getHeaderMeta(item.line);

  const [inspectionData] = useState(() => {
    try { return JSON.parse(item.inspectionData); }
    catch (e) { return []; }
  });
  const data = inspectionData[0] || {};
  const {
    jam: pressureCheck1Jam,
    min30: pressureCheck30Min,
  } = normalizePressureInspection(inspectionData);

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
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.headerWrap}>
          <View style={styles.headerRowTop}>
            <View style={styles.headerLogoBox}>
              <Image source={require("../../assets/GreenfieldsLogo_Green.png")} style={styles.headerLogoImg} resizeMode="contain" />
            </View>
            <View style={styles.headerCompanyBox}>
              <Text style={styles.headerCompanyText}>PT. GREENFIELDS INDONESIA</Text>
            </View>
            <View style={styles.headerMetaBox}>
              <View style={styles.metaRow}><Text style={styles.metaKey}>FRM</Text><Text style={styles.metaVal}>{headerMeta.frm}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Rev</Text><Text style={styles.metaVal}>{headerMeta.rev || "-"}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Berlaku</Text><Text style={styles.metaVal}>{headerMeta.berlaku}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Hal</Text><Text style={styles.metaVal}>{headerMeta.hal}</Text></View>
            </View>
          </View>
          <View style={styles.headerRowBottom}>
            <Text style={styles.headerLeftCell}>JUDUL</Text>
            <Text style={styles.headerTitleCell}>LAPORAN MESIN A3 / FLEX</Text>
          </View>
        </View>

        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>History Laporan</Text>
          <Text style={styles.historyText}>Form disubmit oleh: <Text style={styles.historyBold}>{item.username || "Unknown"}</Text></Text>
          <Text style={styles.historyText}>Waktu submit: <Text style={styles.historyBold}>{moment(item.date).format("DD-MM-YYYY HH:mm:ss")}</Text></Text>
          <Text style={styles.historyText}>Process Order: <Text style={styles.historyBold}>{item.processOrder}</Text></Text>
        </View>

        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Pressure Check</Text>
          <Text style={styles.sectionTitle}>Pengecekan Pressure (1 Jam)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pressureTable}>
              {pressureCheck1Jam.map((param, idx) => (
                <View key={idx} style={styles.pressureRow}>
                  <View style={styles.pressureCellParam}>
                    <Text style={styles.pressureCellText}>
                      {param.parameter_name}
                    </Text>
                  </View>
                  {Array.from({ length: 12 }, (_, i) => (
                    <View key={i} style={styles.pressureCell}>
                      <Text style={styles.pressureCellText}>
                        {param.values?.[`jam${i + 1}`] ?? "-"}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.sectionTitle}>Pengecekan Pressure (30 Menit)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pressureTable}>
              {pressureCheck30Min.map((param, idx) => (
                <View key={idx} style={styles.pressureRow}>
                  <View style={styles.pressureCellParam}>
                    <Text style={styles.pressureCellText}>
                      {param.parameter_name}
                    </Text>
                  </View>
                  {Array.from({ length: 12 }, (_, i) => {
                    const v1 = param.values?.[`p${i + 1}_1`] ?? "-";
                    const v2 = param.values?.[`p${i + 1}_2`] ?? "-";
                    return (
                      <View key={i} style={styles.pressureCell}>

                        <Text style={styles.pressureCellText}>
                          {v1 || v2 ? `${v1 || ""} | ${v2 || ""}` : ""}
                        </Text>

                        {/* <Text style={styles.pressureCellText}>
                          {v1}  |  {v2}
                        </Text> */}

                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 12 },
  headerWrap: { borderWidth: 1, borderColor: "#d7d7d7", borderRadius: 8, backgroundColor: "#fff", overflow: "hidden", marginBottom: 10 },
  headerRowTop: { flexDirection: "row", alignItems: "center", padding: 8, gap: 8 },
  headerLogoBox: { width: 100, height: 50, alignItems: "center", justifyContent: "center" },
  headerLogoImg: { width: "100%", height: "100%" },
  headerCompanyBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerCompanyText: { fontSize: 14, fontWeight: "bold", color: "#333", textAlign: "center" },
  headerMetaBox: { width: 130, borderLeftWidth: 1, borderColor: "#e5e5e5", paddingLeft: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  metaKey: { width: 50, fontSize: 10, color: "#333" },
  metaVal: { flex: 1, fontSize: 10, fontWeight: "600", color: "#333" },
  headerRowBottom: { flexDirection: "row", borderTopWidth: 1, borderColor: "#e5e5e5" },
  headerLeftCell: { width: 100, paddingVertical: 6, textAlign: "center", fontWeight: "600", fontSize: 10, backgroundColor: "#fafafa", borderRightWidth: 1, borderColor: "#e5e5e5" },
  headerTitleCell: { flex: 1, paddingVertical: 6, textAlign: "center", fontWeight: "bold", fontSize: 11 },
  historyContainer: { backgroundColor: "#f8f9fa", padding: 12, marginBottom: 15, borderRadius: 8, borderWidth: 1, borderColor: "#e1e5ea" },
  historyTitle: { fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 6 },
  historyText: { fontSize: 12, color: "#666", marginBottom: 2 },
  historyBold: { fontWeight: "bold", color: "#333" },
  dataSection: { marginBottom: 15, padding: 12, backgroundColor: "#f8f9fa", borderRadius: 8, borderWidth: 1, borderColor: "#e1e5ea" },
  sectionTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 10, color: "#2e7d32" },
  dataText: { fontSize: 12, color: "#333", marginBottom: 4 },
  submitButton: { backgroundColor: COLORS.blue, padding: 15, borderRadius: 8, alignItems: "center", marginHorizontal: 12, marginBottom: 20 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  pressureTable: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 6,
  },
  pressureRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  pressureCellParam: {
    width: 140,
    padding: 6,
    borderRightWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
  },
  pressureCell: {
    width: 48,
    height: 32,
    borderRightWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  pressureCellText: {
    fontSize: 11,
    color: "#333",
  },

});

export default DetailLaporanA3Flex;