import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { COLORS } from "../../constants/theme";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const headerMeta = { frm: "FIL - 080 - 02", rev: "", berlaku: "21 Juli 2023", hal: "1 dari 2" };

// Helper function to safely parse inspectionData (handles both array and JSON string)
const parseInspectionData = (inspectionData) => {
  if (!inspectionData) return [];

  // If it's already an array, return it directly
  if (Array.isArray(inspectionData)) {
    return inspectionData;
  }

  // If it's a string, try to parse it
  if (typeof inspectionData === 'string') {
    try {
      const parsed = JSON.parse(inspectionData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.log("Error parsing inspectionData:", e);
      return [];
    }
  }

  // If it's an object (single item), wrap it in array
  if (typeof inspectionData === 'object') {
    return [inspectionData];
  }

  return [];
};

// EXPORT: Generate PDF HTML untuk dipakai di ListCILT - PORTRAIT LAYOUT
export const generatePDFHTML = (item) => {
  const inspectionData = parseInspectionData(item.inspectionData);
  const data = inspectionData[0] || {};

  const tempHoseData = data.tempHoseData || [];
  const glueData = data.glueData || [];
  const lossData = data.lossData || [];
  const problemData = data.problemData || [];

  // Temperature Hose Table - Split into 2 tables for portrait layout (6 columns each)
  let tankRow1 = "";
  let tankRow2 = "";
  let tempRows1 = "";
  let tempRows2 = "";

  if (tempHoseData.length > 0) {
    // Tank Row (index 0) - Split into 2 parts
    if (tempHoseData[0] && Array.isArray(tempHoseData[0])) {
      let tankCells1 = "";
      let tankCells2 = "";
      tempHoseData[0].forEach((cell, idx) => {
        const tank = cell?.tank || "-";
        const cellHtml = `<td class="temp-cell">${esc(tank)}</td>`;
        if (idx < 6) {
          tankCells1 += cellHtml;
        } else {
          tankCells2 += cellHtml;
        }
      });
      tankRow1 = `<tr><td class="temp-label">TANK</td>${tankCells1}</tr>`;
      tankRow2 = `<tr><td class="temp-label">TANK</td>${tankCells2}</tr>`;
    }

    // Data Rows (index 1-4) - Split into 2 parts
    [1, 2, 3, 4].forEach((rowIdx) => {
      if (tempHoseData[rowIdx] && Array.isArray(tempHoseData[rowIdx])) {
        let cells1 = "";
        let cells2 = "";
        tempHoseData[rowIdx].forEach((cell, colIdx) => {
          const hose = cell?.hose || "-";
          const ndl = cell?.ndl || "-";
          const cellHtml = `<td class="temp-cell">${esc(hose)}/${esc(ndl)}</td>`;
          if (colIdx < 6) {
            cells1 += cellHtml;
          } else {
            cells2 += cellHtml;
          }
        });
        tempRows1 += `<tr><td class="temp-label">${rowIdx}</td>${cells1}</tr>`;
        tempRows2 += `<tr><td class="temp-label">${rowIdx}</td>${cells2}</tr>`;
      }
    });
  } else {
    tankRow1 = '<tr><td colspan="7" class="no-data">No data</td></tr>';
    tankRow2 = '<tr><td colspan="7" class="no-data">No data</td></tr>';
  }

  // Filter empty rows for glue, loss, problem
  const filteredGlueData = glueData.filter(row => row.jam || row.qtyKg);
  const filteredLossData = lossData.filter(row => row.namaProduk || row.carton || row.paper);
  const filteredProblemData = problemData.filter(row => row.stop || row.start || row.masalah);

  const glueRows = filteredGlueData.length > 0
    ? filteredGlueData.map((row, idx) => `<tr><td>${idx + 1}</td><td>${esc(row.jam) || "-"}</td><td>${esc(row.qtyKg) || "-"}</td></tr>`).join("")
    : '<tr><td colspan="3" class="no-data">No data</td></tr>';

  const lossRows = filteredLossData.length > 0
    ? filteredLossData.map((row) => `<tr><td>${esc(row.namaProduk) || "-"}</td><td>${esc(row.carton) || "-"}</td><td>${esc(row.paper) || "-"}</td></tr>`).join("")
    : '<tr><td colspan="3" class="no-data">No data</td></tr>';

  const problemRows = filteredProblemData.length > 0
    ? filteredProblemData.map((row) => `<tr><td>${esc(row.stop) || "-"}</td><td>${esc(row.start) || "-"}</td><td>${esc(row.durasi) || "-"}</td><td class="text-left">${esc(row.masalah) || "-"}</td><td class="text-left">${esc(row.correctiveAction) || "-"}</td><td>${esc(row.pic) || "-"}</td></tr>`).join("")
    : '<tr><td colspan="6" class="no-data">No data</td></tr>';

  return `
    <section class="report-section artema-section">
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
          <tr><td class="title-label">JUDUL</td><td class="title-content">LAPORAN ARTEMA & SMS CARDBOARD PACKER</td></tr>
        </table>
      </div>

      <div class="report-info">
        <p><strong>Process Order:</strong> ${esc(item.processOrder)}</p>
        <table class="general-info-table">
          <tr><td><strong>Date:</strong></td><td>${moment(item.date).format("DD/MM/YY HH:mm:ss")}</td><td><strong>Product:</strong></td><td>${esc(item.product)}</td></tr>
          <tr><td><strong>Plant:</strong></td><td>${esc(item.plant)}</td><td><strong>Line:</strong></td><td>${esc(item.line)}</td></tr>
          <tr><td><strong>Machine:</strong></td><td>${esc(item.machine)}</td><td><strong>Shift:</strong></td><td>${esc(item.shift)}</td></tr>
        </table>
      </div>

      <h3 class="section-title">INFORMASI PRODUK</h3>
      <table class="data-table info-table">
        <tr><th>Nama Produk</th><td>${esc(data.namaProduk) || "-"}</td><th>Kode Produksi</th><td>${esc(data.kodeProduksi) || "-"}</td></tr>
        <tr><th>Line MC</th><td>${esc(data.lineMc) || "-"}</td><th>Kode Kadaluwarsa</th><td>${esc(data.kodeKadaluwarsa) || "-"}</td></tr>
        <tr><th>Hours Stop</th><td>${esc(data.hoursStop) || "-"}</td><th>Start Produksi</th><td>${esc(data.startProduksi) || "-"}</td></tr>
        <tr><th>Hours Start</th><td>${esc(data.hoursStart) || "-"}</td><th>Stop Produksi</th><td>${esc(data.stopProduksi) || "-"}</td></tr>
      </table>

      <h3 class="section-title">PEMERIKSAAN TEMPERATURE HOSE (KELIPATAN 3 JAM)</h3>
      <p class="section-note">Jam 1-6</p>
      <table class="data-table temp-table">
        <thead>
          <tr>
            <th class="temp-header-label">TEMP</th>
            ${Array.from({ length: 6 }, (_, i) => `<th class="temp-header-jam">JAM ${i + 1}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${tankRow1}
          ${tempRows1}
        </tbody>
      </table>
      
      <p class="section-note">Jam 7-12</p>
      <table class="data-table temp-table">
        <thead>
          <tr>
            <th class="temp-header-label">TEMP</th>
            ${Array.from({ length: 6 }, (_, i) => `<th class="temp-header-jam">JAM ${i + 7}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${tankRow2}
          ${tempRows2}
        </tbody>
      </table>

      <h3 class="section-title">PENAMBAHAN GLUE</h3>
      <table class="data-table glue-table">
        <thead><tr><th style="width: 15%;">NO</th><th style="width: 42%;">JAM</th><th style="width: 43%;">QTY (KG)</th></tr></thead>
        <tbody>${glueRows}</tbody>
      </table>

      <h3 class="section-title">LOSS CARTON & PAPER</h3>
      <table class="data-table loss-table">
        <thead><tr><th style="width: 40%;">NAMA PRODUK</th><th style="width: 30%;">CARTON</th><th style="width: 30%;">PAPER</th></tr></thead>
        <tbody>${lossRows}</tbody>
      </table>

      <h3 class="section-title">PROBLEM SAAT PRODUKSI</h3>
      <table class="data-table problem-table">
        <thead><tr><th>STOP</th><th>START</th><th>DURASI</th><th style="width: 20%;">MASALAH</th><th style="width: 20%;">Corrective Action</th><th>PIC</th></tr></thead>
        <tbody>${problemRows}</tbody>
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
  
  body { 
    font-family: Arial, sans-serif; 
    margin: 0; 
    padding: 15px;
    font-size: 12px; 
    color: #333;
    line-height: 1.4;
  }
  
  /* Header Styles */
  .header-container {
    border: 2px solid #d7d7d7;
    border-radius: 8px;
    margin-bottom: 15px;
    overflow: hidden;
  }
  .header-main-table { width: 100%; border-collapse: collapse; }
  .header-main-table td { border: 1px solid #e5e5e5; padding: 10px; }
  .logo-section { width: 120px; background-color: #90EE90; text-align: center; }
  .logo-green { font-weight: bold; font-size: 18px; color: #2d5016; font-style: italic; }
  .company-section { text-align: center; font-weight: bold; font-size: 16px; }
  .meta-section { width: 150px; font-size: 11px; }
  .meta-info-table td { border: none; padding: 3px; }
  .meta-label { font-weight: 600; width: 50px; }
  .header-title-table { width: 100%; border-collapse: collapse; border-top: none; }
  .header-title-table td { border: 1px solid #e5e5e5; padding: 10px; border-top: none; }
  .title-label { width: 120px; text-align: center; background-color: #f5f5f5; font-weight: 600; }
  .title-content { text-align: center; font-weight: bold; font-size: 14px; color: #2f5d43; }
  
  /* Report Info */
  .report-info {
    margin-bottom: 15px;
    padding: 10px;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
  }
  .general-info-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  .general-info-table td {
    border: 1px solid #ccc;
    padding: 8px;
    font-size: 12px;
  }
  
  /* Section Styles */
  .section-title { 
    font-weight: bold; 
    background-color: #d9f0e3; 
    padding: 10px 15px; 
    margin: 18px 0 10px 0; 
    border-radius: 6px;
    color: #2f5d43;
    font-size: 14px;
    text-align: center;
    border: 1px solid #b8d4c2;
  }
  
  .section-note {
    font-size: 12px;
    color: #666;
    margin: 8px 0;
    font-style: italic;
  }
  
  /* Data Table Styles - BIGGER SIZE */
  .data-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 10px 0; 
    font-size: 12px; 
  }
  .data-table th, .data-table td { 
    border: 1px solid #bbb; 
    padding: 10px 8px; 
    text-align: center; 
    vertical-align: middle;
  }
  .data-table th { 
    background-color: #e7f2ed; 
    font-weight: 700;
    color: #2f5d43;
    font-size: 12px;
  }
  
  .info-table th {
    width: 120px;
    text-align: left;
    padding-left: 12px;
    background-color: #e7f2ed;
  }
  .info-table td {
    text-align: left;
    padding-left: 12px;
  }
  
  /* Temperature Table Styles - IMPROVED */
  .temp-table {
    font-size: 12px;
  }
  .temp-header-label {
    width: 80px;
    background-color: #d7e9dd;
    font-weight: 700;
  }
  .temp-header-jam {
    width: auto;
    background-color: #d7e9dd;
    font-weight: 700;
    min-width: 70px;
  }
  .temp-label {
    font-weight: 700;
    background-color: #f8faf9;
    width: 80px;
    text-align: center;
  }
  .temp-cell {
    padding: 8px 6px;
    min-width: 70px;
    font-size: 12px;
  }
  
  /* Glue Table */
  .glue-table {
    max-width: 450px;
  }
  
  /* Loss Table */
  .loss-table {
    max-width: 550px;
  }
  
  /* Problem Table */
  .problem-table th:nth-child(4),
  .problem-table td:nth-child(4),
  .problem-table th:nth-child(5),
  .problem-table td:nth-child(5) {
    text-align: left;
    padding-left: 10px;
  }
  
  .text-left {
    text-align: left !important;
    padding-left: 10px !important;
  }
  
  /* Notes */
  .notes-box {
    background-color: #f8f9fa;
    padding: 12px;
    border-radius: 6px;
    border-left: 4px solid #2e7d32;
    margin-top: 15px;
    font-size: 12px;
  }
  
  .no-data {
    color: #999;
    font-style: italic;
    text-align: center;
  }
  
  /* Page break */
  .artema-section {
    page-break-before: always;
  }
`;

const DetailLaporanArtemaCardboard = ({ route, navigation }) => {
  const { item } = route.params;
  const [isPrinting, setIsPrinting] = useState(false);

  const inspectionData = parseInspectionData(item.inspectionData);
  const data = inspectionData[0] || {};

  const tempHoseData = data.tempHoseData || [];
  const glueData = data.glueData || [];
  const lossData = data.lossData || [];
  const problemData = data.problemData || [];

  const printToFile = async () => {
    try {
      setIsPrinting(true);
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>${getPDFStyles()}</style>
          </head>
          <body>
            ${generatePDFHTML(item)}
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await shareAsync(uri, { mimeType: "application/pdf" });
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleLanjutkanDraft = () => {
    navigation.navigate("AddCILT", {
      draftId: item.id,
      isDraft: true,
      draftData: item,
    });
  };

  // Render Temperature Preview
  const renderTempPreview = () => {
    if (!tempHoseData || tempHoseData.length === 0) {
      return <Text style={styles.dataText}>No temperature data</Text>;
    }

    const tankRow = tempHoseData[0] || [];
    const previewData = tankRow.slice(0, 4);

    return (
      <View style={styles.previewTable}>
        <View style={styles.previewHeader}>
          <Text style={[styles.previewHeaderText, { width: 60 }]}>TANK</Text>
          {previewData.map((_, idx) => (
            <Text key={idx} style={[styles.previewHeaderText, { flex: 1 }]}>JAM {idx + 1}</Text>
          ))}
        </View>
        <View style={styles.previewRow}>
          <Text style={[styles.previewCellText, { width: 60 }]}>Value</Text>
          {previewData.map((cell, idx) => (
            <Text key={idx} style={[styles.previewCellText, { flex: 1 }]}>{cell?.tank || "-"}</Text>
          ))}
        </View>
        {tempHoseData.length > 4 && (
          <Text style={styles.moreText}>... dan {tempHoseData.length - 4} data lainnya</Text>
        )}
      </View>
    );
  };

  // Render Glue Preview
  const renderGluePreview = () => {
    const filledGlue = glueData.filter(row => row.jam || row.qtyKg);
    if (filledGlue.length === 0) {
      return <Text style={styles.dataText}>No glue data</Text>;
    }

    return (
      <View style={styles.previewTable}>
        <View style={styles.previewHeader}>
          <Text style={[styles.previewHeaderText, { width: 40 }]}>NO</Text>
          <Text style={[styles.previewHeaderText, { flex: 1 }]}>JAM</Text>
          <Text style={[styles.previewHeaderText, { flex: 1 }]}>QTY (KG)</Text>
        </View>
        {filledGlue.slice(0, 3).map((row, idx) => (
          <View key={idx} style={styles.previewRow}>
            <Text style={[styles.previewCellText, { width: 40 }]}>{idx + 1}</Text>
            <Text style={[styles.previewCellText, { flex: 1 }]}>{row.jam || "-"}</Text>
            <Text style={[styles.previewCellText, { flex: 1 }]}>{row.qtyKg || "-"}</Text>
          </View>
        ))}
        {filledGlue.length > 3 && (
          <Text style={styles.moreText}>... dan {filledGlue.length - 3} data lainnya</Text>
        )}
      </View>
    );
  };

  // Render Loss Preview
  const renderLossPreview = () => {
    const filledLoss = lossData.filter(row => row.namaProduk || row.carton || row.paper);
    if (filledLoss.length === 0) {
      return <Text style={styles.dataText}>No loss data</Text>;
    }

    return (
      <View style={styles.previewTable}>
        <View style={styles.previewHeader}>
          <Text style={[styles.previewHeaderText, { flex: 1.5 }]}>NAMA PRODUK</Text>
          <Text style={[styles.previewHeaderText, { flex: 1 }]}>CARTON</Text>
          <Text style={[styles.previewHeaderText, { flex: 1 }]}>PAPER</Text>
        </View>
        {filledLoss.slice(0, 3).map((row, idx) => (
          <View key={idx} style={styles.previewRow}>
            <Text style={[styles.previewCellText, { flex: 1.5 }]}>{row.namaProduk || "-"}</Text>
            <Text style={[styles.previewCellText, { flex: 1 }]}>{row.carton || "-"}</Text>
            <Text style={[styles.previewCellText, { flex: 1 }]}>{row.paper || "-"}</Text>
          </View>
        ))}
        {filledLoss.length > 3 && (
          <Text style={styles.moreText}>... dan {filledLoss.length - 3} data lainnya</Text>
        )}
      </View>
    );
  };

  // Render Problem Preview
  const renderProblemPreview = () => {
    const filledProblem = problemData.filter(row => row.stop || row.start || row.masalah);
    if (filledProblem.length === 0) {
      return <Text style={styles.dataText}>No problem data</Text>;
    }

    return (
      <View style={styles.previewTable}>
        <View style={styles.previewHeader}>
          <Text style={[styles.previewHeaderText, { width: 50 }]}>STOP</Text>
          <Text style={[styles.previewHeaderText, { width: 50 }]}>START</Text>
          <Text style={[styles.previewHeaderText, { flex: 1 }]}>MASALAH</Text>
        </View>
        {filledProblem.slice(0, 3).map((row, idx) => (
          <View key={idx} style={styles.previewRow}>
            <Text style={[styles.previewCellText, { width: 50 }]}>{row.stop || "-"}</Text>
            <Text style={[styles.previewCellText, { width: 50 }]}>{row.start || "-"}</Text>
            <Text style={[styles.previewCellText, { flex: 1 }]}>{row.masalah || "-"}</Text>
          </View>
        ))}
        {filledProblem.length > 3 && (
          <Text style={styles.moreText}>... dan {filledProblem.length - 3} data lainnya</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={styles.headerRowTop}>
            <View style={styles.headerLogoBox}>
              <Text style={{ fontWeight: "bold", fontSize: 14, color: "#2d5016", fontStyle: "italic" }}>Greenfields</Text>
            </View>
            <View style={styles.headerCompanyBox}>
              <Text style={styles.headerCompanyText}>PT. GREENFIELDS INDONESIA</Text>
            </View>
            <View style={styles.headerMetaBox}>
              <View style={styles.metaRow}><Text style={styles.metaKey}>FRM</Text><Text style={styles.metaVal}>: {headerMeta.frm}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Rev</Text><Text style={styles.metaVal}>: {headerMeta.rev || "-"}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Berlaku</Text><Text style={styles.metaVal}>: {headerMeta.berlaku}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Hal</Text><Text style={styles.metaVal}>: {headerMeta.hal}</Text></View>
            </View>
          </View>
          <View style={styles.headerRowBottom}>
            <Text style={styles.headerLeftCell}>JUDUL</Text>
            <Text style={styles.headerTitleCell}>LAPORAN ARTEMA & SMS CARDBOARD PACKER</Text>
          </View>
        </View>

        {/* History/General Info */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Informasi Laporan</Text>
          <View style={styles.historyRow}><Text style={styles.historyLabel}>Process Order:</Text><Text style={styles.historyValue}>{item.processOrder}</Text></View>
          <View style={styles.historyRow}><Text style={styles.historyLabel}>Tanggal:</Text><Text style={styles.historyValue}>{moment(item.date).format("DD/MM/YYYY HH:mm")}</Text></View>
          <View style={styles.historyRow}><Text style={styles.historyLabel}>Product:</Text><Text style={styles.historyValue}>{item.product}</Text></View>
          <View style={styles.historyRow}><Text style={styles.historyLabel}>Plant:</Text><Text style={styles.historyValue}>{item.plant}</Text></View>
          <View style={styles.historyRow}><Text style={styles.historyLabel}>Line:</Text><Text style={styles.historyValue}>{item.line}</Text></View>
          <View style={styles.historyRow}><Text style={styles.historyLabel}>Machine:</Text><Text style={styles.historyValue}>{item.machine}</Text></View>
          <View style={styles.historyRow}><Text style={styles.historyLabel}>Shift:</Text><Text style={styles.historyValue}>{item.shift}</Text></View>
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
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Nama Produk</Text><Text style={styles.infoValue}>{data.namaProduk || "-"}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Kode Produksi</Text><Text style={styles.infoValue}>{data.kodeProduksi || "-"}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Line MC</Text><Text style={styles.infoValue}>{data.lineMc || "-"}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Kode Kadaluwarsa</Text><Text style={styles.infoValue}>{data.kodeKadaluwarsa || "-"}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Hours Stop</Text><Text style={styles.infoValue}>{data.hoursStop || "-"}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Start Produksi</Text><Text style={styles.infoValue}>{data.startProduksi || "-"}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Hours Start</Text><Text style={styles.infoValue}>{data.hoursStart || "-"}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Stop Produksi</Text><Text style={styles.infoValue}>{data.stopProduksi || "-"}</Text></View>
          </View>
        </View>

        {/* Temperature Hose */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Pemeriksaan Temperature Hose</Text>
          {renderTempPreview()}
        </View>

        {/* Penambahan Glue */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Penambahan Glue</Text>
          {renderGluePreview()}
        </View>

        {/* Loss Carton & Paper */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Loss Carton & Paper</Text>
          {renderLossPreview()}
        </View>

        {/* Problem */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Problem Saat Produksi</Text>
          {renderProblemPreview()}
        </View>

        {/* Notes */}
        {data.catatan && (
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{data.catatan}</Text>
            </View>
          </View>
        )}

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
  // Notes
  notesBox: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderColor: "#2e7d32",
  },
  notesText: {
    fontSize: 12,
    color: "#333",
    lineHeight: 18,
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

export default DetailLaporanArtemaCardboard;