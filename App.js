import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Splashscreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import {
  AddCilt,
  AddDowntime,
  DetailLaporanChecklistCILT,
  DetailLaporanCILT,
  DetailLaporanCILTGIGR,
  DetailLaporanH2O2Check,
  DetailLaporanPaperUsage,
  DetailLaporanScrewCap,
  DetailLaporanShiftlyCILT,
  DetailShiftlyDowntime,
  EditCilt,
  EditDowntime,
  EditShiftHandOver,
  HomeCILT,
  HomeHO,
  ListCILT,
  ListCILTDraft,
  ListDowntime,
  ListShiftHandOver,
  Onboarding,
  ShiftHandOver,
} from "./screens";

import AsyncStorage from "@react-native-async-storage/async-storage";
import messaging from "@react-native-firebase/messaging";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { StatusBar } from "expo-status-bar";
import { Alert } from "react-native";
import AuthTopTab from "./navigation/AuthTopTab";
import BottomTabNavigation from "./navigation/BottomTabNavigation";
import { sqlApi } from "./utils/axiosInstance";
//import PushNotification from 'react-native-push-notification';

const Stack = createNativeStackNavigator();

// Fungsi untuk mengirim token ke server
const sendTokenToServer = async (token) => {
  try {
    const response = await sqlApi.post("/notification/registerToken", token);
    const responseJson = await response.text();
    console.log("Server response:", responseJson);
  } catch (error) {
    console.error("error ", error);
  }
};

export default function App() {
  const [firstLaunch, setFirstLaunch] = useState(true);

  //lock orientation to portrait
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT
        );
        console.log("Screen orientation locked to portrait.");
      } catch (error) {
        console.error("Failed to lock screen orientation:", error);
      }
    };
    lockOrientation();
    appFirstLaunch();
  }, []);

  // Lock orientation before rendering
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT)
    .then(() => console.log("Orientation locked globally."))
    .catch((err) => console.error("Failed to lock orientation:", err));

  //CHEK IF USER CONNECT IN COMPANY NETWORK
  useEffect(() => {
    const checkNetworkConnection = async () => {
      try {
        const response = await sqlApi.get("/getgreenTAGallOpen/open");

        if (response.status == 200) {
          // Connection is active, you can proceed with API calls or data retrieval
          console.log("Connected to the office network");
        } else {
          // Not connected to the office network, show a warning
          Alert.alert(
            "Warning",
            "You are not connected to the office network. Please connect to use this feature."
          );
        }
      } catch (error) {
        // Handle network errors
        console.error("Error checking network connection:", error);
        Alert.alert(
          "Error",
          "There was an error checking your network connection. Please try again later."
        );
      }
    };

    checkNetworkConnection();
  }, []);

  const requestPermmission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log("Authorization status:", authStatus);
    }
  };

  const appFirstLaunch = async () => {
    const user = await AsyncStorage.getItem("user");
    if (user !== null) {
      setFirstLaunch(false);
    } else {
      setFirstLaunch(true);
    }
  };

  useEffect(() => {
    // const requestPermissionAndGetToken = async () => {
    //   const authStatus = await messaging().requestPermission();
    //   const enabled =
    //     authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    //     authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    //   if (enabled) {
    //     console.log("Authorization status:", authStatus);

    //     // Mendapatkan token FCM
    //     const fcmToken = await messaging().getToken();
    //     console.log("FCM Token:", fcmToken);
    //     await AsyncStorage.setItem("fcmToken", fcmToken);
    //     // TODO: Kirim token ke server Anda disini
    //     // Kirim token ke server
    //     sendTokenToServer(fcmToken);
    //   } else {
    //     console.log("Failed to get the permission to notify.");
    //   }
    // };

    // requestPermissionAndGetToken();

    // Menangani pemberitahuan saat aplikasi dibuka dari keadaan tertutup
    messaging()
      .getInitialNotification()
      .then(async (remoteMessage) => {
        if (remoteMessage) {
          console.log(
            "Notification caused app to open from quit state:",
            remoteMessage.notification
          );
        }
      });

    // Menangani pemberitahuan saat aplikasi berada di latar belakang dan dibuka
    messaging().onNotificationOpenedApp(async (remoteMessage) => {
      console.log(
        "Notification caused app to open from background state:",
        remoteMessage.notification
      );
    });

    // Menangani pemberitahuan saat aplikasi berada di latar depan
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      const { title, body } = remoteMessage.notification;
      Alert.alert(title, body);
    });

    // Menangani pesan di latar belakang
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log(
        "Message handled in the background:",
        remoteMessage.notification
      );
    });
    return unsubscribe; // Bersihkan langganan saat komponen dilepas
  }, []);

  // CHEK IF USER WAS LOGIN
  useEffect(() => {
    const checkLogin = async () => {
      const user = await AsyncStorage.getItem("user");
      if (user) {
        await GoogleSignin.hasPlayServices();
        setFirstLaunch(false);
      }
    };
    checkLogin();

    // Menghapus semua data dari AsyncStorage setelah sebulan (30 hari)
    const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
    const removeAfterThirtyDays = setTimeout(async () => {
      await AsyncStorage.clear();
    }, thirtyDaysInMillis);

    // Cleanup function untuk membersihkan timeout jika komponen di-unmount atau di-update
    return () => {
      clearTimeout(removeAfterThirtyDays);
    };
  }, []);

  const [fontsLoaded] = useFonts({
    regular: require("./assets/fonts/regular.otf"),
    medium: require("./assets/fonts/medium.otf"),
    bold: require("./assets/fonts/bold.otf"),
    light: require("./assets/fonts/light.otf"),
    xtrabold: require("./assets/fonts/xtrabold.otf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await Splashscreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer>
      <StatusBar />
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          animationEnabled: true, // Optional, for smooth transitions
          orientation: "portrait", // Enforce portrait in React Navigation
        }}
      >
        {firstLaunch && (
          <Stack.Screen
            name="Onboard"
            component={Onboarding}
            options={{ headerShown: false }}
          />
        )}
        <Stack.Screen
          name="Bottom"
          component={BottomTabNavigation}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AuthTop"
          component={AuthTopTab}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddDowntime"
          component={AddDowntime}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditDowntime"
          component={EditDowntime}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddCilt"
          component={AddCilt}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditCilt"
          component={EditCilt}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ShiftHandOver"
          component={ShiftHandOver}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ListShiftHandOver"
          component={ListShiftHandOver}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ListDowntime"
          component={ListDowntime}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ListCILT"
          component={ListCILT}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ListCILTDraft"
          component={ListCILTDraft}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DetailShiftlyDowntime"
          component={DetailShiftlyDowntime}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DetailLaporanShiftlyCILT"
          component={DetailLaporanShiftlyCILT}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DetailLaporanScrewCap"
          component={DetailLaporanScrewCap}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DetailLaporanPaperUsage"
          component={DetailLaporanPaperUsage}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DetailLaporanH2O2Check"
          component={DetailLaporanH2O2Check}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DetailLaporanChecklistCILT"
          component={DetailLaporanChecklistCILT}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DetailLaporanCILT"
          component={DetailLaporanCILT}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DetailLaporanCILTGIGR"
          component={DetailLaporanCILTGIGR}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HomeHO"
          component={HomeHO}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HomeCILT"
          component={HomeCILT}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditShiftHandOver"
          component={EditShiftHandOver}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
