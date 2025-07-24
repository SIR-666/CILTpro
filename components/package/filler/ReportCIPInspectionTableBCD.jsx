import React, { useState, useEffect } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    Modal,
    Button,
    Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
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
    gray: "#9E9E9E",
};

// Custom Time Picker Component (same as original)
const TimePickerInput = ({ value, onChange, placeholder, editable = true }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [tempTime, setTempTime] = useState(new Date());

    useEffect(() => {
        if (value && value.includes(':')) {
            const [hours, minutes] = value.split(':');
            const date = new Date();
            date.setHours(parseInt(hours) || 0);
            date.setMinutes(parseInt(minutes) || 0);
            setTempTime(date);
        }
    }, [value]);

    const handleTimeChange = (event, selectedTime) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (selectedTime) {
            setTempTime(selectedTime);
            const formattedTime = moment(selectedTime).format("HH:mm");
            onChange(formattedTime);
        }
    };

    const handleConfirm = () => {
        const formattedTime = moment(tempTime).format("HH:mm");
        onChange(formattedTime);
        setShowPicker(false);
    };

    if (!editable) {
        return (
            <View style={[styles.input, styles.timeInput, styles.disabledInput]}>
                <Text style={styles.timeText}>{value || placeholder}</Text>
            </View>
        );
    }

    return (
        <>
            <TouchableOpacity
                style={[styles.input, styles.timeInput, styles.timePickerButton]}
                onPress={() => setShowPicker(true)}
            >
                <Text style={[styles.timeText, !value && styles.placeholderText]}>
                    {value || placeholder}
                </Text>
                <Icon name="access-time" size={16} color={COLORS.blue} />
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
                <Modal
                    visible={showPicker}
                    transparent={true}
                    animationType="slide"
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Time</Text>
                                <TouchableOpacity onPress={() => setShowPicker(false)}>
                                    <Text style={styles.cancelButton}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleConfirm}>
                                    <Text style={styles.doneButton}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempTime}
                                mode="time"
                                is24Hour={true}
                                display="spinner"
                                onChange={handleTimeChange}
                            />
                        </View>
                    </View>
                </Modal>
            ) : (
                showPicker && (
                    <DateTimePicker
                        value={tempTime}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={handleTimeChange}
                    />
                )
            )}
        </>
    );
};

// Custom Checkbox Component
const Checkbox = ({ value, onValueChange, label, disabled = false }) => {
    return (
        <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => !disabled && onValueChange(!value)}
            disabled={disabled}
        >
            <View style={[styles.checkbox, value && styles.checkboxChecked, disabled && styles.checkboxDisabled]}>
                {value && <Icon name="check" size={16} color="#fff" />}
            </View>
            <Text style={[styles.checkboxLabel, disabled && styles.checkboxLabelDisabled]}>{label}</Text>
        </TouchableOpacity>
    );
};

const ReportCIPInspectionTableBCD = ({ cipData, onSave, isEditable = true, selectedLine }) => {
    // CIP Steps (same as LINE A)
    const [cipSteps, setCipSteps] = useState([
        {
            stepNumber: 1,
            stepName: "COLD RINSE",
            temperatureSetpointMin: "20",
            temperatureSetpointMax: "35",
            timeSetpoint: "8",
            temperatureActual: "",
            timeActual: "8",
            concentration: null,
            concentrationActual: "",
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
            concentration: null,
            concentrationActual: "",
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
            concentration: "2.0",
            concentrationActual: "",
            startTime: "",
            endTime: "",
        },
        {
            stepNumber: 4,
            stepName: "COLD RINSE",
            temperatureSetpointMin: "20",
            temperatureSetpointMax: "35",
            timeSetpoint: "8",
            temperatureActual: "",
            timeActual: "8",
            concentration: null,
            concentrationActual: "",
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
            concentration: "1.0",
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
            concentration: null,
            concentrationActual: "",
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
            concentration: null,
            concentrationActual: "",
            startTime: "",
            endTime: "",
        },
    ]);

    // Special records for BCD (replacing COP/SOP/SIP)
    const [specialRecords, setSpecialRecords] = useState([
        {
            stepType: "DRYING",
            tempMin: "118",
            tempMax: "125",
            tempActual: "",
            time: "57",
            startTime: "",
            endTime: "",
            kode: "DRY-001",
        },
        {
            stepType: "FOAMING",
            time: "41",
            startTime: "",
            endTime: "",
            kode: "FOAM-001",
        },
        {
            stepType: "DISINFECT/SANITASI",
            concMin: "0.3",
            concMax: "0.5",
            concActual: "",
            time: "30",
            tempBC: "40",
            tempDMin: "20",
            tempDMax: "35",
            tempActual: "",
            startTime: "",
            endTime: "",
            kode: "DIS-001",
        },
    ]);

    // Valve positions based on posisi selection
    const [valvePositions, setValvePositions] = useState({
        A: false,
        B: false,
        C: false,
    });

    // Flow rates for BCD
    const [flowRates, setFlowRates] = useState({
        flowD: "",
        flowBC: "",
    });

    const [kodeOperator, setKodeOperator] = useState("");
    const [kodeTeknisi, setKodeTeknisi] = useState("");
    const [temperatureErrors, setTemperatureErrors] = useState({});
    const [specialTemperatureErrors, setSpecialTemperatureErrors] = useState({});
    const [flowRateErrors, setFlowRateErrors] = useState({});

    // Get posisi from parent component (passed from CreateCIP)
    const [parentPosisi, setParentPosisi] = useState("");

    useEffect(() => {
        if (cipData) {
            // Load existing data for editing
            if (cipData.steps && cipData.steps.length > 0) {
                setCipSteps(cipData.steps.map(step => ({
                    ...step,
                    temperatureSetpointMin: step.temperatureSetpointMin?.toString() || "",
                    temperatureSetpointMax: step.temperatureSetpointMax?.toString() || "",
                    temperatureActual: step.temperatureActual?.toString() || "",
                    timeSetpoint: step.timeSetpoint?.toString() || "",
                    timeActual: step.timeActual?.toString() || "",
                    concentration: step.concentration?.toString() || null,
                    concentrationActual: step.concentrationActual?.toString() || "",
                    startTime: step.startTime || "",
                    endTime: step.endTime || "",
                })));
            }

            if (cipData.specialRecords && cipData.specialRecords.length > 0) {
                setSpecialRecords(cipData.specialRecords.map(record => ({
                    ...record,
                    tempMin: record.tempMin?.toString() || "",
                    tempMax: record.tempMax?.toString() || "",
                    tempActual: record.tempActual?.toString() || "",
                    time: record.time?.toString() || "",
                    concMin: record.concMin?.toString() || "",
                    concMax: record.concMax?.toString() || "",
                    concActual: record.concActual?.toString() || "",
                    tempBC: record.tempBC?.toString() || "",
                    tempDMin: record.tempDMin?.toString() || "",
                    tempDMax: record.tempDMax?.toString() || "",
                    startTime: record.startTime || "",
                    endTime: record.endTime || "",
                })));
            }

            // Load valve positions
            if (cipData.valvePositions) {
                setValvePositions(cipData.valvePositions);
            }

            // Load flow rates
            if (cipData.flowRates) {
                setFlowRates({
                    flowD: cipData.flowRates.flowD?.toString() || "",
                    flowBC: cipData.flowRates.flowBC?.toString() || "",
                });
            }

            setKodeOperator(cipData.kodeOperator || "");
            setKodeTeknisi(cipData.kodeTeknisi || "");
            setParentPosisi(cipData.posisi || "");
        }
    }, [cipData]);

    // Update valve positions based on posisi selection
    useEffect(() => {
        if (cipData?.posisi) {
            if (cipData.posisi === "Final") {
                setValvePositions({ A: false, B: true, C: true }); // A Close, B Open, C Open
            } else if (cipData.posisi === "Intermediate") {
                setValvePositions({ A: false, B: true, C: false }); // A Close, B Open, C Close
            }
        }
    }, [cipData?.posisi]);

    // Validate temperature
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

    // Validate special record temperature
    const validateSpecialTemperature = (value, min, max, recordIndex, fieldName) => {
        const numValue = parseFloat(value);
        const numMin = parseFloat(min);
        const numMax = parseFloat(max);

        if (!isNaN(numValue) && !isNaN(numMin) && !isNaN(numMax)) {
            if (numValue < numMin || numValue > numMax) {
                setSpecialTemperatureErrors({
                    ...specialTemperatureErrors,
                    [`${recordIndex}-${fieldName}`]: `Temperature must be between ${min}°C and ${max}°C`
                });
                return false;
            } else {
                const newErrors = { ...specialTemperatureErrors };
                delete newErrors[`${recordIndex}-${fieldName}`];
                setSpecialTemperatureErrors(newErrors);
                return true;
            }
        }
        return true;
    };

    // Validate flow rates
    const validateFlowRate = (field, value) => {
        const numValue = parseFloat(value);
        const minValue = field === 'flowD' ? 6000 : 9000;

        if (!isNaN(numValue)) {
            if (numValue < minValue) {
                setFlowRateErrors({
                    ...flowRateErrors,
                    [field]: `${field === 'flowD' ? 'Flow D' : 'Flow B,C'} must be minimum ${minValue} L/H`
                });
                return false;
            } else {
                const newErrors = { ...flowRateErrors };
                delete newErrors[field];
                setFlowRateErrors(newErrors);
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

        if (field === 'temperatureActual') {
            const step = updatedSteps[index];
            validateTemperature(value, step.temperatureSetpointMin, step.temperatureSetpointMax, index);
        }

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

    const updateSpecialField = (index, field, value) => {
        const updatedRecords = [...specialRecords];
        updatedRecords[index] = {
            ...updatedRecords[index],
            [field]: value,
        };

        // Validate temperatures
        const record = updatedRecords[index];
        if (field === 'tempActual') {
            if (record.stepType === 'DRYING') {
                validateSpecialTemperature(value, record.tempMin, record.tempMax, index, 'drying');
            } else if (record.stepType === 'DISINFECT/SANITASI') {
                // Validate based on selected line
                if (selectedLine === 'LINE D') {
                    validateSpecialTemperature(value, record.tempDMin, record.tempDMax, index, 'disinfect');
                } else {
                    validateSpecialTemperature(value, record.tempBC, record.tempBC, index, 'disinfect');
                }
            }
        }

        // Auto-calculate end time
        if (field === 'startTime' || field === 'time') {
            if (record.startTime && record.time) {
                const startMoment = moment(record.startTime, "HH:mm");
                const duration = parseInt(record.time) || 0;
                const endMoment = startMoment.add(duration, 'minutes');
                updatedRecords[index].endTime = endMoment.format("HH:mm");
            }
        }

        setSpecialRecords(updatedRecords);
    };

    const updateFlowRate = (field, value) => {
        setFlowRates({
            ...flowRates,
            [field]: value,
        });
        validateFlowRate(field, value);
    };

    const updateValvePosition = (valve) => {
        setValvePositions({
            ...valvePositions,
            [valve]: !valvePositions[valve],
        });
    };

    const validateAndSave = () => {
        // Validate temperature errors
        if (Object.keys(temperatureErrors).length > 0 || Object.keys(specialTemperatureErrors).length > 0) {
            Alert.alert(
                "Temperature Validation Error",
                "Please fix temperature values that are outside the allowed range"
            );
            return;
        }

        // Validate flow rate errors
        if (Object.keys(flowRateErrors).length > 0) {
            Alert.alert(
                "Flow Rate Validation Error",
                "Please ensure flow rates meet minimum requirements"
            );
            return;
        }

        // Validate flow rates based on selected line
        if (selectedLine === 'LINE D') {
            if (!flowRates.flowD) {
                Alert.alert(
                    "Validation Error",
                    "Please fill in Flow D rate"
                );
                return;
            }
        } else if (selectedLine === 'LINE B' || selectedLine === 'LINE C') {
            if (!flowRates.flowBC) {
                Alert.alert(
                    "Validation Error",
                    "Please fill in Flow B,C rate"
                );
                return;
            }
        }

        // Validate required fields for steps
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

        // Validate special records
        const invalidSpecial = specialRecords.filter(record => {
            if (record.stepType === 'DRYING') {
                return !record.tempActual || !record.startTime || !record.endTime;
            } else if (record.stepType === 'FOAMING') {
                return !record.startTime || !record.endTime;
            } else if (record.stepType === 'DISINFECT/SANITASI') {
                return !record.concActual || !record.tempActual || !record.startTime || !record.endTime;
            }
            return false;
        });

        if (invalidSpecial.length > 0) {
            Alert.alert(
                "Validation Error",
                `Please fill all required fields for: ${invalidSpecial.map(r => r.stepType).join(", ")}`
            );
            return;
        }

        // Validate DISINFECT concentration
        const disinfectRecord = specialRecords.find(r => r.stepType === 'DISINFECT/SANITASI');
        if (disinfectRecord && disinfectRecord.concActual) {
            const conc = parseFloat(disinfectRecord.concActual);
            if (conc < 0.3 || conc > 0.5) {
                Alert.alert("Validation Error", "DISINFECT/SANITASI concentration must be between 0.3% and 0.5%");
                return;
            }
        }

        // Prepare data for save
        const dataToSave = {
            steps: cipSteps,
            specialRecords: specialRecords,
            valvePositions: valvePositions,
            flowRates: {
                flowD: selectedLine === 'LINE D' ? parseFloat(flowRates.flowD) : undefined,
                flowBC: (selectedLine === 'LINE B' || selectedLine === 'LINE C') ? parseFloat(flowRates.flowBC) : undefined,
            },
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

    const getSpecialTemperatureInputStyle = (index, field) => {
        return [
            styles.input,
            styles.specialTempInput,
            specialTemperatureErrors[`${index}-${field}`] ? styles.inputError : null
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
                <TextInput
                    style={[styles.input, styles.timeActualInput]}
                    value={step.timeActual}
                    onChangeText={(value) => updateStepField(index, "timeActual", value)}
                    keyboardType="numeric"
                    placeholder={step.timeSetpoint}
                    editable={isEditable}
                />
            </View>

            <View style={styles.durationCell}>
                <Text style={styles.cellLabel}>Time</Text>
                <View style={styles.timeInputRow}>
                    <TimePickerInput
                        value={step.startTime}
                        onChange={(value) => updateStepField(index, "startTime", value)}
                        placeholder="Start"
                        editable={isEditable}
                    />
                    <Text style={styles.timeSeparator}>-</Text>
                    <TimePickerInput
                        value={step.endTime}
                        onChange={(value) => updateStepField(index, "endTime", value)}
                        placeholder="End"
                        editable={isEditable}
                    />
                </View>
            </View>
        </View>
    );

    const renderSpecialRow = (record, index) => (
        <View key={record.stepType} style={styles.specialRow}>
            <View style={styles.specialTypeCell}>
                <Text style={styles.specialType}>{record.stepType}</Text>
            </View>

            <View style={styles.specialContent}>
                {/* DRYING */}
                {record.stepType === "DRYING" && (
                    <View style={styles.specialDetails}>
                        <View style={styles.specialItem}>
                            <Text style={styles.specialLabel}>Temp ({record.tempMin}-{record.tempMax}°C):</Text>
                            <TextInput
                                style={getSpecialTemperatureInputStyle(index, 'drying')}
                                value={record.tempActual}
                                onChangeText={(value) => updateSpecialField(index, "tempActual", value)}
                                keyboardType="numeric"
                                placeholder="Actual"
                                editable={isEditable}
                            />
                        </View>
                        <View style={styles.specialItem}>
                            <Text style={styles.specialLabel}>Time: {record.time} min</Text>
                        </View>
                    </View>
                )}

                {/* FOAMING */}
                {record.stepType === "FOAMING" && (
                    <View style={styles.specialDetails}>
                        <View style={styles.specialItem}>
                            <Text style={styles.specialLabel}>Time: {record.time} min</Text>
                        </View>
                        <View style={styles.specialItem}>
                            <Text style={styles.specialNote}>(No Temperature)</Text>
                        </View>
                    </View>
                )}

                {/* DISINFECT/SANITASI */}
                {record.stepType === "DISINFECT/SANITASI" && (
                    <View style={styles.specialDetails}>
                        <View style={styles.specialItem}>
                            <Text style={styles.specialLabel}>Conc ({record.concMin}-{record.concMax}%):</Text>
                            <TextInput
                                style={[styles.input, styles.concInput]}
                                value={record.concActual}
                                onChangeText={(value) => updateSpecialField(index, "concActual", value)}
                                keyboardType="numeric"
                                placeholder="Actual"
                                editable={isEditable}
                            />
                        </View>
                        <View style={styles.specialItem}>
                            <Text style={styles.specialLabel}>Time: {record.time} min</Text>
                        </View>
                        <View style={styles.specialItem}>
                            <Text style={styles.specialLabel}>
                                Temp {selectedLine === 'LINE D' ? `(${record.tempDMin}-${record.tempDMax}°C)` : `(${record.tempBC}°C)`}:
                            </Text>
                            <TextInput
                                style={getSpecialTemperatureInputStyle(index, 'disinfect')}
                                value={record.tempActual}
                                onChangeText={(value) => updateSpecialField(index, "tempActual", value)}
                                keyboardType="numeric"
                                placeholder="Actual"
                                editable={isEditable}
                            />
                        </View>
                    </View>
                )}

                {/* Time Range */}
                <View style={styles.specialTimeRange}>
                    <Text style={styles.cellLabel}>Time</Text>
                    <View style={styles.timeInputRow}>
                        <TimePickerInput
                            value={record.startTime}
                            onChange={(value) => updateSpecialField(index, "startTime", value)}
                            placeholder="Start"
                            editable={isEditable}
                        />
                        <Text style={styles.timeSeparator}>-</Text>
                        <TimePickerInput
                            value={record.endTime}
                            onChange={(value) => updateSpecialField(index, "endTime", value)}
                            placeholder="End"
                            editable={isEditable}
                        />
                    </View>
                </View>

                {/* Error messages */}
                {specialTemperatureErrors[`${index}-drying`] && record.stepType === "DRYING" && (
                    <Text style={styles.errorText}>{specialTemperatureErrors[`${index}-drying`]}</Text>
                )}
                {specialTemperatureErrors[`${index}-disinfect`] && record.stepType === "DISINFECT/SANITASI" && (
                    <Text style={styles.errorText}>{specialTemperatureErrors[`${index}-disinfect`]}</Text>
                )}
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            {/* Valve Position Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>POSISI VALVE A, B, C</Text>
                
                <View style={styles.valveInfo}>
                    <Text style={styles.valveInfoText}>
                        {cipData?.posisi === "Final" ? "Final: A (Close), B (Open), C (Open)" : 
                         cipData?.posisi === "Intermediate" ? "Inter: A (Close), B (Open), C (Close)" : 
                         "Select Posisi first"}
                    </Text>
                </View>

                <View style={styles.valveContainer}>
                    <Checkbox
                        value={valvePositions.A}
                        onValueChange={() => updateValvePosition('A')}
                        label="Valve A (Close)"
                        disabled={!isEditable}
                    />
                    <Checkbox
                        value={valvePositions.B}
                        onValueChange={() => updateValvePosition('B')}
                        label="Valve B (Open)"
                        disabled={!isEditable}
                    />
                    <Checkbox
                        value={valvePositions.C}
                        onValueChange={() => updateValvePosition('C')}
                        label={`Valve C (${cipData?.posisi === "Final" ? "Open" : "Close"})`}
                        disabled={!isEditable}
                    />
                </View>
            </View>

            {/* Flow Rate Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>FLOW RATE</Text>
                
                <View style={styles.flowContainer}>
                    {/* Show Flow D only for LINE D */}
                    {selectedLine === 'LINE D' && (
                        <View style={styles.flowItem}>
                            <Text style={styles.flowLabel}>Flow D (Min 6000 L/H):</Text>
                            <TextInput
                                style={[styles.input, styles.flowInput, flowRateErrors.flowD ? styles.inputError : null]}
                                value={flowRates.flowD}
                                onChangeText={(value) => updateFlowRate('flowD', value)}
                                keyboardType="numeric"
                                placeholder="e.g. 6500"
                                editable={isEditable}
                            />
                            {flowRateErrors.flowD && (
                                <Text style={styles.errorText}>{flowRateErrors.flowD}</Text>
                            )}
                        </View>
                    )}

                    {/* Show Flow B,C only for LINE B or C */}
                    {(selectedLine === 'LINE B' || selectedLine === 'LINE C') && (
                        <View style={styles.flowItem}>
                            <Text style={styles.flowLabel}>Flow B,C (Min 9000 L/H):</Text>
                            <TextInput
                                style={[styles.input, styles.flowInput, flowRateErrors.flowBC ? styles.inputError : null]}
                                value={flowRates.flowBC}
                                onChangeText={(value) => updateFlowRate('flowBC', value)}
                                keyboardType="numeric"
                                placeholder="e.g. 9500"
                                editable={isEditable}
                            />
                            {flowRateErrors.flowBC && (
                                <Text style={styles.errorText}>{flowRateErrors.flowBC}</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* CIP Steps Section (same as LINE A) */}
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

            {/* Special Records Section (DRYING, FOAMING, DISINFECT) */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>LAPORAN DRYING, FOAMING, DISINFECT/SANITASI</Text>

                {specialRecords.map((record, index) => renderSpecialRow(record, index))}
            </View>

            {/* Kode Operator dan Teknisi Section */}
            <View style={styles.kodeSection}>
                <View style={styles.kodeHalfSection}>
                    <Text style={styles.kodeLabel}>KODE OPERATOR:</Text>
                    <TextInput
                        style={[styles.input, styles.kodeHalfInput]}
                        value={kodeOperator}
                        onChangeText={setKodeOperator}
                        placeholder="e.g. OP-001"
                        editable={isEditable}
                    />
                </View>
                <View style={styles.kodeHalfSection}>
                    <Text style={styles.kodeLabel}>KODE TEKNISI:</Text>
                    <TextInput
                        style={[styles.input, styles.kodeHalfInput]}
                        value={kodeTeknisi}
                        onChangeText={setKodeTeknisi}
                        placeholder="e.g. TK-001"
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

export default ReportCIPInspectionTableBCD;

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
    
    // Valve Position Styles
    valveInfo: {
        backgroundColor: COLORS.lightBlue,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    valveInfoText: {
        fontSize: 14,
        color: COLORS.blue,
        fontWeight: "600",
        textAlign: "center",
    },
    valveContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        flexWrap: "wrap",
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        marginHorizontal: 8,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: COLORS.blue,
        borderRadius: 4,
        marginRight: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: {
        backgroundColor: COLORS.blue,
    },
    checkboxDisabled: {
        borderColor: COLORS.gray,
        backgroundColor: "#f0f0f0",
    },
    checkboxLabel: {
        fontSize: 14,
        color: COLORS.black,
    },
    checkboxLabelDisabled: {
        color: COLORS.gray,
    },

    // Flow Rate Styles
    flowContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        flexWrap: "wrap",
    },
    flowItem: {
        flex: 1,
        minWidth: 150,
        marginHorizontal: 4,
    },
    flowLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.darkGray,
        marginBottom: 8,
    },
    flowInput: {
        fontSize: 14,
        textAlign: "center",
    },

    // Table styles (same as original)
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
    timeActualInput: {
        width: 50,
        textAlign: "center",
    },
    setpointText: {
        fontSize: 11,
        color: COLORS.darkGray,
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
    timeInputRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    timeInput: {
        width: 60,
        textAlign: "center",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    timePickerButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 6,
    },
    timeText: {
        fontSize: 11,
        color: COLORS.black,
        marginRight: 4,
    },
    placeholderText: {
        color: COLORS.gray,
    },
    disabledInput: {
        backgroundColor: "#f0f0f0",
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

    // Special Records Styles
    specialRow: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: "#f9f9f9",
    },
    specialTypeCell: {
        marginBottom: 8,
    },
    specialType: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.orange,
    },
    specialContent: {
        flex: 1,
    },
    specialDetails: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 8,
    },
    specialItem: {
        marginRight: 16,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    specialLabel: {
        fontSize: 12,
        color: COLORS.darkGray,
        marginRight: 8,
    },
    specialNote: {
        fontSize: 12,
        color: COLORS.gray,
        fontStyle: "italic",
    },
    specialTempInput: {
        width: 60,
        textAlign: "center",
    },
    concInput: {
        width: 60,
        textAlign: "center",
    },
    specialTimeRange: {
        borderTopWidth: 1,
        borderTopColor: "#e0e0e0",
        paddingTop: 8,
    },

    // Kode Section
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

    // Save Button
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

    // Modal styles
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.black,
        flex: 1,
        textAlign: "center",
    },
    cancelButton: {
        fontSize: 16,
        color: COLORS.red,
        position: "absolute",
        left: 16,
    },
    doneButton: {
        fontSize: 16,
        color: COLORS.blue,
        fontWeight: "600",
        position: "absolute",
        right: 16,
    },
});