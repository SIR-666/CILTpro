import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Searchbar } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import moment from "moment";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS } from "../../constants/theme";
import { api } from "../../utils/axiosInstance";

const ReportCIP = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dataCIP, setDataCIP] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("Milk Filling Packing");
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedCipType, setSelectedCipType] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedPosisi, setSelectedPosisi] = useState(null);
  const [posisiOptions, setPosisiOptions] = useState([]);

  useEffect(() => {
    fetchDataFromAPI();
    fetchCIPTypes();
    fetchStatusList();
    fetchPosisiOptions();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchDataFromAPI();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Fetch data when filters change
    fetchDataFromAPI();
  }, [selectedDate, selectedPlant, selectedLine, searchQuery, selectedCipType, selectedStatus, selectedPosisi]);

  const fetchDataFromAPI = async () => {
    setIsLoading(true);
    try {
      // Build query parameters
      const params = {};
      if (selectedDate) {
        params.date = moment(selectedDate).format("YYYY-MM-DD");
      }
      if (selectedPlant) {
        params.plant = selectedPlant;
      }
      if (selectedLine) {
        params.line = selectedLine;
      }
      if (searchQuery) {
        params.processOrder = searchQuery;
      }
      if (selectedCipType) {
        params.cipType = selectedCipType;
      }
      if (selectedStatus) {
        params.status = selectedStatus;
      }
      if (selectedPosisi) {
        params.posisi = selectedPosisi;
      }

      const response = await api.get(`/cip-report`, { params });
      setDataCIP(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching CIP data:", error);
      setIsLoading(false);
    }
  };

  const fetchCIPTypes = async () => {
    try {
      // For now, only CIP KITCHEN is available
      const cipTypes = [{ id: 1, name: "CIP KITCHEN" }];
      // If backend provides this endpoint:
      // const response = await api.get(`/cip-report/types/list`);
      // setCipTypes(response.data);
    } catch (error) {
      console.error("Error fetching CIP types:", error);
    }
  };

  const fetchStatusList = async () => {
    try {
      const response = await api.get(`/cip-report/status/list`);
      setStatusList(response.data);
    } catch (error) {
      console.error("Error fetching status list:", error);
    }
  };

  const fetchPosisiOptions = async () => {
    try {
      // Set default posisi options
      setPosisiOptions([
        { id: 1, name: "Final", value: "Final" },
        { id: 2, name: "Intermediate", value: "Intermediate" }
      ]);
      // If backend provides this endpoint:
      // const response = await api.get(`/cip-report/posisi/list`);
      // setPosisiOptions(response.data);
    } catch (error) {
      console.error("Error fetching posisi options:", error);
    }
  };

  const handleDetailPress = (item) => {
    // Navigate ke detail CIP report
    navigation.navigate("DetailReportCIP", { cipReportId: item.id });
  };

  const handleCreateCIP = () => {
    // Navigate ke form create CIP
    navigation.navigate("CreateCIP");
  };

  const getStatusColor = (status) => {
    const statusItem = statusList.find(s => s.name === status);
    return statusItem ? statusItem.color : COLORS.darkGray;
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Date</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Process Order</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Plant</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Line</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Posisi</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Status</Text>
      </View>
    </View>
  );

  const renderItem = (item) => (
    <TouchableOpacity key={item.id} onPress={() => handleDetailPress(item)}>
      <View style={styles.tableRow}>
        <Text style={styles.tableCell}>
          {moment(item.date).format("DD/MM/YY")}
        </Text>
        <Text style={styles.tableCell}>{item.processOrder}</Text>
        <Text style={styles.tableCell}>{item.plant}</Text>
        <Text style={styles.tableCell}>{item.line}</Text>
        <Text style={styles.tableCell}>{item.posisi || '-'}</Text>
        <Text style={[styles.tableCell, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const clearFilters = () => {
    setSelectedDate(null);
    setSelectedPlant("Milk Filling Packing");
    setSelectedLine(null);
    setSearchQuery("");
    setSelectedCipType(null);
    setSelectedStatus(null);
    setSelectedPosisi(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading CIP Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Report CIP</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateCIP}>
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <Searchbar
        placeholder="Search by Process Order"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dropdownContainer}
            >
              <Text style={styles.filterText}>
                {selectedDate
                  ? moment(selectedDate).format("DD/MM/YYYY")
                  : "Select Date"}
              </Text>
              <Icon name="date-range" size={20} color={COLORS.blue} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.filterItem}>
            <View style={[styles.dropdownContainer, { backgroundColor: '#f0f0f0' }]}>
              <Text style={styles.filterText}>Milk Filling Packing</Text>
              <Icon name="lock" size={20} color={COLORS.gray} />
            </View>
          </View>

          <View style={styles.filterItem}>
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={selectedLine}
                style={styles.dropdown}
                onValueChange={(itemValue) => setSelectedLine(itemValue)}
              >
                <Picker.Item label="All Lines" value={null} />
                <Picker.Item label="LINE A" value="LINE A" />
                <Picker.Item label="LINE B" value="LINE B" />
                <Picker.Item label="LINE C" value="LINE C" />
                <Picker.Item label="LINE D" value="LINE D" />
              </Picker>
            </View>
          </View>

          <View style={styles.filterItem}>
            <View style={[styles.dropdownContainer, { backgroundColor: '#f0f0f0' }]}>
              <Text style={styles.filterText}>CIP KITCHEN</Text>
              <Icon name="lock" size={20} color={COLORS.gray} />
            </View>
          </View>

          <View style={styles.filterItem}>
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={selectedPosisi}
                style={styles.dropdown}
                onValueChange={(itemValue) => setSelectedPosisi(itemValue)}
              >
                <Picker.Item label="All Posisi" value={null} />
                {posisiOptions.map((posisi) => (
                  <Picker.Item
                    key={posisi.id}
                    label={posisi.name}
                    value={posisi.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.filterItem}>
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={selectedStatus}
                style={styles.dropdown}
                onValueChange={(itemValue) => setSelectedStatus(itemValue)}
              >
                <Picker.Item label="All Status" value={null} />
                {statusList.map((status) => (
                  <Picker.Item
                    key={status.id}
                    label={status.name}
                    value={status.name}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ScrollView style={styles.content}>
        <TableHeader />
        {dataCIP.map(renderItem)}
        
        {dataCIP.length === 0 && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No CIP reports found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.blue,
  },
  addButton: {
    backgroundColor: COLORS.green,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filterContainer: {
    maxHeight: 60,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    alignItems: "center",
  },
  filterItem: {
    marginRight: 12,
    minWidth: 150,
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    height: 40,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  dropdown: {
    flex: 1,
  },
  clearButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.lightBlue,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.blue,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.blue,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.darkGray,
  },
});

export default ReportCIP;
