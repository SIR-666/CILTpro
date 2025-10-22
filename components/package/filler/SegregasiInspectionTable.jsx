import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Pressable, Image, ScrollView
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import moment from "moment-timezone";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ========== Utils ========== */
const pad2 = (n) => String(n).padStart(2, "0");
const formatDMY = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const toDate = (val) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(val || "");
  if (m) { const [, dd, mm, yyyy] = m; return new Date(Number(yyyy), Number(mm) - 1, Number(dd)); }
  return new Date();
};
const formatHM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatDDMonYY = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  return `${pad2(d.getDate())}-${monthsShort[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};
const getLineLetter = (lineName) => {
  if (!lineName) return "";
  const m = /([A-Z])\s*$/.exec(String(lineName).trim().toUpperCase());
  return m ? m[1] : "";
};

const todayKodeProdWithSuffix = (lineName) => {
  const base = formatDMY(new Date());
  const suffix = getLineLetter(lineName);
  return suffix ? `${base} ${suffix}` : base;
};

const isRowComplete = (r) => {
  if (!r || !r.type) return false;
  if (r.type === "Start") return !!r.kodeProd;
  if (r.type === "Change Variant") return !!(r.to && r.kodeProd);
  return false;
};

/* ========== Reusable date/time input ========== */
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
      initial.setHours(h); initial.setMinutes(m);
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
  headerMeta = { frm: "FIL - 010 - 02", rev: "", berlaku: formatDDMonYY(new Date()), hal: "1 dari 3" },
}) => (
  <View style={styles.headerWrap}>
    <View style={styles.headerRowTop}>
      <View style={styles.headerLogoBox}>
        <Image source={require("../../../assets/GreenfieldsLogo_Green.png")} style={styles.headerLogoImg} resizeMode="contain" />
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

/* ========== Main (merged) ========== */
const SegregasiInspectionTable = ({
  username,
  onDataChange,
  initialData = [],
  product,
  productOptions = [],
  headerMeta,
  lineName,
  packageType,
  shift,
  processOrder,
  onEffectiveProductChange,
}) => {
  const isInitializingRef = useRef(false);
  const hadInitialDataRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastLineNameRef = useRef(lineName);

  // base product penentu FLAVOUR (tetap mengikuti START)
  const baseProductRef = useRef(product || "");
  const [storageBase, setStorageBase] = useState(() => product || "default");

  // debounce
  const saveTimerRef = useRef(null);
  const debounce = (fn, delay = 250) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(fn, delay);
  };

  // ===== state rows
  const makeEmptyRow = (i) => ({
    id: i,
    // DESCRIPTION
    flavour: "", prodTypeStatus: "", kodeProd: "", kodeExp: "",
    startTime: "", stopTime: "", startNum: "", stopNum: "",
    counterOutfeed: "", totalOutfeed: "", waste: "",
    lastModifiedBy: "", lastModifiedTime: "",
    // SEGREGASI
    type: "", prodType: "", to: "", magazine: false, wastafel: false, palletPm: false, conveyor: false,
    user: "", time: "",
  });

  const [rows, setRows] = useState(() => {
    if (Array.isArray(initialData) && initialData.length > 0) {
      const normalized = initialData.map((d, i) => ({ ...makeEmptyRow(i + 1), ...(d || {}) }));
      return normalized.length > 0 ? normalized : [makeEmptyRow(1), makeEmptyRow(2), makeEmptyRow(3)];
    }
    return [makeEmptyRow(1), makeEmptyRow(2), makeEmptyRow(3)];
  });

  const [manualTotalOutfeed, setManualTotalOutfeed] = useState({});

  // ===== effectiveProduct untuk tujuan CV (hanya mempengaruhi prodType)
  const effectiveProduct = useMemo(() => {
    let chosen = null;
    const toMinutes = (hhmm) =>
    (/^\d{2}:\d{2}$/.test(hhmm || "")
      ? (() => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; })()
      : -1);
    rows.forEach((r, idx) => {
      if (r?.type === "Change Variant" && r?.to) {
        const minutes = toMinutes(r.time);
        if (!chosen || minutes > chosen.timeMin || (minutes === chosen.timeMin && idx > chosen.idx)) {
          chosen = { to: r.to, timeMin: minutes, idx };
        }
      }
    });
    return chosen?.to || product;
  }, [rows, product]);

  const isVariantActive = effectiveProduct !== product;
  useEffect(() => {
    if (typeof onEffectiveProductChange === "function") onEffectiveProductChange(effectiveProduct);
  }, [effectiveProduct, onEffectiveProductChange]);

  // >>> PATCH: pastikan baseProductRef terisi dari prop product pertama kali
  useEffect(() => {
    if (!baseProductRef.current && product) baseProductRef.current = product;
  }, [product]);

  // >>> PATCH: jika ada baris START, tetapkan baseProduct dari situ (sekali saat muncul)
  useEffect(() => {
    const firstStart = rows.find(r => r.type === "Start" && (r.prodType || product));
    if (firstStart && firstStart.prodType && baseProductRef.current !== firstStart.prodType) {
      baseProductRef.current = firstStart.prodType;
    }
  }, [rows, product]);

  // KUNCI STORAGE
  const getStorageKey = (mode = "primary") => {
    const ln = (lineName || "no_line").replace(/\s+/g, "_");
    const po = (processOrder || "no_po").replace(/\s+/g, "_");
    const base = (storageBase || "default").replace(/\s+/g, "_");
    const eff = (effectiveProduct || "default").replace(/\s+/g, "_");
    const shf = (shift || "no_shift").replace(/\s+/g, "_");
    const usr = (username || "").replace(/\s+/g, "_");
    const pkg = (packageType || "no_pkg").replace(/\s+/g, "_");
    return mode === "primary"
      ? `segregasi_temp_${ln}_${po}_${base}_${pkg}_${shf}__${usr}`
      : `segregasi_temp_${ln}_${po}_${eff}_${pkg}_${shf}__${usr}`;
  };

  // ===== init once
  useEffect(() => {
    isInitializingRef.current = true;
    hadInitialDataRef.current = Array.isArray(initialData) && initialData.length > 0;
    if (hadInitialDataRef.current) {
      setRows(initialData.map((d, i) => ({ ...makeEmptyRow(i + 1), ...(d || {}) })));
    }
    const t = setTimeout(async () => {
      isInitializingRef.current = false;
      if (!hadInitialDataRef.current) {
        try {
          const primaryKey = getStorageKey("primary");
          const storedPrimary = await AsyncStorage.getItem(primaryKey);
          if (storedPrimary) {
            const parsed = JSON.parse(storedPrimary);
            if (Array.isArray(parsed?.rows)) {
              setRows(parsed.rows.map((d, i) => ({ ...makeEmptyRow(i + 1), ...(d || {}) })));
              return;
            }
          }
          const legacyKey = getStorageKey("legacy");
          const storedLegacy = await AsyncStorage.getItem(legacyKey);
          if (storedLegacy) {
            const parsed = JSON.parse(storedLegacy);
            if (Array.isArray(parsed?.rows)) {
              const normalized = parsed.rows.map((d, i) => ({ ...makeEmptyRow(i + 1), ...(d || {}) }));
              setRows(normalized);
              await AsyncStorage.setItem(primaryKey, JSON.stringify({
                rows: normalized,
                timestamp: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
              }));
              await AsyncStorage.removeItem(legacyKey);
              return;
            }
          }
        } catch (e) {
          console.error("init-load segregasi failed:", e);
        }
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // ===== load on key change
  useEffect(() => {
    const load = async () => {
      if (!username || !lineName || !shift) return;
      try {
        isLoadingRef.current = true;
        const primaryKey = getStorageKey("primary");
        const storedPrimary = await AsyncStorage.getItem(primaryKey);
        if (storedPrimary) {
          const parsed = JSON.parse(storedPrimary);
          if (Array.isArray(parsed?.rows)) {
            setRows(parsed.rows.map((d, i) => ({ ...makeEmptyRow(i + 1), ...(d || {}) })));
            return;
          }
        }
        const legacyKey = getStorageKey("legacy");
        const storedLegacy = await AsyncStorage.getItem(legacyKey);
        if (storedLegacy) {
          const parsed = JSON.parse(storedLegacy);
          if (Array.isArray(parsed?.rows)) {
            // BENAR
            const normalized = parsed.rows.map((d, i) => ({ ...makeEmptyRow(i + 1), ...(d || {}) }));
            setRows(normalized);
            await AsyncStorage.setItem(primaryKey, JSON.stringify({
              rows: normalized,
              timestamp: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
            }));
            await AsyncStorage.removeItem(legacyKey);
            return;
          }
        }
        setRows([makeEmptyRow(1), makeEmptyRow(2), makeEmptyRow(3)]);
        setManualTotalOutfeed({});
      } catch (e) { console.error("load segregasi merged failed:", e); }
      finally { setTimeout(() => { isLoadingRef.current = false; }, 80); }
    };
    load();
  }, [lineName, shift, username, processOrder, packageType, storageBase]);

  // ===== autosave
  useEffect(() => {
    if (isInitializingRef.current || isLoadingRef.current) return;
    if (!username || !lineName || !shift) return;
    const key = getStorageKey("primary");
    const doSave = async () => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify({
          rows,
          timestamp: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
        }));
      } catch (e) { console.error("save segregasi merged failed:", e); }
    };
    debounce(doSave, 250);
  }, [rows, lineName, shift, username, processOrder, packageType, storageBase]);

  // ===== save on unmount
  useEffect(() => {
    const key = getStorageKey("primary");
    return () => {
      try {
        AsyncStorage.setItem(key, JSON.stringify({
          rows,
          timestamp: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
        }));
      } catch { }
    };
  }, [lineName, shift, username, processOrder, packageType, storageBase, rows]);

  // ===== clear API
  const clearSegregasiStorage = useCallback(async () => {
    const key = getStorageKey("primary");
    await AsyncStorage.removeItem(key);
    setRows([makeEmptyRow(1), makeEmptyRow(2), makeEmptyRow(3)]);
    setManualTotalOutfeed({});
  }, [lineName, shift, username, processOrder, product]);
  useEffect(() => {
    if (typeof window !== "undefined") window.clearSegregasiStorage = clearSegregasiStorage;
    global.clearSegregasiStorage = clearSegregasiStorage;
    return () => { if (typeof window !== "undefined") delete window.clearSegregasiStorage; delete global.clearSegregasiStorage; };
  }, [clearSegregasiStorage]);

  // ===== sync to parent (stabilkan callback)
  const onDataChangeRef = useRef(onDataChange);
  useEffect(() => { onDataChangeRef.current = onDataChange; }, [onDataChange]);
  const lastSigRef = useRef("");
  useEffect(() => {
    const sig = JSON.stringify(rows);
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      onDataChangeRef.current?.(rows);
    }
  }, [rows]);

  // ===== append line suffix ke kodeProd ketika line berubah
  useEffect(() => {
    if (!lineName || lineName === lastLineNameRef.current || isInitializingRef.current || isLoadingRef.current) return;
    lastLineNameRef.current = lineName;
    const suffix = getLineLetter(lineName);
    const regex = /^(\d{2}\/\d{2}\/\d{4})(?:\s+[A-Z])?$/;
    setRows(prev => prev.map(r => {
      if (regex.test(r.kodeProd)) {
        const datePart = r.kodeProd.match(regex)[1];
        const newVal = suffix ? `${datePart} ${suffix}` : datePart;
        if (newVal !== r.kodeProd) {
          return { ...r, kodeProd: newVal, lastModifiedBy: username, lastModifiedTime: moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss") };
        }
      }
      return r;
    }));
  }, [lineName, username]);

  // ===== handlers unified
  const handleChange = useCallback((idx, field, value) => {
    if (isInitializingRef.current || isLoadingRef.current) return;

    if (field === "totalOutfeed") setManualTotalOutfeed(prev => ({ ...prev, [idx]: true }));

    setRows(prev => {
      const next = [...prev];
      const row = { ...next[idx] };

      if (field === "kodeProd") {
        const suffix = getLineLetter(lineName);
        const withSuffix = value ? (suffix ? `${value} ${suffix}` : value) : "";
        row.kodeProd = withSuffix;

        // flavour mengikuti jenis baris
        if (!withSuffix) {
          row.flavour = "";
        } else if (row.type === "Change Variant") {
          row.flavour = row.to || "";
        } else {
          const base = baseProductRef.current || product || row.flavour;
          row.flavour = base;
        }
      } else if (field === "type") {
        row.type = value;
        row.user = username;
        row.time = `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`;

        if (value === "Start") {
          // tetapkan base START product & flavour
          const base = product || baseProductRef.current || row.prodType || row.flavour;
          baseProductRef.current = base;
          setStorageBase(base || "default");
          row.prodType = base;
          if (row.kodeProd) {
            row.flavour = base;
          } else {
            row.flavour = base || "";
            row.kodeProd = todayKodeProdWithSuffix(lineName);
          }
          row.to = "";
        } else if (value === "Change Variant") {
          const prevEff = effectiveProduct || baseProductRef.current || product || "";
          row.prodType = prevEff;
          if (row.kodeProd) row.flavour = "";
        } else if (value === "") {
          row.prodType = "";
          row.to = "";
        }
      } else if (field === "to") {
        row.to = value;
        if (row.type === "Change Variant") {
          row.prodType = value || row.prodType;
          row.flavour = value || "";
          if (row.flavour && !row.kodeProd) {
            row.kodeProd = todayKodeProdWithSuffix(lineName);
          }
        }
        row.user = username;
        row.time = `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`;
      } else if (["magazine", "wastafel", "palletPm", "conveyor"].includes(field)) {
        row[field] = value;
        row.user = username;
        row.time = `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`;
      } else {
        row[field] = value;
      }

      row.lastModifiedBy = username;
      row.lastModifiedTime = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

      next[idx] = row;
      return next;
    });
  }, [lineName, username, product, effectiveProduct]);

  // ===== autosum totalOutfeed
  useEffect(() => {
    if (isInitializingRef.current || isLoadingRef.current) return;
    let changed = false;
    const updated = rows.map((r, idx) => {
      const outfeedRaw = String(r?.counterOutfeed ?? "").trim();
      const wasteRaw = String(r?.waste ?? "").trim();
      const outfeed = outfeedRaw === "" ? NaN : Number(outfeedRaw.replace(/[^0-9.-]/g, ""));
      const waste = wasteRaw === "" ? NaN : Number(wasteRaw.replace(/[^0-9.-]/g, ""));
      const bothHave = !Number.isNaN(outfeed) && !Number.isNaN(waste) && outfeedRaw !== "" && wasteRaw !== "";
      const manual = !!manualTotalOutfeed[idx];
      if (bothHave && !manual) {
        const sum = (outfeed || 0) + (waste || 0);
        if (String(r.totalOutfeed ?? "") !== String(sum)) { changed = true; return { ...r, totalOutfeed: String(sum) }; }
      }
      return r;
    });
    if (changed) setRows(updated);
  }, [rows, manualTotalOutfeed]);

  // ===== auto-append row saat baris terakhir lengkap
  useEffect(() => {
    if (isInitializingRef.current || isLoadingRef.current) return;
    if (!rows || rows.length === 0) return;
    const last = rows[rows.length - 1];
    if (isRowComplete(last)) {
      setRows(prev => {
        const pLast = prev[prev.length - 1];
        if (!isRowComplete(pLast)) return prev;
        const nextId = (prev[prev.length - 1]?.id || prev.length) + 1;
        return [...prev, makeEmptyRow(nextId)];
      });
    }
  }, [rows]);

  /* ===== Render ===== */
  return (
    <View style={styles.container}>
      <ReportHeader headerMeta={{
        frm: headerMeta?.frm || "FIL - 010 - 02",
        rev: headerMeta?.rev ?? "",
        berlaku: headerMeta?.berlaku || formatDDMonYY(new Date()),
        hal: headerMeta?.hal || "1 dari 3",
      }} />

      <Text style={styles.title}>SEGREGASI & DESCRIPTION</Text>
      <Text style={styles.description}>Pencatatan segregasi produk, status peralatan, dan data produksi.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segGrid}>
        {rows.map((r, i) => (
          <View key={r.id ?? i} style={styles.segCol}>
            <Text style={styles.segEntryTitle}>Kolom {i + 1}</Text>

            {/* Audit trail */}
            {r.lastModifiedBy ? (
              <View style={styles.auditTrail}>
                <Text style={styles.auditText}>User: {r.lastModifiedBy}</Text>
                <Text style={styles.auditText}>Time: {r.lastModifiedTime}</Text>
              </View>
            ) : null}

            {/* ===== Description block ===== */}
            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Flavour</Text>
              <View style={[styles.autoShell, styles.inputDisabled]}>
                <Text style={styles.autoText}>{r.flavour || "-"}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Kode Prod.</Text>
              <DateField value={r.kodeProd} onChange={(t) => handleChange(i, "kodeProd", t)} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Kode Exp</Text>
              <DateField value={r.kodeExp} onChange={(t) => handleChange(i, "kodeExp", t)} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Start</Text>
              <TimeField value={r.startTime} onChange={(t) => handleChange(i, "startTime", t)} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Stop</Text>
              <TimeField value={r.stopTime} onChange={(t) => handleChange(i, "stopTime", t)} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Outfeed</Text>
              <TextInput style={styles.descriptionInput} value={r.counterOutfeed} onChangeText={(t) => handleChange(i, "counterOutfeed", t)} placeholder="Qty" keyboardType="number-pad" />
              <Text style={styles.helpText}>Auto/Manual per hitungan</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Total Outfeed</Text>
              <TextInput
                style={[styles.descriptionInput, (!manualTotalOutfeed[i] && r.counterOutfeed && r.waste) ? { opacity: 0.6 } : null]}
                value={r.totalOutfeed}
                onChangeText={(t) => handleChange(i, "totalOutfeed", t)}
                placeholder="Qty" keyboardType="number-pad"
              />
              {(!manualTotalOutfeed[i] && r.counterOutfeed && r.waste) ? (
                <Text style={styles.helpText}>Auto input setelah Outfeed & Waste terisi — masih bisa diganti.</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Waste</Text>
              <TextInput style={styles.descriptionInput} value={r.waste} onChangeText={(t) => handleChange(i, "waste", t)} placeholder="Jumlah waste" keyboardType="number-pad" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Start (Hours)</Text>
              <TextInput style={styles.descriptionInput} value={r.startNum} onChangeText={(t) => handleChange(i, "startNum", t)} placeholder="Input number" keyboardType="number-pad" maxLength={8} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Stop (Hours)</Text>
              <TextInput style={styles.descriptionInput} value={r.stopNum} onChangeText={(t) => handleChange(i, "stopNum", t)} placeholder="Input number" keyboardType="number-pad" maxLength={8} />
            </View>

            {/* ===== Segregasi block ===== */}
            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Type</Text>
              <View style={styles.pickerShell}>
                <Picker selectedValue={r.type} style={[styles.picker, { textAlign: "center" }]} onValueChange={(v) => handleChange(i, "type", v)}>
                  <Picker.Item label="Select Type" value="" />
                  <Picker.Item label="Start" value="Start" />
                  <Picker.Item label="Change Variant" value="Change Variant" />
                </Picker>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.smallLabel}>Prod Type</Text>
              <View style={styles.autoShell}>
                <Text style={styles.autoText}>{r.prodType || "No product selected"}</Text>
                <Text style={styles.helpText}>Auto-filled from product / TO</Text>
              </View>
            </View>

            {r.type === "Change Variant" ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.smallLabel}>TO</Text>
                <View style={styles.pickerShell}>
                  <Picker selectedValue={r.to} style={[styles.picker, { textAlign: "center" }]} onValueChange={(v) => handleChange(i, "to", v)}>
                    <Picker.Item label="Select destination product" value="" />
                    {(productOptions || []).map((op, idx2) => (
                      <Picker.Item key={`${op.value}-${idx2}`} label={op.label || op.value} value={op.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={styles.smallLabel}>TO</Text>
                <View style={[styles.autoShell, styles.autoShellDisabled]}><Text style={styles.autoTextMuted}>—</Text></View>
              </View>
            )}

            <View style={styles.eqBox}>
              <Text style={styles.eqTitle}>Equipment Status</Text>
              {[
                { label: "Magazine", key: "magazine" },
                { label: "Wastafel", key: "wastafel" },
                { label: "Pallet PM", key: "palletPm" },
                { label: "Conveyor", key: "conveyor" },
              ].map(({ label, key }) => (
                <View key={key} style={styles.eqRow}>
                  <Text style={styles.eqLabel}>{label}</Text>
                  <TouchableOpacity
                    style={[styles.checkBox, r[key] && styles.checkBoxChecked]}
                    onPress={() => handleChange(i, key, !r[key])} activeOpacity={0.7}
                  >
                    {r[key] ? <Text style={styles.checkMark}>✔</Text> : null}
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {r.user && r.time ? (
              <View style={styles.auditTrail}>
                <Text style={styles.auditText}>User: {r.user}</Text>
                <Text style={styles.auditText}>Time: {r.time}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default SegregasiInspectionTable;

/* ========== Styles ========== */
const cardShadow = { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2 };
const styles = StyleSheet.create({
  container: { marginTop: 16, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, backgroundColor: "#f9f9f9", padding: 12 },
  headerWrap: { borderWidth: 1, borderColor: "#d7d7d7", borderRadius: 8, backgroundColor: "#fff", marginBottom: 14, overflow: "hidden" },
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
  segGrid: { gap: 10, paddingRight: 6 },
  segCol: { width: 300, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, ...cardShadow, marginRight: 4 },
  segEntryTitle: { fontSize: 12, fontWeight: "700", textAlign: "center", paddingVertical: 6, marginBottom: 8 },
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
  auditTrail: { marginTop: 6, padding: 4, borderTopWidth: 1, borderColor: "#eee" },
  auditText: { fontSize: 10, color: "#555" },
});
