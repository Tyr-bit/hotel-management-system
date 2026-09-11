import axios from "axios";

const request = axios.create({
  baseURL: "http://127.0.0.1:5000",
  timeout: 5000
});

export function loginApi(username, password) {
  return request.post("/api/auth/login", {
    username,
    password
  });
}

export function registerApi(username, password, phone) {
  return request.post("/api/auth/register", {
    username,
    password,
    phone
  });
}
