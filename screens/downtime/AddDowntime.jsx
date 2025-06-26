import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as ScreenOrientation from "expo-screen-orientation";
import moment from "moment-timezone";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DowntimeCategoryModal from "../../components/Modal/DowntimeCategoryModal";
import ReusableDatetime3 from "../../components/Reusable/ReusableDatetime3";
import { COLORS } from "../../constants/theme";
import { api } from "../../utils/axiosInstance";

// Get shift by hour
const getShiftByHour = (hour) => {
  const shift1 = ["06", "07", "08", "09", "10", "11", "12", "13"];
  const shift2 = ["14", "15", "16", "17", "18", "19", "20", "21"];
  const shift3 = ["22", "23", "00", "01", "02", "03", "04", "05"];

  if (shift1.includes(hour)) return "Shift 1";
  if (shift2.includes(hour)) return "Shift 2";
  if (shift3.includes(hour)) return "Shift 3";
  return "Unknown Shift";
};

const AddDowntimePage = () => {
  const [plant, setPlant] = useState("");
  const [line, setLine] = useState("");
  const [date, setDate] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [shift, setShift] = useState(
    getShiftByHour(moment(new Date()).tz("Asia/Jakarta").format("HH"))
  );

  const [remarks, setRemarks] = useState("");
  const [duration, setDuration] = useState("");
  const [isLoading, setIsLoading] = useState(false); // State to manage loading animation
  const [downtimeData, setDowntimeData] = useState([]);
  const [areas, setAreas] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedItemDowntime, setSelectedItemDowntime] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [editingItem, setEditingItem] = useState(null);

  const deleteInspectionById = async (id) => {
    const response = await api.delete(`/downtime/${id}`);
    return response.data;
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this item?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteInspectionById(id);
              Alert.alert("Success", "Item deleted successfully.");
              fetchData();
            } catch (error) {
              console.error("Delete failed:", error);
              Alert.alert("Error", "Failed to delete item.");
            }
          },
        },
      ]
    );
  };

  const handleSelect = (category, machine, itemDowntime) => {
    setSelectedCategory(category);
    setSelectedMachine(machine);
    setSelectedItemDowntime(itemDowntime);
    setShowModal(false);
    setShowDetailModal(true); // tampilkan modal input detail
  };

  const fetchMasterDowntimeByLine = async (line) => {
    try {
      const response = await api.get(`/getDowntimeMasterByLine?line=${line}`);
      const raw = response.data;

      // Proses jadi format: [{ category: "...", items: [...] }]
      const grouped = raw.reduce((acc, item) => {
        const { downtime_category, mesin, downtime } = item;

        // cari kategori
        let cat = acc.find((c) => c.category === downtime_category);
        if (!cat) {
          cat = { category: downtime_category, mesin: [] };
          acc.push(cat);
        }

        // cari mesin
        let m = cat.mesin.find((m) => m.name === mesin);
        if (!m) {
          m = { name: mesin, downtime: [] };
          cat.mesin.push(m);
        }

        // tambahkan downtime jika belum ada
        if (!m.downtime.includes(downtime)) {
          m.downtime.push(downtime);
        }

        return acc;
      }, []);

      setCategoryData(grouped);
    } catch (error) {
      console.error("Failed to fetch master downtime:", error);
    }
  };

  useEffect(() => {
    if (line) {
      fetchMasterDowntimeByLine(line);
    }
  }, [line]);

  useEffect(() => {
    if (startTime && duration && !isNaN(duration)) {
      const start = new Date(startTime);
      const calculatedEnd = new Date(
        start.getTime() + parseInt(duration) * 60000
      ); // menit → ms
      setEndTime(calculatedEnd);
    }
  }, [startTime, duration]);

  useEffect(() => {
    // Lock the screen orientation to portrait
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      );
    };
    lockOrientation();
  }, []);

  const shiftOptions = [
    { label: "Shift 1", value: "Shift 1" },
    { label: "Shift 2", value: "Shift 2" },
    { label: "Shift 3", value: "Shift 3" },
    // { label: "Long shift Pagi", value: "Long shift Pagi" },
    // { label: "Long shift Malam", value: "Long shift Malam" },
    // { label: "Start shift", value: "Start shift" },
    // { label: "End shift", value: "End shift" },
  ];

  const shiftMapCILT = {
    "Shift 1": "I",
    "Shift 2": "II",
    "Shift 3": "III",
  };

  useEffect(() => {
    const loadDate = async () => {
      const savedDate = await AsyncStorage.getItem("date");
      setPlant(await AsyncStorage.getItem("plant"));
      setLine(await AsyncStorage.getItem("line"));
      setShift(await AsyncStorage.getItem("shift"));
      if (savedDate) {
        setCurrentDate(new Date(savedDate)); // restore sebagai Date object
      }
    };
    loadDate();
  }, []);

  useEffect(() => {
    fetchAreaData(); // Fetch area data on component mount
  }, []);

  const fetchData = async () => {
    filterOptions();
    const dateLocal = await AsyncStorage.getItem("date");
    const shiftMapped = shiftMapCILT[shift] || shift;
    await fetchDowntimeData(plant, dateLocal, line, shiftMapped);
  };

  useEffect(() => {
    fetchData();
  }, [plant, line, currentDate, shift]);

  const fetchAreaData = async () => {
    try {
      const response = await api.get("/getDowntimeList");
      setAreas(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchDowntimeData = async (plant, date, line, shift) => {
    try {
      const response = await api.get(
        `/getDowntimeData?plant=${plant}&date=${date}&line=${line}&shift=${shift}`
      );
      setDowntimeData(response.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const filterOptions = () => {
    const filteredLines = areas
      .filter((area) => area.plant === plant)
      .map((area) => area.line)
      .filter((value, index, self) => self.indexOf(value) === index);

    setLineOptions(filteredLines);
  };

  // Submit form
  const handleSubmit = async () => {
    let order = {};
    if (!startTime || !duration || !remarks) {
      Alert.alert("Attention!", "Please fill in all fields.");
      return;
    }

    try {
      order = {
        plant: plant,
        date: moment(startTime).tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm"),
        shift: shiftMapCILT[shift] || shift.replace(/\D/g, ""),
        line: line,
        downtime_category:
          selectedCategory == "Breakdown/Minor Stop"
            ? "Minor Stop"
            : selectedCategory,
        mesin: selectedMachine,
        jenis: selectedItemDowntime,
        keterangan: remarks || "-",
        minutes: duration,
        ...(editingItem && { id: editingItem.id }), // tambahkan id jika edit
      };

      const response = editingItem
        ? await api.put("/downtime", order)
        : await api.post("/downtime", order);

      if (response.status === 201 || response.status === 200) {
        Alert.alert(
          "Success",
          `Data ${editingItem ? "updated" : "submitted"} successfully!`
        );
        setShowDetailModal(false);
        setStartTime(new Date());
        setEndTime(new Date());
        setDuration("");
        setRemarks("");
        setEditingItem(null);
        fetchData();
        await clearOfflineData();
      }
    } catch (error) {
      await saveOfflineData(order);
      Alert.alert(error.response?.data?.message || "Submission failed.");
    }
  };

  const handleEdit = (item) => {
    setSelectedCategory(item.Downtime_Category);
    setSelectedMachine(item.Mesin);
    setSelectedItemDowntime(item.Jenis);
    setStartTime(moment(item.Date, "YYYY-MM-DD HH:mm:ss.SSS").toDate());
    setDuration(String(item.Minutes));
    setRemarks(item.Keterangan);
    setEditingItem(item); // simpan item yang sedang diedit
    setShowDetailModal(true);
  };

  // Save offline data when API submission fails
  const saveOfflineData = async (order) => {
    try {
      console.log("Saving offline data:", order);
      let offlineData = await AsyncStorage.getItem("offlineData");
      offlineData = offlineData ? JSON.parse(offlineData) : [];
      offlineData.push(order);
      await AsyncStorage.setItem("offlineData", JSON.stringify(offlineData));
    } catch (error) {
      console.error("Failed to save offline data:", error);
    }
  };

  const clearOfflineData = async () => {
    try {
      await AsyncStorage.removeItem("offlineData");
    } catch (error) {
      console.error("Failed to clear offline data:", error);
    }
  };

  const onDateChange = async (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCurrentDate(selectedDate);

      // Konversi tanggal ke string (format YYYY-MM-DD misalnya)
      const dateString = selectedDate.toISOString().split("T")[0];
      await AsyncStorage.setItem("date", dateString);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>New Downtime Data</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.blue} />
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Plant *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="factory"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={plant}
                    style={styles.dropdown}
                    onValueChange={async (itemValue) => {
                      setPlant(itemValue);
                      await AsyncStorage.setItem("plant", itemValue);
                      filterOptions();
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {[...new Set(areas.map((area) => area.plant))].map(
                      (option, index) => (
                        <Picker.Item
                          key={index}
                          label={option}
                          value={option}
                        />
                      )
                    )}
                  </Picker>
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Production Line *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="line-scan"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={line}
                    style={styles.dropdown}
                    onValueChange={async (itemValue) => {
                      setLine(itemValue);
                      await AsyncStorage.setItem("line", itemValue);
                      filterOptions();
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {lineOptions.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Date *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="calendar-range"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateText}>
                      {currentDate.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      testID="datePicker"
                      value={currentDate}
                      mode="date"
                      is24Hour={true}
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Shift *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={shift}
                    style={styles.dropdown}
                    onValueChange={async (itemValue) => {
                      setShift(itemValue);
                      await AsyncStorage.setItem("shift", itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {shiftOptions.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addDowntimeButton}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.buttonTextBold}>Add Downtime</Text>
            </TouchableOpacity>

            <DowntimeCategoryModal
              visible={showModal}
              onClose={() => setShowModal(false)}
              onSelect={handleSelect}
              data={categoryData}
            />

            <View style={styles.wrapper}>
              {/* Table Container */}
              <View style={styles.table}>
                {/* Table Head */}
                <View style={styles.tableHead}>
                  <View style={[styles.cell, { width: "4%" }]}>
                    <Text style={styles.cellTextHeader}>No</Text>
                  </View>
                  <View style={[styles.cell, { width: "12%" }]}>
                    <Text style={styles.cellTextHeader}>Downtime Category</Text>
                  </View>
                  <View style={[styles.cell, { width: "15%" }]}>
                    <Text style={styles.cellTextHeader}>Machine</Text>
                  </View>
                  <View style={[styles.cell, { width: "14%" }]}>
                    <Text style={styles.cellTextHeader}>Type</Text>
                  </View>
                  <View style={[styles.cell, { width: "10%" }]}>
                    <Text style={styles.cellTextHeader}>Start Time</Text>
                  </View>
                  <View style={[styles.cell, { width: "10%" }]}>
                    <Text style={styles.cellTextHeader}>
                      Duration (minutes)
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: "15%" }]}>
                    <Text style={styles.cellTextHeader}>Notes</Text>
                  </View>
                  <View style={[styles.cell, { width: "20%" }]}>
                    <Text style={styles.cellTextHeader}>Action</Text>
                  </View>
                </View>

                {/* Table Body */}
                <View style={{ borderWidth: 1, borderColor: "#000" }}>
                  {downtimeData.map((item, index) => (
                    <View key={index} style={{ flexDirection: "row" }}>
                      <View style={[styles.cell, { width: "4%" }]}>
                        <Text style={styles.cellText}>{index + 1}</Text>
                      </View>
                      <View style={[styles.cell, { width: "12%" }]}>
                        <Text style={styles.cellText}>
                          {item.Downtime_Category}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: "15%" }]}>
                        <Text style={styles.cellText}>{item.Mesin}</Text>
                      </View>
                      <View style={[styles.cell, { width: "14%" }]}>
                        <Text style={styles.cellText}>{item.Jenis}</Text>
                      </View>
                      <View style={[styles.cell, { width: "10%" }]}>
                        <Text style={styles.cellText}>
                          {moment(item.Date, "YYYY-MM-DD HH:mm:ss.SSS").format(
                            "HH:mm:ss"
                          )}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: "10%" }]}>
                        <Text style={styles.cellText}>{item.Minutes}</Text>
                      </View>
                      <View style={[styles.cell, { width: "15%" }]}>
                        <Text style={styles.cellText}>{item.Keterangan}</Text>
                      </View>
                      <View
                        style={[
                          styles.cell,
                          {
                            width: "20%",
                            flexDirection: "row",
                            justifyContent: "center", // Horizontal center
                            alignItems: "center", // Vertical center
                            gap: 4,
                          },
                        ]}
                      >
                        {item.Completed === 0 ? (
                          <>
                            <TouchableOpacity
                              style={styles.updateButton}
                              onPress={() => handleEdit(item)}
                            >
                              <Text style={styles.buttonText}>Update</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDelete(item.id)}
                            >
                              <Text style={styles.buttonText}>Delete</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <Text>Accepted</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}

        {showDetailModal && (
          <Modal
            visible={showDetailModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDetailModal(false)}
          >
            <View style={styles.overlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Report Downtime</Text>

                <Text style={styles.downtimeLabel}>
                  Category: {selectedCategory}
                </Text>
                <Text style={styles.downtimeLabel}>
                  Machine: {selectedMachine}
                </Text>
                <Text style={styles.downtimeLabel}>
                  Downtime: {selectedItemDowntime}
                </Text>

                <Text style={styles.inputLabel}>Start Time:</Text>
                <View style={styles.dropdownContainer}>
                  <ReusableDatetime3 date={startTime} setDate={setStartTime} />
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="datetime"
                    display="default"
                    onChange={(e, selected) => {
                      setShowDatePicker(false);
                      if (selected) setDate(selected);
                    }}
                  />
                )}

                <Text style={styles.inputLabel}>Duration (minutes):</Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  value={duration}
                  onChangeText={setDuration}
                />

                <Text style={styles.inputLabel}>End Time:</Text>
                <View style={styles.inputField}>
                  <Text>{moment(endTime).format("DD/MM/YYYY HH:mm")}</Text>
                </View>

                <Text style={styles.inputLabel}>Comments:</Text>
                <TextInput
                  style={styles.inputField}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="Comments"
                />

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetailModal(false);
                      setEditingItem(null);
                    }}
                  >
                    <Text style={{ color: "red" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      handleSubmit();
                    }}
                    style={{ marginLeft: 20 }}
                  >
                    <Text style={{ color: "green" }}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  cell: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 4,
    justifyContent: "center",
  },
  cellText: {
    fontSize: 14,
    textAlign: "center",
  },
  cellTextHeader: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "bold",
  },
  addDowntimeButton: {
    marginTop: 12,
    backgroundColor: "#4caf50",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    width: "15%",
  },
  updateButton: {
    backgroundColor: "#4caf50",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 4,
  },
  deleteButton: {
    backgroundColor: "#f44336",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonTextBold: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  inputLabel: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: "600",
  },
  downtimeLabel: {
    marginBottom: 4,
    fontWeight: "600",
  },
  inputField: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    alignSelf: "center",
    color: COLORS.blue,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupBawah: {
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInputGroup: {
    flex: 1,
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  input: {
    borderColor: COLORS.lightBlue,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 5,
    height: 40,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 5,
    height: 40,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  dateText: {
    marginLeft: 16,
    fontSize: 16,
  },
  dropdown: {
    flex: 1,
    marginLeft: 4,
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
    width: "100%",
  },
  tableBody: {
    flexDirection: "row",
    // backgroundColor: "#3bcd6b",
    padding: 20,
    width: "100%",
  },
  tableCaption: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableData: {
    // color: "#fff",
    // fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxLabel: {
    marginLeft: 8,
  },
  buttonContainer: {
    paddingBottom: 16,
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#aaa",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  picker: {
    width: "100%",
    height: 40,
    backgroundColor: "#f8f9fa",
  },
});

export default AddDowntimePage;
