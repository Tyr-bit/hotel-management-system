import { Navigate } from "react-router-dom";
import { getUser } from "../utils/auth";

function ManagerRoute({ children }) {
  const user = getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!["ADMIN", "MANAGER"].includes(user.role)) {
    return <Navigate to="/no-permission" replace />;
  }

  return children;
}

export default ManagerRoute;
