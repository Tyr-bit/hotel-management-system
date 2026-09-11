import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getReservationsApi, createReservationApi, updateReservationApi,
  getCustomersApi, getRoomTypesApi, getAvailableRoomsByDateApi
} from "../api/request";
import { getUser } from "../utils/auth";
import {
  FaCalendarCheck, FaPlus, FaEdit, FaHome, FaUser, FaPhone, FaCheck, FaTimes,
  FaSearch, FaHotel, FaBed, FaCalendarAlt, FaClock
} from "react-icons/fa";

function Reservation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // 可用房间相关状态
  const [availableRooms, setAvailableRooms] = useState([]);
  const [checkingRooms, setCheckingRooms] = useState(false);
  const [roomSearchDone, setRoomSearchDone] = useState(false);

  const [form, setForm] = useState({
    customer_id_card: "",
    expected_checkin: "",
    expected_checkout: "",
    room_type: "",
    guest_count: 1,
    room_id: ""  // 新增：选择的房间ID
  });

  const user = getUser();

  // 从URL获取预设的房间信息
  useEffect(() => {
    const roomId = searchParams.get("room_id");
    const roomNumber = searchParams.get("room_number");
    const roomType = searchParams.get("room_type");
    const price = searchParams.get("price");

    if (roomId) {
      setForm(prev => ({ ...prev, room_id: roomId, room_type: roomType }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadData();
    // 设置默认日期
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    setForm(prev => ({
      ...prev,
      expected_checkin: tomorrow.toISOString().split('T')[0],
      expected_checkout: dayAfter.toISOString().split('T')[0]
    }));
  }, []);

  const loadData = async () => {
    try {
      const [rRes, cRes, tRes] = await Promise.all([
        getReservationsApi(), getCustomersApi(), getRoomTypesApi()
      ]);
      if (rRes.data.code === 200) setReservations(rRes.data.data);
      if (cRes.data.code === 200) setCustomers(cRes.data.data);
      if (tRes.data.code === 200) setRoomTypes(tRes.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // 查询可用房间
  const handleSearchAvailableRooms = async () => {
    if (!form.expected_checkin || !form.expected_checkout) {
      alert("请先选择入住和退房日期");
      return;
    }
    if (new Date(form.expected_checkin) >= new Date(form.expected_checkout)) {
      alert("退房日期必须晚于入住日期");
      return;
    }
    if (!form.room_type) {
      alert("请先选择客房类型");
      return;
    }

    setCheckingRooms(true);
    try {
      const res = await getAvailableRoomsByDateApi(
        form.expected_checkin,
        form.expected_checkout,
        form.room_type
      );
      if (res.data.code === 200) {
        setAvailableRooms(res.data.data);
        setRoomSearchDone(true);
        if (res.data.data.length === 0) {
          alert("所选时间段没有可用房间，请更换日期或房型");
        }
      }
    } catch (e) {
      alert("查询失败");
    }
    setCheckingRooms(false);
  };

  // 当日期或房型变化时，重置房间选择
  const handleDateOrTypeChange = (field, value) => {
    setForm({ ...form, [field]: value, room_id: "" });
    setRoomSearchDone(false);
    setAvailableRooms([]);
  };

  const handleCreate = async () => {
    if (!form.customer_id_card || !form.expected_checkin || !form.expected_checkout || !form.room_type) {
      alert("请完整填写所有必填项");
      return;
    }

    // 如果选择了具体房间，检查一下
    if (form.room_id && availableRooms.length > 0) {
      const selected = availableRooms.find(r => r.room_id === parseInt(form.room_id));
      if (!selected) {
        alert("所选房间已不可用，请重新查询");
        return;
      }
    }

    try {
      const res = await createReservationApi(form);
      if (res.data.code === 200) {
        alert("预订成功");
        loadData();
        setShowModal(false);
        // 重置表单
        setForm({
          customer_id_card: "",
          expected_checkin: "",
          expected_checkout: "",
          room_type: "",
          guest_count: 1,
          room_id: ""
        });
        setRoomSearchDone(false);
        setAvailableRooms([]);
      } else {
        alert(res.data.message);
      }
    } catch (e) {
      alert("预订失败");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await updateReservationApi(id, { status });
      if (res.data.code === 200) { alert("更新成功"); loadData(); }
      else alert(res.data.message);
    } catch (e) { alert("操作失败"); }
  };

  const statusOptions = ["待确认", "已确认", "已取消", "已入住"];
  const statusColor = (s) => {
    if (s === "已确认" || s === "已入住") return "status-normal";
    if (s === "已取消") return "status-disabled";
    return "role-user";
  };

  // 获取房间状态标签
  const getRoomFeature = (room) => {
    if (room.room_status === "维修中") return "🔧 维修中";
    return `${room.floor}楼`;
  };

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title"><FaCalendarCheck /><span>预订管理</span></div>
              <div className="page-subtitle">Reservation Management</div>
            </div>
            <div className="toolbar-actions">
              <button className="btn btn-secondary" onClick={() => navigate("/home")}>
                <FaHome style={{ marginRight: 8 }} />返回首页
              </button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => {
                // 重置表单
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dayAfter = new Date();
                dayAfter.setDate(dayAfter.getDate() + 2);
                setForm({
                  customer_id_card: "",
                  expected_checkin: tomorrow.toISOString().split('T')[0],
                  expected_checkout: dayAfter.toISOString().split('T')[0],
                  room_type: "",
                  guest_count: 1,
                  room_id: ""
                });
                setRoomSearchDone(false);
                setAvailableRooms([]);
                setShowModal(true);
              }}>
                <FaPlus style={{ marginRight: 8 }} />新增预订
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-text center-page">加载中...</div>
          ) : reservations.length === 0 ? (
            <div className="empty-text center-page">暂无预订数据</div>
          ) : (
            <div className="table-card premium-table-card">
              <div className="table-wrap">
                <table className="data-table premium-table">
                  <thead>
                    <tr>
                      <th>预订编号</th>
                      <th>客户</th>
                      <th>电话</th>
                      <th>客房类型</th>
                      <th>房间号</th>
                      <th>预计入住</th>
                      <th>预计退房</th>
                      <th>人数</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r) => (
                      <tr key={r.reservation_id}>
                        <td>#{r.reservation_id}</td>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar"><FaUser /></div>
                            <span className="user-name">{r.customer_name || r.customer_id_card}</span>
                          </div>
                        </td>
                        <td><span className="phone-cell"><FaPhone />{r.customer_phone || "-"}</span></td>
                        <td>{r.room_type}</td>
                        <td>{r.room_id ? <span className="role-tag role-admin">#{r.room_id}</span> : "-"}</td>
                        <td>{r.expected_checkin ? new Date(r.expected_checkin).toLocaleDateString("zh-CN") : "-"}</td>
                        <td>{r.expected_checkout ? new Date(r.expected_checkout).toLocaleDateString("zh-CN") : "-"}</td>
                        <td>{r.guest_count}</td>
                        <td><span className={`role-tag ${statusColor(r.status)}`}>{r.status}</span></td>
                        <td>
                          <div className="table-actions">
                            {r.status === "待确认" && (
                              <>
                                <button
                                  className="small-action-btn"
                                  style={{ whiteSpace: "nowrap" }}  // 添加这行，防止文字换行
                                  onClick={() => handleStatusChange(r.reservation_id, "已确认")}
                                >
                                  确认
                                </button>
                                <button
                                  className="small-action-btn"
                                  style={{ color: "#b64b5b", whiteSpace: "nowrap" }}  // 添加 whiteSpace
                                  onClick={() => handleStatusChange(r.reservation_id, "已取消")}
                                >
                                  取消
                                </button>
                              </>
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

      {/* 新增预订模态框（增强版） */}
      {showModal && (
        <div className="modal-mask" onClick={() => setShowModal(false)}>
          <div className="modal-card" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>新增预订</h2>
                <p>请填写预订信息</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>X</button>
            </div>
            <div className="modal-body">
              {/* 客户选择 */}
              <div className="input-group">
                <label className="input-label">选择客户 <span style={{ color: "red" }}>*</span></label>
                <select
                  className="input select-input"
                  value={form.customer_id_card}
                  onChange={(e) => setForm({ ...form, customer_id_card: e.target.value })}
                >
                  <option value="">请选择客户</option>
                  {customers.map((c) => (
                    <option key={c.id_card} value={c.id_card}>{c.name} ({c.id_card})</option>
                  ))}
                </select>
              </div>

              {/* 日期选择 */}
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">入住日期 <span style={{ color: "red" }}>*</span></label>
                  <div className="input-wrap">
                    <FaCalendarAlt className="input-icon" />
                    <input
                      className="input"
                      type="date"
                      value={form.expected_checkin}
                      onChange={(e) => handleDateOrTypeChange("expected_checkin", e.target.value)}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">退房日期 <span style={{ color: "red" }}>*</span></label>
                  <div className="input-wrap">
                    <FaCalendarAlt className="input-icon" />
                    <input
                      className="input"
                      type="date"
                      value={form.expected_checkout}
                      onChange={(e) => handleDateOrTypeChange("expected_checkout", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 客房类型 */}
              <div className="input-group">
                <label className="input-label">客房类型 <span style={{ color: "red" }}>*</span></label>
                <select
                  className="input select-input"
                  value={form.room_type}
                  onChange={(e) => handleDateOrTypeChange("room_type", e.target.value)}
                >
                  <option value="">请选择客房类型</option>
                  {roomTypes.map((t) => (
                    <option key={t.type_id} value={t.type_name}>{t.type_name} (¥{t.base_price}/天)</option>
                  ))}
                </select>
              </div>

              {/* 可用房间查询 */}
              {form.room_type && form.expected_checkin && form.expected_checkout && (
                <div className="input-group">
                  <label className="input-label">选择具体房间</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select
                      className="input select-input"
                      style={{ flex: 2 }}
                      value={form.room_id}
                      onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                      disabled={availableRooms.length === 0 && roomSearchDone}
                    >
                      <option value="">系统自动分配</option>
                      {availableRooms.map((r) => (
                        <option key={r.room_id} value={r.room_id}>
                          {r.room_number} - {r.type_name} (¥{r.base_price}/晚) - {getRoomFeature(r)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={handleSearchAvailableRooms}
                      disabled={checkingRooms}
                      style={{ width: "auto" }}
                    >
                      <FaSearch style={{ marginRight: 4 }} />
                      {checkingRooms ? "查询中..." : "查询可用房间"}
                    </button>
                  </div>

                  {/* 查询结果提示 */}
                  {roomSearchDone && (
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      {availableRooms.length > 0 ? (
                        <span style={{ color: "#2b9e5e" }}>
                          ✅ 找到 {availableRooms.length} 间可用房间
                        </span>
                      ) : (
                        <span style={{ color: "#b64b5b" }}>
                          ⚠️ 所选时间段没有可用房间，请更换日期或房型
                        </span>
                      )}
                    </div>
                  )}

                  <small className="muted-text">
                    💡 点击"查询可用房间"查看该时间段空闲房间，不选择则系统自动分配
                  </small>
                </div>
              )}

              {/* 入住人数 */}
              <div className="input-group">
                <label className="input-label">入住人数</label>
                <input
                  className="input select-input"
                  type="number"
                  min="1"
                  max="10"
                  value={form.guest_count}
                  onChange={(e) => setForm({ ...form, guest_count: parseInt(e.target.value) || 1 })}
                />
              </div>

              {/* 日期提示 */}
              {form.expected_checkin && form.expected_checkout && (
                <div className="info-panel" style={{ background: "#e8f4fd", padding: 10, borderRadius: 8, marginTop: 8 }}>
                  <FaClock style={{ marginRight: 8, color: "#2b4f89" }} />
                  <span style={{ fontSize: 13, color: "#2b4f89" }}>
                    入住 {form.expected_checkin} 至 {form.expected_checkout}，共 {
                      Math.ceil((new Date(form.expected_checkout) - new Date(form.expected_checkin)) / (1000 * 60 * 60 * 24))
                    } 晚
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleCreate}>
                <FaCheck style={{ marginRight: 8 }} />确认预订
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reservation;