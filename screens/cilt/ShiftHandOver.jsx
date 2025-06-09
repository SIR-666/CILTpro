import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Checkbox } from "react-native-paper";
import {
  ReusableDropdown,
  ReusablePhotoImage,
  ReusableUploadImage,
} from "../../components";
import { COLORS } from "../../constants/theme";
import { sqlApi } from "../../utils/axiosInstance";

const ShiftHandOver = ({ navigation }) => {
  const [name, setName] = useState("");
  const [emailuser, setEmailuser] = useState("");
  const [position, setPosition] = useState("");
  const [shift, setShift] = useState("");
  const [line, setLine] = useState("");
  const [group, setGroup] = useState("");
  const [problems, setProblems] = useState("");
  const [actions, setActions] = useState("");
  const [remarks, setRemarks] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // Date format in YYYY-MM-DD
  const [checked, setChecked] = useState(false);
  const [photo, setPhoto] = useState("");
  const [photo2, setPhoto2] = useState([]);
  const [photoFields, setPhotoFields] = useState([0]);
  const [draftExists, setDraftExists] = useState(false);

  const [plant, setPlant] = useState("");
  const [machine, setMachine] = useState("");
  const [areas, setAreas] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);

  const fetchAreaData = async () => {
    try {
      const response = await sqlApi.get("getgreenTAGarea");
      setAreas(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const filterOptions = () => {
    const filteredLines = areas
      .filter((area) => area.observedArea === plant)
      .map((area) => area.line)
      .filter((value, index, self) => self.indexOf(value) === index);

    setLineOptions(filteredLines);

    const filteredMachines = areas
      .filter((area) => area.observedArea === plant && area.line === line)
      .map((area) => area.subGroup)
      .filter((value, index, self) => self.indexOf(value) === index);

    setMachineOptions(filteredMachines);
  };

  useEffect(() => {
    fetchAreaData();
  }, []);

  useEffect(() => {
    filterOptions();
  }, [plant, line]);

  const fetchUserData = async () => {
    try {
      const email = await AsyncStorage.getItem("user");
      const response1 = await sqlApi.get(`/getUser?email=${email}`);
      const data = await response1.data;

      setName(data.username);
      setPosition(data.level);
      setEmailuser(data.email);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
    checkDraftStatus();
  }, []);

  const checkDraftStatus = async () => {
    try {
      const response = await sqlApi.get(`/checkDraft?status=2`);
      if (response.data && response.data.length > 0) {
        // setDraftExists(true);
        Alert.alert(
          "Achtung!",
          "Ada " + response.data.length + " record Draft, segera selesaikan."
        );
      }
    } catch (error) {
      console.error("Error checking draft status:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.replace("Bottom");
        return true;
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [navigation])
  );

  const handleAddPhotoField = () => {
    setPhotoFields([...photoFields, photoFields.length]);
  };

  const handleRemovePhotoField = (index) => {
    const newPhotoFields = photoFields.filter((_, i) => i !== index);
    const newPhoto2 = photo2.filter((_, i) => i !== index);
    setPhotoFields(newPhotoFields);
    setPhoto2(newPhoto2);
  };

  const handlePhotoChange = (index, path) => {
    const newPhoto2 = [...photo2];
    newPhoto2[index] = path;
    setPhoto2(newPhoto2);
  };

  const handleSubmit = async () => {
    const urlApi = process.env.URL;

    if (
      !name ||
      !date ||
      !position ||
      !line ||
      !plant ||
      !machine ||
      !shift ||
      !group ||
      !problems ||
      !actions ||
      !remarks ||
      !photo ||
      photo2.length === 0
    ) {
      Alert.alert("Error", "Pastikan semua diisi dengan lengkap");
      return;
    }

    if (!checked) {
      Alert.alert("Error", "Pastikan semua data diisi dengan benar.");
      return;
    }

    try {
      const response = await sqlApi.post("/sho", {
        nama: name,
        date: date,
        jabatan: position,
        line: line,
        shift: shift,
        plant: plant,
        machine: machine,
        group: group,
        problems: problems,
        action: actions,
        remarks1: remarks,
        userEmail: emailuser,
        image: photo,
        image2: photo2.join(","),
        status: 0, // Status untuk submit adalah 0
      });

      if (response.status === 201) {
        Alert.alert("Success", "Data submitted successfully!");
        navigation.replace("ListShiftHandOver");
      } else {
        Alert.alert("Error", "Failed to submit data.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while submitting data.");
    }
  };

  const handleSaveAsDraft = async () => {
    if (draftExists) {
      Alert.alert("Error", "Draft sudah ada, tidak bisa menyimpan draft baru.");
      return;
    }

    try {
      const response = await sqlApi.post("/sho", {
        nama: name,
        date: date,
        jabatan: position,
        line: line,
        shift: shift,
        plant: plant,
        machine: machine,
        group: group,
        problems: problems,
        action: actions,
        remarks1: remarks,
        userEmail: emailuser,
        image: photo,
        image2: photo2.join(","),
        status: 2, // Status untuk draft adalah 2
      });

      if (response.status === 201) {
        Alert.alert("Success", "Draft saved successfully!");
        setDraftExists(true);
        navigation.replace("ListShiftHandOver");
      } else {
        Alert.alert("Error", "Failed to save draft.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while saving draft.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Shift Hand Over</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nama</Text>
        <TextInput style={styles.input} value={name} editable={false} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} editable={false} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Posisi / Jabatan</Text>
        <ReusableDropdown
          selectedValue={position}
          style={styles.input}
          onValueChange={(itemValue, itemIndex) => setPosition(itemValue)}
          itemOptions={[
            "Operator",
            "Teknisi",
            "Operasional Support",
            "Koordinator",
          ]}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Plant</Text>
        <ReusableDropdown
          selectedValue={plant}
          style={styles.input}
          onValueChange={(itemValue) => setPlant(itemValue)}
          itemOptions={[...new Set(areas.map((area) => area.observedArea))]}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Line</Text>
        <ReusableDropdown
          selectedValue={line}
          style={styles.input}
          onValueChange={(itemValue) => setLine(itemValue)}
          itemOptions={lineOptions}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Machine</Text>
        <ReusableDropdown
          selectedValue={machine}
          style={styles.input}
          onValueChange={(itemValue) => setMachine(itemValue)}
          itemOptions={machineOptions}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Shift</Text>
        <ReusableDropdown
          selectedValue={shift}
          style={styles.input}
          onValueChange={(itemValue, itemIndex) => setShift(itemValue)}
          itemOptions={[
            "Shift 1",
            "Shift 2",
            "Shift 3",
            "Long shift Pagi",
            "Long shift Malam",
            "Start shift",
            "End shift",
          ]}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Group</Text>
        <ReusableDropdown
          selectedValue={group}
          style={styles.input}
          onValueChange={(itemValue, itemIndex) => setGroup(itemValue)}
          itemOptions={["Bromo", "Semeru", "Krakatau"]}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Problems</Text>
        <TextInput
          style={styles.textArea}
          value={problems}
          onChangeText={setProblems}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Action</Text>
        <TextInput
          style={styles.textArea}
          value={actions}
          onChangeText={setActions}
          multiline
          numberOfLines={4}
        />
      </View>

      {photoFields.map((field, index) => (
        <View key={index} style={styles.wrapper}>
          <Text style={styles.label}>Foto {index + 1}</Text>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              borderColor: COLORS.lightBlue,
              backgroundColor: COLORS.lightWhite,
              borderWidth: 1,
              height: 450,
              borderRadius: 12,
              flexDirection: "column",
              paddingHorizontal: 3,
            }}
          >
            <ReusableUploadImage
              onImagePathChange={(path) => handlePhotoChange(index, path)}
              title={photo2[index] ? "GANTI FOTO" : "UNGGAH FOTO"}
              color={COLORS.green}
              initialImage={photo2[index]}
            />
            {index > 0 && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePhotoField(index)}
              >
                <Ionicons name="remove-circle-outline" size={24} color="red" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={handleAddPhotoField}>
        <Ionicons name="add-circle-outline" size={24} color="green" />
        <Text style={styles.addButtonText}>Tambah Foto</Text>
      </TouchableOpacity>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Remarks</Text>
        <TextInput
          style={styles.textArea}
          value={remarks}
          onChangeText={setRemarks}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.wrapper}>
        <Text style={styles.label}>Foto Serah Terima</Text>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            borderColor: COLORS.lightBlue,
            backgroundColor: COLORS.lightWhite,
            borderWidth: 1,
            height: 450,
            borderRadius: 12,
            flexDirection: "column",
            paddingHorizontal: 3,
          }}
        >
          <ReusablePhotoImage
            onImagePathChange={(path) => setPhoto(path)}
            title={photo ? "GANTI FOTO" : "UNGGAH FOTO"}
            color={COLORS.green}
            initialImage={photo}
          />
        </View>
      </View>

      <View style={styles.checkboxContainer}>
        <Checkbox
          status={checked ? "checked" : "unchecked"}
          onPress={() => {
            setChecked(!checked);
          }}
        />
        <Text style={styles.checkboxLabel}>
          Saya menyatakan telah memasukkan data dengan benar.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.draftButton, !checked && styles.buttonDisabled]}
          onPress={handleSaveAsDraft}
          // disabled={draftExists || !checked}
          disabled={!checked}
        >
          <Text style={styles.draftButtonText}>SAVE AS DRAFT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, !checked && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!checked}
        >
          <Text style={styles.submitButtonText}>SUBMIT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    alignSelf: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    padding: 10,
    borderRadius: 5,
    height: 100,
    backgroundColor: "#ffffff",
  },
  wrapper: {
    marginBottom: 20,
  },
  addButton: {
    alignItems: "center",
    marginVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  addButtonText: {
    marginLeft: 10,
    color: "green",
    fontSize: 16,
  },
  removeButton: {
    marginLeft: 10,
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
    flexDirection: "row",
    justifyContent: "space-between",
  },
  submitButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  submitButtonDisabled: {
    backgroundColor: "#aaa",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  draftButton: {
    backgroundColor: "orange",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  draftButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#aaa",
  },
});

export default ShiftHandOver;
