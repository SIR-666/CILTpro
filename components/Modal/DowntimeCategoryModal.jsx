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

const DowntimeCategoryModal = ({
  visible,
  onClose,
  onSelect,
  data,
  hiddenCategories = [],
}) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDowntime, setSelectedDowntime] = useState("");
  const [search, setSearch] = useState("");

  const searchLower = search.toLowerCase();

  const hiddenCategorySet = new Set(
    (hiddenCategories || [])
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const filteredCategories = (data || []).filter((cat) => {
    const categoryLabel = String(cat?.category || "").trim();
    if (!categoryLabel) return false;
    if (hiddenCategorySet.has(categoryLabel.toLowerCase())) return false;
    return categoryLabel.toLowerCase().includes(searchLower);
  });

  const downtimeRows = selectedCategory
    ? (selectedCategory.downtime || [])
        .map((item) => {
          if (typeof item === "string") {
            return { downtime: item, details: "" };
          }
          return {
            downtime: String(item?.downtime || "").trim(),
            details: String(item?.details || "").trim(),
          };
        })
        .filter((item) => item.downtime)
    : [];

  const filteredDowntimes = Array.from(
    new Set(downtimeRows.map((item) => item.downtime))
  ).filter((item) => item.toLowerCase().includes(searchLower));

  const filteredDetails = selectedDowntime
    ? Array.from(
        new Set(
          downtimeRows
            .filter((item) => item.downtime === selectedDowntime && item.details)
            .map((item) => item.details)
        )
      ).filter((item) => item.toLowerCase().includes(searchLower))
    : [];

  const handleClose = () => {
    setSelectedCategory(null);
    setSelectedDowntime("");
    setSearch("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {!selectedCategory
                ? "Select Downtime Category"
                : !selectedDowntime
                ? "Select Downtime"
                : "Select Details"}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.close}>X</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder={selectedDowntime ? "Search details" : "Search"}
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
                    setSelectedDowntime("");
                    setSearch("");
                  }}
                >
                  <Text>{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          {selectedCategory && !selectedDowntime && (
            <FlatList
              data={filteredDowntimes}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    const hasDetails = downtimeRows.some(
                      (row) => row.downtime === item && row.details
                    );
                    if (hasDetails) {
                      setSelectedDowntime(item);
                      setSearch("");
                      return;
                    }
                    onSelect(selectedCategory.category, item, null);
                    handleClose();
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          {selectedCategory && selectedDowntime && (
            <FlatList
              data={filteredDetails}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    onSelect(selectedCategory.category, selectedDowntime, item);
                    handleClose();
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <View style={styles.footer}>
            {(selectedCategory || selectedDowntime) && (
              <TouchableOpacity
                onPress={() => {
                  if (selectedDowntime) {
                    setSelectedDowntime("");
                  } else {
                    setSelectedCategory(null);
                  }
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
