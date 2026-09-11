import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerApi } from "../api/request";
import { FaHotel, FaUser, FaLock, FaPhoneAlt } from "react-icons/fa";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const handleRegister = async () => {
    if (!username || !password || !phone) {
      alert("请填写完整信息");
      return;
    }

    try {
      const res = await registerApi(username, password, phone);

      if (res.data.code === 200) {
        alert("注册成功");
        navigate("/login");
      } else {
        alert(res.data.message || "注册失败");
      }
    } catch (error) {
      console.error(error);
      alert("注册失败");
    }
  };

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card auth-card">
          <div className="auth-left luxury-bg">
            <div className="auth-badge">
              <FaHotel />
              <span>Create Account</span>
            </div>

            <div className="luxury-title-wrap">
              <h1 className="auth-title">Register</h1>
              <p className="auth-desc">Simple · Clean · Premium</p>
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

            <h2 className="form-title">注册</h2>

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

            <div className="input-group">
              <label className="input-label">手机号</label>
              <div className="input-wrap">
                <FaPhoneAlt className="input-icon" />
                <input
                  className="input"
                  type="text"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleRegister}>
              注册
            </button>

            <p className="link-text">
              已有账号？<Link to="/login">登录</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
