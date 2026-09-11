import { Link, useNavigate } from "react-router-dom";
import {
  FaHotel,
  FaUserCircle,
  FaShieldAlt,
  FaUsers,
  FaDoorOpen,
  FaCrown,
  FaConciergeBell,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaUserFriends
} from "react-icons/fa";
import { getUser } from "../utils/auth";

const moduleConfigs = [
  { path: "/customers", icon: <FaUserFriends />, title: "客户信息管理", desc: "Customer Info", roles: ["ADMIN", "MANAGER", "STAFF", "CHECKIN", "USER"] },
  { path: "/reservations", icon: <FaCalendarCheck />, title: "预订管理", desc: "Reservation", roles: ["ADMIN", "MANAGER", "STAFF", "CHECKIN", "USER"] },
  { path: "/checkin", icon: <FaDoorOpen />, title: "入住办理", desc: "Check-in", roles: ["ADMIN", "MANAGER", "STAFF", "CHECKIN"] },
  { path: "/settlement", icon: <FaMoneyBillWave />, title: "结账管理", desc: "Settlement", roles: ["ADMIN", "MANAGER", "STAFF", "CHECKIN"] },
  { path: "/rooms", icon: <FaDoorOpen />, title: "客房信息管理", desc: "Room Management", roles: ["ADMIN", "MANAGER"] }
];

function Home() {
  const navigate = useNavigate();
  const user = getUser();
  const visibleModules = moduleConfigs.filter((item) => user?.role && item.roles.includes(user.role));

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title">
                <FaHotel />
                <span>云栖酒店管理系统</span>
              </div>
              <div className="page-subtitle">Hotel Management Console</div>
            </div>

            {user && (
              <div className="user-badge">
                <FaUserCircle />
                <span>{user.username}</span>
                <span
                  className={`role-tag ${
                    user.role === "ADMIN" ? "role-admin" : "role-user"
                  }`}
                  style={{ marginLeft: "6px" }}
                >
                  {user.role}
                </span>
              </div>
            )}
          </div>

          <div className="hero-banner">
            <div className="hero-overlay">
              <div className="hero-chip">
                <FaCrown />
                <span>Premium Hotel</span>
              </div>

              <h1 className="hero-title">Elegant Stay, Smart Manage</h1>

              <div className="hero-actions">
                {user?.role === "ADMIN" && (
                  <Link to="/users">
                    <button className="btn btn-primary" style={{ width: "auto" }}>
                      <FaUsers style={{ marginRight: 8 }} />
                      用户权限管理
                    </button>
                  </Link>
                )}

                <button
                  className="btn btn-secondary light-btn"
                  onClick={handleLogout}
                  style={{ width: "auto" }}
                >
                  <FaDoorOpen style={{ marginRight: 8 }} />
                  退出登录
                </button>
              </div>
            </div>
          </div>

          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#2b4f89",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <FaConciergeBell /> 前台管理
          </h2>

          <div className="quick-grid" style={{ marginBottom: 28 }}>
            {visibleModules.map((module) => (
              <Link to={module.path} key={module.path} style={{ textDecoration: "none" }}>
                <div className="quick-card">
                  <div className="quick-icon">{module.icon}</div>
                  <div className="quick-content">
                    <div>
                      <div className="quick-title">{module.title}</div>
                      <div className="page-subtitle">{module.desc}</div>
                    </div>
                    <span style={{ color: "#7094cb", fontSize: 18 }}>&gt;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid-panels two-panels">
            <div className="info-panel stat-panel premium-panel">
              <div className="panel-icon">
                <FaUserCircle />
              </div>
              <div className="stat-value">{user ? user.username : "--"}</div>
              <div className="stat-label">当前账号</div>
            </div>

            <div className="info-panel stat-panel premium-panel">
              <div className="panel-icon">
                <FaShieldAlt />
              </div>
              <div className="stat-value">{user ? user.role : "--"}</div>
              <div className="stat-label">系统角色</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
