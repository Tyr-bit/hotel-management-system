import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { checkoutApi, getCheckinsApi, getSettlementsApi } from "../api/request";
import { getUser } from "../utils/auth";
import {
  FaMoneyBillWave, FaHome, FaUser, FaHotel, FaCalendarAlt, FaCreditCard
} from "react-icons/fa";

function Settlement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkinId = searchParams.get("checkin");

  const [checkin, setCheckin] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(checkinId ? "checkout" : "history");
  const [paymentMethod, setPaymentMethod] = useState("微信");
  const [result, setResult] = useState(null);

  const user = getUser();

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (checkinId) {
        const cRes = await getCheckinsApi();
        if (cRes.data.code === 200) {
          const found = cRes.data.data.find((c) => c.checkin_id === parseInt(checkinId));
          setCheckin(found || null);
        }
      }
      const sRes = await getSettlementsApi();
      if (sRes.data.code === 200) setSettlements(sRes.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCheckout = async () => {
    try {
      const res = await checkoutApi(parseInt(checkinId), paymentMethod);
      if (res.data.code === 200) {
        setResult(res.data.data);
        alert("退房结算成功");
        loadData();
      } else {
        alert(res.data.message);
      }
    } catch (e) { alert("结算失败"); }
  };

  const paymentOptions = ["现金", "银行卡", "微信", "支付宝"];

  if (loading) return <div className="page-shell"><div className="container"><div className="card dashboard-card"><div className="empty-text center-page">加载中...</div></div></div></div>;

  return (
    <div className="page-shell">
      <div className="container">
        <div className="card dashboard-card">
          <div className="topbar">
            <div>
              <div className="page-title"><FaMoneyBillWave /><span>结账管理</span></div>
              <div className="page-subtitle">Settlement</div>
            </div>
            <div className="toolbar-actions">
              <button className="btn btn-secondary" onClick={() => navigate("/home")}>
                <FaHome style={{ marginRight: 8 }} />返回首页
              </button>
              {!checkinId && (
                <button className={`btn ${tab === "checkout" ? "btn-primary" : "btn-secondary"}`}
                  style={{ width: "auto" }} onClick={() => setTab("checkout")}>
                  退房结算
                </button>
              )}
              <button className={`btn ${tab === "history" ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "auto" }} onClick={() => setTab("history")}>
                结算记录
              </button>
            </div>
          </div>

          {tab === "checkout" && (
            <>
              {checkin ? (
                <div>
                  <div className="quick-grid" style={{ marginBottom: 24 }}>
                    <div className="quick-card">
                      <div className="quick-icon"><FaUser /></div>
                      <div className="quick-content">
                        <div>
                          <div className="quick-title">{checkin.customer_name || checkin.customer_id_card}</div>
                          <div className="page-subtitle">客户</div>
                        </div>
                      </div>
                    </div>
                    <div className="quick-card">
                      <div className="quick-icon"><FaHotel /></div>
                      <div className="quick-content">
                        <div>
                          <div className="quick-title">{checkin.room_id} ({checkin.type_name})</div>
                          <div className="page-subtitle">房间 / ¥{checkin.base_price}/天</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {result ? (
                    <div className="table-card premium-table-card" style={{ marginBottom: 16 }}>
                      <div style={{ padding: 20 }}>
                        <h3 style={{ color: "#2b4f89", marginBottom: 16 }}>结算结果</h3>
                        <div className="grid-panels two-panels">
                          <div className="info-panel stat-panel premium-panel">
                            <div className="stat-label">房费总额</div>
                            <div className="stat-value">¥{result.total_amount}</div>
                          </div>
                          <div className="info-panel stat-panel premium-panel">
                            <div className="stat-label">折扣金额</div>
                            <div className="stat-value">-¥{result.discount_amount}</div>
                          </div>
                          <div className="info-panel stat-panel premium-panel">
                            <div className="stat-label">实付金额</div>
                            <div className="stat-value" style={{ color: "#2b4f89" }}>¥{result.paid_amount}</div>
                          </div>
                          <div className="info-panel stat-panel premium-panel">
                            <div className="stat-label">入住天数 / 支付方式</div>
                            <div className="stat-value" style={{ fontSize: 20 }}>{result.days}天 / {result.payment_method}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="table-card premium-table-card">
                      <div className="modal-body">
                        <div className="input-group">
                          <label className="input-label">支付方式</label>
                          <select className="input select-input" value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}>
                            {paymentOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => navigate("/checkin")}>取消</button>
                        <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleCheckout}>确认退房结算</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-text center-page" style={{ padding: 40 }}>
                  <FaCreditCard style={{ fontSize: 48, color: "#8ba4ce", marginBottom: 16 }} />
                  <p>请从入住管理页面选择一条入住记录进行结算</p>
                  <button className="btn btn-primary" style={{ width: "auto", marginTop: 16 }}
                    onClick={() => navigate("/checkin")}>前往入住管理</button>
                </div>
              )}
            </>
          )}

          {tab === "history" && (
            settlements.length === 0 ? (
              <div className="empty-text center-page">暂无结算记录</div>
            ) : (
              <div className="table-card premium-table-card">
                <div className="table-wrap">
                  <table className="data-table premium-table">
                    <thead>
                      <tr>
                        <th>结算编号</th>
                        <th>入住编号</th>
                        <th>客户</th>
                        <th>房间号</th>
                        <th>入住时间</th>
                        <th>退房时间</th>
                        <th>总金额</th>
                        <th>折扣</th>
                        <th>实付</th>
                        <th>支付方式</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((s) => (
                        <tr key={s.settlement_id}>
                          <td>#{s.settlement_id}</td>
                          <td>#{s.checkin_id}</td>
                          <td>{s.customer_id_card}</td>
                          <td>{s.room_id}</td>
                          <td>{s.actual_checkin ? new Date(s.actual_checkin).toLocaleString() : "-"}</td>
                          <td>{s.actual_checkout ? new Date(s.actual_checkout).toLocaleString() : "-"}</td>
                          <td>¥{Number(s.total_amount).toFixed(2)}</td>
                          <td>¥{Number(s.discount_amount).toFixed(2)}</td>
                          <td style={{ fontWeight: 700, color: "#2b4f89" }}>¥{Number(s.paid_amount).toFixed(2)}</td>
                          <td><span className="phone-cell"><FaCalendarAlt />{s.payment_method}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default Settlement;
