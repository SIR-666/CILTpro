import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Formik } from "formik";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Yup from "yup";
import { HeightSpacer, ReusableBtn, WidthSpacer } from "../../components";
import reusable from "../../components/Reusable/reusable.style";
import { COLORS, SIZES } from "../../constants/theme";
import { greatApi, sqlApi } from "../../utils/axiosInstance";
import styles from "./signin.style";

const validationSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Required"),
  email: Yup.string().email("Provide a valid email").required("Required"),
});

const Signin = ({ navigation }) => {
  const [loader, setLoader] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [obsecureText, setObsecureText] = useState(true);

  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  // Auth With Strapi
  const [fieldStrapi, setFieldStrapi] = useState(false);

  //email and password strapi
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  //Dimension
  const { width, height } = Dimensions.get("window");

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "1072980362374-9v923hrs55025ln82l5723ji70dnr4dg.apps.googleusercontent.com",
    });
  }, []);

  const errorLogin = () => {
    Alert.alert("Invalid Form", "Please provide all required fields", [
      {
        text: "Cancel",
        onPress: () => { },
      },
      {
        text: "Continue",
        onPress: () => { },
      },
      { defaultIndex: 1 },
    ]);
  };

  // const login = async (values) => {
  //   setLoader(true);

  //   try {
  //     const data = values;
  //     const response = await sqlApi.post("/login", data);
  //     // console.log("response ", response);
  //     if (response.status === 200) {
  //       setLoader(false);
  //       setResponseData(response.data);
  //       await AsyncStorage.setItem(
  //         "token",
  //         JSON.stringify(response.data.token)
  //       );
  //       console.log("response.data.token ", response.data.token);

  //       await AsyncStorage.setItem("user", values.email);
  //       navigation.replace("Bottom");
  //     } else {
  //       Alert.alert("Error Logging in ", "Please provide valid credentials ", [
  //         {
  //           text: "Cancel",
  //           onPress: () => { },
  //         },
  //         {
  //           text: "Continue",
  //           onPress: () => { },
  //         },
  //         { defaultIndex: 1 },
  //       ]);
  //     }
  //   } catch (error) {
  //     console.log("the error ", error);
  //     Alert.alert(
  //       "Error ",
  //       "Oops, Error logging in try again with correct credentials",
  //       [
  //         {
  //           text: "Cancel",
  //           onPress: () => { },
  //         },
  //         {
  //           text: "Continue",
  //           onPress: () => { },
  //         },
  //         { defaultIndex: 1 },
  //       ]
  //     );
  //   } finally {
  //     setLoader(false);
  //   }
  // };

  const addUser = async (userData) => {
    try {
      const response = await sqlApi.post("/googleSignIn", userData);
      console.log(response.data); // Menampilkan respons dari server
      return response.data;
    } catch (error) {
      if (error.response) {
        //console.error('Error responseee:', error.response.data);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error:", error.message);
      }
      throw error; // Melempar error agar dapat ditangkap di tempat lain
    }
  };

  const googleSignIn = async () => {
    try {
      //navigation.replace("Bottom");
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      setUserInfo(userInfo);
      setError("");
      await AsyncStorage.setItem("user", userInfo.user.email);
      await AsyncStorage.setItem("googleSignIn", "ada");
      const email = userInfo.user.email;
      const userData = {
        email: email,
        password: "null",
        username: email.split("@")[0],
        profile: "user",
      };
      addUser(userData);
      navigation.replace("Bottom");
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
        setError("Login Cancelled");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
        setError("Login in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
        setError("Play Services not available or outdated");
      } else {
        // some other error happened
        setError(error.message);
      }
    }
  };

  // STRAPI OLD
  // const handleStrapiSignIn = async (values) => {
  //   try {
  //     const res = await greatApi.post("/api/login", {
  //       identifier: values.email, // Menggunakan email dari formik
  //       password: values.password, // Menggunakan password dari formik
  //     });
  //     if (res.status == 200) {
  //       const responseData = res.data; // Mengambil data JSON dari respons
  //       await AsyncStorage.setItem("user", responseData.user.email);
  //       await AsyncStorage.setItem("userData", responseData.user.role.id.toString());
  //       await AsyncStorage.setItem("username", responseData.user.username);

  //       const userData = {
  //         email: responseData.user.email,
  //         password: "null",
  //         username: responseData.user.username,
  //         profile: "user",
  //         role: responseData.user.role.id,
  //       };
  //       // addUser(userData);
  //       navigation.replace("Bottom");
  //     } else {
  //       console.error("Error during sign-in:", res.status);
  //       Alert.alert("Login Error", "An error occurred during login.");
  //     }
  //   } catch (error) {
  //     console.error("Error during sign-in:", error);
  //     Alert.alert("Login Error", "An error occurred during login.");
  //   }
  // };

  // STRAPI NEW
  const handleStrapiSignIn = async (values) => {
    setLoader(true);
    try {
      const res = await greatApi.post("/auth/local", {
        identifier: values.email,
        password: values.password,
      });

      if (!res.data?.jwt || !res.data?.user) {
        throw new Error("JWT / user tidak ada dari Strapi");
      }

      const { jwt, user } = res.data;

      await AsyncStorage.multiSet([
        ["jwt", jwt],
        ["user", user.email],
        ["username", user.username],
        ["userData", user.role?.id?.toString() || ""],
      ]);

      navigation.replace("Bottom");
    } catch (error) {
      console.error(
        "STRAPI LOGIN ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Login Error",
        "Email / password salah atau Strapi tidak bisa diakses"
      );
    } finally {
      setLoader(false);
    }
  };

  const strapiSignIn = async () => {
    setFieldStrapi(true);
  };

  const defaultSignIn = async () => {
    setFieldStrapi(false);
  };

  useEffect(() => {
    console.log(fieldStrapi);
  }, [fieldStrapi]);

  return (
    <View style={styles.container}>
      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={validationSchema}
        onSubmit={(values) => {
          // fieldStrapi ? login(values) : handleStrapiSignIn(values);
          handleStrapiSignIn(values);
        }}
      >
        {({
          handleChange,
          touched,
          handleSubmit,
          values,
          errors,
          isValid,
          setFieldTouched,
        }) => (
          <>
            <View style={{ paddingTop: 30 }}>
              <View style={styles.wrapper}>
                <Text style={styles.label}>Email</Text>
                <View>
                  <View
                    style={styles.inputWrapper(
                      touched.email ? COLORS.lightBlue : COLORS.lightGrey
                    )}
                  >
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={20}
                      color={COLORS.gray}
                    />

                    <WidthSpacer width={10} />

                    <TextInput
                      placeholder="Enter email"
                      onFocus={() => {
                        setFieldTouched("email");
                      }}
                      onBlur={() => {
                        setFieldTouched("email", "");
                      }}
                      value={values.email}
                      onChangeText={handleChange("email")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1 }}
                    />
                  </View>
                  {touched.email && errors.email && (
                    <Text style={styles.errorMessage}>{errors.email}</Text>
                  )}
                </View>
              </View>

              <View style={styles.wrapper}>
                <Text style={styles.label}>Password</Text>
                <View>
                  <View
                    style={styles.inputWrapper(
                      touched.password ? COLORS.lightBlue : COLORS.lightGrey
                    )}
                  >
                    <MaterialCommunityIcons
                      name="lock-outline"
                      size={20}
                      color={COLORS.gray}
                    />

                    <WidthSpacer width={10} />

                    <TextInput
                      secureTextEntry={obsecureText}
                      placeholder="Enter password"
                      onFocus={() => {
                        setFieldTouched("password");
                      }}
                      onBlur={() => {
                        setFieldTouched("password", "");
                      }}
                      value={values.password}
                      onChangeText={handleChange("password")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1 }}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setObsecureText(!obsecureText);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={!obsecureText ? "eye-outline" : "eye-off-outline"}
                        size={18}
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={styles.errorMessage}>{errors.password}</Text>
                  )}
                </View>
              </View>

              <HeightSpacer height={20} />

              <View style={reusable.rowWithSpace("space-between")}>
                <AntDesign
                  name="leftcircleo"
                  size={45}
                  color={COLORS.green}
                  onPress={() => navigation.navigate("Onboard")}
                // onPress={() => navigation.navigate("Bottom")}
                // onPress={() => navigation.navigate("AuthTop")}
                />

                {fieldStrapi ? (
                  <ReusableBtn
                    onPress={isValid ? handleSubmit : errorLogin}
                    btnText={"SIGN IN"}
                    width={SIZES.width - 100}
                    backgroundColor={COLORS.green}
                    borderColor={COLORS.green}
                    borderWidth={0}
                    textColor={COLORS.white}
                  />
                ) : (
                  <ReusableBtn
                    onPress={
                      isValid ? () => handleStrapiSignIn(values) : errorLogin
                    }
                    btnText={"SIGN IN WITH GREAT"}
                    width={SIZES.width - 100}
                    backgroundColor={COLORS.green}
                    borderColor={COLORS.green}
                    borderWidth={0}
                    textColor={COLORS.white}
                  />
                )}
              </View>

              <View style={reusable.rowWithSpace("space-between")}>
                {/* Start Sign In Google*/}
                <TouchableOpacity onPress={googleSignIn}>
                  <View style={styles.wrapperAuth}>
                    <View>
                      <View style={styles.inputWrapperAuth(COLORS.black)}>
                        <Image
                          source={require("../../assets/google-icon.png")}
                          style={{ width: 25, height: 25 }}
                        />
                        <Text style={{ fontWeight: "bold" }}> o o g l e</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
                {/* end Sign In Google */}

                {fieldStrapi ? (
                  <TouchableOpacity onPress={defaultSignIn}>
                    <View style={styles.wrapperAuth}>
                      <View>
                        <View style={styles.inputWrapperAuth(COLORS.black)}>
                          <Text> Great</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={strapiSignIn}>
                    <View style={styles.wrapperAuth}>
                      <View>
                        <View style={styles.inputWrapperAuth(COLORS.black)}>
                          <AntDesign
                            name="arrowleft"
                            size={24}
                            color={COLORS.black}
                          />
                          <Text style={{ fontWeight: "bold", marginLeft: 10 }}>
                            Back
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}
      </Formik>
    </View>
  );
};

export default Signin;
