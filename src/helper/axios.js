import axios from "axios";
import jwt from "jsonwebtoken";
import { AUTHORISED_KEY, jwt_TOKEN, PARTNERId } from "../config/index.js";


const generatePaysprintToken = () => {
  const secret = jwt_TOKEN; // env me rakho
  const payload = {
   timestamp: Math.floor(Date.now() / 1000),
    partnerId: PARTNERId,
    reqid: Math.floor(Math.random() * 1000000)
  };

  const token=jwt.sign(payload, secret, { algorithm: "HS256" });
  console.log(token)
  return token
};


generatePaysprintToken()

export const axiosInstance = axios.create({
  // baseURL: "https://sit.paysprint.in/service-api/api/v1/",
  baseURL: "https://api.paysprint.in/api/v1/",
  headers: {
    "Content-Type": "application/json",
    "Authorisedkey": AUTHORISED_KEY
  }
});


axiosInstance.interceptors.request.use((config) => {

  const newToken = generatePaysprintToken(); 

  config.headers["Token"] = newToken;

  return config;
});

