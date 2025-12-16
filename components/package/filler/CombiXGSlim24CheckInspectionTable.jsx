import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { api } from "../../../utils/axiosInstance";

export default function CombiXGSlim24CheckInspectionTable({ 
    // ✅ FIX: Menerima props langsung, bukan dari route
    plant,
    line,
    machine,
    packageName,
    onDataChange,   // ✅ FIX: Callback ke parent
    initialData,    // ✅ FIX: Data awal dari parent
}) {
    const [page, setPage] = useState(1);

    const [data, setData] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [values, setValues] = useState({});

    useEffect(() => {
        loadMaster();
    }, [page]);

    // ✅ FIX: Load initial data jika ada
    useEffect(() => {
        if (initialData && initialData.length > 0) {
            const initial = initialData[0];
            if (initial?.values) {
                setValues(initial.values);
            }
            if (initial?.page) {
                setPage(initial.page);
            }
        }
    }, [initialData]);

    // ✅ FIX: Kirim data ke parent setiap kali values berubah
    useEffect(() => {
        if (Object.keys(values).length > 0 || data.length > 0) {
            const combinedData = [
                {
                    values: values,
                    data: data,
                    grouped: grouped,
                    page: page,
                    packageType: packageName,
                    line: line,
                    plant: plant,
                    machine: machine,
                }
            ];
            
            onDataChange?.(combinedData);
        }
    }, [values, data, grouped, page, packageName, line, plant, machine, onDataChange]);

    const switchPage = (p) => {
        if (p !== page) {
            setPage(p);
        }
    };

    const loadMaster = async () => {
        try {
            const res = await api.get(`/xg-master?page=${page}`);

            const rows = Array.isArray(res.data?.data)
                ? res.data.data
                : [];

            const sections = {};
            rows.forEach((item) => {
                if (!sections[item.section]) sections[item.section] = [];
                sections[item.section].push(item);
            });

            setGrouped(sections);
            setData(rows);
        } catch (error) {
            console.error("Failed load XG machine master:", error);
            setGrouped({});
            setData([]);
        }
    };

    const updateValue = useCallback((id, text) => {
        setValues(prev => ({ ...prev, [id]: text }));
    }, []);

    const validateColor = (item, val) => {
        if (!val) return "#ccc";

        const num = parseFloat(val);
        if (isNaN(num)) return "#ccc";

        if (item.value_type === "range") {
            // Normal range (min & max)
            if (item.min_value !== null && item.max_value !== null) {
                return num >= item.min_value && num <= item.max_value
                    ? "#4CAF50"
                    : "#D32F2F";
            }

            // Min-only logic (use exact_value as minimum)
            if (item.exact_value !== null) {
                return num >= item.exact_value
                    ? "#4CAF50"
                    : "#D32F2F";
            }
        }

        if (item.value_type === "exact") {
            return num === item.exact_value ? "#4CAF50" : "#D32F2F";
        }
        return "#ccc";
    };

    const renderRangeHint = (item) => {
        // Jika ada range_text → tampilkan selalu
        if (item.range_text) {
            return item.range_text;
        }

        // Normal range (min & max)
        if (
            item.value_type === "range" &&
            item.min_value !== null &&
            item.max_value !== null
        ) {
            return `${item.min_value} – ${item.max_value} ${item.unit || ""}`;
        }

        // Min-only logic (exact_value sebagai minimum)
        if (
            item.value_type === "range" &&
            item.min_value === null &&
            item.exact_value !== null
        ) {
            return `Min ${item.exact_value} ${item.unit || ""}`;
        }

        // Exact
        if (item.value_type === "exact" && item.exact_value !== null) {
            return `Exact ${item.exact_value} ${item.unit || ""}`;
        }

        return null;
    };


    return (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>

            {/* PAGE SWITCH */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, page === 1 && styles.tabActive]}
                    onPress={() => switchPage(1)}
                >
                    <Text style={[styles.tabText, page === 1 && styles.tabTextActive]}>PAGE 1</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, page === 2 && styles.tabActive]}
                    onPress={() => switchPage(2)}
                >
                    <Text style={[styles.tabText, page === 2 && styles.tabTextActive]}>PAGE 2</Text>
                </TouchableOpacity>
            </View>

            {/* MAIN DATA VIEW */}
            <ScrollView>
                {Object.keys(grouped).map((section, i) => (
                    <View key={i} style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{section}</Text>

                        {grouped[section].map((item) => (
                            <View key={item.id} style={styles.row}>
                                <View style={{ width: "50%" }}>
                                    <Text style={styles.label}>{item.parameter_name}</Text>
                                    {renderRangeHint(item) && (
                                        <Text style={styles.rangeHint}>
                                            {renderRangeHint(item)}
                                        </Text>
                                    )}
                                </View>

                                <TextInput
                                    style={[
                                        styles.input,
                                        { borderColor: validateColor(item, values[item.id]) }
                                    ]}
                                    value={values[item.id] || ""}
                                    onChangeText={(txt) => updateValue(item.id, txt)}
                                    keyboardType="numeric"
                                />
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    tabRow: {
        flexDirection: "row",
        backgroundColor: "#eef5ef",
        padding: 6,
    },
    tabBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: "#fff",
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#b6cfc1",
    },
    tabActive: {
        backgroundColor: "#2e7d32",
        borderColor: "#2e7d32",
    },
    tabText: {
        color: "#2e7d32",
        fontSize: 14,
    },
    tabTextActive: {
        color: "#fff",
        fontWeight: "700",
    },

    sectionBlock: {
        marginTop: 18,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: "#ddd"
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        backgroundColor: "#d9f0e3",
        padding: 6,
        marginBottom: 8,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
    },
    rangeHint: {
        fontSize: 12,
        color: "#777",
    },
    input: {
        width: "40%",
        borderWidth: 1.4,
        borderRadius: 6,
        padding: 6,
        textAlign: "center",
    }
});