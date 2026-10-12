import Constants from "expo-constants";
import { Platform } from "react-native";
import { tokenStorage } from "../state/tokens";
import { createTransport } from "./transport";
const configured =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  "http://localhost:8080";
const host = Constants.expoConfig?.hostUri?.split(":")[0];
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  Platform.OS === "web" ||
  !host ||
  !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(configured)
    ? configured
    : `http://${host}:8080`
).replace(/\/$/, "");
export const api = createTransport(API_BASE_URL, tokenStorage);
