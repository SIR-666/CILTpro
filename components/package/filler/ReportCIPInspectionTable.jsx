import React, { useState, useEffect } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Icon from "react-native-vector-icons/MaterialIcons";
import moment from "moment";

const COLORS = {
    blue: "#1E88E5",
    lightBlue: "#E3F2FD",
    black: "#000000",
    darkGray: "#757575",
    green: "#4CAF50",
    red: "#F44336",
    orange: "#FF9800",
};

const ReportCIPInspectionTable = ({ cipData, onSave, isEditable = true }) => {
    const [cipSteps, setCipSteps] = useState([
        {
            stepNumber: 1,
            stepName: "COLD RINSE",
            temperatureSetpointMin: "20",
            temperatureSetpointMax: "35",
            timeSetpoint: "8",
            temperatureActual: "",
            timeActual: "8",
            startTime: "",
            endTime: "",
        },
        {
            stepNumber: 2,
            stepName: "WARM RINSE",
            temperatureSetpointMin: "70",
            temperatureSetpointMax: "80",
            timeSetpoint: "8",
            temperatureActual: "",
            timeActual: "8",
            startTime: "",
            endTime: "",
        },
        {
            stepNumber: 3,
            stepName: "ALKALI",
            temperatureSetpointMin: "70",
            temperatureSetpointMax: "80",
            timeSetpoint: "24",
            temperatureActual: "",
            timeActual: "24",
            concentrationActual: "",
            startTime: "",
            endTime: "",
        },
        {
            stepNumber: 4,
            stepName: "COLD RINSE",
            temperatureSetpointMin: "60",
            temperatureSetpointMax: "70",
            timeSetpoint: "16",
            temperatureActual: "",
            timeActual: "16",
            startTime: "",
            endTime: "",
        },
        {
            stepNumber: 5,
            stepName: "ACID",
            temperatureSetpointMin: "60",
            temperatureSetpointMax: "70",
            timeSetpoint: "16",
            temperatureActual: "",
            timeActual: "16",
            concentrationActual: "",
            startTime: "",
            endTime: "",
        },
        {
            stepNumber: 6,
            stepName: "WARM RINSE",
            temperatureSetpointMin: "70",
            temperatureSetpointMax: "80",
            timeSetpoint: "16",
            temperatureActual: "",
            timeActual: "16",
            startTime: "",
            endTime: "",
        },
        {
            stepNumber: 7,
            stepName: "COLD RINSE",
            temperatureSetpointMin: "20",
            temperatureSetpointMax: "35",
            timeSetpoint: "8",
            temperatureActual: "",
            timeActual: "8",
            startTime: "",
            endTime: "",
        },
    ]);

    const [copRecords, setCopRecords] = useState([
        {
            stepType: "COP",
            time67Min: "",
            time45Min: "",
            time60Min: "",
            startTime: "",
            endTime: "",
            tempMin: "105",
            tempMax: "128",
            tempActual: "",
            kode: "COP-001",
            teknisi: "",
            operator: "",
        },
        {
            stepType: "SOP",
            time67Min: "",
            time45Min: "",
            time60Min: "",
            startTime: "",
            endTime: "",
            tempMin: "105",
            tempMax: "128",
            tempActual: "",
            kode: "SOP-001",
            teknisi: "",
            operator: "",
        },
        {
            stepType: "SIP",
            time67Min: "",
            time45Min: "",
            time60Min: "",
            startTime: "",
            endTime: "",
            tempMin: "105",
            tempMax: "128",
            tempActual: "",
            kode: "SIP-001",
            teknisi: "",
            operator: "",
        },
    ]);

    const [kodeOperator, setKodeOperator] = useState("");
    const [kodeTeknisi, setKodeTeknisi] = useState("");
    const [temperatureErrors, setTemperatureErrors] = useState({});
    const [copTemperatureErrors, setCopTemperatureErrors] = useState({});

    useEffect(() => {
        if (cipData) {
            // Load existing CIP data
            if (cipData.steps && cipData.steps.length > 0) {
                setCipSteps(cipData.steps.map(step => ({
                    ...step,
                    temperatureSetpointMin: step.temperatureSetpointMin?.toString() || "",
                    temperatureSetpointMax: step.temperatureSetpointMax?.toString() || "",
                    temperatureActual: step.temperatureActual?.toString() || "",
                    timeSetpoint: step.timeSetpoint?.toString() || "",
                    timeActual: step.timeActual?.toString() || "",
                    concentrationActual: step.concentrationActual?.toString() || "",
                    startTime: step.startTime || "",
                    endTime: step.endTime || "",
                })));
            }

            if (cipData.copRecords && cipData.copRecords.length > 0) {
                setCopRecords(cipData.copRecords.map(cop => ({
                    ...cop,
                    time67Min: cop.time67Min?.toString() || "",
                    time45Min: cop.time45Min?.toString() || "",
                    time60Min: cop.time60Min?.toString() || "",
                    tempMin: cop.tempMin?.toString() || "105",
                    tempMax: cop.tempMax?.toString() || "128",
                    tempActual: cop.tempActual?.toString() || "",
                    startTime: cop.startTime || "",
                    endTime: cop.endTime || "",
                    kode: cop.kode || `${cop.stepType}-001`,
                })));
            }

            // Load kode operator dan teknisi
            setKodeOperator(cipData.kodeOperator || "");
            setKodeTeknisi(cipData.kodeTeknisi || "");
        } else {
            // Auto-set times for new CIP steps when creating new report
            autoSetCIPTimes();
        }
    }, [cipData]);

    // Function to auto-set CIP step times
    const autoSetCIPTimes = () => {
        const updatedSteps = cipSteps.map((step) => {
            return {
                ...step,
                timeActual: step.timeSetpoint,
            };
        });
        setCipSteps(updatedSteps);
    };

    // Validate temperature against min/max bounds
    const validateTemperature = (value, min, max, stepIndex) => {
        const numValue = parseFloat(value);
        const numMin = parseFloat(min);
        const numMax = parseFloat(max);

        if (!isNaN(numValue) && !isNaN(numMin) && !isNaN(numMax)) {
            if (numValue < numMin || numValue > numMax) {
                setTemperatureErrors({
                    ...temperatureErrors,
                    [stepIndex]: `Temperature must be between ${min}°C and ${max}°C`
                });
                return false;
            } else {
                const newErrors = { ...temperatureErrors };
                delete newErrors[stepIndex];
                setTemperatureErrors(newErrors);
                return true;
            }
        }
        return true;
    };

    // Validate COP temperature against min/max bounds
    const validateCopTemperature = (value, min, max, copIndex) => {
        const numValue = parseFloat(value);
        const numMin = parseFloat(min);
        const numMax = parseFloat(max);

        if (!isNaN(numValue) && !isNaN(numMin) && !isNaN(numMax)) {
            if (numValue < numMin || numValue > numMax) {
                setCopTemperatureErrors({
                    ...copTemperatureErrors,
                    [copIndex]: `Temperature must be between ${min}°C and ${max}°C`
                });
                return false;
            } else {
                const newErrors = { ...copTemperatureErrors };
                delete newErrors[copIndex];
                setCopTemperatureErrors(newErrors);
                return true;
            }
        }
        return true;
    };

    const updateStepField = (index, field, value) => {
        const updatedSteps = [...cipSteps];
        updatedSteps[index] = {
            ...updatedSteps[index],
            [field]: value,
        };

        // Validate temperature when it changes
        if (field === 'temperatureActual') {
            const step = updatedSteps[index];
            validateTemperature(value, step.temperatureSetpointMin, step.temperatureSetpointMax, index);
        }

        // Auto-recalculate end time when start time or actual time changes
        if (field === 'startTime' || field === 'timeActual') {
            const step = updatedSteps[index];
            if (step.startTime && step.timeActual) {
                const startMoment = moment(step.startTime, "HH:mm");
                const duration = parseInt(step.timeActual) || 0;
                const endMoment = startMoment.add(duration, 'minutes');
                updatedSteps[index].endTime = endMoment.format("HH:mm");
            }
        }

        setCipSteps(updatedSteps);
    };

    const updateCopField = (index, field, value) => {
        const updatedCop = [...copRecords];
        updatedCop[index] = {
            ...updatedCop[index],
            [field]: value,
        };

        // Validate COP temperature when it changes
        if (field === 'tempActual') {
            const cop = updatedCop[index];
            validateCopTemperature(value, cop.tempMin, cop.tempMax, index);
        }

        setCopRecords(updatedCop);
    };

    const validateAndSave = () => {
        // Check for temperature validation errors
        if (Object.keys(temperatureErrors).length > 0) {
            Alert.alert(
                "Temperature Validation Error",
                "Please fix temperature values that are outside the allowed range"
            );
            return;
        }

        if (Object.keys(copTemperatureErrors).length > 0) {
            Alert.alert(
                "COP Temperature Validation Error",
                "Please fix COP/SOP/SIP temperature values that are outside the allowed range"
            );
            return;
        }

        // Validate required fields
        const invalidSteps = cipSteps.filter(step =>
            !step.temperatureActual || !step.timeActual || !step.startTime || !step.endTime
        );

        if (invalidSteps.length > 0) {
            Alert.alert(
                "Validation Error",
                `Please fill all required fields for steps: ${invalidSteps.map(s => s.stepNumber).join(", ")}`
            );
            return;
        }

        // Validate concentration for ALKALI and ACID
        const alkaliStep = cipSteps.find(s => s.stepName === "ALKALI");
        const acidStep = cipSteps.find(s => s.stepName === "ACID");

        if (alkaliStep && !alkaliStep.concentrationActual) {
            Alert.alert("Validation Error", "Please enter concentration for ALKALI step");
            return;
        }

        if (acidStep && !acidStep.concentrationActual) {
            Alert.alert("Validation Error", "Please enter concentration for ACID step");
            return;
        }

        // Validate concentration ranges
        if (alkaliStep && alkaliStep.concentrationActual) {
            const alkaliConc = parseFloat(alkaliStep.concentrationActual);
            if (alkaliConc < 1.5 || alkaliConc > 2) {
                Alert.alert("Validation Error", "ALKALI concentration must be between 1.5% and 2%");
                return;
            }
        }

        if (acidStep && acidStep.concentrationActual) {
            const acidConc = parseFloat(acidStep.concentrationActual);
            if (acidConc < 0.5 || acidConc > 1) {
                Alert.alert("Validation Error", "ACID concentration must be between 0.5% and 1%");
                return;
            }
        }

        // Validate COP records
        const invalidCop = copRecords.filter(cop =>
            !cop.tempActual || !cop.startTime || !cop.endTime
        );

        if (invalidCop.length > 0) {
            Alert.alert(
                "Validation Error",
                `Please fill all required fields for: ${invalidCop.map(c => c.stepType).join(", ")}`
            );
            return;
        }

        // Prepare data for save
        const dataToSave = {
            steps: cipSteps.map(step => ({
                ...step,
                temperatureSetpointMin: parseFloat(step.temperatureSetpointMin) || null,
                temperatureSetpointMax: parseFloat(step.temperatureSetpointMax) || null,
                temperatureActual: parseFloat(step.temperatureActual) || null,
                timeSetpoint: parseInt(step.timeSetpoint) || null,
                timeActual: parseInt(step.timeActual) || null,
                concentrationActual: step.concentrationActual ? parseFloat(step.concentrationActual) : null,
            })),
            copRecords: copRecords.map(cop => ({
                ...cop,
                time67Min: cop.time67Min ? parseInt(cop.time67Min) : null,
                time45Min: cop.time45Min ? parseInt(cop.time45Min) : null,
                time60Min: cop.time60Min ? parseInt(cop.time60Min) : null,
                tempMin: parseFloat(cop.tempMin) || null,
                tempMax: parseFloat(cop.tempMax) || null,
                tempActual: parseFloat(cop.tempActual) || null,
            })),
            kodeOperator: kodeOperator,
            kodeTeknisi: kodeTeknisi,
        };

        if (onSave) {
            onSave(dataToSave);
        }
    };

    const getTemperatureInputStyle = (index) => {
        return [
            styles.input,
            styles.smallInput,
            temperatureErrors[index] ? styles.inputError : null
        ];
    };

    const getCopTemperatureInputStyle = (index) => {
        return [
            styles.input,
            styles.copTempInput,
            copTemperatureErrors[index] ? styles.inputError : null
        ];
    };

    const renderStepRow = (step, index) => (
        <View key={step.stepNumber} style={styles.stepRow}>
            <View style={styles.stepNumberCell}>
                <Text style={styles.stepNumber}>{step.stepNumber}</Text>
            </View>

            <View style={styles.stepNameCell}>
                <Text style={styles.stepName}>{step.stepName}</Text>
                {step.stepName === "ALKALI" && (
                    <View style={styles.concentrationContainer}>
                        <Text style={styles.concentrationLabel}>Conc:</Text>
                        <Text style={styles.concentrationRange}>(1.5 - 2) %</Text>
                    </View>
                )}
                {step.stepName === "ACID" && (
                    <View style={styles.concentrationContainer}>
                        <Text style={styles.concentrationLabel}>Conc:</Text>
                        <Text style={styles.concentrationRange}>(0.5 - 1) %</Text>
                    </View>
                )}
            </View>

            <View style={styles.temperatureCell}>
                <Text style={styles.cellLabel}>Temp (°C)</Text>
                <View style={styles.inputRow}>
                    <Text style={styles.setpointText}>{step.temperatureSetpointMin}</Text>
                    <Text style={styles.rangeSeparator}>-</Text>
                    <Text style={styles.setpointText}>{step.temperatureSetpointMax}</Text>
                    <Text style={styles.separator}>/</Text>
                    <TextInput
                        style={getTemperatureInputStyle(index)}
                        value={step.temperatureActual}
                        onChangeText={(value) => updateStepField(index, "temperatureActual", value)}
                        keyboardType="numeric"
                        placeholder="Temp"
                        editable={isEditable}
                    />
                    {(step.stepName === "ALKALI" || step.stepName === "ACID") && (
                        <>
                            <Text style={styles.separator}>|</Text>
                            <TextInput
                                style={[styles.input, styles.smallInput]}
                                value={step.concentrationActual}
                                onChangeText={(value) => updateStepField(index, "concentrationActual", value)}
                                keyboardType="numeric"
                                placeholder="Conc"
                                editable={isEditable}
                            />
                        </>
                    )}
                </View>
                {temperatureErrors[index] && (
                    <Text style={styles.errorText}>{temperatureErrors[index]}</Text>
                )}
            </View>

            <View style={styles.timeCell}>
                <Text style={styles.cellLabel}>Time (Min)</Text>
                <Text style={styles.timeDisplaySingle}>{step.timeSetpoint}</Text>
            </View>

            <View style={styles.durationCell}>
                <Text style={styles.cellLabel}>Time</Text>
                <View style={styles.timeInputRow}>
                    <TextInput
                        style={[styles.input, styles.timeInput]}
                        value={step.startTime}
                        onChangeText={(value) => updateStepField(index, "startTime", value)}
                        placeholder="Start"
                        editable={isEditable}
                    />
                    <Text style={styles.timeSeparator}>-</Text>
                    <TextInput
                        style={[styles.input, styles.timeInput]}
                        value={step.endTime}
                        onChangeText={(value) => updateStepField(index, "endTime", value)}
                        placeholder="End"
                        editable={isEditable}
                    />
                </View>
            </View>
        </View>
    );

    const renderCopRow = (cop, index) => (
        <View key={cop.stepType} style={styles.copRow}>
            <View style={styles.copTypeCell}>
                <Text style={styles.copType}>{cop.stepType}</Text>
            </View>

            <View style={styles.copTimeSection}>
                {cop.stepType === "COP" && (
                    <View style={styles.copTimeItem}>
                        <Text style={styles.copTimeLabel}>67 Menit</Text>
                        <TextInput
                            style={[styles.input, styles.copTimeInput]}
                            value={cop.time67Min}
                            onChangeText={(value) => updateCopField(index, "time67Min", value)}
                            keyboardType="numeric"
                            editable={isEditable}
                        />
                    </View>
                )}
                {cop.stepType === "SOP" && (
                    <View style={styles.copTimeItem}>
                        <Text style={styles.copTimeLabel}>45 Menit</Text>
                        <TextInput
                            style={[styles.input, styles.copTimeInput]}
                            value={cop.time45Min}
                            onChangeText={(value) => updateCopField(index, "time45Min", value)}
                            keyboardType="numeric"
                            editable={isEditable}
                        />
                    </View>
                )}
                {cop.stepType === "SIP" && (
                    <View style={styles.copTimeItem}>
                        <Text style={styles.copTimeLabel}>60 Menit</Text>
                        <TextInput
                            style={[styles.input, styles.copTimeInput]}
                            value={cop.time60Min}
                            onChangeText={(value) => updateCopField(index, "time60Min", value)}
                            keyboardType="numeric"
                            editable={isEditable}
                        />
                    </View>
                )}
            </View>

            <View style={styles.copTempSection}>
                <Text style={styles.copTempLabel}>Temp ({cop.tempMin}-{cop.tempMax}°C)</Text>
                <TextInput
                    style={getCopTemperatureInputStyle(index)}
                    value={cop.tempActual}
                    onChangeText={(value) => updateCopField(index, "tempActual", value)}
                    keyboardType="numeric"
                    placeholder="Actual"
                    editable={isEditable}
                />
                {copTemperatureErrors[index] && (
                    <Text style={styles.errorText}>{copTemperatureErrors[index]}</Text>
                )}
            </View>

            <View style={styles.copTimeRangeSection}>
                <Text style={styles.cellLabel}>Time</Text>
                <View style={styles.timeInputRow}>
                    <TextInput
                        style={[styles.input, styles.timeInput]}
                        value={cop.startTime}
                        onChangeText={(value) => updateCopField(index, "startTime", value)}
                        placeholder="Start"
                        editable={isEditable}
                    />
                    <Text style={styles.timeSeparator}>-</Text>
                    <TextInput
                        style={[styles.input, styles.timeInput]}
                        value={cop.endTime}
                        onChangeText={(value) => updateCopField(index, "endTime", value)}
                        placeholder="End"
                        editable={isEditable}
                    />
                </View>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            {/* CIP Steps Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>LAPORAN CIP MESIN GALDI RG 280 UC5</Text>

                <View style={styles.tableHeader}>
                    <View style={styles.stepNumberHeader}>
                        <Text style={styles.headerText}>Step</Text>
                    </View>
                    <View style={styles.stepNameHeader}>
                        <Text style={styles.headerText}>Posisi</Text>
                    </View>
                    <View style={styles.temperatureHeader}>
                        <Text style={styles.headerText}>Temp (°C)</Text>
                    </View>
                    <View style={styles.timeHeader}>
                        <Text style={styles.headerText}>Time (Min)</Text>
                    </View>
                    <View style={styles.durationHeader}>
                        <Text style={styles.headerText}>Time</Text>
                    </View>
                </View>

                {cipSteps.map((step, index) => renderStepRow(step, index))}
            </View>

            {/* COP/SOP/SIP Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>LAPORAN COP, SOP DAN SIP MESIN GALDI RG 280 UC5</Text>

                {copRecords.map((cop, index) => renderCopRow(cop, index))}
            </View>

            {/* Kode Operator dan Teknisi Section */}
            <View style={styles.kodeSection}>
                <View style={styles.kodeHalfSection}>
                    <Text style={styles.kodeLabel}>KODE OPERATOR:</Text>
                    <TextInput
                        style={[styles.input, styles.kodeHalfInput]}
                        value={kodeOperator}
                        onChangeText={setKodeOperator}
                        placeholder="Kode operator"
                        editable={isEditable}
                    />
                </View>
                <View style={styles.kodeHalfSection}>
                    <Text style={styles.kodeLabel}>KODE TEKNISI:</Text>
                    <TextInput
                        style={[styles.input, styles.kodeHalfInput]}
                        value={kodeTeknisi}
                        onChangeText={setKodeTeknisi}
                        placeholder="Kode teknisi"
                        editable={isEditable}
                    />
                </View>
            </View>

            {/* Save Button */}
            {isEditable && (
                <TouchableOpacity style={styles.saveButton} onPress={validateAndSave}>
                    <Icon name="save" size={24} color="#fff" />
                    <Text style={styles.saveButtonText}>Save CIP Report</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
};

export default ReportCIPInspectionTable;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    section: {
        margin: 16,
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.blue,
        marginBottom: 16,
        textAlign: "center",
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: COLORS.lightBlue,
        paddingVertical: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    headerText: {
        fontSize: 12,
        fontWeight: "bold",
        color: COLORS.blue,
        textAlign: "center",
    },
    stepNumberHeader: {
        width: 40,
        alignItems: "center",
    },
    stepNameHeader: {
        flex: 2,
        paddingHorizontal: 8,
    },
    temperatureHeader: {
        flex: 2.5,
        alignItems: "center",
    },
    timeHeader: {
        flex: 1.5,
        alignItems: "center",
    },
    durationHeader: {
        flex: 2.5,
        alignItems: "center",
    },
    stepRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
        paddingVertical: 8,
        alignItems: "center",
    },
    stepNumberCell: {
        width: 40,
        alignItems: "center",
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.blue,
    },
    stepNameCell: {
        flex: 2,
        paddingHorizontal: 8,
    },
    stepName: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.black,
    },
    concentrationContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    concentrationLabel: {
        fontSize: 11,
        color: COLORS.darkGray,
        marginRight: 4,
    },
    concentrationRange: {
        fontSize: 11,
        color: COLORS.blue,
        fontWeight: "600",
        marginLeft: 4,
    },
    temperatureCell: {
        flex: 2.5,
        alignItems: "center",
    },
    timeCell: {
        flex: 1.5,
        alignItems: "center",
    },
    durationCell: {
        flex: 2.5,
        alignItems: "center",
    },
    cellLabel: {
        fontSize: 10,
        color: COLORS.darkGray,
        marginBottom: 4,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 11,
        backgroundColor: "#fff",
    },
    inputError: {
        borderColor: COLORS.red,
        borderWidth: 2,
    },
    smallInput: {
        width: 45,
        textAlign: "center",
    },
    rangeSeparator: {
        marginHorizontal: 2,
        fontSize: 12,
        color: COLORS.darkGray,
        fontWeight: "500",
    },
    separator: {
        marginHorizontal: 4,
        fontSize: 12,
        color: COLORS.darkGray,
    },
    timeDisplayRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    timeDisplaySingle: {
        fontSize: 12,
        color: COLORS.black,
        fontWeight: "500",
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
        textAlign: "center",
        minWidth: 40,
    },
    timeInputRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    timeInput: {
        width: 50,
        textAlign: "center",
    },
    timeSeparator: {
        marginHorizontal: 4,
        fontSize: 12,
        color: COLORS.darkGray,
    },
    errorText: {
        fontSize: 10,
        color: COLORS.red,
        marginTop: 2,
        textAlign: "center",
    },
    copRow: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: "#f9f9f9",
    },
    copTypeCell: {
        marginBottom: 8,
    },
    copType: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.blue,
    },
    copTimeSection: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 8,
    },
    copTimeItem: {
        marginRight: 16,
        marginBottom: 8,
    },
    copTimeLabel: {
        fontSize: 12,
        color: COLORS.darkGray,
        marginBottom: 4,
    },
    copTimeInput: {
        width: 60,
        textAlign: "center",
    },
    copTempSection: {
        marginBottom: 8,
    },
    copTempLabel: {
        fontSize: 12,
        color: COLORS.darkGray,
        marginBottom: 4,
    },
    copTempInput: {
        width: 80,
        textAlign: "center",
    },
    copTimeRangeSection: {
        marginBottom: 8,
    },
    copDetailsSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    copDetailItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 12,
    },
    copDetailLabel: {
        fontSize: 12,
        fontWeight: "bold",
        color: COLORS.darkGray,
        marginRight: 4,
    },
    copDetailText: {
        fontSize: 12,
        color: COLORS.black,
        fontWeight: "500",
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
        minWidth: 60,
        textAlign: "center",
    },
    copDetailInput: {
        flex: 1,
        marginHorizontal: 4,
        textAlign: "center",
    },
    kodeSection: {
        flexDirection: "row",
        margin: 16,
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    kodeHalfSection: {
        flex: 1,
        marginHorizontal: 4,
    },
    kodeLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.blue,
        marginBottom: 8,
    },
    kodeHalfInput: {
        flex: 1,
        fontSize: 14,
    },
    saveButton: {
        flexDirection: "row",
        backgroundColor: COLORS.green,
        margin: 16,
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 8,
    },
});