import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const api = axios.create({
  baseURL: "http://10.24.0.81:3009",
  // baseURL: "http://10.0.2.2:3009",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

const sqlApi = axios.create({
  baseURL: "http://10.24.7.70:8080",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

sqlApi.interceptors.request.use(async (config) => {
  const jwt = await AsyncStorage.getItem("jwt");
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }
  return config;
});

const uploadImageApi = axios.create({
  baseURL: "http://10.24.7.70:3003",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

const greatApi = axios.create({
  baseURL: "http://10.24.0.155:1337",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

greatApi.interceptors.request.use(async (config) => {
  const jwt = await AsyncStorage.getItem("jwt");
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }
  return config;
});

module.exports = {
  api,
  sqlApi,
  uploadImageApi,
  greatApi,
};
