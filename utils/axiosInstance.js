import axios from "axios";

const api = axios.create({
  baseURL: "http://10.0.2.2:3009",
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

const uploadImageApi = axios.create({
  baseURL: "http://10.24.7.70:3003",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

const greatApi = axios.create({
  baseURL: "http://10.24.0.155:3000",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

module.exports = {
  api,
  sqlApi,
  uploadImageApi,
  greatApi,
};
