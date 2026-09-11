const USER_KEY = "user";

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser() {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

export function removeUser() {
  localStorage.removeItem("user");
}

export function isLoggedIn() {
  return !!getUser();
}

export function isAdmin() {
  const user = getUser();
  return user && user.role === "ADMIN";
}

export function hasRole(roles) {
  const user = getUser();
  return !!user && roles.includes(user.role);
}
