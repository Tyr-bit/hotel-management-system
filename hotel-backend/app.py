from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import os
from dotenv import load_dotenv
import jwt
import datetime
from functools import wraps

load_dotenv()

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.getenv("SECRET_KEY", "hotel-system-secret")
VALID_ROLES = ["ADMIN", "MANAGER", "STAFF", "CHECKIN", "USER"]
VALID_ROLE_ENUM_SQL = "', '".join(VALID_ROLES)


def get_db():
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_name = os.getenv("DB_NAME")

    if not db_host or not db_port or not db_user or not db_name:
        raise Exception("数据库配置缺失，请检查 .env 文件")

    return pymysql.connect(
        host=db_host,
        port=int(db_port),
        user=db_user,
        password=db_password,
        database=db_name,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )


def ensure_user_role_schema(cursor):
    cursor.execute(
        f"""
        ALTER TABLE user
        MODIFY COLUMN role ENUM('{VALID_ROLE_ENUM_SQL}') DEFAULT 'USER'
        """
    )


def create_token(user):
    payload = {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({
                "code": 401,
                "message": "缺少 Token"
            }), 401

        try:
            token = auth_header.replace("Bearer ", "")
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({
                "code": 401,
                "message": "Token 已过期"
            }), 401
        except Exception:
            return jsonify({
                "code": 401,
                "message": "Token 无效"
            }), 401

        return func(*args, **kwargs)

    return wrapper


def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        current_user = getattr(request, "current_user", None)

        if not current_user or current_user.get("role") != "ADMIN":
            return jsonify({
                "code": 403,
                "message": "无管理员权限"
            }), 403

        return func(*args, **kwargs)

    return wrapper

def role_required(allowed_roles):
    """角色权限验证装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            current_user = getattr(request, "current_user", None)
            if not current_user:
                return jsonify({"code": 401, "message": "未登录"}), 401
            if current_user.get("role") not in allowed_roles:
                return jsonify({"code": 403, "message": "无权限访问"}), 403
            return func(*args, **kwargs)
        return wrapper
    return decorator

@app.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user():
    """获取当前登录用户信息"""
    return jsonify({
        "code": 200,
        "data": {
            "id": request.current_user["id"],
            "username": request.current_user["username"],
            "role": request.current_user["role"]
        }
    })
@app.route("/")
def index():
    return jsonify({
        "code": 200,
        "message": "Python 后端启动成功"
    })


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({
            "code": 400,
            "message": "用户名和密码不能为空"
        }), 400

    conn = get_db()

    try:
        with conn.cursor() as cursor:
            sql = """
            SELECT id, username, password, phone, role, status
            FROM user
            WHERE username = %s AND deleted = 0
            LIMIT 1
            """
            cursor.execute(sql, (username,))
            user = cursor.fetchone()

        if not user:
            return jsonify({
                "code": 401,
                "message": "用户名或密码错误"
            }), 401

        if user["password"] != password:
            return jsonify({
                "code": 401,
                "message": "用户名或密码错误"
            }), 401

        if user["status"] != 1:
            return jsonify({
                "code": 403,
                "message": "账号已被禁用"
            }), 403

        token = create_token(user)

        result = {
            "id": user["id"],
            "username": user["username"],
            "phone": user["phone"],
            "role": user["role"],
            "status": user["status"],
            "token": token
        }

        return jsonify({
            "code": 200,
            "message": "登录成功",
            "data": result
        })

    finally:
        conn.close()


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    username = data.get("username")
    password = data.get("password")
    phone = data.get("phone")

    if not username or not password:
        return jsonify({
            "code": 400,
            "message": "用户名和密码不能为空"
        }), 400

    conn = get_db()

    try:
        with conn.cursor() as cursor:
            sql = """
            INSERT INTO user(username, password, phone, role, status, deleted)
            VALUES (%s, %s, %s, 'USER', 1, 0)
            """
            cursor.execute(sql, (username, password, phone))
            conn.commit()

        return jsonify({
            "code": 200,
            "message": "注册成功"
        })

    except pymysql.err.IntegrityError:
        return jsonify({
            "code": 409,
            "message": "用户名已存在"
        }), 409

    finally:
        conn.close()


@app.route("/api/users", methods=["GET"])
@login_required
@admin_required
def get_users():
    conn = get_db()

    try:
        with conn.cursor() as cursor:
            sql = """
            SELECT id, username, phone, role, status
            FROM user
            WHERE deleted = 0
            ORDER BY id ASC
            """
            cursor.execute(sql)
            users = cursor.fetchall()

        return jsonify({
            "code": 200,
            "message": "获取用户列表成功",
            "data": users
        })

    finally:
        conn.close()


@app.route("/api/users", methods=["POST"])
@login_required
@admin_required
def create_user():
    data = request.get_json(silent=True) or {}

    username = data.get("username")
    password = data.get("password")
    phone = data.get("phone")
    role = data.get("role", "USER")
    status = data.get("status", 1)

    if not username or not password:
        return jsonify({
            "code": 400,
            "message": "用户名和密码不能为空"
        }), 400

    if role not in VALID_ROLES:
        return jsonify({
            "code": 400,
            "message": "角色不合法"
        }), 400

    if status not in [0, 1]:
        return jsonify({
            "code": 400,
            "message": "状态不合法"
        }), 400

    conn = get_db()

    try:
        with conn.cursor() as cursor:
            ensure_user_role_schema(cursor)
            sql = """
            INSERT INTO user(username, password, phone, role, status, deleted)
            VALUES (%s, %s, %s, %s, %s, 0)
            """
            cursor.execute(sql, (username, password, phone, role, status))
            conn.commit()

        return jsonify({
            "code": 200,
            "message": "新增用户成功"
        })

    except pymysql.err.IntegrityError:
        return jsonify({
            "code": 409,
            "message": "用户名已存在"
        }), 409

    finally:
        conn.close()


@app.route("/api/users/<int:user_id>", methods=["PUT"])
@login_required
@admin_required
def update_user(user_id):
    data = request.get_json(silent=True) or {}

    username = data.get("username")
    password = data.get("password")
    phone = data.get("phone")
    role = data.get("role")
    status = data.get("status")

    if not username:
        return jsonify({
            "code": 400,
            "message": "用户名不能为空"
        }), 400

    if role not in VALID_ROLES:
        return jsonify({
            "code": 400,
            "message": "角色不合法"
        }), 400

    if status not in [0, 1]:
        return jsonify({
            "code": 400,
            "message": "状态不合法"
        }), 400

    current_user = request.current_user

    if current_user["id"] == user_id and role != "ADMIN":
        return jsonify({
            "code": 400,
            "message": "不能取消当前登录管理员的管理员权限"
        }), 400

    conn = get_db()

    try:
        with conn.cursor() as cursor:
            ensure_user_role_schema(cursor)
            if password:
                sql = """
                UPDATE user
                SET username = %s, password = %s, phone = %s, role = %s, status = %s
                WHERE id = %s AND deleted = 0
                """
                cursor.execute(sql, (username, password, phone, role, status, user_id))
            else:
                sql = """
                UPDATE user
                SET username = %s, phone = %s, role = %s, status = %s
                WHERE id = %s AND deleted = 0
                """
                cursor.execute(sql, (username, phone, role, status, user_id))

            conn.commit()

            if cursor.rowcount == 0:
                return jsonify({
                    "code": 404,
                    "message": "用户不存在"
                }), 404

        return jsonify({
            "code": 200,
            "message": "修改用户成功"
        })

    except pymysql.err.IntegrityError:
        return jsonify({
            "code": 409,
            "message": "用户名已存在"
        }), 409

    finally:
        conn.close()


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_user(user_id):
    current_user = request.current_user

    if current_user["id"] == user_id:
        return jsonify({
            "code": 400,
            "message": "不能删除当前登录账号"
        }), 400

    conn = get_db()

    try:
        with conn.cursor() as cursor:
            sql = """
            UPDATE user
            SET deleted = 1
            WHERE id = %s AND deleted = 0
            """
            cursor.execute(sql, (user_id,))
            conn.commit()

            if cursor.rowcount == 0:
                return jsonify({
                    "code": 404,
                    "message": "用户不存在"
                }), 404

        return jsonify({
            "code": 200,
            "message": "删除用户成功"
        })

    finally:
        conn.close()


@app.route("/api/users/<int:user_id>/role", methods=["PUT"])
@login_required
@admin_required
def update_user_role(user_id):
    data = request.get_json(silent=True) or {}
    role = data.get("role")

    if role not in VALID_ROLES:
        return jsonify({
            "code": 400,
            "message": "角色不合法"
        }), 400

    current_user = request.current_user

    if current_user["id"] == user_id and role != "ADMIN":
        return jsonify({
            "code": 400,
            "message": "不能取消当前登录管理员的管理员权限"
        }), 400

    conn = get_db()

    try:
        with conn.cursor() as cursor:
            ensure_user_role_schema(cursor)
            sql = """
            UPDATE user
            SET role = %s
            WHERE id = %s AND deleted = 0
            """
            cursor.execute(sql, (role, user_id))
            conn.commit()

            if cursor.rowcount == 0:
                return jsonify({
                    "code": 404,
                    "message": "用户不存在"
                }), 404

        return jsonify({
            "code": 200,
            "message": "权限修改成功"
        })

    finally:
        conn.close()


@app.route("/api/users/<int:user_id>/status", methods=["PUT"])
@login_required
@admin_required
def update_user_status(user_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if status not in [0, 1]:
        return jsonify({
            "code": 400,
            "message": "鐘舵€佷笉鍚堟硶"
        }), 400

    current_user = request.current_user

    if current_user["id"] == user_id and status != 1:
        return jsonify({
            "code": 400,
            "message": "涓嶈兘绂佺敤褰撳墠鐧诲綍璐﹀彿"
        }), 400

    conn = get_db()

    try:
        with conn.cursor() as cursor:
            sql = """
            UPDATE user
            SET status = %s
            WHERE id = %s AND deleted = 0
            """
            cursor.execute(sql, (status, user_id))
            conn.commit()

            if cursor.rowcount == 0:
                return jsonify({
                    "code": 404,
                    "message": "鐢ㄦ埛涓嶅瓨鍦?"
                }), 404

        return jsonify({
            "code": 200,
            "message": "璐﹀彿鐘舵€佹洿鏂版垚鍔?"
        })

    finally:
        conn.close()


# ============================================================
# B 模块：前台管理 —— 客户信息
# ============================================================

@app.route("/api/customers", methods=["GET"])
@login_required
def get_customers():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM customer ORDER BY created_at DESC")
            customers = cursor.fetchall()
        return jsonify({"code": 200, "message": "获取客户列表成功", "data": customers})
    finally:
        conn.close()


@app.route("/api/customers", methods=["POST"])
@login_required
@role_required(['ADMIN', 'MANAGER'])
def create_customer():
    data = request.get_json(silent=True) or {}
    id_card = data.get("id_card")
    name = data.get("name")
    address = data.get("address", "")
    phone = data.get("phone", "")
    member_level = data.get("member_level", "普通会员")

    if not id_card or not name:
        return jsonify({"code": 400, "message": "身份证号和姓名不能为空"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO customer (id_card, name, address, phone, member_level) VALUES (%s, %s, %s, %s, %s)",
                (id_card, name, address, phone, member_level)
            )
            conn.commit()
        return jsonify({"code": 200, "message": "新增客户成功"})
    except pymysql.err.IntegrityError:
        return jsonify({"code": 409, "message": "身份证号已存在"}), 409
    finally:
        conn.close()


@app.route("/api/customers/<id_card>", methods=["PUT"])
@login_required
@role_required(['ADMIN', 'MANAGER'])
def update_customer(id_card):
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    address = data.get("address", "")
    phone = data.get("phone", "")
    member_level = data.get("member_level", "普通会员")

    if not name:
        return jsonify({"code": 400, "message": "姓名不能为空"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE customer SET name=%s, address=%s, phone=%s, member_level=%s WHERE id_card=%s",
                (name, address, phone, member_level, id_card)
            )
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"code": 404, "message": "客户不存在"}), 404
        return jsonify({"code": 200, "message": "修改客户成功"})
    finally:
        conn.close()


@app.route("/api/customers/<id_card>", methods=["DELETE"])
@login_required
@role_required(['ADMIN', 'MANAGER'])
def delete_customer(id_card):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM customer WHERE id_card=%s", (id_card,))
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"code": 404, "message": "客户不存在"}), 404
        return jsonify({"code": 200, "message": "删除客户成功"})
    finally:
        conn.close()


# ============================================================
# B 模块：前台管理 —— 客房类型 & 客房信息
# ============================================================

@app.route("/api/room-types", methods=["GET"])
@login_required
def get_room_types():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM room_type ORDER BY type_id")
            types = cursor.fetchall()
        return jsonify({"code": 200, "message": "获取客房类型成功", "data": types})
    finally:
        conn.close()


@app.route("/api/rooms", methods=["GET"])
@login_required
def get_rooms():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT r.*, rt.type_name, rt.base_price FROM room r "
                "LEFT JOIN room_type rt ON r.type_id = rt.type_id ORDER BY r.room_id"
            )
            rooms = cursor.fetchall()
        return jsonify({"code": 200, "message": "获取客房列表成功", "data": rooms})
    finally:
        conn.close()


@app.route("/api/rooms/available", methods=["GET"])
@login_required
def get_available_rooms():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT r.*, rt.type_name, rt.base_price FROM room r "
                "LEFT JOIN room_type rt ON r.type_id = rt.type_id "
                "WHERE r.room_status = '空闲' ORDER BY r.room_id"
            )
            rooms = cursor.fetchall()
        return jsonify({"code": 200, "message": "获取空闲客房成功", "data": rooms})
    finally:
        conn.close()


# ============================================================
# B 模块：前台管理 —— 预订管理
# ============================================================

@app.route("/api/reservations", methods=["GET"])
@login_required
def get_reservations():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT r.*, c.name AS customer_name, c.phone AS customer_phone "
                "FROM reservation r "
                "LEFT JOIN customer c ON r.customer_id_card = c.id_card "
                "ORDER BY r.reservation_time DESC"
            )
            reservations = cursor.fetchall()
        return jsonify({"code": 200, "message": "获取预订列表成功", "data": reservations})
    finally:
        conn.close()


@app.route("/api/reservations", methods=["POST"])
@login_required
@role_required(['ADMIN', 'MANAGER', 'STAFF'])
def create_reservation():
    data = request.get_json(silent=True) or {}
    
    customer_id_card = data.get("customer_id_card")
    expected_checkin = data.get("expected_checkin")
    expected_checkout = data.get("expected_checkout")
    room_type = data.get("room_type")
    guest_count = data.get("guest_count", 1)
    room_id = data.get("room_id")

    if not customer_id_card or not expected_checkin or not expected_checkout or not room_type:
        return jsonify({"code": 400, "message": "客户、入住/退房日期和客房类型不能为空"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 如果没有指定房间，自动分配一个
            if not room_id or room_id == "":
                # 获取该房型下所有房间
                cursor.execute("""
                    SELECT r.room_id 
                    FROM room r
                    LEFT JOIN room_type rt ON r.type_id = rt.type_id
                    WHERE rt.type_name = %s 
                    AND r.room_status != '维修中'
                """, (room_type,))
                all_rooms = cursor.fetchall()
                
                # 获取被占用的房间ID
                cursor.execute("""
                    SELECT DISTINCT room_id FROM checkin 
                    WHERE status = '入住中'
                    AND room_id IS NOT NULL
                    AND expected_checkin < %s 
                    AND expected_checkout > %s
                """, (expected_checkout, expected_checkin))
                occupied_checkin = [row["room_id"] for row in cursor.fetchall()]
                
                cursor.execute("""
                    SELECT DISTINCT room_id FROM reservation 
                    WHERE status IN ('待确认', '已确认')
                    AND room_id IS NOT NULL
                    AND expected_checkin < %s 
                    AND expected_checkout > %s
                """, (expected_checkout, expected_checkin))
                occupied_reservation = [row["room_id"] for row in cursor.fetchall()]
                
                occupied_ids = set(occupied_checkin + occupied_reservation)
                
                # 找出可用房间
                available_room_ids = [r["room_id"] for r in all_rooms if r["room_id"] not in occupied_ids]
                
                if not available_room_ids:
                    return jsonify({"code": 409, "message": f"当前没有可用的{room_type}，请更换日期或房型"}), 409
                
                room_id = available_room_ids[0]
            
            # 如果指定了房间，检查该房间在所选时间段是否可用
            if room_id:
                room_id_int = int(room_id)
                
                # 检查房间是否存在
                cursor.execute("SELECT room_id, room_status FROM room WHERE room_id = %s", (room_id_int,))
                room = cursor.fetchone()
                if not room:
                    return jsonify({"code": 404, "message": "房间不存在"}), 404
                
                # 检查是否已被入住（时间段重叠）
                cursor.execute("""
                    SELECT COUNT(*) as count FROM checkin 
                    WHERE room_id = %s 
                    AND status = '入住中'
                    AND expected_checkin < %s 
                    AND expected_checkout > %s
                """, (room_id_int, expected_checkout, expected_checkin))
                checkin_conflict = cursor.fetchone()
                
                if checkin_conflict and checkin_conflict["count"] > 0:
                    return jsonify({"code": 409, "message": f"该房间在所选时间段已被入住"}), 409
                
                # 检查是否已被预订（时间段重叠）
                cursor.execute("""
                    SELECT COUNT(*) as count FROM reservation 
                    WHERE room_id = %s 
                    AND status IN ('待确认', '已确认')
                    AND expected_checkin < %s 
                    AND expected_checkout > %s
                """, (room_id_int, expected_checkout, expected_checkin))
                reservation_conflict = cursor.fetchone()
                
                if reservation_conflict and reservation_conflict["count"] > 0:
                    return jsonify({"code": 409, "message": f"该房间在所选时间段已被预订"}), 409
            
            # 创建预订
            cursor.execute("""
                INSERT INTO reservation 
                (customer_id_card, expected_checkin, expected_checkout, room_type, room_id, guest_count, status) 
                VALUES (%s, %s, %s, %s, %s, %s, '待确认')
            """, (customer_id_card, expected_checkin, expected_checkout, room_type, room_id if room_id else None, guest_count))
            conn.commit()
            
        return jsonify({"code": 200, "message": "预订成功"})
    except Exception as e:
        conn.rollback()
        print(f"预订错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/reservations/<int:reservation_id>", methods=["PUT"])
@login_required
@role_required(['ADMIN', 'MANAGER', 'STAFF'])
def update_reservation(reservation_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if not status:
        return jsonify({"code": 400, "message": "状态不能为空"}), 400
    if status not in ["待确认", "已确认", "已取消", "已入住"]:
        return jsonify({"code": 400, "message": "状态不合法"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE reservation SET status=%s WHERE reservation_id=%s",
                (status, reservation_id)
            )
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"code": 404, "message": "预订不存在"}), 404
        return jsonify({"code": 200, "message": "更新预订成功"})
    finally:
        conn.close()


# ============================================================
# B 模块：前台管理 —— 入住管理
# ============================================================

@app.route("/api/checkins", methods=["GET"])
@login_required
@role_required(['ADMIN', 'MANAGER', 'STAFF', 'CHECKIN'])
def get_checkins():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT ci.*, c.name AS customer_name, c.phone AS customer_phone, "
                "r.room_id, rt.type_name, rt.base_price "
                "FROM checkin ci "
                "LEFT JOIN customer c ON ci.customer_id_card = c.id_card "
                "LEFT JOIN room r ON ci.room_id = r.room_id "
                "LEFT JOIN room_type rt ON r.type_id = rt.type_id "
                "ORDER BY ci.actual_checkin DESC"
            )
            checkins = cursor.fetchall()
        return jsonify({"code": 200, "message": "获取入住列表成功", "data": checkins})
    finally:
        conn.close()


@app.route("/api/checkins", methods=["POST"])
@login_required
@role_required(['ADMIN', 'MANAGER', 'STAFF', 'CHECKIN'])
def create_checkin():
    data = request.get_json(silent=True) or {}
    customer_id_card = data.get("customer_id_card")
    room_id = data.get("room_id")
    expected_checkin = data.get("expected_checkin")
    expected_checkout = data.get("expected_checkout")

    print(f"[DEBUG] 入住办理 - 客户: {customer_id_card}, 房间: {room_id}")
    print(f"[DEBUG] 入住日期: {expected_checkin}, 退房日期: {expected_checkout}")

    if not customer_id_card or not room_id:
        return jsonify({"code": 400, "message": "客户身份证号和房间号不能为空"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 1. 检查客户是否存在
            cursor.execute("SELECT name FROM customer WHERE id_card=%s", (customer_id_card,))
            customer = cursor.fetchone()
            if not customer:
                return jsonify({"code": 404, "message": "客户不存在"}), 404

            # 2. 检查房间是否存在
            cursor.execute("SELECT room_id, room_status, room_number FROM room WHERE room_id=%s", (room_id,))
            room = cursor.fetchone()
            if not room:
                return jsonify({"code": 404, "message": "房间不存在"}), 404

            # 3. 使用前端传来的日期，如果没有则使用默认值
            if not expected_checkin:
                expected_checkin = datetime.date.today().isoformat()
            if not expected_checkout:
                expected_checkout = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

            # 4. 创建入住记录
            cursor.execute("""
                INSERT INTO checkin (customer_id_card, expected_checkin, expected_checkout, room_id, actual_checkin, status) 
                VALUES (%s, %s, %s, %s, NOW(), '入住中')
            """, (customer_id_card, expected_checkin, expected_checkout, room_id))
            checkin_id = cursor.lastrowid

            # 5. 更新房间状态
            cursor.execute("UPDATE room SET room_status='已入住' WHERE room_id=%s", (room_id,))

            # 6. 更新预订状态
            cursor.execute("""
                UPDATE reservation SET status='已入住' 
                WHERE customer_id_card=%s AND status = '已确认'
                ORDER BY reservation_id DESC LIMIT 1
            """, (customer_id_card,))

            conn.commit()

        return jsonify({
            "code": 200,
            "message": "入住办理成功",
            "data": {
                "checkin_id": checkin_id,
                "customer_name": customer["name"],
                "room_number": room["room_number"]
            }
        })
    except Exception as e:
        conn.rollback()
        print(f"入住办理错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/checkins/<int:checkin_id>/room-change", methods=["PUT"])
@login_required
@role_required(['ADMIN', 'MANAGER', 'STAFF', 'CHECKIN'])
def change_room(checkin_id):
    data = request.get_json(silent=True) or {}
    new_room_id = data.get("new_room_id")

    if not new_room_id:
        return jsonify({"code": 400, "message": "新房间号不能为空"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 查入住记录
            cursor.execute("SELECT * FROM checkin WHERE checkin_id=%s", (checkin_id,))
            checkin = cursor.fetchone()
            if not checkin:
                return jsonify({"code": 404, "message": "入住记录不存在"}), 404
            if checkin["status"] == "已退房":
                return jsonify({"code": 400, "message": "已退房，不能换房"}), 400

            # 检查新房间
            cursor.execute("SELECT room_status FROM room WHERE room_id=%s", (new_room_id,))
            new_room = cursor.fetchone()
            if not new_room:
                return jsonify({"code": 404, "message": "新房间不存在"}), 404
            if new_room["room_status"] != "空闲":
                return jsonify({"code": 400, "message": "新房间不是空闲状态"}), 400

            old_room_id = checkin["room_id"]

            # 换房
            cursor.execute(
                "UPDATE checkin SET room_id=%s WHERE checkin_id=%s",
                (new_room_id, checkin_id)
            )
            cursor.execute(
                "UPDATE room SET room_status='空闲' WHERE room_id=%s", (old_room_id,)
            )
            cursor.execute(
                "UPDATE room SET room_status='已入住' WHERE room_id=%s", (new_room_id,)
            )

            conn.commit()

        return jsonify({"code": 200, "message": "换房成功"})
    finally:
        conn.close()


@app.route("/api/checkins/<int:checkin_id>/checkout", methods=["POST"])
@login_required
@role_required(['ADMIN', 'MANAGER', 'STAFF', 'CHECKIN'])
def checkout(checkin_id):
    data = request.get_json(silent=True) or {}
    payment_method = data.get("payment_method", "现金")

    if payment_method not in ["现金", "银行卡", "微信", "支付宝"]:
        return jsonify({"code": 400, "message": "支付方式不合法"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 查入住记录
            cursor.execute(
                "SELECT ci.*, r.type_id, rt.base_price, rt.overtime_rule "
                "FROM checkin ci "
                "LEFT JOIN room r ON ci.room_id = r.room_id "
                "LEFT JOIN room_type rt ON r.type_id = rt.type_id "
                "WHERE ci.checkin_id=%s",
                (checkin_id,)
            )
            checkin = cursor.fetchone()
            if not checkin:
                return jsonify({"code": 404, "message": "入住记录不存在"}), 404
            if checkin["status"] == "已退房":
                return jsonify({"code": 400, "message": "已退房，不能重复结算"}), 400

            # 计算费用
            now = datetime.datetime.now()
            checkin_time = checkin["actual_checkin"]
            delta = now - checkin_time
            days = delta.days + (1 if delta.seconds > 0 else 0)
            if days < 1:
                days = 1

            base_price = float(checkin["base_price"]) if checkin["base_price"] else 188.00
            total_amount = round(days * base_price, 2)

            # 查客户会员等级，计算折扣
            cursor.execute(
                "SELECT member_level, total_spent, member_points FROM customer WHERE id_card=%s",
                (checkin["customer_id_card"],)
            )
            customer = cursor.fetchone()

            discount_rate = 0.0
            if customer and customer["member_level"] == "金卡会员":
                discount_rate = 0.15
            elif customer and customer["member_level"] == "银卡会员":
                discount_rate = 0.10

            discount_amount = round(total_amount * discount_rate, 2)
            paid_amount = round(total_amount - discount_amount, 2)

            # 创建结算记录
            cursor.execute(
                "INSERT INTO settlement (checkin_id, total_amount, discount_amount, paid_amount, payment_method) "
                "VALUES (%s, %s, %s, %s, %s)",
                (checkin_id, total_amount, discount_amount, paid_amount, payment_method)
            )

            # 更新入住状态
            cursor.execute(
                "UPDATE checkin SET actual_checkout=%s, status='已退房' WHERE checkin_id=%s",
                (now, checkin_id)
            )

            # 释放房间
            cursor.execute(
                "UPDATE room SET room_status='空闲' WHERE room_id=%s",
                (checkin["room_id"],)
            )

            # 更新客户消费和积分
            if customer:
                new_total = float(customer["total_spent"]) + paid_amount
                new_points = int(customer["member_points"]) + int(paid_amount)  # 每消费1元积1分
                new_level = customer["member_level"]
                if new_points >= 10000:
                    new_level = "金卡会员"
                elif new_points >= 3000:
                    new_level = "银卡会员"

                cursor.execute(
                    "UPDATE customer SET total_spent=%s, member_points=%s, member_level=%s WHERE id_card=%s",
                    (new_total, new_points, new_level, checkin["customer_id_card"])
                )

            conn.commit()

        return jsonify({
            "code": 200,
            "message": "退房结算成功",
            "data": {
                "checkin_id": checkin_id,
                "total_amount": total_amount,
                "discount_amount": discount_amount,
                "paid_amount": paid_amount,
                "payment_method": payment_method,
                "days": days
            }
        })
    finally:
        conn.close()


# ============================================================
# B 模块：结算记录查询
# ============================================================

@app.route("/api/settlements", methods=["GET"])
@login_required
@role_required(['ADMIN', 'MANAGER', 'STAFF', 'CHECKIN'])
def get_settlements():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT s.*, ci.customer_id_card, ci.room_id, ci.actual_checkin, ci.actual_checkout "
                "FROM settlement s "
                "LEFT JOIN checkin ci ON s.checkin_id = ci.checkin_id "
                "ORDER BY s.settlement_time DESC"
            )
            settlements = cursor.fetchall()
        return jsonify({"code": 200, "message": "获取结算记录成功", "data": settlements})
    finally:
        conn.close()


# ============================================================
# 客房类型管理 (增删改查)
# ============================================================

@app.route("/api/room-types", methods=["POST"])
@login_required
@admin_required
def create_room_type():
    """新增客房类型"""
    data = request.get_json(silent=True) or {}
    
    type_name = data.get("type_name")
    base_price = data.get("base_price")
    overtime_rule = data.get("overtime_rule", "")
    facilities = data.get("facilities", "")
    
    if not type_name or not base_price:
        return jsonify({"code": 400, "message": "类型名称和标准价格不能为空"}), 400
    
    try:
        base_price = float(base_price)
        if base_price <= 0:
            return jsonify({"code": 400, "message": "价格必须大于0"}), 400
    except ValueError:
        return jsonify({"code": 400, "message": "价格格式不正确"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO room_type (type_name, base_price, overtime_rule, facilities) VALUES (%s, %s, %s, %s)",
                (type_name, base_price, overtime_rule, facilities)
            )
            conn.commit()
        return jsonify({"code": 200, "message": "新增客房类型成功"})
    except pymysql.err.IntegrityError:
        return jsonify({"code": 409, "message": "客房类型已存在"}), 409
    finally:
        conn.close()


@app.route("/api/room-types/<int:type_id>", methods=["PUT"])
@login_required
@admin_required
def update_room_type(type_id):
    """修改客房类型"""
    data = request.get_json(silent=True) or {}
    
    type_name = data.get("type_name")
    base_price = data.get("base_price")
    overtime_rule = data.get("overtime_rule", "")
    facilities = data.get("facilities", "")
    
    if not type_name or not base_price:
        return jsonify({"code": 400, "message": "类型名称和标准价格不能为空"}), 400
    
    try:
        base_price = float(base_price)
        if base_price <= 0:
            return jsonify({"code": 400, "message": "价格必须大于0"}), 400
    except ValueError:
        return jsonify({"code": 400, "message": "价格格式不正确"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE room_type SET type_name=%s, base_price=%s, overtime_rule=%s, facilities=%s WHERE type_id=%s",
                (type_name, base_price, overtime_rule, facilities, type_id)
            )
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"code": 404, "message": "客房类型不存在"}), 404
        return jsonify({"code": 200, "message": "修改客房类型成功"})
    finally:
        conn.close()


@app.route("/api/room-types/<int:type_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_room_type(type_id):
    """删除客房类型（会同时删除关联的房间）"""
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 先检查是否有房间关联
            cursor.execute("SELECT COUNT(*) as count FROM room WHERE type_id=%s", (type_id,))
            result = cursor.fetchone()
            if result and result["count"] > 0:
                return jsonify({"code": 400, "message": "该类型下还有房间，请先删除关联的房间"}), 400
            
            cursor.execute("DELETE FROM room_type WHERE type_id=%s", (type_id,))
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"code": 404, "message": "客房类型不存在"}), 404
        return jsonify({"code": 200, "message": "删除客房类型成功"})
    finally:
        conn.close()


# ============================================================
# 客房管理 (增删改查)
# ============================================================

@app.route("/api/rooms", methods=["POST"])
@login_required
@role_required(['ADMIN', 'MANAGER'])
def create_room():
    """新增房间"""
    data = request.get_json(silent=True) or {}
    
    room_number = data.get("room_number")
    type_id = data.get("type_id")
    floor = data.get("floor", "")
    description = data.get("description", "")
    room_status = data.get("room_status", "空闲")
    
    if not room_number or not type_id:
        return jsonify({"code": 400, "message": "房间号和类型不能为空"}), 400
    
    if room_status not in ["空闲", "已入住", "维修中"]:
        return jsonify({"code": 400, "message": "房间状态不合法"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 检查类型是否存在
            cursor.execute("SELECT type_id FROM room_type WHERE type_id=%s", (type_id,))
            if not cursor.fetchone():
                return jsonify({"code": 404, "message": "客房类型不存在"}), 404
            
            cursor.execute(
                "INSERT INTO room (room_number, type_id, floor, description, room_status) VALUES (%s, %s, %s, %s, %s)",
                (room_number, type_id, floor, description, room_status)
            )
            conn.commit()
        return jsonify({"code": 200, "message": "新增房间成功"})
    except pymysql.err.IntegrityError:
        return jsonify({"code": 409, "message": "房间号已存在"}), 409
    finally:
        conn.close()


@app.route("/api/rooms/<int:room_id>", methods=["PUT"])
@login_required
@role_required(['ADMIN', 'MANAGER'])
def update_room(room_id):
    """修改房间信息"""
    data = request.get_json(silent=True) or {}
    
    room_number = data.get("room_number")
    type_id = data.get("type_id")
    floor = data.get("floor", "")
    description = data.get("description", "")
    room_status = data.get("room_status")
    
    if not room_number or not type_id:
        return jsonify({"code": 400, "message": "房间号和类型不能为空"}), 400
    
    if room_status and room_status not in ["空闲", "已入住", "维修中"]:
        return jsonify({"code": 400, "message": "房间状态不合法"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 检查类型是否存在
            cursor.execute("SELECT type_id FROM room_type WHERE type_id=%s", (type_id,))
            if not cursor.fetchone():
                return jsonify({"code": 404, "message": "客房类型不存在"}), 404
            
            # 检查是否有入住记录（如果要把已入住的房间改成其他状态）
            if room_status and room_status != "已入住":
                cursor.execute("SELECT COUNT(*) as count FROM checkin WHERE room_id=%s AND status='入住中'", (room_id,))
                result = cursor.fetchone()
                if result and result["count"] > 0:
                    return jsonify({"code": 400, "message": "该房间当前有客人入住，不能修改状态"}), 400
            
            cursor.execute(
                "UPDATE room SET room_number=%s, type_id=%s, floor=%s, description=%s, room_status=%s WHERE room_id=%s",
                (room_number, type_id, floor, description, room_status, room_id)
            )
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"code": 404, "message": "房间不存在"}), 404
        return jsonify({"code": 200, "message": "修改房间成功"})
    finally:
        conn.close()


@app.route("/api/rooms/<int:room_id>", methods=["DELETE"])
@login_required
@role_required(['ADMIN', 'MANAGER'])
def delete_room(room_id):
    """删除房间"""
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 检查是否有入住记录
            cursor.execute("SELECT COUNT(*) as count FROM checkin WHERE room_id=%s", (room_id,))
            result = cursor.fetchone()
            if result and result["count"] > 0:
                return jsonify({"code": 400, "message": "该房间有入住记录，不能删除"}), 400
            
            cursor.execute("DELETE FROM room WHERE room_id=%s", (room_id,))
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"code": 404, "message": "房间不存在"}), 404
        return jsonify({"code": 200, "message": "删除房间成功"})
    finally:
        conn.close()


# ============================================================
# 客户高级查询 (支持模糊搜索)
# ============================================================

@app.route("/api/customers/search", methods=["GET"])
@login_required
def search_customers():
    """高级搜索客户"""
    keyword = request.args.get("keyword", "")
    member_level = request.args.get("member_level", "")
    
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            sql = "SELECT * FROM customer WHERE 1=1"
            params = []
            
            if keyword:
                sql += " AND (name LIKE %s OR id_card LIKE %s OR phone LIKE %s)"
                like_keyword = f"%{keyword}%"
                params.extend([like_keyword, like_keyword, like_keyword])
            
            if member_level:
                sql += " AND member_level = %s"
                params.append(member_level)
            
            sql += " ORDER BY created_at DESC"
            
            cursor.execute(sql, params)
            customers = cursor.fetchall()
        return jsonify({"code": 200, "message": "查询成功", "data": customers})
    finally:
        conn.close()


@app.route("/api/customers/<id_card>/points", methods=["PUT"])
@login_required
@role_required(['ADMIN', 'MANAGER'])
def update_customer_points(id_card):
    """手动调整客户积分"""
    data = request.get_json(silent=True) or {}
    points = data.get("points", 0)
    reason = data.get("reason", "")
    
    try:
        points = int(points)
    except ValueError:
        return jsonify({"code": 400, "message": "积分格式不正确"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE customer SET member_points = member_points + %s WHERE id_card=%s",
                (points, id_card)
            )
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"code": 404, "message": "客户不存在"}), 404
        return jsonify({"code": 200, "message": f"{reason}，积分调整成功"})
    finally:
        conn.close()

# ============================================================
# 客房实时状态查询（含时间段占用情况）
# ============================================================

@app.route("/api/rooms/status", methods=["GET"])
@login_required
def get_rooms_status():
    """获取所有房间的实时状态和未来占用情况"""
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 获取所有房间及其类型信息
            cursor.execute("""
                SELECT r.*, rt.type_name, rt.base_price 
                FROM room r 
                LEFT JOIN room_type rt ON r.type_id = rt.type_id 
                ORDER BY r.room_id
            """)
            rooms = cursor.fetchall()
            
            # 获取未来30天的预订和入住信息
            cursor.execute("""
                SELECT 
                    r.room_id,
                    r.room_number,
                    ci.actual_checkin,
                    ci.actual_checkout,
                    ci.status as checkin_status,
                    res.expected_checkin,
                    res.expected_checkout,
                    res.status as reservation_status
                FROM room r
                LEFT JOIN checkin ci ON r.room_id = ci.room_id 
                    AND ci.status = '入住中'
                LEFT JOIN reservation res ON r.room_id = res.room_id 
                    AND res.status IN ('待确认', '已确认')
                WHERE ci.checkin_id IS NOT NULL OR res.reservation_id IS NOT NULL
            """)
            occupations = cursor.fetchall()
            
            # 处理房间占用时间线
            result = []
            for room in rooms:
                room_data = {
                    "room_id": room["room_id"],
                    "room_number": room["room_number"],
                    "type_name": room["type_name"],
                    "base_price": float(room["base_price"]),
                    "room_status": room["room_status"],
                    "floor": room["floor"],
                    "unavailable_dates": []  # 不可用日期列表
                }
                
                # 找出该房间的所有占用时间段
                for occ in occupations:
                    if occ["room_id"] == room["room_id"]:
                        # 入住占用
                        if occ["actual_checkin"]:
                            start = occ["actual_checkin"].date()
                            end = occ["actual_checkout"].date() if occ["actual_checkout"] else start
                            room_data["unavailable_dates"].append({
                                "start": start.isoformat(),
                                "end": end.isoformat(),
                                "type": "入住"
                            })
                        # 预订占用
                        if occ["expected_checkin"]:
                            room_data["unavailable_dates"].append({
                                "start": occ["expected_checkin"].isoformat(),
                                "end": occ["expected_checkout"].isoformat(),
                                "type": "预订"
                            })
                
                result.append(room_data)
            
        return jsonify({"code": 200, "message": "获取房间状态成功", "data": result})
    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/rooms/available-by-date", methods=["GET"])
@login_required
def get_available_rooms_by_date():
    """根据日期查询可用房间"""
    checkin_date = request.args.get("checkin_date")
    checkout_date = request.args.get("checkout_date")
    room_type = request.args.get("room_type", "")
    
    if not checkin_date or not checkout_date:
        return jsonify({"code": 400, "message": "请选择入住和退房日期"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 获取所有房间
            if room_type:
                cursor.execute("""
                    SELECT r.room_id, r.room_number, r.floor, r.room_status, r.description,
                           rt.type_id, rt.type_name, rt.base_price
                    FROM room r
                    LEFT JOIN room_type rt ON r.type_id = rt.type_id
                    WHERE rt.type_name = %s AND r.room_status != '维修中'
                """, (room_type,))
            else:
                cursor.execute("""
                    SELECT r.room_id, r.room_number, r.floor, r.room_status, r.description,
                           rt.type_id, rt.type_name, rt.base_price
                    FROM room r
                    LEFT JOIN room_type rt ON r.type_id = rt.type_id
                    WHERE r.room_status != '维修中'
                """)
            
            all_rooms = cursor.fetchall()
            
            if not all_rooms:
                return jsonify({"code": 200, "message": "查询成功", "data": []})
            
            # 获取被占用的房间ID（入住中且时间段重叠）
            # 重叠条件：新入住日期 < 原退房日期 AND 新退房日期 > 原入住日期
            cursor.execute("""
                SELECT DISTINCT room_id 
                FROM checkin 
                WHERE status = '入住中'
                AND room_id IS NOT NULL
                AND expected_checkin IS NOT NULL
                AND expected_checkout IS NOT NULL
                AND expected_checkin < %s 
                AND expected_checkout > %s
            """, (checkout_date, checkin_date))
            occupied_by_checkin = [row["room_id"] for row in cursor.fetchall()]
            
            # 获取被预订的房间ID
            cursor.execute("""
                SELECT DISTINCT room_id 
                FROM reservation 
                WHERE status IN ('待确认', '已确认')
                AND room_id IS NOT NULL
                AND expected_checkin IS NOT NULL
                AND expected_checkout IS NOT NULL
                AND expected_checkin < %s 
                AND expected_checkout > %s
            """, (checkout_date, checkin_date))
            occupied_by_reservation = [row["room_id"] for row in cursor.fetchall()]
            
            # 合并
            occupied_ids = set(occupied_by_checkin + occupied_by_reservation)
            
            # 过滤
            available_rooms = []
            for room in all_rooms:
                if room["room_id"] not in occupied_ids:
                    room["base_price"] = float(room["base_price"])
                    available_rooms.append(room)
            
            # 调试输出
            print(f"=== 查询房间 ===")
            print(f"入住日期: {checkin_date}, 退房日期: {checkout_date}")
            print(f"房型筛选: {room_type if room_type else '无'}")
            print(f"入住占用的房间: {occupied_by_checkin}")
            print(f"预订占用的房间: {occupied_by_reservation}")
            print(f"可用房间: {[r['room_id'] for r in available_rooms]}")
            
        return jsonify({"code": 200, "message": "查询成功", "data": available_rooms})
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        conn.close()

@app.route("/api/rooms/calendar/<int:room_id>", methods=["GET"])
@login_required
def get_room_calendar(room_id):
    """获取单个房间的30天日历占用情况"""
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 获取房间信息
            cursor.execute("""
                SELECT r.*, rt.type_name, rt.base_price 
                FROM room r 
                LEFT JOIN room_type rt ON r.type_id = rt.type_id 
                WHERE r.room_id = %s
            """, (room_id,))
            room = cursor.fetchone()
            
            if not room:
                return jsonify({"code": 404, "message": "房间不存在"}), 404
            
            # 获取未来30天的占用情况
            from datetime import datetime, timedelta
            today = datetime.now().date()
            dates = [(today + timedelta(days=i)).isoformat() for i in range(30)]
            
            # 查询入住记录
            cursor.execute("""
                SELECT actual_checkin, actual_checkout, status 
                FROM checkin 
                WHERE room_id = %s 
                AND status = '入住中'
            """, (room_id,))
            checkins = cursor.fetchall()
            
            # 查询预订记录
            cursor.execute("""
                SELECT expected_checkin, expected_checkout, status 
                FROM reservation 
                WHERE room_id = %s 
                AND status IN ('待确认', '已确认')
            """, (room_id,))
            reservations = cursor.fetchall()
            
            # 标记每天的占用状态
            calendar = []
            for date_str in dates:
                date = datetime.fromisoformat(date_str).date()
                status = "available"  # 可用
                reason = None
                
                for c in checkins:
                    if c["actual_checkin"].date() <= date <= (c["actual_checkout"].date() if c["actual_checkout"] else date):
                        status = "occupied"
                        reason = "已入住"
                        break
                
                if status == "available":
                    for r in reservations:
                        if r["expected_checkin"] <= date <= r["expected_checkout"]:
                            status = "booked"
                            reason = f"已预订 ({r['status']})"
                            break
                
                calendar.append({
                    "date": date_str,
                    "status": status,
                    "reason": reason
                })
            
            room["calendar"] = calendar
            
        return jsonify({"code": 200, "message": "获取日历成功", "data": room})
    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/reservations/advanced", methods=["POST"])
@login_required
def create_advanced_reservation():
    """高级预订 - 支持选择具体房间"""
    data = request.get_json(silent=True) or {}
    
    customer_id_card = data.get("customer_id_card")
    expected_checkin = data.get("expected_checkin")
    expected_checkout = data.get("expected_checkout")
    room_id = data.get("room_id")  # 可选，不选则自动分配
    room_type = data.get("room_type")
    guest_count = data.get("guest_count", 1)
    
    if not customer_id_card or not expected_checkin or not expected_checkout:
        return jsonify({"code": 400, "message": "客户、入住/退房日期不能为空"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # 如果指定了房间，检查该房间在时间段内是否可用
            if room_id:
                cursor.execute("""
                    SELECT COUNT(*) as count FROM reservation 
                    WHERE room_id = %s 
                    AND status IN ('待确认', '已确认')
                    AND expected_checkin < %s 
                    AND expected_checkout > %s
                """, (room_id, expected_checkout, expected_checkin))
                conflict = cursor.fetchone()
                if conflict["count"] > 0:
                    return jsonify({"code": 409, "message": "该房间在所选时间段已被预订"}), 409
            
            # 创建预订
            cursor.execute("""
                INSERT INTO reservation 
                (customer_id_card, expected_checkin, expected_checkout, room_id, room_type, guest_count, status)
                VALUES (%s, %s, %s, %s, %s, %s, '待确认')
            """, (customer_id_card, expected_checkin, expected_checkout, room_id, room_type, guest_count))
            
            conn.commit()
            
        return jsonify({"code": 200, "message": "预订成功"})
    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        conn.close()
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
