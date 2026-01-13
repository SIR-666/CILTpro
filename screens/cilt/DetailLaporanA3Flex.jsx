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

  // Page 1 Data
  const headerInfo = data.headerInfo || {};
  const persiapanProses = data.persiapanProses || {};
  const counterPack = data.counterPack || {};
  const inkubasiQC = data.inkubasiQC || {};
  const sampleOperator = data.sampleOperator || {};
  const paperRows = data.paperRows || [];
  const persiapanH2O2 = data.persiapanH2O2 || {};
  const penambahanH2O2 = data.penambahanH2O2 || [];
  const mccpRows = data.mccpRows || [];
  const checkKondisi = data.checkKondisi || {};
  const ncRows = data.ncRows || [];
  const totalStop = data.totalStop || "";
  const catatanAkhir = data.catatanAkhir || "";

  // Page 2 Data
  const pressureCheck1Jam = data.pressureCheck1Jam || [];
  const pressureCheck30Min = data.pressureCheck30Min || [];

  // Generate Paper Table
  const paperTableRows = paperRows.length > 0
    ? paperRows.map((row, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(row.jam)}</td>
        <td>${esc(row.roll)}</td>
        <td>${esc(row.paperOrder)}</td>
        <td>${esc(row.qtyLabel)}</td>
        <td>${esc(row.globalId)}</td>
        <td>${esc(row.countReading)}</td>
        <td>${esc(row.kondisiPaper)}</td>
        <td>${esc(row.splicingPaper)}</td>
        <td>${esc(row.jamMpm)}</td>
        <td>${esc(row.lotNo)}</td>
        <td>${esc(row.kode)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="12">No data</td></tr>';

  // Generate H2O2 Rows
  const h2o2Rows = penambahanH2O2.length > 0
    ? penambahanH2O2.map((row, idx) => `
      <tr><td>${idx + 1}</td><td>${esc(row.volume)}</td><td>${esc(row.jam)}</td><td>${esc(row.oleh)}</td></tr>
    `).join("")
    : '<tr><td colspan="4">No data</td></tr>';

  // Generate MCCP Rows
  const mccpTableRows = mccpRows.length > 0
    ? mccpRows.map((row, idx) => `
      <tr><td>${idx + 1}</td><td>${esc(row.jam)}</td><td>${esc(row.persen)}</td><td>${esc(row.oleh)}</td></tr>
    `).join("")
    : '<tr><td colspan="4">No data</td></tr>';

  // Generate NC Rows
  const ncTableRows = ncRows.length > 0
    ? ncRows.map((row, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(row.waktuMulai)}</td>
        <td>${esc(row.waktuSelesai)}</td>
        <td>${esc(row.jumlahMenit)}</td>
        <td>${esc(row.uraianMasalah)}</td>
        <td>${esc(row.tindakan)}</td>
        <td>${esc(row.dilakukanOleh)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="7">No data</td></tr>';

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
          return `<td>${esc(v1)} / ${esc(v2)}</td>`;
        }).join("");
        return `<tr><td style="text-align:left;">${esc(param.parameter_name)} ${param.unit ? `(${param.unit})` : ""}</td>${cells}</tr>`;
      }).join("")
    : '<tr><td colspan="13">No data</td></tr>';

  return `
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

      <h3 class="section-title">INFORMASI PRODUK</h3>
      <table class="data-table">
        <tr><th>Tanggal</th><td>${esc(headerInfo.tanggal)}</td><th>Nama Produk</th><td>${esc(headerInfo.namaProduk)}</td></tr>
        <tr><th>Mesin</th><td>${esc(headerInfo.mesin)}</td><th>Line Mesin</th><td>${esc(headerInfo.lineMesin)}</td></tr>
        <tr><th>Kode Produksi</th><td>${esc(headerInfo.kodeProduksi)}</td><th>Kode Kadaluwarsa</th><td>${esc(headerInfo.kodeKadaluwarsa)}</td></tr>
      </table>

      <h3 class="section-title">PERSIAPAN PROSES</h3>
      <table class="data-table">
        <tr>
          <th>Prepare to Tube Seal</th><th>Tube Seal</th><th>Heat Sterilization</th><th>Spraying</th>
          <th>Sterilization Done</th><th>Production</th><th>Stop Production</th>
        </tr>
        <tr>
          <td>${esc(persiapanProses.prepareToTubeSeal)}</td>
          <td>${esc(persiapanProses.tubeSeal)}</td>
          <td>${esc(persiapanProses.heatSterilization)}</td>
          <td>${esc(persiapanProses.spraying)}</td>
          <td>${esc(persiapanProses.sterilizationDone)}</td>
          <td>${esc(persiapanProses.production)}</td>
          <td>${esc(persiapanProses.stopProduction)}</td>
        </tr>
      </table>

      <h3 class="section-title">COUNTER PACK</h3>
      <table class="data-table">
        <tr>
          <th>Counter 1 Stop</th><th>Counter 1 Start</th><th>Total Counter Pack</th><th>Waste Counter 2</th>
          <th>Hour Meter Start</th><th>Hour Meter Stop</th><th>Total Hour Meter</th>
        </tr>
        <tr>
          <td>${esc(counterPack.counter1Stop)}</td>
          <td>${esc(counterPack.counter1Start)}</td>
          <td>${esc(counterPack.totalCounterPack)}</td>
          <td>${esc(counterPack.wasteCounter2)}</td>
          <td>${esc(counterPack.hourMeterStart)}</td>
          <td>${esc(counterPack.hourMeterStop)}</td>
          <td>${esc(counterPack.totalHourMeter)}</td>
        </tr>
      </table>

      <h3 class="section-title">DATA PAPER</h3>
      <table class="data-table" style="font-size:8px;">
        <tr><th>No</th><th>Jam</th><th>Roll</th><th>Paper Order</th><th>Qty Label</th><th>Global ID</th><th>Count Reading</th><th>Kondisi Paper</th><th>Splicing Paper</th><th>Jam MPM</th><th>Lot No</th><th>Kode</th></tr>
        ${paperTableRows}
      </table>

      <h3 class="section-title">PENAMBAHAN H2O2</h3>
      <table class="data-table">
        <tr><th>No</th><th>Volume</th><th>Jam</th><th>Oleh</th></tr>
        ${h2o2Rows}
      </table>

      <h3 class="section-title">MCCP-4</h3>
      <table class="data-table">
        <tr><th>No</th><th>Jam</th><th>Persen (%)</th><th>Oleh</th></tr>
        ${mccpTableRows}
      </table>

      <h3 class="section-title">CHECK KONDISI</h3>
      <table class="data-table">
        <tr><th>Kondisi Inductor</th><th>Kondisi Dolly</th></tr>
        <tr><td>${esc(checkKondisi.kondisiInductor)}</td><td>${esc(checkKondisi.kondisiDolly)}</td></tr>
      </table>

      <h3 class="section-title">CATATAN KETIDAKSESUAIAN</h3>
      <table class="data-table">
        <tr><th>No</th><th>Waktu Mulai</th><th>Waktu Selesai</th><th>Jml Menit</th><th>Uraian Masalah</th><th>Tindakan</th><th>Dilakukan Oleh</th></tr>
        ${ncTableRows}
      </table>
      <p><strong>Total Stop:</strong> ${esc(totalStop)}</p>
      ${catatanAkhir ? `<div class="notes-box"><strong>Catatan:</strong> ${esc(catatanAkhir)}</div>` : ""}

      <div style="page-break-before: always;"></div>
      <h3 class="section-title">PENGECEKAN PRESSURE (1 JAM)</h3>
      <table class="data-table" style="font-size:8px;">
        <tr><th>Parameter</th>${Array.from({ length: 12 }, (_, i) => `<th>Jam ${i + 1}</th>`).join("")}</tr>
        ${pressure1JamRows}
      </table>

      <h3 class="section-title">PENGECEKAN PRESSURE (30 MENIT)</h3>
      <table class="data-table" style="font-size:8px;">
        <tr><th>Parameter</th>${Array.from({ length: 12 }, (_, i) => `<th>Pack ${i + 1}</th>`).join("")}</tr>
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

  const handleLanjutkanDraft = () => navigation.navigate("EditCilt", { item });

  const printToFile = async () => {
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; font-size: 10px; }
            .header-main-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
            .header-main-table td { border: 1px solid #000; padding: 8px; }
            .logo-section { width: 120px; background-color: #90EE90; text-align: center; }
            .logo-green { font-weight: bold; font-size: 16px; color: #2d5016; }
            .company-section { text-align: center; font-weight: bold; font-size: 14px; }
            .meta-section { width: 150px; font-size: 10px; }
            .meta-info-table td { border: none; padding: 2px; }
            .meta-label { font-weight: 600; width: 50px; }
            .header-title-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
            .header-title-table td { border: 1px solid #000; padding: 8px; }
            .title-label { width: 120px; text-align: center; background-color: #f5f5f5; }
            .title-content { text-align: center; font-weight: bold; font-size: 12px; }
            .section-title { font-weight: bold; background-color: #d9f0e3; padding: 8px; margin: 15px 0 8px 0; }
            .data-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9px; }
            .data-table th, .data-table td { border: 1px solid #ccc; padding: 5px; text-align: center; }
            .data-table th { background-color: #e7f2ed; }
            .general-info-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .general-info-table td { border: 1px solid #000; padding: 5px; }
            .notes-box { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; border-left: 3px solid #2e7d32; }
          </style>
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
          <Text style={styles.sectionTitle}>Informasi Produk</Text>
          <Text style={styles.dataText}>Nama Produk: {data.headerInfo?.namaProduk || "-"}</Text>
          <Text style={styles.dataText}>Mesin: {data.headerInfo?.mesin || "-"}</Text>
        </View>

        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Pressure Check</Text>
          <Text style={styles.dataText}>1 Jam: {(data.pressureCheck1Jam || []).length} parameters</Text>
          <Text style={styles.dataText}>30 Menit: {(data.pressureCheck30Min || []).length} parameters</Text>
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
});

export default DetailLaporanA3Flex;