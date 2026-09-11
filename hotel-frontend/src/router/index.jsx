import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Admin from "../pages/Admin";
import UserManage from "../pages/UserManage";
import NoPermission from "../pages/NoPermission";
import CustomerInfo from "../pages/CustomerInfo";
import Reservation from "../pages/Reservation";
import Checkin from "../pages/Checkin";
import RoomChange from "../pages/RoomChange";
import Settlement from "../pages/Settlement";
import RoomManage from "../pages/RoomManage";
import RoomTypeManage from "../pages/RoomTypeManage";

import AdminRoute from "../components/AdminRoute";
import LoginRoute from "../components/LoginRoute";
import ManagerRoute from "../components/ManagerRoute";
import StaffRoute from "../components/StaffRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    path: "/home",
    element: (
      <LoginRoute>
        <Home />
      </LoginRoute>
    )
  },
  {
    path: "/no-permission",
    element: <NoPermission />
  },
  {
    path: "/admin",
    element: (
      <AdminRoute>
        <Admin />
      </AdminRoute>
    )
  },
  {
    path: "/users",
    element: (
      <AdminRoute>
        <UserManage />
      </AdminRoute>
    )
  },
  {
    path: "/customers",
    element: (
      <StaffRoute roles={["ADMIN", "MANAGER", "STAFF", "CHECKIN", "USER"]}>
        <CustomerInfo />
      </StaffRoute>
    )
  },
  {
    path: "/reservations",
    element: (
      <StaffRoute roles={["ADMIN", "MANAGER", "STAFF", "CHECKIN", "USER"]}>
        <Reservation />
      </StaffRoute>
    )
  },
  {
    path: "/checkin",
    element: (
      <StaffRoute roles={["ADMIN", "MANAGER", "STAFF", "CHECKIN"]}>
        <Checkin />
      </StaffRoute>
    )
  },
  {
    path: "/room-change",
    element: (
      <StaffRoute roles={["ADMIN", "MANAGER", "STAFF", "CHECKIN"]}>
        <RoomChange />
      </StaffRoute>
    )
  },
  {
    path: "/settlement",
    element: (
      <StaffRoute roles={["ADMIN", "MANAGER", "STAFF", "CHECKIN"]}>
        <Settlement />
      </StaffRoute>
    )
  },
  {
    path: "/rooms",
    element: (
      <ManagerRoute>
        <RoomManage />
      </ManagerRoute>
    )
  },
  {
    path: "/room-types",
    element: (
      <AdminRoute>
        <RoomTypeManage />
      </AdminRoute>
    )
  }
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
