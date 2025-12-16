import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/theme";

const DetailLaporanFransCasePacker = ({ route, navigation }) => {
  const { item } = route.params;

  // Parse the inspection data
  const inspectionData = JSON.parse(item.inspectionData);
  const data = inspectionData[0] || {};

  const handleLanjutkanDraft = (item) => {
    navigation.navigate("EditCilt", { item });
  };

  const printToFile = async () => {
    // Format header data
    const formattedData = `
      <p><strong>Process Order:</strong> ${item.processOrder}</p>
      <table class="general-info-table">
        <tr>
          <td><strong>Date:</strong> ${moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}</td>
          <td><strong>Product:</strong> ${item.product}</td>
        </tr>
        <tr>
          <td><strong>Plant:</strong> ${item.plant}</td>
          <td><strong>Line:</strong> ${item.line}</td>
        </tr>
        <tr>
          <td><strong>Machine:</strong> ${item.machine}</td>
          <td><strong>Shift:</strong> ${item.shift}</td>
        </tr>
        <tr>
          <td><strong>Package:</strong> ${item.packageType}</td>
          <td><strong>Batch:</strong> ${item.batch || "-"}</td>
        </tr>
      </table>
    `;

    // Temperature Tank rows
    const tempTankRows = data.tempTankData
      ? data.tempTankData
          .map((row, rowIdx) => {
            const cells = row.map((cell) => `<td>${cell || "-"}</td>`).join("");
            return `<tr><td>${rowIdx + 1}</td>${cells}</tr>`;
          })
          .join("")
      : "";

    // Temperature Nozzle rows
    const tempNozzleRows = data.tempNozzleData
      ? data.tempNozzleData
          .map((row, rowIdx) => {
            const cells = row.map((cell) => `<td>${cell || "-"}</td>`).join("");
            return `<tr><td>${rowIdx + 1}</td>${cells}</tr>`;
          })
          .join("")
      : "";

    // Glue data rows
    const glueRows = data.glueData
      ? data.glueData
          .map(
            (item) => `
        <tr>
          <td>${item.no}</td>
          <td>${item.jmlKg || "-"}</td>
          <td>${item.jam || "-"}</td>
          <td>${item.penambahanNo}</td>
          <td>${item.penambahanJmlKg || "-"}</td>
          <td>${item.penambahanJam || "-"}</td>
        </tr>
      `
          )
          .join("")
      : "";

    // Catatan data rows
    const catatanRows = data.catatanData
      ? data.catatanData
          .map(
            (item) => `
        <tr>
          <td>${item.start || "-"}</td>
          <td>${item.stop || "-"}</td>
          <td>${item.total || "-"}</td>
          <td>${item.masalah || "-"}</td>
          <td>${item.tidakKoreksioleh || "-"}</td>
          <td>${item.oleh || "-"}</td>
          <td>${item.pack || "-"}</td>
          <td>${item.karton || "-"}</td>
        </tr>
      `
          )
          .join("")
      : "";

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            h2 { text-align: center; margin-bottom: 10px; }
            .report-info { margin-bottom: 15px; }
            p { margin: 5px 0; }
            
            .general-info-table {
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0;
            }
            
            .general-info-table td { 
              border: 1px solid black; 
              padding: 5px; 
              text-align: left; 
            }
            
            .section-title {
              font-weight: bold;
              background-color: #f0f0f0;
              padding: 5px;
              margin-top: 15px;
              margin-bottom: 5px;
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0; 
            }
            
            th, td { 
              border: 1px solid black; 
              padding: 5px; 
              text-align: center;
              font-size: 10px;
            }
            
            th { 
              background-color: #e0e0e0;
              font-weight: bold;
            }

            .info-section {
              margin-bottom: 10px;
              border: 1px solid #ddd;
              padding: 10px;
            }

            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <h2>PT. GREENFIELDS INDONESIA</h2>
          <h3 style="text-align: center;">LAPORAN FRANS WP 25 CASE PACKER (LINE C)</h3>
          
          <div class="report-info">
            ${formattedData}
          </div>

          <div class="info-section">
            <div class="info-row">
              <span><strong>Nama Produk:</strong> ${data.namaProduk || "-"}</span>
              <span><strong>Kode Produksi:</strong> ${data.kodeProduksi || "-"}</span>
            </div>
            <div class="info-row">
              <span><strong>Rasa:</strong> ${data.rasa || "-"}</span>
              <span><strong>Kode Kadaluwarsa:</strong> ${data.kodeKadaluwarsa || "-"}</span>
            </div>
            <div class="info-row">
              <span><strong>Line Mc:</strong> ${data.lineMc || "-"}</span>
              <span><strong>Start Produksi:</strong> ${data.startProduksi || "-"}</span>
            </div>
            <div class="info-row">
              <span><strong>Air Supply:</strong> ${data.airSupply || "-"}</span>
              <span><strong>Stop Produksi:</strong> ${data.stopProduksi || "-"}</span>
            </div>
          </div>

          <div class="section-title">PEMERIKSAAN TEMPERATURE HOSE (KELIPATAN 3 JAM) - TANK HOSE</div>
          <table>
            <thead>
              <tr>
                <th>TEMP (°C)</th>
                <th colspan="10">JAM</th>
              </tr>
            </thead>
            <tbody>
              ${tempTankRows}
            </tbody>
          </table>

          <div class="section-title">PEMERIKSAAN TEMPERATURE HOSE (KELIPATAN 3 JAM) - NOZZLE</div>
          <table>
            <thead>
              <tr>
                <th>TEMP (°C)</th>
                <th colspan="10">JAM</th>
              </tr>
            </thead>
            <tbody>
              ${tempNozzleRows}
            </tbody>
          </table>

          <div class="section-title">PENAMBAHAN GLUE</div>
          <p style="font-style: italic; font-size: 10px;">Dilakukan setiap 700 cm (± 1 jam), Penambahan glue 1 kg</p>
          <table>
            <thead>
              <tr>
                <th>PENAMBAHAN</th>
                <th>JML (KG)</th>
                <th>JAM</th>
                <th>PENAMBAHAN</th>
                <th>JML (KG)</th>
                <th>JAM</th>
              </tr>
            </thead>
            <tbody>
              ${glueRows}
            </tbody>
          </table>

          <div class="section-title">CATATAN KETIDAKSESUAIAN SELAMA PROSES PRODUKSI</div>
          <table>
            <thead>
              <tr>
                <th colspan="3">Waktu (menit)</th>
                <th>Masalah</th>
                <th>Tindakan Koreksi</th>
                <th>Oleh</th>
                <th colspan="2">Loss</th>
              </tr>
              <tr>
                <th>Start</th>
                <th>Stop</th>
                <th>Total</th>
                <th></th>
                <th></th>
                <th></th>
                <th>Pack</th>
                <th>Karton</th>
              </tr>
            </thead>
            <tbody>
              ${catatanRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      console.log("File has been saved to:", uri);
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Detail Laporan Frans Case Packer</Text>
          <Text style={styles.infoTextBold}>
            Date: <Text style={styles.infoText}>
              {moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}
            </Text>
          </Text>
          <Text style={styles.infoTextBold}>
            PO: <Text style={styles.infoText}>{item.processOrder}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Package: <Text style={styles.infoText}>{item.packageType}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Plant: <Text style={styles.infoText}>{item.plant}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Line: <Text style={styles.infoText}>{item.line}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Machine: <Text style={styles.infoText}>{item.machine}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Shift: <Text style={styles.infoText}>{item.shift}</Text>
          </Text>
        </View>

        {item.status === 1 ? (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => handleLanjutkanDraft(item)}
          >
            <Text style={styles.submitButtonText}>LANJUTKAN DRAFT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={printToFile}>
            <Text style={styles.submitButtonText}>DOWNLOAD REPORT</Text>
          </TouchableOpacity>
        )}

        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Informasi Produk</Text>
          <Text style={styles.dataText}>Nama Produk: {data.namaProduk || "-"}</Text>
          <Text style={styles.dataText}>Rasa: {data.rasa || "-"}</Text>
          <Text style={styles.dataText}>Line Mc: {data.lineMc || "-"}</Text>
          <Text style={styles.dataText}>Air Supply: {data.airSupply || "-"}</Text>
          <Text style={styles.dataText}>Kode Produksi: {data.kodeProduksi || "-"}</Text>
          <Text style={styles.dataText}>Kode Kadaluwarsa: {data.kodeKadaluwarsa || "-"}</Text>
          <Text style={styles.dataText}>Start Produksi: {data.startProduksi || "-"}</Text>
          <Text style={styles.dataText}>Stop Produksi: {data.stopProduksi || "-"}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: COLORS.blue,
  },
  infoTextBold: {
    fontSize: 16,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  dataSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: COLORS.blue,
  },
  dataText: {
    fontSize: 14,
    marginBottom: 5,
  },
});

export default DetailLaporanFransCasePacker;