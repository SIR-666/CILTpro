import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
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

export default EditShiftHandOver = ({ route, navigation }) => {
  const [name, setName] = useState("");
  const [emailuser, setEmailuser] = useState("");
  const [position, setPosition] = useState("");
  const [shift, setShift] = useState("");
  const [line, setLine] = useState("");
  const [group, setGroup] = useState("");
  const [problems, setProblems] = useState("");
  const [actions, setActions] = useState("");
  const [remarks, setRemarks] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [checked, setChecked] = useState(false);
  const [photo, setPhoto] = useState("");
  const [photo2, setPhoto2] = useState([]);

  const { id } = route.params;

  useEffect(() => {
    fetchUserData();
    fetchData();
  }, []);

  const fetchUserData = async () => {
    try {
      const email = await AsyncStorage.getItem("user");
      const response1 = await sqlApi.get(`/getUser?email=${email}`);

      if (response1.status !== 200) {
        throw new Error("Request failed");
      }

      const data = response1.data;
      setUsername(data.username);
      setName(data.username);
      setPosition(data.level);
      setEmailuser(data.email);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchData = async () => {
    try {
      const response = await sqlApi.get(`/sho/${id}`);
      const data = response.data[0];
      setName(data.nama);
      setDate(data.date);
      setPosition(data.jabatan);
      setLine(data.line);
      setShift(data.shift);
      setGroup(data.group);
      setProblems(data.problems);
      setActions(data.action);
      setRemarks(data.remarks1);
      setPhoto(data.image);
      setPhoto2(data.image2.split(","));
      setChecked(true);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleAddPhotoField = () => {
    setPhoto2([...photo2, ""]);
  };

  const handleRemovePhotoField = (index) => {
    const newPhoto2 = photo2.filter((_, i) => i !== index);
    setPhoto2(newPhoto2);
  };

  const handlePhotoChange = (index, path) => {
    const newPhoto2 = [...photo2];
    newPhoto2[index] = path;
    setPhoto2(newPhoto2);
  };

  const handleSubmit = async () => {
    if (
      !name ||
      !date ||
      !position ||
      !line ||
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
      const response = await sqlApi.put(`/sho/${id}`, {
        nama: name,
        date: date,
        jabatan: position,
        line: line,
        shift: shift,
        group: group,
        problems: problems,
        action: actions,
        remarks1: remarks,
        userEmail: emailuser,
        image: photo,
        image2: photo2.join(","),
      });

      if (response.status === 200) {
        Alert.alert("Submitted Success", "Data updated successfully!");
        navigation.replace("ListShiftHandOver");
      } else {
        Alert.alert("Error", "Failed to update data.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while updating data.");
    }
  };

  const handleSaveAsDraft = async () => {
    const urlApi = process.env.URL;

    try {
      const checkDraftResponse = await sqlApi.get(`/checkDraft`);
      if (checkDraftResponse.data.length > 0) {
        Alert.alert("Error", "Draft already exists.");
        return;
      }

      const response = await sqlApi.put(`/sho/${id}`, {
        nama: name,
        date: date,
        jabatan: position,
        line: line,
        shift: shift,
        group: group,
        problems: problems,
        action: actions,
        remarks1: remarks,
        userEmail: emailuser,
        image: photo,
        image2: photo2.join(","),
        status: 2,
      });

      if (response.status === 200) {
        Alert.alert("Draft Success", "Draft saved successfully!");
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
      <Text style={styles.title}>Edit Shift Hand Over</Text>

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
        <Text style={styles.label}>Line</Text>
        <ReusableDropdown
          selectedValue={line}
          style={styles.input}
          onValueChange={(itemValue, itemIndex) => setLine(itemValue)}
          itemOptions={[
            "Line A",
            "Line B",
            "Line C",
            "Line D",
            "Line E",
            "Line F",
            "Line G",
            "General",
          ]}
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

      {photo2.map((photo, index) => (
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
              title={photo ? "GANTI FOTO" : "UNGGAH FOTO"}
              color={COLORS.green}
              initialImage={photo}
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
          style={[
            styles.saveDraftButton,
            !checked && styles.submitButtonDisabled,
          ]}
          onPress={handleSaveAsDraft}
          disabled={!checked}
        >
          <Text style={styles.saveDraftButtonText}>SAVE AS DRAFT</Text>
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
  saveDraftButton: {
    backgroundColor: "#FFA500",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  saveDraftButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    flex: 1,
  },
  submitButtonDisabled: {
    backgroundColor: "#aaa",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  image: {
    width: "95%",
    height: 300,
    margin: 1,
    resizeMode: "cover",
  },
});
