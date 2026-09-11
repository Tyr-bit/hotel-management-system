import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCustomersApi, createCustomerApi, updateCustomerApi, deleteCustomerApi,
  searchCustomersApi, updateCustomerPointsApi
} from "../api/request";
import { getUser } from "../utils/auth";
import {
  FaUsers, FaUserCircle, FaPlus, FaEdit, FaTrash, FaPhone, FaIdCard, FaHome,
  FaSearch, FaStar, FaCrown, FaTrophy, FaWallet
} from "react-icons/fa";

function CustomerInfo() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchLevel, setSearchLevel] = useState("");

  // 积分调整相关状态
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsCustomer, setPointsCustomer] = useState(null);
  const [pointsForm, setPointsForm] = useState({ points: "", reason: "" });

  const [form, setForm] = useState({
    id_card: "", name: "", address: "", phone: "", member_level: "普通会员"
  });

  const user = getUser();
  const isAdminUser = user?.role === "ADMIN";

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await getCustomersApi();
      if (res.data.code === 200) setCustomers(res.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // 高级搜索
  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await searchCustomersApi(searchKeyword, searchLevel);
      if (res.data.code === 200) setCustomers(res.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const resetSearch = async () => {
    setSearchKeyword("");
    setSearchLevel("");
    loadCustomers();
  };

  // 打开积分调整模态框
  const openPointsModal = (customer) => {
    setPointsCustomer(customer);
    setPointsForm({ points: "", reason: "" });
    setShowPointsModal(true);
  };

  // 调整积分
  const handleAddPoints = async () => {
    if (!pointsForm.points) {
      alert("请输入积分数量");
      return;
    }
    try {
      const res = await updateCustomerPointsApi(
        pointsCustomer.id_card,
        parseInt(pointsForm.points),
        pointsForm.reason || "积分调整"
      );
      if (res.data.code === 200) {
        alert(res.data.message);
        loadCustomers();
        setShowPointsModal(false);
      } else {
        alert(res.data.message);
      }
    } catch (e) { 
      alert("操作失败"); 
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ id_card: "", name: "", address: "", phone: "", member_level: "普通会员" });
    setShowModal(true);
  };

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({
      id_card: customer.id_card,
      name: customer.name,
      address: customer.address || "",
      phone: customer.phone || "",
      member_level: customer.member_level
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.id_card || !form.name) {
      alert("身份证号和姓名不能为空");
      return;
    }
    try {
      if (editing) {
        const res = await updateCustomerApi(editing.id_card, form);
        if (res.data.code === 200) { 
          alert("修改成功"); 
          loadCustomers(); 
          setShowModal(false); 
        } else alert(res.data.message);
      } else {
        const res = await createCustomerApi(form);
        if (res.data.code === 200) { 
          alert("新增成功"); 
          loadCustomers(); 
          setShowModal(false); 
        } else alert(res.data.message);
      }
    } catch (e) { 
      alert("操作失败"); 
    }
  };

  const handleDelete = async (idCard) => {
    if (!window.confirm("确定要删除该客户吗？")) return;
    try {
      const res = await deleteCustomerApi(idCard);
      if (res.data.code === 200) { 
        alert("删除成功"); 
        loadCustomers(); 
      } else alert(res.data.message);
    } catch (e) { 
      alert("删除失败"); 
    }
  };

  const levelOptions = ["普通会员", "银卡会员", "金卡会员"];

  // 获取会员等级对应的样式和图标
  const getLevelIcon = (level) => {
    if (level === "金卡会员") return <FaCrown style={{ color: "#ffd700", marginRight: 4 }} />;
    if (level === "银卡会员") return <FaTrophy style={{ color: "#c0c0c0", marginRight: 4 }} />;
    return <FaStar style={{ color: "#cd7f32", marginRight: 4 }} />;
  };

  const getLevelClass = (level) => {
    if (level === "金卡会员") return "role-admin";
    if (level === "银卡会员") return "role-staff";
    return "role-user";
  };

  // 获取升级提示
  const getUpgradeHint = (level, points) => {
    if (level === "普通会员") {
      const needed = 3000 - points;
      return needed > 0 ? `再消费 ¥${needed} 升级银卡` : "可升级银卡！";
    }
    if (level === "银卡会员") {
      const needed = 10000 - points;
      return needed > 0 ? `再消费 ¥${needed} 升级金卡` : "可升级金卡！";
    }
    return "已达最高等级";
  };

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title"><FaUsers /><span>客户信息管理</span></div>
              <div className="page-subtitle">Customer Information</div>
            </div>
            <div className="toolbar-actions">
              <button className="btn btn-secondary" onClick={() => navigate("/home")}>
                <FaHome style={{ marginRight: 8 }} />返回首页
              </button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={openCreate}>
                <FaPlus style={{ marginRight: 8 }} />新增客户
              </button>
            </div>
          </div>

          {/* 高级搜索栏 */}
          <div style={{ marginBottom: 24, padding: "16px 0", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 2 }}>
                <label className="input-label">关键词搜索</label>
                <div className="input-wrap">
                  <FaSearch className="input-icon" />
                  <input 
                    className="input" 
                    placeholder="姓名 / 身份证号 / 手机号" 
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)} 
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()} 
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label className="input-label">会员等级</label>
                <select 
                  className="input select-input" 
                  value={searchLevel} 
                  onChange={(e) => setSearchLevel(e.target.value)}
                >
                  <option value="">全部</option>
                  <option value="普通会员">普通会员</option>
                  <option value="银卡会员">银卡会员</option>
                  <option value="金卡会员">金卡会员</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleSearch}>
                <FaSearch style={{ marginRight: 8 }} />搜索
              </button>
              <button className="btn btn-secondary" style={{ width: "auto" }} onClick={resetSearch}>
                重置
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-text center-page">加载中...</div>
          ) : customers.length === 0 ? (
            <div className="empty-text center-page">暂无客户数据</div>
          ) : (
            <div className="table-card premium-table-card">
              <div className="table-wrap">
                <table className="data-table premium-table">
                  <thead>
                    <tr>
                      <th>身份证号</th>
                      <th>姓名</th>
                      <th>地址</th>
                      <th>电话</th>
                      <th>会员等级</th>
                      <th>积分</th>
                      <th>累计消费</th>
                      <th>升级提示</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id_card}>
                        <td>
                          <span className="phone-cell"><FaIdCard />{c.id_card}</span>
                        </td>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar"><FaUserCircle /></div>
                            <div>
                              <div className="user-name">{c.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{c.address || "-"}</td>
                        <td><span className="phone-cell"><FaPhone />{c.phone || "-"}</span></td>
                        <td>
                          <span className={`role-tag ${getLevelClass(c.member_level)}`} style={{ display: "inline-flex", alignItems: "center" }}>
                            {getLevelIcon(c.member_level)}
                            {c.member_level}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#2b4f89" }}>
                            {c.member_points || 0}
                          </span>
                        </td>
                        <td>
                          <span className="phone-cell">
                            <FaWallet style={{ marginRight: 4 }} />
                            ¥{Number(c.total_spent || 0).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: "#7094cb" }}>
                            {getUpgradeHint(c.member_level, c.member_points || 0)}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-btn edit-btn" onClick={() => openEdit(c)}>
                              <FaEdit />
                            </button>
                            <button 
                              className="small-action-btn" 
                              style={{ background: "#f0e6c5", color: "#b8860b", padding: "4px 8px" }} 
                              onClick={() => openPointsModal(c)}
                            >
                              <FaStar />
                            </button>
                            {isAdminUser && (
                              <button className="icon-btn delete-btn" onClick={() => handleDelete(c.id_card)}>
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 新增/编辑客户模态框 */}
      {showModal && (
        <div className="modal-mask" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{editing ? "编辑客户" : "新增客户"}</h2>
                <p>请填写客户基本信息</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>X</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">身份证号</label>
                <div className="input-wrap">
                  <FaIdCard className="input-icon" />
                  <input 
                    className="input" 
                    placeholder="请输入身份证号" 
                    value={form.id_card}
                    onChange={(e) => setForm({ ...form, id_card: e.target.value })}
                    disabled={!!editing} 
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">姓名</label>
                  <input 
                    className="input select-input" 
                    placeholder="请输入姓名" 
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">电话</label>
                  <input 
                    className="input select-input" 
                    placeholder="请输入电话" 
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">地址</label>
                <input 
                  className="input select-input" 
                  placeholder="请输入地址" 
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} 
                />
              </div>
              <div className="input-group">
                <label className="input-label">会员等级</label>
                <select 
                  className="input select-input" 
                  value={form.member_level}
                  onChange={(e) => setForm({ ...form, member_level: e.target.value })}
                >
                  {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <small className="muted-text">注意：手动修改等级不会自动调整积分，建议通过消费自动升级</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 积分调整模态框 */}
      {showPointsModal && pointsCustomer && (
        <div className="modal-mask" onClick={() => setShowPointsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>调整积分 - {pointsCustomer.name}</h2>
                <p>当前积分: {pointsCustomer.member_points || 0} | 当前等级: {pointsCustomer.member_level}</p>
              </div>
              <button className="modal-close" onClick={() => setShowPointsModal(false)}>X</button>
            </div>
            <div className="modal-body">
              <div className="info-panel stat-panel premium-panel" style={{ marginBottom: 16 }}>
                <div className="stat-label">📈 升级规则</div>
                <div className="stat-value" style={{ fontSize: 13, fontWeight: "normal", lineHeight: 1.5 }}>
                  {pointsCustomer.member_level === "普通会员" && "🔹 累计3000积分 → 银卡会员 (9折优惠)"}
                  {pointsCustomer.member_level === "银卡会员" && "🔹 累计10000积分 → 金卡会员 (85折优惠)"}
                  {pointsCustomer.member_level === "金卡会员" && "✨ 金卡会员享85折优惠，积分越多优惠越多 ✨"}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">调整积分</label>
                <input 
                  className="input select-input" 
                  type="number" 
                  placeholder="正数增加，负数减少 (如: 500 或 -100)" 
                  value={pointsForm.points}
                  onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })} 
                />
              </div>
              <div className="input-group">
                <label className="input-label">调整原因</label>
                <input 
                  className="input select-input" 
                  placeholder="如: 活动赠送 / 积分兑换" 
                  value={pointsForm.reason}
                  onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })} 
                />
              </div>
              {parseInt(pointsForm.points) > 0 && pointsCustomer && (
                <div className="info-panel" style={{ background: "#e8f4fd", padding: 10, borderRadius: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: "#2b4f89" }}>
                    💡 调整后积分: {(pointsCustomer.member_points || 0) + parseInt(pointsForm.points)}
                    {pointsCustomer.member_level === "普通会员" && (pointsCustomer.member_points || 0) + parseInt(pointsForm.points) >= 3000 && 
                      " → 将升级为银卡会员！"}
                    {pointsCustomer.member_level === "银卡会员" && (pointsCustomer.member_points || 0) + parseInt(pointsForm.points) >= 10000 && 
                      " → 将升级为金卡会员！"}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPointsModal(false)}>取消</button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleAddPoints}>
                <FaStar style={{ marginRight: 8 }} />确认调整
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerInfo;