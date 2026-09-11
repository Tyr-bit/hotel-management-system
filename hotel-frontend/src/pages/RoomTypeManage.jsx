import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRoomTypesApi,
  createRoomTypeApi,
  updateRoomTypeApi,
  deleteRoomTypeApi
} from "../api/request";
import { getUser } from "../utils/auth";
import {
  FaHotel, FaPlus, FaEdit, FaTrash, FaHome, FaDollarSign, FaAlignLeft, FaCog
} from "react-icons/fa";

function RoomTypeManage() {
  const navigate = useNavigate();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    type_name: "",
    base_price: "",
    overtime_rule: "",
    facilities: ""
  });

  const user = getUser();

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadRoomTypes();
  }, []);

  const loadRoomTypes = async () => {
    try {
      const res = await getRoomTypesApi();
      if (res.data.code === 200) setRoomTypes(res.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ type_name: "", base_price: "", overtime_rule: "", facilities: "" });
    setShowModal(true);
  };

  const openEdit = (type) => {
    setEditing(type);
    setForm({
      type_name: type.type_name,
      base_price: type.base_price,
      overtime_rule: type.overtime_rule || "",
      facilities: type.facilities || ""
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.type_name || !form.base_price) {
      alert("请填写类型名称和标准价格");
      return;
    }
    try {
      if (editing) {
        const res = await updateRoomTypeApi(editing.type_id, form);
        if (res.data.code === 200) {
          alert("修改成功");
          loadRoomTypes();
          setShowModal(false);
        } else {
          alert(res.data.message);
        }
      } else {
        const res = await createRoomTypeApi(form);
        if (res.data.code === 200) {
          alert("新增成功");
          loadRoomTypes();
          setShowModal(false);
        } else {
          alert(res.data.message);
        }
      }
    } catch (e) {
      alert("操作失败");
    }
  };

  const handleDelete = async (typeId, typeName) => {
    if (!window.confirm(`确定要删除 "${typeName}" 吗？如果该类型下有房间，将无法删除。`)) return;
    try {
      const res = await deleteRoomTypeApi(typeId);
      if (res.data.code === 200) {
        alert("删除成功");
        loadRoomTypes();
      } else {
        alert(res.data.message);
      }
    } catch (e) {
      alert("删除失败");
    }
  };

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title"><FaCog /><span>客房类型管理</span></div>
              <div className="page-subtitle">Room Type Management</div>
            </div>
            <div className="toolbar-actions">
              <button className="btn btn-secondary" onClick={() => navigate("/rooms")}>
                <FaHotel style={{ marginRight: 8 }} />返回客房管理
              </button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={openCreate}>
                <FaPlus style={{ marginRight: 8 }} />新增类型
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-text center-page">加载中...</div>
          ) : roomTypes.length === 0 ? (
            <div className="empty-text center-page">暂无客房类型数据</div>
          ) : (
            <div className="table-card premium-table-card">
              <div className="table-wrap">
                <table className="data-table premium-table">
                  <thead>
                    <tr>
                      <th>类型ID</th>
                      <th>类型名称</th>
                      <th>标准价格</th>
                      <th>超时计费规则</th>
                      <th>设施配置</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.map((t) => (
                      <tr key={t.type_id}>
                        <td>#{t.type_id}</td>
                        <td><strong>{t.type_name}</strong></td>
                        <td><span className="role-tag role-admin">¥{Number(t.base_price).toFixed(2)}</span></td>
                        <td>{t.overtime_rule || "-"}</td>
                        <td>{t.facilities || "-"}</td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-btn edit-btn" onClick={() => openEdit(t)}>
                              <FaEdit />
                            </button>
                            <button className="icon-btn delete-btn" onClick={() => handleDelete(t.type_id, t.type_name)}>
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
                <h2>{editing ? "编辑客房类型" : "新增客房类型"}</h2>
                <p>请填写客房类型信息</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>X</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">类型名称</label>
                <div className="input-wrap">
                  <FaHotel className="input-icon" />
                  <input className="input" placeholder="如：标准单人间" value={form.type_name}
                    onChange={(e) => setForm({ ...form, type_name: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">标准价格</label>
                <div className="input-wrap">
                  <FaDollarSign className="input-icon" />
                  <input className="input" type="number" step="0.01" placeholder="如：188.00" value={form.base_price}
                    onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">超时计费规则</label>
                <div className="input-wrap">
                  <FaAlignLeft className="input-icon" />
                  <input className="input" placeholder="如：超过2小时加收半天房费" value={form.overtime_rule}
                    onChange={(e) => setForm({ ...form, overtime_rule: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">设施配置</label>
                <textarea className="input select-input" rows="3" placeholder="如：空调、电视、WiFi、独立卫浴"
                  value={form.facilities} style={{ resize: "vertical" }}
                  onChange={(e) => setForm({ ...form, facilities: e.target.value })} />
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

export default RoomTypeManage;