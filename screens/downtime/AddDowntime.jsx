import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ScreenOrientation from "expo-screen-orientation";
import moment from "moment-timezone";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Checkbox, Switch } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
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

const AddDowntimePage = ({ navigation }) => {
  const [plant, setPlant] = useState("");
  const [line, setLine] = useState("");
  const [date, setDate] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [shift, setShift] = useState(
    getShiftByHour(moment(new Date()).tz("Asia/Jakarta").format("HH"))
  );

  const [machine, setMachine] = useState("");
  const [downtime, setDowntime] = useState("");
  const [remarks, setRemarks] = useState("");
  const [duration, setDuration] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // State to manage loading animation
  const [inspectionData, setInspectionData] = useState([]);
  const [areas, setAreas] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);
  const [category, setCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([]);

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
    fetchAreaData(); // Fetch area data on component mount
    if (!machine == "") {
      fetchInspectionData(line, category, machine); // Pass the updated packageType to fetchInspectionData
    }
  }, [machine]);

  useEffect(() => {
    filterOptions();
  }, [plant, line, category, date, shift, machine]);

  useEffect(() => {
    if (date && duration && !isNaN(duration)) {
      const start = new Date(date);
      const newEndTime = new Date(start.getTime() + parseInt(duration) * 60000); // 60000ms = 1 menit
      setEndTime(newEndTime);
    }
  }, [date, duration]);

  const fetchAreaData = async () => {
    try {
      const response = await api.get("/getDowntimeList");
      setAreas(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchInspectionData = async (line, category, machine) => {
    setIsLoading(true); // Start loading animation
    setInspectionData([]); // Reset inspection data before fetching new data

    try {
      const response = await api.get(
        `/getDowntimeMaster/${line}/${category}/${machine}`
      );

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid response format");
      }

      console.log("response.data:", response.data);

      const formattedData = response.data.map((item) => ({
        id: item.id,
        line: item.line,
        category: item.downtime_category,
        mesin: item.mesin,
        downtime: item.downtime,
        done: false,
      }));

      setInspectionData(formattedData); // Set the new inspection data
      console.log("Updated inspectionData:", formattedData); // Debugging log
    } catch (error) {
      console.error("Error fetching inspection data:", error);
    } finally {
      setIsLoading(false); // Stop loading animation
    }
  };

  const filterOptions = () => {
    const filteredLines = areas
      .filter((area) => area.plant === plant)
      .map((area) => area.line)
      .filter((value, index, self) => self.indexOf(value) === index);

    setLineOptions(filteredLines);

    const filteredCategories = areas
      .filter((area) => area.plant === plant && area.line === line)
      .map((area) => area.downtime_category)
      .filter((value, index, self) => self.indexOf(value) === index);

    setCategoryOptions(filteredCategories);

    const filteredMachines = areas
      .filter(
        (area) =>
          area.plant === plant &&
          area.line === line &&
          area.downtime_category === category
      )
      .map((area) => area.mesin);

    setMachineOptions(filteredMachines);
  };

  const toggleSwitch = (index) => {
    const updatedData = inspectionData.map((item, i) => ({
      ...item,
      done: i === index ? !item.done : false, // hanya item yang di-tap yang bisa aktif
    }));

    setInspectionData(updatedData);

    const selected = updatedData.find((item) => item.done);
    if (selected) {
      setDowntime(selected.downtime); // set downtime yang dipilih
    } else {
      setDowntime(""); // reset jika tidak ada yang aktif
    }
  };

  // Submit form
  const handleSubmit = async () => {
    const submitTime = moment().tz("Asia/Jakarta").format(); // Rekam waktu submit dalam zona waktu Jakarta
    let order = {}; // Objek untuk menyimpan data order

    try {
      // Siapkan objek order
      order = {
        plant: plant,
        date: moment(date).tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm"),
        shift: shiftMapCILT[shift] || shift.replace(/\D/g, ""),
        line: line,
        downtime_category: category == "Breakdown" ? "Minor Stop" : category,
        mesin: machine,
        jenis: downtime,
        keterangan: remarks,
        minutes: duration,
      };

      console.log("Simpan data order:", order);

      // Kirim data ke server
      const response = await api.post("/downtime", order);

      if (response.status === 201) {
        Alert.alert("Success", "Data submitted successfully!");
        await clearOfflineData(); // Hapus data offline setelah berhasil submit
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      }
    } catch (error) {
      await saveOfflineData(order); // Simpan data secara offline jika submit gagal
      Alert.alert(error.response.data.message);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>New Downtime Data</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.blue} />
        ) : (
          <>
            <View style={styles.row}>
              {/* Select Date and Select Time */}
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Date & Start Time *</Text>
                <View style={styles.dropdownContainer}>
                  <ReusableDatetime3
                    date={date}
                    setDate={setDate}
                    setShift={setShift}
                    getShiftByHour={getShiftByHour}
                  />
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
                    onValueChange={(itemValue) => setShift(itemValue)}
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

            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Duration (minutes) *</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name="timer-outline"
                    size={20}
                    color={COLORS.lightBlue}
                  />
                  <TextInput
                    placeholder="Duration"
                    style={styles.input}
                    value={duration}
                    keyboardType="numeric"
                    onChangeText={(text) => setDuration(text)}
                  />
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>End Time *</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name="calendar-range"
                    size={20}
                    color={COLORS.lightBlue}
                  />
                  <Text style={styles.input}>
                    {endTime.toLocaleString([], {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            </View>

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
                    onValueChange={(itemValue) => {
                      setPlant(itemValue);
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
                <Text style={styles.label}>Line *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="line-scan"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={line}
                    style={styles.dropdown}
                    onValueChange={(itemValue) => {
                      setLine(itemValue);
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
                <Text style={styles.label}>Category *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="puzzle"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={category}
                    style={styles.dropdown}
                    onValueChange={(itemValue) => {
                      setCategory(itemValue);
                      filterOptions();
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {categoryOptions.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Machine *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="robot-industrial"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={machine}
                    style={styles.dropdown}
                    onValueChange={(itemValue) => setMachine(itemValue)}
                  >
                    <Picker.Item label="Select option" value="" />
                    {machineOptions.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Group *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="account-group"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={product}
                    style={styles.dropdown}
                    onValueChange={(itemValue) => {
                      setProduct(itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {productOptions.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View> */}

            <View style={styles.inputGroupBawah}>
              <Text style={styles.label}>Remarks *</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="card-text"
                  size={20}
                  color={COLORS.lightBlue}
                />
                <TextInput
                  placeholder="Catatan"
                  style={styles.input}
                  value={remarks}
                  onChangeText={(text) => setRemarks(text)}
                />
              </View>
            </View>

            <View style={styles.wrapper}>
              {/* Table Container */}
              <View style={styles.table}>
                {/* Table Head */}
                <View style={styles.tableHead}>
                  {/* Header Caption */}
                  <View style={{ width: "20%" }}>
                    <Text style={styles.tableCaption}>Select</Text>
                  </View>
                  <View style={{ width: "80%" }}>
                    <Text style={styles.tableCaption}>Downtime</Text>
                  </View>
                </View>

                {/* Table Body */}
                {inspectionData.map((item, index) => (
                  <View key={index} style={styles.tableBody}>
                    {/* Header Caption */}
                    <View style={{ width: "20%" }}>
                      <View style={[styles.tableData, styles.centeredContent]}>
                        <Switch
                          style={styles.tableData}
                          value={item.done}
                          onValueChange={() => toggleSwitch(index)}
                        />
                      </View>
                    </View>
                    <View style={{ width: "80%" }}>
                      <Text style={styles.tableData}>{item.downtime}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={styles.checkboxContainer}>
          <Checkbox
            status={agreed ? "checked" : "unchecked"}
            onPress={() => setAgreed(!agreed)}
          />
          <Text style={styles.checkboxLabel}>
            Saya menyatakan telah memasukkan data dengan benar.
          </Text>
        </View>

        <View>
          <TouchableOpacity
            style={
              agreed && duration && downtime
                ? styles.submitButton
                : styles.submitButtonDisabled
            }
            onPress={() => handleSubmit()}
            disabled={!(agreed && duration !== "")}
          >
            <Text style={styles.submitButtonText}>SUBMIT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 5,
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
  dropdown: {
    flex: 1,
    marginLeft: 10,
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
