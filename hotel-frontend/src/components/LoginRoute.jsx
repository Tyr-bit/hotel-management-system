import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../utils/auth";

function LoginRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default LoginRoute;
