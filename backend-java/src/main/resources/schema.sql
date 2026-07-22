CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_info (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    print_name VARCHAR(200),
    address TEXT,
    delivery_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    mobile_no VARCHAR(30),
    email VARCHAR(150),
    website VARCHAR(200),
    contact_person VARCHAR(150),
    pan_it_no VARCHAR(50),
    gstin VARCHAR(50),
    gst_state VARCHAR(100),
    company_logo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(200) NOT NULL,
    print_name VARCHAR(200),
    customer_group VARCHAR(100),
    customer_type VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Active',
    address TEXT,
    delivery_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(30),
    mobile VARCHAR(30),
    email VARCHAR(150),
    gst_type VARCHAR(100),
    gstin VARCHAR(50),
    pan_no VARCHAR(30),
    payment_terms VARCHAR(100),
    credit_limit NUMERIC(14,2),
    credit_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id BIGSERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    print_name VARCHAR(200),
    supplier_group VARCHAR(100),
    supplier_type VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Active',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(30),
    mobile VARCHAR(30),
    email VARCHAR(150),
    gst_type VARCHAR(100),
    gstin VARCHAR(50),
    pan_no VARCHAR(30),
    payment_terms VARCHAR(100),
    credit_days INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id BIGSERIAL PRIMARY KEY,
    item_type VARCHAR(50) DEFAULT 'Purchasable Item',
    item_code VARCHAR(50) NOT NULL UNIQUE,
    item_name VARCHAR(200) NOT NULL,
    print_name VARCHAR(200),
    item_group VARCHAR(100),
    uom VARCHAR(50),
    hsn_code VARCHAR(50),
    rack VARCHAR(100),
    bin VARCHAR(100),
    purchase_rate NUMERIC(14,2),
    sales_rate NUMERIC(14,2),
    gst_percent NUMERIC(10,2),
    status VARCHAR(30) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp_process_documents (
    id BIGSERIAL PRIMARY KEY,
    process_type VARCHAR(50) NOT NULL,
    document_no VARCHAR(100) NOT NULL,
    document_date DATE DEFAULT CURRENT_DATE,
    reference_no VARCHAR(100),
    reference_date DATE,
    customer_id BIGINT,
    supplier_id BIGINT,
    order_number VARCHAR(100),
    order_type VARCHAR(100),
    department VARCHAR(100),
    status VARCHAR(50),
    approval_status VARCHAR(50),
    remarks TEXT,
    extra_data TEXT,
    items TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(process_type, document_no)
);

CREATE TABLE IF NOT EXISTS purchase_inward (
    id BIGSERIAL PRIMARY KEY,
    inward_type VARCHAR(30) DEFAULT 'PO Inward',
    inward_no VARCHAR(50) NOT NULL UNIQUE,
    inward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id BIGINT REFERENCES suppliers(id),
    invoice_no VARCHAR(100),
    invoice_date DATE,
    po_no VARCHAR(100),
    vehicle_no VARCHAR(50),
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'Received',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_inward_items (
    id BIGSERIAL PRIMARY KEY,
    inward_id BIGINT NOT NULL REFERENCES purchase_inward(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id),
    qty NUMERIC(14,2) DEFAULT 0,
    accepted_qty NUMERIC(14,2) DEFAULT 0,
    rejected_qty NUMERIC(14,2) DEFAULT 0,
    rate NUMERIC(14,2) DEFAULT 0,
    amount NUMERIC(14,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inward_inspections (
    id BIGSERIAL PRIMARY KEY,
    inspection_no VARCHAR(50) NOT NULL UNIQUE,
    inspection_date DATE DEFAULT CURRENT_DATE,
    inward_type VARCHAR(50),
    inward_id BIGINT,
    inward_no VARCHAR(100),
    supplier_id BIGINT,
    company_name VARCHAR(200),
    status VARCHAR(50),
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS inward_inspection_items (
    id BIGSERIAL PRIMARY KEY,
    inspection_id BIGINT REFERENCES inward_inspections(id),
    item_id BIGINT REFERENCES items(id),
    received_qty NUMERIC(14,2) DEFAULT 0,
    accepted_qty NUMERIC(14,2) DEFAULT 0,
    rejected_qty NUMERIC(14,2) DEFAULT 0,
    hold_qty NUMERIC(14,2) DEFAULT 0,
    idle_stock_qty NUMERIC(14,2) DEFAULT 0,
    rejection_reason TEXT,
    location VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id BIGSERIAL PRIMARY KEY,
    entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    item_id BIGINT NOT NULL REFERENCES items(id),
    ref_type VARCHAR(50) NOT NULL,
    ref_id BIGINT,
    inward_qty NUMERIC(14,2) DEFAULT 0,
    outward_qty NUMERIC(14,2) DEFAULT 0,
    balance_qty NUMERIC(14,2) DEFAULT 0,
    stock_status VARCHAR(50),
    location VARCHAR(200),
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS sales_dc (
    id BIGSERIAL PRIMARY KEY,
    dc_no VARCHAR(50) NOT NULL UNIQUE,
    dc_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    po_number VARCHAR(100),
    reference_no VARCHAR(100),
    vehicle_no VARCHAR(50),
    mode_of_transport VARCHAR(50),
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_dc_items (
    id BIGSERIAL PRIMARY KEY,
    sales_dc_id BIGINT NOT NULL REFERENCES sales_dc(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id),
    qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    returned_qty NUMERIC(14,2) DEFAULT 0,
    pending_qty NUMERIC(14,2) DEFAULT 0,
    hsn_code VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS sale_invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    sales_dc_id BIGINT REFERENCES sales_dc(id),
    subtotal NUMERIC(14,2) DEFAULT 0,
    gst_amount NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Posted',
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS tax_invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    sales_dc_id BIGINT REFERENCES sales_dc(id),
    subtotal NUMERIC(14,2) DEFAULT 0,
    gst_amount NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Posted',
    remarks TEXT
);
