import { navigateTo } from "nuxt/app";

export async function setupAuth() {
  // Initialization logic if any
}

export async function signIn(callback?: string) {
  callback && setSignInCallback(callback);
  navigateTo("/login");
}

export function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
  navigateTo("/login");
}

export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("auth_token");
}

export async function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
  }
}

export function getSignInCallback() {
  let callback = sessionStorage.getItem("callback");
  if (callback) {
    sessionStorage.removeItem("callback");
    return callback;
  } else {
    return "/";
  }
}

function setSignInCallback(callback: string) {
  sessionStorage.setItem("callback", callback);
}
