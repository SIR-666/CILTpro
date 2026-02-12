import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ScreenOrientation from "expo-screen-orientation";
import moment from "moment-timezone";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Checkbox, Switch } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import ChangeOverDetailsGrid from "../../components/Reusable/ChangeOverDetailsGrid";
import ReusableDatetime3 from "../../components/Reusable/ReusableDatetime3";
import { COLORS } from "../../constants/theme";
import { api } from "../../utils/axiosInstance";

// Get shift by hour
const getShiftByHour = (hour) => {
  const shift1 = ["06", "07", "08", "09", "10", "11", "12", "13"];
  const shift2 = ["14", "15", "16", "17", "18", "19", "20", "21"];
  const shift3 = ["22", "23", "00", "01", "02", "03", "04", "05"];

  if (shift1.includes(hour)) return "Shift 1";
  if (shift2.includes(hour)) return "Shift 2";
  if (shift3.includes(hour)) return "Shift 3";
  return "Unknown Shift";
};

const MINOR_STOP_THRESHOLD_MINUTES = 10;
const CHANGE_OVER_CATEGORY = "Change Over";

const getShiftWindow = (shiftLabel, baseDate) => {
  if (!shiftLabel || !baseDate) return null;

  const anchor = new Date(baseDate);
  anchor.setHours(0, 0, 0, 0);

  const start = new Date(anchor);
  const end = new Date(anchor);
  let shiftText = "";
  const normalizedShift = String(shiftLabel).trim();

  if (["Shift 1", "I", "1"].includes(normalizedShift)) {
    start.setHours(6, 0, 0, 0);
    end.setHours(14, 0, 0, 0);
    shiftText = "06:00-14:00";
  } else if (["Shift 2", "II", "2"].includes(normalizedShift)) {
    start.setHours(14, 0, 0, 0);
    end.setHours(22, 0, 0, 0);
    shiftText = "14:00-22:00";
  } else if (["Shift 3", "III", "3"].includes(normalizedShift)) {
    start.setHours(22, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(6, 0, 0, 0);
    shiftText = "22:00-06:00";
  } else {
    return null;
  }

  return { start, end, shiftText };
};

const normalizeChangeOverLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();

const buildChangeOverRows = (targets = [], existing = []) => {
  const existingMap = new Map(
    existing.map((row) => [normalizeChangeOverLabel(row.label), row])
  );

  return targets
    .map((row) => {
      const label = String(row?.step || "").trim();
      if (!label) return null;
      const previous = existingMap.get(normalizeChangeOverLabel(label));
      return {
        id: row?.id ?? null,
        label,
        target: row?.target_min ?? row?.target ?? "",
        minutes: previous?.minutes ?? "",
        remark: previous?.remark ?? "",
      };
    })
    .filter(Boolean);
};

const parseChangeOverNote = (note, baseRows = []) => {
  if (!note || !baseRows.length) return baseRows;

  const mapped = baseRows.map((row) => ({ ...row }));
  const text = String(note).split("|").join(", ");
  const entryRegex =
    /([^:]+?)\s*:\s*([\d.]+)\s*(?:\[(.*?)\]|\((.*?)\))?(?:,|$)/g;
  const matches = text.matchAll(entryRegex);

  for (const match of matches) {
    const label = match[1]?.trim();
    const minutes = match[2]?.trim() || "";
    const remark = (match[3] || match[4] || "").trim();
    if (!label) continue;

    const normalizedLabel = normalizeChangeOverLabel(label);
    const row = mapped.find(
      (item) => normalizeChangeOverLabel(item.label) === normalizedLabel
    );

    if (row) {
      row.minutes = minutes;
      row.remark = remark;
      continue;
    }

    mapped.push({
      id: null,
      label,
      target: "",
      minutes,
      remark,
    });
  }

  return mapped;
};

const parseToJakartaMoment = (value) => {
  if (!value) return moment.tz("Asia/Jakarta");

  if (typeof value === "string") {
    const sqlIsoWithTimezone = value.match(
      /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)(?:Z|[+\-]\d{2}:\d{2})$/
    );
    if (sqlIsoWithTimezone) {
      const localFromSqlIso = moment.tz(
        `${sqlIsoWithTimezone[1]} ${sqlIsoWithTimezone[2]}`,
        ["YYYY-MM-DD HH:mm:ss.SSS", "YYYY-MM-DD HH:mm:ss"],
        true,
        "Asia/Jakarta"
      );
      if (localFromSqlIso.isValid()) return localFromSqlIso;
    }

    const hasTimezoneInfo =
      /Z$/i.test(value) || /[+\-]\d{2}:\d{2}$/.test(value);

    if (hasTimezoneInfo) {
      return moment.parseZone(value).utc().tz("Asia/Jakarta");
    }

    const localJakarta = moment.tz(
      value,
      [
        "YYYY-MM-DD HH:mm:ss.SSS",
        "YYYY-MM-DD HH:mm:ss",
        "YYYY-MM-DD HH:mm",
        "YYYY-MM-DDTHH:mm:ss.SSS",
        "YYYY-MM-DDTHH:mm:ss",
        "YYYY-MM-DDTHH:mm",
      ],
      true,
      "Asia/Jakarta"
    );

    if (localJakarta.isValid()) return localJakarta;
  }

  return moment(value).tz("Asia/Jakarta");
};

const toJakartaPickerDate = (value) => {
  const localJakarta = parseToJakartaMoment(value);
  return new Date(
    localJakarta.year(),
    localJakarta.month(),
    localJakarta.date(),
    localJakarta.hour(),
    localJakarta.minute(),
    localJakarta.second(),
    localJakarta.millisecond()
  );
};

const toSqlLocalStringFromJakartaPickerDate = (value) => {
  const localJakarta = moment.tz(
    {
      year: value.getFullYear(),
      month: value.getMonth(),
      date: value.getDate(),
      hour: value.getHours(),
      minute: value.getMinutes(),
      second: value.getSeconds(),
      millisecond: value.getMilliseconds(),
    },
    "Asia/Jakarta"
  );

  // Keep SQL-compatible datetime in local WIB wall clock.
  return localJakarta.format("YYYY-MM-DD HH:mm");
};

//  moment(new Date(item.start_time)).tz("UTC").format("YYYY-MM-DD HH:mm:ss")
const EditDowntimePage = ({ route, navigation }) => {
  const { item = {} } = route.params || {};
  const initialStartTime =
    item.start_time ?? item.Date ?? item.date ?? null;
  const initialPickerDate = toJakartaPickerDate(initialStartTime);
  const [plant, setPlant] = useState("");
  const [line, setLine] = useState("");
  const [date, setDate] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const initialShift =
    item.shift ?? item.Shift ?? null;
  const [shift, setShift] = useState(
    initialShift && String(initialShift).startsWith("Shift")
      ? initialShift
      : getShiftByHour(moment(initialPickerDate).format("HH"))
  );

  const [machine, setMachine] = useState("");
  const [downtime, setDowntime] = useState("");
  const [remarks, setRemarks] = useState("");
  const [duration, setDuration] = useState("");
  const [details, setDetails] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // State to manage loading animation
  const [category, setCategory] = useState("");
  const [changeOverRows, setChangeOverRows] = useState([]);
  const [changeOverLoading, setChangeOverLoading] = useState(false);

  const isChangeOver = category === CHANGE_OVER_CATEGORY;
  const useChangeOverDetails = isChangeOver && changeOverRows.length > 0;

  useEffect(() => {
    // Lock the screen orientation to portrait
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      );
    };
    lockOrientation();
  }, []);

  const shiftOptions = [
    { label: "Shift 1", value: "Shift 1" },
    { label: "Shift 2", value: "Shift 2" },
    { label: "Shift 3", value: "Shift 3" },
    // { label: "Long shift Pagi", value: "Long shift Pagi" },
    // { label: "Long shift Malam", value: "Long shift Malam" },
    // { label: "Start shift", value: "Start shift" },
    // { label: "End shift", value: "End shift" },
  ];

  const shiftMapCILT = {
    "Shift 1": "I",
    "Shift 2": "II",
    "Shift 3": "III",
  };

  const fetchChangeOverTargetsByLine = async (lineValue, existingNote = "") => {
    if (!lineValue) {
      setChangeOverRows([]);
      return;
    }

    setChangeOverLoading(true);
    try {
      const response = await api.get(
        `/getChangeOverTargets?line=${encodeURIComponent(lineValue)}`
      );
      const targets = Array.isArray(response?.data) ? response.data : [];
      const baseRows = buildChangeOverRows(targets);
      const parsedRows = parseChangeOverNote(existingNote, baseRows);
      setChangeOverRows(parsedRows);
    } catch (error) {
      console.error("Failed to fetch change over targets:", error);
      setChangeOverRows([]);
    } finally {
      setChangeOverLoading(false);
    }
  };

  useEffect(() => {
    const loadItemData = async () => {
      if (!item) return;

      const nextPlant = item.plant ?? item.Plant ?? "";
      const nextLine = item.line ?? item.Line ?? "";
      const nextCategory = item.downtime_category ?? item.Downtime_Category ?? "";
      const nextNote = item.keterangan ?? item.Keterangan ?? "";

      setPlant(nextPlant);
      setLine(nextLine);
      setCategory(nextCategory);
      setMachine(item.mesin ?? item.Mesin ?? "-");
      setDowntime(item.jenis ?? item.Jenis ?? "");
      setDetails(item.details ?? item.Details ?? "");
      setRemarks(nextNote);
      setDuration(String(item.minutes ?? item.Minutes ?? ""));

      if (nextCategory === CHANGE_OVER_CATEGORY) {
        await fetchChangeOverTargetsByLine(nextLine, nextNote);
      } else {
        setChangeOverRows([]);
      }

      if (initialStartTime) {
        setDate(toJakartaPickerDate(initialStartTime));
      }
    };

    loadItemData();
  }, []);

  useEffect(() => {
    if (date && duration && !isNaN(duration)) {
      const start = new Date(date);
      const newEndTime = new Date(start.getTime() + parseInt(duration) * 60000); // 60000ms = 1 menit
      setEndTime(newEndTime);
    }
  }, [date, duration]);

  useEffect(() => {
    if (!useChangeOverDetails) return;

    const totalMinutes = changeOverRows.reduce((sum, row) => {
      const value = Number(String(row?.minutes || "").replace(",", "."));
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    setDuration(String(totalMinutes));
  }, [useChangeOverDetails, changeOverRows]);

  // Submit form
  const handleSubmit = async () => {
    let order = {}; // Objek untuk menyimpan data order
    if (
      !date ||
      !duration ||
      !downtime ||
      !category ||
      (!useChangeOverDetails && !remarks)
    ) {
      Alert.alert("Attention!", "Please fill in all fields.");
      return;
    }

    try {
      let parsedDuration = Number(String(duration).replace(",", "."));
      let finalRemarks = remarks || "-";

      if (useChangeOverDetails) {
        let changeOverNotes = "";
        try {
          changeOverNotes = changeOverRows
            .map((row) => {
              const minutesVal = String(row.minutes || "").trim();
              const remarkVal = String(row.remark || "").trim();
              const targetVal = Number(String(row.target || "").trim());
              const minutesNum = Number(minutesVal || 0);

              if (remarkVal && !minutesVal) {
                throw new Error("Minutes is required when remarks is filled.");
              }

              if (
                Number.isFinite(targetVal) &&
                targetVal > 0 &&
                minutesVal &&
                minutesNum > targetVal &&
                !remarkVal
              ) {
                throw new Error(
                  "Remarks is required when minutes exceed target."
                );
              }

              if (!minutesVal && !remarkVal) return null;
              return `${row.label} : ${minutesVal || 0}${remarkVal ? ` (${remarkVal})` : ""
                }`;
            })
            .filter(Boolean)
            .join(", ");
        } catch (validationError) {
          Alert.alert("Attention!", validationError.message);
          return;
        }

        parsedDuration = changeOverRows.reduce((sum, row) => {
          const value = Number(String(row.minutes || "").replace(",", "."));
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0);

        if (parsedDuration <= 0) {
          Alert.alert("Attention!", "Please fill Change Over minutes.");
          return;
        }

        finalRemarks = changeOverNotes || "-";
      }

      if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
        Alert.alert("Attention!", "Duration must be greater than 0.");
        return;
      }

      const shiftWindow = getShiftWindow(shift, date);
      if (!shiftWindow) {
        Alert.alert("Attention!", "Shift is invalid.");
        return;
      }

      const startDate = new Date(date);
      const endDate = new Date(startDate.getTime() + parsedDuration * 60000);
      if (
        startDate < shiftWindow.start ||
        startDate > shiftWindow.end
      ) {
        Alert.alert(
          "Attention!",
          `Start time must be within ${shiftWindow.shiftText}.`
        );
        return;
      }

      if (endDate < shiftWindow.start || endDate > shiftWindow.end) {
        Alert.alert(
          "Attention!",
          `End time must be within ${shiftWindow.shiftText}.`
        );
        return;
      }

      const shiftValue = shiftMapCILT[shift] || shift.replace(/\D/g, "");
      const startTimeStr = toSqlLocalStringFromJakartaPickerDate(date);

      let runId = null;
      try {
        const runIdRes = await api.get(
          `/resolveRunId?plant=${encodeURIComponent(plant)}&line=${encodeURIComponent(line)}&shift=${encodeURIComponent(shiftValue)}&start_time=${encodeURIComponent(startTimeStr)}`
        );
        runId = runIdRes.data?.run_id || null;
      } catch (resolveError) {
        Alert.alert(
          "Submission failed.",
          resolveError?.response?.data?.message ||
          "Production run not found for the selected line/time."
        );
        return;
      }

      if (!runId) {
        Alert.alert(
          "Submission failed.",
          "Production run not found for the selected line/time."
        );
        return;
      }

      const resolvedCategory =
        category === "Breakdown" &&
          parsedDuration > 0 &&
          parsedDuration < MINOR_STOP_THRESHOLD_MINUTES
          ? "Minor Stop"
          : category === "Breakdown/Minor Stop"
            ? "Minor Stop"
            : category;

      // Siapkan objek order
      order = {
        id: item.id,
        plant: plant,
        date: startTimeStr,
        shift: shiftValue,
        line: line,
        downtime_category: resolvedCategory,
        mesin: machine,
        jenis: downtime,
        details: details || null,
        keterangan: finalRemarks,
        minutes: parsedDuration,
        run_id: runId,
      };

      console.log("Simpan data order:", order);

      // Kirim data ke server
      const response = await api.put("/downtime", order);

      if (response.status === 200) {
        Alert.alert("Success", "Data submitted successfully!");
        await clearOfflineData(); // Hapus data offline setelah berhasil submit
        setTimeout(() => {
          navigation.navigate("ListDowntime");
        }, 500);
      }
    } catch (error) {
      console.error(
        "Downtime edit submit failed:",
        error?.response?.data || error?.message || error
      );
      await saveOfflineData(order); // Simpan data secara offline jika submit gagal
      Alert.alert(error.response?.data?.message || "Submission failed.");
    }
  };

  // Save offline data when API submission fails
  const saveOfflineData = async (order) => {
    try {
      console.log("Saving offline data:", order);
      let offlineData = await AsyncStorage.getItem("offlineData");
      offlineData = offlineData ? JSON.parse(offlineData) : [];
      offlineData.push(order);
      await AsyncStorage.setItem("offlineData", JSON.stringify(offlineData));
    } catch (error) {
      console.error("Failed to save offline data:", error);
    }
  };

  const clearOfflineData = async () => {
    try {
      await AsyncStorage.removeItem("offlineData");
    } catch (error) {
      console.error("Failed to clear offline data:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardWrapper}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <Text style={styles.title}>Edit Downtime Data</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.blue} />
          ) : (
            <>
              <View style={styles.row}>
                {/* Select Date and Select Time */}
                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>Date & Start Time *</Text>
                  <View style={styles.dropdownContainer}>
                    <ReusableDatetime3
                      date={date}
                      setDate={setDate}
                      setShift={setShift}
                      getShiftByHour={getShiftByHour}
                    />
                  </View>
                </View>

                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>Shift *</Text>
                  <View style={styles.dropdownContainer}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={24}
                      color={COLORS.lightBlue}
                    />
                    <Picker
                      selectedValue={shift}
                      style={styles.dropdown}
                      onValueChange={(itemValue) => setShift(itemValue)}
                    >
                      <Picker.Item label="Select option" value="" />
                      {shiftOptions.map((option) => (
                        <Picker.Item
                          key={option.value}
                          label={option.label}
                          value={option.value}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>Duration (minutes) *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons
                      name="timer-outline"
                      size={20}
                      color={COLORS.lightBlue}
                    />
                    <TextInput
                      placeholder="Duration"
                      style={styles.input}
                      value={duration}
                      keyboardType="numeric"
                      editable={!useChangeOverDetails}
                      onChangeText={(text) => setDuration(text)}
                    />
                  </View>
                </View>

                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>End Time *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons
                      name="calendar-range"
                      size={20}
                      color={COLORS.lightBlue}
                    />
                    <Text style={styles.input}>
                      {endTime.toLocaleString([], {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>Plant *</Text>
                  <View style={styles.dropdownContainer}>
                    <MaterialCommunityIcons
                      name="factory"
                      size={24}
                      color={COLORS.lightBlue}
                    />
                    <Text style={styles.dropdown}>{plant}</Text>
                  </View>
                </View>

                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>Line *</Text>
                  <View style={styles.dropdownContainer}>
                    <MaterialCommunityIcons
                      name="line-scan"
                      size={24}
                      color={COLORS.lightBlue}
                    />
                    <Text style={styles.dropdown}>{line}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>Category *</Text>
                  <View style={styles.dropdownContainer}>
                    <MaterialCommunityIcons
                      name="puzzle"
                      size={24}
                      color={COLORS.lightBlue}
                    />
                    <Text style={styles.dropdown}>{category}</Text>
                  </View>
                </View>

                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>Machine *</Text>
                  <View style={styles.dropdownContainer}>
                    <MaterialCommunityIcons
                      name="robot-industrial"
                      size={24}
                      color={COLORS.lightBlue}
                    />
                    <Text style={styles.dropdown}>{machine}</Text>
                  </View>
                </View>
              </View>

              {/* <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Group *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="account-group"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={product}
                    style={styles.dropdown}
                    onValueChange={(itemValue) => {
                      setProduct(itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {productOptions.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View> */}

              {isChangeOver && changeOverLoading ? (
                <View style={styles.changeOverLoading}>
                  <ActivityIndicator size="small" color={COLORS.blue} />
                  <Text style={styles.changeOverLoadingText}>
                    Loading Change Over targets...
                  </Text>
                </View>
              ) : null}

              {useChangeOverDetails ? (
                <ChangeOverDetailsGrid
                  rows={changeOverRows}
                  setRows={setChangeOverRows}
                />
              ) : null}

              {!useChangeOverDetails ? (
                <View style={styles.inputGroupBawah}>
                  <Text style={styles.label}>Remarks *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons
                      name="card-text"
                      size={20}
                      color={COLORS.lightBlue}
                    />
                    <TextInput
                      placeholder="Catatan"
                      style={styles.input}
                      value={remarks}
                      onChangeText={(text) => setRemarks(text)}
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.wrapper}>
                {/* Table Container */}
                <View style={styles.table}>
                  {/* Table Head */}
                  <View style={styles.tableHead}>
                    {/* Header Caption */}
                    <View style={{ width: "20%" }}>
                      <Text style={styles.tableCaption}>Select</Text>
                    </View>
                    <View style={{ width: "80%" }}>
                      <Text style={styles.tableCaption}>Downtime</Text>
                    </View>
                  </View>

                  {/* Table Body */}
                  <View style={styles.tableBody}>
                    {/* Header Caption */}
                    <View style={{ width: "20%" }}>
                      <View style={[styles.tableData, styles.centeredContent]}>
                        <Switch style={styles.tableData} value={true} />
                      </View>
                    </View>
                    <View style={{ width: "80%" }}>
                      <Text style={styles.tableData}>{downtime}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

          <View style={styles.checkboxContainer}>
            <Checkbox
              status={agreed ? "checked" : "unchecked"}
              onPress={() => setAgreed(!agreed)}
            />
            <Text style={styles.checkboxLabel}>
              Saya menyatakan telah memasukkan data dengan benar.
            </Text>
          </View>

          <View>
            <TouchableOpacity
              style={
                agreed && duration && downtime
                  ? styles.submitButton
                  : styles.submitButtonDisabled
              }
              onPress={() => handleSubmit()}
              disabled={!(agreed && duration !== "")}
            >
              <Text style={styles.submitButtonText}>UPDATE</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardWrapper: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    alignSelf: "center",
    color: COLORS.blue,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupBawah: {
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInputGroup: {
    flex: 1,
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderColor: COLORS.lightBlue,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 5,
    height: 40,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 5,
    height: 40,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  changeOverLoading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  changeOverLoadingText: {
    fontSize: 12,
    color: "#666",
  },
  changeOverContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  changeOverHorizontalContent: {
    paddingBottom: 2,
  },
  changeOverGrid: {
    minWidth: 720,
    flex: 1,
  },
  changeOverTitle: {
    fontWeight: "600",
    marginBottom: 6,
  },
  changeOverHeader: {
    flexDirection: "row",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 6,
  },
  changeOverHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    paddingHorizontal: 2,
  },
  changeOverRowsScroll: {
    maxHeight: 260,
  },
  changeOverRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    paddingVertical: 2,
    gap: 6,
  },
  changeOverColStep: {
    width: 310,
    paddingRight: 8,
  },
  changeOverColTarget: {
    width: 85,
  },
  changeOverColMinutes: {
    width: 95,
  },
  changeOverColRemark: {
    width: 220,
  },
  changeOverStepText: {
    fontSize: 12,
    lineHeight: 17,
    paddingTop: 7,
  },
  changeOverTargetText: {
    fontSize: 12,
    textAlign: "center",
    paddingTop: 7,
  },
  changeOverInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 12,
    backgroundColor: "#fff",
    minHeight: 36,
  },
  dropdown: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
  },
  wrapper: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  table: {
    width: "100%", // Make table take the full width
    margin: 15,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
    padding: 20,
    width: "100%",
  },
  tableBody: {
    flexDirection: "row",
    // backgroundColor: "#3bcd6b",
    padding: 20,
    width: "100%",
  },
  tableCaption: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableData: {
    // color: "#fff",
    // fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxLabel: {
    marginLeft: 8,
  },
  buttonContainer: {
    paddingBottom: 16,
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#aaa",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  picker: {
    width: "100%",
    height: 40,
    backgroundColor: "#f8f9fa",
  },
});

export default EditDowntimePage;
