import axios from "axios";

const request = axios.create({
  baseURL: "http://127.0.0.1:5000",
  timeout: 5000
});

request.interceptors.request.use(
  (config) => {
    try {
      const userStr = localStorage.getItem("user");

      if (userStr) {
        const parsedUser = JSON.parse(userStr);

        if (parsedUser.token) {
          config.headers.Authorization = `Bearer ${parsedUser.token}`;
        }
      }
    } catch (error) {
      localStorage.removeItem("user");
    }

    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("请求错误：", error);
    return Promise.reject(error);
  }
);

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

export function getUserListApi() {
  return request.get("/api/users");
}

export function createUserApi(data) {
  return request.post("/api/users", data);
}

export function updateUserApi(id, data) {
  return request.put(`/api/users/${id}`, data);
}

export function deleteUserApi(id) {
  return request.delete(`/api/users/${id}`);
}

export function updateUserRoleApi(id, role) {
  return request.put(`/api/users/${id}/role`, {
    role
  });
}

export function updateUserStatusApi(id, status) {
  return request.put(`/api/users/${id}/status`, {
    status
  });
}

// ==================== B 模块：客户管理 ====================
export function getCustomersApi() {
  return request.get("/api/customers");
}

export function createCustomerApi(data) {
  return request.post("/api/customers", data);
}

export function updateCustomerApi(idCard, data) {
  return request.put(`/api/customers/${idCard}`, data);
}

export function deleteCustomerApi(idCard) {
  return request.delete(`/api/customers/${idCard}`);
}

// ==================== B 模块：客房 ====================
export function getRoomTypesApi() {
  return request.get("/api/room-types");
}

export function getRoomsApi() {
  return request.get("/api/rooms");
}

export function getAvailableRoomsApi() {
  return request.get("/api/rooms/available");
}

// ==================== B 模块：预订 ====================
export function getReservationsApi() {
  return request.get("/api/reservations");
}

export function createReservationApi(data) {
  return request.post("/api/reservations", data);
}

export function updateReservationApi(id, data) {
  return request.put(`/api/reservations/${id}`, data);
}

// ==================== B 模块：入住 ====================
export function getCheckinsApi() {
  return request.get("/api/checkins");
}

export function createCheckinApi(data) {
  return request.post("/api/checkins", data);
}

export function changeRoomApi(checkinId, newRoomId) {
  return request.put(`/api/checkins/${checkinId}/room-change`, { new_room_id: newRoomId });
}

export function checkoutApi(checkinId, paymentMethod) {
  return request.post(`/api/checkins/${checkinId}/checkout`, { payment_method: paymentMethod });
}

// ==================== B 模块：结算 ====================
export function getSettlementsApi() {
  return request.get("/api/settlements");
}

export function createRoomTypeApi(data) {
  return request.post("/api/room-types", data);
}

export function updateRoomTypeApi(typeId, data) {
  return request.put(`/api/room-types/${typeId}`, data);
}

export function deleteRoomTypeApi(typeId) {
  return request.delete(`/api/room-types/${typeId}`);
}

// ==================== 客房管理 (增删改查) ====================
export function createRoomApi(data) {
  return request.post("/api/rooms", data);
}

export function updateRoomApi(roomId, data) {
  return request.put(`/api/rooms/${roomId}`, data);
}

export function deleteRoomApi(roomId) {
  return request.delete(`/api/rooms/${roomId}`);
}

// ==================== 客户高级查询 ====================
export function searchCustomersApi(keyword, memberLevel) {
  let url = "/api/customers/search";
  const params = [];
  if (keyword) params.push(`keyword=${encodeURIComponent(keyword)}`);
  if (memberLevel) params.push(`member_level=${memberLevel}`);
  if (params.length) url += `?${params.join("&")}`;
  return request.get(url);
}

export function updateCustomerPointsApi(idCard, points, reason) {
  return request.put(`/api/customers/${idCard}/points`, { points, reason });
}

// ==================== 房间状态查询 ====================
export function getRoomsStatusApi() {
  return request.get("/api/rooms/status");
}

export function getAvailableRoomsByDateApi(checkinDate, checkoutDate, roomType = "") {
  let url = `/api/rooms/available-by-date?checkin_date=${checkinDate}&checkout_date=${checkoutDate}`;
  if (roomType) url += `&room_type=${encodeURIComponent(roomType)}`;
  return request.get(url);
}

export function getRoomCalendarApi(roomId) {
  return request.get(`/api/rooms/calendar/${roomId}`);
}

export function createAdvancedReservationApi(data) {
  return request.post("/api/reservations/advanced", data);
}
export default request;
