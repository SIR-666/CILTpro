import React, { useEffect, useState, useCallback, useRef } from "react";
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
} from "react-native";
import ReportHeader from "../../../components/ReportHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";

if (Platform.OS === "android") {
    UIManager.setLayoutAnimationEnabledExperimental &&
        UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Section = ({ title, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen(!open);
    };

    return (
        <View style={styles.sectionCard}>
            <TouchableOpacity onPress={toggle} style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{title}</Text>
                <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {open && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
};

const ArtemaCardboardInspectionTable = ({
    username,
    onDataChange,
    initialData = [],
}) => {
    /* HEADER FIELDS */
    const STORAGE_KEY = `artema_cardboard_${(username || "user").replace(/\s+/g, "_")}`;
    const saveTimer = useRef(null);
    const isLoaded = useRef(false);
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

    useEffect(() => {
        const save = () => {
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
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        };

        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(save, 300);
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
        }, 350);
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

    const reindexGlue = (arr) => {
        return arr.map((row, idx) => ({
            ...row,
            no: idx + 1,
        }));
    };

    const reindexLoss = (arr) => {
        return arr.map((row, idx) => ({
            ...row,
            no: idx + 1,
        }));
    };

    const reindexProblem = (arr) => {
        return arr.map((row, idx) => ({
            ...row,
            no: idx + 1,
        }));
    };

    /* UPDATE FUNCTIONS */
    const updateTemp = (r, c, key, value) => {
        setTempHoseData((prev) => {
            const next = prev.map((row) => row.map((cell) => ({ ...cell })));
            next[r][c][key] = value;
            return next;
        });
    };

    const updateGlue = (i, key, value) => {
        setGlueData((p) => {
            const n = [...p];
            n[i][key] = value;
            if (i === p.length - 1 && (value?.trim() !== "")) {
                n.push({ no: n.length + 1, jam: "", qtyKg: "" });
            }
            return reindexGlue(n);
        });
    };

    const updateLoss = (i, key, value) => {
        setLossData((p) => {
            const n = [...p];
            n[i][key] = value;
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
    };

    const updateProblem = (i, key, value) => {
        setProblemData((p) => {
            const n = [...p];
            n[i][key] = value;
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
    };

    const deleteGlue = (index) => {
        setGlueData((prev) => {
            if (prev.length <= 1) return prev; // minimal 1 row
            const n = prev.filter((_, i) => i !== index);
            return reindexGlue(n);
        });
    };

    const deleteLoss = (index) => {
        setLossData((prev) => {
            if (prev.length <= 1) return prev;
            const n = prev.filter((_, i) => i !== index);
            return reindexLoss(n);
        });
    };

    const deleteProblem = (index) => {
        setProblemData((prev) => {
            if (prev.length <= 1) return prev;
            const n = prev.filter((_, i) => i !== index);
            return reindexProblem(n);
        });
    };

    /* RENDER */
    return (
        <ScrollView style={styles.container}>
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
                        <TextInput style={styles.input} value={hoursStop} onChangeText={setHoursStop} />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Hours Start</Text>
                        <TextInput style={styles.input} value={hoursStart} onChangeText={setHoursStart} />
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
                <ScrollView horizontal>
                    <View>
                        {/* HEADER BAR */}
                        <View style={styles.tempHeaderRow}>
                            <Text style={[styles.tempHeaderCell, { width: 60 }]}>TEMP</Text>
                            {Array(12).fill(0).map((_, i) => (
                                <Text key={i} style={[styles.tempHeaderCell, { width: 70 }]}>JAM</Text>
                            ))}
                        </View>

                        {/* TANK ROW */}
                        <View style={styles.tempRow}>
                            <Text style={[styles.tempRowLabel, { width: 60 }]}>TANK</Text>
                            {tempHoseData[0].map((cell, col) => (
                                <TextInput
                                    key={col}
                                    style={[styles.tempCellInput, { width: 70 }]}
                                    placeholder="T"
                                    value={cell.tank}
                                    onChangeText={(v) => updateTemp(0, col, "tank", v)}
                                />
                            ))}
                        </View>

                        {/* ROW 1–4 */}
                        {[1, 2, 3, 4].map((rowIdx) => (
                            <View key={rowIdx} style={styles.tempRow}>
                                <Text style={[styles.tempRowLabel, { width: 60 }]}>{rowIdx}</Text>

                                {tempHoseData[rowIdx].map((cell, col) => (
                                    <View key={col} style={styles.tempCellWrapper}>
                                        <TextInput
                                            style={[styles.tempHalfInput, { width: 30 }]}
                                            placeholder="H"
                                            value={cell.hose}
                                            onChangeText={(v) => updateTemp(rowIdx, col, "hose", v)}
                                        />
                                        <Text style={{ marginHorizontal: 2 }}>/</Text>
                                        <TextInput
                                            style={[styles.tempHalfInput, { width: 30 }]}
                                            placeholder="N"
                                            value={cell.ndl}
                                            onChangeText={(v) => updateTemp(rowIdx, col, "ndl", v)}
                                        />
                                    </View>
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
                    </View>

                    {glueData.map((row, i) => (
                        <View key={i} style={[styles.dataRow, { alignItems: "center" }]}>
                            <Text style={[styles.dataCellText, { width: 40 }]}>{row.no}</Text>
                            <TextInput
                                style={[styles.dataInput, { flex: 1 }]}
                                value={row.jam}
                                onChangeText={(v) => updateGlue(i, "jam", v)}
                            />
                            <TextInput
                                style={[styles.dataInput, { flex: 1 }]}
                                value={row.qtyKg}
                                onChangeText={(v) => updateGlue(i, "qtyKg", v)}
                            />
                            <TouchableOpacity onPress={() => deleteGlue(i)} style={styles.deleteBtn}>
                                <Text style={styles.deleteText}>✕</Text>
                            </TouchableOpacity>
                        </View>
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
                    </View>

                    {lossData.map((row, i) => (
                        <View key={i} style={[styles.dataRow, { alignItems: "center" }]}>
                            <TextInput
                                style={[styles.dataInput, { flex: 1.5 }]}
                                value={row.namaProduk}
                                onChangeText={(v) => updateLoss(i, "namaProduk", v)}
                            />
                            <TextInput
                                style={[styles.dataInput, { flex: 1 }]}
                                value={row.carton}
                                onChangeText={(v) => updateLoss(i, "carton", v)}
                            />
                            <TextInput
                                style={[styles.dataInput, { flex: 1 }]}
                                value={row.paper}
                                onChangeText={(v) => updateLoss(i, "paper", v)}
                            />
                            <TouchableOpacity onPress={() => deleteLoss(i)} style={styles.deleteBtn}>
                                <Text style={styles.deleteText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </Section>

            {/* PROBLEM */}
            <Section title="Problem Saat Produksi">
                <ScrollView horizontal>
                    <View style={styles.dataTable}>
                        <View style={styles.dataHeaderRow}>
                            <Text style={[styles.dataHeaderCell, { width: 70 }]}>Stop</Text>
                            <Text style={[styles.dataHeaderCell, { width: 70 }]}>Start</Text>
                            <Text style={[styles.dataHeaderCell, { width: 70 }]}>Durasi</Text>
                            <Text style={[styles.dataHeaderCell, { width: 200 }]}>Masalah</Text>
                            <Text style={[styles.dataHeaderCell, { width: 200 }]}>Corrective Action</Text>
                            <Text style={[styles.dataHeaderCell, { width: 80 }]}>PIC</Text>
                        </View>

                        {problemData.map((row, i) => (
                            <View key={i} style={[styles.dataRow, { alignItems: "center" }]}>
                                <TextInput
                                    style={[styles.dataInput, { width: 70 }]}
                                    value={row.stop}
                                    onChangeText={(v) => updateProblem(i, "stop", v)}
                                />
                                <TextInput
                                    style={[styles.dataInput, { width: 70 }]}
                                    value={row.start}
                                    onChangeText={(v) => updateProblem(i, "start", v)}
                                />
                                <TextInput
                                    style={[styles.dataInput, { width: 70 }]}
                                    value={row.durasi}
                                    onChangeText={(v) => updateProblem(i, "durasi", v)}
                                />
                                <TextInput
                                    style={[styles.dataInput, { width: 200 }]}
                                    value={row.masalah}
                                    onChangeText={(v) => updateProblem(i, "masalah", v)}
                                />
                                <TextInput
                                    style={[styles.dataInput, { width: 200 }]}
                                    value={row.correctiveAction}
                                    onChangeText={(v) => updateProblem(i, "correctiveAction", v)}
                                />
                                <TextInput
                                    style={[styles.dataInput, { width: 80 }]}
                                    value={row.pic}
                                    onChangeText={(v) => updateProblem(i, "pic", v)}
                                />
                                <TouchableOpacity onPress={() => deleteProblem(i)} style={styles.deleteBtn}>
                                    <Text style={styles.deleteText}>✕</Text>
                                </TouchableOpacity>
                            </View>
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
                    value={catatan}
                    onChangeText={setCatatan}
                />
            </Section>

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
    tempHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#d7e9dd",
        borderBottomWidth: 1,
        borderColor: "#c5d6c9",
    },
    tempHeaderCell: {
        padding: 6,
        textAlign: "center",
        fontWeight: "700",
        fontSize: 11,
    },
    tempRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderColor: "#ddd",
        alignItems: "center",
    },
    tempRowLabel: {
        textAlign: "center",
        fontSize: 12,
        fontWeight: "700",
        color: "#333",
        backgroundColor: "#f1f4f3",
        paddingVertical: 8,
    },
    tempCellWrapper: {
        width: 70,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRightWidth: 1,
        borderColor: "#ddd",
        paddingVertical: 4,
    },
    tempCellInput: {
        width: 70,
        borderWidth: 1,
        borderColor: "#bbb",
        backgroundColor: "#fff",
        borderRadius: 5,
        height: 36,
        textAlign: "center",
    },
    tempHalfInput: {
        width: 28,
        borderWidth: 1,
        borderColor: "#bbb",
        backgroundColor: "#fff",
        borderRadius: 5,
        height: 32,
        textAlign: "center",
        marginHorizontal: 1,
    },
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
        padding: 8,
        textAlign: "center",
        fontWeight: "700",
        fontSize: 12,
        borderRightWidth: 1,
        borderColor: "#cdd4d1",
    },
    dataRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderColor: "#eee",
        minHeight: 40,
    },
    dataCellText: {
        padding: 10,
        textAlign: "center",
        fontSize: 12,
        borderRightWidth: 1,
        borderColor: "#eee",
    },
    dataInput: {
        borderWidth: 0,
        paddingHorizontal: 8,
        fontSize: 12,
        color: "#000",
        backgroundColor: "#fff",
        borderRightWidth: 1,
        borderColor: "#eee",
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
        paddingHorizontal: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    deleteText: {
        color: "#c0392b",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default ArtemaCardboardInspectionTable;