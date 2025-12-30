import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { COLORS } from "../../constants/theme";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const headerMeta = { frm: "FIL - 001 - 08", rev: "", berlaku: "15 - Jan - 2019", hal: "1 dari 2" };

// CSS Styles untuk PDF
export const robotPalletizerPdfStyles = `
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #333;
      margin: 15px;
    }
    .robot-section {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #333;
    }
    .robot-section .header-main-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
    .robot-section .header-main-table td { border: 1px solid #000; padding: 8px; }
    .robot-section .logo-section { width: 120px; background-color:rgb(255, 255, 255); text-align: center; }
    .robot-section .logo-green { font-weight: bold; font-size: 16px; color: #2d5016; font-style: italic; }
    .robot-section .company-section { text-align: center; font-weight: bold; font-size: 14px; }
    .robot-section .meta-section { width: 140px; font-size: 10px; }
    .robot-section .meta-info-table td { border: none; padding: 2px; font-size: 10px; }
    .robot-section .meta-label { font-weight: 600; width: 50px; font-size: 10px; }
    .robot-section .header-title-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
    .robot-section .header-title-table td { border: 1px solid #000; padding: 6px; }
    .robot-section .title-label { width: 100px; text-align: center; background-color: #f5f5f5; font-size: 10px; font-weight: 600; }
    .robot-section .title-content { text-align: center; font-weight: bold; font-size: 12px; }
    .robot-section .section-title { font-weight: bold; background-color: #dcfce7; color: #166534; padding: 8px 12px; margin: 15px 0 8px 0; font-size: 11px; text-align: center; }
    .robot-section .data-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    .robot-section .data-table th, .robot-section .data-table td { border: 1px solid #333; padding: 6px 4px; text-align: center; font-size: 10px; }
    .robot-section .data-table th { background-color:rgb(14, 197, 75); color: #fff; font-weight: 600; font-size: 10px; }
    .robot-section .data-table td { font-size: 10px; }
    .robot-section .info-table th { width: 120px; text-align: left; padding-left: 10px; background-color: #f3f4f6; color: #374151; font-size: 10px; font-weight: 600; }
    .robot-section .info-table td { text-align: left; padding-left: 10px; font-size: 11px; background-color: #fff; border: 1px solid #333; }
    .robot-section .inspection-table th { font-size: 9px; padding: 5px 3px; font-weight: 700; }
    .robot-section .inspection-table td { font-size: 10px; padding: 5px 3px; }
    .robot-section .user-time-cell { font-size: 9px; color: #555; }
    .robot-section .general-info-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .robot-section .general-info-table td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
    .robot-section .report-info { font-size: 11px; margin: 10px 0; }
    .robot-section .report-info p { margin: 8px 0; font-size: 11px; }
    .robot-section .report-info strong { font-size: 11px; }
    .robot-section .total-box { background: #dcfce7; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #bbf7d0; text-align: center; }
    .robot-section .total-label { font-size: 12px; font-weight: 700; color: #166534; margin-bottom: 8px; }
    .robot-section .total-value { font-size: 24px; font-weight: 700; color: #166534; }
  </style>
`;

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
        <td>${esc(row.iprp)}</td>
        <td>${esc(row.lclexp)}</td>
        <td>${esc(row.vol)}</td>
        <td>${esc(row.palletNo)}</td>
        <td>${esc(row.cartonNo)}</td>
        <td>${esc(row.ctn)}</td>
        <td>${esc(row.jam)}</td>
        <td>${esc(row.jumlah)}</td>
        <td>${esc(row.keterangan)}</td>
        <td class="user-time-cell">${esc(row.user)}<br/>${esc(row.time)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="13">No data</td></tr>';

  return `
    ${robotPalletizerPdfStyles}
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
      <table class="data-table info-table">
        <tr><th>Mesin / Line</th><td>${esc(formData.mesinLine)}</td></tr>
        <tr><th>Kode Prod.</th><td>${esc(formData.kodeProd)}</td></tr>
        <tr><th>Kode Expire</th><td>${esc(formData.kodeExpire)}</td></tr>
      </table>

      <h3 class="section-title">DATA INSPEKSI</h3>
      <table class="data-table inspection-table">
        <thead>
          <tr>
            <th>No</th><th>Shift</th><th>VAR</th><th>IP/RP</th><th>LCL/EXP</th><th>Vol</th>
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
  const filteredRows = rows.filter(row => row.shift || row.var || row.jumlah);
  const handleLanjutkanDraft = () => navigation.navigate("EditCilt", { item });

  const printToFile = async () => {
    const html = `<html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #333;
          margin: 15px;
        }
      </style>
    </head><body>${generatePDFHTML(item)}</body></html>`;
    try { const { uri } = await Print.printToFileAsync({ html }); await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" }); }
    catch (error) { console.error("Error generating PDF:", error); }
  };

  // Helper untuk render value box
  const ValueBox = ({ value, highlight = false }) => (
    <View style={[styles.valueBox, highlight && styles.valueBoxHighlight]}>
      <Text style={[styles.valueBoxText, highlight && styles.valueBoxTextHighlight]}>
        {value || "-"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
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
            <Text style={styles.headerTitleCell}>LAPORAN ROBOT PALLETIZER</Text>
          </View>
        </View>

        {/* History Container */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>History Laporan</Text>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Form disubmit oleh</Text>
            <Text style={styles.historyValue}>{data.user || item.username || "Unknown"}</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Waktu submit</Text>
            <Text style={styles.historyValue}>{moment(item.date).format("DD-MM-YYYY HH:mm:ss")}</Text>
          </View>
          <View style={[styles.historyRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.historyLabel}>Process Order</Text>
            <Text style={[styles.historyValue, { fontSize: 10 }]}>{item.processOrder}</Text>
          </View>
        </View>

        {/* Informasi Mesin */}
        <View style={styles.dataSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informasi Mesin</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Mesin / Line</Text>
              <View style={styles.infoValueBox}>
                <Text style={styles.infoValueText}>{formData.mesinLine || "-"}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Kode Prod.</Text>
              <View style={styles.infoValueBox}>
                <Text style={styles.infoValueText}>{formData.kodeProd || "-"}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Kode Expire</Text>
              <View style={styles.infoValueBox}>
                <Text style={styles.infoValueText}>{formData.kodeExpire || "-"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Data Inspeksi */}
        <View style={styles.dataSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Data Inspeksi</Text>
            <View style={styles.entryBadge}>
              <Text style={styles.entryBadgeText}>{filteredRows.length} Entries</Text>
            </View>
          </View>

          {filteredRows.map((row, idx) => (
            <View key={idx} style={styles.entryCard}>
              {/* Entry Header */}
              <View style={styles.entryHeader}>
                <View style={styles.entryHeaderLeft}>
                  <Text style={styles.entryHeaderText}>Entry {idx + 1}</Text>
                </View>
                {row.user && row.time && (
                  <View style={styles.entryHeaderRight}>
                    <Text style={styles.entryMeta}>{row.user} • {row.time}</Text>
                  </View>
                )}
              </View>

              {/* Entry Body */}
              <View style={styles.entryBody}>
                {/* Row 1: Shift & Var */}
                <View style={styles.entryRow}>
                  <View style={styles.entryCol}>
                    <Text style={styles.entryLabel}>SHIFT</Text>
                    <ValueBox value={row.shift} />
                  </View>
                  <View style={styles.entryCol}>
                    <Text style={styles.entryLabel}>VAR</Text>
                    <ValueBox value={row.var} />
                  </View>
                </View>

                {/* Row 2: IP/RP, LCL/EXP, VOL - 3 kolom */}
                <View style={styles.entryRow3}>
                  <View style={styles.entryCol3}>
                    <Text style={styles.entryLabel}>IP/RP</Text>
                    <ValueBox value={row.iprp} />
                  </View>
                  <View style={styles.entryCol3}>
                    <Text style={styles.entryLabel}>LCL/EXP</Text>
                    <ValueBox value={row.lclexp} />
                  </View>
                  <View style={styles.entryCol3}>
                    <Text style={styles.entryLabel}>VOL</Text>
                    <ValueBox value={row.vol} />
                  </View>
                </View>

                {/* Row 3: Pallet No & Carton No */}
                <View style={styles.entryRow}>
                  <View style={styles.entryCol}>
                    <Text style={styles.entryLabel}>PALLET NO</Text>
                    <ValueBox value={row.palletNo} />
                  </View>
                  <View style={styles.entryCol}>
                    <Text style={styles.entryLabel}>CARTON NO</Text>
                    <ValueBox value={row.cartonNo} />
                  </View>
                </View>

                {/* Row 4: CTN & Jam */}
                <View style={styles.entryRow}>
                  <View style={styles.entryCol}>
                    <Text style={styles.entryLabel}>JUMLAH CTN</Text>
                    <ValueBox value={row.ctn} />
                  </View>
                  <View style={styles.entryCol}>
                    <Text style={styles.entryLabel}>WAKTU JAM</Text>
                    <ValueBox value={row.jam} />
                  </View>
                </View>

                {/* Row 5: Jumlah - Highlighted */}
                <View style={styles.entryRowFull}>
                  <Text style={styles.entryLabel}>JUMLAH</Text>
                  <ValueBox value={row.jumlah} highlight={true} />
                </View>

                {/* Row 6: Keterangan */}
                <View style={styles.entryRowFull}>
                  <Text style={styles.entryLabel}>KETERANGAN</Text>
                  <View style={styles.valueBoxKeterangan}>
                    <Text style={styles.valueBoxText}>{row.keterangan || "-"}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {filteredRows.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Tidak ada data inspeksi</Text>
            </View>
          )}
        </View>

        {/* Total Box */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>JUMLAH YANG DITERIMA WAREHOUSE</Text>
          <View style={styles.totalValueBox}>
            <Text style={styles.totalTitle}>TOTAL</Text>
            <Text style={styles.totalValue}>{totalWarehouse}</Text>
          </View>
        </View>

        {/* Action Button */}
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
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },

  // Header styles
  headerWrap: {
    borderWidth: 1,
    borderColor: "#d7d7d7",
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
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

  // History section
  historyContainer: {
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e1e5ea",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  historyLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  historyValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },

  // Data section
  dataSection: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e1e5ea",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#dcfce7",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#166534",
  },
  entryBadge: {
    backgroundColor: "#166534",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  entryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },

  // Info Grid
  infoGrid: {
    padding: 14,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  infoValueBox: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoValueText: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },

  // Entry cards
  entryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  entryHeader: {
    backgroundColor: "#e8f4fd",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#bfdbfe",
  },
  entryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  entryHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  entryHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  entryMeta: {
    fontSize: 10,
    color: "#3b82f6",
    fontWeight: "500",
  },
  entryBody: {
    padding: 14,
    backgroundColor: "#fafbfc",
  },

  // Entry rows - 2 kolom
  entryRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 10,
  },
  entryCol: {
    flex: 1,
  },

  // Entry rows - 3 kolom
  entryRow3: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 8,
  },
  entryCol3: {
    flex: 1,
  },

  // Entry rows - full width
  entryRowFull: {
    marginBottom: 10,
  },

  entryLabel: {
    fontSize: 10,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.3,
    fontWeight: "500",
  },

  // Value Box styles
  valueBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  valueBoxHighlight: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  valueBoxText: {
    fontSize: 13,
    color: "#1f2937",
  },
  valueBoxTextHighlight: {
    fontSize: 16,
    fontWeight: "700",
    color: "#065f46",
  },
  valueBoxKeterangan: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 50,
  },

  // Empty state
  emptyState: {
    padding: 30,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
  },

  // Total box
  totalBox: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#86efac",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    textAlign: "center",
    marginBottom: 12,
  },
  totalValueBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  totalTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0d9488",
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#065f46",
  },

  // Button
  submitButton: {
    backgroundColor: COLORS.blue,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

export default DetailLaporanRobotPalletizerFiller;