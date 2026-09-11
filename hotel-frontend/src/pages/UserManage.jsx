import { useEffect, useState } from "react";
import {
  getUserListApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
  updateUserRoleApi,
  updateUserStatusApi
} from "../api/request";
import {
  FaUsers,
  FaUserShield,
  FaUser,
  FaSyncAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSave,
  FaPhoneAlt,
  FaLock
} from "react-icons/fa";

const roleOptions = ["ADMIN", "MANAGER", "STAFF", "CHECKIN", "USER"];

// 角色中文映射
const roleLabels = {
  ADMIN: "管理员",
  MANAGER: "前台经理",
  STAFF: "前台员工",
  CHECKIN: "入住办理",
  USER: "普通用户"
};

// 根据角色获取样式类名
const getRoleClass = (role) => {
  const roleClassMap = {
    ADMIN: "role-admin",
    MANAGER: "role-manager",
    STAFF: "role-staff",
    CHECKIN: "role-checkin",
    USER: "role-user"
  };
  return roleClassMap[role] || "role-user";
};

const emptyForm = {
  username: "",
  password: "",
  phone: "",
  role: "USER",
  status: 1
};

function UserManage() {
  const [users, setUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("create");
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadUsers = async () => {
    try {
      const res = await getUserListApi();

      if (res.data.code === 200) {
        setUsers(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        alert(res.data.message || "获取用户列表失败");
      }
    } catch (error) {
      console.error(error);
      alert("获取用户列表失败");
    }
  };

  const openCreateModal = () => {
    setModalType("create");
    setCurrentId(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (user) => {
    setModalType("edit");
    setCurrentId(user.id);
    setForm({
      username: user.username || "",
      password: "",
      phone: user.phone || "",
      role: user.role || "USER",
      status: user.status ?? 1
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setCurrentId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.username || !form.phone) {
      alert("请填写用户名和手机号");
      return;
    }

    if (modalType === "create" && !form.password) {
      alert("新增用户需要填写密码");
      return;
    }

    try {
      let res;

      if (modalType === "create") {
        res = await createUserApi(form);
      } else {
        const updateData = { ...form };

        if (!updateData.password) {
          delete updateData.password;
        }

        res = await updateUserApi(currentId, updateData);
      }

      if (res.data.code === 200) {
        alert(modalType === "create" ? "新增成功" : "修改成功");
        closeModal();
        loadUsers();
      } else {
        alert(res.data.message || "操作失败");
      }
    } catch (error) {
      console.error(error);
      alert("操作失败，请检查后端接口");
    }
  };

  const handleDelete = async (id) => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    if (currentUser.id === id) {
      alert("不能删除当前登录账号");
      return;
    }

    if (!window.confirm("确认删除该用户吗？")) {
      return;
    }

    try {
      const res = await deleteUserApi(id);

      if (res.data.code === 200) {
        alert("删除成功");
        loadUsers();
      } else {
        alert(res.data.message || "删除失败");
      }
    } catch (error) {
      console.error(error);
      alert("删除失败，请检查后端接口");
    }
  };

  const handleChangeRole = async (id, role) => {
    try {
      const res = await updateUserRoleApi(id, role);

      if (res.data.code === 200) {
        alert("角色修改成功");
        loadUsers();
      } else {
        alert(res.data.message || "角色修改失败");
      }
    } catch (error) {
      console.error(error);
      alert("角色修改失败");
    }
  };

  const handleChangeStatus = async (id, status) => {
    try {
      const res = await updateUserStatusApi(id, status);

      if (res.data.code === 200) {
        alert("账号状态更新成功");
        loadUsers();
      } else {
        alert(res.data.message || "账号状态更新失败");
      }
    } catch (error) {
      console.error(error);
      alert("账号状态更新失败");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title">
                <FaUsers />
                <span>用户权限管理</span>
              </div>
              <div className="page-subtitle">User Access Management</div>
            </div>

            <div className="toolbar-actions">
              <button className="btn btn-secondary" onClick={loadUsers}>
                <FaSyncAlt style={{ marginRight: 8 }} />
                刷新
              </button>

              <button className="btn btn-primary" style={{ width: "auto" }} onClick={openCreateModal}>
                <FaPlus style={{ marginRight: 8 }} />
                新增用户
              </button>
            </div>
          </div>

          <div className="table-card premium-table-card">
            <div className="table-wrap">
              <table className="data-table premium-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>用户</th>
                    <th>手机号</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>权限</th>
                    <th>操作</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>

                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {item.role === "ADMIN" ? <FaUserShield /> : <FaUser />}
                          </div>
                          <div>
                            <div className="user-name">{item.username}</div>
                            <div className="user-id">UID {item.id}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="phone-cell">
                          <FaPhoneAlt />
                          {item.phone}
                        </span>
                      </td>

                      <td>
                        <span className={`role-tag ${getRoleClass(item.role)}`}>
                          {roleLabels[item.role] || item.role}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-tag ${
                            item.status === 1 ? "status-normal" : "status-disabled"
                          }`}
                        >
                          {item.status === 1 ? "正常" : "禁用"}
                        </span>
                      </td>

                       <td>
                         <select
                           className="input select-input"
                           value={item.role}
                           onChange={(e) => handleChangeRole(item.id, e.target.value)}
                           style={{ minWidth: 120 }}
                         >
                           {roleOptions.map((role) => (
                             <option key={role} value={role}>
                               {roleLabels[role]}
                             </option>
                           ))}
                         </select>
                       </td>

                      <td>
                        <div className="table-actions">
                          <button
                            className="small-action-btn"
                            onClick={() => handleChangeStatus(item.id, item.status === 1 ? 0 : 1)}
                          >
                            {item.status === 1 ? "禁用" : "启用"}
                          </button>

                          <button className="icon-btn edit-btn" onClick={() => openEditModal(item)}>
                            <FaEdit />
                          </button>

                          <button className="icon-btn delete-btn" onClick={() => handleDelete(item.id)}>
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && <p className="empty-text">暂无用户数据</p>}
          </div>
        </div>
      </div>

      {modalVisible && (
        <div className="modal-mask">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{modalType === "create" ? "新增用户" : "编辑用户"}</h2>
                <p>{modalType === "create" ? "Create User" : "Edit User"}</p>
              </div>

              <button className="modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">用户名</label>
                <div className="input-wrap">
                  <FaUser className="input-icon" />
                  <input
                    className="input"
                    value={form.username}
                    placeholder="请输入用户名"
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">
                  密码 {modalType === "edit" && <span className="muted-text">不填写则不修改</span>}
                </label>
                <div className="input-wrap">
                  <FaLock className="input-icon" />
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    placeholder="请输入密码"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">手机号</label>
                <div className="input-wrap">
                  <FaPhoneAlt className="input-icon" />
                  <input
                    className="input"
                    value={form.phone}
                    placeholder="请输入手机号"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">角色</label>
                  <select
                    className="input select-input"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">状态</label>
                  <select
                    className="input select-input"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
                  >
                    <option value={1}>正常</option>
                    <option value={0}>禁用</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                取消
              </button>

              <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleSubmit}>
                <FaSave style={{ marginRight: 8 }} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManage;
