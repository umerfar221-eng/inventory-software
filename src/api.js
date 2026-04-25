import axios from "axios";

const API = axios.create({
  baseURL: "http://192.168.100.125:5000"
});

export default API;