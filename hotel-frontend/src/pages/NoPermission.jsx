import { Link } from "react-router-dom";
import { FaLock, FaArrowLeft, FaExclamationTriangle } from "react-icons/fa";

function NoPermission() {
  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card center-page no-permission-card">
          <div className="warning-icon">
            <FaExclamationTriangle />
          </div>
          
          <div className="center-icon lock-icon">
            <FaLock />
          </div>
          
          <h1 className="center-title error-title">403</h1>
          <p className="center-subtitle">访问被拒绝</p>
          <p className="center-desc">
            抱歉，您没有权限访问此页面。<br />
            请联系管理员获取相应权限。
          </p>

          <div className="center-actions">
            <Link to="/home">
              <button className="btn btn-primary" style={{ width: "auto" }}>
                <FaArrowLeft style={{ marginRight: 8 }} />
                返回首页
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoPermission;
