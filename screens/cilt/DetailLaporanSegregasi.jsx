import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { COLORS } from "../../constants/theme";

/* Utils */
const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n) => String(n).padStart(2, "0");
const formatDDMonYY = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  return `${pad2(d.getDate())}-${monthsShort[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

// Cek ada konten description
const hasDescriptionContent = (descData) => {
  if (!descData || !Array.isArray(descData)) return false;
  return descData.some((item) =>
    item.flavour ||
    item.kodeProd ||
    item.kodeExp ||
    item.startTime ||
    item.stopTime ||
    item.startNum ||
    item.stopNum ||
    item.counterOutfeed ||
    item.totalOutfeed ||
    item.waste
  );
};

const DetailLaporanSegregasi = ({ route }) => {
  const { item } = route.params;

  const [inspectionData] = useState(() => {
    try {
      return JSON.parse(item.inspectionData);
    } catch (error) {
      console.error("Error parsing inspection data:", error);
      return [];
    }
  });

  // Header meta
  const headerMeta = item.headerMeta || {
    frm: "FIL - 010 - 02",
    rev: "",
    berlaku: formatDDMonYY(new Date()),
    hal: "1 dari 3",
  };

  const renderCombinedContent = () => {
    if (!inspectionData || inspectionData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      );
    }

    // Cari descriptionData (umumnya tersimpan di entry pertama)
    const descriptionData =
      inspectionData[0]?.descriptionData && Array.isArray(inspectionData[0].descriptionData)
        ? inspectionData[0].descriptionData
        : [];

    return (
      <View style={styles.contentWrapper}>
        {/* HEADER */}
        <View style={styles.headerWrap}>
          <View style={styles.headerRowTop}>
            <View style={styles.headerLogoBox}>
              <Image
                source={require("../../assets/GreenfieldsLogo_Green.png")}
                style={styles.headerLogoImg}
                resizeMode="contain"
              />
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
            <Text style={styles.headerTitleCell}>LAPORAN PRODUKSI MESIN  GALDI 280 UCS</Text>
          </View>
        </View>

        {/* History ringkas */}
        <View style={styles.overallHistoryContainer}>
          <Text style={styles.overallHistoryTitle}>History Laporan</Text>
          <Text style={styles.historyText}>
            Form disubmit oleh: <Text style={styles.historyBold}>{item.username || inspectionData[0]?.user || "Unknown User"}</Text>
          </Text>
          <Text style={styles.historyText}>
            Waktu submit: <Text style={styles.historyBold}>{moment(item.submitTime || item.createdAt || Date.now()).format("DD-MM-YYYY HH:mm:ss")}</Text>
          </Text>
          <Text style={styles.historyText}>
            Process Order: <Text style={styles.historyBold}>{item.processOrder}</Text>
          </Text>
          <Text style={styles.historyText}>
            Status: <Text style={styles.historyBold}>Submitted</Text>
          </Text>
        </View>

        <Text style={styles.title}>SEGREGASI & DESCRIPTION</Text>
        <Text style={styles.description}>Pencatatan segregasi produk, status peralatan, dan data produksi.</Text>

        {/* ========== DESCRIPTION (gaya sama persis dengan form) ========== */}
        <View style={styles.descContainer}>
          <View style={styles.descHeaderBar}>
            <Text style={[styles.segHeaderCell, styles.segHeaderCellNarrow]}>Flavour</Text>
            <Text style={styles.segHeaderCell}>Kode Prod</Text>
            <Text style={styles.segHeaderCell}>Kode Exp</Text>
            <Text style={[styles.segHeaderCell, styles.segHeaderCellWide]}>Detail</Text>
          </View>

          {hasDescriptionContent(descriptionData) ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segGrid}>
              {[0, 1, 2].map((i) => {
                const d = descriptionData[i] || {
                  flavour: "",
                  kodeProd: "",
                  kodeExp: "",
                  startTime: "",
                  stopTime: "",
                  counterOutfeed: "",
                  totalOutfeed: "",
                  waste: "",
                  startNum: "",
                  stopNum: "",
                  lastModifiedBy: "",
                  lastModifiedTime: "",
                };

                return (
                  <View key={i} style={styles.descCol}>
                    <Text style={styles.descEntryTitle}>Kolom {i + 1}</Text>

                    {d.lastModifiedBy ? (
                      <View style={styles.auditTrail}>
                        <Text style={styles.auditText}>User: {d.lastModifiedBy}</Text>
                        <Text style={styles.auditText}>Time: {d.lastModifiedTime}</Text>
                      </View>
                    ) : null}

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Flavour</Text>
                      <View style={[styles.autoShell, styles.inputDisabled]}>
                        <Text style={styles.autoText}>{d.flavour || "-"}</Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Kode Prod.</Text>
                      <View style={styles.autoShell}>
                        <Text style={styles.autoText}>{d.kodeProd || "-"}</Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Kode Exp</Text>
                      <View style={styles.autoShell}>
                        <Text style={styles.autoText}>{d.kodeExp || "-"}</Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Start</Text>
                      <View style={styles.autoShell}>
                        <Text style={styles.autoText}>{d.startTime || "-"}</Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Stop</Text>
                      <View style={styles.autoShell}>
                        <Text style={styles.autoText}>{d.stopTime || "-"}</Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Outfeed</Text>
                      <View style={styles.autoShell}>
                        <Text style={styles.autoText}>{d.counterOutfeed || "-"}</Text>
                      </View>
                      <Text style={styles.helpText}>Auto/Manual per hitungan</Text>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Total Outfeed</Text>
                      <View style={styles.autoShell}>
                        <Text style={styles.autoText}>{d.totalOutfeed || "-"}</Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Waste</Text>
                      <View style={styles.autoShell}>
                        <Text style={styles.autoText}>{d.waste || "-"}</Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Start (Numeric)</Text>
                      <View style={styles.autoShell}>
                        <Text style={styles.autoText}>{d.startNum || "-"}</Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.smallLabel}>Stop (Numeric)</Text>
                      <View style={styles.autoShell}>
                        <Text style={styles.autoText}>{d.stopNum || "-"}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.noDescriptionData}>
              <Text style={styles.noDescText}>No description data entered</Text>
            </View>
          )}
        </View>

        {/* ========== SEGREGASI (tampilan ringkas per entry) ========== */}
        <View style={styles.segregasiContainer}>
          <View style={styles.segHeaderBar}>
            <Text style={[styles.segHeaderCell, styles.segHeaderCellNarrow]}>Type</Text>
            <Text style={styles.segHeaderCell}>Prod Type</Text>
            <Text style={styles.segHeaderCell}>TO</Text>
            <Text style={[styles.segHeaderCell, styles.segHeaderCellWide]}>Equipment Status</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segGrid}>
            {inspectionData.map((entry, idx) => (
              <View key={idx} style={styles.segCol}>
                <Text style={styles.segEntryTitle}>Entry {idx + 1}</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Type</Text>
                  <View style={styles.autoShell}>
                    <Text style={styles.autoText}>{entry.type || "-"}</Text>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Prod Type</Text>
                  <View style={styles.autoShell}>
                    <Text style={styles.autoText}>{entry.prodType || "-"}</Text>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>TO</Text>
                  <View style={[styles.autoShell, entry.type !== "Change Variant" && styles.inputDisabled]}>
                    <Text style={entry.type === "Change Variant" ? styles.autoText : styles.autoTextMuted}>
                      {entry.type === "Change Variant" ? (entry.to || "-") : "—"}
                    </Text>
                  </View>
                </View>

                <View style={styles.eqBox}>
                  <Text style={styles.eqTitle}>Equipment Status</Text>
                  {[
                    { label: "Magazine", key: "magazine" },
                    { label: "Wastafel", key: "wastafel" },
                    { label: "Pallet PM", key: "palletPm" },
                    { label: "Conveyor", key: "conveyor" },
                  ].map(({ label, key }) => (
                    <View key={key} style={styles.eqRow}>
                      <Text style={styles.eqLabel}>{label}</Text>
                      <View style={[styles.checkBox, entry[key] && styles.checkBoxChecked]}>
                        {entry[key] ? <Text style={styles.checkMark}>✔</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>

                {entry.user && entry.time ? (
                  <View style={styles.auditTrail}>
                    <Text style={styles.auditText}>User: {entry.user}</Text>
                    <Text style={styles.auditText}>Time: {entry.time}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  // PDF (tetap)
  const printToFile = async () => {
    const rows = inspectionData
      .map((entry, i) => {
        const descData = inspectionData[0]?.descriptionData || [];
        const descHtml =
          descData.length > 0
            ? `<div style="margin-top:10px;"><strong>Description Data:</strong><br/>
               ${descData
              .map(
                (desc, idx) => `
                 <div style="margin:5px 0; padding:5px; border:1px solid #ddd;">
                   <strong>Kolom ${idx + 1}:</strong><br/>
                   Flavour: ${desc.flavour || '-'}<br/>
                   Kode Prod: ${desc.kodeProd || '-'}<br/>
                   Kode Exp: ${desc.kodeExp || '-'}<br/>
                   Start: ${desc.startTime || '-'}<br/>
                   Stop: ${desc.stopTime || '-'}<br/>
                   Outfeed: ${desc.counterOutfeed || '-'}<br/>
                   Total: ${desc.totalOutfeed || '-'}<br/>
                   Waste: ${desc.waste || '-'}
                 </div>`
              )
              .join("")}
             </div>`
            : "";

        return `
        <tr>
          <td>${i + 1}</td>
          <td>${entry.type || "-"}</td>
          <td>${entry.prodType || "-"}</td>
          <td>${entry.to || "-"}</td>
          <td>${entry.magazine ? "✔" : ""}</td>
          <td>${entry.wastafel ? "✔" : ""}</td>
          <td>${entry.palletPm ? "✔" : ""}</td>
          <td>${entry.conveyor ? "✔" : ""}</td>
          <td>${entry.user || "-"}</td>
          <td>${entry.time || "-"}</td>
        </tr>
        <tr><td colspan="10" style="padding:10px;">${descHtml}</td></tr>`;
      })
      .join("");

    const headerHtml = `
      <table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:11px;">
        <tr>
          <td style="width:140px; border:1px solid #000; padding:6px; text-align:center; background-color: #90EE90;">
            <div style="width:120px; height:50px; background-color: #90EE90; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#2d5016;">
              Greenfields
            </div>
          </td>
          <td style="border:1px solid #000; padding:6px; text-align:center; font-weight:bold;">
            PT. GREENFIELDS INDONESIA
          </td>
          <td style="width:170px; border:1px solid #000; padding:4px;">
            <div style="display:flex; justify-content:space-between;"><span>FRM</span><span>${headerMeta.frm}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Rev</span><span>${headerMeta.rev || "-"}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Berlaku</span><span>${headerMeta.berlaku}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Hal</span><span>${headerMeta.hal}</span></div>
          </td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:6px; text-align:center;">JUDUL</td>
          <td colspan="2" style="border:1px solid #000; padding:6px; text-align:center; font-weight:bold;">
            LAPORAN PRODUKSI MESIN  GALDI 280 UCS
          </td>
        </tr>
      </table>
    `;

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; vertical-align: middle; }
            th { background-color: #f0f0f0; font-weight: bold; }
          </style>
        </head>
        <body>
          ${headerHtml}
          <h3 style="margin:16px 0 12px 0; text-align:center; background-color:#d4edda; padding:8px; border-radius:4px;">SEGREGASI & DESCRIPTION</h3>
          <table style="font-size:10px;">
            <thead>
              <tr>
                <th>No</th><th>Type</th><th>Prod Type</th><th>TO</th>
                <th>Magazine</th><th>Wastafel</th><th>Pallet PM</th><th>Conveyor</th>
                <th>User</th><th>Time</th>
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
        {renderCombinedContent()}
        <TouchableOpacity style={styles.button} onPress={printToFile}>
          <Text style={styles.buttonText}>Download PDF</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ========== Styles (disamakan dengan komponen form terbaru) ========== */
const cardShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 12 },

  /* HEADER */
  headerWrap: { borderWidth: 1, borderColor: "#d7d7d7", borderRadius: 8, backgroundColor: "#fff", overflow: "hidden", marginBottom: 10 },
  headerRowTop: { flexDirection: "row", alignItems: "center", padding: 8, gap: 8 },
  headerLogoBox: { width: 130, height: 60, alignItems: "center", justifyContent: "center" },
  headerLogoImg: { width: "100%", height: "100%" },
  headerCompanyBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerCompanyText: { fontSize: 16, fontWeight: "bold", color: "#333", textAlign: "center" },
  headerMetaBox: { width: 140, borderLeftWidth: 1, borderColor: "#e5e5e5", paddingLeft: 8, paddingVertical: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  metaKey: { width: 58, fontSize: 11, color: "#333" },
  metaVal: { flex: 1, fontSize: 11, fontWeight: "600", color: "#333" },
  headerRowBottom: { flexDirection: "row", borderTopWidth: 1, borderColor: "#e5e5e5" },
  headerLeftCell: { width: 130, paddingVertical: 6, textAlign: "center", fontWeight: "600", fontSize: 11, color: "#333", backgroundColor: "#fafafa", borderRightWidth: 1, borderColor: "#e5e5e5" },
  headerTitleCell: { flex: 1, paddingVertical: 6, textAlign: "center", fontWeight: "bold", fontSize: 12, color: "#333" },

  /* MAIN */
  contentWrapper: { marginBottom: 20 },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 8, textAlign: "center", color: "#333", backgroundColor: "#e8f4fd", padding: 10, borderRadius: 6 },
  description: { fontSize: 12, textAlign: "center", marginBottom: 16, color: "#666", fontStyle: "italic", lineHeight: 16 },

  overallHistoryContainer: { backgroundColor: "#f8f9fa", padding: 12, marginBottom: 15, borderRadius: 8, borderWidth: 1, borderColor: "#e1e5ea" },
  overallHistoryTitle: { fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 6 },
  historyText: { fontSize: 12, color: "#666", marginBottom: 2 },
  historyBold: { fontWeight: "bold", color: "#333" },

  /* ===== DESCRIPTION (match SegregasiInspectionTable) ===== */
  descContainer: { marginBottom: 16, padding: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8 },
  descHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DDF5E4",
    borderWidth: 1,
    borderColor: "#B6E3C5",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 8,
  },
  segHeaderCell: { flex: 1, textAlign: "center", fontWeight: "700", fontSize: 12, color: "#2E6B3E" },
  segHeaderCellNarrow: { flex: 0.9 },
  segHeaderCellWide: { flex: 1.4 },
  segGrid: { gap: 10, paddingRight: 6 },
  descCol: { width: 300, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, ...cardShadow, marginRight: 4 },
  descEntryTitle: { fontSize: 12, fontWeight: "700", textAlign: "center", paddingVertical: 6, marginBottom: 8, color: "#374151", backgroundColor: "#F8FAFC", borderRadius: 6, borderWidth: 1, borderColor: "#EEF2F7" },

  fieldGroup: { marginBottom: 10 },
  smallLabel: { fontSize: 10, fontWeight: "700", color: "#374151", marginBottom: 4 },
  autoShell: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, backgroundColor: "#F8FAFC", paddingVertical: 9, paddingHorizontal: 10 },
  inputDisabled: { backgroundColor: "#F8FAFC", borderColor: "#E5E7EB" },
  autoText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  autoTextMuted: { fontSize: 12, color: "#9CA3AF" },
  helpText: { fontSize: 9, color: "#6B7280", marginTop: 4, fontStyle: "italic" },

  /* ===== SEGREGASI ===== */
  segregasiContainer: { marginTop: 8, padding: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8 },
  segHeaderBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#DDF5E4", borderWidth: 1, borderColor: "#B6E3C5", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 10, gap: 8 },
  segCol: { width: 300, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, ...cardShadow, marginRight: 4 },
  segEntryTitle: { fontSize: 12, fontWeight: "700", textAlign: "center", paddingVertical: 6, marginBottom: 8, color: "#374151", backgroundColor: "#F8FAFC", borderRadius: 6, borderWidth: 1, borderColor: "#EEF2F7" },

  eqBox: { marginTop: 4, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8 },
  eqTitle: { fontSize: 11, fontWeight: "700", color: "#374151", marginBottom: 6 },
  eqRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  eqLabel: { fontSize: 12, color: "#374151", flex: 1, paddingRight: 8 },
  checkBox: { width: 26, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  checkBoxChecked: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkMark: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },

  auditTrail: { marginTop: 8, backgroundColor: "#F3F4F6", borderRadius: 6, padding: 6, borderLeftWidth: 3, borderLeftColor: "#9CA3AF" },
  auditText: { fontSize: 10, color: "#4B5563" },

  /* NO DATA & BUTTON */
  noDataContainer: { padding: 20, alignItems: "center" },
  noDataText: { fontSize: 14, color: "#666" },
  noDescriptionData: { padding: 10, alignItems: "center" },
  noDescText: { fontSize: 12, color: "#999", fontStyle: "italic" },

  button: { backgroundColor: COLORS.blue, padding: 12, marginVertical: 20, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default DetailLaporanSegregasi;
