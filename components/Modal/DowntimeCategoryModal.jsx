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
  const [selectedMesin, setSelectedMesin] = useState(null);
  const [search, setSearch] = useState("");

  const filteredCategories = data.filter((cat) =>
    cat.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {selectedMesin
                ? "Select Downtime"
                : selectedCategory
                ? "Select Machine"
                : "Select Downtime Category"}
            </Text>
            <TouchableOpacity onPress={onClose}>
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

          {selectedCategory && !selectedMesin && (
            <FlatList
              data={selectedCategory.mesin}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    setSelectedMesin(item);
                    setSearch("");
                  }}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          {selectedMesin && (
            <FlatList
              data={selectedMesin.downtime}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    onSelect(
                      selectedCategory.category,
                      selectedMesin.name,
                      item
                    );
                    setSelectedCategory(null);
                    setSelectedMesin(null);
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
            {selectedMesin && (
              <TouchableOpacity onPress={() => setSelectedMesin(null)}>
                <Text style={styles.back}>Back</Text>
              </TouchableOpacity>
            )}
            {selectedCategory && !selectedMesin && (
              <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                <Text style={styles.back}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose}>
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
