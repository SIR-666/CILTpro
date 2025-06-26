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

const DetailLaporanH2O2Check = ({ route, navigation }) => {
  const { item } = route.params;
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { width } = Dimensions.get("window");
  const modalImageSize = width * 0.8; // 80% of screen width

  // Parse the inspection data (string to object)
  const inspectionData = JSON.parse(item.inspectionData);

  const handleLanjutkanDraft = (item) => {
    navigation.navigate("EditCilt", { item });
  };

  const printToFile = async () => {
    // Format Data Tambahan dengan layout dua kolom
    const formattedData = `
      <p><strong>Process Order:</strong> ${item.processOrder}</p>
      <table class="general-info-table">
        <tr>
          <td><strong>Date:</strong> ${moment(
            item.date,
            "YYYY-MM-DD HH:mm:ss.SSS"
          ).format("DD/MM/YY HH:mm:ss")}</td>
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
          <td><strong>Group:</strong>  </td>
        </tr>
      </table>
    `;

    // Mapping inspectionData ke dalam tabel
    const inspectionRows = inspectionData
      .map((item, index) => {
        return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.jam}</td>
          <td>${item.konsentrasi}</td>
          <td>${item.volume}</td>
          <td>${item.kode}</td>
          <td>${item.user}</td>
          <td>${item.time}</td>
        </tr>
      `;
      })
      .join("");

    // HTML untuk file yang akan dicetak
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { text-align: center; }
            .report-info { text-align: left; margin-bottom: 12px; }
            
            p {
              margin-bottom: 0; /* Hilangkan margin bawah dari paragraf */
            }

            .row {
              display: flex;
              gap: 10px; /* Jarak antar elemen dalam row */
              margin-top: 0; /* Hilangkan margin atas agar lebih dekat */
            }
  
            .general-info-table {
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 3px;
            }
  
            .general-info-table td { 
              border: 1px solid black; 
              padding: 5px; 
              text-align: left; 
              vertical-align: top; 
            }
  
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px; 
            }
  
            th, td { 
              border: 1px solid black; 
              padding: 8px; 
              text-align: left; 
            }
  
            th { 
              background-color: #f2f2f2; 
            }
  
            img { 
              display: block; 
              margin: auto; 
            }
          </style>
        </head>
        <body>
          <h2>PT. GREENFIELDS INDONESIA</h2>
          <div class="report-info">
            ${formattedData}
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Jam Pengecekan</th>
                <th>Konsentrasi (>35-50%) (MCCP 03)</th>
                <th>Volume</th>
                <th>Kode Operator</th>
                <th>User</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${inspectionRows}
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
        {/* Header Information */}
        <View style={styles.header}>
          <Text style={styles.title}>Detail Data</Text>
          <Text style={styles.infoTextBold}>
            Date:{"              "}
            <Text style={styles.infoText}>
              {moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format(
                "DD/MM/YY HH:mm:ss"
              )}
            </Text>
          </Text>
          <Text style={styles.infoTextBold}>
            PO:{"                 "}
            <Text style={styles.infoText}>{item.processOrder}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Package: {"     "}{" "}
            <Text style={styles.infoText}>{item.packageType}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Plant: {"           "}{" "}
            <Text style={styles.infoText}>{item.plant}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Line: {"              "}
            <Text style={styles.infoText}>{item.line}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Shift: {"             "}
            <Text style={styles.infoText}>{item.shift}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Product: {"       "}
            <Text style={styles.infoText}>{item.product}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Machine: {"     "}{" "}
            <Text style={styles.infoText}>{item.machine}</Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Created At:{"  "}
            <Text style={styles.infoText}>
              {" "}
              {moment(item.createdAt, "YYYY-MM-DD HH:mm:ss.SSS").format(
                "DD/MM/YY HH:mm:ss"
              )}
            </Text>
          </Text>
          <Text style={styles.infoTextBold}>
            Updated At:{" "}
            <Text style={styles.infoText}>
              {" "}
              {moment(item.updatedAt, "YYYY-MM-DD HH:mm:ss.SSS").format(
                "DD/MM/YY HH:mm:ss"
              )}
            </Text>
          </Text>
        </View>

        {item.status === 1 ? (
          <>
            <View>
              <TouchableOpacity
                style={[styles.submitButton]}
                onPress={() => handleLanjutkanDraft(item)}
              >
                <Text style={styles.submitButtonText}>LANJUTKAN DRAFT</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View>
              <TouchableOpacity
                style={[styles.submitButton]}
                onPress={printToFile}
              >
                <Text style={styles.submitButtonText}>DOWNLOAD REPORT</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.wrapper}>
          {/* Table Container */}
          <View style={styles.table}>
            {/* Table Head */}
            <View style={styles.tableHead}>
              {/* Header Caption */}
              <View style={{ width: "5%" }}>
                <Text style={styles.tableCaption}>No</Text>
              </View>
              <View style={{ width: "15%" }}>
                <Text style={styles.tableCaption}>Jam Pengecekan</Text>
              </View>
              <View style={{ width: "20%" }}>
                <Text style={styles.tableCaption}>
                  Konsentrasi (&gt;35-50%) (MCCP 03)
                </Text>
              </View>
              <View style={{ width: "20%" }}>
                <Text style={styles.tableCaption}>Volume</Text>
              </View>
              <View style={{ width: "20%" }}>
                <Text style={styles.tableCaption}>Kode Operator</Text>
              </View>
              <View style={{ width: "10%" }}>
                <Text style={styles.tableCaption}>User</Text>
              </View>
              <View style={{ width: "10%" }}>
                <Text style={styles.tableCaption}>Time</Text>
              </View>
            </View>

            {/* Table Body */}
            {inspectionData.map((item, index) => {
              return (
                <View key={index} style={styles.tableBody}>
                  {/* Header Caption */}
                  <View style={{ width: "5%" }}>
                    {/* <Text style={styles.tableData}>Done</Text> */}
                    <View style={[styles.tableData, styles.centeredContent]}>
                      <Text style={styles.tableData}>{index + 1}</Text>
                    </View>
                  </View>
                  <View style={{ width: "15%" }}>
                    <Text style={styles.tableData}>{item.jam}</Text>
                  </View>
                  <View style={{ width: "20%" }}>
                    <Text style={styles.tableData}>
                      {item.konsentrasi ?? "-"}
                    </Text>
                  </View>
                  <View style={{ width: "20%" }}>
                    <Text style={styles.tableData}>{item.volume ?? "-"}</Text>
                  </View>
                  <View style={{ width: "20%" }}>
                    <Text style={styles.tableData}>{item.kode ?? "-"}</Text>
                  </View>
                  <View style={{ width: "10%" }}>
                    <Text style={styles.tableData}>{item.user}</Text>
                  </View>
                  <View style={{ width: "10%" }}>
                    <Text style={styles.tableData}>{item.time}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Image Modal (Show if Image is Clicked) */}
      </ScrollView>
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalContainerAdaTemuan}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalView}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={{
                  width: modalImageSize,
                  height: modalImageSize,
                  marginVertical: 10,
                  borderRadius: 5,
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  infoTextBold: {
    fontSize: 16,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
    paddingVertical: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
    backgroundColor: "#fff",
    paddingVertical: 10, // Added to match the header's padding
  },
  tableCell: {
    flex: 1, // Ensures each cell takes up equal width
    textAlign: "center",
    paddingVertical: 10, // Adjust for vertical alignment
    paddingHorizontal: 5, // Adjust for horizontal padding
    borderLeftWidth: 1,
    borderLeftColor: "#EAEAEA",
  },
  tableCellHeader: {
    flex: 1, // Same as the content cells to ensure equal width
    textAlign: "center",
    fontWeight: "bold",
    paddingVertical: 10, // Ensure the same padding as in the content cells
    paddingHorizontal: 5,
    borderLeftWidth: 1,
    borderLeftColor: "#EAEAEA",
  },
  green: {
    backgroundColor: "#d4edda", // Light green background
    color: "#155724", // Dark green text
    paddingVertical: 10,
  },
  red: {
    backgroundColor: "#f8d7da", // Light red background
    color: "#721c24", // Dark red text
    paddingVertical: 10,
  },
  wrapper: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  table: {
    width: "100%", // Make table take the full width
    margin: 15,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
    padding: 20,
    width: "100%",
  },
  tableBody: {
    flexDirection: "row",
    padding: 20,
    width: "100%",
  },
  tableCaption: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableData: {
    fontSize: 16,
    textAlign: "center", // Center-align text in cells
  },
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: {
    color: "#007bff", // Blue color for links
    textDecorationLine: "underline", // Underline to indicate it's clickable
  },
  modalContainerAdaTemuan: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  red: {
    color: "red",
    fontWeight: "bold",
  },
  yellow: {
    color: "orange",
    fontWeight: "bold",
  },
  green: {
    color: "green",
    fontWeight: "bold",
  },
  black: {
    color: "black",
    fontWeight: "bold",
  },
});

export default DetailLaporanH2O2Check;
