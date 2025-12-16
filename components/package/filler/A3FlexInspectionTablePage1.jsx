import React, { useState, useEffect, useCallback } from "react";
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

const normalizeLine = (line) =>
  (line || "").toUpperCase().replace(/\s+/g, "_");

const getHeaderMeta = (line) => {
  const ln = normalizeLine(line);

  switch (ln) {
    case "LINE_E":
      return {
        frm: "FIL - 052 - 12",
        rev: "",
        berlaku: "1 - Jul - 24",
        hal: "1 dari 5",
      };
    case "LINE_F":
    case "LINE_G":
      return {
        frm: "FIL - 081 - 08",
        rev: "",
        berlaku: "10 - Oct - 22",
        hal: "1 dari 5",
      };

    default:
      return {
        frm: "-",
        rev: "-",
        berlaku: "-",
        hal: "2 dari 5",
      };
  }
};

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* REUSABLE SECTION (Accordion) */
const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
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

const A3FlexInspectionTablePage1 = ({ 
  line = "LINE_E",
  plant,
  machine,
  packageName,
  onDataChange,  // ✅ FIX: Menerima callback dari parent
  initialData,   // ✅ FIX: Menerima initial data dari parent
}) => {

  // Header / informasi produk
  const [headerInfo, setHeaderInfo] = useState({
    tanggal: "",
    judul: "",
    namaProduk: "",
    kemasan: "",
    mesin: "",
    lineMesin: "",
    kodeProduksi: "",
    kodeKadaluwarsa: "",
  });

  // Persiapan proses
  const [persiapanProses, setPersiapanProses] = useState({
    prepareToTubeSeal: "",
    tubeSeal: "",
    heatSterilization: "",
    spraying: "",
    sterilizationDone: "",
    production: "",
    stopProduction: "",
  });

  // Data counter pack
  const [counterPack, setCounterPack] = useState({
    counter1Stop: "",
    counter1Start: "",
    totalCounterPack: "",
    wasteCounter2: "",
    hourMeterStart: "",
    hourMeterStop: "",
    totalHourMeter: "",
    exitingCounter: "",
    incomingPackageCounter6: "",
  });

  // Inkubasi QC & Sample Operator
  const [inkubasiQC, setInkubasiQC] = useState({
    inkubasi: "",
    testingQC: "",
    totalQC: "",
  });

  const [sampleOperator, setSampleOperator] = useState({
    splicingPaper: "",
    testingOperator: "",
    totalOperator: "",
    totalInkubasiDanSample: "",
  });

  const [cekLabelAlergen, setCekLabelAlergen] = useState(false);
  const [mpmStripNote, setMpmStripNote] = useState("");

  // Tabel PAPER
  const emptyPaperRow = () => ({
    jam: "",
    roll: "",
    paperOrder: "",
    qtyLabel: "",
    globalId: "",
    countReading: "",
    kondisiPaper: "",
    splicingPaper: "",
    jamMpm: "",
    lotNo: "",
    kode: "",
  });

  const [paperRows, setPaperRows] = useState(
    Array(5).fill(null).map(() => emptyPaperRow())
  );

  // Persiapan H2O2
  const [persiapanH2O2, setPersiapanH2O2] = useState({
    typeH2O2: "",
    jam: "",
    h2o2Liter: "",
    oleh1: "",
    oleh2: "",
  });

  // Penambahan H2O2
  const emptyAddRow = () => ({
    volume: "",
    jam: "",
    oleh: "",
  });

  const [penambahanH2O2, setPenambahanH2O2] = useState(
    Array(3).fill(null).map(() => emptyAddRow())
  );

  // MCCP–4
  const emptyMccpRow = () => ({
    jam: "",
    persen: "",
    oleh: "",
  });

  const [mccpRows, setMccpRows] = useState(
    Array(3).fill(null).map(() => emptyMccpRow())
  );

  // CHECK Kondisi Inductor & Dolly
  const [checkKondisi, setCheckKondisi] = useState({
    kondisiInductor: "",
    kondisiDolly: "",
  });

  // Catatan ketidaksesuaian selama proses produksi
  const emptyNcRow = () => ({
    waktuMulai: "",
    waktuSelesai: "",
    jumlahMenit: "",
    uraianMasalah: "",
    tindakan: "",
    dilakukanOleh: "",
  });

  const [ncRows, setNcRows] = useState(
    Array(5).fill(null).map(() => emptyNcRow())
  );

  const [totalStop, setTotalStop] = useState("");
  const [catatanAkhir, setCatatanAkhir] = useState("");

  // ✅ FIX: Load initial data jika ada
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const initial = initialData[0];
      if (initial?.headerInfo) setHeaderInfo(initial.headerInfo);
      if (initial?.persiapanProses) setPersiapanProses(initial.persiapanProses);
      if (initial?.counterPack) setCounterPack(initial.counterPack);
      if (initial?.inkubasiQC) setInkubasiQC(initial.inkubasiQC);
      if (initial?.sampleOperator) setSampleOperator(initial.sampleOperator);
      if (initial?.cekLabelAlergen !== undefined) setCekLabelAlergen(initial.cekLabelAlergen);
      if (initial?.mpmStripNote) setMpmStripNote(initial.mpmStripNote);
      if (initial?.paperRows && initial.paperRows.length > 0) setPaperRows(initial.paperRows);
      if (initial?.persiapanH2O2) setPersiapanH2O2(initial.persiapanH2O2);
      if (initial?.penambahanH2O2 && initial.penambahanH2O2.length > 0) setPenambahanH2O2(initial.penambahanH2O2);
      if (initial?.mccpRows && initial.mccpRows.length > 0) setMccpRows(initial.mccpRows);
      if (initial?.checkKondisi) setCheckKondisi(initial.checkKondisi);
      if (initial?.ncRows && initial.ncRows.length > 0) setNcRows(initial.ncRows);
      if (initial?.totalStop) setTotalStop(initial.totalStop);
      if (initial?.catatanAkhir) setCatatanAkhir(initial.catatanAkhir);
    }
  }, [initialData]);

  // ✅ FIX: Kirim data ke parent setiap kali ada perubahan
  useEffect(() => {
    const combinedData = [
      {
        headerInfo,
        persiapanProses,
        counterPack,
        inkubasiQC,
        sampleOperator,
        cekLabelAlergen,
        mpmStripNote,
        paperRows: paperRows.filter(row => 
          Object.values(row).some(v => v && v.toString().trim() !== "")
        ),
        persiapanH2O2,
        penambahanH2O2: penambahanH2O2.filter(row => 
          Object.values(row).some(v => v && v.toString().trim() !== "")
        ),
        mccpRows: mccpRows.filter(row => 
          Object.values(row).some(v => v && v.toString().trim() !== "")
        ),
        checkKondisi,
        ncRows: ncRows.filter(row => 
          Object.values(row).some(v => v && v.toString().trim() !== "")
        ),
        totalStop,
        catatanAkhir,
        packageType: packageName,
        line: line,
        plant: plant,
        machine: machine,
      }
    ];
    
    onDataChange?.(combinedData);
  }, [
    headerInfo, persiapanProses, counterPack, inkubasiQC, sampleOperator,
    cekLabelAlergen, mpmStripNote, paperRows, persiapanH2O2, penambahanH2O2,
    mccpRows, checkKondisi, ncRows, totalStop, catatanAkhir,
    packageName, line, plant, machine, onDataChange
  ]);

  /* HANDLER GENERIC */
  const updateHeader = (field, value) => {
    setHeaderInfo((prev) => ({ ...prev, [field]: value }));
  };

  const updatePersiapanProses = (field, value) => {
    setPersiapanProses((prev) => ({ ...prev, [field]: value }));
  };

  const updateCounterPack = (field, value) => {
    setCounterPack((prev) => ({ ...prev, [field]: value }));
  };

  const updateInkubasiQC = (field, value) => {
    setInkubasiQC((prev) => ({ ...prev, [field]: value }));
  };

  const updateSampleOperator = (field, value) => {
    setSampleOperator((prev) => ({ ...prev, [field]: value }));
  };

  const updatePaperRow = (index, field, value) => {
    setPaperRows((prev) => {
      const rows = [...prev];
      rows[index] = { ...rows[index], [field]: value };

      const isLast = index === rows.length - 1;
      const hasValue = Object.values(rows[index]).some(
        (v) => (v || "").toString().trim() !== ""
      );
      if (isLast && hasValue) {
        rows.push(emptyPaperRow());
      }

      return rows;
    });
  };

  const deletePaperRow = (index) => {
    setPaperRows((prev) => {
      if (prev.length <= 1) return prev;
      const rows = prev.filter((_, i) => i !== index);
      return rows;
    });
  };

  const updatePersiapanH2O2 = (field, value) => {
    setPersiapanH2O2((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddRow = (index, field, value) => {
    setPenambahanH2O2((prev) => {
      const rows = [...prev];
      rows[index] = { ...rows[index], [field]: value };

      const isLast = index === rows.length - 1;
      const hasValue = Object.values(rows[index]).some(
        (v) => (v || "").toString().trim() !== ""
      );
      if (isLast && hasValue) {
        rows.push(emptyAddRow());
      }

      return rows;
    });
  };

  const deleteAddRow = (index) => {
    setPenambahanH2O2((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateMccpRow = (index, field, value) => {
    setMccpRows((prev) => {
      const rows = [...prev];
      rows[index] = { ...rows[index], [field]: value };

      const isLast = index === rows.length - 1;
      const hasValue = Object.values(rows[index]).some(
        (v) => (v || "").toString().trim() !== ""
      );
      if (isLast && hasValue) {
        rows.push(emptyMccpRow());
      }

      return rows;
    });
  };

  const deleteMccpRow = (index) => {
    setMccpRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateCheckKondisi = (field, value) => {
    setCheckKondisi((prev) => ({ ...prev, [field]: value }));
  };

  const updateNcRow = (index, field, value) => {
    setNcRows((prev) => {
      const rows = [...prev];
      rows[index] = { ...rows[index], [field]: value };

      const isLast = index === rows.length - 1;
      const hasValue = Object.values(rows[index]).some(
        (v) => (v || "").toString().trim() !== ""
      );
      if (isLast && hasValue) {
        rows.push(emptyNcRow());
      }

      return rows;
    });
  };

  const deleteNcRow = (index) => {
    setNcRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <ScrollView style={styles.container} nestedScrollEnabled>
      <ReportHeader
        title="LAPORAN MESIN A3 / FLEX (PAGE 1)"
        headerMeta={getHeaderMeta(line)}
      />

      {/* SECTION INFORMASI PRODUK */}
      <Section title="INFORMASI PRODUK" defaultOpen={true}>
        <View style={styles.cardBox}>
          <View style={styles.grid2}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tanggal</Text>
              <TextInput
                style={styles.input}
                value={headerInfo.tanggal}
                onChangeText={(v) => updateHeader("tanggal", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Judul</Text>
              <TextInput
                style={styles.input}
                value={headerInfo.judul}
                onChangeText={(v) => updateHeader("judul", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nama Produk</Text>
              <TextInput
                style={styles.input}
                value={headerInfo.namaProduk}
                onChangeText={(v) => updateHeader("namaProduk", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Kemasan</Text>
              <TextInput
                style={styles.input}
                value={headerInfo.kemasan}
                onChangeText={(v) => updateHeader("kemasan", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mesin</Text>
              <TextInput
                style={styles.input}
                value={headerInfo.mesin}
                onChangeText={(v) => updateHeader("mesin", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Line Mesin</Text>
              <TextInput
                style={styles.input}
                value={headerInfo.lineMesin}
                onChangeText={(v) => updateHeader("lineMesin", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Kode Produksi</Text>
              <TextInput
                style={styles.input}
                value={headerInfo.kodeProduksi}
                onChangeText={(v) => updateHeader("kodeProduksi", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Kode Kadaluwarsa</Text>
              <TextInput
                style={styles.input}
                value={headerInfo.kodeKadaluwarsa}
                onChangeText={(v) => updateHeader("kodeKadaluwarsa", v)}
              />
            </View>
          </View>
        </View>
      </Section>

      {/* SECTION PERSIAPAN PROSES */}
      <Section title="PERSIAPAN PROSES">
        <View style={styles.cardBox}>
          <View style={styles.grid2}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Prepare to Tube Seal</Text>
              <TextInput
                style={styles.input}
                value={persiapanProses.prepareToTubeSeal}
                onChangeText={(v) => updatePersiapanProses("prepareToTubeSeal", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tube Seal</Text>
              <TextInput
                style={styles.input}
                value={persiapanProses.tubeSeal}
                onChangeText={(v) => updatePersiapanProses("tubeSeal", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Heat Sterilization</Text>
              <TextInput
                style={styles.input}
                value={persiapanProses.heatSterilization}
                onChangeText={(v) => updatePersiapanProses("heatSterilization", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Spraying</Text>
              <TextInput
                style={styles.input}
                value={persiapanProses.spraying}
                onChangeText={(v) => updatePersiapanProses("spraying", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Sterilization Done</Text>
              <TextInput
                style={styles.input}
                value={persiapanProses.sterilizationDone}
                onChangeText={(v) => updatePersiapanProses("sterilizationDone", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Production</Text>
              <TextInput
                style={styles.input}
                value={persiapanProses.production}
                onChangeText={(v) => updatePersiapanProses("production", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Stop Production</Text>
              <TextInput
                style={styles.input}
                value={persiapanProses.stopProduction}
                onChangeText={(v) => updatePersiapanProses("stopProduction", v)}
              />
            </View>
          </View>
        </View>
      </Section>

      {/* SECTION COUNTER PACK */}
      <Section title="DATA COUNTER PACK">
        <View style={styles.cardBox}>
          <View style={styles.grid2}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Counter 1 Stop</Text>
              <TextInput
                style={styles.input}
                value={counterPack.counter1Stop}
                onChangeText={(v) => updateCounterPack("counter1Stop", v)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Counter 1 Start</Text>
              <TextInput
                style={styles.input}
                value={counterPack.counter1Start}
                onChangeText={(v) => updateCounterPack("counter1Start", v)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Counter Pack</Text>
              <TextInput
                style={styles.input}
                value={counterPack.totalCounterPack}
                onChangeText={(v) => updateCounterPack("totalCounterPack", v)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Waste Counter 2</Text>
              <TextInput
                style={styles.input}
                value={counterPack.wasteCounter2}
                onChangeText={(v) => updateCounterPack("wasteCounter2", v)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Hour Meter Start</Text>
              <TextInput
                style={styles.input}
                value={counterPack.hourMeterStart}
                onChangeText={(v) => updateCounterPack("hourMeterStart", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Hour Meter Stop</Text>
              <TextInput
                style={styles.input}
                value={counterPack.hourMeterStop}
                onChangeText={(v) => updateCounterPack("hourMeterStop", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Hour Meter</Text>
              <TextInput
                style={styles.input}
                value={counterPack.totalHourMeter}
                onChangeText={(v) => updateCounterPack("totalHourMeter", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Exiting Counter</Text>
              <TextInput
                style={styles.input}
                value={counterPack.exitingCounter}
                onChangeText={(v) => updateCounterPack("exitingCounter", v)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Incoming Package Counter 6</Text>
              <TextInput
                style={styles.input}
                value={counterPack.incomingPackageCounter6}
                onChangeText={(v) => updateCounterPack("incomingPackageCounter6", v)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </Section>

      {/* SECTION INKUBASI QC & SAMPLE OPERATOR */}
      <Section title="INKUBASI QC & SAMPLE OPERATOR">
        <View style={styles.cardBox}>
          <Text style={styles.subTitle}>Inkubasi QC</Text>
          <View style={styles.grid2}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Inkubasi</Text>
              <TextInput
                style={styles.input}
                value={inkubasiQC.inkubasi}
                onChangeText={(v) => updateInkubasiQC("inkubasi", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Testing QC</Text>
              <TextInput
                style={styles.input}
                value={inkubasiQC.testingQC}
                onChangeText={(v) => updateInkubasiQC("testingQC", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Total QC</Text>
              <TextInput
                style={styles.input}
                value={inkubasiQC.totalQC}
                onChangeText={(v) => updateInkubasiQC("totalQC", v)}
              />
            </View>
          </View>

          <Text style={[styles.subTitle, { marginTop: 12 }]}>Sample Operator</Text>
          <View style={styles.grid2}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Splicing Paper</Text>
              <TextInput
                style={styles.input}
                value={sampleOperator.splicingPaper}
                onChangeText={(v) => updateSampleOperator("splicingPaper", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Testing Operator</Text>
              <TextInput
                style={styles.input}
                value={sampleOperator.testingOperator}
                onChangeText={(v) => updateSampleOperator("testingOperator", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Operator</Text>
              <TextInput
                style={styles.input}
                value={sampleOperator.totalOperator}
                onChangeText={(v) => updateSampleOperator("totalOperator", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Inkubasi & Sample</Text>
              <TextInput
                style={styles.input}
                value={sampleOperator.totalInkubasiDanSample}
                onChangeText={(v) => updateSampleOperator("totalInkubasiDanSample", v)}
              />
            </View>
          </View>
        </View>
      </Section>

      {/* SECTION CHECK KONDISI */}
      <Section title="CHECK KONDISI INDUCTOR & DOLLY">
        <View style={styles.cardBox}>
          <View style={styles.grid2}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Kondisi Inductor</Text>
              <TextInput
                style={styles.input}
                value={checkKondisi.kondisiInductor}
                onChangeText={(v) => updateCheckKondisi("kondisiInductor", v)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Kondisi Dolly</Text>
              <TextInput
                style={styles.input}
                value={checkKondisi.kondisiDolly}
                onChangeText={(v) => updateCheckKondisi("kondisiDolly", v)}
              />
            </View>
          </View>
        </View>
      </Section>

      {/* SECTION CATATAN */}
      <Section title="CATATAN KETIDAKSESUAIAN">
        <View style={styles.cardBox}>
          <ScrollView horizontal>
            <View style={styles.dataTable}>
              <View style={styles.dataHeaderRow}>
                <Text style={[styles.dataHeaderCell, { width: 70 }]}>Mulai</Text>
                <Text style={[styles.dataHeaderCell, { width: 70 }]}>Selesai</Text>
                <Text style={[styles.dataHeaderCell, { width: 70 }]}>Jml Menit</Text>
                <Text style={[styles.dataHeaderCell, { width: 220 }]}>Uraian Masalah</Text>
                <Text style={[styles.dataHeaderCell, { width: 220 }]}>Tindakan</Text>
                <Text style={[styles.dataHeaderCell, { width: 140 }]}>Dilakukan oleh</Text>
                <Text style={[styles.dataHeaderCell, { width: 40 }]}>X</Text>
              </View>

              {ncRows.map((row, i) => (
                <View key={i} style={styles.dataRow}>
                  <TextInput
                    style={[styles.dataInput, { width: 70 }]}
                    value={row.waktuMulai}
                    onChangeText={(v) => updateNcRow(i, "waktuMulai", v)}
                  />
                  <TextInput
                    style={[styles.dataInput, { width: 70 }]}
                    value={row.waktuSelesai}
                    onChangeText={(v) => updateNcRow(i, "waktuSelesai", v)}
                  />
                  <TextInput
                    style={[styles.dataInput, { width: 70 }]}
                    value={row.jumlahMenit}
                    onChangeText={(v) => updateNcRow(i, "jumlahMenit", v)}
                  />
                  <TextInput
                    style={[styles.dataInput, { width: 220 }]}
                    value={row.uraianMasalah}
                    onChangeText={(v) => updateNcRow(i, "uraianMasalah", v)}
                    multiline
                  />
                  <TextInput
                    style={[styles.dataInput, { width: 220 }]}
                    value={row.tindakan}
                    onChangeText={(v) => updateNcRow(i, "tindakan", v)}
                    multiline
                  />
                  <TextInput
                    style={[styles.dataInput, { width: 140 }]}
                    value={row.dilakukanOleh}
                    onChangeText={(v) => updateNcRow(i, "dilakukanOleh", v)}
                  />
                  <TouchableOpacity
                    onPress={() => deleteNcRow(i)}
                    style={styles.deleteCell}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.formRow, { marginTop: 8 }]}>
            <Text style={[styles.label, { flex: 0.7 }]}>Total stop</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={totalStop}
              onChangeText={setTotalStop}
            />
          </View>

          <Text style={[styles.label, { marginTop: 8 }]}>Catatan :</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            value={catatanAkhir}
            onChangeText={setCatatanAkhir}
            placeholder="Catatan tambahan..."
          />
        </View>
      </Section>
    </ScrollView>
  );
};

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7f8",
    padding: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
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
  cardBox: {
    backgroundColor: "#fdfefe",
    borderWidth: 1,
    borderColor: "#d6dedb",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: "#2b4f3b",
  },
  subTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 2,
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  formGroup: {
    width: "48%",
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    marginBottom: 2,
    color: "#333",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cdd4d1",
    backgroundColor: "#fff",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    color: "#000",
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
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
    padding: 6,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 11,
    borderRightWidth: 1,
    borderColor: "#cdd4d1",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    minHeight: 34,
    alignItems: "center",
  },
  dataInput: {
    borderWidth: 0,
    paddingHorizontal: 6,
    fontSize: 11,
    color: "#000",
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderColor: "#eee",
    paddingVertical: 4,
  },
  deleteCell: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderColor: "#eee",
  },
  deleteText: {
    color: "#c0392b",
    fontSize: 16,
    fontWeight: "bold",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#cdd4d1",
    borderRadius: 8,
    minHeight: 70,
    padding: 8,
    backgroundColor: "#fff",
    fontSize: 12,
    color: "#000",
    textAlignVertical: "top",
  },
});

export default A3FlexInspectionTablePage1;