import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRoomsApi, getRoomTypesApi, createRoomApi, updateRoomApi, deleteRoomApi
} from "../api/request";
import { getUser } from "../utils/auth";
import {
  FaDoorOpen, FaPlus, FaEdit, FaTrash, FaHome, FaBuilding, FaCog
} from "react-icons/fa";

function RoomManage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    room_number: "",
    type_id: "",
    floor: "",
    description: "",
    room_status: "空闲"
  });

  const user = getUser();

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [roomsRes, typesRes] = await Promise.all([
        getRoomsApi(),
        getRoomTypesApi()
      ]);
      if (roomsRes.data.code === 200) setRooms(roomsRes.data.data);
      if (typesRes.data.code === 200) setRoomTypes(typesRes.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ room_number: "", type_id: "", floor: "", description: "", room_status: "空闲" });
    setShowModal(true);
  };

  const openEdit = (room) => {
    setEditing(room);
    setForm({
      room_number: room.room_number,
      type_id: room.type_id,
      floor: room.floor || "",
      description: room.description || "",
      room_status: room.room_status
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.room_number || !form.type_id) {
      alert("请填写房间号和房间类型");
      return;
    }
    try {
      if (editing) {
        const res = await updateRoomApi(editing.room_id, form);
        if (res.data.code === 200) {
          alert("修改成功");
          loadData();
          setShowModal(false);
        } else {
          alert(res.data.message);
        }
      } else {
        const res = await createRoomApi(form);
        if (res.data.code === 200) {
          alert("新增成功");
          loadData();
          setShowModal(false);
        } else {
          alert(res.data.message);
        }
      }
    } catch (e) {
      alert("操作失败");
    }
  };

  const handleDelete = async (roomId, roomNumber) => {
    if (!window.confirm(`确定要删除 ${roomNumber} 号房间吗？有入住记录的房间不能删除。`)) return;
    try {
      const res = await deleteRoomApi(roomId);
      if (res.data.code === 200) {
        alert("删除成功");
        loadData();
      } else {
        alert(res.data.message);
      }
    } catch (e) {
      alert("删除失败");
    }
  };

  const statusColor = (status) => {
    if (status === "空闲") return "status-normal";
    if (status === "已入住") return "role-admin";
    return "status-disabled";
  };

  const statusText = (status) => {
    if (status === "空闲") return "🟢 空闲";
    if (status === "已入住") return "🔴 已入住";
    return "🟡 维修中";
  };

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title"><FaDoorOpen /><span>客房信息管理</span></div>
              <div className="page-subtitle">Room Management</div>
            </div>
            <div className="toolbar-actions">
              <button className="btn btn-secondary" onClick={() => navigate("/home")}>
                <FaHome style={{ marginRight: 8 }} />返回首页
              </button>
              <button className="btn btn-secondary" onClick={() => navigate("/room-types")}>
                <FaCog style={{ marginRight: 8 }} />客房类型管理
              </button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={openCreate}>
                <FaPlus style={{ marginRight: 8 }} />新增房间
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-text center-page">加载中...</div>
          ) : rooms.length === 0 ? (
            <div className="empty-text center-page">暂无客房数据</div>
          ) : (
            <div className="table-card premium-table-card">
              <div className="table-wrap">
                <table className="data-table premium-table">
                  <thead>
                    <tr>
                      <th>房间号</th>
                      <th>客房类型</th>
                      <th>标准价格</th>
                      <th>楼层</th>
                      <th>房间状态</th>
                      <th>描述</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r) => (
                      <tr key={r.room_id}>
                        <td><strong><FaDoorOpen style={{ marginRight: 8 }} />{r.room_number}</strong></td>
                        <td>{r.type_name}</td>
                        <td><span className="role-tag role-admin">¥{Number(r.base_price).toFixed(2)}</span></td>
                        <td><span className="phone-cell"><FaBuilding />{r.floor || "-"}楼</span></td>
                        <td><span className={`status-tag ${statusColor(r.room_status)}`}>{statusText(r.room_status)}</span></td>
                        <td>{r.description || "-"}</td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-btn edit-btn" onClick={() => openEdit(r)}>
                              <FaEdit />
                            </button>
                            <button className="icon-btn delete-btn" onClick={() => handleDelete(r.room_id, r.room_number)}>
                              <FaTrash />
                            </button>
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

      {showModal && (
        <div className="modal-mask" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{editing ? "编辑房间" : "新增房间"}</h2>
                <p>请填写房间信息</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>X</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">房间号</label>
                  <div className="input-wrap">
                    <FaDoorOpen className="input-icon" />
                    <input className="input" placeholder="如：101" value={form.room_number}
                      onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">楼层</label>
                  <div className="input-wrap">
                    <FaBuilding className="input-icon" />
                    <input className="input" placeholder="如：1" value={form.floor}
                      onChange={(e) => setForm({ ...form, floor: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">客房类型</label>
                <select className="input select-input" value={form.type_id}
                  onChange={(e) => setForm({ ...form, type_id: parseInt(e.target.value) })}>
                  <option value="">请选择客房类型</option>
                  {roomTypes.map((t) => (
                    <option key={t.type_id} value={t.type_id}>{t.type_name} (¥{t.base_price}/天)</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">房间状态</label>
                <select className="input select-input" value={form.room_status}
                  onChange={(e) => setForm({ ...form, room_status: e.target.value })}>
                  <option value="空闲">空闲</option>
                  <option value="维修中">维修中</option>
                </select>
                <small className="muted-text">注意：已入住的房间状态不能手动修改</small>
              </div>
              <div className="input-group">
                <label className="input-label">房间描述</label>
                <textarea className="input select-input" rows="2" placeholder="如：朝南、带窗户、景观房"
                  value={form.description} style={{ resize: "vertical" }}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomManage;