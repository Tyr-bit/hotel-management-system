import { Link } from "react-router-dom";
import { FaShieldAlt, FaUsers, FaArrowRight, FaHotel } from "react-icons/fa";

function Admin() {
  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title">
                <FaShieldAlt />
                <span>Admin Console</span>
              </div>
              <div className="page-subtitle">Restricted Access</div>
            </div>
          </div>

          <div className="hero-banner admin-hero">
            <div className="hero-overlay">
              <div className="hero-chip">
                <FaHotel />
                <span>Admin Area</span>
              </div>
              <h1 className="hero-title">Control Center</h1>
            </div>
          </div>

          <div className="quick-grid" style={{ marginTop: "24px" }}>
            <Link to="/users" className="quick-card">
              <div className="quick-icon">
                <FaUsers />
              </div>
              <div className="quick-content">
                <div className="quick-title">用户管理</div>
                <div className="quick-arrow">
                  <FaArrowRight />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;
