import React, { useEffect, useState, useCallback, useRef, memo, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    LayoutAnimation,
    UIManager,
    Platform,
    Modal,
} from "react-native";
import ReportHeader from "../../../components/ReportHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

if (Platform.OS === "android") {
    UIManager.setLayoutAnimationEnabledExperimental &&
        UIManager.setLayoutAnimationEnabledExperimental(true);
}

// TIME PICKER MODAL COMPONENT
const TimePickerModal = memo(({ visible, onClose, onSelect, initialValue }) => {
    const [hour, setHour] = useState("00");
    const [minute, setMinute] = useState("00");

    useEffect(() => {
        if (visible && initialValue) {
            const parts = initialValue.split(":");
            if (parts.length === 2) {
                setHour(parts[0]);
                setMinute(parts[1]);
            }
        }
    }, [visible, initialValue]);

    const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")), []);
    const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")), []);

    const handleConfirm = useCallback(() => {
        onSelect(`${hour}:${minute}`);
        onClose();
    }, [hour, minute, onSelect, onClose]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.timePickerContainer} onStartShouldSetResponder={() => true}>
                    <Text style={styles.timePickerTitle}>Pilih Jam</Text>
                    <View style={styles.timePickerRow}>
                        <View style={styles.timePickerColumn}>
                            <Text style={styles.timePickerLabel}>Jam</Text>
                            <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                                {hours.map((h) => (
                                    <TouchableOpacity
                                        key={h}
                                        style={[styles.timeOption, hour === h && styles.timeOptionSelected]}
                                        onPress={() => setHour(h)}
                                    >
                                        <Text style={[styles.timeOptionText, hour === h && styles.timeOptionTextSelected]}>
                                            {h}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <Text style={styles.timeSeparator}>:</Text>
                        <View style={styles.timePickerColumn}>
                            <Text style={styles.timePickerLabel}>Menit</Text>
                            <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                                {minutes.map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.timeOption, minute === m && styles.timeOptionSelected]}
                                        onPress={() => setMinute(m)}
                                    >
                                        <Text style={[styles.timeOptionText, minute === m && styles.timeOptionTextSelected]}>
                                            {m}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                    <View style={styles.timePickerButtons}>
                        <TouchableOpacity style={styles.timePickerCancelBtn} onPress={onClose}>
                            <Text style={styles.timePickerCancelText}>Batal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.timePickerConfirmBtn} onPress={handleConfirm}>
                            <Text style={styles.timePickerConfirmText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
});

// SECTION COMPONENT (MEMOIZED)
const Section = memo(({ title, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);

    const toggle = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen((prev) => !prev);
    }, []);

    return (
        <View style={styles.sectionCard}>
            <TouchableOpacity onPress={toggle} style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{title}</Text>
                <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {open && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
});

// TEMPERATURE CELL COMPONENT (MEMOIZED)
const TempCell = memo(({ rowIdx, col, cell, updateTemp }) => {
    const handleHoseChange = useCallback((v) => updateTemp(rowIdx, col, "hose", v), [rowIdx, col, updateTemp]);
    const handleNdlChange = useCallback((v) => updateTemp(rowIdx, col, "ndl", v), [rowIdx, col, updateTemp]);

    return (
        <View style={styles.tempCellWrapper}>
            <TextInput
                style={styles.tempHalfInput}
                placeholder="H"
                placeholderTextColor="#999"
                value={cell.hose}
                onChangeText={handleHoseChange}
                keyboardType="numeric"
                maxLength={4}
            />
            <Text style={styles.tempSlash}>/</Text>
            <TextInput
                style={styles.tempHalfInput}
                placeholder="N"
                placeholderTextColor="#999"
                value={cell.ndl}
                onChangeText={handleNdlChange}
                keyboardType="numeric"
                maxLength={4}
            />
        </View>
    );
});

// TANK CELL COMPONENT (MEMOIZED)
const TankCell = memo(({ col, value, updateTemp }) => {
    const handleChange = useCallback((v) => updateTemp(0, col, "tank", v), [col, updateTemp]);

    return (
        <View style={styles.tankCellWrapper}>
            <TextInput
                style={styles.tankCellInput}
                placeholder="T"
                placeholderTextColor="#999"
                value={value}
                onChangeText={handleChange}
                keyboardType="numeric"
                maxLength={4}
            />
        </View>
    );
});

// GLUE ROW COMPONENT (MEMOIZED)
const GlueRow = memo(({ row, index, updateGlue, deleteGlue, onOpenTimePicker }) => {
    const handleQtyChange = useCallback((v) => updateGlue(index, "qtyKg", v), [index, updateGlue]);
    const handleDelete = useCallback(() => deleteGlue(index), [index, deleteGlue]);
    const handleTimePress = useCallback(() => onOpenTimePicker(index, row.jam), [index, row.jam, onOpenTimePicker]);

    return (
        <View style={styles.dataRow}>
            <Text style={[styles.dataCellText, { width: 40 }]}>{row.no}</Text>
            <TouchableOpacity style={[styles.dataInputTouchable, { flex: 1 }]} onPress={handleTimePress}>
                <Text style={[styles.dataInputText, !row.jam && styles.placeholderText]}>
                    {row.jam || "Pilih Jam"}
                </Text>
            </TouchableOpacity>
            <TextInput
                style={[styles.dataInput, { flex: 1 }]}
                value={row.qtyKg}
                onChangeText={handleQtyChange}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
        </View>
    );
});

// LOSS ROW COMPONENT (MEMOIZED)
const LossRow = memo(({ row, index, updateLoss, deleteLoss }) => {
    const handleNamaChange = useCallback((v) => updateLoss(index, "namaProduk", v), [index, updateLoss]);
    const handleCartonChange = useCallback((v) => updateLoss(index, "carton", v), [index, updateLoss]);
    const handlePaperChange = useCallback((v) => updateLoss(index, "paper", v), [index, updateLoss]);
    const handleDelete = useCallback(() => deleteLoss(index), [index, deleteLoss]);

    return (
        <View style={styles.dataRow}>
            <TextInput
                style={[styles.dataInput, { flex: 1.5 }]}
                value={row.namaProduk}
                onChangeText={handleNamaChange}
                placeholder="Nama produk"
                placeholderTextColor="#999"
            />
            <TextInput
                style={[styles.dataInput, { flex: 1 }]}
                value={row.carton}
                onChangeText={handleCartonChange}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
            />
            <TextInput
                style={[styles.dataInput, { flex: 1 }]}
                value={row.paper}
                onChangeText={handlePaperChange}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
        </View>
    );
});

// PROBLEM ROW COMPONENT (MEMOIZED)
const ProblemRow = memo(({ row, index, updateProblem, deleteProblem, onOpenTimePicker }) => {
    const handleMasalahChange = useCallback((v) => updateProblem(index, "masalah", v), [index, updateProblem]);
    const handleCorrectiveChange = useCallback((v) => updateProblem(index, "correctiveAction", v), [index, updateProblem]);
    const handlePicChange = useCallback((v) => updateProblem(index, "pic", v), [index, updateProblem]);
    const handleDelete = useCallback(() => deleteProblem(index), [index, deleteProblem]);

    const handleStopPress = useCallback(() => onOpenTimePicker(index, "stop", row.stop), [index, row.stop, onOpenTimePicker]);
    const handleStartPress = useCallback(() => onOpenTimePicker(index, "start", row.start), [index, row.start, onOpenTimePicker]);
    const handleDurasiPress = useCallback(() => onOpenTimePicker(index, "durasi", row.durasi), [index, row.durasi, onOpenTimePicker]);

    return (
        <View style={styles.dataRow}>
            <TouchableOpacity style={[styles.dataInputTouchable, { width: 70 }]} onPress={handleStopPress}>
                <Text style={[styles.dataInputText, !row.stop && styles.placeholderText]}>
                    {row.stop || "00:00"}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dataInputTouchable, { width: 70 }]} onPress={handleStartPress}>
                <Text style={[styles.dataInputText, !row.start && styles.placeholderText]}>
                    {row.start || "00:00"}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dataInputTouchable, { width: 70 }]} onPress={handleDurasiPress}>
                <Text style={[styles.dataInputText, !row.durasi && styles.placeholderText]}>
                    {row.durasi || "00:00"}
                </Text>
            </TouchableOpacity>
            <TextInput
                style={[styles.dataInput, { width: 200 }]}
                value={row.masalah}
                onChangeText={handleMasalahChange}
                placeholder="Masalah"
                placeholderTextColor="#999"
            />
            <TextInput
                style={[styles.dataInput, { width: 200 }]}
                value={row.correctiveAction}
                onChangeText={handleCorrectiveChange}
                placeholder="Corrective Action"
                placeholderTextColor="#999"
            />
            <TextInput
                style={[styles.dataInput, { width: 80 }]}
                value={row.pic}
                onChangeText={handlePicChange}
                placeholder="PIC"
                placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
        </View>
    );
});

// MAIN COMPONENT
const ArtemaCardboardInspectionTable = ({
    username,
    onDataChange,
    initialData = [],
    shouldClearData = false,
}) => {
    /* HEADER FIELDS */
    const STORAGE_KEY = `artema_cardboard_${(username || "user").replace(/\s+/g, "_")}`;
    const saveTimer = useRef(null);
    const isLoaded = useRef(false);
    const lastClearState = useRef(shouldClearData);
    const [namaProduk, setNamaProduk] = useState("");
    const [lineMc, setLineMc] = useState("");
    const [hoursStop, setHoursStop] = useState("");
    const [hoursStart, setHoursStart] = useState("");
    const [kodeProduksi, setKodeProduksi] = useState("");
    const [kodeKadaluwarsa, setKodeKadaluwarsa] = useState("");
    const [startProduksi, setStartProduksi] = useState("");
    const [stopProduksi, setStopProduksi] = useState("");

    const [tempHoseData, setTempHoseData] = useState(
        Array(5).fill(null).map(() =>
            Array(12).fill(null).map(() => ({ hose: "", ndl: "", tank: "" }))
        )
    );

    const [glueData, setGlueData] = useState(
        Array(3).fill(null).map((_, idx) => ({
            no: idx + 1,
            jam: "",
            qtyKg: "",
        }))
    );

    const [lossData, setLossData] = useState(
        Array(3).fill(null).map(() => ({
            namaProduk: "",
            carton: "",
            paper: "",
        }))
    );

    const [problemData, setProblemData] = useState(
        Array(3).fill(null).map(() => ({
            stop: "",
            start: "",
            durasi: "",
            masalah: "",
            correctiveAction: "",
            pic: "",
        }))
    );

    const [catatan, setCatatan] = useState("");

    // Time Picker States
    const [timePickerVisible, setTimePickerVisible] = useState(false);
    const [timePickerTarget, setTimePickerTarget] = useState(null); // { type: 'glue'|'problem', index, field, value }

    // Function untuk reset semua data ke nilai awal
    const clearAllData = useCallback(async () => {
        try {
            // Clear AsyncStorage
            await AsyncStorage.removeItem(STORAGE_KEY);

            // Reset semua state ke nilai default
            setNamaProduk("");
            setLineMc("");
            setHoursStop("");
            setHoursStart("");
            setKodeProduksi("");
            setKodeKadaluwarsa("");
            setStartProduksi("");
            setStopProduksi("");

            setTempHoseData(
                Array(5).fill(null).map(() =>
                    Array(12).fill(null).map(() => ({ hose: "", ndl: "", tank: "" }))
                )
            );

            setGlueData(
                Array(3).fill(null).map((_, idx) => ({
                    no: idx + 1,
                    jam: "",
                    qtyKg: "",
                }))
            );

            setLossData(
                Array(3).fill(null).map(() => ({
                    namaProduk: "",
                    carton: "",
                    paper: "",
                }))
            );

            setProblemData(
                Array(3).fill(null).map(() => ({
                    stop: "",
                    start: "",
                    durasi: "",
                    masalah: "",
                    correctiveAction: "",
                    pic: "",
                }))
            );

            setCatatan("");

            console.log("Data cleared successfully");
        } catch (error) {
            console.error("Error clearing data:", error);
        }
    }, [STORAGE_KEY]);

    // Detect perubahan shouldClearData dari parent
    useEffect(() => {
        if (shouldClearData && shouldClearData !== lastClearState.current) {
            clearAllData();
            lastClearState.current = shouldClearData;
        }
    }, [shouldClearData, clearAllData]);

    // Alternatif: Clear data saat screen focus dan ada flag tertentu
    useFocusEffect(
        useCallback(() => {
            // Check jika ada flag clearAfterSubmit di AsyncStorage
            const checkClearFlag = async () => {
                try {
                    const clearFlag = await AsyncStorage.getItem(`${STORAGE_KEY}_clear`);
                    if (clearFlag === 'true') {
                        await clearAllData();
                        await AsyncStorage.removeItem(`${STORAGE_KEY}_clear`);
                    }
                } catch (error) {
                    console.error("Error checking clear flag:", error);
                }
            };
            checkClearFlag();
        }, [STORAGE_KEY, clearAllData])
    );

    /* INITIAL LOAD */
    useEffect(() => {
        const load = async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);

                // Jika ada draft tersimpan → pakai draft
                if (raw) {
                    const d = JSON.parse(raw);

                    setNamaProduk(d.namaProduk || "");
                    setLineMc(d.lineMc || "");
                    setHoursStop(d.hoursStop || "");
                    setHoursStart(d.hoursStart || "");
                    setKodeProduksi(d.kodeProduksi || "");
                    setKodeKadaluwarsa(d.kodeKadaluwarsa || "");
                    setStartProduksi(d.startProduksi || "");
                    setStopProduksi(d.stopProduksi || "");
                    if (d.tempHoseData) setTempHoseData(d.tempHoseData);
                    if (d.glueData) setGlueData(reindexGlue(d.glueData));
                    if (d.lossData) setLossData(reindexLoss(d.lossData));
                    if (d.problemData) setProblemData(reindexProblem(d.problemData));
                    if (d.catatan) setCatatan(d.catatan);

                    isLoaded.current = true;
                    return;
                }

                if (initialData.length > 0) {
                    const d = initialData[0];
                    setNamaProduk(d.namaProduk || "");
                    setLineMc(d.lineMc || "");
                    setHoursStop(d.hoursStop || "");
                    setHoursStart(d.hoursStart || "");
                    setKodeProduksi(d.kodeProduksi || "");
                    setKodeKadaluwarsa(d.kodeKadaluwarsa || "");
                    setStartProduksi(d.startProduksi || "");
                    setStopProduksi(d.stopProduksi || "");
                    if (d.tempHoseData) setTempHoseData(d.tempHoseData);
                    if (d.glueData) setGlueData(d.glueData);
                    if (d.lossData) setLossData(d.lossData);
                    if (d.problemData) setProblemData(d.problemData);
                    if (d.catatan) setCatatan(d.catatan);
                }

                isLoaded.current = true;
            } catch (e) {
                console.log("load error:", e);
            }
        };

        load();
    }, []);

    /* AUTO-SAVE with debounce */
    useEffect(() => {
        if (!isLoaded.current) return;

        if (saveTimer.current) clearTimeout(saveTimer.current);

        saveTimer.current = setTimeout(() => {
            const payload = {
                namaProduk,
                lineMc,
                hoursStop,
                hoursStart,
                kodeProduksi,
                kodeKadaluwarsa,
                startProduksi,
                stopProduksi,
                tempHoseData,
                glueData,
                lossData,
                problemData,
                catatan,
                savedAt: new Date().toISOString(),
            };

            // Simpan ke storage
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

            // Kirim ke parent
            onDataChange([{ id: 1, ...payload, user: username }]);
        }, 500); // Increased debounce time for better performance
    }, [
        namaProduk,
        lineMc,
        hoursStop,
        hoursStart,
        kodeProduksi,
        kodeKadaluwarsa,
        startProduksi,
        stopProduksi,
        tempHoseData,
        glueData,
        lossData,
        problemData,
        catatan
    ]);

    const reindexGlue = useCallback((arr) => {
        return arr.map((row, idx) => ({
            ...row,
            no: idx + 1,
        }));
    }, []);

    const reindexLoss = useCallback((arr) => {
        return arr.map((row, idx) => ({
            ...row,
            no: idx + 1,
        }));
    }, []);

    const reindexProblem = useCallback((arr) => {
        return arr.map((row, idx) => ({
            ...row,
            no: idx + 1,
        }));
    }, []);

    /* UPDATE FUNCTIONS - MEMOIZED */
    const updateTemp = useCallback((r, c, key, value) => {
        setTempHoseData((prev) => {
            const next = prev.map((row) => row.map((cell) => ({ ...cell })));
            next[r][c][key] = value;
            return next;
        });
    }, []);

    const updateGlue = useCallback((i, key, value) => {
        setGlueData((p) => {
            const n = [...p];
            n[i] = { ...n[i], [key]: value };
            if (i === p.length - 1 && (value?.trim() !== "")) {
                n.push({ no: n.length + 1, jam: "", qtyKg: "" });
            }
            return reindexGlue(n);
        });
    }, [reindexGlue]);

    const updateLoss = useCallback((i, key, value) => {
        setLossData((p) => {
            const n = [...p];
            n[i] = { ...n[i], [key]: value };
            if (i === p.length - 1 && value.trim() !== "") {
                n.push({
                    no: n.length + 1,
                    namaProduk: "",
                    carton: "",
                    paper: "",
                });
            }
            return reindexLoss(n);
        });
    }, [reindexLoss]);

    const updateProblem = useCallback((i, key, value) => {
        setProblemData((p) => {
            const n = [...p];
            n[i] = { ...n[i], [key]: value };
            if (i === p.length - 1 && value.trim() !== "") {
                n.push({
                    no: n.length + 1,
                    stop: "",
                    start: "",
                    durasi: "",
                    masalah: "",
                    correctiveAction: "",
                    pic: "",
                });
            }
            return reindexProblem(n);
        });
    }, [reindexProblem]);

    const deleteGlue = useCallback((index) => {
        setGlueData((prev) => {
            if (prev.length <= 1) return prev;
            const n = prev.filter((_, i) => i !== index);
            return reindexGlue(n);
        });
    }, [reindexGlue]);

    const deleteLoss = useCallback((index) => {
        setLossData((prev) => {
            if (prev.length <= 1) return prev;
            const n = prev.filter((_, i) => i !== index);
            return reindexLoss(n);
        });
    }, [reindexLoss]);

    const deleteProblem = useCallback((index) => {
        setProblemData((prev) => {
            if (prev.length <= 1) return prev;
            const n = prev.filter((_, i) => i !== index);
            return reindexProblem(n);
        });
    }, [reindexProblem]);

    // Time Picker Handlers
    const openGlueTimePicker = useCallback((index, currentValue) => {
        setTimePickerTarget({ type: 'glue', index, value: currentValue });
        setTimePickerVisible(true);
    }, []);

    const openProblemTimePicker = useCallback((index, field, currentValue) => {
        setTimePickerTarget({ type: 'problem', index, field, value: currentValue });
        setTimePickerVisible(true);
    }, []);

    const handleTimeSelect = useCallback((time) => {
        if (!timePickerTarget) return;

        if (timePickerTarget.type === 'glue') {
            updateGlue(timePickerTarget.index, 'jam', time);
        } else if (timePickerTarget.type === 'problem') {
            updateProblem(timePickerTarget.index, timePickerTarget.field, time);
        }
    }, [timePickerTarget, updateGlue, updateProblem]);

    const closeTimePicker = useCallback(() => {
        setTimePickerVisible(false);
        setTimePickerTarget(null);
    }, []);

    // Memoized header columns for temperature table
    const tempHeaderColumns = useMemo(() => (
        Array(12).fill(0).map((_, i) => (
            <View key={i} style={styles.tempHeaderCellWrapper}>
                <Text style={styles.tempHeaderCell}>JAM</Text>
            </View>
        ))
    ), []);

    /* RENDER */
    return (
        <ScrollView
            style={styles.container}
            nestedScrollEnabled={true}
            removeClippedSubviews={Platform.OS === 'android'}
            showsVerticalScrollIndicator={true}
        >
            <ReportHeader
                title="LAPORAN ARTEMA & SMS CARDBOARD PACKER (A, B, D)"
                headerMeta={{
                    frm: "FIL-080-02",
                    rev: "",
                    berlaku: "21 Juli 2023",
                    hal: ""
                }}
            />

            {/* HEADER CARD */}
            <Section title="Informasi Produk" defaultOpen={true}>
                <View style={styles.grid2}>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nama Produk</Text>
                        <TextInput style={styles.input} value={namaProduk} onChangeText={setNamaProduk} />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Kode Produksi</Text>
                        <TextInput style={styles.input} value={kodeProduksi} onChangeText={setKodeProduksi} />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Line MC</Text>
                        <TextInput style={styles.input} value={lineMc} onChangeText={setLineMc} />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Kode Kadaluwarsa</Text>
                        <TextInput style={styles.input} value={kodeKadaluwarsa} onChangeText={setKodeKadaluwarsa} />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Hours Stop</Text>
                        <TextInput
                            style={styles.input}
                            value={hoursStop}
                            onChangeText={setHoursStop}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Hours Start</Text>
                        <TextInput
                            style={styles.input}
                            value={hoursStart}
                            onChangeText={setHoursStart}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Start Produksi</Text>
                        <TextInput style={styles.input} value={startProduksi} onChangeText={setStartProduksi} />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Stop Produksi</Text>
                        <TextInput style={styles.input} value={stopProduksi} onChangeText={setStopProduksi} />
                    </View>
                </View>
            </Section>

            {/* TEMPERATURE HOSE */}
            <Section title="Pemeriksaan Temperature Hose (3 Jam)">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    removeClippedSubviews={Platform.OS === 'android'}
                >
                    <View style={styles.tempTable}>
                        {/* HEADER BAR */}
                        <View style={styles.tempHeaderRow}>
                            <View style={styles.tempLabelHeader}>
                                <Text style={styles.tempHeaderCell}>TEMP</Text>
                            </View>
                            {tempHeaderColumns}
                        </View>

                        {/* TANK ROW */}
                        <View style={styles.tempRow}>
                            <View style={styles.tempLabelCell}>
                                <Text style={styles.tempRowLabel}>TANK</Text>
                            </View>
                            {tempHoseData[0].map((cell, col) => (
                                <TankCell
                                    key={col}
                                    col={col}
                                    value={cell.tank}
                                    updateTemp={updateTemp}
                                />
                            ))}
                        </View>

                        {/* ROW 1–4 */}
                        {[1, 2, 3, 4].map((rowIdx) => (
                            <View key={rowIdx} style={styles.tempRow}>
                                <View style={styles.tempLabelCell}>
                                    <Text style={styles.tempRowLabel}>{rowIdx}</Text>
                                </View>
                                {tempHoseData[rowIdx].map((cell, col) => (
                                    <TempCell
                                        key={col}
                                        rowIdx={rowIdx}
                                        col={col}
                                        cell={cell}
                                        updateTemp={updateTemp}
                                    />
                                ))}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </Section>

            {/* GLUE */}
            <Section title="Penambahan Glue">
                <View style={styles.dataTable}>
                    <View style={styles.dataHeaderRow}>
                        <Text style={[styles.dataHeaderCell, { width: 40 }]}>No</Text>
                        <Text style={[styles.dataHeaderCell, { flex: 1 }]}>Jam</Text>
                        <Text style={[styles.dataHeaderCell, { flex: 1 }]}>Qty (Kg)</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {glueData.map((row, i) => (
                        <GlueRow
                            key={i}
                            row={row}
                            index={i}
                            updateGlue={updateGlue}
                            deleteGlue={deleteGlue}
                            onOpenTimePicker={openGlueTimePicker}
                        />
                    ))}
                </View>
            </Section>

            {/* LOSS */}
            <Section title="Loss Carton & Paper">
                <View style={styles.dataTable}>
                    <View style={styles.dataHeaderRow}>
                        <Text style={[styles.dataHeaderCell, { flex: 1.5 }]}>Nama Produk</Text>
                        <Text style={[styles.dataHeaderCell, { flex: 1 }]}>Carton</Text>
                        <Text style={[styles.dataHeaderCell, { flex: 1 }]}>Paper</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {lossData.map((row, i) => (
                        <LossRow
                            key={i}
                            row={row}
                            index={i}
                            updateLoss={updateLoss}
                            deleteLoss={deleteLoss}
                        />
                    ))}
                </View>
            </Section>

            {/* PROBLEM */}
            <Section title="Problem Saat Produksi">
                <ScrollView
                    horizontal
                    nestedScrollEnabled={true}
                    removeClippedSubviews={Platform.OS === 'android'}
                    showsHorizontalScrollIndicator={true}
                >
                    <View style={styles.dataTable}>
                        <View style={styles.dataHeaderRow}>
                            <Text style={[styles.dataHeaderCell, { width: 70 }]}>Stop</Text>
                            <Text style={[styles.dataHeaderCell, { width: 70 }]}>Start</Text>
                            <Text style={[styles.dataHeaderCell, { width: 70 }]}>Durasi</Text>
                            <Text style={[styles.dataHeaderCell, { width: 200 }]}>Masalah</Text>
                            <Text style={[styles.dataHeaderCell, { width: 200 }]}>Corrective Action</Text>
                            <Text style={[styles.dataHeaderCell, { width: 80 }]}>PIC</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {problemData.map((row, i) => (
                            <ProblemRow
                                key={i}
                                row={row}
                                index={i}
                                updateProblem={updateProblem}
                                deleteProblem={deleteProblem}
                                onOpenTimePicker={openProblemTimePicker}
                            />
                        ))}
                    </View>
                </ScrollView>
            </Section>

            {/* CATATAN */}
            <Section title="Catatan">
                <TextInput
                    style={styles.notesInput}
                    multiline
                    placeholder="Tambahkan catatan..."
                    placeholderTextColor="#999"
                    value={catatan}
                    onChangeText={setCatatan}
                />
            </Section>

            {/* TIME PICKER MODAL */}
            <TimePickerModal
                visible={timePickerVisible}
                onClose={closeTimePicker}
                onSelect={handleTimeSelect}
                initialValue={timePickerTarget?.value || "00:00"}
            />

        </ScrollView>
    );
};

/* style */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f6f7f8",
        padding: 12,
    },
    sectionCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#eaf2ee",
        padding: 12,
        borderBottomWidth: 1,
        borderColor: "#d9e7dc",
    },
    sectionHeaderText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#2f5d43",
    },
    chevron: {
        fontSize: 17,
        color: "#2f5d43",
    },
    sectionBody: {
        padding: 12,
    },
    grid2: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    formGroup: {
        width: "48%",
        marginBottom: 10,
    },
    label: {
        fontSize: 12,
        marginBottom: 4,
        color: "#333",
        fontWeight: "600",
    },
    input: {
        borderWidth: 1,
        borderColor: "#cdd4d1",
        backgroundColor: "#fff",
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        fontSize: 13,
        color: "#000",
    },
    // TEMPERATURE TABLE STYLES (IMPROVED)
    tempTable: {
        borderWidth: 1,
        borderColor: "#d7e9dd",
        borderRadius: 8,
        overflow: "hidden",
    },
    tempHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#d7e9dd",
    },
    tempLabelHeader: {
        width: 60,
        paddingVertical: 10,
        borderRightWidth: 1,
        borderColor: "#c5d6c9",
        justifyContent: "center",
        alignItems: "center",
    },
    tempHeaderCellWrapper: {
        width: 90, // Increased from 70 to give more space
        paddingVertical: 10,
        borderRightWidth: 1,
        borderColor: "#c5d6c9",
        justifyContent: "center",
        alignItems: "center",
    },
    tempHeaderCell: {
        textAlign: "center",
        fontWeight: "700",
        fontSize: 11,
        color: "#2f5d43",
    },
    tempRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderColor: "#e5e5e5",
        backgroundColor: "#fff",
    },
    tempLabelCell: {
        width: 60,
        paddingVertical: 8,
        borderRightWidth: 1,
        borderColor: "#e5e5e5",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8faf9",
    },
    tempRowLabel: {
        textAlign: "center",
        fontSize: 12,
        fontWeight: "700",
        color: "#333",
    },
    // Tank cell wrapper
    tankCellWrapper: {
        width: 90,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRightWidth: 1,
        borderColor: "#e5e5e5",
        justifyContent: "center",
        alignItems: "center",
    },
    tankCellInput: {
        width: 70,
        height: 36,
        borderWidth: 1,
        borderColor: "#cdd4d1",
        backgroundColor: "#fff",
        borderRadius: 6,
        textAlign: "center",
        fontSize: 13,
        color: "#000",
    },
    // H/N cell wrapper
    tempCellWrapper: {
        width: 90, // Increased from 70
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRightWidth: 1,
        borderColor: "#e5e5e5",
        paddingVertical: 6,
        paddingHorizontal: 4,
        gap: 2, // Add gap between elements
    },
    tempHalfInput: {
        width: 32, // Slightly increased
        height: 34,
        borderWidth: 1,
        borderColor: "#cdd4d1",
        backgroundColor: "#fff",
        borderRadius: 5,
        textAlign: "center",
        fontSize: 12,
        color: "#000",
    },
    tempSlash: {
        fontSize: 14,
        color: "#666",
        marginHorizontal: 2,
        fontWeight: "500",
    },
    // DATA TABLE STYLES
    dataTable: {
        borderWidth: 1,
        borderColor: "#cdd4d1",
        borderRadius: 8,
        overflow: "hidden",
    },
    dataHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#e7eceb",
    },
    dataHeaderCell: {
        padding: 10,
        textAlign: "center",
        fontWeight: "700",
        fontSize: 12,
        borderRightWidth: 1,
        borderColor: "#cdd4d1",
        color: "#333",
    },
    dataRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderColor: "#eee",
        minHeight: 44,
        alignItems: "center",
    },
    dataCellText: {
        padding: 10,
        textAlign: "center",
        fontSize: 12,
        borderRightWidth: 1,
        borderColor: "#eee",
        color: "#333",
    },
    dataInput: {
        borderWidth: 0,
        paddingHorizontal: 10,
        paddingVertical: 10,
        fontSize: 12,
        color: "#000",
        backgroundColor: "#fff",
        borderRightWidth: 1,
        borderColor: "#eee",
    },
    dataInputTouchable: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: "#fff",
        borderRightWidth: 1,
        borderColor: "#eee",
        justifyContent: "center",
    },
    dataInputText: {
        fontSize: 12,
        color: "#000",
        textAlign: "center",
    },
    placeholderText: {
        color: "#999",
    },
    notesInput: {
        borderWidth: 1,
        borderColor: "#cdd4d1",
        borderRadius: 8,
        minHeight: 80,
        padding: 10,
        backgroundColor: "#fff",
        fontSize: 13,
        color: "#000",
        textAlignVertical: "top",
    },
    deleteBtn: {
        width: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    deleteText: {
        color: "#c0392b",
        fontSize: 16,
        fontWeight: "bold",
    },
    // TIME PICKER MODAL STYLES
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    timePickerContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        width: 280,
        maxHeight: 400,
    },
    timePickerTitle: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 16,
        color: "#333",
    },
    timePickerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    timePickerColumn: {
        alignItems: "center",
        width: 80,
    },
    timePickerLabel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 8,
    },
    timePickerScroll: {
        height: 180,
        width: 70,
    },
    timeOption: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginVertical: 2,
    },
    timeOptionSelected: {
        backgroundColor: "#2f5d43",
    },
    timeOptionText: {
        fontSize: 16,
        textAlign: "center",
        color: "#333",
    },
    timeOptionTextSelected: {
        color: "#fff",
        fontWeight: "600",
    },
    timeSeparator: {
        fontSize: 24,
        fontWeight: "700",
        marginHorizontal: 10,
        color: "#333",
    },
    timePickerButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        gap: 12,
    },
    timePickerCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ccc",
        alignItems: "center",
    },
    timePickerCancelText: {
        fontSize: 14,
        color: "#666",
    },
    timePickerConfirmBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: "#2f5d43",
        alignItems: "center",
    },
    timePickerConfirmText: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "600",
    },
});

export default ArtemaCardboardInspectionTable;