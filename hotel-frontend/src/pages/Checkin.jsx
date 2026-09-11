import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCheckinsApi, createCheckinApi, getCustomersApi, getAvailableRoomsApi,
  getReservationsApi, updateReservationApi, getAvailableRoomsByDateApi
} from "../api/request";
import { getUser } from "../utils/auth";
import {
  FaDoorOpen, FaPlus, FaHome, FaUser, FaPhone, FaHotel, FaExchangeAlt,
  FaMoneyBillWave, FaCalendarCheck, FaSearch, FaUserPlus, FaCheck,
  FaClock, FaIdCard, FaCalendarAlt
} from "react-icons/fa";

function Checkin() {
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState("reservation");
  const [form, setForm] = useState({ customer_id_card: "", room_id: "" });
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  // 散客入住的额外字段
  const [directCheckinForm, setDirectCheckinForm] = useState({
    customer_id_card: "",
    room_id: "",
    expected_checkin: "",
    expected_checkout: ""
  });
  const [availableRoomsByDate, setAvailableRoomsByDate] = useState([]);
  const [checkingRooms, setCheckingRooms] = useState(false);

  const user = getUser();

  // 设置默认日期（明天入住，后天退房）
  const getDefaultDates = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return {
      checkin: tomorrow.toISOString().split('T')[0],
      checkout: dayAfter.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadData();
    const dates = getDefaultDates();
    setDirectCheckinForm(prev => ({
      ...prev,
      expected_checkin: dates.checkin,
      expected_checkout: dates.checkout
    }));
  }, []);

  const loadData = async () => {
    try {
      const [cRes, cuRes, rRes, reservationsRes] = await Promise.all([
        getCheckinsApi(),
        getCustomersApi(),
        getAvailableRoomsApi(),
        getReservationsApi()
      ]);
      if (cRes.data.code === 200) setCheckins(cRes.data.data);
      if (cuRes.data.code === 200) setCustomers(cuRes.data.data);
      if (rRes.data.code === 200) setRooms(rRes.data.data);
      if (reservationsRes.data.code === 200) {
        const validReservations = reservationsRes.data.data.filter(
          r => r.status === "已确认" && r.status !== "已入住"
        );
        setReservations(validReservations);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // 查询散客入住时段的可用房间
  const handleSearchAvailableRooms = async () => {
    if (!directCheckinForm.expected_checkin || !directCheckinForm.expected_checkout) {
      alert("请选择入住和退房日期");
      return;
    }
    if (new Date(directCheckinForm.expected_checkin) >= new Date(directCheckinForm.expected_checkout)) {
      alert("退房日期必须晚于入住日期");
      return;
    }

    setCheckingRooms(true);
    try {
      const res = await getAvailableRoomsByDateApi(
        directCheckinForm.expected_checkin,
        directCheckinForm.expected_checkout,
        ""  // 不限定房型，显示所有可用房间
      );
      if (res.data.code === 200) {
        setAvailableRoomsByDate(res.data.data);
        if (res.data.data.length === 0) {
          alert("所选时间段没有可用房间，请更换日期");
        }
      }
    } catch (e) {
      alert("查询失败");
    }
    setCheckingRooms(false);
  };

  // 根据预订办理入住
  // 根据预订办理入住
  // 根据预订办理入住
  const handleCheckinFromReservation = async (reservation) => {
    console.log("=== 预订数据 ===", reservation);

    // 获取客户ID
    const customerId = reservation.customer_id_card || reservation.customer_id;

    if (!customerId) {
      alert("无法获取客户ID");
      return;
    }

    if (rooms.length === 0) {
      alert("当前没有空闲房间，无法办理入住");
      return;
    }

    // 格式化日期函数
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      // 如果已经是 YYYY-MM-DD 格式，直接返回
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      // 否则转换
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    };

    const formattedCheckin = formatDate(reservation.expected_checkin);
    const formattedCheckout = formatDate(reservation.expected_checkout);

    console.log("格式化后的日期:", formattedCheckin, formattedCheckout);

    // 根据预订的房型查找空闲房间
    const matchedRoom = rooms.find(r => r.type_name === reservation.room_type);

    if (!matchedRoom) {
      alert(`没有匹配 "${reservation.room_type}" 的空闲房间`);
      return;
    }

    const nights = Math.ceil(
      (new Date(formattedCheckout) - new Date(formattedCheckin)) / (1000 * 60 * 60 * 24)
    );

    if (!window.confirm(
      `确认 ${reservation.customer_name || customerId} 办理入住？\n\n` +
      `🏠 房间号：${matchedRoom.room_number}\n` +
      `📋 房型：${reservation.room_type}\n` +
      `📅 入住：${formattedCheckin}\n` +
      `📅 退房：${formattedCheckout}\n` +
      `👥 人数：${reservation.guest_count}人\n` +
      `💰 房价：¥${matchedRoom.base_price}/晚，共${nights}晚`
    )) {
      return;
    }

    try {
      const requestData = {
        customer_id_card: customerId,
        room_id: matchedRoom.room_id,
        expected_checkin: formattedCheckin,
        expected_checkout: formattedCheckout
      };

      console.log("发送入住请求:", requestData);

      const res = await createCheckinApi(requestData);

      if (res.data.code === 200) {
        alert("入住办理成功");
        loadData();
        setShowModal(false);
      } else {
        alert("办理失败: " + res.data.message);
      }
    } catch (e) {
      console.error("入住办理错误:", e);
      alert("办理失败: " + (e.response?.data?.message || e.message));
    }
  };
  const handleDirectCheckin = async () => {
    // 格式化日期函数
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    };

    const formattedCheckin = formatDate(directCheckinForm.expected_checkin);
    const formattedCheckout = formatDate(directCheckinForm.expected_checkout);

    console.log("散客入住 - 原始日期:", directCheckinForm.expected_checkin, directCheckinForm.expected_checkout);
    console.log("散客入住 - 格式化后:", formattedCheckin, formattedCheckout);

    if (!directCheckinForm.customer_id_card || !directCheckinForm.room_id) {
      alert("请选择客户和房间");
      return;
    }
    if (!formattedCheckin || !formattedCheckout) {
      alert("请选择入住和退房日期");
      return;
    }

    const selectedRoom = availableRoomsByDate.find(r => r.room_id === parseInt(directCheckinForm.room_id));
    if (!selectedRoom) {
      alert("所选房间在此时段已被预订或入住，请重新选择日期或房间");
      handleSearchAvailableRooms();
      return;
    }

    try {
      const requestData = {
        customer_id_card: directCheckinForm.customer_id_card,
        room_id: parseInt(directCheckinForm.room_id),
        expected_checkin: formattedCheckin,
        expected_checkout: formattedCheckout
      };

      console.log("发送入住请求:", requestData);

      const res = await createCheckinApi(requestData);

      if (res.data.code === 200) {
        alert(`入住办理成功！`);
        loadData();
        setShowModal(false);
        setDirectCheckinForm({
          customer_id_card: "",
          room_id: "",
          expected_checkin: getDefaultDates().checkin,
          expected_checkout: getDefaultDates().checkout
        });
        setAvailableRoomsByDate([]);
      } else {
        alert("办理失败: " + res.data.message);
      }
    } catch (e) {
      console.error("入住错误详情:", e);
      alert("办理失败: " + (e.response?.data?.message || e.message));
    }
  };

  // 过滤可预订客户
  const filteredCustomers = customers.filter(c =>
    c.name.includes(searchKeyword) ||
    c.id_card.includes(searchKeyword) ||
    c.phone.includes(searchKeyword)
  );

  const statusColor = (s) => s === "入住中" ? "status-normal" : "status-disabled";

  const getReservationStatusBadge = (status) => {
    if (status === "已确认") return <span className="status-tag status-normal">✓ 已确认</span>;
    if (status === "待确认") return <span className="status-tag role-user">⏰ 待确认</span>;
    return <span className="status-tag status-disabled">{status}</span>;
  };

  // 计算入住天数
  const getNights = (checkin, checkout) => {
    if (!checkin || !checkout) return 0;
    return Math.ceil((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title"><FaDoorOpen /><span>入住办理</span></div>
              <div className="page-subtitle">Check-in Management</div>
            </div>
            <div className="toolbar-actions">
              <button className="btn btn-secondary" onClick={() => navigate("/home")}>
                <FaHome style={{ marginRight: 8 }} />返回首页
              </button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => {
                setDirectCheckinForm({
                  customer_id_card: "",
                  room_id: "",
                  expected_checkin: getDefaultDates().checkin,
                  expected_checkout: getDefaultDates().checkout
                });
                setAvailableRoomsByDate([]);
                setSearchKeyword("");
                setModalTab("reservation");
                loadData();
                setShowModal(true);
              }}>
                <FaPlus style={{ marginRight: 8 }} />办理入住
              </button>
            </div>
          </div>

          {/* 当前入住记录列表 */}
          {loading ? (
            <div className="empty-text center-page">加载中...</div>
          ) : checkins.length === 0 ? (
            <div className="empty-text center-page">暂无入住记录</div>
          ) : (
            <div className="table-card premium-table-card">
              <div className="table-wrap">
                <table className="data-table premium-table">
                  <thead>
                    <tr>
                      <th>入住编号</th>
                      <th>客户</th>
                      <th>电话</th>
                      <th>房间号</th>
                      <th>客房类型</th>
                      <th>入住时间</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkins.map((c) => (
                      <tr key={c.checkin_id}>
                        <td>#{c.checkin_id}</td>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar"><FaUser /></div>
                            <span className="user-name">{c.customer_name || c.customer_id_card}</span>
                          </div>
                        </td>
                        <td><span className="phone-cell"><FaPhone />{c.customer_phone || "-"}</span></td>
                        <td>
                          <span className="phone-cell"><FaHotel />{c.room_id}</span>
                        </td>
                        <td>{c.type_name || "-"}</td>
                        {/* 修改这里：显示 expected_checkin 而不是 actual_checkin */}
                        <td>{c.expected_checkin ? new Date(c.expected_checkin).toLocaleDateString("zh-CN") : "-"}</td>
                        <td><span className={`status-tag ${statusColor(c.status)}`}>{c.status}</span></td>
                        <td>
                          <div className="table-actions" style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
                            {c.status === "入住中" && (
                              <>
                                <button className="small-action-btn" onClick={() => navigate(`/room-change?checkin=${c.checkin_id}`)}>
                                  <FaExchangeAlt style={{ marginRight: 4 }} />换房
                                </button>
                                <button className="small-action-btn" onClick={() => navigate(`/settlement?checkin=${c.checkin_id}`)}>
                                  <FaMoneyBillWave style={{ marginRight: 4 }} />结账
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

      {/* 办理入住模态框（优化版 - 更宽松的布局） */}
      {showModal && (
        <div className="modal-mask" onClick={() => setShowModal(false)}>
          <div className="modal-card" style={{
            maxWidth: 750,
            borderRadius: 20,
            padding: 0,
            overflow: "hidden"
          }} onClick={(e) => e.stopPropagation()}>

            {/* 头部 */}
            <div style={{
              padding: "24px 28px",
              borderBottom: "1px solid #e8edf5",
              background: "#fafcff"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#2b4f89" }}>办理入住</h2>
                  <p style={{ margin: "8px 0 0", color: "#8ba4ce", fontSize: 14 }}>选择入住方式完成登记</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    color: "#8ba4ce"
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Tab 切换 */}
            <div style={{ padding: "20px 28px 0 28px", borderBottom: "1px solid #e8edf5" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className={`btn ${modalTab === "reservation" ? "btn-primary" : "btn-secondary"}`}
                  style={{ borderRadius: 12, padding: "10px 24px", width: "auto" }}
                  onClick={() => setModalTab("reservation")}
                >
                  <FaCalendarCheck style={{ marginRight: 8 }} />有预订入住
                </button>
                <button
                  className={`btn ${modalTab === "direct" ? "btn-primary" : "btn-secondary"}`}
                  style={{ borderRadius: 12, padding: "10px 24px", width: "auto" }}
                  onClick={() => setModalTab("direct")}
                >
                  <FaUserPlus style={{ marginRight: 8 }} />散客直接入住
                </button>
              </div>
            </div>

            {/* 内容区域 */}
            <div style={{ padding: "28px" }}>
              {/* 有预订入住模式 */}
              {modalTab === "reservation" && (
                <div>
                  {reservations.length === 0 ? (
                    <div className="empty-text center-page" style={{ padding: "48px 24px" }}>
                      <FaCalendarCheck style={{ fontSize: 56, color: "#c5d5ea", marginBottom: 16 }} />
                      <p style={{ fontSize: 16, color: "#8ba4ce" }}>暂无已确认的预订</p>
                      <button
                        className="btn btn-primary"
                        onClick={() => setModalTab("direct")}
                        style={{ marginTop: 20, width: "auto", borderRadius: 12 }}
                      >
                        去办理散客入住
                      </button>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 460, overflowY: "auto", paddingRight: 8 }}>
                      {reservations.map((r) => {
                        const nights = getNights(r.expected_checkin, r.expected_checkout);
                        return (
                          <div key={r.reservation_id} style={{
                            padding: 20,
                            marginBottom: 16,
                            borderRadius: 16,
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            transition: "box-shadow 0.2s",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                                  <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    background: "#eef2fa",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}>
                                    <FaUser size={22} color="#2b4f89" />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: 18 }}>{r.customer_name}</div>
                                    <div style={{ fontSize: 13, color: "#8ba4ce", marginTop: 4 }}>
                                      <FaIdCard style={{ marginRight: 6 }} size={12} />
                                      {r.customer_id_card}
                                    </div>
                                  </div>
                                  {getReservationStatusBadge(r.status)}
                                </div>

                                <div style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                                  gap: 16,
                                  background: "#f8fafd",
                                  padding: 14,
                                  borderRadius: 12,
                                  marginTop: 8
                                }}>
                                  <div>
                                    <div style={{ fontSize: 12, color: "#8ba4ce", marginBottom: 4 }}>
                                      <FaCalendarAlt style={{ marginRight: 4 }} />入住日期
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{r.expected_checkin}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 12, color: "#8ba4ce", marginBottom: 4 }}>
                                      <FaCalendarAlt style={{ marginRight: 4 }} />退房日期
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{r.expected_checkout}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 12, color: "#8ba4ce", marginBottom: 4 }}>
                                      <FaHotel style={{ marginRight: 4 }} />房型 / 人数
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{r.room_type} · {r.guest_count}人</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 12, color: "#8ba4ce", marginBottom: 4 }}>
                                      <FaClock style={{ marginRight: 4 }} />入住天数
                                    </div>
                                    <div style={{ fontWeight: 600, color: "#2b4f89" }}>{nights} 晚</div>
                                  </div>
                                </div>
                              </div>

                              <button
                                className="btn btn-primary"
                                style={{
                                  width: "auto",
                                  alignSelf: "center",
                                  padding: "10px 24px",
                                  borderRadius: 12,
                                  fontSize: 14
                                }}
                                onClick={() => handleCheckinFromReservation(r)}
                              >
                                <FaCheck style={{ marginRight: 8 }} />办理入住
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 散客直接入住模式 */}
              {modalTab === "direct" && (
                <div style={{ maxHeight: "calc(80vh - 200px)", overflowY: "auto", paddingRight: 6 }}>
                  {/* 日期选择区域 */}
                  <div style={{
                    background: "#f8fafd",
                    padding: 20,
                    borderRadius: 16,
                    marginBottom: 24,
                    border: "1px solid #e8edf5"
                  }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#2b4f89", display: "flex", alignItems: "center", gap: 8 }}>
                      <FaCalendarAlt /> 入住信息
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "flex-end" }}>
                      <div>
                        <label className="input-label" style={{ marginBottom: 6 }}>入住日期</label>
                        <input
                          type="date"
                          className="input"
                          style={{ width: "100%", padding: "10px 12px" }}
                          value={directCheckinForm.expected_checkin}
                          onChange={(e) => {
                            setDirectCheckinForm({ ...directCheckinForm, expected_checkin: e.target.value, room_id: "" });
                            setAvailableRoomsByDate([]);
                          }}
                        />
                      </div>
                      <div>
                        <label className="input-label" style={{ marginBottom: 6 }}>退房日期</label>
                        <input
                          type="date"
                          className="input"
                          style={{ width: "100%", padding: "10px 12px" }}
                          value={directCheckinForm.expected_checkout}
                          onChange={(e) => {
                            setDirectCheckinForm({ ...directCheckinForm, expected_checkout: e.target.value, room_id: "" });
                            setAvailableRoomsByDate([]);
                          }}
                        />
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={handleSearchAvailableRooms}
                        disabled={checkingRooms}
                        style={{ width: "auto", padding: "10px 20px", marginBottom: 0 }}
                      >
                        <FaSearch style={{ marginRight: 8 }} />
                        {checkingRooms ? "查询中..." : "查询可用房间"}
                      </button>
                    </div>
                    {directCheckinForm.expected_checkin && directCheckinForm.expected_checkout && (
                      <div style={{ marginTop: 14, fontSize: 13, color: "#2b9e5e" }}>
                        📅 将入住 {getNights(directCheckinForm.expected_checkin, directCheckinForm.expected_checkout)} 晚
                      </div>
                    )}
                  </div>

                  {/* 客户搜索 */}
                  <div className="input-group" style={{ marginBottom: 20 }}>
                    <label className="input-label" style={{ marginBottom: 6 }}>搜索客户</label>
                    <div className="input-wrap">
                      <FaSearch className="input-icon" />
                      <input
                        className="input"
                        style={{ padding: "10px 12px 10px 38px" }}
                        placeholder="姓名 / 身份证号 / 手机号"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 客户选择 */}
                  <div className="input-group" style={{ marginBottom: 20 }}>
                    <label className="input-label" style={{ marginBottom: 6 }}>选择客户</label>
                    <select
                      className="input select-input"
                      style={{ padding: "10px 12px" }}
                      value={directCheckinForm.customer_id_card}
                      onChange={(e) => setDirectCheckinForm({ ...directCheckinForm, customer_id_card: e.target.value })}
                    >
                      <option value="">请选择客户</option>
                      {filteredCustomers.map((c) => (
                        <option key={c.id_card} value={c.id_card}>
                          {c.name} ({c.id_card}) - {c.phone}
                        </option>
                      ))}
                    </select>
                    <small className="muted-text" style={{ marginTop: 6, display: "block" }}>
                      如果没有找到客户，请先到"客户信息管理"中添加
                    </small>
                  </div>

                  {/* 房间选择 */}
                  <div className="input-group" style={{ marginBottom: 24 }}>
                    <label className="input-label" style={{ marginBottom: 6 }}>选择房间</label>
                    <select
                      className="input select-input"
                      style={{ padding: "10px 12px" }}
                      value={directCheckinForm.room_id}
                      onChange={(e) => setDirectCheckinForm({ ...directCheckinForm, room_id: e.target.value })}
                      disabled={availableRoomsByDate.length === 0 && directCheckinForm.expected_checkin}
                    >
                      <option value="">请选择空闲房间</option>
                      {availableRoomsByDate.map((r) => (
                        <option key={r.room_id} value={r.room_id}>
                          {r.room_number} - {r.type_name} (¥{r.base_price}/晚) - {r.floor}楼
                        </option>
                      ))}
                    </select>
                    {availableRoomsByDate.length === 0 && directCheckinForm.expected_checkin && (
                      <div style={{ marginTop: 10, padding: 12, background: "#fff5f5", borderRadius: 10, color: "#b64b5b", fontSize: 13 }}>
                        ⚠️ 所选时间段没有可用房间，请更换日期后重新查询
                      </div>
                    )}
                    {availableRoomsByDate.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#2b9e5e" }}>
                        ✅ 当前有 {availableRoomsByDate.length} 间客房可选
                      </div>
                    )}
                  </div>

                  {/* 按钮区域 - 放在滚动区域底部 */}
                  <div style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 16,
                    marginTop: 8,
                    marginBottom: 8,
                    paddingTop: 16,
                    borderTop: "1px solid #e8edf5"
                  }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                      style={{ padding: "10px 28px", borderRadius: 12, width: "auto" }}
                    >
                      取消
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{
                        padding: "10px 28px",
                        borderRadius: 12,
                        width: "auto"
                      }}
                      onClick={handleDirectCheckin}
                      disabled={!directCheckinForm.customer_id_card || !directCheckinForm.room_id || availableRoomsByDate.length === 0}
                    >
                      <FaDoorOpen style={{ marginRight: 8 }} />确认入住
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Checkin;