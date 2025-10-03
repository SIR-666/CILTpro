import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
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
import { api } from "../../utils/axiosInstance";

const DetailLaporanShiftly = ({ route }) => {
  const { item } = route.params;
  const [data, setData] = useState([]);
  const [uniqueData, setUniqueData] = useState([]);
  const [shiftHours, setShiftHours] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Refs untuk sinkronisasi scroll
  const headerScrollRef = useRef(null);
  const actualTimeScrollRef = useRef(null);
  const contentScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);

  const { width } = Dimensions.get("window");
  const modalImageSize = width * 0.8;

  const getShiftHours = (shift) => {
    if (shift === "Shift 1") return [6, 7, 8, 9, 10, 11, 12, 13, 14];
    if (shift === "Shift 2") return [14, 15, 16, 17, 18, 19, 20, 21, 22];
    if (shift === "Shift 3") return [22, 23, 0, 1, 2, 3, 4, 5, 6];
    return [];
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const formattedDate = item.date.split("T")[0];
      const response = await api.get(
        `/cilt/reportCILTAll/PERFORMA RED AND GREEN/${encodeURIComponent(
          item.plant
        )}/${encodeURIComponent(item.line)}/${encodeURIComponent(
          item.shift
        )}/${encodeURIComponent(item.machine)}/${formattedDate}`
      );
      if (!response.status === 200) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const result = await response.data;

      console.log("result", result);

      if (Array.isArray(result) && result.length > 0) {
        setData(result);
        setShiftHours(getShiftHours(item.shift));
        setUniqueData(extractUniqueInspectionData(result));
      } else {
        setData([]);
        setUniqueData([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractUniqueInspectionData = (records) => {
    const uniqueActivities = {};

    records.forEach((record) => {
      try {
        const matches = record.CombinedInspectionData.match(/\[.*?\]/g);

        if (!matches || matches.length === 0) {
          console.error(
            "No valid JSON array found in:",
            record.CombinedInspectionData
          );
          return;
        }

        const lastInspectionData = JSON.parse(matches[matches.length - 1]);

        lastInspectionData.forEach((inspection) => {
          const key = `${inspection.id}|${inspection.activity}`;
          if (!uniqueActivities[key]) {
            uniqueActivities[key] = {
              activity: inspection.activity,
              standard: inspection.standard,
              good: inspection.good ?? "-",
              need: inspection.need ?? "-",
              reject: inspection.reject ?? "-",
              results: {},
              picture: {},
            };
          }
          uniqueActivities[key].results[record.HourGroup] = inspection.results;
          uniqueActivities[key].picture[record.HourGroup] = inspection.picture;
        });
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    });

    return Object.values(uniqueActivities);
  };

  useEffect(() => {
    fetchData();
  }, [item]);

  const handlePress = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const evaluateValue = (inputValue, goodCriteria, rejectCriteria) => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) return "default";

    const parseRange = (rangeStr) => {
      if (!rangeStr || rangeStr === "-") return null;
      if (rangeStr.includes(" - ")) {
        const [min, max] = rangeStr.split(" - ").map(parseFloat);
        if (!isNaN(min) && !isNaN(max)) return { type: "range", min, max };
      }
      return null;
    };

    const parseReject = (rejectStr) => {
      if (!rejectStr || rejectStr === "-") return null;
      if (rejectStr.includes(" / ")) {
        const parts = rejectStr.split(" / ");
        return parts.map(part => {
          const trimmed = part.trim();
          if (trimmed.startsWith("<")) return { operator: "<", value: parseFloat(trimmed.slice(1)) };
          if (trimmed.startsWith(">")) return { operator: ">", value: parseFloat(trimmed.slice(1)) };
          if (trimmed.startsWith(">=")) return { operator: ">=", value: parseFloat(trimmed.slice(2)) };
          return null;
        }).filter(Boolean);
      }
      return null;
    };

    const goodRange = parseRange(goodCriteria);
    const rejectConditions = parseReject(rejectCriteria);

    if (rejectConditions) {
      for (const cond of rejectConditions) {
        if (cond.operator === "<" && numValue < cond.value) return "reject";
        if (cond.operator === ">" && numValue > cond.value) return "reject";
        if (cond.operator === ">=" && numValue >= cond.value) return "reject";
      }
    }

    if (goodRange) {
      if (numValue >= goodRange.min && numValue <= goodRange.max) return "good";
    }

    return "need";
  };

  const getResultColor = (result, good, reject) => {
    if (["G", "N", "R"].includes(result)) {
      if (result === "G") return "#d4edda";
      if (result === "N") return "#fff3cd";
      if (result === "R") return "#f8d7da";
    }

    const evalResult = evaluateValue(result, good, reject);
    if (evalResult === "good") return "#d4edda";
    if (evalResult === "need") return "#fff3cd";
    if (evalResult === "reject") return "#f8d7da";

    return "#f8f9fa";
  };

  const shouldShowSeparator = (index, data) => {
    const separatorIndices = [13, 20, 39];
    return separatorIndices.includes(index);
  };

  // Fungsi untuk sinkronisasi scroll horizontal
  const handleHorizontalScroll = (event, source) => {
    const { contentOffset } = event.nativeEvent;

    if (source !== 'header' && headerScrollRef.current) {
      headerScrollRef.current.scrollTo({ x: contentOffset.x, animated: false });
    }
    if (source !== 'actualTime' && actualTimeScrollRef.current) {
      actualTimeScrollRef.current.scrollTo({ x: contentOffset.x, animated: false });
    }
    if (source !== 'content' && contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ x: contentOffset.x, animated: false });
    }
  };

  // === Half-hour helper ===
  const getHalfHourSlots = (hours) =>
    hours.flatMap(h => {
      const HH = String(h).padStart(2, "0");
      return [{ hour: HH, mm: "00" }, { hour: HH, mm: "30" }];
    });

  const getResultAtHalfHour = (item, hour, mm, { duplicateHourlyToBoth = true } = {}) => {
    const r = item?.results?.[hour];
    if (r && typeof r === "object") return r?.[mm] ?? "";
    if (typeof r === "string" || typeof r === "number") {
      // fallback untuk data lama per-jam
      return duplicateHourlyToBoth ? String(r) : (mm === "00" ? String(r) : "");
    }
    return "";
  };

  const getHalfHourBg = (raw, good, reject) => {
    const evalResult = evaluateValue(raw, good, reject);
    if (evalResult === "good") return "#d4edda";
    if (evalResult === "need") return "#fff3cd";
    if (evalResult === "reject") return "#f8d7da";
    return "#ffffff";
  };

  const printToFile = async () => {
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

    const halfHourSlots = getHalfHourSlots(shiftHours);

    const actualTimeRow = `
    <tr>
      <td colspan="5" style="font-weight: bold; text-align: center;">Actual Time</td>
      ${halfHourSlots.map(({ hour, mm }) => {
      const relatedItems = data.filter(
        it => hour === moment.utc(it.LastRecordTime).format("HH")
      );
      const isLate = relatedItems.some(it => {
        const lastH = parseInt(moment.utc(it.LastRecordTime).format("HH"), 10);
        const subH = parseInt(moment.utc(it.submitTime).format("HH"), 10);
        return Math.abs(lastH - subH) >= 1;
      });
      const bg = isLate ? "#ffebee" : "#e8f5e9";
      return `<td style="text-align:center; font-weight:bold; background:${bg}">${hour}:${mm}</td>`;
    }).join("")}
    </tr>
  `;

    const inspectionRows = uniqueData
      .map((item, index) => {
        return `
      <tr>
        <td class="col-no">${index + 1}</td>
        <td class="col-activity">${item.activity}</td>
        <td class="col-good">${item.good ?? "-"}</td>
        <td class="col-need">${item.need ?? "-"}</td>
        <td class="col-red">${item.reject ?? "-"}</td>
        ${halfHourSlots.map(({ hour, mm }) => {
          const rawValue = getResultAtHalfHour(item, hour, mm, { duplicateHourlyToBoth: true });
          const bg = getHalfHourBg(rawValue, item.good, item.reject);
          return `<td class="col-shift" style="background-color:${bg}; font-weight:bold; text-align:center;">${rawValue || ""}</td>`;
        }).join("")}
      </tr>
    `;
      })
      .join("");

    const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; font-size: 14px; margin: 20px; }
              h2 { text-align: center; }
              .report-info { text-align: left; margin-bottom: 12px; }
              .general-info-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .general-info-table td:first-child { width: 35%; }
              .general-info-table td:last-child { width: 65%; }
              .general-info-table td { border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid black; padding: 8px; text-align: left; word-wrap: break-word; }
              th { background-color: #f2f2f2; }
              img { display: block; margin: auto; }

              th.col-no, td.col-no { width: 5%; }
              th.col-activity, td.col-activity { width: 20%; }
              th.col-good, td.col-good { width: 7%; }
              th.col-need, td.col-need { width: 7%; }
              th.col-red, td.col-red { width: 7%; }

              th.col-shift, td.col-shift { width: ${(100 - (5 + 20 + 7 + 7 + 7)) / halfHourSlots.length
      }%; }
            </style>
          </head>
          <body>
            <h2>PT. GREENFIELDS INDONESIA</h2>
            <div class="report-info">
              ${formattedData}
            </div>
              <table>
                <thead>
                  ${actualTimeRow}
                  <tr>
                    <th class="col-no">No</th>
                    <th class="col-activity">Activity</th>
                    <th class="col-good">G</th>
                    <th class="col-need">N</th>
                    <th class="col-red">R</th>
                    ${halfHourSlots
        .map(({ hour, mm }) => `<th class="col-shift">${hour}:${mm}</th>`)
        .join("")}
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
      const { uri } = await Print.printToFileAsync({
        html,
        orientation: "landscape",
      });
      console.log("File has been saved to:", uri);
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  // Fixed cell widths
  const CELL_WIDTHS = {
    no: 40,
    activity: 200,
    status: 50,
    hour: 60,
    fixedTotal: 390 // no + activity + 3 status cells
  };

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <View style={styles.header}>
          <Text style={styles.title}>Detail Data Shiftly</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>
                {moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Process Order:</Text>
              <Text style={styles.infoValue}>{item.processOrder}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Package:</Text>
              <Text style={styles.infoValue}>{item.packageType}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plant:</Text>
              <Text style={styles.infoValue}>{item.plant}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Line:</Text>
              <Text style={styles.infoValue}>{item.line}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Shift:</Text>
              <Text style={styles.infoValue}>{item.shift}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Machine:</Text>
              <Text style={styles.infoValue}>{item.machine}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={printToFile}
          >
            <Text style={styles.submitButtonText}>DOWNLOAD REPORT</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3bcd6b" />
          </View>
        ) : (
          <View style={styles.tableWrapper}>
            {/* Sticky Headers Container */}
            <View style={styles.stickyContainer}>
              {/* Sticky Actual Time Row */}
              <View style={styles.actualTimeRow}>
                {/* Fixed Actual Time Label */}
                <View style={[styles.actualTimeLabel, { width: CELL_WIDTHS.fixedTotal }]}>
                  <Text style={styles.actualTimeText}>Actual Time</Text>
                </View>

                {/* Scrollable Actual Time Cells */}
                <ScrollView
                  ref={actualTimeScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onScroll={(event) => handleHorizontalScroll(event, 'actualTime')}
                  scrollEventThrottle={16}
                >
                  <View style={styles.actualTimeContent}>
                    {shiftHours.map((hour, index) => {
                      const relatedItems = data.filter(
                        (item) => hour == moment.utc(item.LastRecordTime).format("HH")
                      );

                      return (
                        <View key={`time-${hour}-${index}`} style={[styles.actualTimeCell, { width: CELL_WIDTHS.hour }]}>
                          {relatedItems.length === 0 ? (
                            <Text style={styles.actualTimeEmpty}>-</Text>
                          ) : (
                            relatedItems.map((filteredItem, idx) => {
                              const lastRecordHour = moment.utc(filteredItem.LastRecordTime).format("HH");
                              const submitHour = moment.utc(filteredItem.submitTime).format("HH");
                              const submitMinutes = moment.utc(filteredItem.submitTime).format("mm");
                              const isMoreThanOneHour = Math.abs(parseInt(lastRecordHour) - parseInt(submitHour)) >= 1;

                              return (
                                <View
                                  key={`time-value-${hour}-${idx}`}
                                  style={[
                                    styles.actualTimeBox,
                                    { backgroundColor: isMoreThanOneHour ? "#ffebee" : "#e8f5e9" }
                                  ]}
                                >
                                  <Text style={[
                                    styles.actualTimeValue,
                                    { color: isMoreThanOneHour ? "#d32f2f" : "#2e7d32" }
                                  ]}>
                                    {submitHour}:{submitMinutes}
                                  </Text>
                                </View>
                              );
                            })
                          )}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Sticky Table Header */}
              <View style={styles.tableHeaderRow}>
                {/* Fixed Header Columns */}
                <View style={styles.fixedHeaderColumns}>
                  <View style={[styles.headerCell, { width: CELL_WIDTHS.no }]}>
                    <Text style={styles.headerText}>No</Text>
                  </View>
                  <View style={[styles.headerCell, { width: CELL_WIDTHS.activity }]}>
                    <Text style={styles.headerText}>Activity</Text>
                  </View>
                  <View style={[styles.headerCell, { width: CELL_WIDTHS.status }]}>
                    <Text style={styles.headerText}>G</Text>
                  </View>
                  <View style={[styles.headerCell, { width: CELL_WIDTHS.status }]}>
                    <Text style={styles.headerText}>N</Text>
                  </View>
                  <View style={[styles.headerCell, { width: CELL_WIDTHS.status }]}>
                    <Text style={styles.headerText}>R</Text>
                  </View>
                </View>

                {/* Scrollable Header Columns */}
                <ScrollView
                  ref={headerScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onScroll={(event) => handleHorizontalScroll(event, 'header')}
                  scrollEventThrottle={16}
                >
                  <View style={styles.scrollableHeaderContent}>
                    {shiftHours.map((hour, index) => (
                      <View key={`header-${hour}-${index}`} style={[styles.headerCell, { width: CELL_WIDTHS.hour }]}>
                        <Text style={styles.headerText}>{hour}:00</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Table Content with Vertical Scroll */}
            <ScrollView
              ref={verticalScrollRef}
              style={styles.tableContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}   // <- penting di Android
            >
              {uniqueData.map((item, index) => (
                <View key={`row-${index}`}>
                  <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                    {/* Fixed Columns */}
                    <View style={styles.fixedColumns}>
                      <View style={[styles.cell, { width: CELL_WIDTHS.no }]}>
                        <Text style={styles.cellText}>{index + 1}</Text>
                      </View>
                      <View style={[styles.cell, { width: CELL_WIDTHS.activity }]}>
                        <Text style={styles.activityText}>{item.activity}</Text>
                      </View>
                      <View style={[styles.cell, { width: CELL_WIDTHS.status }]}>
                        <Text style={styles.cellText}>{item.good ?? "-"}</Text>
                      </View>
                      <View style={[styles.cell, { width: CELL_WIDTHS.status }]}>
                        <Text style={styles.cellText}>{item.need ?? "-"}</Text>
                      </View>
                      <View style={[styles.cell, { width: CELL_WIDTHS.status }]}>
                        <Text style={styles.cellText}>{item.reject ?? "-"}</Text>
                      </View>
                    </View>

                    {/* Scrollable Columns */}
                    <ScrollView
                      ref={index === 0 ? contentScrollRef : null}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      onScroll={(event) => {
                        if (index === 0) {
                          handleHorizontalScroll(event, 'content');
                        }
                      }}
                      scrollEventThrottle={16}
                    >
                      <View style={styles.scrollableContent}>
                        {shiftHours.map((hour, idx) => (
                          <TouchableOpacity
                            key={`cell-${index}-${hour}-${idx}`}
                            style={[
                              styles.cell,
                              {
                                width: CELL_WIDTHS.hour,
                                backgroundColor: getResultColor(item.results[hour], item.good, item.reject)
                              }
                            ]}
                            onPress={() => item.picture[hour] && handlePress(item.picture[hour])}
                            disabled={!item.picture[hour]}
                          >
                            <Text style={[
                              styles.cellText,
                              { fontWeight: item.results[hour] ? 'bold' : 'normal' }
                            ]}>
                              {item.results[hour] || ""}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                  {shouldShowSeparator(index, uniqueData) && (
                    <View style={styles.sectionSeparator} />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
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
                  borderRadius: 10,
                }}
                resizeMode="contain"
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
  },
  tableWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stickyContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
    zIndex: 100,
    elevation: 4, // untuk Android agar sticky
  },
  actualTimeRow: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  actualTimeLabel: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  actualTimeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  actualTimeContent: {
    flexDirection: "row",
  },
  actualTimeCell: {
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  actualTimeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 2,
  },
  actualTimeValue: {
    fontSize: 11,
    fontWeight: "600",
  },
  actualTimeEmpty: {
    fontSize: 12,
    color: "#999",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
    minHeight: 45,
  },
  fixedHeaderColumns: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
  },
  scrollableHeaderContent: {
    flexDirection: "row",
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.3)",
  },
  headerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
  },
  tableContent: {
    maxHeight: 757.7,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    minHeight: 45,
  },
  tableRowAlt: {
    backgroundColor: "#f8f9fa",
  },
  fixedColumns: {
    flexDirection: "row",
  },
  scrollableContent: {
    flexDirection: "row",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  cellText: {
    fontSize: 13,
    textAlign: "center",
    color: "#333",
  },
  activityText: {
    fontSize: 13,
    color: "#333",
    paddingHorizontal: 10,
  },
  sectionSeparator: {
    height: 3,
    backgroundColor: "#2196F3",
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default DetailLaporanShiftly;
