import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/theme";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const headerMeta = { frm: "FIL - 010 - 02", rev: "-", berlaku: "11-Jun-25", hal: "1 dari 3" };

// Helper: Check if row has meaningful data
const isRowFilled = (r) => {
  return r && (
    String(r.jam || "").trim() !== "" || 
    String(r.boxNo || "").trim() !== "" || 
    String(r.pdPaper || "").trim() !== "" || 
    String(r.qtyLabel || "").trim() !== ""
  );
};

// EXPORT: Generate PDF HTML untuk dipakai di ListCILT
export const generatePDFHTML = (item) => {
  let inspectionData = [];
  try { inspectionData = JSON.parse(item.inspectionData); } catch (e) { inspectionData = []; }
  
  // Filter hanya row yang memiliki data
  const filledData = Array.isArray(inspectionData) ? inspectionData.filter(isRowFilled) : [];
  const cekAlergenKemasan = Array.isArray(inspectionData) && !!inspectionData[0]?.cekAlergenKemasan;

  const rows = filledData.length > 0 ? filledData.map((r, i) => `
    <tr>
      <td style="padding: 12px 8px;">${i + 1}</td>
      <td style="padding: 12px 8px;">${esc(r.jam)}</td>
      <td style="padding: 12px 8px;">${esc(r.boxNo)}</td>
      <td style="padding: 12px 8px;">${esc(r.pdPaper)}</td>
      <td style="padding: 12px 8px;">${esc(r.qtyLabel)}</td>
      <td style="padding: 12px 8px;">${esc(r.user)}</td>
      <td style="padding: 12px 8px;">${esc(r.time)}</td>
    </tr>
  `).join("") : `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666; font-style: italic;">Tidak ada data yang diinput</td></tr>`;

  return `
    <section class="report-section paper-section">
      <div class="header-container">
        <table class="header-main-table">
          <tr>
            <td class="logo-section"><div class="logo-green">Greenfields</div></td>
            <td class="company-section">PT. GREENFIELDS INDONESIA</td>
            <td class="meta-section">
              <table class="meta-info-table">
                <tr><td class="meta-label">FRM</td><td>:</td><td>${headerMeta.frm}</td></tr>
                <tr><td class="meta-label">Rev</td><td>:</td><td>${headerMeta.rev}</td></tr>
                <tr><td class="meta-label">Berlaku</td><td>:</td><td>${headerMeta.berlaku}</td></tr>
                <tr><td class="meta-label">Hal</td><td>:</td><td>${headerMeta.hal}</td></tr>
              </table>
            </td>
          </tr>
        </table>
        <table class="header-title-table">
          <tr><td class="title-label">JUDUL</td><td class="title-content">PEMAKAIAN PAPER</td></tr>
        </table>
      </div>

      <div class="report-info">
        <p><strong>Process Order:</strong> ${esc(item.processOrder)}</p>
        <table class="general-info-table">
          <tr><td><strong>Date:</strong> ${moment(item.date).format("DD/MM/YY HH:mm:ss")}</td><td><strong>Product:</strong> ${esc(item.product)}</td></tr>
          <tr><td><strong>Plant:</strong> ${esc(item.plant)}</td><td><strong>Line:</strong> ${esc(item.line)}</td></tr>
          <tr><td><strong>Machine:</strong> ${esc(item.machine)}</td><td><strong>Shift:</strong> ${esc(item.shift)}</td></tr>
          <tr><td><strong>Package:</strong> ${esc(item.packageType)}</td><td><strong>Group:</strong> </td></tr>
        </table>
      </div>

      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin:8px 0;">
        <div></div>
        <h2 style="font-weight: bold; text-align: center; font-size: 18px; margin: 0;">PEMAKAIAN PAPER</h2>
        <div style="justify-self:end;display:flex;align-items:center;gap:8px;">
          <div style="width:14px;height:14px;border:2px solid #111;display:flex;align-items:center;justify-content:center;">
            ${cekAlergenKemasan ? "✔" : ""}
          </div>
          <span style="font-weight:700;">CEK LABEL ALERGEN KEMASAN</span>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="padding: 12px 8px; min-width: 40px;">No</th>
            <th style="padding: 12px 8px; min-width: 100px;">Jam</th>
            <th style="padding: 12px 8px; min-width: 100px;">Box No.</th>
            <th style="padding: 12px 8px; min-width: 120px;">PD. Paper</th>
            <th style="padding: 12px 8px; min-width: 100px;">Qty Label</th>
            <th style="padding: 12px 8px; min-width: 80px;">User</th>
            <th style="padding: 12px 8px; min-width: 80px;">Time</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
};

// COMPONENT
const DetailLaporanPaperUsage = ({ route, navigation }) => {
  const { item } = route.params;
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { width } = Dimensions.get("window");
  const modalImageSize = width * 0.8;

  const inspectionData = JSON.parse(item.inspectionData);
  // Filter data untuk tampilan
  const filledInspectionData = Array.isArray(inspectionData) ? inspectionData.filter(isRowFilled) : [];
  const cekAlergenKemasan = Array.isArray(inspectionData) && !!inspectionData[0]?.cekAlergenKemasan;

  const handleLanjutkanDraft = (item) => {
    navigation.navigate("EditCilt", { item });
  };

  const printToFile = async () => {
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            h2 { text-align: center; }
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
            .report-info { margin-bottom: 12px; }
            .general-info-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .general-info-table td { border: 1px solid black; padding: 5px; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .data-table th, .data-table td { border: 1px solid black; padding: 12px 8px; text-align: center; min-height: 40px; }
            .data-table th { background-color: #f2f2f2; }
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
        <View style={styles.header}>
          <Text style={styles.title}>Detail Data</Text>
          <Text style={styles.infoTextBold}>Date:{"              "}<Text style={styles.infoText}>{moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}</Text></Text>
          <Text style={styles.infoTextBold}>PO:{"                 "}<Text style={styles.infoText}>{item.processOrder}</Text></Text>
          <Text style={styles.infoTextBold}>Package: {"     "} <Text style={styles.infoText}>{item.packageType}</Text></Text>
          <Text style={styles.infoTextBold}>Plant: {"           "} <Text style={styles.infoText}>{item.plant}</Text></Text>
          <Text style={styles.infoTextBold}>Line: {"              "}<Text style={styles.infoText}>{item.line}</Text></Text>
          <Text style={styles.infoTextBold}>Shift: {"             "}<Text style={styles.infoText}>{item.shift}</Text></Text>
          <Text style={styles.infoTextBold}>Product: {"       "}<Text style={styles.infoText}>{item.product}</Text></Text>
          <Text style={styles.infoTextBold}>Machine: {"     "} <Text style={styles.infoText}>{item.machine}</Text></Text>
          <Text style={styles.infoTextBold}>Created At:{"  "}<Text style={styles.infoText}> {moment(item.createdAt, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}</Text></Text>
          <Text style={styles.infoTextBold}>Updated At: <Text style={styles.infoText}> {moment(item.updatedAt, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}</Text></Text>
          <Text style={styles.infoTextBold}>Cek Alergen:{"  "}<Text style={styles.infoText}>{cekAlergenKemasan ? "✔ (Dicek)" : "Tidak"}</Text></Text>
          <Text style={styles.infoTextBold}>Data Count: <Text style={styles.infoText}> {filledInspectionData.length} entries</Text></Text>
        </View>

        {item.status === 1 ? (
          <TouchableOpacity style={styles.submitButton} onPress={() => handleLanjutkanDraft(item)}>
            <Text style={styles.submitButtonText}>LANJUTKAN DRAFT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={printToFile}>
            <Text style={styles.submitButtonText}>DOWNLOAD REPORT</Text>
          </TouchableOpacity>
        )}

        <View style={styles.wrapper}>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <View style={{ width: "5%" }}><Text style={styles.tableCaption}>No</Text></View>
              <View style={{ width: "15%" }}><Text style={styles.tableCaption}>Jam</Text></View>
              <View style={{ width: "20%" }}><Text style={styles.tableCaption}>Box No.</Text></View>
              <View style={{ width: "20%" }}><Text style={styles.tableCaption}>PD. Paper</Text></View>
              <View style={{ width: "20%" }}><Text style={styles.tableCaption}>Qty Label</Text></View>
              <View style={{ width: "10%" }}><Text style={styles.tableCaption}>User</Text></View>
              <View style={{ width: "10%" }}><Text style={styles.tableCaption}>Time</Text></View>
            </View>

            {filledInspectionData.length > 0 ? filledInspectionData.map((dataItem, index) => (
              <View key={index} style={styles.tableBody}>
                <View style={{ width: "5%" }}><Text style={styles.tableData}>{index + 1}</Text></View>
                <View style={{ width: "15%" }}><Text style={styles.tableData}>{dataItem.jam}</Text></View>
                <View style={{ width: "20%" }}><Text style={styles.tableData}>{dataItem.boxNo ?? "-"}</Text></View>
                <View style={{ width: "20%" }}><Text style={styles.tableData}>{dataItem.pdPaper ?? "-"}</Text></View>
                <View style={{ width: "20%" }}><Text style={styles.tableData}>{dataItem.qtyLabel ?? "-"}</Text></View>
                <View style={{ width: "10%" }}><Text style={styles.tableData}>{dataItem.user}</Text></View>
                <View style={{ width: "10%" }}><Text style={styles.tableData}>{dataItem.time}</Text></View>
              </View>
            )) : (
              <View style={styles.tableBody}>
                <View style={{ width: "100%" }}><Text style={[styles.tableData, { fontStyle: 'italic', color: '#666' }]}>Tidak ada data yang diinput</Text></View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalContainerAdaTemuan} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
          <View style={styles.modalView}>
            {selectedImage && <Image source={{ uri: selectedImage }} style={{ width: modalImageSize, height: modalImageSize, marginVertical: 10, borderRadius: 5 }} />}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  infoTextBold: { fontSize: 16, marginBottom: 5 },
  infoText: { fontSize: 16, fontWeight: "bold" },
  wrapper: { justifyContent: "center", alignItems: "center", flex: 1 },
  table: { width: "100%", margin: 15 },
  tableHead: { flexDirection: "row", backgroundColor: "#3bcd6b", padding: 20, width: "100%" },
  tableBody: { flexDirection: "row", padding: 20, width: "100%" },
  tableCaption: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  tableData: { fontSize: 16, textAlign: "center" },
  submitButton: { backgroundColor: COLORS.blue, padding: 15, borderRadius: 5, alignItems: "center", marginTop: 8 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalContainerAdaTemuan: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalView: { margin: 20, backgroundColor: "white", borderRadius: 20, padding: 20, alignItems: "center" },
});

export default DetailLaporanPaperUsage;
