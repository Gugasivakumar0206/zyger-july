import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Beaker,
  CheckCircle2,
  ClipboardList,
  Database,
  Factory,
  FileText,
  GitBranch,
  Package,
  ShoppingCart,
  Target,
  Truck,
  Users,
} from 'lucide-react'
import { PageContainer, SectionCard } from '../../components/ui'

const sampleData = {
  customer: 'CUST-0001 / ABC Engineering',
  supplier: 'SUP-0001 / Bright Steel Traders',
  item: 'FG-1001 Control Panel',
  rawMaterial: 'RM-2201 MS Sheet',
  so: 'SO-0001',
  bom: 'BOM-0001',
  mrp: 'MRP-0001',
  pr: 'PRQ-0001',
  po: 'PO-0001',
  inward: 'POI-0001',
  inspection: 'INI-0001',
  wo: 'WO-0001',
  dc: 'SDC-0001',
  invoice: 'SIN-0001 / TAX-0001',
}

const flowStages = [
  {
    no: '01',
    title: 'Master Data Setup',
    department: 'Master',
    tone: 'blue',
    icon: Users,
    steps: [
      { label: 'Customer', value: sampleData.customer, path: '/master/customer/view' },
      { label: 'Supplier', value: sampleData.supplier, path: '/master/supplier/view' },
      { label: 'Store / Rack / Bin', value: 'STORE-01 / RACK-A / BIN-01', path: '/master/store' },
      { label: 'Items', value: `${sampleData.item} + ${sampleData.rawMaterial}`, path: '/inventory/items' },
    ],
    output: 'ERP starts with correct masters. Transactions fetch customer, supplier, item, store and tax data from here.',
  },
  {
    no: '02',
    title: 'CRM to Sales Order',
    department: 'CRM / Sales',
    tone: 'cyan',
    icon: Target,
    steps: [
      { label: 'Lead / Enquiry', value: 'LEAD-0001 -> ENQ-0001', path: '/crm/leads' },
      { label: 'Quotation', value: 'QUO-0001 Approved', path: '/crm/quotations' },
      { label: 'Customer Link', value: sampleData.customer, path: '/crm/leads' },
      { label: 'Sales Order', value: sampleData.so, path: '/process/so' },
    ],
    output: 'Approved CRM demand becomes a sales order with customer PO number/date and manufacturing item quantity.',
  },
  {
    no: '03',
    title: 'BOM and MRP Planning',
    department: 'Planning',
    tone: 'amber',
    icon: GitBranch,
    steps: [
      { label: 'BOM', value: `${sampleData.bom} for ${sampleData.item}`, path: '/process/bom' },
      { label: 'RM Mapping', value: `${sampleData.rawMaterial} x 5`, path: '/process/bom/new' },
      { label: 'MRP Run', value: sampleData.mrp, path: '/process/mrp' },
      { label: 'Stock Check', value: 'Available vs Required', path: '/reports/inventory' },
    ],
    output: 'MRP checks BOM material requirement against stock. Shortage raises PR; available stock can move to WO.',
  },
  {
    no: '04',
    title: 'Purchase Request to Purchase Order',
    department: 'Purchase',
    tone: 'red',
    icon: ShoppingCart,
    steps: [
      { label: 'Purchase Request', value: `${sampleData.pr} - Open`, path: '/process/pr' },
      { label: 'Purchase Order', value: sampleData.po, path: '/process/po' },
      { label: 'Supplier', value: sampleData.supplier, path: '/master/supplier/view' },
      { label: 'PR Status', value: 'Closed after PO', path: '/process/pr' },
    ],
    output: 'PR is created from shortage or manually. Once converted to PO, PR closes and PO waits for inward.',
  },
  {
    no: '05',
    title: 'Inward and Quality Inspection',
    department: 'Inventory / Quality',
    tone: 'teal',
    icon: Beaker,
    steps: [
      { label: 'PO Inward', value: sampleData.inward, path: '/inventory/inward/po' },
      { label: 'Location', value: 'STORE-01 / RACK-A / BIN-01', path: '/master/store' },
      { label: 'Inspection', value: sampleData.inspection, path: '/quality/inward-inspection' },
      { label: 'Accepted / Rejected / Hold', value: '95 / 3 / 2', path: '/reports/inventory' },
    ],
    output: 'Stock is posted only after quality inspection. Accepted stock becomes usable; rejected/hold/idle are tracked separately.',
  },
  {
    no: '06',
    title: 'Work Order and Production',
    department: 'Production',
    tone: 'green',
    icon: Factory,
    steps: [
      { label: 'Work Order', value: sampleData.wo, path: '/process/wo' },
      { label: 'RM Issue', value: sampleData.rawMaterial, path: '/process/raw-material-issue' },
      { label: 'Production Entry', value: 'Accepted output recorded', path: '/process/production' },
      { label: 'Stock Report', value: 'RM reduced / output tracked', path: '/reports/inventory' },
    ],
    output: 'WO consumes raw material and records production output. Production entries keep the manufacturing traceability.',
  },
  {
    no: '07',
    title: 'Dispatch and Invoice',
    department: 'Sales / Accounts',
    tone: 'slate',
    icon: FileText,
    steps: [
      { label: 'Sales DC', value: sampleData.dc, path: '/sales/dc' },
      { label: 'Stock Outward', value: 'Dispatch quantity reduced', path: '/reports/inventory' },
      { label: 'Sales Invoice', value: sampleData.invoice, path: '/invoice/sale' },
      { label: 'Print Format', value: 'DC / Tax / Sales Invoice', path: '/invoice/tax' },
    ],
    output: 'Sales DC reduces stock. Invoice is created against customer/DC and prints in the professional document format.',
  },
  {
    no: '08',
    title: 'Subcontractor Flow',
    department: 'Sub Contractor',
    tone: 'violet',
    icon: Truck,
    steps: [
      { label: 'Subcontractor Master', value: 'SUB-0001 / XYZ Machining', path: '/subcontractor' },
      { label: 'Subcontractor DC', value: 'SUBDC-0001', path: '/subcontractor/dc' },
      { label: 'Return / Inward', value: 'Reference based inward', path: '/inventory/inward/jo' },
      { label: 'Inspection', value: 'Quality result updates stock', path: '/quality/inward-inspection' },
    ],
    output: 'Material issued to subcontractor is tracked by DC and return/inward reference. Accepted return updates stock after inspection.',
  },
]

const decisionRules = [
  {
    title: 'MRP Decision',
    question: 'Required BOM material stock available?',
    yes: 'Create/continue Work Order and reserve available stock.',
    no: 'Raise Purchase Request and notify Purchase flow.',
  },
  {
    title: 'Quality Decision',
    question: 'Inward material accepted?',
    yes: 'Post accepted quantity into usable store stock.',
    no: 'Move to rejected/hold/idle tracking with reason and reference.',
  },
  {
    title: 'Dispatch Decision',
    question: 'Sales DC created?',
    yes: 'Reduce stock and allow Sales/Tax Invoice generation.',
    no: 'Invoice should wait until dispatch reference is ready.',
  },
]

const controls = [
  'Customer, supplier, item, store, rack and bin must be created before transactions.',
  'Sales Order loads manufacturing items only and drives demand.',
  'BOM maps FG item to required RM/components for MRP.',
  'MRP checks stock and can generate PR for shortage.',
  'PR closes automatically when converted to PO.',
  'PO inward does not become usable stock until inward inspection is completed.',
  'Accepted, rejected, hold and idle quantities are visible in stock reports.',
  'Sales DC reduces stock and invoice print is generated from saved DB data.',
]

const tones = {
  blue: { bg: '#dbeafe', fg: '#075a9f', border: '#2563eb' },
  cyan: { bg: '#cffafe', fg: '#0e7490', border: '#06b6d4' },
  amber: { bg: '#fef3c7', fg: '#92400e', border: '#d97706' },
  violet: { bg: '#ede9fe', fg: '#5b21b6', border: '#7c3aed' },
  red: { bg: '#fee2e2', fg: '#991b1b', border: '#dc2626' },
  teal: { bg: '#ccfbf1', fg: '#0f766e', border: '#14b8a6' },
  green: { bg: '#dcfce7', fg: '#166534', border: '#16a34a' },
  slate: { bg: '#e2e8f0', fg: '#334155', border: '#475569' },
}

function StageStep({ step, tone }) {
  const color = tones[tone] || tones.blue
  return (
    <Link
      to={step.path}
      style={{
        minWidth: '174px',
        borderRadius: '14px',
        border: `1px solid ${color.border}33`,
        background: '#fff',
        color: color.fg,
        padding: '12px 13px',
        textAlign: 'left',
        textDecoration: 'none',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.07)',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 950 }}>{step.label}</div>
      <div style={{ fontSize: '11px', color: '#475569', fontWeight: 800, marginTop: '5px', lineHeight: 1.35 }}>{step.value}</div>
    </Link>
  )
}

function StageCard({ stage }) {
  const Icon = stage.icon
  const color = tones[stage.tone] || tones.blue

  return (
    <div
      className="card p-0 overflow-hidden"
      style={{
        border: `1px solid ${color.border}33`,
        boxShadow: '0 18px 38px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '16px 18px', background: color.bg }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '16px', background: color.fg, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 950 }}>
          {stage.no}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: color.fg, fontSize: '16px', fontWeight: 950 }}>
            <Icon size={18} /> {stage.title}
          </div>
          <div style={{ color: '#475569', fontSize: '12px', fontWeight: 800, marginTop: '3px' }}>{stage.department}</div>
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', alignItems: 'center', paddingBottom: '10px' }}>
          {stage.steps.map((step, index) => (
            <div key={step.label} style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: '0 0 auto' }}>
              <StageStep step={step} tone={stage.tone} />
              {index < stage.steps.length - 1 && <ArrowRight size={18} color="#94a3b8" />}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '10px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 13px', color: '#334155', fontSize: '13px', fontWeight: 750, lineHeight: 1.45 }}>
          <b style={{ color: '#0f172a' }}>Output:</b> {stage.output}
        </div>
      </div>
    </div>
  )
}

function FlowImage() {
  const nodes = [
    ['Master', 'Customer / Supplier / Item / Store', 20, 72, '#075a9f'],
    ['CRM', 'Lead -> Quotation', 250, 72, '#0e7490'],
    ['Sales Order', 'SO-0001 demand', 480, 72, '#075a9f'],
    ['BOM + MRP', 'Material requirement', 710, 72, '#92400e'],
    ['PR + PO', 'Purchase shortage', 940, 72, '#991b1b'],
    ['Inward', 'POI-0001 location', 250, 238, '#0f766e'],
    ['Quality', 'Accepted / Rejected / Hold', 480, 238, '#0f766e'],
    ['Stock', 'Usable stock report', 710, 238, '#166534'],
    ['WO + Production', 'Consume RM / output', 480, 404, '#166534'],
    ['Sales DC', 'Dispatch outward', 710, 404, '#334155'],
    ['Invoice', 'Sales / Tax print', 940, 404, '#334155'],
  ]

  const arrows = [
    [198, 120, 248, 120],
    [428, 120, 478, 120],
    [658, 120, 708, 120],
    [888, 120, 938, 120],
    [1010, 154, 1010, 228, 330, 238],
    [428, 286, 478, 286],
    [658, 286, 708, 286],
    [592, 320, 592, 394],
    [658, 452, 708, 452],
    [888, 452, 938, 452],
  ]

  return (
    <div className="card p-4 mb-5" style={{ background: '#ffffff', border: '1px solid #bfdbfe' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px', color: '#075a9f', fontSize: '16px', fontWeight: 950 }}>
        <Database size={18} /> ERP Flowchart Image View
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width="1130" height="545" viewBox="0 0 1130 545" role="img" aria-label="ERP process flowchart">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
            </marker>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.14" />
            </filter>
          </defs>
          <rect x="0" y="0" width="1130" height="545" rx="24" fill="#eff6ff" />
          <rect x="14" y="16" width="1102" height="513" rx="20" fill="#ffffff" stroke="#bfdbfe" />
          <text x="34" y="45" fill="#0f172a" fontSize="22" fontWeight="900">Zyger ERP End-to-End Process</text>
          <text x="34" y="66" fill="#475569" fontSize="13" fontWeight="700">Sample flow: customer demand to stock, dispatch and invoice</text>

          {arrows.map((arrow, index) => {
            if (arrow.length === 6) {
              return <polyline key={index} points={`${arrow[0]},${arrow[1]} ${arrow[2]},${arrow[1]} ${arrow[2]},${arrow[3]} ${arrow[4]},${arrow[5]}`} fill="none" stroke="#64748b" strokeWidth="2.4" markerEnd="url(#arrow)" />
            }
            return <line key={index} x1={arrow[0]} y1={arrow[1]} x2={arrow[2]} y2={arrow[3]} stroke="#64748b" strokeWidth="2.4" markerEnd="url(#arrow)" />
          })}

          {nodes.map(([title, subtitle, x, y, color]) => (
            <g key={title} filter="url(#softShadow)">
              <rect x={x} y={y} width="178" height="96" rx="18" fill="#ffffff" stroke={color} strokeWidth="2" />
              <circle cx={x + 24} cy={y + 25} r="10" fill={color} />
              <text x={x + 44} y={y + 31} fill={color} fontSize="15" fontWeight="900">{title}</text>
              <text x={x + 18} y={y + 60} fill="#334155" fontSize="12" fontWeight="800">{subtitle}</text>
              <text x={x + 18} y={y + 78} fill="#64748b" fontSize="11" fontWeight="700">Click details below in ERP</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

export default function ProcessFlowPage() {
  return (
    <PageContainer
      title="ERP Flow"
      subtitle="How the ERP works from master setup to sales, purchase, stock, quality, production and invoice"
      showBackButton
      backPath="/dashboard"
    >
      <div
        className="card p-5 mb-5"
        style={{
          border: '1px solid #bfdbfe',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #ecfeff 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '18px', background: '#075a9f', color: '#fff', display: 'grid', placeItems: 'center' }}>
            <GitBranch size={25} />
          </div>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontSize: '21px', fontWeight: 950, color: '#0f172a' }}>ERP process is source-linked, stock-aware and inspection-controlled</div>
            <div style={{ fontSize: '13px', fontWeight: 750, color: '#475569', marginTop: '5px' }}>
              This page explains the application flow with sample data. Each box below opens the related ERP screen.
            </div>
          </div>
        </div>
      </div>

      <FlowImage />

      <div style={{ display: 'grid', gap: '18px' }}>
        {flowStages.map(stage => <StageCard key={stage.no} stage={stage} />)}
      </div>

      <SectionCard title="Decision Points" icon={CheckCircle2}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {decisionRules.map(rule => (
            <div key={rule.title} style={{ borderRadius: '16px', border: '1px solid #dbeafe', background: '#fff', padding: '15px', boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)' }}>
              <div style={{ fontSize: '14px', fontWeight: 950, color: '#075a9f', marginBottom: '7px' }}>{rule.title}</div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#334155', marginBottom: '10px' }}>{rule.question}</div>
              <div style={{ display: 'grid', gap: '9px', fontSize: '12px', fontWeight: 800, lineHeight: 1.45 }}>
                <div style={{ borderRadius: '11px', background: '#dcfce7', color: '#166534', padding: '10px' }}><b>YES:</b> {rule.yes}</div>
                <div style={{ borderRadius: '11px', background: '#fee2e2', color: '#991b1b', padding: '10px' }}><b>NO:</b> {rule.no}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Control Checklist" icon={ClipboardList}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {controls.map(item => (
            <div key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', padding: '13px' }}>
              <CheckCircle2 size={18} color="#16a34a" style={{ marginTop: '1px', flex: '0 0 auto' }} />
              <div style={{ color: '#334155', fontSize: '13px', fontWeight: 800, lineHeight: 1.45 }}>{item}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  )
}
