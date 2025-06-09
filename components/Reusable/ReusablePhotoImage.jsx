import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { ReusableBtn } from "../../components";
import { COLORS, SIZES } from "../../constants/theme";
import { uploadImageApi } from "../../utils/axiosInstance";

const ReusablePhotoImage = ({
  onImagePathChange,
  title,
  color,
  initialImage,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(initialImage || "");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);

  let judul = title ? title : "Select Image";

  useEffect(() => {
    if (initialImage) {
      setSelectedImage(initialImage);
      setImage(initialImage);
      onImagePathChange(initialImage);
    }
  }, [initialImage]);

  const pickImageAndUpload = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("You've refused to allow this app to access your photos!");
      return;
    }

    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!pickerResult.canceled) {
      const newImageUri = pickerResult.assets[0].uri;
      await uploadImage(newImageUri);
    }
  };

  const takePhoto = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      alert("Permission to access camera was denied");
      return;
    }

    let cameraResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!cameraResult.canceled) {
      const newImageUri = cameraResult.assets[0].uri;
      await uploadImage(newImageUri);
    }
  };

  const uploadImage = async (uri) => {
    setLoading(true);
    const formData = new FormData();

    formData.append("images", {
      uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
      type: "image/jpeg",
      name: uri.split("/").pop(),
    });

    if (image) {
      try {
        const parts = image.split("/");
        const fileName = parts.pop();
        let response = await uploadImageApi.delete(
          `/uploads/${fileName}`,
          formData
        );
        let responseJson = await response.status;
        if (responseJson === 200) {
          console.log("image berhasil di hapus ", responseJson);
        } else {
          console.log("image gagal di hapus ", responseJson);
        }
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }

    try {
      let response = await uploadImageApi.post("/upload", formData);
      let responseJson = await response.json();
      let imageUrl = responseJson.uploadedFiles[0];

      setImage(imageUrl);
      onImagePathChange(imageUrl);
      setLoading(false);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Upload failed, please try again.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.green} />
      ) : (
        <>
          <ReusableBtn
            btnText={selectedImage ? "GANTI FOTO" : judul}
            onPress={() => setModalVisible(true)}
            width={SIZES.width - 250}
            backgroundColor={COLORS.green}
            borderColor={COLORS.green}
            borderWidth={0}
            textColor={COLORS.white}
          />
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(!modalVisible);
            }}
          >
            <TouchableWithoutFeedback
              onPress={() => setModalVisible(!modalVisible)}
            >
              <View style={styles.overlayStyle}>
                <View style={styles.centeredModalView}>
                  <View style={styles.modalView}>
                    {/* 
                    <ReusableBtn
                      btnText={"PILIH FOTO"}
                      onPress={() => {
                        pickImageAndUpload();
                        setModalVisible(false);
                      }}
                      width={"50%"}
                      backgroundColor={COLORS.green}
                      borderColor={COLORS.green}
                      borderWidth={0}
                      textColor={COLORS.white}
                      />
                      */}
                    <Text>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Text>
                    <ReusableBtn
                      btnText={"AMBIL FOTO"}
                      onPress={() => {
                        takePhoto();
                        setModalVisible(false);
                      }}
                      width={"50%"}
                      backgroundColor={COLORS.green}
                      borderColor={COLORS.green}
                      borderWidth={0}
                      textColor={COLORS.white}
                    />
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          <View style={styles.imageContainer}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : null}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredModalView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  btnView: {
    margin: 1,
    backgroundColor: "white",
    borderRadius: 1,
    padding: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: (color) => ({
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    backgroundColor: color,
    marginHorizontal: 10,
  }),
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  imageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 20,
  },
  image: {
    width: "95%",
    height: 300,
    margin: 5,
  },
  overlayStyle: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ReusablePhotoImage;
