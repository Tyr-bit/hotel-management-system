import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { changeRoomApi, getCheckinsApi, getAvailableRoomsByDateApi } from "../api/request";
import { getUser } from "../utils/auth";
import { FaExchangeAlt, FaHome, FaHotel, FaUser, FaArrowRight, FaCalendarAlt, FaSearch } from "react-icons/fa";

function RoomChange() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkinId = searchParams.get("checkin");

  const [checkin, setCheckin] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [newRoomId, setNewRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const user = getUser();

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!checkinId) { navigate("/checkin"); return; }
    loadCheckinData();
  }, []);

  const loadCheckinData = async () => {
    try {
      const cRes = await getCheckinsApi();
      if (cRes.data.code === 200) {
        const found = cRes.data.data.find((c) => c.checkin_id === parseInt(checkinId));
        if (found) {
          setCheckin(found);
          // 加载后自动查询可用房间
          await searchAvailableRooms(found);
        } else {
          alert("入住记录不存在");
          navigate("/checkin");
        }
      }
    } catch (e) { 
      console.error(e); 
      alert("加载数据失败");
    }
    setLoading(false);
  };

// 格式化日期函数
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  // 如果已经是 YYYY-MM-DD 格式，直接返回
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // 否则转换
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
};

// 根据入住记录的日期查询可用房间
const searchAvailableRooms = async (checkinData) => {
  setSearching(true);
  try {
    // 格式化日期
    const checkinDate = formatDate(checkinData.expected_checkin);
    const checkoutDate = formatDate(checkinData.expected_checkout);
    
    console.log("原始日期:", checkinData.expected_checkin, checkinData.expected_checkout);
    console.log("格式化后:", checkinDate, checkoutDate);
    
    if (!checkinDate || !checkoutDate) {
      alert("无法获取入住日期信息");
      return;
    }
    
    const res = await getAvailableRoomsByDateApi(checkinDate, checkoutDate, "");
    
    if (res.data.code === 200) {
      const otherRooms = res.data.data.filter(r => r.room_id !== checkinData.room_id);
      setAvailableRooms(otherRooms);
      
      if (otherRooms.length === 0) {
        alert(`在 ${checkinDate} 至 ${checkoutDate} 期间没有其他可用房间`);
      }
    }
  } catch (e) {
    console.error(e);
    alert("查询可用房间失败");
  }
  setSearching(false);
};

  const handleChange = async () => {
    if (!newRoomId) {
      alert("请选择新房间");
      return;
    }
    
    const selectedRoom = availableRooms.find(r => r.room_id === parseInt(newRoomId));
    if (!selectedRoom) {
      alert("所选房间不可用，请重新选择");
      await searchAvailableRooms(checkin);
      return;
    }
    
    const nights = Math.ceil(
      (new Date(checkin.expected_checkout) - new Date(checkin.expected_checkin)) / (1000 * 60 * 60 * 24)
    );
    
    if (!window.confirm(
      `确认换房？\n\n` +
      `🏠 当前房间：${checkin.room_number || checkin.room_id}\n` +
      `🏠 新房间：${selectedRoom.room_number}\n` +
      `📋 房型：${selectedRoom.type_name}\n` +
      `📅 入住：${checkin.expected_checkin}\n` +
      `📅 退房：${checkin.expected_checkout}\n` +
      `💰 房价：¥${selectedRoom.base_price}/晚，共${nights}晚`
    )) {
      return;
    }
    
    try {
      const res = await changeRoomApi(parseInt(checkinId), newRoomId);
      if (res.data.code === 200) {
        alert("换房成功");
        navigate("/checkin");
      } else {
        alert(res.data.message);
      }
    } catch (e) {
      console.error(e);
      alert("换房失败");
    }
  };

  // 重新查询可用房间
  const handleRefresh = () => {
    if (checkin) {
      searchAvailableRooms(checkin);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="container">
          <div className="card dashboard-card">
            <div className="empty-text center-page">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title"><FaExchangeAlt /><span>换房操作</span></div>
              <div className="page-subtitle">Room Change</div>
            </div>
            <div className="toolbar-actions">
              <button className="btn btn-secondary" onClick={() => navigate("/checkin")}>
                <FaHome style={{ marginRight: 8 }} />返回入住管理
              </button>
            </div>
          </div>

          {checkin && (
            <>
              {/* 当前入住信息 */}
              <div style={{ 
                background: "#f8fafd", 
                padding: 20, 
                borderRadius: 16, 
                marginBottom: 24,
                border: "1px solid #e8edf5"
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#2b4f89", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaCalendarAlt /> 当前入住信息
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#8ba4ce", marginBottom: 4 }}>客户</div>
                    <div style={{ fontWeight: 600 }}>{checkin.customer_name || checkin.customer_id_card}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#8ba4ce", marginBottom: 4 }}>当前房间</div>
                    <div style={{ fontWeight: 600, color: "#2b4f89" }}>
                      <FaHotel style={{ marginRight: 4 }} />
                      {checkin.room_number || checkin.room_id} ({checkin.type_name})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#8ba4ce", marginBottom: 4 }}>入住日期</div>
                    <div style={{ fontWeight: 600 }}>{checkin.expected_checkin}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#8ba4ce", marginBottom: 4 }}>退房日期</div>
                    <div style={{ fontWeight: 600 }}>{checkin.expected_checkout}</div>
                  </div>
                </div>
              </div>

              {/* 可用房间列表 */}
              <div className="input-group" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>选择新房间</label>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleRefresh}
                    disabled={searching}
                    style={{ width: "auto", padding: "6px 16px" }}
                  >
                    <FaSearch style={{ marginRight: 8 }} />
                    {searching ? "查询中..." : "刷新可用房间"}
                  </button>
                </div>
                
                <select 
                  className="input select-input" 
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  style={{ padding: "12px" }}
                >
                  <option value="">请选择新房间</option>
                  {availableRooms.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.room_number} - {r.type_name} (¥{r.base_price}/晚) - {r.floor}楼
                    </option>
                  ))}
                </select>
                
                {searching && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#7094cb" }}>
                    正在查询可用房间...
                  </div>
                )}
                
                {!searching && availableRooms.length === 0 && (
                  <div style={{ marginTop: 10, padding: 12, background: "#fff5f5", borderRadius: 10, color: "#b64b5b", fontSize: 13 }}>
                    ⚠️ 在当前入住期间（{checkin.expected_checkin} 至 {checkin.expected_checkout}）没有其他可用房间
                  </div>
                )}
                
                {!searching && availableRooms.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#2b9e5e" }}>
                    ✅ 当前有 {availableRooms.length} 间客房可选
                  </div>
                )}
              </div>

              <div className="actions-row" style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 24 }}>
                <button className="btn btn-secondary" onClick={() => navigate("/checkin")}>
                  取消
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ width: "auto" }} 
                  onClick={handleChange}
                  disabled={!newRoomId || availableRooms.length === 0}
                >
                  <FaExchangeAlt style={{ marginRight: 8 }} />确认换房
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoomChange;