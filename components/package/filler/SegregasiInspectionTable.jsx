import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import moment from "moment-timezone";

/* ========== Utils ========== */
const pad2 = (n) => String(n).padStart(2, "0");
const formatDMY = (d) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const toDate = (val) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(val || "");
  if (m) {
    const [, dd, mm, yyyy] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  return new Date();
};
const formatHM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const monthsShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const formatDDMonYY = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  return `${pad2(d.getDate())}-${monthsShort[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};
const getLineLetter = (lineName) => {
  if (!lineName) return "";
  const m = /([A-Z])\s*$/.exec(String(lineName).trim().toUpperCase());
  return m ? m[1] : "";
};

/* ========== Field Components ========== */
const DateField = ({ value, onChange, placeholder = "dd/mm/yyyy" }) => {
  const openPicker = () => {
    const initial = value ? toDate(value) : new Date();
    DateTimePickerAndroid.open({
      value: initial,
      mode: "date",
      onChange: (_e, selected) => selected && onChange(formatDMY(selected)),
    });
  };
  return (
    <Pressable onPress={openPicker}>
      <View pointerEvents="none">
        <TextInput style={styles.descriptionInput} placeholder={placeholder} value={value || ""} editable={false} />
      </View>
    </Pressable>
  );
};

const TimeField = ({ value, onChange, placeholder = "HH:MM" }) => {
  const openPicker = () => {
    const initial = new Date();
    if (value && /^(\d{2}):(\d{2})$/.test(value)) {
      const [h, m] = value.split(":").map((x) => parseInt(x, 10));
      initial.setHours(h);
      initial.setMinutes(m);
    }
    DateTimePickerAndroid.open({
      value: initial,
      mode: "time",
      is24Hour: true,
      onChange: (_e, selected) => selected && onChange(formatHM(selected)),
    });
  };
  return (
    <Pressable onPress={openPicker}>
      <View pointerEvents="none">
        <TextInput style={styles.descriptionInput} placeholder={placeholder} value={value || ""} editable={false} />
      </View>
    </Pressable>
  );
};

/* ========== Header ========== */
const ReportHeader = ({
  companyName = "PT. GREENFIELDS INDONESIA",
  title = "LAPORAN PRODUKSI MESIN  GALDI 280 UCS",
  headerMeta = {
    frm: "FIL - 010 - 02",
    rev: "",
    berlaku: formatDDMonYY(new Date()),
    hal: "1 dari 3",
  },
}) => {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerRowTop}>
        <View style={styles.headerLogoBox}>
          <Image
            source={require("../../../assets/GreenfieldsLogo_Green.png")}
            style={styles.headerLogoImg}
            resizeMode="contain"
          />
        </View>
        <View style={styles.headerCompanyBox}>
          <Text style={styles.headerCompanyText}>{companyName}</Text>
        </View>
        <View style={styles.headerMetaBox}>
          <View style={styles.metaRow}><Text style={styles.metaKey}>FRM</Text><Text style={styles.metaVal}>{headerMeta.frm}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Rev</Text><Text style={styles.metaVal}>{headerMeta.rev || "-"}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Berlaku</Text><Text style={styles.metaVal}>{headerMeta.berlaku}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Hal</Text><Text style={styles.metaVal}>{headerMeta.hal}</Text></View>
        </View>
      </View>
      <View style={styles.headerRowBottom}>
        <Text style={styles.headerLeftCell}>JUDUL</Text>
        <Text style={styles.headerTitleCell}>{title}</Text>
      </View>
    </View>
  );
};

/* ========== Main Component ========== */
const SegregasiInspectionTable = ({
  username,
  onDataChange,            // function from parent
  initialData = [],
  product,                 // selected product from parent
  productOptions = [],
  onDescriptionChange,     // function from parent
  initialDescription = [],
  headerMeta,
  lineName,
}) => {
  const isInitializingRef = useRef(false);
  const lastProductRef = useRef(product);
  const lastLineNameRef = useRef(lineName);

  // signatures to prevent infinite loops when syncing to parent
  const lastDescSigRef = useRef("");
  const lastInsSigRef = useRef("");

  /* ===== Segregasi state ===== */
  const [segregasiData, setSegregasiData] = useState(() => {
    if (Array.isArray(initialData) && initialData.length > 0) {
      return initialData.map((item) => ({
        id: item.id,
        type: item.type || "",
        prodType: item.prodType || "",
        to: item.to || "",
        magazine: item.magazine || false,
        wastafel: item.wastafel || false,
        palletPm: item.palletPm || false,
        conveyor: item.conveyor || false,
        user: item.user || "",
        time: item.time || "",
      }));
    }
    return [1, 2, 3].map((i) => ({
      id: i, type: "", prodType: "", to: "",
      magazine: false, wastafel: false, palletPm: false, conveyor: false,
      user: "", time: "",
    }));
  });

  /* ===== Description state ===== */
  const [descriptionData, setDescriptionData] = useState(() => {
    if (Array.isArray(initialDescription) && initialDescription.length > 0) {
      return initialDescription;
    }
    if (Array.isArray(initialData) && initialData.length > 0 && initialData[0]?.descriptionData) {
      return initialData[0].descriptionData;
    }
    return Array(3).fill().map(() => ({
      flavour: "", prodTypeStatus: "", kodeProd: "", kodeExp: "",
      startTime: "", stopTime: "", startNum: "", stopNum: "",
      counterOutfeed: "", totalOutfeed: "", waste: "",
      lastModifiedBy: "", lastModifiedTime: "",
    }));
  });

  /* ===== Init once from props ===== */
  useEffect(() => {
    isInitializingRef.current = true;
    if (Array.isArray(initialData) && initialData.length > 0) {
      setSegregasiData(initialData.map((item) => ({
        id: item.id, type: item.type || "", prodType: item.prodType || "",
        to: item.to || "", magazine: item.magazine || false, wastafel: item.wastafel || false,
        palletPm: item.palletPm || false, conveyor: item.conveyor || false,
        user: item.user || "", time: item.time || "",
      })));
    }
    if (Array.isArray(initialDescription) && initialDescription.length > 0) {
      setDescriptionData(initialDescription);
    }
    const t = setTimeout(() => { isInitializingRef.current = false; }, 50);
    return () => clearTimeout(t);
  }, []);

  /* ===== Sync to parent (safe, deduped) ===== */
  useEffect(() => {
    if (isInitializingRef.current) return;
    const descSig = JSON.stringify(descriptionData);
    if (descSig !== lastDescSigRef.current) {
      lastDescSigRef.current = descSig;
      if (typeof onDescriptionChange === "function") {
        onDescriptionChange(descriptionData);
      }
    }
  }, [descriptionData]); // intentionally NOT depending on function prop

  useEffect(() => {
    if (isInitializingRef.current) return;
    const combined = segregasiData.map((it, i) => (i === 0 ? { ...it, descriptionData } : it));
    const insSig = JSON.stringify(combined);
    if (insSig !== lastInsSigRef.current) {
      lastInsSigRef.current = insSig;
      if (typeof onDataChange === "function") {
        onDataChange(combined);
      }
    }
  }, [segregasiData, descriptionData]); // intentionally NOT depending on function prop

  /* ===== Auto-fill Flavour (only if kodeProd filled) ===== */
  useEffect(() => {
    if (!product || product === lastProductRef.current || isInitializingRef.current) return;
    lastProductRef.current = product;

    setDescriptionData((prev) => {
      let changed = false;
      const updated = prev.map((d) => {
        if (d.kodeProd && d.kodeProd.trim() !== "" && d.flavour !== product) {
          changed = true;
          return {
            ...d,
            flavour: product,
            lastModifiedBy: username,
            lastModifiedTime: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
          };
        }
        return d;
      });
      return changed ? updated : prev;
    });
  }, [product, username]);

  /* ===== Append line suffix to Kode Prod on line change ===== */
  useEffect(() => {
    if (!lineName || lineName === lastLineNameRef.current || isInitializingRef.current) return;
    lastLineNameRef.current = lineName;
    const suffix = getLineLetter(lineName);
    const regex = /^(\d{2}\/\d{2}\/\d{4})(?:\s+[A-Z])?$/;

    setDescriptionData((prev) => {
      let changed = false;
      const updated = prev.map((desc) => {
        if (regex.test(desc.kodeProd)) {
          const datePart = desc.kodeProd.match(regex)[1];
          const newVal = suffix ? `${datePart} ${suffix}` : datePart;
          if (newVal !== desc.kodeProd) {
            changed = true;
            return {
              ...desc,
              kodeProd: newVal,
              lastModifiedBy: username,
              lastModifiedTime: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
            };
          }
        }
        return desc;
      });
      return changed ? updated : prev;
    });
  }, [lineName, username]);

  /* ===== Handlers ===== */
  const handleDescChange = useCallback(
    (idx, field, value) => {
      if (isInitializingRef.current) return;

      setDescriptionData((prev) => {
        const next = [...prev];
        const row = { ...next[idx] };

        if (field === "kodeProd") {
          const suffix = getLineLetter(lineName);
          const withSuffix = value ? (suffix ? `${value} ${suffix}` : value) : "";
          row.kodeProd = withSuffix;

          // if kodeProd now exists and product exists, autofill flavour
          if (withSuffix && product) row.flavour = product;
          // if kodeProd cleared, clear flavour
          if (!withSuffix) row.flavour = "";
        } else {
          row[field] = value;
        }

        row.lastModifiedBy = username;
        row.lastModifiedTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

        next[idx] = row;
        return next;
      });
    },
    [lineName, username, product]
  );

  const handleSegregasiChange = useCallback(
    (value, index, field) => {
      if (isInitializingRef.current) return;
      const now = new Date();
      const t = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

      setSegregasiData((prev) => {
        const next = [...prev];
        const row = { ...next[index] };

        row[field] = value;
        row.user = username;
        row.time = t;

        if (field === "type") {
          if (value === "Start") row.to = "";
          if (value === "") {
            row.prodType = "";
            row.to = "";
          } else if (product) {
            row.prodType = product;
          }
        }

        next[index] = row;
        return next;
      });
    },
    [username, product]
  );

  /* ===== Dropdown items ===== */
  const dropdownItems = useMemo(
    () => [
      { label: "Start", value: "Start" },
      { label: "Change Variant", value: "Change Variant" },
    ],
    []
  );

  /* ===== Guards ===== */
  if (!Array.isArray(segregasiData) || !Array.isArray(descriptionData)) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading data. Please try again.</Text>
      </View>
    );
  }

  /* ===== Render ===== */
  return (
    <View style={styles.container}>
      <ReportHeader
        headerMeta={{
          frm: headerMeta?.frm || "FIL - 010 - 02",
          rev: headerMeta?.rev ?? "",
          berlaku: headerMeta?.berlaku || formatDDMonYY(new Date()),
          hal: headerMeta?.hal || "1 dari 3",
        }}
      />

      <Text style={styles.title}>SEGREGASI & DESCRIPTION</Text>
      <Text style={styles.description}>Pencatatan segregasi produk, status peralatan, dan data produksi.</Text>

      {/* DESCRIPTION */}
      <View style={styles.descContainer}>
        <View style={styles.descHeaderBar}>
          {/* <Text style={[styles.segHeaderCell, styles.segHeaderCellNarrow]}>Flavour</Text>
          <Text style={styles.segHeaderCell}>Kode Prod</Text>
          <Text style={styles.segHeaderCell}>Kode Exp</Text>
          <Text style={[styles.segHeaderCell, styles.segHeaderCellWide]}>Detail</Text> */}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segGrid}>
          {[0, 1, 2].map((descIndex) => {
            const descData = descriptionData[descIndex] || {
              flavour: "", kodeProd: "", kodeExp: "",
              startTime: "", stopTime: "", counterOutfeed: "", totalOutfeed: "", waste: "",
              startNum: "", stopNum: "", lastModifiedBy: "", lastModifiedTime: "",
            };

            return (
              <View key={descIndex} style={styles.descCol}>
                <Text style={styles.descEntryTitle}>Kolom {descIndex + 1}</Text>

                {descData.lastModifiedBy ? (
                  <View style={styles.auditTrail}>
                    <Text style={styles.auditText}>User: {descData.lastModifiedBy}</Text>
                    <Text style={styles.auditText}>Time: {descData.lastModifiedTime}</Text>
                  </View>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Flavour</Text>
                  <View style={[styles.autoShell, styles.inputDisabled]}>
                    <Text style={styles.autoText}>{descData.flavour || "-"}</Text>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Kode Prod.</Text>
                  <DateField value={descData.kodeProd} onChange={(t) => handleDescChange(descIndex, "kodeProd", t)} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Kode Exp</Text>
                  <DateField value={descData.kodeExp} onChange={(t) => handleDescChange(descIndex, "kodeExp", t)} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Start</Text>
                  <TimeField value={descData.startTime} onChange={(t) => handleDescChange(descIndex, "startTime", t)} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Stop</Text>
                  <TimeField value={descData.stopTime} onChange={(t) => handleDescChange(descIndex, "stopTime", t)} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Outfeed</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    value={descData.counterOutfeed}
                    onChangeText={(t) => handleDescChange(descIndex, "counterOutfeed", t)}
                    placeholder="Qty"
                    keyboardType="number-pad"
                  />
                  <Text style={styles.helpText}>Auto/Manual per hitungan</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Total Outfeed</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    value={descData.totalOutfeed}
                    onChangeText={(t) => handleDescChange(descIndex, "totalOutfeed", t)}
                    placeholder="Qty"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Waste</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    value={descData.waste}
                    onChangeText={(t) => handleDescChange(descIndex, "waste", t)}
                    placeholder="Jumlah waste"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Start (Numeric)</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    value={descData.startNum}
                    onChangeText={(t) => handleDescChange(descIndex, "startNum", t)}
                    placeholder="Input number"
                    keyboardType="number-pad"
                    maxLength={8}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>Stop (Numeric)</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    value={descData.stopNum}
                    onChangeText={(t) => handleDescChange(descIndex, "stopNum", t)}
                    placeholder="Input number"
                    keyboardType="number-pad"
                    maxLength={8}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* SEGREGASI */}
      <View style={styles.segregasiContainer}>
        <View style={styles.segHeaderBar}>
          {/* <Text style={[styles.segHeaderCell, styles.segHeaderCellNarrow]}>Type</Text>
          <Text style={styles.segHeaderCell}>Prod Type</Text>
          <Text style={styles.segHeaderCell}>TO</Text>
          <Text style={[styles.segHeaderCell, styles.segHeaderCellWide]}>Equipment Status</Text> */}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segGrid}>
          {segregasiData.map((item, segIndex) => (
            <View key={segIndex} style={styles.segCol}>
              <Text style={styles.segEntryTitle}>Entry {segIndex + 1}</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.smallLabel}>Type</Text>
                <View style={styles.pickerShell}>
                  <Picker
                    selectedValue={item.type}
                    style={[styles.picker, { textAlign: "center" }]}
                    onValueChange={(v) => handleSegregasiChange(v, segIndex, "type")}
                  >
                    <Picker.Item label="Select Type" value="" />
                    {[{ label: "Start", value: "Start" }, { label: "Change Variant", value: "Change Variant" }].map(op => (
                      <Picker.Item key={op.value} label={op.label} value={op.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.smallLabel}>Prod Type</Text>
                <View style={styles.autoShell}>
                  <Text style={styles.autoText}>{item.prodType || "No product selected"}</Text>
                  <Text style={styles.helpText}>Auto-filled from product selection</Text>
                </View>
              </View>

              {item.type === "Change Variant" ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>TO</Text>
                  <View style={styles.pickerShell}>
                    <Picker
                      selectedValue={item.to}
                      style={[styles.picker, { textAlign: "center" }]}
                      onValueChange={(v) => handleSegregasiChange(v, segIndex, "to")}
                    >
                      <Picker.Item label="Select destination product" value="" />
                      {(productOptions || []).map((op, i) => (
                        <Picker.Item key={`${op.value}-${i}`} label={op.label || op.value} value={op.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
              ) : (
                <View style={styles.fieldGroup}>
                  <Text style={styles.smallLabel}>TO</Text>
                  <View style={[styles.autoShell, styles.autoShellDisabled]}>
                    <Text style={styles.autoTextMuted}>—</Text>
                  </View>
                </View>
              )}

              <View style={styles.eqBox}>
                <Text style={styles.eqTitle}>Equipment Status</Text>
                {[{ label: "Magazine", key: "magazine" }, { label: "Wastafel", key: "wastafel" }, { label: "Pallet PM", key: "palletPm" }, { label: "Conveyor", key: "conveyor" }].map(({ label, key }) => (
                  <View key={key} style={styles.eqRow}>
                    <Text style={styles.eqLabel}>{label}</Text>
                    <TouchableOpacity
                      style={[styles.checkBox, item[key] && styles.checkBoxChecked]}
                      onPress={() => handleSegregasiChange(!item[key], segIndex, key)}
                      activeOpacity={0.7}
                    >
                      {item[key] ? <Text style={styles.checkMark}>✔</Text> : null}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {item.user && item.time ? (
                <View style={styles.auditTrail}>
                  <Text style={styles.auditText}>User: {item.user}</Text>
                  <Text style={styles.auditText}>Time: {item.time}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default SegregasiInspectionTable;

/* ========== Styles ========== */
const cardShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    padding: 12,
  },
  headerWrap: {
    borderWidth: 1,
    borderColor: "#d7d7d7",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 14,
    overflow: "hidden",
  },
  headerRowTop: { flexDirection: "row", alignItems: "center", padding: 8, gap: 8 },
  headerLogoBox: { width: 130, height: 60, alignItems: "center", justifyContent: "center" },
  headerLogoImg: { width: "100%", height: "100%" },
  headerCompanyBox: { flex: 1, paddingVertical: 6, alignItems: "center", justifyContent: "center" },
  headerCompanyText: { fontSize: 16, fontWeight: "bold", color: "#333", textAlign: "center" },
  headerMetaBox: { width: 140, borderLeftWidth: 1, borderColor: "#e5e5e5", paddingLeft: 8, paddingVertical: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  metaKey: { width: 58, fontSize: 11, color: "#333" },
  metaVal: { flex: 1, fontSize: 11, fontWeight: "600", color: "#333" },
  headerRowBottom: { flexDirection: "row", borderTopWidth: 1, borderColor: "#e5e5e5" },
  headerLeftCell: { width: 110, paddingVertical: 6, textAlign: "center", fontWeight: "600", fontSize: 11, color: "#333", backgroundColor: "#fafafa", borderRightWidth: 1, borderColor: "#e5e5e5" },
  headerTitleCell: { flex: 1, paddingVertical: 6, textAlign: "center", fontWeight: "bold", fontSize: 12, color: "#333" },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 8, textAlign: "center", color: "#333", backgroundColor: "#e8f4fd", padding: 10, borderRadius: 6 },
  description: { fontSize: 12, textAlign: "center", marginBottom: 16, color: "#666", fontStyle: "italic", lineHeight: 16 },
  descContainer: { marginBottom: 16, padding: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8 },
  descHeaderBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#DDF5E4", borderWidth: 1, borderColor: "#B6E3C5", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 10, gap: 8 },
  segHeaderCell: { flex: 1, textAlign: "center", fontWeight: "700", fontSize: 12, color: "#2E6B3E" },
  segHeaderCellNarrow: { flex: 0.9 },
  segHeaderCellWide: { flex: 1.4 },
  segGrid: { gap: 10, paddingRight: 6 },
  descCol: { width: 300, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, ...cardShadow, marginRight: 4 },
  descEntryTitle: { fontSize: 12, fontWeight: "700", textAlign: "center", paddingVertical: 6, marginBottom: 8 },
  fieldGroup: { marginBottom: 8 },
  smallLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  descriptionInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 13, color: "#333" },
  helpText: { fontSize: 10, color: "#888", marginTop: 2, fontStyle: "italic" },
  autoShell: { borderWidth: 1, borderColor: "#CBD5E0", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: "#F9FAFB" },
  autoShellDisabled: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  autoText: { fontSize: 13, color: "#333" },
  autoTextMuted: { fontSize: 13, color: "#aaa" },
  pickerShell: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 6, overflow: "hidden" },
  picker: { height: 52 },
  eqBox: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, padding: 8, marginTop: 8 },
  eqTitle: { fontWeight: "700", fontSize: 12, marginBottom: 6 },
  eqRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  eqLabel: { fontSize: 15, color: "#333" },
  checkBox: { width: 35, height: 35, borderWidth: 1, borderColor: "#999", borderRadius: 4, alignItems: "center", justifyContent: "center" },
  checkBoxChecked: { backgroundColor: "#2E6B3E", borderColor: "#2E6B3E" },
  checkMark: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  segCol: { width: 300, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, ...cardShadow, marginRight: 4 },
  segEntryTitle: { fontSize: 12, fontWeight: "700", textAlign: "center", paddingVertical: 6, marginBottom: 8 },
  auditTrail: { marginTop: 6, padding: 4, borderTopWidth: 1, borderColor: "#eee" },
  auditText: { fontSize: 10, color: "#555" },
  errorContainer: { padding: 12 },
  errorText: { color: "red", fontWeight: "bold" },
  inputDisabled: { backgroundColor: "#F3F4F6" },
  segHeaderBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", borderWidth: 1, borderColor: "#C8E6C9", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 10, gap: 8 },
  segregasiContainer: { marginTop: 10, padding: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8 },
});
