import React, { useState, memo, useEffect, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";

const emptyRow = {
    col1: "", col2: "", col3: "",
    col4: "", col5: "", col6: "",
    col7: "", col8: "", col9: "",
    col10: "", col11: "", col12: "",
};

const CombiXGSlim24ProductInspectionTable = memo(({ 
    onDataChange,  // ✅ FIX: Menerima callback dari parent
    initialData,   // ✅ FIX: Menerima initial data dari parent
    plant,
    line,
    machine,
    packageName,
}) => {
    // Form state untuk informasi produk
    const [productInfo, setProductInfo] = useState({
        productName: "",
        productionDate: "",
        dateShift: "",
        expiredDate: "",
        prodStart: "",
        hourMeterStart: "",
        prodStop: "",
        hourMeterStop: "",
        cartonSuckedOff: "",
        cartonFilled: "",
        cartonDiverted: "",
        cartonProduced: "",
    });

    const [paperRows, setPaperRows] = useState([emptyRow, emptyRow, emptyRow]);

    // ✅ FIX: Load initial data jika ada
    useEffect(() => {
        if (initialData && initialData.length > 0) {
            const initial = initialData[0];
            if (initial?.productInfo) {
                setProductInfo(initial.productInfo);
            }
            if (initial?.paperRows && initial.paperRows.length > 0) {
                setPaperRows(initial.paperRows);
            }
        }
    }, [initialData]);

    // ✅ FIX: Kirim data ke parent setiap kali berubah
    useEffect(() => {
        const combinedData = [
            {
                productInfo: productInfo,
                paperRows: paperRows.filter(row => 
                    Object.values(row).some(v => v && v.toString().trim() !== "")
                ),
                packageType: packageName,
                line: line,
                plant: plant,
                machine: machine,
            }
        ];
        
        onDataChange?.(combinedData);
    }, [productInfo, paperRows, packageName, line, plant, machine, onDataChange]);

    // Handler untuk update product info
    const handleProductInfoChange = useCallback((field, value) => {
        setProductInfo(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const handleInputChange = (rowIndex, field, value) => {
        const updated = [...paperRows];
        updated[rowIndex][field] = value;
        setPaperRows(updated);

        const lastRow = updated[updated.length - 1];
        const allFilled = Object.values(lastRow).every((v) => v !== "");

        if (allFilled) {
            setPaperRows([...updated, { ...emptyRow }]);
        }
    };

    return (
        <ScrollView nestedScrollEnabled>
            <View style={styles.container}>

                {/* TITLE */}
                <Text style={styles.title}>INFORMASI PRODUK</Text>

                {/* ROW 1 */}
                <View style={styles.row}>
                    <View style={styles.cell}>
                        <Text style={styles.label}>Product Name</Text>
                        <TextInput 
                            style={styles.input}
                            value={productInfo.productName}
                            onChangeText={(v) => handleProductInfoChange('productName', v)}
                        />
                    </View>

                    <View style={styles.cell}>
                        <Text style={styles.label}>Production Date</Text>
                        <TextInput 
                            style={styles.input}
                            value={productInfo.productionDate}
                            onChangeText={(v) => handleProductInfoChange('productionDate', v)}
                        />
                    </View>
                </View>

                {/* ROW 2 */}
                <View style={styles.row}>
                    <View style={styles.cell}>
                        <Text style={styles.label}>Date / Shift</Text>
                        <TextInput 
                            style={styles.input}
                            value={productInfo.dateShift}
                            onChangeText={(v) => handleProductInfoChange('dateShift', v)}
                        />
                    </View>

                    <View style={styles.cell}>
                        <Text style={styles.label}>Expired Date</Text>
                        <TextInput 
                            style={styles.input}
                            value={productInfo.expiredDate}
                            onChangeText={(v) => handleProductInfoChange('expiredDate', v)}
                        />
                    </View>
                </View>

                {/* ROW 3 */}
                <View style={styles.row}>
                    <View style={styles.cell}>
                        <Text style={styles.label}>Prod Start</Text>
                        <TextInput 
                            style={styles.input}
                            value={productInfo.prodStart}
                            onChangeText={(v) => handleProductInfoChange('prodStart', v)}
                        />
                    </View>

                    <View style={styles.cell}>
                        <Text style={styles.label}>Hour Meter Start</Text>
                        <TextInput 
                            style={styles.input}
                            value={productInfo.hourMeterStart}
                            onChangeText={(v) => handleProductInfoChange('hourMeterStart', v)}
                        />
                    </View>
                </View>

                {/* ROW 4 */}
                <View style={styles.row}>
                    <View style={styles.cell}>
                        <Text style={styles.label}>Prod Stop</Text>
                        <TextInput 
                            style={styles.input}
                            value={productInfo.prodStop}
                            onChangeText={(v) => handleProductInfoChange('prodStop', v)}
                        />
                    </View>

                    <View style={styles.cell}>
                        <Text style={styles.label}>Hour Meter Stop</Text>
                        <TextInput 
                            style={styles.input}
                            value={productInfo.hourMeterStop}
                            onChangeText={(v) => handleProductInfoChange('hourMeterStop', v)}
                        />
                    </View>
                </View>

                {/* CARTON SECTION */}
                <View style={styles.row}>
                    <View style={styles.cell}>
                        <Text style={styles.label}>Carton Sucked Off</Text>
                        <View style={styles.rowRight}>
                            <TextInput 
                                style={styles.input}
                                value={productInfo.cartonSuckedOff}
                                onChangeText={(v) => handleProductInfoChange('cartonSuckedOff', v)}
                                keyboardType="numeric"
                            />
                            <Text style={styles.pcs}>pcs</Text>
                        </View>
                    </View>

                    <View style={styles.cell}>
                        <Text style={styles.label}>Carton Filled</Text>
                        <View style={styles.rowRight}>
                            <TextInput 
                                style={styles.input}
                                value={productInfo.cartonFilled}
                                onChangeText={(v) => handleProductInfoChange('cartonFilled', v)}
                                keyboardType="numeric"
                            />
                            <Text style={styles.pcs}>pcs</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.cell}>
                        <Text style={styles.label}>Carton Diverted</Text>
                        <View style={styles.rowRight}>
                            <TextInput 
                                style={styles.input}
                                value={productInfo.cartonDiverted}
                                onChangeText={(v) => handleProductInfoChange('cartonDiverted', v)}
                                keyboardType="numeric"
                            />
                            <Text style={styles.pcs}>pcs</Text>
                        </View>
                    </View>

                    <View style={styles.cell}>
                        <Text style={styles.label}>Carton Produced</Text>
                        <View style={styles.rowRight}>
                            <TextInput 
                                style={styles.input}
                                value={productInfo.cartonProduced}
                                onChangeText={(v) => handleProductInfoChange('cartonProduced', v)}
                                keyboardType="numeric"
                            />
                            <Text style={styles.pcs}>pcs</Text>
                        </View>
                    </View>
                </View>

                {/* PAPER SECTION */}
                <Text style={styles.title}>PAPER AKKLIMATISASI</Text>

                <View style={styles.paperHeaderRow}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <React.Fragment key={i}>
                            <Text style={styles.paperHeader}>Box No</Text>
                            <Text style={styles.paperHeader}>Start Date</Text>
                            <Text style={styles.paperHeader}>Start Time</Text>
                        </React.Fragment>
                    ))}
                </View>

                {/* AUTO ROWS */}
                {paperRows.map((r, rowIndex) => (
                    <View key={rowIndex} style={styles.paperRow}>
                        {Object.keys(r).map((col) => (
                            <TextInput
                                key={col}
                                value={r[col]}
                                style={styles.paperInput}
                                onChangeText={(v) => handleInputChange(rowIndex, col, v)}
                            />
                        ))}
                    </View>
                ))}

            </View>
        </ScrollView>
    );
});

const styles = StyleSheet.create({
    container: { padding: 10, backgroundColor: "#fff" },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        paddingBottom: 5,
        marginVertical: 10,
        borderBottomWidth: 2,
    },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    cell: { width: "48%" },
    label: { marginBottom: 5, fontWeight: "600" },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        borderRadius: 6,
    },
    rowRight: { flexDirection: "row", alignItems: "center" },
    pcs: { marginLeft: 6, fontWeight: "bold" },
    paperHeaderRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 5 },
    paperHeader: { width: "25%", fontWeight: "700", marginBottom: 3 },
    paperRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
    paperInput: {
        width: "25%",
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 8,
        borderRadius: 5,
        marginBottom: 5,
    },
});

export default CombiXGSlim24ProductInspectionTable;