import { Navigate } from "react-router-dom";
import { getUser } from "../utils/auth";

function StaffRoute({ children, roles = null }) {
  const user = getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/no-permission" replace />;
  }

  return children;
}

export default StaffRoute;
