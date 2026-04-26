import axios from "axios";

const API = axios.create({
  baseURL: "https://inventory-backend-production-e00e.up.railway.app"
});

export default API;