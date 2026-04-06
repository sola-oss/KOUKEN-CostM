-- Add factory field to sales_orders and orders tables
-- Values: 'laser' (レーザー工場) | 'factory1' (1工場) | 'factory2' (2工場) | 'machine' (機械加工場) | NULL

ALTER TABLE sales_orders ADD COLUMN factory TEXT;
