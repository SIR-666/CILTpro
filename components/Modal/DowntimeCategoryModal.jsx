import { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DowntimeCategoryModal = ({ visible, onClose, onSelect, data }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState("");

  const filteredCategories = data.filter((cat) =>
    cat.category.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDowntimes = selectedCategory
    ? (selectedCategory.downtime || []).filter((item) =>
        String(item).toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const handleClose = () => {
    setSelectedCategory(null);
    setSearch("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {selectedCategory
                ? "Select Downtime"
                : "Select Downtime Category"}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.close}>X</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            value={search}
            onChangeText={setSearch}
          />

          {!selectedCategory && (
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.category}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    setSelectedCategory(item);
                    setSearch("");
                  }}
                >
                  <Text>{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          {selectedCategory && (
            <FlatList
              data={filteredDowntimes}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    onSelect(selectedCategory.category, item);
                    setSelectedCategory(null);
                    setSearch("");
                    onClose();
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <View style={styles.footer}>
            {selectedCategory && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(null);
                  setSearch("");
                }}
              >
                <Text style={styles.back}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  close: {
    fontWeight: "bold",
    fontSize: 18,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  item: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  back: {
    color: "#007bff",
  },
  cancel: {
    color: "red",
  },
});

export default DowntimeCategoryModal;
