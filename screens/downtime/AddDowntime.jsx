import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import moment from "moment-timezone";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DowntimeCategoryModal from "../../components/Modal/DowntimeCategoryModal";
import ChangeOverDetailsGrid from "../../components/Reusable/ChangeOverDetailsGrid";
import ReusableDatetime3 from "../../components/Reusable/ReusableDatetime3";
import { COLORS } from "../../constants/theme";
import { api, greatApi } from "../../utils/axiosInstance";

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
const RUN_TIME_CATEGORY = "Run Time";
const CATEGORY_THEME_MAP = {
  [RUN_TIME_CATEGORY]: {
    label: RUN_TIME_CATEGORY,
    gradient: ["#86efac", "#22c55e"],
    border: "#15803d",
    text: "#14532d",
  },
  Breakdown: {
    label: "Breakdown",
    gradient: ["#fca5a5", "#ef4444"],
    border: "#b91c1c",
    text: "#7f1d1d",
  },
  "Minor Stop": {
    label: "Minor Stop",
    gradient: ["#fecaca", "#f43f5e"],
    border: "#be123c",
    text: "#881337",
  },
  "Change Over": {
    label: "Change Over",
    gradient: ["#bfdbfe", "#3b82f6"],
    border: "#2563eb",
    text: "#1e3a8a",
  },
  "Cleaning & Start Up": {
    label: "Cleaning & Start Up",
    gradient: ["#fde68a", "#f59e0b"],
    border: "#d97706",
    text: "#78350f",
  },
  Waiting: {
    label: "Waiting",
    gradient: ["#f5d0fe", "#d946ef"],
    border: "#a21caf",
    text: "#701a75",
  },
  "Shutdown Loss": {
    label: "Shutdown Loss",
    gradient: ["#bfdbfe", "#2f75b5"],
    border: "#1d4e89",
    text: "#1e3a8a",
  },
  "Unavailable Time": {
    label: "Unavailable Time",
    gradient: ["#d1d5db", "#9ca3af"],
    border: "#6b7280",
    text: "#374151",
  },
};
const CATEGORY_LEGEND_ORDER = [
  RUN_TIME_CATEGORY,
  "Breakdown",
  "Minor Stop",
  "Change Over",
  "Cleaning & Start Up",
  "Waiting",
  "Shutdown Loss",
  "Unavailable Time",
];
const DYNAMIC_CATEGORY_THEMES = [
  { gradient: ["#c4b5fd", "#8b5cf6"], border: "#6d28d9", text: "#4c1d95" },
  { gradient: ["#a5f3fc", "#06b6d4"], border: "#0891b2", text: "#155e75" },
  { gradient: ["#bbf7d0", "#16a34a"], border: "#166534", text: "#14532d" },
  { gradient: ["#fed7aa", "#f97316"], border: "#c2410c", text: "#7c2d12" },
  { gradient: ["#fbcfe8", "#ec4899"], border: "#be185d", text: "#831843" },
  { gradient: ["#fde68a", "#eab308"], border: "#a16207", text: "#713f12" },
];
const DOWNTIME_ACTION_ROLE_KEYWORDS = ["PRF", "SPV"];

const normalizeRoleToken = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "");

const isAllowedDowntimeActionRole = (value) => {
  const normalized = normalizeRoleToken(value);
  if (!normalized) return false;

  return DOWNTIME_ACTION_ROLE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
};

const extractRoleCandidates = (profile) => {
  if (!profile || typeof profile !== "object") return [];

  return [
    profile.role,
    profile.role_name,
    profile.roleName,
    profile.role_code,
    profile.roleCode,
    profile.jabatan,
    profile.position,
    profile.user_role,
    profile.userRole,
    profile.profile,
    profile?.role?.name,
    profile?.role?.code,
  ].filter(Boolean);
};

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

const getDefaultStartTimeForSelection = (selectedDate, selectedShift) => {
  const nowJakarta = moment.tz("Asia/Jakarta");
  const baseDate = selectedDate ? new Date(selectedDate) : new Date();

  const candidate = new Date(baseDate);
  candidate.setHours(
    nowJakarta.hour(),
    nowJakarta.minute(),
    0,
    0
  );

  const window = getShiftWindow(selectedShift, baseDate);
  if (!window) {
    return candidate;
  }

  if (candidate < window.start || candidate > window.end) {
    return new Date(window.start);
  }

  return candidate;
};

const normalizeDowntimeCategoryLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";

  const normalized = raw.toLowerCase();
  if (normalized === "breakdown") return "Breakdown";
  if (
    normalized === "minor stop" ||
    normalized === "breakdown/minor stop" ||
    normalized === "minor stop/iddling"
  ) {
    return "Minor Stop";
  }
  if (
    normalized === "change over" ||
    normalized === "change-over" ||
    normalized === "changeover"
  ) {
    return "Change Over";
  }
  if (
    normalized === "cleaning & start up" ||
    normalized === "cleaning and start up"
  ) {
    return "Cleaning & Start Up";
  }
  if (normalized === "waiting" || normalized === "process waiting") {
    return "Waiting";
  }
  if (
    ["no demand", "no material", "maintenance", "project/trial", "others"].includes(
      normalized
    )
  ) {
    return "Shutdown Loss";
  }
  if (normalized === "unavailable time") {
    return "Unavailable Time";
  }

  return raw;
};

const getCategoryPriority = (label) => {
  const ranked = [
    "Breakdown",
    "Minor Stop",
    "Change Over",
    "Cleaning & Start Up",
    "Waiting",
    "Shutdown Loss",
    "Unavailable Time",
    RUN_TIME_CATEGORY,
  ];
  const index = ranked.indexOf(label);
  return index === -1 ? 999 : index;
};

const getCategoryTheme = (label) => {
  const normalizedLabel = String(label || "").trim() || "Unknown";
  const exactTheme = CATEGORY_THEME_MAP[normalizedLabel];
  if (exactTheme) return exactTheme;

  const hash = [...normalizedLabel].reduce(
    (acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0,
    0
  );
  const dynamicTheme = DYNAMIC_CATEGORY_THEMES[hash % DYNAMIC_CATEGORY_THEMES.length];

  return {
    label: normalizedLabel,
    gradient: dynamicTheme.gradient,
    border: dynamicTheme.border,
    text: dynamicTheme.text,
  };
};

const getRunDowntimeEvents = (run, runStart, runEnd, downtimeRows = []) => {
  const runId = run?.run_id;

  return downtimeRows
    .map((row) => {
      const rowStartValue = row?.Date ?? row?.start_time ?? row?.startTime;
      const rowStart = parseToJakartaMoment(rowStartValue);
      if (!rowStart.isValid()) return null;

      const durationValue = Number(
        row?.Minutes ?? row?.duration_min ?? row?.duration ?? 0
      );
      const durationMinutes = Number.isFinite(durationValue)
        ? Math.max(durationValue, 1)
        : 1;
      const rowEnd = rowStart.clone().add(durationMinutes, "minutes");

      const rowRunId = row?.run_id ?? row?.runId ?? row?.RunId;
      const hasBothRunIds =
        rowRunId !== undefined &&
        rowRunId !== null &&
        String(rowRunId).trim() !== "" &&
        runId !== undefined &&
        runId !== null &&
        String(runId).trim() !== "";

      const isSameRun = hasBothRunIds
        ? String(rowRunId) === String(runId)
        : rowStart.isBefore(runEnd) && rowEnd.isAfter(runStart);

      if (!isSameRun) return null;

      const clampedStart = rowStart.isBefore(runStart)
        ? runStart.clone()
        : rowStart.clone();
      const clampedEnd = rowEnd.isAfter(runEnd) ? runEnd.clone() : rowEnd.clone();
      if (!clampedEnd.isAfter(clampedStart)) return null;

      return {
        start: clampedStart,
        end: clampedEnd,
        categoryLabel: normalizeDowntimeCategoryLabel(
          row?.Downtime_Category ?? row?.downtime_category
        ),
      };
    })
    .filter(Boolean);
};

const buildRunSegments = (runStart, runEnd, events = []) => {
  if (!runStart || !runEnd || !runEnd.isAfter(runStart)) return [];

  const boundaries = [runStart.valueOf(), runEnd.valueOf()];
  events.forEach((event) => {
    boundaries.push(event.start.valueOf(), event.end.valueOf());
  });

  const sortedBoundaries = [...new Set(boundaries)].sort((a, b) => a - b);
  const segments = [];

  for (let i = 0; i < sortedBoundaries.length - 1; i += 1) {
    const startMs = sortedBoundaries[i];
    const endMs = sortedBoundaries[i + 1];
    if (endMs <= startMs) continue;

    const segmentStart = moment(startMs);
    const segmentEnd = moment(endMs);
    const activeEvents = events.filter(
      (event) => event.start.isBefore(segmentEnd) && event.end.isAfter(segmentStart)
    );

    let categoryLabel = RUN_TIME_CATEGORY;
    if (activeEvents.length > 0) {
      const selectedEvent = [...activeEvents].sort((a, b) => {
        const priorityDiff =
          getCategoryPriority(a.categoryLabel) - getCategoryPriority(b.categoryLabel);
        if (priorityDiff !== 0) return priorityDiff;
        return a.categoryLabel.localeCompare(b.categoryLabel);
      })[0];
      categoryLabel = selectedEvent.categoryLabel;
    }

    const previousSegment = segments[segments.length - 1];
    if (previousSegment && previousSegment.categoryLabel === categoryLabel) {
      previousSegment.end = segmentEnd;
      continue;
    }

    segments.push({
      start: segmentStart,
      end: segmentEnd,
      categoryLabel,
    });
  }

  return segments;
};

const AddDowntimePage = () => {
  const [plant, setPlant] = useState("");
  const [line, setLine] = useState("");
  const [date, setDate] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [shift, setShift] = useState(
    getShiftByHour(moment(new Date()).tz("Asia/Jakarta").format("HH"))
  );

  const [remarks, setRemarks] = useState("");
  const [duration, setDuration] = useState("");
  const [isLoading, setIsLoading] = useState(false); // State to manage loading animation
  const [downtimeData, setDowntimeData] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedItemDowntime, setSelectedItemDowntime] = useState("");
  const [selectedDowntimeDetails, setSelectedDowntimeDetails] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [editingItem, setEditingItem] = useState(null);
  const [changeOverRows, setChangeOverRows] = useState([]);
  const [changeOverLoading, setChangeOverLoading] = useState(false);
  const [productionRuns, setProductionRuns] = useState([]);
  const [productionRunsLoading, setProductionRunsLoading] = useState(false);
  const [canManageDowntime, setCanManageDowntime] = useState(false);

  const isChangeOver = selectedCategory === CHANGE_OVER_CATEGORY;
  const useChangeOverDetails = isChangeOver && changeOverRows.length > 0;

  const deleteInspectionById = async (id) => {
    const response = await api.delete(`/downtime/${id}`);
    return response.data;
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this item?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteInspectionById(id);
              Alert.alert("Success", "Item deleted successfully.");
              fetchData();
            } catch (error) {
              console.error("Delete failed:", error);
              Alert.alert("Error", "Failed to delete item.");
            }
          },
        },
      ]
    );
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

  const handleSelect = (category, itemDowntime, details = null) => {
    const defaultStartTime = getDefaultStartTimeForSelection(currentDate, shift);

    setSelectedCategory(category);
    setSelectedMachine("");
    setSelectedItemDowntime(itemDowntime);
    setSelectedDowntimeDetails(details || "");
    setStartTime(defaultStartTime);
    setEndTime(defaultStartTime);
    setChangeOverRows([]);
    setDuration("");
    setRemarks("");

    setShowModal(false);
    setShowDetailModal(true); // tampilkan modal input detail

    if (category === CHANGE_OVER_CATEGORY) {
      fetchChangeOverTargetsByLine(line, "");
    }
  };

  const fetchMasterDowntimeByLine = async (line) => {
    try {
      const response = await api.get(`/getDowntimeMasterByLine?line=${line}`);
      const raw = response.data;

      // Proses jadi format: [{ category: "...", downtime: [{downtime, details}] }]
      const grouped = raw.reduce((acc, item) => {
        const { downtime_category, downtime, details } = item;
        if (!downtime_category) return acc;

        // cari kategori
        let cat = acc.find((c) => c.category === downtime_category);
        if (!cat) {
          cat = { category: downtime_category, downtime: [] };
          acc.push(cat);
        }

        // tambahkan downtime+details jika belum ada
        if (downtime) {
          const normalizedDetails = String(details || "").trim();
          const exists = cat.downtime.some(
            (row) =>
              String(row?.downtime || "") === String(downtime) &&
              String(row?.details || "") === normalizedDetails
          );

          if (!exists) {
            cat.downtime.push({
              downtime,
              details: normalizedDetails,
            });
          }
        }

        return acc;
      }, []);

      setCategoryData(grouped);
    } catch (error) {
      console.error("Failed to fetch master downtime:", error);
    }
  };

  useEffect(() => {
    if (line) {
      fetchMasterDowntimeByLine(line);
    }
  }, [line]);

  useEffect(() => {
    if (startTime && duration && !isNaN(duration)) {
      const start = new Date(startTime);
      const calculatedEnd = new Date(
        start.getTime() + parseInt(duration) * 60000
      ); // menit → ms
      setEndTime(calculatedEnd);
    }
  }, [startTime, duration]);

  useEffect(() => {
    if (!useChangeOverDetails) return;

    const totalMinutes = changeOverRows.reduce((sum, row) => {
      const value = Number(String(row?.minutes || "").replace(",", "."));
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    setDuration(String(totalMinutes));
  }, [useChangeOverDetails, changeOverRows]);

  useEffect(() => {
    // Lock the screen orientation to portrait
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      );
    };
    lockOrientation();
  }, []);

  useEffect(() => {
    if (showDetailModal || editingItem) return;
    const nextDefaultStart = getDefaultStartTimeForSelection(currentDate, shift);
    setStartTime(nextDefaultStart);
    setEndTime(nextDefaultStart);
  }, [currentDate, shift, showDetailModal, editingItem]);

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

  const plantOptions = [
    "Milk Filling Packing",
    "Milk Processing",
    "Yogurt",
    "Cheese",
  ];
  const lineOptionsByPlant = {
    "Milk Filling Packing": [
      "LINE A",
      "LINE B",
      "LINE C",
      "LINE D",
      "LINE E",
      "LINE F",
      "LINE G",
      "LINE H",
      "LINE BIB",
      "LINE J",
    ],
    "Milk Processing": ["FLEX 1", "FLEX 2", "GEA 3", "GEA 4", "GEA 5"],
    Yogurt: ["YA", "YB", "YRTD", "PASTEURIZER"],
    Cheese: ["MOZ 200", "MOZ 1000", "RICO"],
  };
  const lineOptions = lineOptionsByPlant[plant] || [];
  const selectedDateQuery = currentDate
    ? moment(currentDate).format("YYYY-MM-DD")
    : "";
  const selectedDateDisplay = currentDate
    ? moment(currentDate).format("DD/MM/YYYY")
    : "-";
  const shiftMappedValue = shiftMapCILT[shift] || shift;
  const isCombinationSelected = Boolean(
    plant && line && shiftMappedValue && selectedDateQuery
  );
  const timelineWindow = getShiftWindow(shift, currentDate);
  const timelineStart = timelineWindow ? moment(timelineWindow.start) : null;
  const timelineEnd = timelineWindow ? moment(timelineWindow.end) : null;
  const timelineMinutes =
    timelineStart && timelineEnd
      ? Math.max(timelineEnd.diff(timelineStart, "minutes"), 1)
      : 1;
  const timelineTickItems = [0, 25, 50, 75, 100].map((percent) => {
    if (!timelineStart) {
      return { percent, label: "--:--" };
    }
    const minuteOffset = Math.round((timelineMinutes * percent) / 100);
    return {
      percent,
      label: timelineStart.clone().add(minuteOffset, "minutes").format("HH:mm"),
    };
  });
  const tableColumnWidths = useMemo(
    () =>
      canManageDowntime
        ? {
            no: "4%",
            category: "12%",
            machine: "15%",
            type: "14%",
            start: "10%",
            duration: "10%",
            notes: "15%",
            action: "20%",
          }
        : {
            no: "5%",
            category: "15%",
            machine: "17%",
            type: "17%",
            start: "13%",
            duration: "13%",
            notes: "20%",
          },
    [canManageDowntime]
  );
  const poVisualizationRows = useMemo(() => {
    if (!timelineStart || !timelineEnd) {
      return {
        rows: [],
        legendItems: [getCategoryTheme(RUN_TIME_CATEGORY)],
      };
    }

    const legendLabels = new Set([RUN_TIME_CATEGORY]);
    const rows = productionRuns
      .map((run, index) => {
        const startMoment = parseToJakartaMoment(run.start_time);
        const rawEndMoment = run.end_time
          ? parseToJakartaMoment(run.end_time)
          : startMoment.clone().add(1, "minute");
        const endMoment = rawEndMoment.isAfter(startMoment)
          ? rawEndMoment
          : startMoment.clone().add(1, "minute");

        const clampedStart = startMoment.isBefore(timelineStart)
          ? timelineStart.clone()
          : startMoment.clone();
        const clampedEnd = endMoment.isAfter(timelineEnd)
          ? timelineEnd.clone()
          : endMoment.clone();

        if (!clampedEnd.isAfter(clampedStart)) return null;

        const effectiveMinutes = Math.max(clampedEnd.diff(clampedStart, "minutes"), 1);
        const leftPct = Math.max(
          0,
          (clampedStart.diff(timelineStart, "minutes") / timelineMinutes) * 100
        );
        const widthPct = Math.max((effectiveMinutes / timelineMinutes) * 100, 2);

        const runEvents = getRunDowntimeEvents(run, clampedStart, clampedEnd, downtimeData);
        const segmentRows = buildRunSegments(clampedStart, clampedEnd, runEvents).map(
          (segment) => {
            const segmentMinutes = Math.max(segment.end.diff(segment.start, "minutes"), 0);
            const segmentWidthPct = Math.max(
              (segmentMinutes / timelineMinutes) * 100,
              segment.categoryLabel === RUN_TIME_CATEGORY ? 0 : 0.8
            );
            const segmentLeftPct = Math.max(
              0,
              (segment.start.diff(timelineStart, "minutes") / timelineMinutes) * 100
            );
            const theme = getCategoryTheme(segment.categoryLabel);
            legendLabels.add(theme.label);

            return {
              ...segment,
              theme,
              leftPct: segmentLeftPct,
              widthPct: segmentWidthPct,
            };
          }
        );

        const rowCategoryLabels = [
          ...new Set(
            segmentRows
              .filter((segment) => segment.categoryLabel !== RUN_TIME_CATEGORY)
              .map((segment) => segment.theme.label)
          ),
        ];

        return {
          run,
          index,
          startMoment,
          endMoment,
          leftPct,
          widthPct,
          categoriesText: rowCategoryLabels.join(" • "),
          segments: segmentRows,
        };
      })
      .filter(Boolean);

    const legendItems = [...legendLabels]
      .sort((a, b) => {
        const indexA = CATEGORY_LEGEND_ORDER.indexOf(a);
        const indexB = CATEGORY_LEGEND_ORDER.indexOf(b);

        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
      .map((label) => getCategoryTheme(label));

    return { rows, legendItems };
  }, [productionRuns, downtimeData, timelineStart, timelineEnd, timelineMinutes]);

  useEffect(() => {
    const resolveDowntimeActionAccess = async () => {
      try {
        const [storedRoleIdRaw, storedProfileRaw] = await Promise.all([
          AsyncStorage.getItem("userData"),
          AsyncStorage.getItem("userProfile"),
        ]);

        const roleId = storedRoleIdRaw == null ? NaN : Number(storedRoleIdRaw);
        const roleCandidates = [];

        if (storedRoleIdRaw) {
          roleCandidates.push(storedRoleIdRaw);
        }

        if (storedProfileRaw) {
          try {
            const parsedProfile = JSON.parse(storedProfileRaw);
            roleCandidates.push(...extractRoleCandidates(parsedProfile));
          } catch (parseError) {
            console.error("Failed to parse user profile from storage:", parseError);
          }
        }

        try {
          const profileResponse = await api.get("/user/profile");
          roleCandidates.push(...extractRoleCandidates(profileResponse?.data));
        } catch (_profileError) {
          // Keep fallback role sources when profile endpoint is unavailable.
        }

        try {
          const meResponse = await greatApi.get("/users/me");
          roleCandidates.push(...extractRoleCandidates(meResponse?.data));
        } catch (_meError) {
          // Keep fallback role sources when Strapi profile endpoint is unavailable.
        }

        const hasRoleAccess =
          roleCandidates.some((candidate) =>
            isAllowedDowntimeActionRole(candidate)
          ) || roleId === 9;

        setCanManageDowntime(hasRoleAccess);
      } catch (error) {
        console.error("Failed to resolve downtime action access:", error);
        setCanManageDowntime(false);
      }
    };

    resolveDowntimeActionAccess();
  }, []);

  useEffect(() => {
    const loadDate = async () => {
      const savedDate = await AsyncStorage.getItem("date");
      const savedPlant = await AsyncStorage.getItem("plant");
      const savedLine = await AsyncStorage.getItem("line");
      const savedShift = await AsyncStorage.getItem("shift");

      if (savedPlant) setPlant(savedPlant);
      if (savedLine) setLine(savedLine);
      if (savedShift) setShift(savedShift);
      if (savedDate) {
        setCurrentDate(new Date(savedDate)); // restore sebagai Date object
      }
    };
    loadDate();
  }, []);

  const fetchData = async () => {
    if (!isCombinationSelected) {
      setDowntimeData([]);
      setProductionRuns([]);
      return;
    }

    await Promise.all([
      fetchDowntimeData(plant, selectedDateQuery, line, shiftMappedValue),
      fetchProductionRunsByCombination(
        plant,
        selectedDateQuery,
        line,
        shiftMappedValue
      ),
    ]);
  };

  useEffect(() => {
    fetchData();
  }, [plant, line, currentDate, shift]);

  const fetchDowntimeData = async (plant, date, line, shift) => {
    try {
      const response = await api.get(
        `/getDowntimeData?plant=${plant}&date=${date}&line=${line}&shift=${shift}`
      );
      setDowntimeData(response.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchProductionRunsByCombination = async (plant, date, line, shift) => {
    setProductionRunsLoading(true);
    try {
      const response = await api.get(
        `/getProductionRunsByCombination?plant=${encodeURIComponent(
          plant
        )}&date=${encodeURIComponent(date)}&line=${encodeURIComponent(
          line
        )}&shift=${encodeURIComponent(shift)}`
      );
      setProductionRuns(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching production runs:", error);
      setProductionRuns([]);
    } finally {
      setProductionRunsLoading(false);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    let order = {};
    if (
      !startTime ||
      !duration ||
      (!useChangeOverDetails && !remarks) ||
      !selectedCategory ||
      !selectedItemDowntime
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

      const shiftWindow = getShiftWindow(shift, currentDate);
      if (!shiftWindow) {
        Alert.alert("Attention!", "Shift is invalid.");
        return;
      }

      const startDate = new Date(startTime);
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
      const startTimeStr = toSqlLocalStringFromJakartaPickerDate(startTime);

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
        selectedCategory === "Breakdown" &&
          parsedDuration > 0 &&
          parsedDuration < MINOR_STOP_THRESHOLD_MINUTES
          ? "Minor Stop"
          : selectedCategory == "Breakdown/Minor Stop"
            ? "Minor Stop"
            : selectedCategory;

      order = {
        plant: plant,
        date: startTimeStr,
        shift: shiftValue,
        line: line,
        downtime_category: resolvedCategory,
        mesin: selectedMachine || "-",
        jenis: selectedItemDowntime,
        details: selectedDowntimeDetails || null,
        keterangan: finalRemarks,
        minutes: parsedDuration,
        run_id: runId,
        ...(editingItem && { id: editingItem.id }), // tambahkan id jika edit
      };

      console.log("Simpan data order:", order);

      const response = editingItem
        ? await api.put("/downtime", order)
        : await api.post("/downtime", order);

      if (response.status === 201 || response.status === 200) {
        const nextDefaultStart = getDefaultStartTimeForSelection(currentDate, shift);
        Alert.alert(
          "Success",
          `Data ${editingItem ? "updated" : "submitted"} successfully!`
        );
        setShowDetailModal(false);
        setStartTime(nextDefaultStart);
        setEndTime(nextDefaultStart);
        setDuration("");
        setRemarks("");
        setSelectedDowntimeDetails("");
        setChangeOverRows([]);
        setEditingItem(null);
        fetchData();
        await clearOfflineData();
      }
    } catch (error) {
      console.error(
        "Downtime submit failed:",
        error?.response?.data || error?.message || error
      );
      await saveOfflineData(order);
      Alert.alert(error.response?.data?.message || "Submission failed.");
    }
  };

  const handleEdit = (item) => {
    const nextCategory = item.Downtime_Category;
    const nextLine = item.Line ?? line;
    const nextNote = item.Keterangan ?? "";

    setSelectedCategory(nextCategory);
    setSelectedMachine(item.Mesin ?? "");
    setSelectedItemDowntime(item.Jenis);
    setSelectedDowntimeDetails(item.Details ?? item.details ?? "");
    setStartTime(toJakartaPickerDate(item.Date));
    setDuration(String(item.Minutes));
    setRemarks(nextNote);
    setEditingItem(item); // simpan item yang sedang diedit
    setShowDetailModal(true);

    if (nextCategory === CHANGE_OVER_CATEGORY) {
      fetchChangeOverTargetsByLine(nextLine, nextNote);
    } else {
      setChangeOverRows([]);
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

  const onDateChange = async (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCurrentDate(selectedDate);

      // Konversi tanggal ke string (format YYYY-MM-DD misalnya)
      const dateString = selectedDate.toISOString().split("T")[0];
      await AsyncStorage.setItem("date", dateString);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>New Downtime Data</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.blue} />
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Plant *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="factory"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={plant}
                    style={styles.dropdown}
                    onValueChange={async (itemValue) => {
                      setPlant(itemValue);
                      await AsyncStorage.setItem("plant", itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {plantOptions.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Production Line *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="line-scan"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <Picker
                    selectedValue={line}
                    style={styles.dropdown}
                    onValueChange={async (itemValue) => {
                      setLine(itemValue);
                      await AsyncStorage.setItem("line", itemValue);
                    }}
                  >
                    <Picker.Item label="Select option" value="" />
                    {lineOptions.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>Date *</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons
                    name="calendar-range"
                    size={24}
                    color={COLORS.lightBlue}
                  />
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateText}>
                      {currentDate.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      testID="datePicker"
                      value={currentDate}
                      mode="date"
                      is24Hour={true}
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
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
                    onValueChange={async (itemValue) => {
                      setShift(itemValue);
                      await AsyncStorage.setItem("shift", itemValue);
                    }}
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

            <TouchableOpacity
              style={styles.addDowntimeButton}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.buttonTextBold}>Add Downtime</Text>
            </TouchableOpacity>

            <DowntimeCategoryModal
              visible={showModal}
              onClose={() => setShowModal(false)}
              onSelect={handleSelect}
              data={categoryData}
              hiddenCategories={["Minor Stop"]}
            />

            <View style={styles.wrapper}>
              <View style={styles.poVisualCard}>
                <View style={styles.poVisualHeaderShell}>
                  <View style={styles.poVisualHeaderAccent} />
                  <View style={styles.poVisualHeaderMain}>
                    <Text style={styles.poVisualEyebrow}>LINE MONITOR</Text>
                    <Text style={styles.poVisualTitle}>
                      PO Timeline - Current Shift
                    </Text>
                  </View>
                  <View style={styles.poVisualHeaderMeta}>
                    <View style={styles.poLivePill}>
                      {productionRunsLoading ? (
                        <ActivityIndicator size="small" color="#2f855a" />
                      ) : (
                        <View style={styles.poLiveDot} />
                      )}
                      <Text style={styles.poLiveText}>
                        {productionRunsLoading ? "Syncing" : "Live"}
                      </Text>
                    </View>
                    <Text style={styles.poVisualDateMeta}>{selectedDateDisplay}</Text>
                  </View>
                </View>

                <View style={styles.poVisualBody}>
                  <View style={styles.poMetaGrid}>
                    <View style={styles.poMetaTile}>
                      <Text style={styles.poMetaLabel}>Plant</Text>
                      <Text style={styles.poMetaValue}>{plant || "-"}</Text>
                    </View>
                    <View style={styles.poMetaTile}>
                      <Text style={styles.poMetaLabel}>Line</Text>
                      <Text style={styles.poMetaValue}>{line || "-"}</Text>
                    </View>
                    <View style={styles.poMetaTile}>
                      <Text style={styles.poMetaLabel}>Shift</Text>
                      <Text style={styles.poMetaValue}>{shift || "-"}</Text>
                    </View>
                    <View style={styles.poMetaTile}>
                      <Text style={styles.poMetaLabel}>Date</Text>
                      <Text style={styles.poMetaValue}>{selectedDateDisplay}</Text>
                    </View>
                  </View>

                  {!isCombinationSelected ? (
                    <Text style={styles.poEmptyText}>
                      Select Plant, Date, Production Line, and Shift to visualize PO.
                    </Text>
                  ) : productionRuns.length === 0 && !productionRunsLoading ? (
                    <Text style={styles.poEmptyText}>
                      No production run data found for this combination.
                    </Text>
                  ) : (
                    <View style={styles.poTimelineBox}>
                      <View style={styles.poTimelineHeaderRow}>
                        <Text style={styles.poTimelineRangeText}>
                          {timelineStart ? timelineStart.format("HH:mm") : "--:--"}
                        </Text>
                        <Text style={styles.poTimelineRangeCenter}>
                          Shift Timeline
                        </Text>
                        <Text style={styles.poTimelineRangeText}>
                          {timelineEnd ? timelineEnd.format("HH:mm") : "--:--"}
                        </Text>
                      </View>

                      <View style={styles.poTickRow}>
                        {timelineTickItems.map((tick) => (
                          <Text
                            key={`tick-${tick.percent}`}
                            style={styles.poTickText}
                          >
                            {tick.label}
                          </Text>
                        ))}
                      </View>
                      <View style={styles.poLegendWrap}>
                        {poVisualizationRows.legendItems.map((theme) => {
                          if (!theme?.label) return null;
                          return (
                            <View key={`legend-${theme.label}`} style={styles.poLegendItem}>
                              <View
                                style={[
                                  styles.poLegendDot,
                                  { backgroundColor: theme.border },
                                ]}
                              />
                              <Text style={styles.poLegendText}>{theme.label}</Text>
                            </View>
                          );
                        })}
                      </View>

                      {poVisualizationRows.rows.map((row) => {
                        const runTheme = getCategoryTheme(RUN_TIME_CATEGORY);
                        return (
                          <View
                            key={`${row.run.run_id || "run"}-${row.index}`}
                            style={styles.poRow}
                          >
                            <View style={styles.poRowMeta}>
                              <View>
                                <Text style={styles.poRunId}>
                                  Run #{row.run.run_id ?? "-"}
                                </Text>
                                <Text style={styles.poRunTime}>
                                  {row.startMoment.format("HH:mm")} -{" "}
                                  {row.endMoment.format("HH:mm")}
                                </Text>
                                {row.categoriesText ? (
                                  <Text style={styles.poRunCategories}>
                                    {row.categoriesText}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                            <View style={styles.poTrack}>
                              <LinearGradient
                                colors={runTheme.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                  styles.poBar,
                                  {
                                    left: `${row.leftPct}%`,
                                    width: `${row.widthPct}%`,
                                    borderColor: runTheme.border,
                                  },
                                ]}
                              />
                              {row.segments
                                .filter(
                                  (segment) => segment.categoryLabel !== RUN_TIME_CATEGORY
                                )
                                .map((segment, segmentIndex) => (
                                  <LinearGradient
                                    key={`segment-${row.run.run_id}-${segmentIndex}`}
                                    colors={segment.theme.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[
                                      styles.poSegmentBar,
                                      {
                                        left: `${segment.leftPct}%`,
                                        width: `${segment.widthPct}%`,
                                        borderColor: segment.theme.border,
                                      },
                                    ]}
                                  />
                                ))}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>

              {/* Table Container */}
              <View style={styles.table}>
                {/* Table Head */}
                <View style={styles.tableHead}>
                  <View style={[styles.cell, { width: tableColumnWidths.no }]}>
                    <Text style={styles.cellTextHeader}>No</Text>
                  </View>
                  <View style={[styles.cell, { width: tableColumnWidths.category }]}>
                    <Text style={styles.cellTextHeader}>Downtime Category</Text>
                  </View>
                  <View style={[styles.cell, { width: tableColumnWidths.machine }]}>
                    <Text style={styles.cellTextHeader}>Machine</Text>
                  </View>
                  <View style={[styles.cell, { width: tableColumnWidths.type }]}>
                    <Text style={styles.cellTextHeader}>Type</Text>
                  </View>
                  <View style={[styles.cell, { width: tableColumnWidths.start }]}>
                    <Text style={styles.cellTextHeader}>Start Time</Text>
                  </View>
                  <View style={[styles.cell, { width: tableColumnWidths.duration }]}>
                    <Text style={styles.cellTextHeader}>
                      Duration (minutes)
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: tableColumnWidths.notes }]}>
                    <Text style={styles.cellTextHeader}>Notes</Text>
                  </View>
                  {canManageDowntime ? (
                    <View style={[styles.cell, { width: tableColumnWidths.action }]}>
                      <Text style={styles.cellTextHeader}>Action</Text>
                    </View>
                  ) : null}
                </View>

                {/* Table Body */}
                <View style={{ borderWidth: 1, borderColor: "#000" }}>
                  {!downtimeData.length ? (
                    <View style={styles.emptyTableRow}>
                      <Text style={styles.emptyTableText}>
                        {isCombinationSelected
                          ? "No downtime data found for the selected combination."
                          : "Select Plant, Date, Production Line, and Shift to load downtime data."}
                      </Text>
                    </View>
                  ) : (
                    downtimeData.map((item, index) => (
                      <View key={index} style={{ flexDirection: "row" }}>
                        <View style={[styles.cell, { width: tableColumnWidths.no }]}>
                          <Text style={styles.cellText}>{index + 1}</Text>
                        </View>
                        <View style={[styles.cell, { width: tableColumnWidths.category }]}>
                          <Text style={styles.cellText}>
                            {item.Downtime_Category}
                          </Text>
                        </View>
                        <View style={[styles.cell, { width: tableColumnWidths.machine }]}>
                          <Text style={styles.cellText}>
                            {item.Mesin ?? "-"}
                          </Text>
                        </View>
                        <View style={[styles.cell, { width: tableColumnWidths.type }]}>
                          <Text style={styles.cellText}>{item.Jenis}</Text>
                        </View>
                        <View style={[styles.cell, { width: tableColumnWidths.start }]}>
                          <Text style={styles.cellText}>
                            {moment(item.Date, "YYYY-MM-DD HH:mm:ss.SSS").format(
                              "HH:mm:ss"
                            )}
                          </Text>
                        </View>
                        <View style={[styles.cell, { width: tableColumnWidths.duration }]}>
                          <Text style={styles.cellText}>{item.Minutes}</Text>
                        </View>
                        <View style={[styles.cell, { width: tableColumnWidths.notes }]}>
                          <Text style={styles.cellText}>{item.Keterangan}</Text>
                        </View>
                        {canManageDowntime ? (
                          <View
                            style={[
                              styles.cell,
                              {
                                width: tableColumnWidths.action,
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 4,
                              },
                            ]}
                          >
                            {item.Completed === 0 ? (
                              <>
                                <TouchableOpacity
                                  style={styles.updateButton}
                                  onPress={() => handleEdit(item)}
                                >
                                  <Text style={styles.buttonText}>Update</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.deleteButton}
                                  onPress={() => handleDelete(item.id)}
                                >
                                  <Text style={styles.buttonText}>Delete</Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              <Text>Accepted</Text>
                            )}
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          </>
        )}

        {showDetailModal && (
          <Modal
            visible={showDetailModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDetailModal(false)}
          >
            <View style={styles.overlay}>
              <KeyboardAvoidingView
                style={styles.modalKeyboardWrapper}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
              >
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Report Downtime</Text>

                  <ScrollView
                    style={styles.modalBodyScroll}
                    contentContainerStyle={styles.modalBodyScrollContent}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                  >
                    <Text style={styles.downtimeLabel}>
                      Category: {selectedCategory}
                    </Text>
                    {selectedMachine ? (
                      <Text style={styles.downtimeLabel}>
                        Machine: {selectedMachine}
                      </Text>
                    ) : null}
                    <Text style={styles.downtimeLabel}>
                      Downtime: {selectedItemDowntime}
                    </Text>
                    {selectedDowntimeDetails ? (
                      <Text style={styles.downtimeLabel}>
                        Details: {selectedDowntimeDetails}
                      </Text>
                    ) : null}

                    <Text style={styles.inputLabel}>Start Time:</Text>
                    <View style={styles.dropdownContainer}>
                      <ReusableDatetime3 date={startTime} setDate={setStartTime} />
                    </View>
                    {showDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="datetime"
                        display="default"
                        onChange={(e, selected) => {
                          setShowDatePicker(false);
                          if (selected) setDate(selected);
                        }}
                      />
                    )}

                    <Text style={styles.inputLabel}>Duration (minutes):</Text>
                    <TextInput
                      style={styles.inputField}
                      keyboardType="numeric"
                      value={duration}
                      editable={!useChangeOverDetails}
                      onChangeText={setDuration}
                    />

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

                    <Text style={styles.inputLabel}>End Time:</Text>
                    <View style={styles.inputField}>
                      <Text>{moment(endTime).format("DD/MM/YYYY HH:mm")}</Text>
                    </View>

                    {!useChangeOverDetails ? (
                      <>
                        <Text style={styles.inputLabel}>Comments:</Text>
                        <TextInput
                          style={styles.inputField}
                          value={remarks}
                          onChangeText={setRemarks}
                          placeholder="Comments"
                        />
                      </>
                    ) : null}
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowDetailModal(false);
                        setEditingItem(null);
                        setSelectedDowntimeDetails("");
                        setChangeOverRows([]);
                      }}
                    >
                      <Text style={{ color: "red" }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        handleSubmit();
                      }}
                      style={{ marginLeft: 20 }}
                    >
                      <Text style={{ color: "green" }}>OK</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  cell: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 4,
    justifyContent: "center",
  },
  cellText: {
    fontSize: 14,
    textAlign: "center",
  },
  cellTextHeader: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "bold",
  },
  addDowntimeButton: {
    marginTop: 12,
    backgroundColor: "#4caf50",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    width: "15%",
  },
  updateButton: {
    backgroundColor: "#4caf50",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 4,
  },
  deleteButton: {
    backgroundColor: "#f44336",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonTextBold: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    maxHeight: "92%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  modalKeyboardWrapper: {
    width: "100%",
    alignItems: "center",
  },
  modalBodyScroll: {
    maxHeight: "82%",
  },
  modalBodyScrollContent: {
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  inputLabel: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: "600",
  },
  downtimeLabel: {
    marginBottom: 4,
    fontWeight: "600",
  },
  inputField: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
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
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ececec",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    marginTop: 4,
    marginBottom: 4,
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
  dateText: {
    marginLeft: 16,
    fontSize: 16,
  },
  dropdown: {
    flex: 1,
    marginLeft: 4,
  },
  wrapper: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  poVisualCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d7e4d6",
    borderRadius: 12,
    backgroundColor: "#f7fbf7",
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 10,
    shadowColor: "#14532d",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  poVisualHeaderShell: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#edf6ee",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d7e4d6",
  },
  poVisualHeaderAccent: {
    width: 8,
    borderRadius: 2,
    backgroundColor: "#4caf50",
    marginRight: 10,
  },
  poVisualHeaderMain: {
    flex: 1,
    justifyContent: "center",
  },
  poVisualEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#2f855a",
    marginBottom: 1,
  },
  poVisualTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f3d2e",
  },
  poVisualHeaderMeta: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  poLivePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#b9dec1",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  poLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#22c55e",
    marginRight: 5,
  },
  poLiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2f855a",
  },
  poVisualDateMeta: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  poVisualBody: {
    padding: 12,
  },
  poMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  poMetaTile: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#d8e7d8",
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
    borderRadius: 6,
    backgroundColor: "#ffffff",
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  poMetaLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  poMetaValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  poTimelineBox: {
    borderWidth: 1,
    borderColor: "#d7e4d6",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 10,
  },
  poTimelineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  poTimelineRangeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  poTimelineRangeCenter: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2f855a",
  },
  poTickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  poTickText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "700",
  },
  poLegendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  poLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d8e7d8",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: "#f8fbf8",
  },
  poLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 5,
  },
  poLegendText: {
    fontSize: 10,
    color: "#334155",
    fontWeight: "700",
  },
  poRow: {
    marginBottom: 8,
  },
  poRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  poRunId: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  poRunTime: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  poRunCategories: {
    fontSize: 10,
    color: "#334155",
    fontWeight: "600",
    marginTop: 1,
  },
  poTrack: {
    position: "relative",
    height: 13,
    borderRadius: 999,
    backgroundColor: "#edf3ff",
    overflow: "hidden",
  },
  poBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 0.8,
  },
  poSegmentBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 0.8,
  },
  poEmptyText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    paddingVertical: 12,
  },
  table: {
    width: "100%", // Make table take the full width
    margin: 15,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#3bcd6b",
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
  emptyTableRow: {
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  emptyTableText: {
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
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

export default AddDowntimePage;
