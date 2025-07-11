import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { COLORS } from "../../constants/theme";

const DetailLaporanSegregasi = ({ route, navigation }) => {
  const { item } = route.params;
  const [inspectionData] = useState(JSON.parse(item.inspectionData));

  const printToFile = async () => {
    const rows = inspectionData
      .map(
        (row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${row.type}</td>
        <td>${row.from}</td>
        <td>${row.magazine ? "✔" : ""}</td>
        <td>${row.wastafel ? "✔" : ""}</td>
        <td>${row.palletPm ? "✔" : ""}</td>
        <td>${row.conveyor ? "✔" : ""}</td>
        <td>${row.user}</td>
        <td>${row.time}</td>
      </tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <h2 style="text-align:center">Detail Laporan Segregasi</h2>
          <p><strong>PO:</strong> ${item.processOrder}</p>
          <p><strong>Tanggal:</strong> ${moment(item.date).format("DD/MM/YYYY HH:mm")}</p>
          <p><strong>Line:</strong> ${item.line} | <strong>Shift:</strong> ${item.shift}</p>
          <p><strong>Product:</strong> ${item.product} | <strong>Machine:</strong> ${item.machine}</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Type</th>
                <th>Prod Type</th>
                <th>Magazine</th>
                <th>Wastafel</th>
                <th>Pallet PM</th>
                <th>Conveyor</th>
                <th>User</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Detail Laporan Segregasi</Text>
        <Text style={styles.subtitle}>PO: {item.processOrder}</Text>
        <Text style={styles.subtitle}>
          Date: {moment(item.date).format("DD/MM/YYYY HH:mm")}
        </Text>

        <View style={styles.tableHead}>
          {[
            "No",
            "Type",
            "Prod Type",
            "Magazine",
            "Wastafel",
            "Pallet PM",
            "Conveyor",
            "User",
            "Time",
          ].map((col) => (
            <Text key={col} style={styles.cellHeader}>{col}</Text>
          ))}
        </View>

        {inspectionData.map((row, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.cell}>{index + 1}</Text>
            <Text style={styles.cell}>{row.type}</Text>
            <Text style={styles.cell}>{row.from}</Text>
            <Text style={styles.cell}>{row.magazine ? "✔" : ""}</Text>
            <Text style={styles.cell}>{row.wastafel ? "✔" : ""}</Text>
            <Text style={styles.cell}>{row.palletPm ? "✔" : ""}</Text>
            <Text style={styles.cell}>{row.conveyor ? "✔" : ""}</Text>
            <Text style={styles.cell}>{row.user}</Text>
            <Text style={styles.cell}>{row.time}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.button} onPress={printToFile}>
          <Text style={styles.buttonText}>Download PDF</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginVertical: 10 },
  subtitle: { fontSize: 14, marginBottom: 4 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#eee",
    padding: 6,
    flexWrap: "wrap",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ccc",
    padding: 6,
    flexWrap: "wrap",
  },
  cellHeader: {
    flexBasis: "11%",
    fontWeight: "bold",
    fontSize: 10,
    textAlign: "center",
  },
  cell: {
    flexBasis: "11%",
    fontSize: 10,
    textAlign: "center",
  },
  button: {
    backgroundColor: COLORS.blue,
    padding: 10,
    marginVertical: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default DetailLaporanSegregasi;
