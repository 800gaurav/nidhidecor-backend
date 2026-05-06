import { config } from "dotenv";

config();

export const PORT = process.env.PORT
export const MONGO_URI = process.env.MONGO_URI
export const JWT_SECRET = process.env.JWT_SECRET
export const JWT_EXPIRE = process.env.JWT_EXPIRE
export const SMTP_HOST = process.env.SMTP_HOST
export const SMTP_USER = process.env.SMTP_USER
export const SMTP_PORT = process.env.SMTP_PORT
export const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD
export const BCRYPTSALT = process.env.BCRYPTSALT

export const QROLOGIC_BASE_URL = process.env.QROLOGIC_BASE_URL
export const QROLOGIC_API_KEY = process.env.QROLOGIC_API_KEY
export const QROLOGIC_USER_ID = process.env.QROLOGIC_USER_ID
export const QROLOGIC_PASSWORD = process.env.QROLOGIC_PASSWORD

// pay sprit
export const jwt_TOKEN = process.env.jwt_TOKEN
export const PARTNERId = process.env.PARTNERId
export const AUTHORISED_KEY = process.env.AUTHORISED_KEY


export const QROLOGIC_AUTH = Buffer.from(`${QROLOGIC_USER_ID}:${QROLOGIC_PASSWORD}`).toString("base64");
