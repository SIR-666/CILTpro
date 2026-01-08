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
  const raw = route.params?.cipReportId ?? route.params?.id;
  const cipReportId = Number(raw);

  if (!Number.isFinite(cipReportId)) {
    Alert.alert("Error", "Invalid CIP id");
    return null;
  }

  const [cipData, setCipData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusList, setStatusList] = useState([]);

  useEffect(() => {
    fetchCIPDetail();
    fetchStatusList();
  }, [cipReportId]);

  const fetchCIPDetail = async () => {
    setIsLoading(true);
    if (!cipReportId) {
      Alert.alert("Error", "Invalid CIP id");
      setIsLoading(false);
      return;
    }
    try {
      const response = await api.get(`/cip-report/${cipReportId}`);
      const raw = response.data;

      // 🔑 NORMALISASI AGAR DETAIL = EDIT
      const normalized = {
        ...raw,

        // steps
        steps: raw.steps || raw.cip_steps || [],

        // records
        copRecords: raw.copRecords || raw.cop_records || [],
        specialRecords: raw.specialRecords || raw.special_records || [],

        // valve
        valvePositions:
          typeof raw.valvePositions === "string"
            ? JSON.parse(raw.valvePositions)
            : raw.valvePositions || raw.valve_config || null,

        // flow rate
        flowRate:
          raw.flowRate ??
          raw.flowRates?.flowBC ??
          raw.flowRates?.flowD ??
          null,
      };

      setCipData(normalized);
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
    navigation.navigate("EditCIP", {
      cipData: {
        ...cipData,
        id: cipData.id,
        line: cipData.line,
        posisi: cipData.posisi,
        valvePositions: cipData.valvePositions,
        flowRate: cipData.flowRate,
        steps: cipData.steps,
        copRecords: cipData.copRecords,
        specialRecords: cipData.specialRecords,
      }
    });
  };

  const handleSubmit = () => {
    Alert.alert(
      "Submit Report",
      "Are you sure you want to submit this CIP report? Once submitted, it cannot be edited without admin approval.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          style: "default",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const response = await api.put(`/cip-report/${cipReportId}/submit`);

              if (response.data.warnings && response.data.warnings.length > 0) {
                const warningMessages = response.data.warnings.map(w => `• ${w.message}`).join('\n\n');
                Alert.alert(
                  "⚠️ Submitted with Warnings",
                  `Your report has been submitted with the following warnings:\n\n${warningMessages}\n\nPlease note these for future reference.`,
                  [{ text: "OK", onPress: () => fetchCIPDetail() }]
                );
              } else {
                Alert.alert("Success", "CIP report submitted successfully", [
                  { text: "OK", onPress: () => fetchCIPDetail() }
                ]);
              }
            } catch (error) {
              console.error("Error submitting CIP report:", error);
              Alert.alert("Error", error.response?.data?.message || "Failed to submit CIP report");
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Complete':
        return 'check-circle';
      case 'In Progress':
        return 'hourglass-empty';
      case 'Under Review':
        return 'rate-review';
      case 'Approved':
        return 'verified';
      case 'Rejected':
        return 'error';
      case 'Cancelled':
        return 'cancel';
      default:
        return 'info';
    }
  };

  const isDraft = cipData?.status === 'In Progress';
  const isSubmitted = cipData?.status === 'Complete';
  const canEdit = isDraft || cipData?.status === 'Rejected';

  const renderStepRow = (step, idx) => (
    <View key={step.id ?? idx} style={styles.stepRow}>
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

  const renderCOPRow = (cop, idx) => (
    <View key={cop.id ?? idx} style={styles.copRow}>
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
        <View style={styles.copItem}>
          <Text style={styles.copLabel}>Time:</Text>
          <Text style={styles.copValue}>{cop.time || '-'} min</Text>
        </View>
      </View>
    </View>
  );

  const renderSpecialRow = (record, idx) => (
    <View key={record.id ?? idx} style={styles.specialRow}>
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
                {record.tempActual || '-'}°C ({record.tempMin || '118'}-{record.tempMax || '125'}°C)
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
                {record.concActual || '-'}% ({record.concMin || '0.3'}-{record.concMax || '0.5'}%)
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
                {cipData?.line === 'LINE D'
                  ? ` (${record.tempDMin || '20'}-${record.tempDMax || '35'}°C)`
                  : ` (${record.tempBC || '40'}°C)`
                }
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  // Helper to get flow rate display
  const getFlowRateDisplay = () => {
    if (!cipData) return '-';
    if (cipData.line === 'LINE A') {
      return `${cipData.flowRate || '-'} L/H (min: 12000 L/H)`;
    }

    if (cipData.line === 'LINE D') {
      return `${cipData.flowRateD || '-'} L/H (min: 6000 L/H)`;
    }

    // LINE B / C
    return `${cipData.flowRateBC || '-'} L/H (min: 9000 L/H)`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={styles.loadingText}>Loading CIP Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cipData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color={COLORS.red} />
          <Text style={styles.errorText}>CIP Report not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isLineA = cipData.line === 'LINE A';
  const isLineBCD = ['LINE B', 'LINE C', 'LINE D'].includes(cipData.line);
  const valvePos = (() => {
    try {
      return typeof cipData?.valvePositions === "string"
        ? JSON.parse(cipData.valvePositions)
        : cipData?.valvePositions;
    } catch {
      return null;
    }
  })();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.blue} />
        </TouchableOpacity>
        <Text style={styles.title}>CIP Report Detail</Text>
        <View style={styles.headerActions}>
          {canEdit && (
            <TouchableOpacity style={styles.iconButton} onPress={handleEdit}>
              <Icon name="edit" size={24} color={COLORS.blue} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
            <Icon name="delete" size={24} color={COLORS.red} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(cipData.status) }]}>
          <Icon name={getStatusIcon(cipData.status)} size={18} color="#fff" />
          <Text style={styles.statusBadgeText}>{cipData.status}</Text>
        </View>
        {isDraft && (
          <Text style={styles.draftNote}>This is a draft. Complete and submit when ready.</Text>
        )}
        {isSubmitted && (
          <Text style={styles.submittedNote}>Report has been submitted.</Text>
        )}
      </View>

      {/* Action Buttons */}
      {isDraft && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Icon name="edit" size={20} color="#fff" />
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitButtonLarge}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="send" size={20} color="#fff" />
                <Text style={styles.buttonText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Info */}
        <View style={styles.mainInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{moment(cipData.date).format("DD MMMM YYYY")}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Process Order:</Text>
            <Text style={styles.value}>{cipData.processOrder || cipData.process_order || '-'}</Text>
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
            <Text style={styles.value}>{cipData.cipType || cipData.cip_type || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Operator:</Text>
            <Text style={styles.value}>{cipData.operator || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Posisi:</Text>
            <Text style={styles.value}>{cipData.posisi || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Flow Rate:</Text>
            <Text style={styles.value}>{getFlowRateDisplay()}</Text>
          </View>

          {/* Valve Positions for LINE B/C/D */}
          {isLineBCD && valvePos && (
            <View style={styles.valveSection}>
              <Text style={styles.label}>Valve Positions:</Text>
              <View style={styles.valveContainer}>
                <Text style={styles.valveText}>
                  A: {valvePos.A ? 'Open' : 'Close'} |
                  B: {valvePos.B ? 'Open' : 'Close'} |
                  C: {valvePos.C ? 'Open' : 'Close'}
                </Text>
              </View>
            </View>
          )}

          {/* Notes */}
          {cipData.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.notes}>{cipData.notes}</Text>
            </View>
          )}

          {/* Created By */}
          {cipData.createdBy && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Created By:</Text>
              <Text style={styles.value}>{cipData.createdBy}</Text>
            </View>
          )}
        </View>

        {/* CIP Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CIP Steps</Text>
          {cipData.steps && cipData.steps.length > 0 ? (
            cipData.steps.map((step, idx) => renderStepRow(step, idx))
          ) : (
            <Text style={styles.emptyText}>No CIP steps recorded</Text>
          )}
        </View>

        {/* LINE A: COP/SOP/SIP Records */}
        {isLineA && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COP / SOP / SIP Records</Text>
            {cipData.copRecords && cipData.copRecords.length > 0 ? (
              cipData.copRecords.map((cop, idx) => renderCOPRow(cop, idx))
            ) : (
              <Text style={styles.emptyText}>No COP/SOP/SIP records</Text>
            )}
          </View>
        )}

        {/* LINE B/C/D: Special Records */}
        {isLineBCD && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Records (DRYING/FOAMING/DISINFECT)</Text>
            {cipData.specialRecords && cipData.specialRecords.length > 0 ? (
              cipData.specialRecords.map((record, idx) => renderSpecialRow(record, idx))
            ) : (
              <Text style={styles.emptyText}>No special records</Text>
            )}
          </View>
        )}

        {/* Spacer */}
        <View style={{ height: 40 }} />
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
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.darkGray,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
    padding: 8,
  },
  statusContainer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 6,
  },
  draftNote: {
    fontSize: 12,
    color: COLORS.orange,
    textAlign: "center",
    fontStyle: "italic",
  },
  submittedNote: {
    fontSize: 12,
    color: COLORS.green,
    textAlign: "center",
    fontStyle: "italic",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  editButton: {
    backgroundColor: COLORS.blue,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: "center",
  },
  submitButtonLarge: {
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
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
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: "italic",
    textAlign: "center",
    padding: 16,
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
});

export default DetailReportCIP;
