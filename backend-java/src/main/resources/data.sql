INSERT INTO users(full_name, email, password_hash, role, is_active)
VALUES ('Demo Administrator', 'admin@zygerdemo.com', 'Demo@123', 'admin', TRUE);

INSERT INTO company_info(company_name, print_name, address, delivery_address, city, state, pincode, mobile_no, email, website, contact_person, pan_it_no, gstin, gst_state)
VALUES ('Zyger Precision Industries LLP', 'Zyger Precision Industries LLP', '52, Peelamedu Industrial Estate', '52, Peelamedu Industrial Estate, Coimbatore', 'Coimbatore', 'Tamil Nadu', '641004', '+91 98765 43210', 'accounts@zygerprecision.in', 'https://zygertechnology.in', 'Demo Admin', 'ABCDE1234F', '33ABCDE1234F1Z5', 'Tamil Nadu');

INSERT INTO customers(customer_code, customer_name, print_name, customer_group, customer_type, address, delivery_address, city, state, pincode, mobile, email, gstin, pan_no, payment_terms, credit_limit, credit_days)
VALUES ('CUS-DEMO-001', 'Apex Engineering Private Limited', 'Apex Engineering', 'OEM', 'Manufacturing', '12 Industrial Estate, Ambattur', 'Plant 2, Chennai', 'Chennai', 'Tamil Nadu', '600058', '9876543210', 'purchase@apex-demo.com', '33ABCDE1234F1Z5', 'ABCDE1234F', '30 Days', 500000, 30);

INSERT INTO suppliers(supplier_code, supplier_name, print_name, supplier_group, supplier_type, address, city, state, pincode, mobile, email, gstin, pan_no, payment_terms, credit_days)
VALUES ('SUP-DEMO-001', 'Prime Metals and Components', 'Prime Metals', 'Raw Material', 'Manufacturer', 'SIDCO Industrial Estate', 'Coimbatore', 'Tamil Nadu', '641021', '9876501234', 'sales@primemetals-demo.com', '33AACCP1234G1Z2', 'AACCP1234G', '30 Days', 30);

INSERT INTO items(item_type, item_code, item_name, print_name, item_group, uom, hsn_code, rack, bin, purchase_rate, sales_rate, gst_percent)
VALUES
('Manufacturing Item', 'FG-PANEL-001', 'Industrial Control Panel', 'Control Panel 100A', 'Finished Goods', 'NOS', '85371000', 'FG-RACK-01', 'FG-BIN-01', 0, 85000, 18),
('Purchasable Item', 'RM-SHEET-001', 'CRCA Sheet 2mm', 'CRCA Sheet', 'Raw Material', 'KG', '72091790', 'RM-RACK-01', 'RM-BIN-01', 82.50, 0, 18),
('Purchasable Item', 'RM-MCCB-001', 'MCCB 100A 4P', 'MCCB 100A', 'Electrical', 'NOS', '85362030', 'EL-RACK-01', 'EL-BIN-01', 6500, 0, 18);

INSERT INTO erp_process_documents(process_type, document_no, reference_no, customer_id, supplier_id, order_number, order_type, department, status, approval_status, remarks, extra_data, items)
VALUES
('crm-lead', 'LEAD-DEMO-001', 'WEBSITE', 1, NULL, NULL, 'Lead', 'CRM', 'Converted', 'Approved', 'Converted lead for control panels', '{}', '[]'),
('so', 'SO-DEMO-001', 'APEX/PO/2026/001', 1, NULL, 'SO-DEMO-001', 'Sales Order', 'Sales', 'Open', 'Approved', 'Customer order for five control panels', '{}', '[{"itemCode":"FG-PANEL-001","itemName":"Industrial Control Panel","quantity":"5","uom":"NOS"}]'),
('bom', 'BOM-DEMO-001', 'FG-PANEL-001', NULL, NULL, NULL, 'Manufacturing Item', 'Production', 'Active', 'Approved', 'BOM for Industrial Control Panel', '{}', '[{"itemCode":"RM-SHEET-001","quantity":"40","uom":"KG"},{"itemCode":"RM-MCCB-001","quantity":"2","uom":"NOS"}]'),
('mrp', 'MRP-DEMO-001', 'SO-DEMO-001', 1, NULL, 'SO-DEMO-001', 'Sales Order', 'Planning', 'Completed', 'Approved', 'MRP generated purchase shortage', '{}', '[{"itemCode":"RM-SHEET-001","required":"200","available":"250"},{"itemCode":"RM-MCCB-001","required":"10","available":"4","shortage":"6"}]'),
('pr', 'PRQ-DEMO-001', 'MRP-DEMO-001', NULL, NULL, 'SO-DEMO-001', 'Purchase Request', 'Purchase', 'Closed', '', 'PR generated from MRP shortage', '{}', '[{"itemCode":"RM-MCCB-001","quantity":"6","uom":"NOS"}]'),
('po', 'PO-DEMO-001', 'PRQ-DEMO-001', NULL, 1, 'PO-DEMO-001', 'Regular', 'Purchase', 'Open', 'Approved', 'PO created against PR', '{}', '[{"itemCode":"RM-MCCB-001","quantity":"6","uom":"NOS"}]'),
('wo', 'WO-DEMO-001', 'SO-DEMO-001', 1, NULL, 'SO-DEMO-001', 'Work Order', 'Production', 'Open', 'Approved', 'Work order for five panels', '{}', '[{"itemCode":"FG-PANEL-001","quantity":"5","uom":"NOS"}]');

INSERT INTO purchase_inward(inward_type, inward_no, inward_date, supplier_id, invoice_no, invoice_date, po_no, status, remarks)
VALUES ('PO Inward', 'INW-DEMO-001', CURRENT_DATE, 1, 'PM/INV/001', CURRENT_DATE, 'PO-DEMO-001', 'Received', 'Demo PO inward');

INSERT INTO purchase_inward_items(inward_id, item_id, qty, accepted_qty, rejected_qty, rate, amount)
VALUES (1, 3, 6, 5, 1, 6500, 39000);

INSERT INTO inward_inspections(inspection_no, inspection_date, inward_type, inward_id, inward_no, supplier_id, company_name, status, remarks)
VALUES ('INI-DEMO-001', CURRENT_DATE, 'PO Inward', 1, 'INW-DEMO-001', 1, 'Prime Metals and Components', 'Completed', 'One MCCB rejected due to terminal damage');

INSERT INTO inward_inspection_items(inspection_id, item_id, received_qty, accepted_qty, rejected_qty, hold_qty, idle_stock_qty, rejection_reason, location)
VALUES (1, 3, 6, 5, 1, 0, 0, 'Terminal damaged', 'Main Raw Material Store / EL-RACK-01 / EL-BIN-01');

INSERT INTO stock_ledger(item_id, ref_type, ref_id, inward_qty, outward_qty, balance_qty, stock_status, location, remarks)
VALUES
(2, 'OPENING', 1, 250, 0, 250, 'Accepted', 'RM-RACK-01 / RM-BIN-01', 'Opening stock'),
(3, 'OPENING', 1, 4, 0, 4, 'Accepted', 'EL-RACK-01 / EL-BIN-01', 'Opening stock'),
(3, 'QUALITY_ACCEPTED', 1, 5, 0, 9, 'Accepted', 'EL-RACK-01 / EL-BIN-01', 'Accepted from inspection'),
(3, 'QUALITY_REJECTED', 1, 0, 1, 1, 'Rejected', 'Rejected Store', 'Rejected from inspection'),
(1, 'FG_STOCK', 1, 2, 0, 2, 'Accepted', 'FG-RACK-01 / FG-BIN-01', 'Finished goods received');

INSERT INTO sales_dc(dc_no, dc_date, customer_id, po_number, reference_no, vehicle_no, mode_of_transport, remarks, status)
VALUES ('SDC-DEMO-001', CURRENT_DATE, 1, 'APEX/PO/2026/001', 'SO-DEMO-001', 'TN37AB1234', 'By Road', 'Sales DC from Java demo', 'Invoiced');

INSERT INTO sales_dc_items(sales_dc_id, item_id, qty, returned_qty, pending_qty, hsn_code)
VALUES (1, 1, 2, 0, 0, '85371000');

INSERT INTO sale_invoices(invoice_no, invoice_date, customer_id, sales_dc_id, subtotal, gst_amount, total_amount, status, remarks)
VALUES ('SINV-DEMO-001', CURRENT_DATE, 1, 1, 170000, 30600, 200600, 'Posted', 'Sale invoice generated from SDC-DEMO-001');

INSERT INTO tax_invoices(invoice_no, invoice_date, customer_id, sales_dc_id, subtotal, gst_amount, total_amount, status, remarks)
VALUES ('TAX-DEMO-001', CURRENT_DATE, 1, 1, 170000, 30600, 200600, 'Posted', 'Tax invoice with original and duplicate transporter copy');

