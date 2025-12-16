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
} from "react-native";
import { COLORS } from "../../constants/theme";

const DetailLaporanRobotPalletizer = ({ route, navigation }) => {
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

    // Inspection rows
    const inspectionRows = data.inspectionData
      ? data.inspectionData
          .map(
            (item) => `
        <tr>
          <td>${item.var || "-"}</td>
          <td>${item.skuType || "-"}</td>
          <td>${item.skuInner || "-"}</td>
          <td>${item.skuOuter || "-"}</td>
          <td>${item.skuVol || "-"}</td>
          <td>${item.paletNo || "-"}</td>
          <td>${item.cartonNo || "-"}</td>
          <td>${item.jumlahCtn || "-"}</td>
          <td>${item.jumlahJam || "-"}</td>
          <td>${item.waktuJam || "-"}</td>
          <td>${item.waktuJumlah || "-"}</td>
          <td>${item.keterangan || "-"}</td>
        </tr>
      `
          )
          .join("")
      : "";

    // Problem rows
    const problemRows = data.problemData
      ? data.problemData
          .map(
            (item) => `
        <tr>
          <td>${item.waktuStart || "-"}</td>
          <td>${item.waktuStop || "-"}</td>
          <td>${item.waktuTotal || "-"}</td>
          <td>${item.masalah || "-"}</td>
          <td>${item.pic || "-"}</td>
          <td>${item.waktuStart2 || "-"}</td>
          <td>${item.waktuStop2 || "-"}</td>
          <td>${item.waktuTotal2 || "-"}</td>
          <td>${item.masalah2 || "-"}</td>
          <td>${item.pic2 || "-"}</td>
        </tr>
      `
          )
          .join("")
      : "";

    // Reject data
    const rejectRows = data.rejectData
      ? `
        <tr>
          <td><strong>JAM</strong></td>
          <td>${data.rejectData.shift1?.jam || "-"}</td>
          <td>${data.rejectData.shift2?.jam || "-"}</td>
          <td>${data.rejectData.shift3?.jam || "-"}</td>
        </tr>
        <tr>
          <td><strong>PAPER</strong></td>
          <td>${data.rejectData.shift1?.paper || "-"}</td>
          <td>${data.rejectData.shift2?.paper || "-"}</td>
          <td>${data.rejectData.shift3?.paper || "-"}</td>
        </tr>
        <tr>
          <td><strong>CARTON</strong></td>
          <td>${data.rejectData.shift1?.carton || "-"}</td>
          <td>${data.rejectData.shift2?.carton || "-"}</td>
          <td>${data.rejectData.shift3?.carton || "-"}</td>
        </tr>
        <tr>
          <td><strong>CAP</strong></td>
          <td>${data.rejectData.shift1?.cap || "-"}</td>
          <td>${data.rejectData.shift2?.cap || "-"}</td>
          <td>${data.rejectData.shift3?.cap || "-"}</td>
        </tr>
        <tr>
          <td><strong>STRAW</strong></td>
          <td>${data.rejectData.shift1?.straw || "-"}</td>
          <td>${data.rejectData.shift2?.straw || "-"}</td>
          <td>${data.rejectData.shift3?.straw || "-"}</td>
        </tr>
        <tr>
          <td><strong>QC</strong></td>
          <td>${data.rejectData.shift1?.qc || "-"}</td>
          <td>${data.rejectData.shift2?.qc || "-"}</td>
          <td>${data.rejectData.shift3?.qc || "-"}</td>
        </tr>
      `
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
          </style>
        </head>
        <body>
          <h2>PT. GREENFIELDS INDONESIA</h2>
          <h3 style="text-align: center;">LAPORAN ROBOT PALLETIZER</h3>
          
          <div class="report-info">
            ${formattedData}
          </div>

          <div class="info-section">
            <p><strong>MESIN / LINE:</strong> ${data.mesinLine || "-"}</p>
            <p><strong>KODE PROD.:</strong> ${data.kodeProd || "-"}</p>
            <p><strong>KODE EXPIRE:</strong> ${data.kodeExpire || "-"}</p>
          </div>

          <div class="section-title">DATA INSPEKSI</div>
          <table>
            <thead>
              <tr>
                <th>VAR</th>
                <th colspan="4">SKU</th>
                <th>PALET NO.</th>
                <th>CARTON NO.</th>
                <th colspan="2">JUMLAH</th>
                <th colspan="2">WAKTU</th>
                <th>KETERANGAN</th>
              </tr>
              <tr>
                <th></th>
                <th>TYPE</th>
                <th>INNER</th>
                <th>OUTER</th>
                <th>VOL</th>
                <th></th>
                <th></th>
                <th>CTN</th>
                <th>JAM</th>
                <th>JAM</th>
                <th>JUMLAH</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${inspectionRows}
            </tbody>
          </table>

          <p><strong>JUMLAH YG DI TERIMA WARE HOUSE:</strong> ${data.jumlahDiterima || "-"}</p>

          <div class="section-title">PROBLEM ROBOT PALLETIZER</div>
          <table>
            <thead>
              <tr>
                <th colspan="3">WAKTU / MENIT</th>
                <th>MASALAH</th>
                <th>PIC</th>
                <th colspan="3">WAKTU / MENIT</th>
                <th>MASALAH</th>
                <th>PIC</th>
              </tr>
              <tr>
                <th>START</th>
                <th>STOP</th>
                <th>TOTAL</th>
                <th></th>
                <th></th>
                <th>START</th>
                <th>STOP</th>
                <th>TOTAL</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${problemRows}
            </tbody>
          </table>

          <div class="section-title">REJECT PACKAGING MATERIAL DAN SAMPLING QC</div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>SHIFT I</th>
                <th>SHIFT II</th>
                <th>SHIFT III</th>
              </tr>
            </thead>
            <tbody>
              ${rejectRows}
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
          <Text style={styles.title}>Detail Laporan Robot Palletizer</Text>
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
          <Text style={styles.sectionTitle}>Informasi</Text>
          <Text style={styles.dataText}>Mesin/Line: {data.mesinLine || "-"}</Text>
          <Text style={styles.dataText}>Kode Produksi: {data.kodeProd || "-"}</Text>
          <Text style={styles.dataText}>Kode Expire: {data.kodeExpire || "-"}</Text>
          <Text style={styles.dataText}>
            Jumlah Diterima Warehouse: {data.jumlahDiterima || "-"}
          </Text>
        </View>

        {data.rejectData && (
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Reject Data Summary</Text>
            <Text style={styles.dataText}>
              Shift 1 - JAM: {data.rejectData.shift1?.jam || "-"}
            </Text>
            <Text style={styles.dataText}>
              Shift 2 - JAM: {data.rejectData.shift2?.jam || "-"}
            </Text>
            <Text style={styles.dataText}>
              Shift 3 - JAM: {data.rejectData.shift3?.jam || "-"}
            </Text>
          </View>
        )}
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

export default DetailLaporanRobotPalletizer;