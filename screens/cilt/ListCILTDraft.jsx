import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import moment from "moment-timezone";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Searchbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS } from "../../constants/theme";
import { api } from "../../utils/axiosInstance";

const APP_TIMEZONE = "Asia/Jakarta";
const DRAFT_DATE_FORMATS = [
  "YYYY-MM-DD HH:mm:ss.SSS",
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DDTHH:mm:ss.SSS",
  "YYYY-MM-DDTHH:mm:ss",
  moment.ISO_8601,
];

const parseDraftMoment = (value, source = "auto") => {
  if (!value) return null;

  if (moment.isMoment(value)) {
    return value.clone().tz(APP_TIMEZONE);
  }

  if (value instanceof Date) {
    return moment(value).tz(APP_TIMEZONE);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;

    const nowJakarta = moment().tz(APP_TIMEZONE);
    const pickClosest = (first, second) => {
      const firstValid = first?.isValid?.() === true;
      const secondValid = second?.isValid?.() === true;
      if (firstValid && !secondValid) return first;
      if (!firstValid && secondValid) return second;
      if (!firstValid && !secondValid) return null;
      const firstDiff = Math.abs(first.diff(nowJakarta));
      const secondDiff = Math.abs(second.diff(nowJakarta));
      return firstDiff <= secondDiff ? first : second;
    };

    const localStrict = moment.tz(text, DRAFT_DATE_FORMATS, APP_TIMEZONE);
    const localLoose = moment.tz(text, APP_TIMEZONE);
    const localCandidate = localStrict.isValid() ? localStrict : localLoose;

    const utcStrictRaw = moment.utc(text, DRAFT_DATE_FORMATS, true);
    const utcLooseRaw = moment.utc(text);
    const utcCandidateRaw = utcStrictRaw.isValid() ? utcStrictRaw : utcLooseRaw;
    const utcCandidate = utcCandidateRaw?.isValid?.()
      ? utcCandidateRaw.clone().tz(APP_TIMEZONE)
      : null;

    const hasZoneInfo = /([zZ]|[+-]\d{2}:?\d{2})$/.test(text);
    if (hasZoneInfo) {
      const zoned = moment.parseZone(text);
      if (zoned.isValid()) return zoned.tz(APP_TIMEZONE);
    }

    if (source === "server") {
      return pickClosest(utcCandidate, localCandidate);
    }

    if (source === "app") {
      return pickClosest(localCandidate, utcCandidate);
    }

    return pickClosest(localCandidate, utcCandidate);
  }

  const generic = moment(value);
  return generic.isValid() ? generic.tz(APP_TIMEZONE) : null;
};

const getDraftMomentCandidates = (item) => {
  const candidates = [
    { value: item?.updatedAt, source: "server" },
    { value: item?.updated_at, source: "server" },
    { value: item?.savedAt, source: "server" },
    { value: item?.saved_at, source: "server" },
    { value: item?.createdAt, source: "server" },
    { value: item?.created_at, source: "server" },
    { value: item?.formOpenTime, source: "app" },
    { value: item?.form_open_time, source: "app" },
    { value: item?.date, source: "app" },
  ];

  return candidates
    .filter((entry) => {
      if (entry.value === undefined || entry.value === null) return false;
      if (typeof entry.value === "string" && entry.value.trim() === "") return false;
      return true;
    })
    .map((entry) => parseDraftMoment(entry.value, entry.source))
    .filter((parsed) => parsed?.isValid?.() === true);
};

const pickDraftMoment = (item) => {
  const now = moment().tz(APP_TIMEZONE);
  const candidates = getDraftMomentCandidates(item);
  if (!candidates.length) return null;

  const notTooFuture = candidates.filter(
    (candidate) => candidate.diff(now, "minutes") <= 20
  );
  if (notTooFuture.length) {
    return [...notTooFuture].sort((a, b) => b.valueOf() - a.valueOf())[0];
  }

  return [...candidates].sort(
    (a, b) => Math.abs(a.diff(now)) - Math.abs(b.diff(now))
  )[0];
};

const computeDraftFutureOffsetMinutes = (items) => {
  const now = moment().tz(APP_TIMEZONE);
  const futureDiffs = (Array.isArray(items) ? items : [])
    .map((item) => {
      const parsed = pickDraftMoment(item);
      if (!parsed) return null;
      return parsed.diff(now, "minutes", true);
    })
    .filter((diff) => Number.isFinite(diff) && diff > 2 && diff < 3 * 60);

  if (!futureDiffs.length) return 0;
  const sorted = [...futureDiffs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return median;
};

const ListCILTDraft = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dataGreentag, setDataGreentag] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [plantOptions, setPlantOptions] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const [detectedFutureOffsetMinutes, setDetectedFutureOffsetMinutes] = useState(0);
  const shiftOptions = ["Shift 1", "Shift 2", "Shift 3"];

  const applyDetectedOffset = (parsedMoment) => {
    if (!parsedMoment) return null;
    const now = moment().tz(APP_TIMEZONE);
    const nowMinute = now.clone().startOf("minute");
    const adjusted = detectedFutureOffsetMinutes
      ? parsedMoment.clone().subtract(detectedFutureOffsetMinutes, "minutes")
      : parsedMoment.clone();
    const adjustedMinute = adjusted.clone().startOf("minute");
    if (adjustedMinute.isAfter(nowMinute)) return nowMinute;
    return adjustedMinute;
  };

  const getDraftDisplayMoment = (item) =>
    applyDetectedOffset(pickDraftMoment(item));

  const getDraftUpdatedMoment = (item) =>
    applyDetectedOffset(pickDraftMoment(item));

  useEffect(() => {
    fetchDataFromAPI();
    fetchPlantOptions();

    const unsubscribe = navigation.addListener("focus", () => {
      fetchDataFromAPI();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchLineOptions(selectedPlant);
  }, [selectedPlant]);

  // Fetch drafts from API
  const fetchDataFromAPI = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/draft`);
      const drafts = Array.isArray(response.data) ? response.data : [];

      console.log(`Fetched ${drafts.length} drafts from API`);

      // Backend already filters valid drafts, but double-check
      const validDrafts = drafts.filter(draft => {
        const hasInspection = draft.inspectionData &&
          draft.inspectionData !== '[]' &&
          draft.inspectionData !== '';

        const hasDescription = draft.descriptionData &&
          draft.descriptionData !== '[]' &&
          draft.descriptionData !== '';

        return hasInspection || hasDescription;
      });

      console.log(`Valid drafts: ${validDrafts.length}`);
      setDetectedFutureOffsetMinutes(computeDraftFutureOffsetMinutes(validDrafts));
      setDataGreentag(validDrafts);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load drafts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlantOptions = async () => {
    try {
      const response = await api.get(`/mastercilt/plant`);
      setPlantOptions(response.data);
    } catch (error) {
      console.error("Error fetching plant options:", error);
    }
  };

  const fetchLineOptions = async (plant) => {
    if (!plant) {
      setLineOptions([]);
      return;
    }

    try {
      const response = await api.get(`/mastercilt/line?plant=${plant}`);
      setLineOptions(response.data);
    } catch (error) {
      console.error("Error fetching line options:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDataFromAPI();
    setRefreshing(false);
  };

  // Handle draft deletion
  const handleDeleteDraft = async (draftId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this draft?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/draft/${draftId}`);
              Alert.alert("Success", "Draft deleted successfully");
              fetchDataFromAPI();
            } catch (error) {
              console.error("Error deleting draft:", error);
              Alert.alert("Error", "Failed to delete draft");
            }
          },
        },
      ]
    );
  };

  // Get relative time string
  const getRelativeTime = (date) => {
    const now = moment().tz(APP_TIMEZONE);
    const draftDate = parseDraftMoment(date);
    if (!draftDate) return "-";
    const diffMinutes = now.diff(draftDate, 'minutes');
    const diffHours = now.diff(draftDate, 'hours');
    const diffDays = now.diff(draftDate, 'days');

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return draftDate.format('DD/MM/YY');
  };

  // Get badge color based on draft age
  const getDraftAgeBadgeStyle = (date) => {
    const draftDate = parseDraftMoment(date);
    if (!draftDate) return styles.badgeOld;
    const diffHours = moment().diff(draftDate, 'hours');

    if (diffHours < 24) {
      return styles.badgeFresh; // Green
    } else if (diffHours < 72) {
      return styles.badgeWarning; // Yellow
    } else {
      return styles.badgeOld; // Red
    }
  };

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    return dataGreentag.filter((item) => {
      // Search filter
      const matchesSearch = (item.processOrder || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Date filter
      const matchesDate = (() => {
        if (!selectedDate) return true;
        const itemDate = getDraftDisplayMoment(item);
        const filterDate = parseDraftMoment(selectedDate);
        if (!itemDate || !filterDate) return false;
        return itemDate.isSame(filterDate, "day");
      })();

      // Plant filter
      const matchesPlant = selectedPlant
        ? item.plant === selectedPlant.toString()
        : true;

      // Line filter
      const matchesLine = selectedLine
        ? item.line === selectedLine.toString()
        : true;

      // Shift filter
      const matchesShift = selectedShift
        ? (item.currentShift || item.shift) === selectedShift.toString()
        : true;

      return (
        matchesSearch &&
        matchesDate &&
        matchesPlant &&
        matchesLine &&
        matchesShift
      );
    });
  }, [
    dataGreentag,
    searchQuery,
    selectedDate,
    selectedPlant,
    selectedLine,
    selectedShift,
  ]);

  // Group and sort data
  const groupedAndSortedData = useMemo(() => {
    // Sort by updatedAt descending
    return filteredData.sort((a, b) => {
      const bTime = getDraftUpdatedMoment(b)?.valueOf() || 0;
      const aTime = getDraftUpdatedMoment(a)?.valueOf() || 0;
      return bTime - aTime;
    });
  }, [filteredData]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedAndSortedData.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [groupedAndSortedData, currentPage]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedDate,
    selectedPlant,
    selectedLine,
    selectedShift,
  ]);

  const totalPages = Math.ceil(
    groupedAndSortedData.length / itemsPerPage
  );

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.tableHeaderCell}><Text style={styles.tableHeaderText}>Date</Text></View>
      <View style={styles.tableHeaderCell}><Text style={styles.tableHeaderText}>Process Order</Text></View>
      <View style={styles.tableHeaderCell}><Text style={styles.tableHeaderText}>Package</Text></View>
      <View style={styles.tableHeaderCell}><Text style={styles.tableHeaderText}>Plant</Text></View>
      <View style={styles.tableHeaderCell}><Text style={styles.tableHeaderText}>Line</Text></View>
      <View style={styles.tableHeaderCell}><Text style={styles.tableHeaderText}>Shift</Text></View>
      <View style={styles.tableHeaderCell}><Text style={styles.tableHeaderText}>Product</Text></View>
      <View style={styles.tableHeaderCell}><Text style={styles.tableHeaderText}>Machine</Text></View>
      <View style={styles.tableHeaderCell}><Text style={styles.tableHeaderText}>Actions</Text></View>
    </View>
  );

  const renderItem = (item) => {
    const displayMoment = getDraftDisplayMoment(item);
    const updatedMoment = getDraftUpdatedMoment(item);

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => {
          console.log(`Resuming draft ID: ${item.id}`);
          navigation.navigate("AddCilt", {
            fromDraftList: true,
            resumeDraft: {
              draftId: item.id,
              packageType: item.packageType,
              processOrder: item.processOrder,
              plant: item.plant,
              line: item.line,
              machine: item.machine,
              shift: item.currentShift || item.shift,
              product: item.product,
              batch: item.batch,
            },
          });
        }}
      >
        <View style={styles.tableRow}>
          <View style={styles.tableCellWithBadge}>
            <Text style={styles.tableCell}>
              {displayMoment
                ? displayMoment.format("DD/MM/YY HH:mm")
                : "-"}
            </Text>
            <View style={[
              styles.ageBadge,
              getDraftAgeBadgeStyle(updatedMoment)
            ]}>
              <Text style={styles.ageBadgeText}>
                {getRelativeTime(updatedMoment)}
              </Text>
            </View>
          </View>

          <Text style={styles.tableCell}>{item.processOrder}</Text>
          <Text style={styles.tableCell}>{item.packageType}</Text>
          <Text style={styles.tableCell}>{item.plant}</Text>
          <Text style={styles.tableCell}>{item.line}</Text>
          <Text style={styles.tableCell}>{item.currentShift || item.shift}</Text>
          <Text style={styles.tableCell}>{item.product || "-"}</Text>
          <Text style={styles.tableCell}>{item.machine}</Text>

          <View style={styles.actionCell}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteDraft(item.id);
              }}
              style={styles.deleteButton}
            >
              <Icon name="delete" size={20} color="#dc3545" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text style={{ marginTop: 10 }}>Loading drafts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Searchbar
        placeholder="Search by Process Order"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <Text style={styles.title}>List Save As Draft</Text>

      <View style={styles.row}>
        <View style={styles.halfInputGroup}>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.dropdownContainer}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={24}
              color={COLORS.lightBlue}
            />
            <Text style={{ marginLeft: 5 }}>
              {selectedDate
                ? parseDraftMoment(selectedDate)?.format("DD/MM/YYYY")
                : "Date"}
            </Text>
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

          {selectedDate && (
            <TouchableOpacity
              style={{ marginTop: 4 }}
              onPress={() => setSelectedDate(null)}
            >
              <Text style={{ color: COLORS.red }}>Reset Date</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.halfInputGroup}>
          <View style={styles.dropdownContainer}>
            <MaterialCommunityIcons
              name="factory"
              size={24}
              color={COLORS.lightBlue}
            />
            <Picker
              selectedValue={selectedPlant}
              style={styles.dropdown}
              onValueChange={(itemValue) => {
                setSelectedPlant(itemValue);
                setSelectedLine(""); // Reset line when plant changes
              }}
            >
              <Picker.Item label="Plant" value="" />
              {plantOptions.map((option, index) => (
                <Picker.Item
                  key={index}
                  label={option.plant}
                  value={option.plant}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.halfInputGroup}>
          <View style={styles.dropdownContainer}>
            <MaterialCommunityIcons
              name="line-scan"
              size={24}
              color={COLORS.lightBlue}
            />
            <Picker
              selectedValue={selectedLine}
              style={styles.dropdown}
              onValueChange={(itemValue) => {
                setSelectedLine(itemValue);
              }}
            >
              <Picker.Item label="Line" value="" />
              {lineOptions.map((option, index) => (
                <Picker.Item
                  key={index}
                  label={option.line}
                  value={option.line}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.halfInputGroup}>
          <View style={styles.dropdownContainer}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={24}
              color={COLORS.lightBlue}
            />
            <Picker
              selectedValue={selectedShift}
              style={styles.dropdown}
              onValueChange={(itemValue) => {
                setSelectedShift(itemValue);
              }}
            >
              <Picker.Item label="Shift" value="" />
              {shiftOptions.map((option, index) => (
                <Picker.Item key={index} label={option} value={option} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {groupedAndSortedData.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No drafts found</Text>
              <Text style={styles.emptyStateSubtext}>
                {dataGreentag.length === 0
                  ? "Drafts will appear here when you save incomplete packages"
                  : "Try adjusting your filters"}
              </Text>
            </View>
          ) : (
            <>
              <TableHeader />
              {paginatedData.map(renderItem)}
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <Button
                    title="Previous"
                    onPress={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  />
                  <Text style={styles.pageInfo}>
                    Page {currentPage} of {totalPages}
                  </Text>
                  <Button
                    title="Next"
                    onPress={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 8,
    alignSelf: "center",
    color: COLORS.blue,
  },
  content: {
    padding: 10,
  },
  searchBar: {
    marginVertical: 10,
    marginHorizontal: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
    paddingBottom: 10,
  },
  tableHeaderCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tableHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
    paddingVertical: 10,
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
  },
  tableCellWithBadge: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    padding: 8,
  },
  ageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  ageBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
  },
  badgeFresh: {
    backgroundColor: '#10b981',
  },
  badgeWarning: {
    backgroundColor: '#f59e0b',
  },
  badgeOld: {
    backgroundColor: '#dc3545',
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  pageInfo: {
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "start",
    marginHorizontal: 10,
    gap: 10,
  },
  halfInputGroup: {
    width: "20%",
    marginVertical: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 5,
    height: 40,
    paddingHorizontal: 5,
    backgroundColor: "#ffffff",
  },
  dropdown: {
    flex: 1,
    marginLeft: 5,
  },
});

export default ListCILTDraft;
