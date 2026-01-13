import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { COLORS } from "../../constants/theme";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const headerMeta = { frm: "FIL - 053 - 08", rev: "", berlaku: "15 - Jan - 23", hal: "1 dari 3" };

// EXPORT: Generate PDF HTML untuk dipakai di ListCILT
export const generatePDFHTML = (item) => {
  let inspectionData = [];
  try { inspectionData = JSON.parse(item.inspectionData); } catch (e) { inspectionData = []; }
  const data = inspectionData[0] || {};

  const productInfo = data.productInfo || {};
  const paperRows = data.paperRows || [];
  const checkValues = data.values || {};
  const grouped = data.grouped || {};

  const productInfoHtml = `
    <table class="data-table">
      <tr><th>Product Name</th><td>${esc(productInfo.productName)}</td><th>Production Date</th><td>${esc(productInfo.productionDate)}</td></tr>
      <tr><th>Date / Shift</th><td>${esc(productInfo.dateShift)}</td><th>Expired Date</th><td>${esc(productInfo.expiredDate)}</td></tr>
      <tr><th>Prod Start</th><td>${esc(productInfo.prodStart)}</td><th>Hour Meter Start</th><td>${esc(productInfo.hourMeterStart)}</td></tr>
      <tr><th>Prod Stop</th><td>${esc(productInfo.prodStop)}</td><th>Hour Meter Stop</th><td>${esc(productInfo.hourMeterStop)}</td></tr>
      <tr><th>Carton Sucked Off</th><td>${esc(productInfo.cartonSuckedOff)} pcs</td><th>Carton Filled</th><td>${esc(productInfo.cartonFilled)} pcs</td></tr>
      <tr><th>Carton Diverted</th><td>${esc(productInfo.cartonDiverted)} pcs</td><th>Carton Produced</th><td>${esc(productInfo.cartonProduced)} pcs</td></tr>
    </table>
  `;

  const paperHeaders = Array.from({ length: 4 }).map(() => `<th>Box No</th><th>Start Date</th><th>Start Time</th>`).join("");
  const paperRowsHtml = paperRows.length > 0
    ? paperRows.map((row) => {
        const cells = Object.keys(row).map(key => `<td>${esc(row[key])}</td>`).join("");
        return `<tr>${cells}</tr>`;
      }).join("")
    : '<tr><td colspan="12">No data</td></tr>';

  let machineCheckHtml = "";
  Object.keys(grouped).forEach(section => {
    machineCheckHtml += `<div class="sub-section-title">${esc(section)}</div><table class="data-table"><tr><th style="width:50%;">Parameter</th><th>Value</th><th>Status</th></tr>`;
    grouped[section].forEach(paramItem => {
      const value = checkValues[paramItem.id] || "-";
      let status = "-", statusColor = "#666";
      if (value && value !== "-") {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          if (paramItem.value_type === "range" && paramItem.min_value !== null && paramItem.max_value !== null) {
            status = numValue >= paramItem.min_value && numValue <= paramItem.max_value ? "OK" : "NG";
            statusColor = status === "OK" ? "#4CAF50" : "#D32F2F";
          } else if (paramItem.value_type === "exact" && paramItem.exact_value !== null) {
            status = numValue === paramItem.exact_value ? "OK" : "NG";
            statusColor = status === "OK" ? "#4CAF50" : "#D32F2F";
          }
        }
      }
      const rangeHint = paramItem.range_text || (paramItem.value_type === "range" && paramItem.min_value !== null ? `${paramItem.min_value} - ${paramItem.max_value} ${paramItem.unit || ""}` : paramItem.value_type === "exact" ? `Exact ${paramItem.exact_value} ${paramItem.unit || ""}` : "");
      machineCheckHtml += `<tr><td style="text-align:left;">${esc(paramItem.parameter_name)}${rangeHint ? `<br/><small style="color:#777;">${esc(rangeHint)}</small>` : ""}</td><td>${esc(value)}</td><td style="color:${statusColor}; font-weight:bold;">${status}</td></tr>`;
    });
    machineCheckHtml += `</table>`;
  });

  return `
    <section class="report-section combixg-section">
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
          <tr><td class="title-label">JUDUL</td><td class="title-content">LAPORAN COMBI XG SLIM 24</td></tr>
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
      ${productInfoHtml}

      <h3 class="section-title">PAPER AKKLIMATISASI</h3>
      <table class="data-table" style="font-size:8px;">
        <thead><tr>${paperHeaders}</tr></thead>
        <tbody>${paperRowsHtml}</tbody>
      </table>

      <div style="page-break-before: always;"></div>
      <h3 class="section-title">MACHINE CHECK PARAMETERS</h3>
      ${machineCheckHtml || '<p style="text-align:center;">No machine check data</p>'}
    </section>
  `;
};

// COMPONENT
const DetailLaporanCombiXG = ({ route, navigation }) => {
  const { item } = route.params;
  const [inspectionData] = useState(() => { try { return JSON.parse(item.inspectionData); } catch (e) { return []; } });
  const data = inspectionData[0] || {};
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
      .sub-section-title { font-weight: bold; background-color: #eef5ef; padding: 6px; margin: 10px 0 5px 0; border-left: 3px solid #2e7d32; }
      .data-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9px; }
      .data-table th, .data-table td { border: 1px solid #ccc; padding: 5px; text-align: center; }
      .data-table th { background-color: #e7f2ed; }
      .general-info-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      .general-info-table td { border: 1px solid #000; padding: 5px; }
    </style></head><body>${generatePDFHTML(item)}</body></html>`;
    try { const { uri } = await Print.printToFileAsync({ html }); await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" }); } 
    catch (error) { console.error("Error generating PDF:", error); }
  };

  const productInfo = data.productInfo || {};
  const grouped = data.grouped || {};

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
          <View style={styles.headerRowBottom}><Text style={styles.headerLeftCell}>JUDUL</Text><Text style={styles.headerTitleCell}>LAPORAN COMBI XG SLIM 24</Text></View>
        </View>
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>History Laporan</Text>
          <Text style={styles.historyText}>Form disubmit oleh: <Text style={styles.historyBold}>{item.username || "Unknown"}</Text></Text>
          <Text style={styles.historyText}>Waktu submit: <Text style={styles.historyBold}>{moment(item.date).format("DD-MM-YYYY HH:mm:ss")}</Text></Text>
          <Text style={styles.historyText}>Process Order: <Text style={styles.historyBold}>{item.processOrder}</Text></Text>
        </View>
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Informasi Produk</Text>
          <Text style={styles.dataText}>Product Name: {productInfo.productName || "-"}</Text>
          <Text style={styles.dataText}>Carton Produced: {productInfo.cartonProduced || "-"} pcs</Text>
        </View>
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Machine Check Parameters</Text>
          <Text style={styles.dataText}>Sections: {Object.keys(grouped).length}</Text>
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
  submitButton: { backgroundColor: COLORS.blue, padding: 15, borderRadius: 8, alignItems: "center", marginHorizontal: 12, marginBottom: 20 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default DetailLaporanCombiXG;