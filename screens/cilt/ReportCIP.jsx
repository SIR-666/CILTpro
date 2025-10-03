import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("Milk Filling Packing");
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedCipType, setSelectedCipType] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedPosisi, setSelectedPosisi] = useState(null);
  const [posisiOptions, setPosisiOptions] = useState([]);

  const fetchDataFromAPI = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
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
    } catch (error) {
      console.error("Error fetching CIP data:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [selectedDate, selectedPlant, selectedLine, searchQuery, selectedCipType, selectedStatus, selectedPosisi]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDataFromAPI(false);
    setIsRefreshing(false);
  }, [fetchDataFromAPI]);

  useEffect(() => {
    fetchCIPTypes();
    fetchStatusList();
    fetchPosisiOptions();
  }, []);

  useEffect(() => {
    // Initial load
    fetchDataFromAPI();
  }, [fetchDataFromAPI]);

  useEffect(() => {
    // Listen to focus events for refresh after navigation
    const unsubscribe = navigation.addListener("focus", () => {
      // Refresh data when coming back from create/edit/detail screens
      fetchDataFromAPI();
    });
    return unsubscribe;
  }, [navigation, fetchDataFromAPI]);

  const fetchCIPTypes = async () => {
    try {
      const response = await api.get("/cip-report/types/list");
      if (response.data && response.data.length > 0) {
        // Types are now available from API
      }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Complete':
        return 'check-circle';
      case 'In Progress':
        return 'hourglass-empty';
      case 'Under Review':
        return 'rate-review';
      case 'Approved':
        return 'verified';
      case 'Rejected':
        return 'error';
      case 'Cancelled':
        return 'cancel';
      default:
        return 'info';
    }
  };

  const isDraftStatus = (status) => {
    return status === 'In Progress';
  };

  const isSubmittedStatus = (status) => {
    return status === 'Complete' || status === 'Under Review' || status === 'Approved';
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
        <Text style={styles.tableHeaderText}>Line</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Posisi</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Status</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Action</Text>
      </View>
    </View>
  );

  const renderItem = (item) => {
    const isDraft = isDraftStatus(item.status);
    const isSubmitted = isSubmittedStatus(item.status);

    return (
      <View key={item.id} style={[
        styles.tableRow,
        isDraft && styles.draftRow,
        isSubmitted && styles.submittedRow
      ]}>
        <Text style={styles.tableCell}>
          {moment(item.date).format("DD/MM/YY")}
        </Text>
        <View style={styles.processOrderContainer}>
          <Text style={[styles.tableCell, styles.processOrderCell]} numberOfLines={2}>
            {item.processOrder || item.process_order}
          </Text>
          {isDraft && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>DRAFT</Text>
            </View>
          )}
        </View>
        <Text style={styles.tableCell}>{item.line}</Text>
        <Text style={styles.tableCell}>{item.posisi || '-'}</Text>
        <View style={styles.statusCell}>
          <Icon 
            name={getStatusIcon(item.status)} 
            size={16} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDetailPress(item)}
        >
          <Icon name="visibility" size={20} color={COLORS.blue} />
        </TouchableOpacity>
      </View>
    );
  };

  const clearFilters = () => {
    setSelectedDate(null);
    setSelectedPlant("Milk Filling Packing");
    setSelectedLine(null);
    setSearchQuery("");
    setSelectedCipType(null);
    setSelectedStatus(null);
    setSelectedPosisi(null);
  };

  const getFilteredCounts = () => {
    const drafts = dataCIP.filter(item => isDraftStatus(item.status)).length;
    const submitted = dataCIP.filter(item => isSubmittedStatus(item.status)).length;
    const total = dataCIP.length;
    return { drafts, submitted, total };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading CIP Reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const counts = getFilteredCounts();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Report CIP</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={onRefresh}
            disabled={isRefreshing}
          >
            <Icon 
              name="refresh" 
              size={24} 
              color={isRefreshing ? COLORS.gray : COLORS.blue} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleCreateCIP}>
            <Icon name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{counts.drafts}</Text>
          <Text style={styles.summaryLabel}>Drafts</Text>
          <View style={[styles.summaryIndicator, { backgroundColor: '#FF9800' }]} />
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{counts.submitted}</Text>
          <Text style={styles.summaryLabel}>Submitted</Text>
          <View style={[styles.summaryIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{counts.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
          <View style={[styles.summaryIndicator, { backgroundColor: COLORS.blue }]} />
        </View>
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

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.blue]}
          />
        }
      >
        <TableHeader />
        {dataCIP.map(renderItem)}
        
        {dataCIP.length === 0 && !isRefreshing && (
          <View style={styles.noDataContainer}>
            <Icon name="assignment" size={64} color={COLORS.lightGray} />
            <Text style={styles.noDataText}>No CIP reports found</Text>
            <Text style={styles.noDataSubText}>
              Try adjusting your filters or create a new CIP report
            </Text>
            <TouchableOpacity style={styles.createFirstButton} onPress={handleCreateCIP}>
              <Icon name="add" size={20} color="#fff" />
              <Text style={styles.createFirstButtonText}>Create First Report</Text>
            </TouchableOpacity>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  refreshButton: {
    marginRight: 12,
    padding: 8,
  },
  addButton: {
    backgroundColor: COLORS.green,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.blue,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  summaryIndicator: {
    width: 30,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
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
    alignItems: "center",
  },
  draftRow: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#fff8e1',
  },
  submittedRow: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f1f8e9',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 4,
    color: COLORS.black,
  },
  processOrderContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  processOrderCell: {
    fontSize: 11,
    lineHeight: 14,
  },
  draftBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  draftBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  statusCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 4,
  },
  actionButton: {
    flex: 0.8,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
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
    paddingVertical: 60,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.darkGray,
    marginTop: 16,
  },
  noDataSubText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  createFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.green,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  createFirstButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default ReportCIP;