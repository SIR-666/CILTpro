import { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";

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
    const data = [...inspectionData];
    data[index].picture = uri;
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

  const handleResultSelect = (value, index) => {
    const updated = [...inspectionData];
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    // toggle: jika klik ulang nilai yang sama → kosongkan
    const nextValue = updated[index].results === value ? "" : value;

    updated[index].results = nextValue;
    updated[index].user = nextValue ? username : "";
    updated[index].time = nextValue ? formattedTime : "";
    updated[index].done = !!nextValue;

    setInspectionData(updated);
    onDataChange(updated);
  };

  const renderResultButtons = (item, index) => {
    const isOK = item.results === "OK";
    const isNG = item.results === "NOT OK";

    return (
      <View
        style={[
          styles.resultCell,
          isOK ? styles.bgOk : isNG ? styles.bgNotOk : styles.bgNeutral,
        ]}
      >
        <View style={styles.resultButtonsWrap}>
          <TouchableOpacity
            onPress={() => handleResultSelect("OK", index)}
            style={[styles.resultBtn, isOK && styles.resultBtnActiveOk]}
          >
            <Text style={[styles.resultBtnText, isOK && styles.resultBtnTextActive]}>
              OK
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleResultSelect("NOT OK", index)}
            style={[styles.resultBtn, isNG && styles.resultBtnActiveNotOk]}
          >
            <Text style={[styles.resultBtnText, isNG && styles.resultBtnTextActive]}>
              NOT OK
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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

          {/* Hasil: Buttons */}
          <View style={{ width: "20%" }}>
            {renderResultButtons(item, index)}
          </View>

          {/* Photo */}
          <View style={{ width: "10%" }}>
            <View style={[styles.tableData, styles.centeredContent]}>
              <ReusableOfflineUploadImage
                onImageSelected={(uri) => handleImageSelected(uri, index)}
                uploadImage={uploadImageToServer}
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
    paddingVertical: 10,
    paddingHorizontal: 6,
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

  /* ====== Hasil cell + buttons ====== */
  resultCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bgNeutral: {
    backgroundColor: "#f2f2f2",
  },
  bgOk: {
    backgroundColor: "#dff6e6", 
  },
  bgNotOk: {
    backgroundColor: "#fde3e3", 
  },
  resultButtonsWrap: {
    flexDirection: "row",
    gap: 8,
  },
  resultBtn: {
    borderWidth: 1,
    borderColor: "#cfcfcf",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 63,
    alignItems: "center",
  },
  resultBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  resultBtnActiveOk: {
    backgroundColor: "#2ecc71",
    borderColor: "#2ecc71",
  },
  resultBtnActiveNotOk: {
    backgroundColor: "#e74c3c",
    borderColor: "#e74c3c",
  },
  resultBtnTextActive: {
    color: "#fff",
  },
});

export default ChecklistCILTInspectionTable;
