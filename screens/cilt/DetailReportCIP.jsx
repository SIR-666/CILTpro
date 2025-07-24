import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import moment from "moment";
import { COLORS } from "../../constants/theme";
import { api } from "../../utils/axiosInstance";

const DetailReportCIP = ({ navigation, route }) => {
  const { cipReportId } = route.params;
  const [cipData, setCipData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusList, setStatusList] = useState([]);

  useEffect(() => {
    fetchCIPDetail();
    fetchStatusList();
  }, [cipReportId]);

  const fetchCIPDetail = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/cip-report/${cipReportId}`);
      setCipData(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching CIP detail:", error);
      setIsLoading(false);
      Alert.alert("Error", "Failed to load CIP report details");
    }
  };

  const fetchStatusList = async () => {
    try {
      const response = await api.get(`/cip-report/status/list`);
      setStatusList(response.data);
    } catch (error) {
      console.error("Error fetching status list:", error);
    }
  };

  const handleEdit = () => {
    // Pass complete cipData including all fields needed for editing
    navigation.navigate("EditCIP", { 
      cipData: {
        ...cipData,
        // Ensure all necessary fields are included
        id: cipData.id,
        line: cipData.line,
        posisi: cipData.posisi,
        valvePositions: cipData.valvePositions,
        flowRate: cipData.flowRate,
        flowRateBC: cipData.flowRateBC,
        flowRateD: cipData.flowRateD,
        kodeOperator: cipData.kodeOperator,
        kodeTeknisi: cipData.kodeTeknisi,
        steps: cipData.steps,
        copRecords: cipData.copRecords,
        specialRecords: cipData.specialRecords,
      }
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this CIP report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/cip-report/${cipReportId}`);
              Alert.alert("Success", "CIP report deleted successfully");
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to delete CIP report");
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    const statusItem = statusList.find(s => s.name === status);
    return statusItem ? statusItem.color : COLORS.darkGray;
  };

  const renderStepRow = (step) => (
    <View key={step.id} style={styles.stepRow}>
      <Text style={styles.stepNumber}>{step.stepNumber}</Text>
      <View style={styles.stepContent}>
        <Text style={styles.stepName}>{step.stepName}</Text>
        <View style={styles.stepDetails}>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>Temp:</Text>
            <Text style={styles.stepValue}>
              {step.temperatureSetpointMin || '-'}-{step.temperatureSetpointMax || '-'}°C / {step.temperatureActual || '-'}°C
            </Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>Time:</Text>
            <Text style={styles.stepValue}>
              {step.timeSetpoint || '-'} min
            </Text>
          </View>
          {(step.concentration || step.concentrationActual) && (
            <View style={styles.stepItem}>
              <Text style={styles.stepLabel}>Conc:</Text>
              <Text style={styles.stepValue}>{step.concentrationActual || '-'}%</Text>
            </View>
          )}
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>Duration:</Text>
            <Text style={styles.stepValue}>
              {step.startTime || '-'} - {step.endTime || '-'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCOPRow = (cop) => (
    <View key={cop.id} style={styles.copRow}>
      <View style={styles.copHeader}>
        <Text style={styles.copType}>{cop.stepType}</Text>
        <Text style={styles.copTime}>
          {cop.startTime || '-'} - {cop.endTime || '-'}
        </Text>
      </View>
      <View style={styles.copDetails}>
        <View style={styles.copItem}>
          <Text style={styles.copLabel}>Temp:</Text>
          <Text style={styles.copValue}>
            {cop.tempActual || '-'}°C ({cop.tempMin || '-'}-{cop.tempMax || '-'}°C)
          </Text>
        </View>
        {cop.time67Min && (
          <View style={styles.copItem}>
            <Text style={styles.copLabel}>67 min:</Text>
            <Text style={styles.copValue}>{cop.time67Min}</Text>
          </View>
        )}
        {cop.time45Min && (
          <View style={styles.copItem}>
            <Text style={styles.copLabel}>45 min:</Text>
            <Text style={styles.copValue}>{cop.time45Min}</Text>
          </View>
        )}
        {cop.time60Min && (
          <View style={styles.copItem}>
            <Text style={styles.copLabel}>60 min:</Text>
            <Text style={styles.copValue}>{cop.time60Min}</Text>
          </View>
        )}
      </View>
      <View style={styles.copFooter}>
        <Text style={styles.copFooterText}>Kode: {cop.kode || '-'}</Text>
      </View>
    </View>
  );

  const renderSpecialRow = (record) => (
    <View key={record.id} style={styles.specialRow}>
      <View style={styles.specialHeader}>
        <Text style={styles.specialType}>{record.stepType}</Text>
        <Text style={styles.specialTime}>
          {record.startTime || '-'} - {record.endTime || '-'}
        </Text>
      </View>
      <View style={styles.specialDetails}>
        {/* DRYING */}
        {record.stepType === "DRYING" && (
          <>
            <View style={styles.specialItem}>
              <Text style={styles.specialLabel}>Temp:</Text>
              <Text style={styles.specialValue}>
                {record.tempActual || '-'}°C ({record.tempMin || '-'}-{record.tempMax || '-'}°C)
              </Text>
            </View>
            <View style={styles.specialItem}>
              <Text style={styles.specialLabel}>Time:</Text>
              <Text style={styles.specialValue}>{record.time || '-'} min</Text>
            </View>
          </>
        )}

        {/* FOAMING */}
        {record.stepType === "FOAMING" && (
          <>
            <View style={styles.specialItem}>
              <Text style={styles.specialLabel}>Time:</Text>
              <Text style={styles.specialValue}>{record.time || '-'} min</Text>
            </View>
            <View style={styles.specialItem}>
              <Text style={styles.specialNote}>(No Temperature)</Text>
            </View>
          </>
        )}

        {/* DISINFECT/SANITASI */}
        {record.stepType === "DISINFECT/SANITASI" && (
          <>
            <View style={styles.specialItem}>
              <Text style={styles.specialLabel}>Conc:</Text>
              <Text style={styles.specialValue}>
                {record.concActual || '-'}% ({record.concMin || '-'}-{record.concMax || '-'}%)
              </Text>
            </View>
            <View style={styles.specialItem}>
              <Text style={styles.specialLabel}>Time:</Text>
              <Text style={styles.specialValue}>{record.time || '-'} min</Text>
            </View>
            <View style={styles.specialItem}>
              <Text style={styles.specialLabel}>Temp:</Text>
              <Text style={styles.specialValue}>
                {record.tempActual || '-'}°C 
                {cipData.line === 'LINE D' ? 
                  ` (${record.tempDMin || '-'}-${record.tempDMax || '-'}°C)` : 
                  ` (${record.tempBC || '-'}°C)`
                }
              </Text>
            </View>
          </>
        )}
      </View>
      <View style={styles.specialFooter}>
        <Text style={styles.specialFooterText}>Kode: {record.kode || '-'}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading CIP details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cipData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>CIP report not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={COLORS.blue} />
          </TouchableOpacity>
          <Text style={styles.title}>CIP Report Detail</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
              <Icon name="edit" size={24} color={COLORS.blue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
              <Icon name="delete" size={24} color={COLORS.red} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Info */}
        <View style={styles.mainInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Process Order:</Text>
            <Text style={styles.value}>{cipData.processOrder}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{moment(cipData.date).format("DD/MM/YYYY")}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Plant:</Text>
            <Text style={styles.value}>{cipData.plant}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Line:</Text>
            <Text style={styles.value}>{cipData.line}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>CIP Type:</Text>
            <Text style={styles.value}>{cipData.cipType}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, { color: getStatusColor(cipData.status) }]}>
              {cipData.status}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Operator:</Text>
            <Text style={styles.value}>{cipData.operator || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Posisi:</Text>
            <Text style={styles.value}>{cipData.posisi || '-'}</Text>
          </View>
          
          {/* Flow Rate for LINE A */}
          {cipData.line === 'LINE A' && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Flow Rate:</Text>
              <Text style={styles.value}>{cipData.flowRate || '-'} L/hr</Text>
            </View>
          )}
          
          {/* Flow Rates for LINE B/C/D */}
          {(cipData.line === 'LINE B' || cipData.line === 'LINE C') && cipData.flowRateBC && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Flow B,C:</Text>
              <Text style={styles.value}>{cipData.flowRateBC} L/H</Text>
            </View>
          )}
          
          {cipData.line === 'LINE D' && cipData.flowRateD && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Flow D:</Text>
              <Text style={styles.value}>{cipData.flowRateD} L/H</Text>
            </View>
          )}

          {/* Valve Positions for LINE B/C/D */}
          {(cipData.line === 'LINE B' || cipData.line === 'LINE C' || cipData.line === 'LINE D') && cipData.valvePositions && (
            <View style={styles.valveSection}>
              <Text style={styles.label}>Valve Positions:</Text>
              <View style={styles.valveContainer}>
                <Text style={styles.valveText}>
                  A: {cipData.valvePositions.A ? 'Open' : 'Close'} | 
                  B: {cipData.valvePositions.B ? 'Open' : 'Close'} | 
                  C: {cipData.valvePositions.C ? 'Open' : 'Close'}
                </Text>
              </View>
            </View>
          )}

          {/* Kode Operator & Teknisi */}
          {(cipData.kodeOperator || cipData.kodeTeknisi) && (
            <View style={styles.kodeContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Kode Operator:</Text>
                <Text style={styles.value}>{cipData.kodeOperator || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Kode Teknisi:</Text>
                <Text style={styles.value}>{cipData.kodeTeknisi || '-'}</Text>
              </View>
            </View>
          )}

          {cipData.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.notes}>{cipData.notes}</Text>
            </View>
          )}
        </View>

        {/* CIP Steps */}
        {cipData.steps && cipData.steps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CIP Steps</Text>
            {cipData.steps.map(renderStepRow)}
          </View>
        )}

        {/* COP/SOP/SIP Records for LINE A */}
        {cipData.line === 'LINE A' && cipData.copRecords && cipData.copRecords.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COP/SOP/SIP Records</Text>
            {cipData.copRecords.map(renderCOPRow)}
          </View>
        )}

        {/* Special Records for LINE B/C/D */}
        {(cipData.line === 'LINE B' || cipData.line === 'LINE C' || cipData.line === 'LINE D') && 
         cipData.specialRecords && cipData.specialRecords.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DRYING, FOAMING, DISINFECT/SANITASI Records</Text>
            {cipData.specialRecords.map(renderSpecialRow)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: COLORS.red,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.blue,
  },
  headerActions: {
    flexDirection: "row",
  },
  iconButton: {
    marginLeft: 16,
  },
  mainInfo: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    margin: 16,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    color: COLORS.black,
  },
  valveSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  valveContainer: {
    marginTop: 4,
  },
  valveText: {
    fontSize: 14,
    color: COLORS.black,
  },
  kodeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  notes: {
    fontSize: 14,
    color: COLORS.black,
    marginTop: 4,
    lineHeight: 20,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.blue,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.green,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.blue,
    marginRight: 12,
    minWidth: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.black,
    marginBottom: 4,
  },
  stepDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  stepItem: {
    flexDirection: "row",
    marginRight: 16,
    marginTop: 4,
  },
  stepLabel: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginRight: 4,
  },
  stepValue: {
    fontSize: 12,
    color: COLORS.black,
    fontWeight: "500",
  },
  copRow: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  copHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  copType: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.blue,
  },
  copTime: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  copDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  copItem: {
    flexDirection: "row",
    marginRight: 16,
    marginBottom: 4,
  },
  copLabel: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginRight: 4,
  },
  copValue: {
    fontSize: 12,
    color: COLORS.black,
    fontWeight: "500",
  },
  copFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  copFooterText: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginBottom: 2,
  },
  specialRow: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  specialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  specialType: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.orange,
  },
  specialTime: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  specialDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  specialItem: {
    flexDirection: "row",
    marginRight: 16,
    marginBottom: 4,
  },
  specialLabel: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginRight: 4,
  },
  specialValue: {
    fontSize: 12,
    color: COLORS.black,
    fontWeight: "500",
  },
  specialNote: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: "italic",
  },
  specialFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  specialFooterText: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginBottom: 2,
  },
});

export default DetailReportCIP;
