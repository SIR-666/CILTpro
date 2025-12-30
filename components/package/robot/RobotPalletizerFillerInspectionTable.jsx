import { useState, useEffect, useCallback, useRef } from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Pressable,
    TextInput,
} from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReportHeader from "../../../components/ReportHeader";
import { useFocusEffect } from "@react-navigation/native";

const pad2 = (n) => String(n).padStart(2, "0");
const formatHM = (d) =>
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

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
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    value={value || ""}
                    editable={false}
                />
            </View>
        </Pressable>
    );
};

const RobotPalletizerFillerInspectionTable = ({
    username,
    onDataChange,
    initialData = [],
    processOrder,
    product,
    shift: parentShift,       // Shift dari parent
    line: parentLine,         // Line dari parent  
    machine: parentMachine,   // Machine dari parent
    shouldClearData = false,
}) => {
    const isLoaded = useRef(false);
    const saveTimer = useRef(null);
    const lastClearState = useRef(shouldClearData);
    const STORAGE_KEY = `robot_palletizer_${(username || "user").replace(/\s+/g, "_")}`;

    // Header form - auto-fill mesinLine dari parent
    const [formData, setFormData] = useState({
        mesinLine: "",
        kodeProd: "",
        kodeExpire: "",
    });

    // Detail row generator - shift kosong, akan di-fill saat expand
    const makeEmptyRow = useCallback((i) => ({
        id: i,
        shift: "",  // Shift akan di-fill saat expand
        var: "",
        iprp: "",
        lclexp: "",
        vol: "",
        palletNo: "",
        cartonNo: "",
        ctn: "",
        jam: "",
        jumlah: "",
        keterangan: "",
        user: "",
        time: "",
    }), []);

    // Detail rows
    const [tableData, setTableData] = useState(() => {
        if (Array.isArray(initialData) && initialData.length > 0) {
            return initialData.map((d, i) => ({
                ...makeEmptyRow(i + 1),
                ...(d || {}),
            }));
        }
        return [makeEmptyRow(1), makeEmptyRow(2), makeEmptyRow(3)];
    });

    const [expandedId, setExpandedId] = useState(
        tableData.length > 0 ? tableData[0].id : null
    );

    // Auto-fill mesinLine ketika parentLine atau parentMachine berubah
    useEffect(() => {
        if (parentLine || parentMachine) {
            const autoMesinLine = [parentMachine, parentLine].filter(Boolean).join(" / ");
            setFormData(prev => ({
                ...prev,
                mesinLine: autoMesinLine, // Selalu update dari parent
            }));
        }
    }, [parentLine, parentMachine]);

    useEffect(() => {
        const load = async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const d = JSON.parse(raw);
                    if (d.formData) {
                        // mesinLine akan di-override oleh parent, jadi hanya load kodeProd & kodeExpire
                        const autoMesinLine = [parentMachine, parentLine].filter(Boolean).join(" / ");
                        setFormData({
                            mesinLine: autoMesinLine,
                            kodeProd: d.formData.kodeProd || "",
                            kodeExpire: d.formData.kodeExpire || "",
                        });
                    }
                    if (d.rows) {
                        const rows = d.rows.map((r, i) => ({
                            ...makeEmptyRow(i + 1),
                            ...(r || {}),
                        }));
                        setTableData(rows);
                        setExpandedId(rows[0]?.id || null);
                    }
                    isLoaded.current = true;
                    return;
                }
                if (initialData.length > 0) {
                    const d = initialData[0];
                    if (d.formData) {
                        const autoMesinLine = [parentMachine, parentLine].filter(Boolean).join(" / ");
                        setFormData({
                            mesinLine: autoMesinLine,
                            kodeProd: d.formData.kodeProd || "",
                            kodeExpire: d.formData.kodeExpire || "",
                        });
                    }
                    if (d.rows) setTableData(d.rows);
                }
                isLoaded.current = true;
            } catch (e) {
                console.log("load error:", e);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (!isLoaded.current) return;

        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            const payload = {
                formData,
                rows: tableData,
                savedAt: new Date().toISOString(),
            };

            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

            if (onDataChange) {
                onDataChange([{ id: 1, ...payload, user: username }]);
            }
        }, 350);
    }, [formData, tableData]);

    const handleFormChange = (text, field) => {
        setFormData((prev) => ({
            ...prev,
            [field]: text,
        }));
    };

    const handleInputChange = useCallback(
        (index, field, value) => {
            setTableData((prev) => {
                const next = [...prev];
                const row = { ...next[index] };

                row[field] = value;
                row.user = username;
                row.time = formatHM(new Date());

                next[index] = row;

                // Auto-add new row kalau row terakhir sudah ada isi
                if (index === next.length - 1 && value.trim() !== "" && next.length < 50) {
                    const hasContent = Object.keys(row).some(
                        (k) => k !== "id" && k !== "user" && k !== "time" && row[k]
                    );
                    if (hasContent) {
                        next.push(makeEmptyRow(next.length + 1));
                    }
                }

                return next;
            });
        },
        [username, makeEmptyRow]
    );

    // Handle expand accordion - auto-fill shift saat pertama kali expand
    const handleExpand = useCallback((itemId) => {
        setExpandedId(prev => {
            const isOpening = prev !== itemId;
            
            // Jika sedang membuka (expand), auto-fill shift jika belum ada
            if (isOpening && parentShift) {
                setTableData(prevData => prevData.map(row => {
                    if (row.id === itemId && !row.shift) {
                        return { ...row, shift: parentShift };
                    }
                    return row;
                }));
            }
            
            return isOpening ? itemId : null;
        });
    }, [parentShift]);

    const removeRow = (index) => {
        setTableData((prev) => {
            let updated = [...prev];
            updated.splice(index, 1);
            if (updated.length === 0) {
                updated = [makeEmptyRow(1)];
            }
            updated = updated.map((r, i) => ({ ...r, id: i + 1 }));
            if (!updated.find((r) => r.id === expandedId)) {
                setExpandedId(updated[0]?.id || null);
            }
            return updated;
        });
    };

    const addManualRow = () => {
        setTableData((prev) => {
            const nextId = (prev[prev.length - 1]?.id || prev.length) + 1;
            return [...prev, makeEmptyRow(nextId)];
        });
    };

    const isRowComplete = (row) => {
        return row.shift && row.var && row.jumlah;
    };

    const totalWarehouse = tableData
        .map((r) => parseFloat(r?.jumlah || 0))
        .filter((n) => !isNaN(n))
        .reduce((a, b) => a + b, 0);

    // Auto-append row ketika row terakhir complete
    useEffect(() => {
        if (!tableData || tableData.length === 0) return;

        const last = tableData[tableData.length - 1];
        if (isRowComplete(last)) {
            setTableData((prev) => {
                const pLast = prev[prev.length - 1];
                if (!isRowComplete(pLast)) return prev;
                const nextId = (prev[prev.length - 1]?.id || prev.length) + 1;
                return [...prev, makeEmptyRow(nextId)];
            });
        }
    }, [tableData, makeEmptyRow]);

    // Function untuk reset semua data
    const clearAllData = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);

            const autoMesinLine = [parentMachine, parentLine].filter(Boolean).join(" / ");
            setFormData({
                mesinLine: autoMesinLine,
                kodeProd: "",
                kodeExpire: "",
            });

            const emptyRows = [makeEmptyRow(1), makeEmptyRow(2), makeEmptyRow(3)];
            setTableData(emptyRows);
            setExpandedId(emptyRows[0].id);

            console.log("Robot Palletizer data cleared successfully");
        } catch (error) {
            console.error("Error clearing Robot Palletizer data:", error);
        }
    }, [STORAGE_KEY, makeEmptyRow, parentLine, parentMachine]);

    // Detect perubahan shouldClearData
    useEffect(() => {
        if (shouldClearData && shouldClearData !== lastClearState.current) {
            clearAllData();
            lastClearState.current = shouldClearData;
        }
    }, [shouldClearData, clearAllData]);

    // Clear data saat screen focus jika ada flag
    useFocusEffect(
        useCallback(() => {
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

    return (
        <View style={styles.container}>
            {/* HEADER FORM */}
            <ReportHeader
                title="LAPORAN ROBOT PALLETIZER"
                headerMeta={{
                    frm: "FIL - 001 - 08",
                    rev: "",
                    berlaku: "15 Jan 2019",
                    hal: ""
                }}
            />
            {/* HEADER INPUT (MESIN, KODE PROD, EXPIRE) */}
            <View style={styles.headerForm}>
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>MESIN / LINE</Text>
                    <View style={[styles.inputLocked, styles.inputAutoFilled]}>
                        <Text style={styles.inputLockedText}>
                            {formData.mesinLine || "-"}
                        </Text>
                    </View>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>KODE PROD.</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.kodeProd}
                        placeholder="Kode Prod."
                        onChangeText={(text) => handleFormChange(text, "kodeProd")}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>KODE EXPIRE</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.kodeExpire}
                        placeholder="Kode Expire"
                        onChangeText={(text) => handleFormChange(text, "kodeExpire")}
                    />
                </View>
            </View>

            {/* LIST ENTRY (ACCORDION STYLE) */}
            <ScrollView
                style={styles.entriesScroll}
                contentContainerStyle={styles.entriesContent}
                showsVerticalScrollIndicator={false}
            >
                {tableData.map((item, index) => {
                    const isOpen = expandedId === item.id;
                    const complete = isRowComplete(item);
                    return (
                        <View key={item.id || index} style={styles.accordionCard}>
                            {/* Header accordion */}
                            <TouchableOpacity
                                onPress={() => handleExpand(item.id)}
                                style={styles.accordionHeader}
                            >
                                <View style={styles.accordionHeaderLeft}>
                                    <Text style={styles.accordionTitle}>
                                        Entry {index + 1}
                                    </Text>
                                    <Text style={styles.accordionSub}>
                                        Shift: {item.shift || "-"} | Var: {item.var || "-"}
                                    </Text>
                                    <Text style={styles.accordionSub}>
                                        Jam: {item.jam || "-"} | Jumlah: {item.jumlah || "-"}
                                    </Text>
                                </View>

                                <View style={styles.accordionHeaderRight}>
                                    <View
                                        style={[
                                            styles.statusDot,
                                            complete
                                                ? styles.statusDotGreen
                                                : item.shift || item.var || item.jumlah
                                                    ? styles.statusDotYellow
                                                    : styles.statusDotGray,
                                        ]}
                                    />
                                    <Text style={styles.accordionChevron}>
                                        {isOpen ? "▲" : "▼"}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {/* Detail accordion */}
                            {isOpen && (
                                <View style={styles.accordionBody}>
                                    {/* Audit trail */}
                                    {item.user && item.time ? (
                                        <View style={styles.auditTrail}>
                                            <Text style={styles.auditText}>User: {item.user}</Text>
                                            <Text style={styles.auditText}>Time: {item.time}</Text>
                                        </View>
                                    ) : null}

                                    {/* Row 1: SHIFT (locked) & VAR (2 kolom) */}
                                    <View style={styles.fieldRow}>
                                        <View style={styles.fieldHalf}>
                                            <Text style={styles.label}>SHIFT</Text>
                                            <View style={[styles.inputLocked, styles.inputAutoFilled]}>
                                                <Text style={styles.inputLockedText}>
                                                    {item.shift || "-"}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.fieldHalf}>
                                            <Text style={styles.label}>VAR.</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={item.var}
                                                placeholder="Variant"
                                                onChangeText={(text) =>
                                                    handleInputChange(index, "var", text)
                                                }
                                            />
                                        </View>
                                    </View>

                                    {/* Row 2: IP/RP, LCL/EXP, VOL (3 kolom - proper spacing) */}
                                    <View style={styles.fieldRow3}>
                                        <View style={styles.fieldThird}>
                                            <Text style={styles.label}>IP / RP</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={item.iprp}
                                                placeholder="IP/RP"
                                                onChangeText={(text) =>
                                                    handleInputChange(index, "iprp", text)
                                                }
                                            />
                                        </View>

                                        <View style={styles.fieldThird}>
                                            <Text style={styles.label}>LCL / EXP</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={item.lclexp}
                                                placeholder="LCL/EXP"
                                                onChangeText={(text) =>
                                                    handleInputChange(index, "lclexp", text)
                                                }
                                            />
                                        </View>

                                        <View style={styles.fieldThird}>
                                            <Text style={styles.label}>VOL</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={item.vol}
                                                placeholder="Vol"
                                                keyboardType="numeric"
                                                onChangeText={(text) =>
                                                    handleInputChange(index, "vol", text)
                                                }
                                            />
                                        </View>
                                    </View>

                                    {/* Row 3: PALLET NO & CARTON NO (2 kolom) */}
                                    <View style={styles.fieldRow}>
                                        <View style={styles.fieldHalf}>
                                            <Text style={styles.label}>PALLET NO.</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={item.palletNo}
                                                placeholder="Pallet No."
                                                keyboardType="numeric"
                                                onChangeText={(text) =>
                                                    handleInputChange(index, "palletNo", text)
                                                }
                                            />
                                        </View>

                                        <View style={styles.fieldHalf}>
                                            <Text style={styles.label}>CARTON NO.</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={item.cartonNo}
                                                placeholder="Carton No."
                                                keyboardType="numeric"
                                                onChangeText={(text) =>
                                                    handleInputChange(index, "cartonNo", text)
                                                }
                                            />
                                        </View>
                                    </View>

                                    {/* Row 4: JUMLAH CTN & WAKTU JAM (2 kolom) */}
                                    <View style={styles.fieldRow}>
                                        <View style={styles.fieldHalf}>
                                            <Text style={styles.label}>JUMLAH CTN</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={item.ctn}
                                                placeholder="CTN"
                                                keyboardType="numeric"
                                                onChangeText={(text) =>
                                                    handleInputChange(index, "ctn", text)
                                                }
                                            />
                                        </View>

                                        <View style={styles.fieldHalf}>
                                            <Text style={styles.label}>WAKTU JAM</Text>
                                            <TimeField
                                                value={item.jam}
                                                onChange={(text) =>
                                                    handleInputChange(index, "jam", text)
                                                }
                                            />
                                        </View>
                                    </View>

                                    {/* Row 5: JUMLAH (full width) */}
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.label}>JUMLAH</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={item.jumlah}
                                            placeholder="Jumlah"
                                            keyboardType="numeric"
                                            onChangeText={(text) =>
                                                handleInputChange(index, "jumlah", text)
                                            }
                                        />
                                    </View>

                                    {/* Row 6: KETERANGAN (full width) */}
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.label}>KETERANGAN</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={item.keterangan}
                                            placeholder="Keterangan"
                                            multiline
                                            numberOfLines={3}
                                            onChangeText={(text) =>
                                                handleInputChange(index, "keterangan", text)
                                            }
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => removeRow(index)}
                                    >
                                        <Text style={styles.deleteText}>Hapus Entry</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* tombol tambah entry manual */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={addManualRow}
                >
                    <Text style={styles.addButtonText}>+ Tambah Entry</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* FOOTER */}
            <View style={styles.footerContainer}>
                <Text style={styles.footerText}>JUMLAH YANG DITERIMA WAREHOUSE</Text>
                <View style={styles.footerBoxEnhanced}>
                    <Text style={styles.footerBoxTitle}>TOTAL</Text>
                    <Text style={styles.footerBoxValue}>{totalWarehouse}</Text>
                </View>
            </View>

            {/* STATUS */}
            <View style={styles.statusContainer}>
                <View style={styles.statusIndicator}>
                    <View style={styles.savedIndicator} />
                    <Text style={styles.statusText}>Data tersimpan otomatis</Text>
                </View>
            </View>
        </View>
    );
};

// STYLES
const cardShadow = {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fff",
        padding: 12,
        flex: 1,
    },

    // HEADER FORM MESIN / KODE / EXPIRE
    headerForm: {
        backgroundColor: "#f9fafb",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        ...cardShadow,
    },

    // ENTRY LIST
    entriesScroll: {
        flex: 1,
        marginTop: 4,
    },
    entriesContent: {
        paddingBottom: 16,
    },

    accordionCard: {
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 10,
        ...cardShadow,
    },
    accordionHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#e8f4fd",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    accordionHeaderLeft: {
        flex: 1,
    },
    accordionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1e3a5f",
        marginBottom: 2,
    },
    accordionSub: {
        fontSize: 11,
        color: "#4b5563",
    },
    accordionHeaderRight: {
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 2,
    },
    statusDotGreen: {
        backgroundColor: "#22c55e",
    },
    statusDotYellow: {
        backgroundColor: "#eab308",
    },
    statusDotGray: {
        backgroundColor: "#9ca3af",
    },
    accordionChevron: {
        fontSize: 11,
        color: "#374151",
    },
    accordionBody: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 8,
    },

    auditTrail: {
        marginBottom: 12,
        padding: 8,
        backgroundColor: "#f0f9ff",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#bae6fd",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    auditText: {
        fontSize: 11,
        color: "#0369a1",
    },

    // Field styling
    fieldGroup: {
        marginBottom: 12,
    },
    label: {
        fontSize: 11,
        fontWeight: "600",
        marginBottom: 6,
        color: "#374151",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    input: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: "#1f2937",
        backgroundColor: "#fff",
    },
    inputAutoFilled: {
        backgroundColor: "#f0fdf4",
        borderColor: "#86efac",
    },
    inputLocked: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#f3f4f6",
        justifyContent: "center",
    },
    inputLockedText: {
        fontSize: 14,
        color: "#374151",
        fontWeight: "500",
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: "top",
    },

    // Row layout - 2 kolom
    fieldRow: {
        flexDirection: "row",
        marginBottom: 12,
        gap: 12,
    },
    fieldHalf: {
        flex: 1,
    },

    // Row layout - 3 kolom (proper spacing)
    fieldRow3: {
        flexDirection: "row",
        marginBottom: 12,
        gap: 8,
    },
    fieldThird: {
        flex: 1,
        minWidth: 0, // Prevent overflow
    },

    deleteButton: {
        marginTop: 8,
        backgroundColor: "#ef4444",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    deleteText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },

    addButton: {
        marginTop: 6,
        backgroundColor: "#10b981",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    addButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },

    footerContainer: {
        flexDirection: "column",
        paddingVertical: 14,
        paddingHorizontal: 10,
        backgroundColor: "#F0FDF4",
        borderRadius: 10,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#86efac",
    },
    footerText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#166534",
        textAlign: "center",
        marginBottom: 10,
    },
    footerBoxEnhanced: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        borderWidth: 1,
        borderColor: "#a7f3d0",
    },
    footerBoxTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0d9488",
        marginBottom: 4,
    },
    footerBoxValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#065f46",
    },
    statusContainer: {
        padding: 10,
        backgroundColor: "#f9f9f9",
        alignItems: "center",
        marginTop: 6,
        borderRadius: 6,
    },
    statusIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    savedIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#4CAF50",
    },
    statusText: {
        fontSize: 12,
        color: "#666",
        fontStyle: "italic",
    },
});

export default RobotPalletizerFillerInspectionTable;
