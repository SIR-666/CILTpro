import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { COLORS } from "../../constants/theme";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const headerMeta = { frm: "FIL - 001 - 08", rev: "", berlaku: "15 - Jan - 2019", hal: "1 dari 2" };

// EXPORT: Generate PDF HTML untuk dipakai di ListCILT
export const generatePDFHTML = (item) => {
  let inspectionData = [];
  try { inspectionData = JSON.parse(item.inspectionData); } catch (e) { inspectionData = []; }
  const data = inspectionData[0] || {};

  const formData = data.formData || {};
  const rows = data.rows || [];
  const totalWarehouse = rows.map((r) => parseFloat(r?.jumlah || 0)).filter((n) => !isNaN(n)).reduce((a, b) => a + b, 0);

  const detailRows = rows.length > 0
    ? rows.filter(row => row.shift || row.var || row.jumlah).map((row, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(row.shift)}</td>
        <td>${esc(row.var)}</td>
        <td>${esc(row.prpPaper)}</td>
        <td>${esc(row.adBlue)}</td>
        <td>${esc(row.vol)}</td>
        <td>${esc(row.palletNo)}</td>
        <td>${esc(row.cartonNo)}</td>
        <td>${esc(row.ctn)}</td>
        <td>${esc(row.jam)}</td>
        <td>${esc(row.jumlah)}</td>
        <td>${esc(row.keterangan)}</td>
        <td style="font-size:8px;">${esc(row.user)}<br/>${esc(row.time)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="13">No data</td></tr>';

  return `
    <section class="report-section robot-section">
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
          <tr><td class="title-label">JUDUL</td><td class="title-content">LAPORAN ROBOT PALLETIZER</td></tr>
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

      <h3 class="section-title">INFORMASI MESIN</h3>
      <table class="data-table">
        <tr><th>Mesin / Line</th><td>${esc(formData.mesinLine)}</td></tr>
        <tr><th>Kode Prod.</th><td>${esc(formData.kodeProd)}</td></tr>
        <tr><th>Kode Expire</th><td>${esc(formData.kodeExpire)}</td></tr>
      </table>

      <h3 class="section-title">DATA INSPEKSI</h3>
      <table class="data-table" style="font-size:8px;">
        <thead>
          <tr>
            <th>No</th><th>Shift</th><th>VAR</th><th>PRP Paper</th><th>Ad Blue</th><th>Vol</th>
            <th>Pallet No</th><th>Carton No</th><th>CTN</th><th>Jam</th><th>Jumlah</th><th>Keterangan</th><th>User/Time</th>
          </tr>
        </thead>
        <tbody>${detailRows}</tbody>
      </table>

      <div class="total-box">
        <div class="total-label">JUMLAH YANG DITERIMA WAREHOUSE</div>
        <div class="total-value">${totalWarehouse}</div>
      </div>
    </section>
  `;
};

// COMPONENT
const DetailLaporanRobotPalletizerFiller = ({ route, navigation }) => {
  const { item } = route.params;
  const [inspectionData] = useState(() => { try { return JSON.parse(item.inspectionData); } catch (e) { return []; } });
  const data = inspectionData[0] || {};
  const formData = data.formData || {};
  const rows = data.rows || [];
  const totalWarehouse = rows.map((r) => parseFloat(r?.jumlah || 0)).filter((n) => !isNaN(n)).reduce((a, b) => a + b, 0);
  const handleLanjutkanDraft = () => navigation.navigate("EditCilt", { item });

  const printToFile = async () => {
    const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" /><style>
      body { font-family: Arial; margin: 15px; font-size: 10px; }
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
      .data-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      .data-table th, .data-table td { border: 1px solid #ccc; padding: 5px; text-align: center; }
      .data-table th { background-color: #e7f2ed; }
      .general-info-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      .general-info-table td { border: 1px solid #000; padding: 5px; }
      .total-box { background: #F0FDF4; padding: 15px; border-radius: 10px; margin-top: 15px; border: 1px solid #86efac; text-align: center; }
      .total-label { font-size: 12px; font-weight: 700; color: #166534; margin-bottom: 8px; }
      .total-value { font-size: 24px; font-weight: 700; color: #065f46; }
    </style></head><body>${generatePDFHTML(item)}</body></html>`;
    try { const { uri } = await Print.printToFileAsync({ html }); await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" }); } 
    catch (error) { console.error("Error generating PDF:", error); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.headerWrap}>
          <View style={styles.headerRowTop}>
            <View style={styles.headerLogoBox}><Image source={require("../../assets/GreenfieldsLogo_Green.png")} style={styles.headerLogoImg} resizeMode="contain" /></View>
            <View style={styles.headerCompanyBox}><Text style={styles.headerCompanyText}>PT. GREENFIELDS INDONESIA</Text></View>
            <View style={styles.headerMetaBox}>
              <View style={styles.metaRow}><Text style={styles.metaKey}>FRM</Text><Text style={styles.metaVal}>{headerMeta.frm}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Rev</Text><Text style={styles.metaVal}>{headerMeta.rev || "-"}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Berlaku</Text><Text style={styles.metaVal}>{headerMeta.berlaku}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Hal</Text><Text style={styles.metaVal}>{headerMeta.hal}</Text></View>
            </View>
          </View>
          <View style={styles.headerRowBottom}><Text style={styles.headerLeftCell}>JUDUL</Text><Text style={styles.headerTitleCell}>LAPORAN ROBOT PALLETIZER</Text></View>
        </View>
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>History Laporan</Text>
          <Text style={styles.historyText}>Form disubmit oleh: <Text style={styles.historyBold}>{data.user || item.username || "Unknown"}</Text></Text>
          <Text style={styles.historyText}>Waktu submit: <Text style={styles.historyBold}>{moment(item.date).format("DD-MM-YYYY HH:mm:ss")}</Text></Text>
          <Text style={styles.historyText}>Process Order: <Text style={styles.historyBold}>{item.processOrder}</Text></Text>
        </View>
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Informasi Mesin</Text>
          <Text style={styles.dataText}>Mesin / Line: {formData.mesinLine || "-"}</Text>
          <Text style={styles.dataText}>Kode Prod.: {formData.kodeProd || "-"}</Text>
          <Text style={styles.dataText}>Kode Expire: {formData.kodeExpire || "-"}</Text>
        </View>
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Data Inspeksi</Text>
          <Text style={styles.dataText}>Total Entries: {rows.filter(row => row.shift || row.var || row.jumlah).length}</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>JUMLAH YANG DITERIMA WAREHOUSE</Text>
          <View style={styles.totalValueBox}>
            <Text style={styles.totalTitle}>TOTAL</Text>
            <Text style={styles.totalValue}>{totalWarehouse}</Text>
          </View>
        </View>
        {item.status === 1 ? (
          <TouchableOpacity style={styles.submitButton} onPress={handleLanjutkanDraft}><Text style={styles.submitButtonText}>LANJUTKAN DRAFT</Text></TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={printToFile}><Text style={styles.submitButtonText}>DOWNLOAD REPORT</Text></TouchableOpacity>
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
  totalBox: { backgroundColor: "#F0FDF4", padding: 14, borderRadius: 10, marginTop: 10, marginBottom: 15, borderWidth: 1, borderColor: "#86efac" },
  totalLabel: { fontSize: 13, fontWeight: "700", color: "#166534", textAlign: "center", marginBottom: 10 },
  totalValueBox: { backgroundColor: "#fff", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#a7f3d0" },
  totalTitle: { fontSize: 12, fontWeight: "600", color: "#0d9488", marginBottom: 4 },
  totalValue: { fontSize: 20, fontWeight: "700", color: "#065f46" },
  submitButton: { backgroundColor: COLORS.blue, padding: 15, borderRadius: 8, alignItems: "center", marginHorizontal: 12, marginBottom: 20 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default DetailLaporanRobotPalletizerFiller;