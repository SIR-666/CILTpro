import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Button,
  Pressable,
  Platform,
} from "react-native";
import styles from "./signin.style";
import React, { useState } from "react";
import { COLORS, SIZES, TEXT } from "../../constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import WidthSpacer from "./WidthSpacer";
import HeightSpacer from "./HeightSpacer";
import ReusableBtn from "../Buttons/ReusableBtn";
import AppBar from "./AppBar";
import { Picker } from "@react-native-picker/picker";

const ReusableDropdown = ({ label, items }) => {
  const [selectedValue, setSelectedValue] = useState(items);

  return (
    <Picker
      style={{ width: "100%" }}
      // mode="dropdown"
      selectedValue={selectedValue}
      onValueChange={(itemValue, itemIndex) => setSelectedValue(itemValue)}
    >
      <Picker.Item
        label="Select option"
        value=""
        style={{ fontSize: 15, marginTop: 5, marginLeft: 5 }}
      />
      {items.map((item, index) => (
        <Picker.Item
          key={index}
          label={item}
          value={item}
          style={styles.dropdown}
        />
      ))}
    </Picker>
  );
};

export default ReusableDropdown;
