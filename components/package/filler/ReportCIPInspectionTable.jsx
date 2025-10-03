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
    warningOrange: "#FFA726",
    warningYellow: "#FFF9C4",
    warningText: "#F57C00",
};

// Flexible Numeric Input Component with Fixed Styling
const FlexibleNumericInput = ({ 
    value, 
    onChangeText, 
    placeholder, 
    minRange, 
    maxRange, 
    unit = "", 
    style = {},
    ...props 
}) => {
    const [isFocused, setIsFocused] = useState(false);

    // Check if value is outside the recommended range
    const isOutOfRange = () => {
        if (!value || value === '') return false;
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return false;
        
        if (minRange !== undefined && numValue < minRange) return true;
        if (maxRange !== undefined && numValue > maxRange) return true;
        return false;
    };

    // Get input style based on range validation
    const getInputStyle = () => {
        const baseStyle = [styles.input, style];
        
        if (isOutOfRange()) {
            baseStyle.push(styles.warningInput);
        } else if (isFocused) {
            baseStyle.push(styles.focusedInput);
        }
        
        return baseStyle;
    };

    // Get range message
    const getRangeMessage = () => {
        if (!isOutOfRange()) return null;
        
        let message = "Out of range";
        if (minRange !== undefined && maxRange !== undefined) {
            message += ` (${minRange}-${maxRange}${unit})`;
        } else if (minRange !== undefined) {
            message += ` (min: ${minRange}${unit})`;
        } else if (maxRange !== undefined) {
            message += ` (max: ${maxRange}${unit})`;
        }
        
        return message;
    };

    return (
        <View style={styles.flexibleInputContainer}>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                keyboardType="numeric"
                style={getInputStyle()}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...props}
            />
            {isOutOfRange() && (
                <Text style={styles.warningText}>
                    {getRangeMessage()}
                </Text>
            )}
        </View>
    );
};

// Custom Time Picker Component for consistent cross-platform experience
const TimePickerInput = ({ value, onChange, placeholder, editable = true }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [tempTime, setTempTime] = useState(new Date());

    useEffect(() => {
        // Parse existing time value if available
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

const ReportCIPInspectionTable = ({ cipData, onSave, isEditable = true, allowUnrestrictedInput = false }) => {
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

    const [copRecords, setCopRecords] = useState([
        {
            stepType: "COP",
            time67Min: "67",
            time45Min: "",
            time60Min: "",
            startTime: "",
            endTime: "",
            tempMin: "105",
            tempMax: "128",
            tempActual: "",
            kode: "COP-001",
        },
        {
            stepType: "SOP",
            time67Min: "",
            time45Min: "45",
            time60Min: "",
            startTime: "",
            endTime: "",
            tempMin: "105",
            tempMax: "128",
            tempActual: "",
            kode: "SOP-001",
        },
        {
            stepType: "SIP",
            time67Min: "",
            time45Min: "",
            time60Min: "60",
            startTime: "",
            endTime: "",
            tempMin: "105",
            tempMax: "128",
            tempActual: "",
            kode: "SIP-001",
        },
    ]);

    const [kodeOperator, setKodeOperator] = useState("");
    const [kodeTeknisi, setKodeTeknisi] = useState("");

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
                    concentration: step.concentration?.toString() || null,
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
        }
    }, [cipData]);

    const updateStepField = (index, field, value) => {
        const updatedSteps = [...cipSteps];
        updatedSteps[index] = {
            ...updatedSteps[index],
            [field]: value,
        };

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

        // Auto-calculate endTime if startTime or duration (timeXXMin) changes
        const cop = updatedCop[index];
        const timeDuration =
            cop.stepType === "COP"
                ? parseInt(cop.time67Min)
                : cop.stepType === "SOP"
                    ? parseInt(cop.time45Min)
                    : cop.stepType === "SIP"
                        ? parseInt(cop.time60Min)
                        : 0;

        if ((field === "startTime" || field === "time67Min" || field === "time45Min" || field === "time60Min") &&
            cop.startTime && !isNaN(timeDuration)) {
            const startMoment = moment(cop.startTime, "HH:mm");
            const endMoment = startMoment.clone().add(timeDuration, "minutes");
            updatedCop[index].endTime = endMoment.format("HH:mm");
        }

        setCopRecords(updatedCop);
    };

    const validateAndSave = () => {
        // Basic validation - only check required fields, no range validation
        const invalidSteps = cipSteps.filter(step =>
            !step.temperatureActual || !step.timeActual || !step.startTime || !step.endTime
        );

        if (invalidSteps.length > 0) {
            Alert.alert(
                "Validation Error",
                `Please fill all required fields for steps: ${invalidSteps.map(s => s.stepNumber).join(", ")}`
            );
            return null;
        }

        // Validate time format
        const invalidTimeSteps = cipSteps.filter(step => {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            return (step.startTime && !timeRegex.test(step.startTime)) ||
                (step.endTime && !timeRegex.test(step.endTime));
        });

        if (invalidTimeSteps.length > 0) {
            Alert.alert(
                "Time Format Error",
                `Invalid time format in steps: ${invalidTimeSteps.map(s => s.stepNumber).join(", ")}. Use HH:mm format.`
            );
            return null;
        }

        // Validate concentration for ALKALI and ACID (still required)
        const alkaliStep = cipSteps.find(s => s.stepName === "ALKALI");
        const acidStep = cipSteps.find(s => s.stepName === "ACID");

        if (alkaliStep && !alkaliStep.concentrationActual) {
            Alert.alert("Validation Error", "Please enter concentration for ALKALI step");
            return null;
        }

        if (acidStep && !acidStep.concentrationActual) {
            Alert.alert("Validation Error", "Please enter concentration for ACID step");
            return null;
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
            return null;
        }

        // Validate COP time format
        const invalidCopTimes = copRecords.filter(cop => {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            return (cop.startTime && !timeRegex.test(cop.startTime)) ||
                (cop.endTime && !timeRegex.test(cop.endTime));
        });

        if (invalidCopTimes.length > 0) {
            Alert.alert(
                "Time Format Error",
                `Invalid time format in COP records: ${invalidCopTimes.map(c => c.stepType).join(", ")}. Use HH:mm format.`
            );
            return null;
        }

        // Prepare data for save
        const dataToSave = {
            steps: cipSteps,
            copRecords: copRecords,
            kodeOperator: kodeOperator,
            kodeTeknisi: kodeTeknisi,
        };

        return dataToSave;
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
                    
                    {allowUnrestrictedInput ? (
                        <FlexibleNumericInput
                            value={step.temperatureActual}
                            onChangeText={(value) => updateStepField(index, "temperatureActual", value)}
                            placeholder="Temp"
                            minRange={parseFloat(step.temperatureSetpointMin)}
                            maxRange={parseFloat(step.temperatureSetpointMax)}
                            unit="°C"
                            style={styles.smallInput}
                            editable={isEditable}
                        />
                    ) : (
                        <TextInput
                            style={[styles.input, styles.smallInput]}
                            value={step.temperatureActual}
                            onChangeText={(value) => updateStepField(index, "temperatureActual", value)}
                            keyboardType="numeric"
                            placeholder="Temp"
                            editable={isEditable}
                        />
                    )}
                    
                    {(step.stepName === "ALKALI" || step.stepName === "ACID") && (
                        <>
                            <Text style={styles.separator}>|</Text>
                            {allowUnrestrictedInput ? (
                                <FlexibleNumericInput
                                    value={step.concentrationActual}
                                    onChangeText={(value) => updateStepField(index, "concentrationActual", value)}
                                    placeholder="Conc"
                                    minRange={step.stepName === "ALKALI" ? 1.5 : 0.5}
                                    maxRange={step.stepName === "ALKALI" ? 2.0 : 1.0}
                                    unit="%"
                                    style={styles.smallInput}
                                    editable={isEditable}
                                />
                            ) : (
                                <TextInput
                                    style={[styles.input, styles.smallInput]}
                                    value={step.concentrationActual}
                                    onChangeText={(value) => updateStepField(index, "concentrationActual", value)}
                                    keyboardType="numeric"
                                    placeholder="Conc"
                                    editable={isEditable}
                                />
                            )}
                        </>
                    )}
                </View>
            </View>

            <View style={styles.timeCell}>
                <Text style={styles.cellLabel}>Time (Min)</Text>
                {allowUnrestrictedInput ? (
                    <FlexibleNumericInput
                        value={step.timeActual}
                        onChangeText={(value) => updateStepField(index, "timeActual", value)}
                        placeholder={step.timeSetpoint}
                        minRange={parseFloat(step.timeSetpoint) * 0.8} // 20% tolerance
                        maxRange={parseFloat(step.timeSetpoint) * 1.2}
                        unit=" min"
                        style={styles.timeActualInput}
                        editable={isEditable}
                    />
                ) : (
                    <TextInput
                        style={[styles.input, styles.timeActualInput]}
                        value={step.timeActual}
                        onChangeText={(value) => updateStepField(index, "timeActual", value)}
                        keyboardType="numeric"
                        placeholder={step.timeSetpoint}
                        editable={isEditable}
                    />
                )}
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

    const renderCopRow = (cop, index) => (
        <View key={cop.stepType} style={styles.copRow}>
            <View style={styles.copTypeCell}>
                <Text style={styles.copType}>{cop.stepType}</Text>
            </View>

            <View style={styles.copTimeSection}>
                {cop.stepType === "COP" && (
                    <View style={styles.copTimeItem}>
                        <Text style={styles.copTimeLabel}>67 Menit</Text>
                        {allowUnrestrictedInput ? (
                            <FlexibleNumericInput
                                value={cop.time67Min}
                                onChangeText={(value) => updateCopField(index, "time67Min", value)}
                                placeholder="67"
                                minRange={60}
                                maxRange={75}
                                unit=" min"
                                style={styles.copTimeInput}
                                editable={isEditable}
                            />
                        ) : (
                            <TextInput
                                style={[styles.input, styles.copTimeInput]}
                                value={cop.time67Min}
                                onChangeText={(value) => updateCopField(index, "time67Min", value)}
                                keyboardType="numeric"
                                placeholder="67"
                                editable={isEditable}
                            />
                        )}
                    </View>
                )}
                {cop.stepType === "SOP" && (
                    <View style={styles.copTimeItem}>
                        <Text style={styles.copTimeLabel}>45 Menit</Text>
                        {allowUnrestrictedInput ? (
                            <FlexibleNumericInput
                                value={cop.time45Min}
                                onChangeText={(value) => updateCopField(index, "time45Min", value)}
                                placeholder="45"
                                minRange={40}
                                maxRange={50}
                                unit=" min"
                                style={styles.copTimeInput}
                                editable={isEditable}
                            />
                        ) : (
                            <TextInput
                                style={[styles.input, styles.copTimeInput]}
                                value={cop.time45Min}
                                onChangeText={(value) => updateCopField(index, "time45Min", value)}
                                keyboardType="numeric"
                                placeholder="45"
                                editable={isEditable}
                            />
                        )}
                    </View>
                )}
                {cop.stepType === "SIP" && (
                    <View style={styles.copTimeItem}>
                        <Text style={styles.copTimeLabel}>60 Menit</Text>
                        {allowUnrestrictedInput ? (
                            <FlexibleNumericInput
                                value={cop.time60Min}
                                onChangeText={(value) => updateCopField(index, "time60Min", value)}
                                placeholder="60"
                                minRange={55}
                                maxRange={65}
                                unit=" min"
                                style={styles.copTimeInput}
                                editable={isEditable}
                            />
                        ) : (
                            <TextInput
                                style={[styles.input, styles.copTimeInput]}
                                value={cop.time60Min}
                                onChangeText={(value) => updateCopField(index, "time60Min", value)}
                                keyboardType="numeric"
                                placeholder="60"
                                editable={isEditable}
                            />
                        )}
                    </View>
                )}
            </View>

            <View style={styles.copTempSection}>
                <Text style={styles.copTempLabel}>Temp ({cop.tempMin}-{cop.tempMax}°C)</Text>
                {allowUnrestrictedInput ? (
                    <FlexibleNumericInput
                        value={cop.tempActual}
                        onChangeText={(value) => updateCopField(index, "tempActual", value)}
                        placeholder="Actual"
                        minRange={parseFloat(cop.tempMin)}
                        maxRange={parseFloat(cop.tempMax)}
                        unit="°C"
                        style={styles.copTempInput}
                        editable={isEditable}
                    />
                ) : (
                    <TextInput
                        style={[styles.input, styles.copTempInput]}
                        value={cop.tempActual}
                        onChangeText={(value) => updateCopField(index, "tempActual", value)}
                        keyboardType="numeric"
                        placeholder="Actual"
                        editable={isEditable}
                    />
                )}
            </View>

            <View style={styles.copTimeRangeSection}>
                <Text style={styles.cellLabel}>Time</Text>
                <View style={styles.timeInputRow}>
                    <TimePickerInput
                        value={cop.startTime}
                        onChange={(value) => updateCopField(index, "startTime", value)}
                        placeholder="Start"
                        editable={isEditable}
                    />
                    <Text style={styles.timeSeparator}>-</Text>
                    <TimePickerInput
                        value={cop.endTime}
                        onChange={(value) => updateCopField(index, "endTime", value)}
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
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => {
                        const data = validateAndSave();
                        if (data && onSave) {
                            onSave(data);
                        }
                    }}
                >
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
    
    // Fixed Flexible Input Styles
    flexibleInputContainer: {
        marginBottom: 8, // Increased from 4
        width: "100%",
    },
    focusedInput: {
        borderColor: COLORS.blue,
        borderWidth: 2,
    },
    warningInput: {
        borderColor: COLORS.warningOrange,
        backgroundColor: COLORS.warningYellow,
        borderWidth: 2,
    },
    warningText: {
        fontSize: 9,
        color: COLORS.warningText,
        marginTop: 2, // Increased from 1
        fontStyle: 'italic',
        textAlign: 'center',
        lineHeight: 11, // Added
        paddingHorizontal: 2, // Added
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
    smallInput: {
        width: 48, // Increased from 45
        textAlign: "center",
        marginHorizontal: 1, // Added
    },
    timeActualInput: {
        width: 52, // Slightly increased
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
        width: 62, // Slightly increased
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
        width: 82, // Slightly increased
        textAlign: "center",
    },
    copTimeRangeSection: {
        marginBottom: 8,
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
    // Modal styles for iOS
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