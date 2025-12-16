import { View, Text, Image, StyleSheet } from "react-native";

const ReportHeader = ({
    companyName = "PT. GREENFIELDS INDONESIA",
    title = "LAPORAN ROBOT PALLETIZER",
    headerMeta = { frm: "-", rev: "-", berlaku: "-", hal: "-" }
}) => {
    return (
        <View style={styles.headerWrap}>
            <View style={styles.headerRowTop}>
                <View style={styles.headerLogoBox}>
                    <Image
                        source={require("../../assets/GreenfieldsLogo_Green.png")}
                        style={styles.headerLogoImg}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.headerCompanyBox}>
                    <Text style={styles.headerCompanyText}>{companyName}</Text>
                </View>

                <View style={styles.headerMetaBox}>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaKey}>FRM</Text>
                        <Text style={styles.metaVal}>{headerMeta.frm}</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaKey}>Rev</Text>
                        <Text style={styles.metaVal}>{headerMeta.rev}</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaKey}>Berlaku</Text>
                        <Text style={styles.metaVal}>{headerMeta.berlaku}</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaKey}>Hal</Text>
                        <Text style={styles.metaVal}>{headerMeta.hal}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.headerRowBottom}>
                <Text style={styles.headerLeftCell}>JUDUL</Text>
                <Text style={styles.headerTitleCell}>{title}</Text>
            </View>
        </View>
    );
};

export default ReportHeader;

const styles = StyleSheet.create({
    headerWrap: {
        borderWidth: 1,
        borderColor: "#d7d7d7",
        borderRadius: 8,
        backgroundColor: "#fff",
        marginBottom: 14,
        overflow: "hidden",
    },
    headerRowTop: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
        gap: 8,
    },
    headerLogoBox: {
        width: 130,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    headerLogoImg: {
        width: "100%",
        height: "100%",
    },
    headerCompanyBox: {
        flex: 1,
        alignItems: "center",
    },
    headerCompanyText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
    },
    headerMetaBox: {
        width: 140,
        borderLeftWidth: 1,
        borderColor: "#e5e5e5",
        paddingLeft: 8,
    },
    metaRow: {
        flexDirection: "row",
        marginBottom: 2,
    },
    metaKey: {
        width: 60,
        fontSize: 11,
        color: "#333",
    },
    metaVal: {
        flex: 1,
        fontSize: 11,
        fontWeight: "600",
    },
    headerRowBottom: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: "#e5e5e5",
    },
    headerLeftCell: {
        width: 110,
        paddingVertical: 6,
        textAlign: "center",
        backgroundColor: "#fafafa",
        fontWeight: "600",
        borderRightWidth: 1,
        borderColor: "#e5e5e5",
    },
    headerTitleCell: {
        flex: 1,
        paddingVertical: 6,
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 12,
        color: "#333",
    }
});
