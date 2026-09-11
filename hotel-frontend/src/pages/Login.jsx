import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginApi } from "../api/request";
import { FaHotel, FaUser, FaLock } from "react-icons/fa";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      alert("请输入用户名和密码");
      return;
    }

    try {
      const res = await loginApi(username, password);

      if (res.data.code === 200) {
        localStorage.setItem("user", JSON.stringify(res.data.data));
        alert("登录成功");
        navigate("/home");
      } else {
        alert(res.data.message || "登录失败");
      }
    } catch (error) {
      console.error(error);
      alert("登录失败");
    }
  };

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card auth-card">
          <div className="auth-left luxury-bg">
            <div className="auth-badge">
              <FaHotel />
              <span>Hotel Management</span>
            </div>

            <div className="luxury-title-wrap">
              <h1 className="auth-title">Welcome</h1>
              <p className="auth-desc">Luxury · Elegant · Intelligent</p>
            </div>
          </div>

          <div className="auth-right">
            <div className="brand-row">
              <div className="brand-icon">
                <FaHotel />
              </div>
              <div>
                <div className="brand-title">云栖酒店</div>
                <div className="brand-subtitle">Management System</div>
              </div>
            </div>

            <h2 className="form-title">登录</h2>

            <div className="input-group">
              <label className="input-label">用户名</label>
              <div className="input-wrap">
                <FaUser className="input-icon" />
                <input
                  className="input"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">密码</label>
              <div className="input-wrap">
                <FaLock className="input-icon" />
                <input
                  className="input"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleLogin}>
              登录
            </button>

            <p className="link-text">
              没有账号？<Link to="/register">注册</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
