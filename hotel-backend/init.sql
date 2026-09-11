-- 酒店管理系统数据库初始化脚本
-- 运行方式: mysql -u root -p < init.sql

-- 创建数据库
CREATE DATABASE IF NOT EXISTS hotel_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_system;

-- 用户表
CREATE TABLE IF NOT EXISTS user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('ADMIN', 'MANAGER', 'STAFF', 'CHECKIN', 'USER') DEFAULT 'USER',
    status TINYINT DEFAULT 1 COMMENT '1:启用 0:禁用',
    deleted TINYINT DEFAULT 0 COMMENT '0:未删除 1:已删除',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 客户信息表
CREATE TABLE IF NOT EXISTS customer (
    id_card VARCHAR(18) PRIMARY KEY COMMENT '身份证号',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    address VARCHAR(200) COMMENT '地址',
    phone VARCHAR(20) COMMENT '联系电话',
    member_level VARCHAR(20) DEFAULT '普通会员' COMMENT '会员等级：普通会员/银卡会员/金卡会员',
    total_spent DECIMAL(10,2) DEFAULT 0 COMMENT '累计消费金额',
    member_points INT DEFAULT 0 COMMENT '会员积分',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
);

-- 客房类型表
CREATE TABLE IF NOT EXISTS room_type (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE COMMENT '类型名称',
    base_price DECIMAL(10,2) NOT NULL COMMENT '标准价格',
    overtime_rule TEXT COMMENT '超时计费规则',
    facilities TEXT COMMENT '设施配置描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 客房信息表
CREATE TABLE IF NOT EXISTS room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL COMMENT '房间号',
    type_id INT COMMENT '客房类型ID',
    floor VARCHAR(10) COMMENT '楼层',
    description TEXT COMMENT '房间描述',
    room_status ENUM('空闲', '已入住', '维修中') DEFAULT '空闲' COMMENT '房间状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES room_type(type_id) ON DELETE RESTRICT
);

-- 预订信息表
CREATE TABLE IF NOT EXISTS reservation (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id_card VARCHAR(18) NOT NULL,
    expected_checkin DATE NOT NULL COMMENT '预计入住时间',
    expected_checkout DATE NOT NULL COMMENT '预计离开时间',
    room_type VARCHAR(50) COMMENT '需求的房间类型',
    guest_count INT DEFAULT 1 COMMENT '入住人数',
    status VARCHAR(20) DEFAULT '待确认' COMMENT '预订状态：待确认/已确认/已取消/已入住',
    reservation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '预订时间',
    FOREIGN KEY (customer_id_card) REFERENCES customer(id_card) ON DELETE CASCADE
);

-- 入住信息表
CREATE TABLE IF NOT EXISTS checkin (
    checkin_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id_card VARCHAR(18) NOT NULL,
    room_id INT NOT NULL,
    actual_checkin TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '实际入住时间',
    actual_checkout TIMESTAMP NULL COMMENT '实际离开时间',
    status VARCHAR(20) DEFAULT '入住中' COMMENT '入住状态：入住中/已退房',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id_card) REFERENCES customer(id_card) ON DELETE RESTRICT,
    FOREIGN KEY (room_id) REFERENCES room(room_id) ON DELETE RESTRICT
);

-- 结算信息表
CREATE TABLE IF NOT EXISTS settlement (
    settlement_id INT AUTO_INCREMENT PRIMARY KEY,
    checkin_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总费用',
    discount_amount DECIMAL(10,2) DEFAULT 0 COMMENT '优惠金额',
    paid_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
    payment_method VARCHAR(20) COMMENT '支付方式：现金/银行卡/微信/支付宝',
    settlement_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '结算时间',
    FOREIGN KEY (checkin_id) REFERENCES checkin(checkin_id) ON DELETE RESTRICT
);
ALTER TABLE reservation ADD COLUMN room_id INT AFTER room_type;
ALTER TABLE checkin ADD COLUMN expected_checkin DATE AFTER customer_id_card;
ALTER TABLE checkin ADD COLUMN expected_checkout DATE AFTER expected_checkin;
INSERT INTO user (username, password, phone, role, status)
VALUES ('admin', 'admin123user', '13800138000', 'ADMIN', 1);
-- 插入默认管理员账号 (用户名: admin, 密码: 123456)
INSERT INTO `user` (username, password, phone, role, status) 
VALUES ('zhangsan', '123456', '13912345678', 'USER', 1);

-- 插入示例客房类型
INSERT INTO room_type (type_name, base_price, overtime_rule, facilities) VALUES
('单人间', 188.00, '超时每小时加收20元', '单人床、空调、电视、WiFi、独立卫浴'),
('双人间', 288.00, '超时每小时加收30元', '双人床、空调、电视、WiFi、独立卫浴'),
('豪华套房', 588.00, '超时每小时加收50元', '大床、空调、电视、WiFi、独立卫浴、客厅、迷你吧'),
('家庭房', 388.00, '超时每小时加收35元', '双人床+单人床、空调、电视、WiFi、独立卫浴');

-- 插入示例客房
INSERT INTO room (room_id, type_id, room_status, floor, description) VALUES
('101', 1, '空闲', 1, '一楼单人间'),
('102', 1, '空闲', 1, '一楼单人间'),
('201', 2, '空闲', 2, '二楼双人间'),
('202', 2, '空闲', 2, '二楼双人间'),
('301', 3, '空闲', 3, '三楼豪华套房'),
('401', 4, '空闲', 4, '四楼家庭房');

-- 插入示例客户
INSERT INTO customer (id_card, name, address, phone, member_level, total_spent, member_points) VALUES 
('11010119900307663X', '张三', '北京市朝阳区', '13812345678', '普通会员', 0, 0),
('110101199512121234', '李四', '上海市浦东新区', '13987654321', '银卡会员', 3000, 3500),
('110101198801015678', '王五', '广州市天河区', '13712345678', '金卡会员', 15000, 18000);

SELECT '数据库初始化完成!' AS message;
SELECT '默认管理员账号: admin / 123456' AS message;
