import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import moment from "moment";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Searchbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS } from "../../constants/theme";

const ListCILTDraft = ({ navigation }) => {
  const [dataGreentag, setDataGreentag] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "ascending",
  });
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const shiftOptions = ["Shift 1", "Shift 2", "Shift 3"];
  const lineOptions = [
    "Line A",
    "Line B",
    "Line C",
    "Line D",
    "Line E",
    "Line F",
    "Line G",
    "Line H",
  ];

  useEffect(() => {
    fetchDataFromAPI();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchDataFromAPI();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchDataFromAPI();
  }, []);

  const fetchDataFromAPI = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.URL;
      const response = await axios.get(`${apiUrl}/cilt?status=1`);
      setDataGreentag(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDataFromAPI();
    setRefreshing(false);
  };

  // Modifikasi filteredData untuk menyertakan filter shift dan line
  const filteredData = dataGreentag.filter((item) => {
    const matchesSearch = item.processOrder
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesShift = selectedShift
      ? item.shift === selectedShift.toString()
      : true;
    const matchesLine = selectedLine
      ? item.line === selectedLine.toString()
      : true;
    return matchesSearch && matchesShift && matchesLine;
  });

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleDetailPress = (item) => {
    if (item.packageType === "CILT") {
      navigation.navigate("DetailLaporanShiftlyCILT", { item }); // Pass the selected item to the new page
    } else if (
      item.packageType === "GI/GR" &&
      item.machine === "Robot Palletizer"
    ) {
      navigation.navigate("DetailLaporanCILTGIGR", { item }); // Pass the selected item to the new page
    } else {
      navigation.navigate("DetailLaporanCILT", { item }); // Pass the selected item to the new page
    }
  };

  const sortData = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setDataGreentag(
      [...dataGreentag].sort((a, b) => {
        if (a[key] < b[key]) {
          return direction === "ascending" ? -1 : 1;
        }
        if (a[key] > b[key]) {
          return direction === "ascending" ? 1 : -1;
        }
        return 0;
      })
    );
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <TouchableOpacity
        onPress={() => sortData("date")}
        style={styles.tableHeaderCell}
      >
        <Text style={styles.tableHeaderText}>Date</Text>
        <Icon name="arrow-drop-down" size={24} color={COLORS.blue} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sortData("processOrder")}
        style={styles.tableHeaderCell}
      >
        <Text style={styles.tableHeaderText}>Process Order</Text>
        <Icon name="arrow-drop-down" size={24} color={COLORS.blue} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sortData("packageType")}
        style={styles.tableHeaderCell}
      >
        <Text style={styles.tableHeaderText}>Package</Text>
        <Icon name="arrow-drop-down" size={24} color={COLORS.blue} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sortData("plant")}
        style={styles.tableHeaderCell}
      >
        <Text style={styles.tableHeaderText}>Plant</Text>
        <Icon name="arrow-drop-down" size={24} color={COLORS.blue} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sortData("line")}
        style={styles.tableHeaderCell}
      >
        <Text style={styles.tableHeaderText}>Line</Text>
        <Icon name="arrow-drop-down" size={24} color={COLORS.blue} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sortData("shift")}
        style={styles.tableHeaderCell}
      >
        <Text style={styles.tableHeaderText}>Shift</Text>
        <Icon name="arrow-drop-down" size={24} color={COLORS.blue} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sortData("product")}
        style={styles.tableHeaderCell}
      >
        <Text style={styles.tableHeaderText}>Product</Text>
        <Icon name="arrow-drop-down" size={24} color={COLORS.blue} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sortData("machine")}
        style={styles.tableHeaderCell}
      >
        <Text style={styles.tableHeaderText}>Machine</Text>
        <Icon name="arrow-drop-down" size={24} color={COLORS.blue} />
      </TouchableOpacity>
    </View>
  );

  const countOccurrences = {};
  const seenItems = new Set();

  paginatedData.forEach((item) => {
    const key = `${item.processOrder}-${item.packageType}-${item.product}`;
    countOccurrences[key] = (countOccurrences[key] || 0) + 1;
  });

  const renderItem = (item) => {
    const key = `${item.processOrder}-${item.packageType}-${item.product}`;

    if (item.packageType === "CILT" && seenItems.has(key)) {
      return null; // Jika sudah ada dalam Set, tidak ditampilkan lagi
    }

    seenItems.add(key); // Simpan kombinasi unik dalam Set

    return (
      <TouchableOpacity key={item.id} onPress={() => handleDetailPress(item)}>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>
            {moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format(
              "DD/MM/YY HH:mm:ss"
            )}
          </Text>
          <Text style={styles.tableCell}>{item.processOrder}</Text>
          <Text style={styles.tableCell}>
            {item.packageType}{" "}
            {item.packageType === "CILT" ? `(${countOccurrences[key]})` : ""}
          </Text>
          <Text style={styles.tableCell}>{item.plant}</Text>
          <Text style={styles.tableCell}>{item.line}</Text>
          <Text style={styles.tableCell}>{item.shift}</Text>
          <Text style={styles.tableCell}>{item.product}</Text>
          <Text style={styles.tableCell}>{item.machine}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // const renderItem = (item) => (
  //   <TouchableOpacity
  //     key={item.id}
  //     onPress={() => handleDetailPress(item)} // Navigate on row press
  //   >
  //     <View style={styles.tableRow}>
  //       <Text style={styles.tableCell}>
  //         {moment(item.date, "YYYY-MM-DD HH:mm:ss.SSS").format("DD/MM/YY HH:mm:ss")}
  //       </Text>
  //       <Text style={styles.tableCell}>{item.processOrder}</Text>
  //       <Text style={styles.tableCell}>{item.packageType}</Text>
  //       <Text style={styles.tableCell}>{item.plant}</Text>
  //       <Text style={styles.tableCell}>{item.line}</Text>
  //       <Text style={styles.tableCell}>{item.shift}</Text>
  //       <Text style={styles.tableCell}>{item.product}</Text>
  //       <Text style={styles.tableCell}>{item.machine}</Text>
  //     </View>
  //   </TouchableOpacity>
  // );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Searchbar
          placeholder="Search by Process Order"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
        </View>
      </SafeAreaView>
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
              <Picker.Item label="Filter Shift" value="" />
              {shiftOptions.map((option, index) => (
                <Picker.Item key={index} label={option} value={option} />
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
              <Picker.Item label="Filter Line" value="" />
              {lineOptions.map((option, index) => (
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
          <TableHeader />
          {paginatedData.map(renderItem)}
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
    width: "25%",
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
