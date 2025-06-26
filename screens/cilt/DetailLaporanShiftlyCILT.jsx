import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import moment from "moment";
import { useEffect, useState } from "react";
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
        // Gunakan regex untuk menangkap semua JSON array dalam string
        const matches = record.CombinedInspectionData.match(/\[.*?\]/g);

        if (!matches || matches.length === 0) {
          console.error(
            "No valid JSON array found in:",
            record.CombinedInspectionData
          );
          return;
        }

        // Ambil JSON array yang terakhir
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

  // const extractUniqueInspectionData = (records) => {
  //   console.log("extractUniqueInspectionData", records);
  //   const uniqueActivities = {};
  //   records.forEach((record) => {
  //     const inspections = JSON.parse(record.CombinedInspectionData);
  //     console.log("inspections", inspections);
  //     inspections.forEach((inspection) => {
  //       const key = `${inspection.id}|${inspection.activity}`;
  //       if (!uniqueActivities[key]) {
  //         uniqueActivities[key] = {
  //           activity: inspection.activity,
  //           standard: inspection.standard,
  //           results: {},
  //           picture: {},
  //         };
  //       }
  //       uniqueActivities[key].results[record.HourGroup] = inspection.results;
  //       uniqueActivities[key].picture[record.HourGroup] = inspection.picture;
  //     });
  //   });
  //   return Object.values(uniqueActivities);
  // };

  const extractUniqueInspectionDataX = (records) => {
    const uniqueActivities = {};
    records.forEach((record) => {
      const inspections = JSON.parse(record.CombinedInspectionData);
      inspections.forEach((inspection) => {
        const key = `${inspection.id}|${inspection.standard}`;
        if (!uniqueActivities[key]) {
          uniqueActivities[key] = {
            activity: inspection.activity,
            standard: inspection.standard,
            results: {},
            picture: {},
          };
        }
        uniqueActivities[key].results[record.HourGroup] = inspection.results;
        uniqueActivities[key].picture[record.HourGroup] = inspection.picture;
      });
    });

    const uniqueData = Object.values(uniqueActivities);
    console.log("Extracted Unique Inspection Data: ", uniqueData);
    return uniqueData;
  };

  useEffect(() => {
    fetchData();
  }, [item]);

  const handlePress = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const isWithinRangeX = (standard, result) => {
    console.log("Standard:", standard);
    console.log("Result:", result);
    if (!standard || !result) return false;
    if (standard == "- - -") return false;
    const rangeMatch = standard.match(/(\d+)\s*-\s*(\d+)/); // Regex untuk menemukan range angka seperti "17 - 20"
    if (rangeMatch) {
      const [_, min, max] = rangeMatch.map(Number);
      return result >= min && result <= max;
    }
    return false;
  };

  const isWithinRange = (standard, result) => {
    if (!standard || !result || isNaN(result)) return null;
    const rangeMatch = standard.match(/(\d+)\s*-\s*(\d+)/); // Regex untuk range angka
    if (rangeMatch) {
      const [_, min, max] = rangeMatch.map(Number);
      return result >= min && result <= max;
    }
    return null;
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

    // Baris indikator waktu sebelum header tabel utama
    const actualTimeRow = `
    <tr>
      <td colspan="5" style="font-weight: bold; text-align: center;">Actual Time</td>
      ${shiftHours
        .map((hour) => {
          const relatedItems = data.filter(
            (item) => hour == moment.utc(item.LastRecordTime).format("HH")
          );

          if (relatedItems.length === 0) {
            return `<td></td>`; // Jika tidak ada data, isi dengan sel kosong
          }

          return relatedItems
            .map((filteredItem) => {
              const lastRecordHour = moment
                .utc(filteredItem.LastRecordTime)
                .format("HH");
              const submitHour = moment
                .utc(filteredItem.submitTime)
                .format("HH");
              const sumbitMinutes = moment
                .utc(filteredItem.submitTime)
                .format("mm");

              // Hitung selisih jam
              const isMoreThanOneHour =
                Math.abs(lastRecordHour - submitHour) >= 1;

              return `<td style="font-weight: bold; background-color: ${
                isMoreThanOneHour ? "#f59f95" : "#b5e6c1"
              }">${submitHour}:${sumbitMinutes}</td>`;
            })
            .join("");
        })
        .join("")}
    </tr>
  `;

    // Mapping inspectionData ke dalam tabel
    const inspectionRows = uniqueData
      .map((item, index) => {
        return `
      <tr>
        <td class="col-no">${index + 1}</td>
        <td class="col-activity">${item.activity}</td>
        <td class="col-good">${item.good ?? "-"}</td>
        <td class="col-need">${item.need ?? "-"}</td>
        <td class="col-red">${item.reject ?? "-"}</td>
        ${shiftHours
          .map((hour) => {
            const rawValue = item.results?.[hour];
            const resultValue = parseFloat(rawValue);
            const goodValue = parseFloat(item.good);
            const needValue = parseFloat(item.need);
            const rejectValue = parseFloat(item.reject);

            let resultColor = "white"; // default
            if (rawValue === "OK") {
              resultColor = "#b5e6c1";
            } else if (rawValue === "NOT OK") {
              resultColor = "#f59f95";
            } else if (!isNaN(resultValue)) {
              if (!isNaN(goodValue) && !isNaN(rejectValue)) {
                if (resultValue < goodValue || resultValue >= rejectValue) {
                  resultColor = "#f59f95";
                } else if (
                  needValue !== null &&
                  !isNaN(needValue) &&
                  resultValue >= goodValue &&
                  resultValue < needValue
                ) {
                  resultColor = "#b5e6c1";
                } else {
                  resultColor = "#f3f595";
                }
              }
            }

            return `<td class="col-shift" style="background-color: ${resultColor}; font-weight: bold;">${
              rawValue || ""
            }</td>`;
          })
          .join("")}
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

              /* Atur lebar spesifik untuk setiap kolom */
              th.col-no, td.col-no { width: 5%; } /* No */
              th.col-activity, td.col-activity { width: 20%; } /* Activity */
              th.col-good, td.col-good { width: 7%; }  /* G */
              th.col-need, td.col-need { width: 7%; }  /* N */
              th.col-red, td.col-red { width: 7%; }    /* R */

              th.col-shift, td.col-shift { width: ${
                (100 - (5 + 20 + 7 + 7 + 7)) / shiftHours.length
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
                    ${shiftHours
                      .map((hour) => `<th class="col-shift">${hour}</th>`)
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView horizontal>
        <ScrollView>
          <View style={styles.header}>
            <Text style={styles.title}>Detail Data Shiftly</Text>
            <Text style={styles.infoTextBold}>
              Date:{"                         "}
              <Text style={styles.infoText}>
                {moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format(
                  "DD/MM/YY HH:mm:ss"
                )}
              </Text>
            </Text>
            <Text style={styles.infoTextBold}>
              Process Order:{"       "}
              <Text style={styles.infoText}>{item.processOrder}</Text>
            </Text>
            <Text style={styles.infoTextBold}>
              Package: {"                 "}{" "}
              <Text style={styles.infoText}>{item.packageType}</Text>
            </Text>
            <Text style={styles.infoTextBold}>
              Plant: {"                       "}{" "}
              <Text style={styles.infoText}>{item.plant}</Text>
            </Text>
            <Text style={styles.infoTextBold}>
              Line: {"                          "}
              <Text style={styles.infoText}>{item.line}</Text>
            </Text>
            <Text style={styles.infoTextBold}>
              Shift: {"                         "}
              <Text style={styles.infoText}>{item.shift}</Text>
            </Text>
            <Text style={styles.infoTextBold}>
              Machine: {"                 "}{" "}
              <Text style={styles.infoText}>{item.machine}</Text>
            </Text>
          </View>

          <View>
            <TouchableOpacity
              style={[styles.submitButton]}
              onPress={printToFile}
            >
              <Text style={styles.submitButtonText}>DOWNLOAD REPORT</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#3bcd6b" />
          ) : (
            <View style={styles.wrapper}>
              <ScrollView horizontal>
                <View style={styles.table}>
                  <View style={styles.tableHeadTime}>
                    <View style={{ width: 260 }}></View>
                    <View style={{ width: 120 }}>
                      <Text style={styles.timeCaption}>Actual{"\n"}Time</Text>
                    </View>
                    {shiftHours.map((hour, index) => (
                      <View key={index} style={{ width: 60 }}>
                        {data
                          .filter(
                            (item) =>
                              hour ==
                              moment.utc(item.LastRecordTime).format("HH")
                          )
                          .map((filteredItem, idx) => {
                            const lastRecordHour = moment
                              .utc(filteredItem.LastRecordTime)
                              .format("HH");
                            const submitHour = moment
                              .utc(filteredItem.submitTime)
                              .format("HH");

                            // Hitung selisih jam
                            const isMoreThanOneHour =
                              Math.abs(lastRecordHour - submitHour) >= 1;

                            return (
                              <>
                                <Text
                                  key={idx}
                                  style={{
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    color: isMoreThanOneHour ? "red" : "green",
                                  }}
                                >
                                  {submitHour}
                                </Text>
                                <Text
                                  key={idx}
                                  style={{
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    color: isMoreThanOneHour ? "red" : "green",
                                  }}
                                >
                                  {moment(filteredItem.submitTime).format("mm")}
                                </Text>
                              </>
                            );
                          })}
                      </View>
                    ))}
                  </View>

                  <View style={styles.tableHead}>
                    <View style={{ width: 60 }}>
                      <Text style={styles.tableCaption}>No</Text>
                    </View>
                    <View style={{ width: 200 }}>
                      <Text style={styles.tableCaption}>Activity</Text>
                    </View>
                    <View style={{ width: 40 }}>
                      <Text style={styles.tableCaption}>G</Text>
                    </View>
                    <View style={{ width: 40 }}>
                      <Text style={styles.tableCaption}>N</Text>
                    </View>
                    <View style={{ width: 40 }}>
                      <Text style={styles.tableCaption}>R</Text>
                    </View>
                    {shiftHours.map((hour, index) => (
                      <View key={index} style={{ width: 60 }}>
                        <Text style={styles.tableCaption}>{hour}</Text>
                        {/* {data
                          .filter(
                            (item) =>
                              hour ==
                              moment.utc(item.LastRecordTime).format("HH")
                          )
                          .map((filteredItem, idx) => (
                            <Text key={idx} style={styles.tableCaption}>
                              {moment(filteredItem.LastRecordTime).format("mm")}
                            </Text>
                          ))} */}
                      </View>
                    ))}
                  </View>

                  {uniqueData.map((item, index) => (
                    <View key={index} style={styles.tableBody}>
                      <View style={{ width: 60 }}>
                        <Text style={styles.tableData}>{index + 1}</Text>
                      </View>
                      <View style={{ width: 200 }}>
                        <Text style={styles.tableData}>{item.activity}</Text>
                      </View>
                      <View style={{ width: 40 }}>
                        <Text style={styles.tableData}>{item.good ?? "-"}</Text>
                      </View>
                      <View style={{ width: 40 }}>
                        <Text style={styles.tableData}>{item.need ?? "-"}</Text>
                      </View>
                      <View style={{ width: 40 }}>
                        <Text style={styles.tableData}>
                          {item.reject ?? "-"}
                        </Text>
                      </View>
                      {shiftHours.map((hour, idx) => (
                        <View key={idx} style={{ width: 60 }}>
                          <TouchableOpacity
                            onPress={() =>
                              item.picture[hour] &&
                              handlePress(item.picture[hour])
                            }
                            disabled={!item.picture[hour]}
                          >
                            <Text
                              style={[
                                styles.tableData,
                                {
                                  backgroundColor: item.results[hour]
                                    ? isWithinRange(
                                        `${item.reject} - ${item.good}`,
                                        parseFloat(item.results[hour])
                                      ) === true
                                      ? "#b5e6c1" // Hijau jika dalam range
                                      : isWithinRange(
                                          `${item.reject} - ${item.good}`,
                                          parseFloat(item.results[hour])
                                        ) === false
                                      ? "#f59f95" // Merah jika di luar range
                                      : "#f8f9fa" // Default jika bukan angka
                                    : "#f8f9fa",
                                },
                              ]}
                            >
                              {item.results[hour] || ""}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>
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
  wrapper: {
    paddingTop: 8,
  },
  table: {
    flexDirection: "column",
    width: "100%",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
    paddingVertical: 10,
  },
  tableHeadTime: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    paddingVertical: 10,
  },
  tableBody: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  tableCaption: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  timeCaption: {
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableData: {
    textAlign: "center",
    fontSize: 14,
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
});

export default DetailLaporanShiftly;
