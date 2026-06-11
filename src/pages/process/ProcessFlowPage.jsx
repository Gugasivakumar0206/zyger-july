import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Beaker,
  CheckCircle2,
  Database,
  Factory,
  FileText,
  GitBranch,
  Package,
  ShoppingCart,
  Target,
} from 'lucide-react'
import { PageContainer, SectionCard } from '../../components/ui'

const flowStages = [
  {
    no: '01',
    title: 'CRM Demand Capture',
    department: 'Sales / CRM',
    tone: 'blue',
    icon: Target,
    steps: [
      { label: 'Lead', path: '/crm/leads' },
      { label: 'Enquiry', path: '/crm/enquiries' },
      { label: 'Quotation / Proposal', path: '/crm/quotations' },
      { label: 'Sales Order', path: '/process/so' },
    ],
    output: 'Approved demand with customer, item, quantity, target date and commercial reference.',
  },
  {
    no: '02',
    title: 'Engineering BOM Mapping',
    department: 'Engineering / Planning',
    tone: 'amber',
    icon: GitBranch,
    steps: [
      { label: 'Product Item', path: '/master/product-items' },
      { label: 'BOM FG/RM Mapping', path: '/process/bom' },
      { label: 'BOM Cycle Diagram', path: '/process/bom/new' },
      { label: 'Routesheet', path: '/process/routesheet' },
    ],
    output: 'Finished good is mapped with raw materials, components, quantity, process route and documents.',
  },
  {
    no: '03',
    title: 'MRP and Shortage Decision',
    department: 'Planning',
    tone: 'violet',
    icon: Database,
    steps: [
      { label: 'Run MRP Against SO', path: '/process/so' },
      { label: 'Stock Check', path: '/reports/inventory' },
      { label: 'Shortage Analysis', path: '/process/mrp' },
      { label: 'Auto PR if Shortage', path: '/process/pr' },
    ],
    output: 'System calculates required qty, available qty, shortage qty and purchase requirement.',
  },
  {
    no: '04',
    title: 'Purchase Procurement',
    department: 'Purchase',
    tone: 'red',
    icon: ShoppingCart,
    steps: [
      { label: 'Purchase Request', path: '/process/pr' },
      { label: 'Approval', path: '/process/pr' },
      { label: 'Purchase Order', path: '/process/po' },
      { label: 'PO Schedule', path: '/process/po/schedule' },
    ],
    output: 'Approved PR is converted to PO with supplier, tax, delivery schedule and approval status.',
  },
  {
    no: '05',
    title: 'Stores Inward and Quality',
    department: 'Stores / Quality',
    tone: 'teal',
    icon: Beaker,
    steps: [
      { label: 'Material Inward', path: '/inventory/inward-process' },
      { label: 'Inward Inspection', path: '/quality/inward-inspection' },
      { label: 'Accepted Stock', path: '/reports/inventory' },
      { label: 'Rejected Qty / Return', path: '/inventory/return/po-dc' },
    ],
    output: 'Accepted quantity updates stock. Rejected quantity is tracked separately with reason and return flow.',
  },
  {
    no: '06',
    title: 'Production Execution',
    department: 'Production',
    tone: 'green',
    icon: Factory,
    steps: [
      { label: 'Work Order', path: '/process/wo' },
      { label: 'Raw Material Issue', path: '/process/raw-material-issue' },
      { label: 'Production Entry', path: '/process/production' },
      { label: 'FG Stock', path: '/process/fg-stock' },
    ],
    output: 'WO consumes RM/WIP, records process output and posts accepted FG stock.',
  },
  {
    no: '07',
    title: 'Dispatch, Invoice and Accounts',
    department: 'Sales / Accounts',
    tone: 'slate',
    icon: FileText,
    steps: [
      { label: 'Sales DC', path: '/sales/dc' },
      { label: 'Sale Invoice', path: '/invoice/sale' },
      { label: 'Tax Invoice', path: '/invoice/tax' },
      { label: 'Reports / Accounts', path: '/reports' },
    ],
    output: 'FG dispatch and invoice close the commercial flow with stock, tax and report visibility.',
  },
]

const decisionRules = [
  {
    title: 'MRP Stock Decision',
    yes: 'Available stock is reserved for WO / production.',
    no: 'Shortage automatically creates Purchase Request for Purchase team.',
  },
  {
    title: 'Inward Inspection Decision',
    yes: 'Accepted quantity is posted to usable stock location.',
    no: 'Rejected quantity stays in rejection/return flow with reason and supplier reference.',
  },
]

const controls = [
  'Every business document uses auto-generated numbers from the backend.',
  'Every module writes to its own DB table/process document and keeps source references.',
  'SO can run MRP and generate WO. BOM/MRP can also generate WO.',
  'Stock is updated only after inward inspection or accepted production output.',
  'Purchase department gets notification when MRP shortage creates PR.',
  'Reports must fetch from saved DB records, not hardcoded screen-only data.',
]

const tones = {
  blue: { bg: '#dbeafe', fg: '#075a9f', border: '#2563eb' },
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
        minWidth: '158px',
        borderRadius: '13px',
        border: `1px solid ${color.border}33`,
        background: '#fff',
        color: color.fg,
        padding: '12px 13px',
        textAlign: 'center',
        textDecoration: 'none',
        fontSize: '12px',
        fontWeight: 900,
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.07)',
      }}
    >
      {step.label}
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

export default function ProcessFlowPage() {
  return (
    <PageContainer
      title="Professional ERP Process Flow"
      subtitle="Correct end-to-end sequence: CRM -> SO -> BOM/MRP -> PR/PO/Inward -> WO/Production -> FG/DC/Invoice"
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
            <div style={{ fontSize: '21px', fontWeight: 950, color: '#0f172a' }}>ERP flow is source-linked, stock-aware and inspection-controlled</div>
            <div style={{ fontSize: '13px', fontWeight: 750, color: '#475569', marginTop: '5px' }}>
              Each stage below opens the actual ERP screen. Follow the sequence left to right for proper transaction control.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '18px' }}>
        {flowStages.map(stage => <StageCard key={stage.no} stage={stage} />)}
      </div>

      <SectionCard title="Decision Points" icon={CheckCircle2}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
          {decisionRules.map(rule => (
            <div key={rule.title} style={{ borderRadius: '16px', border: '1px solid #dbeafe', background: '#fff', padding: '15px', boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)' }}>
              <div style={{ fontSize: '14px', fontWeight: 950, color: '#075a9f', marginBottom: '10px' }}>{rule.title}</div>
              <div style={{ display: 'grid', gap: '9px', fontSize: '12px', fontWeight: 800, lineHeight: 1.45 }}>
                <div style={{ borderRadius: '11px', background: '#dcfce7', color: '#166534', padding: '10px' }}><b>YES:</b> {rule.yes}</div>
                <div style={{ borderRadius: '11px', background: '#fee2e2', color: '#991b1b', padding: '10px' }}><b>NO:</b> {rule.no}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Professional Control Checklist" icon={Package}>
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
