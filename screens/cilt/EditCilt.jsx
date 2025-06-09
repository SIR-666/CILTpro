import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ScreenOrientation from "expo-screen-orientation";
import moment from "moment-timezone";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Checkbox } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReusableOfflineUploadImage } from "../../components";
import ReusableDatetime2 from "../../components/Reusable/ReusableDatetime2";
import { COLORS } from "../../constants/theme";
import { api, sqlApi, uploadImageApi } from "../../utils/axiosInstance";

// Define uploadImageToServer function here
const uploadImageToServer = async (uri) => {
  const formData = new FormData();

  formData.append("images", {
    uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
    type: "image/jpeg", // Adjust based on your image type
    name: uri.split("/").pop(), // This ensures the file has a name
  });

  try {
    const response = await uploadImageApi.post("/upload", formData);

    if (!response.ok) {
      // If the response is not OK, log the full response and throw an error
      console.error(
        "Failed to upload image",
        response.status,
        response.statusText
      );
      const responseText = await response.text(); // Get the raw response text for debugging
      console.error("Response text:", responseText);
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    const responseJson = await response.json();
    let serverImageUrl = responseJson.uploadedFiles[0];

    return serverImageUrl; // Return the server URL after upload
  } catch (error) {
    console.error("Image upload failed:", error);
    throw new Error("Image upload failed");
  }
};

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

const EditCILTinspection = ({ route, navigation }) => {
  const { item } = route.params;
  const [username, setUsername] = useState("");
  const [processOrder, setProcessOrder] = useState(item.processOrder || "");
  const [packageType, setPackageType] = useState(item.packageType || "");
  const [plant, setPlant] = useState(item.plant || "");
  const [line, setLine] = useState(item.line || "");
  const [date, setDate] = useState(new Date());
  const [shift, setShift] = useState(
    getShiftByHour(moment(new Date()).tz("Asia/Jakarta").format("HH"))
  );

  const [product, setProduct] = useState(item.product || "");
  const [machine, setMachine] = useState(item.machine || "");
  const [batch, setBatch] = useState(item.batch || "");
  const [remarks, setRemarks] = useState(item.remarks || "");
  const [agreed, setAgreed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // State to manage loading animation
  const [formOpenTime, setFormOpenTime] = useState(null);
  const [hideDateInput, setHideDateInput] = useState(false);
  const [inspectionData, setInspectionData] = useState([]);
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    // Lock the screen orientation to portrait
    console.log("Item Data", item);
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      );
    };
    lockOrientation();
    fetchUserData();
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

  const fetchUserData = async () => {
    try {
      const email = await AsyncStorage.getItem("user");
      const response1 = await sqlApi.get(`/getUser?email=${email}`);

      if (response1.status !== 200) {
        throw new Error("Request failed");
      }

      const data = response1.data;
      setUsername(data.username);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchAreaData();
    // fetchInspectionData(); // Fetch inspection data from mastercilt API
    fetchInspectionData(packageType); // Pass the updated packageType to fetchInspectionData
    setFormOpenTime(moment().tz("Asia/Jakarta").format()); // Record the time the form is opened
  }, [packageType, machine]);

  useEffect(() => {
    updateProcessOrder();
  }, [plant, line, product, packageType, date, shift, machine]);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === "ios"); // Close the picker on iOS immediately
    setDate(currentDate);
    setShift(
      getShiftByHour(moment(currentDate).tz("Asia/Jakarta").format("HH"))
    );
    updateProcessOrder(); // Update process order based on the new date
  };

  const fetchAreaData = async () => {
    try {
      const response = await sqlApi.get("/getgreenTAGarea");
      setAreas(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchInspectionData = async (selectedPackageType) => {
    setIsLoading(true); // Start loading animation
    setInspectionData([]); // Reset inspection data before fetching new data

    try {
      // Parse the inspection data (string to object)
      const inspectionData = JSON.parse(item.inspectionData);

      setInspectionData(inspectionData); // Set the new inspection data
      //   console.log("Updated inspectionData:", inspectionData); // Debugging log
    } catch (error) {
      console.error("Error fetching inspection data:", error);
    } finally {
      setIsLoading(false); // Stop loading animation
    }
  };

  const updateProcessOrder = () => {
    const formattedPlant = plant.replace(/\s+/g, "-");
    const formattedLine = line.replace(/\s+/g, "-");
    const formattedProduct = product.replace(/\s+/g, "-");
    const formattedDate = moment(date).tz("Asia/Jakarta").format("YYYY-MM-DD");
    const formattedTime = moment(date).tz("Asia/Jakarta").format("HH-mm-ss");
    const formattedShift = shift.replace(/\s+/g, "-");
    const formattedMachine = machine.replace(/\s+/g, "-");

    // setProcessOrder(
    //   `#${formattedPlant}_${formattedLine}_${formattedProduct}_${formattedDate}_${formattedTime}_${formattedShift}_${formattedMachine}`
    // );

    setProcessOrder(
      `#${formattedPlant}_${formattedLine}_${formattedDate}_${formattedShift}_${formattedMachine}`
    );
  };

  const toggleSwitch = (index) => {
    let data = [...inspectionData];
    data[index].done = !data[index].done;
    setInspectionData(data);
  };

  const handleImageSelected = (uri, index) => {
    let data = [...inspectionData];
    data[index].picture = uri; // Update picture field with uploaded image URI or local URI
    setInspectionData(data);
  };

  const handleInputChangeOLD = (text, index) => {
    let data = [...inspectionData];
    data[index].results = text;
    setInspectionData(data);
  };

  const handleInputChange = (text, index) => {
    let data = [...inspectionData];

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    data[index].results = text; // Perbarui nilai results
    data[index].time = formattedTime; // Perbarui nilai time
    data[index].user = username; // Perbarui nilai user
    data[index].done = !!text; // Jika ada teks yang dimasukkan, atur done menjadi true
    setInspectionData(data); // Perbarui state inspectionData
  };

  const handleInputChangeGIGR = (text, index, field) => {
    const newData = [...inspectionData];

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    newData[index][field] = text;
    newData[index].time = formattedTime; // Perbarui nilai time
    newData[index].user = username; // Perbarui nilai user
    setInspectionData(newData);
  };

  // Submit form and handle image upload
  const handleSubmit = async (id, status) => {
    const submitTime = moment().tz("Asia/Jakarta").format(); // Rekam waktu submit dalam zona waktu Jakarta

    let order = {}; // Objek untuk menyimpan data order

    try {
      // Unggah gambar dan dapatkan URL server
      const updatedInspectionData = await Promise.all(
        inspectionData.map(async (item, index) => {
          let updatedItem = {
            ...item,
            id: index + 1, // Tambahkan ID sesuai index
          };

          if (item.picture && item.picture.startsWith("file://")) {
            // Hanya unggah jika gambar berupa file lokal
            const serverImageUrl = await uploadImageToServer(item.picture);
            updatedItem.picture = serverImageUrl; // Ganti URI lokal dengan URL server
          }

          return updatedItem;
        })
      );

      // Siapkan objek order
      order = {
        processOrder,
        packageType,
        plant,
        line,
        date: hideDateInput
          ? undefined
          : moment(date).tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss.SSS"),
        shift,
        product,
        machine,
        batch,
        remarks,
        inspectionData: updatedInspectionData, // Data dengan ID berdasarkan index
        status: status, // 1 untuk draft, 2 untuk submitted
        formOpenTime: moment(formOpenTime)
          .tz("Asia/Jakarta")
          .format("YYYY-MM-DD HH:mm:ss.SSS"),
        submitTime: moment(submitTime)
          .tz("Asia/Jakarta")
          .format("YYYY-MM-DD HH:mm:ss.SSS"),
      };

      console.log("Simpan data order:", order);

      // Kirim data ke server
      const response = await api.put(`/cilt/${id}`, order);

      if (response.status === 200) {
        Alert.alert("Success", "Data submitted successfully!");
        await clearOfflineData(); // Hapus data offline setelah berhasil submit
        setTimeout(() => {
          navigation.navigate("HomeCILT");
        }, 500);
      }
    } catch (error) {
      console.error("Submit failed, saving offline data:", error);
      await saveOfflineData(order); // Simpan data secara offline jika submit gagal
      Alert.alert(
        "Offline",
        "No network connection. Data has been saved locally and will be submitted when you are back online."
      );
    }
  };

  // Save offline data when API submission fails
  const saveOfflineData = async (order) => {
    try {
      //   console.log("Saving offline data:", order);
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
        <Text style={styles.title}>New Inspection Schedule</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Process Order *</Text>
          <View style={styles.dropdownContainer}>
            <MaterialCommunityIcons
              name="identifier"
              size={20}
              color={COLORS.lightBlue}
            />
            <TextInput
              style={styles.input}
              value={processOrder}
              editable={false}
            />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.blue} />
        ) : (
          <>
            <View style={styles.row}>
              {/* Select Date and Select Time */}
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Date *</Text>
                <View style={styles.dropdownContainer}>
                  <ReusableDatetime2
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
                <Text style={styles.label}>Plant *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="factory"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Text style={styles.dropdown}>{plant}</Text>
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
                  <Text style={styles.dropdown}>{line}</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Machine *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="robot-industrial"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Text style={styles.dropdown}>{machine}</Text>
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Product *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="cup-water"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Text style={styles.dropdown}>{product}</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Package *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Text style={styles.dropdown}>{packageType}</Text>
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Batch *</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name="numeric"
                    size={20}
                    color={COLORS.lightBlue}
                  />
                  <TextInput
                    style={styles.input}
                    value={batch}
                    onChangeText={(text) => setBatch(text)}
                    placeholder="Isi batch (contoh: 2)"
                  />
                </View>
              </View>
            </View>

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
              {machine === "Robot Palletizer" && packageType === "GI/GR" ? (
                <View style={styles.table}>
                  {/* Table Head */}
                  <View style={styles.tableHead}>
                    <Text style={[styles.tableCaption, { width: "10%" }]}>
                      NO
                    </Text>
                    <Text style={[styles.tableCaption, { width: "10%" }]}>
                      NO PALET
                    </Text>
                    <Text style={[styles.tableCaption, { width: "30%" }]}>
                      NO CARTON {"\n"}(1-64)
                    </Text>
                    <Text style={[styles.tableCaption, { width: "20%" }]}>
                      JUMLAH CARTON
                    </Text>
                    <Text style={[styles.tableCaption, { width: "30%" }]}>
                      WAKTU {"\n"}(07:00-07:10)
                    </Text>
                  </View>

                  {/* Table Body */}
                  <FlatList
                    data={inspectionData}
                    keyExtractor={(_, index) => index.toString()}
                    nestedScrollEnabled={true}
                    renderItem={({ item, index }) => (
                      <View key={index} style={styles.tableBody}>
                        <View style={{ width: "10%" }}>
                          <View
                            style={[styles.tableData, styles.centeredContent]}
                          >
                            <Text>{item.id}</Text>
                          </View>
                        </View>

                        <View style={{ width: "10%" }}>
                          <View
                            style={[styles.tableData, styles.centeredContent]}
                          >
                            <TextInput
                              placeholder="Isi disini"
                              style={styles.tableData}
                              value={item.noPalet}
                              onChangeText={(text) =>
                                handleInputChangeGIGR(text, index, "noPalet")
                              }
                            />
                          </View>
                        </View>

                        <View style={{ width: "30%" }}>
                          <View
                            style={[styles.tableData, styles.centeredContent]}
                          >
                            <TextInput
                              placeholder="Isi disini"
                              style={styles.tableData}
                              value={item.noCarton}
                              onChangeText={(text) =>
                                handleInputChangeGIGR(text, index, "noCarton")
                              }
                            />
                          </View>
                        </View>

                        <View style={{ width: "20%" }}>
                          <View
                            style={[styles.tableData, styles.centeredContent]}
                          >
                            <TextInput
                              placeholder="Isi disini"
                              keyboardType="numeric"
                              style={styles.tableData}
                              value={item.jumlahCarton}
                              onChangeText={(text) =>
                                handleInputChangeGIGR(
                                  text,
                                  index,
                                  "jumlahCarton"
                                )
                              }
                            />
                          </View>
                        </View>

                        <View style={{ width: "30%" }}>
                          <View
                            style={[styles.tableData, styles.centeredContent]}
                          >
                            <TextInput
                              placeholder="Isi disini"
                              style={styles.tableData}
                              value={item.waktu}
                              onChangeText={(text) =>
                                handleInputChangeGIGR(text, index, "waktu")
                              }
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  />
                </View>
              ) : (
                <>
                  {/* Table Container */}
                  <View style={styles.table}>
                    {/* Table Head */}
                    <View style={styles.tableHead}>
                      {/* Header Caption */}
                      {/* <View style={{ width: "10%" }}>
                        <Text style={styles.tableCaption}>Done</Text>
                      </View> */}
                      <View style={{ width: "20%" }}>
                        <Text style={styles.tableCaption}>Activity</Text>
                      </View>
                      <View style={{ width: "7%" }}>
                        <Text style={styles.tableCaption}>G</Text>
                      </View>
                      <View style={{ width: "7%" }}>
                        <Text style={styles.tableCaption}>N</Text>
                      </View>
                      <View style={{ width: "7%" }}>
                        <Text style={styles.tableCaption}>R</Text>
                      </View>
                      <View style={{ width: "20%" }}>
                        <Text style={styles.tableCaption}>Periode</Text>
                      </View>
                      <View style={{ width: "20%" }}>
                        <Text style={styles.tableCaption}>Hasil</Text>
                      </View>
                      <View style={{ width: "20%" }}>
                        <Text style={styles.tableCaption}>Picture</Text>
                      </View>
                    </View>

                    {/* Table Body */}
                    {inspectionData.map((item, index) => (
                      <View key={index} style={styles.tableBody}>
                        {/* Header Caption */}
                        {/* <View style={{ width: "10%" }}>
                          <View
                            style={[styles.tableData, styles.centeredContent]}
                          >
                            <Switch
                              style={styles.tableData}
                              value={item.done}
                              onValueChange={() => toggleSwitch(index)}
                            />
                          </View>
                        </View> */}
                        <View style={{ width: "20%" }}>
                          <Text style={styles.tableData}>{item.activity}</Text>
                        </View>
                        <View style={{ width: "7%" }}>
                          <Text style={styles.tableData}>
                            {item.good ?? "-"}
                          </Text>
                        </View>
                        <View style={{ width: "7%" }}>
                          <Text style={styles.tableData}>
                            {item.need ?? "-"}
                          </Text>
                        </View>
                        <View style={{ width: "7%" }}>
                          <Text style={styles.tableData}>
                            {item.red ?? "-"}
                          </Text>
                        </View>
                        <View style={{ width: "20%" }}>
                          <Text style={styles.tableData}>{item.periode}</Text>
                        </View>
                        <View style={{ width: "20%" }}>
                          <View
                            style={[styles.tableData, styles.centeredContent]}
                          >
                            {item.status === "1" ? (
                              <TextInput
                                placeholder="isi disini"
                                style={styles.tableData}
                                value={item.results}
                                onChangeText={(text) =>
                                  handleInputChange(text, index)
                                }
                              />
                            ) : (
                              <Picker
                                selectedValue={item.results}
                                onValueChange={(value) =>
                                  handleInputChange(value, index)
                                }
                                style={styles.picker}
                              >
                                <Picker.Item label="Select" value="" />
                                <Picker.Item label="OK" value="OK" />
                                <Picker.Item label="NOT OK" value="NOT OK" />
                              </Picker>
                            )}
                          </View>
                        </View>
                        <View style={{ width: "20%" }}>
                          {/* <Text style={styles.tableData}>Picture</Text> */}

                          {item.picture !== null ? (
                            <View
                              style={[styles.tableData, styles.centeredContent]}
                            >
                              <ReusableOfflineUploadImage
                                onImageSelected={(uri) =>
                                  handleImageSelected(uri, index)
                                }
                                uploadImage={uploadImageToServer} // Pass upload function here
                              />
                            </View>
                          ) : (
                            <Text style={styles.tableData}>N/A</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
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

        {machine === "Robot Palletizer" && packageType === "GI/GR" ? (
          <>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !agreed && styles.submitButtonDisabled,
                ]}
                onPress={() => handleSubmit(item.id, 1)}
                disabled={!agreed}
              >
                <Text style={styles.submitButtonText}>SAVE AS DRAFT</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View></View>
          </>
        )}

        <View>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !agreed && styles.submitButtonDisabled,
            ]}
            onPress={() => handleSubmit(item.id, 0)}
            disabled={!agreed}
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
    marginLeft: 16,
    fontSize: 16,
  },
  // tableCSS
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
    textAlign: "center", // Center-align text in cells
  },
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
  },

  // tableCSS end

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

export default EditCILTinspection;
