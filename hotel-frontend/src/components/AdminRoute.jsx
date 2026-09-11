import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  let user = null;

  try {
    const userStr = localStorage.getItem("user");
    user = userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    localStorage.removeItem("user");
    user = null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "ADMIN") {
    return <Navigate to="/no-permission" replace />;
  }

  return children;
}

export default AdminRoute;
