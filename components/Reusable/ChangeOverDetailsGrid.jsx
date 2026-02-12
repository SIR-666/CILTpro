import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const ChangeOverDetailsGrid = ({ rows = [], setRows }) => {
  return (
    <View style={styles.changeOverContainer}>
      <Text style={styles.changeOverTitle}>Change Over Details</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.changeOverHorizontalContent}
        nestedScrollEnabled
      >
        <View style={styles.changeOverGrid}>
          <View style={styles.changeOverHeader}>
            <Text style={[styles.changeOverHeaderText, styles.changeOverColStep]}>
              Step
            </Text>
            <Text
              style={[styles.changeOverHeaderText, styles.changeOverColTarget]}
            >
              Target
            </Text>
            <Text
              style={[styles.changeOverHeaderText, styles.changeOverColMinutes]}
            >
              Min
            </Text>
            <Text
              style={[styles.changeOverHeaderText, styles.changeOverColRemark]}
            >
              Remarks
            </Text>
          </View>

          <ScrollView
            style={styles.changeOverRowsScroll}
            contentContainerStyle={styles.changeOverRowsContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {rows.map((row, index) => (
              <View key={`${row.label}-${index}`} style={styles.changeOverRow}>
                <Text style={[styles.changeOverStepText, styles.changeOverColStep]}>
                  {row.label}
                </Text>
                <Text
                  style={[styles.changeOverTargetText, styles.changeOverColTarget]}
                >
                  {row.target || "-"}
                </Text>
                <TextInput
                  style={[styles.changeOverInput, styles.changeOverColMinutes]}
                  keyboardType="numeric"
                  value={String(row.minutes ?? "")}
                  onChangeText={(text) =>
                    setRows((prev) =>
                      prev.map((item, rowIndex) =>
                        rowIndex === index ? { ...item, minutes: text } : item
                      )
                    )
                  }
                  placeholder="0"
                />
                <TextInput
                  style={[styles.changeOverInput, styles.changeOverColRemark]}
                  value={String(row.remark ?? "")}
                  onChangeText={(text) =>
                    setRows((prev) =>
                      prev.map((item, rowIndex) =>
                        rowIndex === index ? { ...item, remark: text } : item
                      )
                    )
                  }
                  placeholder="Remark"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  changeOverContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  changeOverHorizontalContent: {
    paddingBottom: 4,
    paddingRight: 4,
  },
  changeOverGrid: {
    minWidth: 660,
  },
  changeOverTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
  changeOverHeader: {
    flexDirection: "row",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },
  changeOverHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    paddingHorizontal: 4,
  },
  changeOverRowsScroll: {
    minHeight: 120,
    maxHeight: 240,
  },
  changeOverRowsContent: {
    paddingBottom: 4,
  },
  changeOverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    minHeight: 40,
    gap: 8,
  },
  changeOverColStep: {
    width: 240,
    paddingRight: 8,
  },
  changeOverColTarget: {
    width: 90,
  },
  changeOverColMinutes: {
    width: 90,
  },
  changeOverColRemark: {
    width: 220,
  },
  changeOverStepText: {
    fontSize: 12,
    lineHeight: 16,
    paddingVertical: 8,
  },
  changeOverTargetText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
  },
  changeOverInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    backgroundColor: "#fff",
    minHeight: 38,
    textAlignVertical: "center",
  },
});

export default ChangeOverDetailsGrid;
