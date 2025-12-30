import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { COLORS } from "../../constants/theme";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const headerMeta = { frm: "FIL - 082 - 01", rev: "", berlaku: "15 - Jan - 23", hal: "1 dari 2" };

// Helper function to safely parse inspectionData
const parseInspectionData = (inspectionData) => {
  if (!inspectionData) return [];
  if (Array.isArray(inspectionData)) return inspectionData;
  if (typeof inspectionData === 'string') {
    try {
      const parsed = JSON.parse(inspectionData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.log("Error parsing inspectionData:", e);
      return [];
    }
  }
  if (typeof inspectionData === 'object') return [inspectionData];
  return [];
};

// EXPORT: Generate PDF HTML untuk dipakai di ListCILT - PORTRAIT LAYOUT
export const generatePDFHTML = (item) => {
  const inspectionData = parseInspectionData(item.inspectionData);
  const data = inspectionData[0] || {};

  const hoseTable = data.hoseTable || [];
  const glueData = data.glueData || [];
  const ncData = data.ncData || [];
  const headerTN = data.headerTN || Array(12).fill({ T: "", N: "" });

  const totalQty = glueData.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0).toFixed(1);

  // Filter only filled entries
  const filledGlueData = glueData.filter(row => row.jam || row.qty);
  const filledNCData = ncData.filter(row => row.stop || row.start || row.masalah);

  // Build Hose Table HTML - split into 2 tables for portrait
  let hoseRows1 = "";
  let hoseRows2 = "";

  if (hoseTable.length > 0) {
    const rowLabels = ["1. Tank/Nozzle", "2. Tank/Nozzle", "3. Tank/Nozzle", "4. Tank/Nozzle"];

    hoseTable.forEach((row, rowIdx) => {
      let cells1 = "";
      let cells2 = "";
      if (Array.isArray(row)) {
        row.forEach((cell, colIdx) => {
          const hose = cell?.hose || "-";
          const nozzle = cell?.nozzle || "-";
          const cellHtml = `<td class="hose-data-cell">${esc(hose)}/${esc(nozzle)}</td>`;
          if (colIdx < 6) {
            cells1 += cellHtml;
          } else {
            cells2 += cellHtml;
          }
        });
      }
      hoseRows1 += `<tr><td class="hose-label-cell">${rowLabels[rowIdx]}</td>${cells1}</tr>`;
      hoseRows2 += `<tr><td class="hose-label-cell">${rowLabels[rowIdx]}</td>${cells2}</tr>`;
    });
  } else {
    hoseRows1 = '<tr><td colspan="7" class="no-data">No data</td></tr>';
    hoseRows2 = '<tr><td colspan="7" class="no-data">No data</td></tr>';
  }

  // Build Header T/N rows split
  let headerTNRow1 = "";
  let headerTNRow2 = "";
  headerTN.forEach((tn, idx) => {
    const t = tn?.T || "-";
    const n = tn?.N || "-";
    const cellHtml = `<td class="hose-data-cell">${esc(t)}/${esc(n)}</td>`;
    if (idx < 6) {
      headerTNRow1 += cellHtml;
    } else {
      headerTNRow2 += cellHtml;
    }
  });

  // Glue rows
  const glueRows = filledGlueData.length > 0
    ? filledGlueData.map((row, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${esc(row.jam) || "-"}</td>
          <td>${esc(row.qty) || "-"}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="3" class="no-data">No data</td></tr>';

  // NC rows
  const ncRows = filledNCData.length > 0
    ? filledNCData.map((row) => `
        <tr>
          <td>${esc(row.stop) || "-"}</td>
          <td>${esc(row.start) || "-"}</td>
          <td>${esc(row.durasi) || "-"}</td>
          <td class="text-left">${esc(row.masalah) || "-"}</td>
          <td class="text-left">${esc(row.corrective) || "-"}</td>
          <td>${esc(row.pic) || "-"}</td>
          <td>${esc(row.lossPack) || "-"}</td>
          <td>${esc(row.lossKarton) || "-"}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="8" class="no-data">No data</td></tr>';

  return `
    <section class="report-section frans-section">
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
            <td class="title-content">LAPORAN FRANS WP 25 CASE PACKER (LINE C)</td>
          </tr>
        </table>
      </div>

      <div class="report-info">
        <p><strong>Process Order:</strong> ${esc(item.processOrder)}</p>
        <table class="general-info-table">
          <tr>
            <td><strong>Date:</strong></td>
            <td>${moment(item.date).format("DD/MM/YY HH:mm:ss")}</td>
            <td><strong>Product:</strong></td>
            <td>${esc(item.product)}</td>
          </tr>
          <tr>
            <td><strong>Plant:</strong></td>
            <td>${esc(item.plant)}</td>
            <td><strong>Line:</strong></td>
            <td>${esc(item.line)}</td>
          </tr>
          <tr>
            <td><strong>Machine:</strong></td>
            <td>${esc(item.machine)}</td>
            <td><strong>Shift:</strong></td>
            <td>${esc(item.shift)}</td>
          </tr>
        </table>
      </div>

      <h3 class="section-title">INFORMASI PRODUK</h3>
      <table class="data-table info-table">
        <tr>
          <th>Nama Produk</th>
          <td>${esc(data.namaProduk) || "-"}</td>
          <th>Kode Produksi</th>
          <td>${esc(data.kodeProduksi) || "-"}</td>
        </tr>
        <tr>
          <th>Rasa</th>
          <td>${esc(data.rasa) || "-"}</td>
          <th>Kode Kadaluwarsa</th>
          <td>${esc(data.kodeKadaluwarsa) || "-"}</td>
        </tr>
        <tr>
          <th>Line MC</th>
          <td>${esc(data.lineMc) || "-"}</td>
          <th>Start Produksi</th>
          <td>${esc(data.startProduksi) || "-"}</td>
        </tr>
        <tr>
          <th>Air Supply</th>
          <td>${esc(data.airSupply) || "-"}</td>
          <th>Stop Produksi</th>
          <td>${esc(data.stopProduksi) || "-"}</td>
        </tr>
        <tr>
          <th>Hours Start</th>
          <td>${esc(data.hoursStart) || "-"}</td>
          <th>Hours Stop</th>
          <td>${esc(data.hoursStop) || "-"}</td>
        </tr>
      </table>

      <h3 class="section-title">PEMERIKSAAN TEMPERATURE HOSE (KELIPATAN 3 JAM)</h3>
      <p class="section-note">Jam 1-6</p>
      <table class="data-table hose-table">
        <thead>
          <tr>
            <th class="hose-label-cell">TEMP (°C)</th>
            ${Array.from({ length: 6 }, (_, i) => `<th>Jam ${i + 1}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="hose-label-cell">Header T/N</td>
            ${headerTNRow1}
          </tr>
          ${hoseRows1}
        </tbody>
      </table>
      
      <p class="section-note">Jam 7-12</p>
      <table class="data-table hose-table">
        <thead>
          <tr>
            <th class="hose-label-cell">TEMP (°C)</th>
            ${Array.from({ length: 6 }, (_, i) => `<th>Jam ${i + 7}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="hose-label-cell">Header T/N</td>
            ${headerTNRow2}
          </tr>
          ${hoseRows2}
        </tbody>
      </table>

      <h3 class="section-title">PENAMBAHAN GLUE</h3>
      <p class="section-note">Dilakukan setiap 700 CTN (± 1 jam), Penambahan glue 1 kg</p>
      <table class="data-table glue-table">
        <thead>
          <tr>
            <th style="width: 15%;">NO</th>
            <th style="width: 42%;">JAM</th>
            <th style="width: 43%;">QTY (KG)</th>
          </tr>
        </thead>
        <tbody>
          ${glueRows}
          <tr class="total-row">
            <td colspan="2"><strong>TOTAL</strong></td>
            <td><strong>${totalQty} kg</strong></td>
          </tr>
        </tbody>
      </table>

      <h3 class="section-title">CATATAN KETIDAKSESUAIAN SELAMA PROSES PRODUKSI</h3>
      <table class="data-table nc-table">
        <thead>
          <tr>
            <th colspan="3">Waktu (menit)</th>
            <th rowspan="2" style="width: 18%;">Masalah</th>
            <th rowspan="2" style="width: 18%;">Tindakan Koreksi</th>
            <th rowspan="2">PIC</th>
            <th colspan="2">Loss</th>
          </tr>
          <tr>
            <th>Stop</th>
            <th>Start</th>
            <th>Durasi</th>
            <th>Pack</th>
            <th>Karton</th>
          </tr>
        </thead>
        <tbody>
          ${ncRows}
        </tbody>
      </table>

      ${data.catatan ? `<div class="notes-box"><strong>CATATAN:</strong> ${esc(data.catatan)}</div>` : ""}
    </section>
  `;
};

// Generate full PDF styles - PORTRAIT LAYOUT
const getPDFStyles = () => `
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  
  * {
    box-sizing: border-box;
  }
  
  body { 
    font-family: Arial, sans-serif; 
    margin: 0;
    padding: 15px;
    font-size: 11px; 
    color: #333;
    line-height: 1.4;
  }
  
  /* Header Styles */
  .header-container {
    border: 2px solid #333;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 15px;
  }
  
  .header-main-table { 
    width: 100%; 
    border-collapse: collapse;
  }
  
  .header-main-table td { 
    border: 1px solid #333; 
    padding: 8px; 
    vertical-align: middle;
  }
  
  .logo-section { 
    width: 100px; 
    background: linear-gradient(135deg, #90EE90 0%, #6BBF6B 100%);
    text-align: center; 
  }
  
  .logo-green { 
    font-weight: bold; 
    font-size: 14px; 
    color: #1a5a1a; 
    font-style: italic;
  }
  
  .company-section { 
    text-align: center; 
    font-weight: bold; 
    font-size: 13px;
    background-color: #f8f9fa;
  }
  
  .meta-section { 
    width: 140px; 
    font-size: 9px;
    background-color: #fafafa;
  }
  
  .meta-info-table { 
    width: 100%; 
    border-collapse: collapse; 
  }
  
  .meta-info-table td { 
    border: none !important; 
    padding: 2px 4px; 
  }
  
  .meta-label { 
    font-weight: 600; 
    width: 45px; 
    color: #555;
  }
  
  .header-title-table { 
    width: 100%; 
    border-collapse: collapse;
  }
  
  .header-title-table td { 
    border: 1px solid #333; 
    padding: 8px; 
  }
  
  .title-label { 
    width: 100px; 
    text-align: center; 
    background-color: #e8f5e9;
    font-weight: 600;
    font-size: 10px;
  }
  
  .title-content { 
    text-align: center; 
    font-weight: bold; 
    font-size: 12px;
    color: #1b5e20;
  }
  
  /* Section Styles */
  .section-title { 
    font-weight: bold; 
    background: linear-gradient(90deg, #c8e6c9 0%, #e8f5e9 100%);
    padding: 8px 12px; 
    margin: 15px 0 8px 0; 
    border-radius: 4px;
    color: #1b5e20;
    font-size: 12px;
    border-left: 4px solid #2e7d32;
  }
  
  .section-note {
    font-style: italic;
    font-size: 9px;
    color: #666;
    margin: 0 0 5px 0;
    padding-left: 5px;
  }
  
  /* Report Info */
  .report-info {
    background-color: #f8f9fa;
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 15px;
    border: 1px solid #e0e0e0;
  }
  
  .report-info p {
    margin: 0 0 8px 0;
    font-size: 11px;
  }
  
  .general-info-table { 
    width: 100%; 
    border-collapse: collapse; 
  }
  
  .general-info-table td { 
    border: 1px solid #ccc; 
    padding: 6px 8px;
    font-size: 10px;
  }
  
  .general-info-table td:nth-child(odd) {
    background-color: #f5f5f5;
    width: 18%;
  }
  
  .general-info-table td:nth-child(even) {
    width: 32%;
  }
  
  /* Data Table Styles */
  .data-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 8px 0 15px 0; 
    font-size: 10px; 
  }
  
  .data-table th, .data-table td { 
    border: 1px solid #bbb; 
    padding: 6px 8px; 
    text-align: center; 
  }
  
  .data-table th { 
    background-color: #e8f5e9; 
    font-weight: 700;
    color: #1b5e20;
    font-size: 9px;
  }
  
  .data-table td {
    background-color: #fff;
  }
  
  .data-table tr:nth-child(even) td {
    background-color: #fafafa;
  }
  
  /* Info Table */
  .info-table th {
    width: 18%;
    text-align: left;
    padding-left: 10px;
    background-color: #e8f5e9;
  }
  
  .info-table td {
    text-align: left;
    padding-left: 10px;
    width: 32%;
  }
  
  /* Hose Table */
  .hose-table {
    font-size: 9px;
  }
  
  .hose-table th {
    padding: 5px 3px;
    font-size: 8px;
  }
  
  .hose-table td {
    padding: 5px 3px;
  }
  
  .hose-label-cell {
    font-weight: 700;
    background-color: #f0f7f2 !important;
    text-align: left;
    padding-left: 8px !important;
    width: 100px;
  }
  
  .hose-data-cell {
    font-size: 9px;
  }
  
  /* Glue Table */
  .glue-table {
    width: 70%;
    margin: 0 auto;
  }
  
  .glue-table th, .glue-table td {
    padding: 6px 10px;
  }
  
  .total-row {
    background-color: #e8f5e9 !important;
    font-weight: 700;
  }
  
  .total-row td {
    background-color: #e8f5e9 !important;
    text-align: center;
  }
  
  /* NC Table */
  .nc-table {
    font-size: 9px;
  }
  
  .nc-table th {
    font-size: 8px;
    padding: 4px 3px;
  }
  
  .nc-table td {
    padding: 4px 3px;
    font-size: 8px;
  }
  
  .text-left {
    text-align: left !important;
    padding-left: 6px !important;
  }
  
  /* Notes Box */
  .notes-box { 
    background: #f8f9fa; 
    padding: 12px; 
    margin-top: 15px; 
    border-left: 4px solid #2e7d32; 
    border-radius: 4px;
  }
  
  /* No Data */
  .no-data {
    color: #999;
    font-style: italic;
    text-align: center;
    padding: 15px;
  }
`;

// COMPONENT
const DetailLaporanFransCasePacker = ({ route, navigation }) => {
  const { item } = route.params;

  const [inspectionData] = useState(() => parseInspectionData(item.inspectionData));
  const data = inspectionData[0] || {};

  const handleLanjutkanDraft = () => navigation.navigate("EditCilt", { item });

  // Helper render Temperature Hose Preview
  const renderHosePreview = () => {
    const hoseTable = data.hoseTable || [];
    if (hoseTable.length === 0) return <Text style={styles.dataText}>No data</Text>;

    const rowLabels = ["1. Tank/Nozzle", "2. Tank/Nozzle", "3. Tank/Nozzle", "4. Tank/Nozzle"];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.previewTable}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewHeaderText, { width: 100 }]}>TEMP</Text>
            {Array.from({ length: 12 }, (_, i) => (
              <Text key={i} style={[styles.previewHeaderText, { width: 60 }]}>Jam {i + 1}</Text>
            ))}
          </View>
          {hoseTable.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.previewRow}>
              <Text style={[styles.previewCellText, { width: 100, fontWeight: '600' }]}>{rowLabels[rowIdx]}</Text>
              {Array.isArray(row) && row.map((cell, colIdx) => (
                <Text key={colIdx} style={[styles.previewCellText, { width: 60 }]}>
                  {cell?.hose || "-"}/{cell?.nozzle || "-"}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  // Helper render Glue Preview
  const renderGluePreview = () => {
    const glueData = data.glueData || [];
    const filledEntries = glueData.filter(row => row.jam || row.qty);
    const totalQty = glueData.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0).toFixed(1);

    if (filledEntries.length === 0) return <Text style={styles.dataText}>No data</Text>;

    return (
      <View style={styles.previewTable}>
        <View style={styles.previewHeader}>
          <Text style={[styles.previewHeaderText, { flex: 0.5 }]}>No</Text>
          <Text style={[styles.previewHeaderText, { flex: 1 }]}>Jam</Text>
          <Text style={[styles.previewHeaderText, { flex: 1 }]}>Qty (Kg)</Text>
        </View>
        {filledEntries.slice(0, 10).map((row, idx) => (
          <View key={idx} style={styles.previewRow}>
            <Text style={[styles.previewCellText, { flex: 0.5 }]}>{idx + 1}</Text>
            <Text style={[styles.previewCellText, { flex: 1 }]}>{row.jam || "-"}</Text>
            <Text style={[styles.previewCellText, { flex: 1 }]}>{row.qty || "-"}</Text>
          </View>
        ))}
        <View style={[styles.previewRow, { backgroundColor: '#e8f5e9' }]}>
          <Text style={[styles.previewCellText, { flex: 1.5, fontWeight: '700' }]}>TOTAL</Text>
          <Text style={[styles.previewCellText, { flex: 1, fontWeight: '700' }]}>{totalQty} kg</Text>
        </View>
        {filledEntries.length > 10 && (
          <Text style={styles.moreText}>+{filledEntries.length - 10} more entries</Text>
        )}
      </View>
    );
  };

  // Helper render NC Preview
  const renderNCPreview = () => {
    const ncData = data.ncData || [];
    const filledEntries = ncData.filter(row => row.stop || row.start || row.masalah);

    if (filledEntries.length === 0) return <Text style={styles.dataText}>No data</Text>;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.previewTable}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewHeaderText, { width: 60 }]}>Stop</Text>
            <Text style={[styles.previewHeaderText, { width: 60 }]}>Start</Text>
            <Text style={[styles.previewHeaderText, { width: 60 }]}>Durasi</Text>
            <Text style={[styles.previewHeaderText, { width: 150 }]}>Masalah</Text>
            <Text style={[styles.previewHeaderText, { width: 150 }]}>Tindakan</Text>
            <Text style={[styles.previewHeaderText, { width: 70 }]}>PIC</Text>
            <Text style={[styles.previewHeaderText, { width: 60 }]}>Loss Pack</Text>
            <Text style={[styles.previewHeaderText, { width: 70 }]}>Loss Karton</Text>
          </View>
          {filledEntries.slice(0, 10).map((row, idx) => (
            <View key={idx} style={styles.previewRow}>
              <Text style={[styles.previewCellText, { width: 60 }]}>{row.stop || "-"}</Text>
              <Text style={[styles.previewCellText, { width: 60 }]}>{row.start || "-"}</Text>
              <Text style={[styles.previewCellText, { width: 60 }]}>{row.durasi || "-"}</Text>
              <Text style={[styles.previewCellText, { width: 150 }]} numberOfLines={2}>{row.masalah || "-"}</Text>
              <Text style={[styles.previewCellText, { width: 150 }]} numberOfLines={2}>{row.corrective || "-"}</Text>
              <Text style={[styles.previewCellText, { width: 70 }]}>{row.pic || "-"}</Text>
              <Text style={[styles.previewCellText, { width: 60 }]}>{row.lossPack || "-"}</Text>
              <Text style={[styles.previewCellText, { width: 70 }]}>{row.lossKarton || "-"}</Text>
            </View>
          ))}
          {filledEntries.length > 10 && (
            <Text style={styles.moreText}>+{filledEntries.length - 10} more entries</Text>
          )}
        </View>
      </ScrollView>
    );
  };

  const printToFile = async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta charset="UTF-8">
          <style>${getPDFStyles()}</style>
        </head>
        <body>
          ${generatePDFHTML(item)}
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
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
            <Text style={styles.headerTitleCell}>LAPORAN FRANS WP 25 CASE PACKER</Text>
          </View>
        </View>

        {/* History */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>History Laporan</Text>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Form disubmit oleh:</Text>
            <Text style={styles.historyValue}>{data.user || item.username || "Unknown"}</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Waktu submit:</Text>
            <Text style={styles.historyValue}>{moment(item.date).format("DD-MM-YYYY HH:mm:ss")}</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Process Order:</Text>
            <Text style={styles.historyValue}>{item.processOrder}</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Status:</Text>
            <View style={[styles.statusBadge, item.status === 1 ? styles.statusDraft : styles.statusSubmitted]}>
              <Text style={styles.statusText}>{item.status === 1 ? "DRAFT" : "SUBMITTED"}</Text>
            </View>
          </View>
        </View>

        {/* Informasi Produk */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Informasi Produk</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nama Produk</Text>
              <Text style={styles.infoValue}>{data.namaProduk || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Kode Produksi</Text>
              <Text style={styles.infoValue}>{data.kodeProduksi || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Rasa</Text>
              <Text style={styles.infoValue}>{data.rasa || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Kode Kadaluwarsa</Text>
              <Text style={styles.infoValue}>{data.kodeKadaluwarsa || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Line MC</Text>
              <Text style={styles.infoValue}>{data.lineMc || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Air Supply</Text>
              <Text style={styles.infoValue}>{data.airSupply || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Start Produksi</Text>
              <Text style={styles.infoValue}>{data.startProduksi || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Stop Produksi</Text>
              <Text style={styles.infoValue}>{data.stopProduksi || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Hours Start</Text>
              <Text style={styles.infoValue}>{data.hoursStart || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Hours Stop</Text>
              <Text style={styles.infoValue}>{data.hoursStop || "-"}</Text>
            </View>
          </View>
        </View>

        {/* Temperature Hose */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Pemeriksaan Temperature Hose</Text>
          {renderHosePreview()}
        </View>

        {/* Penambahan Glue */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Penambahan Glue</Text>
          {renderGluePreview()}
        </View>

        {/* Catatan Ketidaksesuaian */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Catatan Ketidaksesuaian</Text>
          {renderNCPreview()}
        </View>

        {/* Action Button */}
        {item.status === 1 ? (
          <TouchableOpacity style={styles.draftButton} onPress={handleLanjutkanDraft}>
            <Text style={styles.buttonText}>LANJUTKAN DRAFT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={printToFile}>
            <Text style={styles.buttonText}>DOWNLOAD REPORT</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7f8",
  },
  // Header Styles
  headerWrap: {
    borderWidth: 1,
    borderColor: "#d7d7d7",
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
    margin: 12,
    marginBottom: 10,
  },
  headerRowTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  headerLogoBox: {
    width: 80,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoImg: {
    width: "100%",
    height: "100%",
  },
  headerCompanyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCompanyText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  headerMetaBox: {
    width: 120,
    borderLeftWidth: 1,
    borderColor: "#e5e5e5",
    paddingLeft: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  metaKey: {
    width: 45,
    fontSize: 9,
    color: "#666",
  },
  metaVal: {
    flex: 1,
    fontSize: 9,
    fontWeight: "600",
    color: "#333",
  },
  headerRowBottom: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#e5e5e5",
  },
  headerLeftCell: {
    width: 80,
    paddingVertical: 8,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 10,
    backgroundColor: "#fafafa",
    borderRightWidth: 1,
    borderColor: "#e5e5e5",
  },
  headerTitleCell: {
    flex: 1,
    paddingVertical: 8,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 11,
    color: "#2f5d43",
  },
  // History Styles
  historyContainer: {
    backgroundColor: "#fff",
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e1e5ea",
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2f5d43",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#e5e5e5",
    paddingBottom: 8,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  historyLabel: {
    fontSize: 12,
    color: "#666",
    width: 120,
  },
  historyValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusDraft: {
    backgroundColor: "#fff3cd",
  },
  statusSubmitted: {
    backgroundColor: "#d4edda",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  // Data Section Styles
  dataSection: {
    marginBottom: 12,
    marginHorizontal: 12,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e1e5ea",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2f5d43",
    borderBottomWidth: 1,
    borderColor: "#e5e5e5",
    paddingBottom: 8,
  },
  dataText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  // Info Grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoItem: {
    width: "50%",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  // Preview Table
  previewTable: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 6,
    overflow: "hidden",
  },
  previewHeader: {
    flexDirection: "row",
    backgroundColor: "#e7f2ed",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  previewHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2f5d43",
    textAlign: "center",
  },
  previewRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
  },
  previewCellText: {
    fontSize: 11,
    color: "#333",
    textAlign: "center",
  },
  moreText: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
  },
  // Buttons
  submitButton: {
    backgroundColor: COLORS.blue || "#007bff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 5,
  },
  draftButton: {
    backgroundColor: "#f0ad4e",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default DetailLaporanFransCasePacker;