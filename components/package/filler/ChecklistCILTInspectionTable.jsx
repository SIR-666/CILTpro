import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { api } from "../../../utils/axiosInstance";
import ReusableOfflineUploadImage from "../../Reusable/ReusableOfflineUploadImage";

const ChecklistCILTInspectionTable = ({
  username,
  onDataChange,
  initialData = [],
  plant,
  line,
  machine,
  type,
}) => {
  const [inspectionData, setInspectionData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const uploadImageToServer = async (uri) => {
    const formData = new FormData();

    formData.append("images", {
      uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
      type: "image/jpeg",
      name: uri.split("/").pop(),
    });

    try {
      const response = await uploadImageApi.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status !== 200 && response.status !== 201) {
        console.error(
          "Failed to upload image",
          response.status,
          response.statusText
        );
        throw new Error(`Failed to upload image: ${response.statusText}`);
      }

      const serverImageUrl = response.data.uploadedFiles[0];
      return serverImageUrl;
    } catch (error) {
      console.error("Image upload failed:", error);
      throw new Error("Image upload failed");
    }
  };

  const handleImageSelected = (uri, index) => {
    let data = [...inspectionData];
    data[index].picture = uri; // Update picture field with uploaded image URI or local URI
    setInspectionData(data);
  };

  const fetchInspection = async (plant, line, machine, type) => {
    setIsLoading(true);
    setInspectionData([]);

    try {
      const response = await api.get(
        `/checklist-master?plant=${plant}&line=${line}&machine=${machine}&type=${type}`
      );

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid response format");
      }

      const formattedData = response.data.map((item) => ({
        job_type: item.job_type,
        componen: item.componen,
        standart: item.standart,
        results: item.results || "",
        picture: item.picture || "",
        done: !!item.results,
        user: item.user || "",
        time: item.time || "",
      }));

      setInspectionData(formattedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialData.length > 0) {
      setInspectionData(initialData);
      onDataChange(initialData);
    } else if (plant && line && machine && type) {
      fetchInspection(plant, line, machine, type);
    }
  }, [plant, line, machine, type, initialData]);

  const handleInputChange = (text, index) => {
    const updated = [...inspectionData];
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    updated[index].results = text;
    updated[index].user = username;
    updated[index].time = formattedTime;
    updated[index].done = !!text;

    setInspectionData(updated);
    onDataChange(updated);
  };

  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.tableCaption, { width: "20%" }]}>Job Type</Text>
        <Text style={[styles.tableCaption, { width: "20%" }]}>Component</Text>
        <Text style={[styles.tableCaption, { width: "30%" }]}>Standart</Text>
        <Text style={[styles.tableCaption, { width: "20%" }]}>Hasil</Text>
        <Text style={[styles.tableCaption, { width: "10%" }]}>Photo</Text>
      </View>

      {inspectionData.map((item, index) => (
        <View key={index} style={styles.tableBody}>
          <View style={{ width: "20%" }}>
            <Text style={styles.tableData}>{item.job_type}</Text>
          </View>
          <View style={{ width: "20%" }}>
            <Text style={styles.tableData}>{item.componen}</Text>
          </View>
          <View style={{ width: "30%" }}>
            <Text style={styles.tableData}>{item.standart}</Text>
          </View>
          <View style={{ width: "20%" }}>
            <View style={[styles.tableData, styles.centeredContent]}>
              <Picker
                selectedValue={item.results}
                onValueChange={(value) => handleInputChange(value, index)}
                style={styles.picker}
              >
                <Picker.Item label="Select" value="" />
                <Picker.Item label="OK" value="OK" />
                <Picker.Item label="NOT OK" value="NOT OK" />
              </Picker>
            </View>
          </View>
          <View style={{ width: "10%" }}>
            <View style={[styles.tableData, styles.centeredContent]}>
              <ReusableOfflineUploadImage
                onImageSelected={(uri) => handleImageSelected(uri, index)}
                uploadImage={uploadImageToServer} // Pass upload function here
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  table: {
    width: "100%",
    marginTop: 20,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
    padding: 10,
  },
  tableBody: {
    flexDirection: "row",
    padding: 10,
  },
  tableCaption: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableData: {
    fontSize: 14,
    textAlign: "center",
  },
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  picker: {
    width: "100%",
    height: 40,
  },
});

export default ChecklistCILTInspectionTable;
