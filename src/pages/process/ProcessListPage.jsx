import { useEffect, useMemo, useState } from 'react'
import { Bell, Filter, ListChecks } from 'lucide-react'
import DataTable from '../../components/tables/DataTable'
import { PageContainer, StatusBadge } from '../../components/ui'
import { getProcessDocuments, getPurchaseNotifications } from '../../lib/api'
import { PROCESS_CONFIG, PROCESS_STATUS } from './processConfig'

export default function ProcessListPage({ processType, viewMode = 'list' }) {
  const config = PROCESS_CONFIG[processType]
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getProcessDocuments(processType, search)
        setRecords(result || [])
      } catch (err) {
        setError(err.message || `Unable to load ${config.title}.`)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [config.title, processType, search])

  useEffect(() => {
    if (processType !== 'pr') return
    getPurchaseNotifications()
      .then(result => setNotifications(result || []))
      .catch(() => setNotifications([]))
  }, [processType])

  const rows = useMemo(() => (
    records
      .filter(row => !status || row.status === status)
      .map(row => {
        const extra = row.extra_data || {}
        const items = row.items || []
        const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
        return {
        id: row.id,
        documentNo: row.document_no,
        poNumber: row.document_no,
        prqNo: extra.prNumbers?.join(', ') || row.order_number || '-',
        documentDate: row.document_date,
        poDate: row.document_date,
        woOrder: extra.woOrder || row.reference_no || '-',
        vendor: row.supplier_name || '-',
        inward: extra.inwardNo || '-',
        poType: extra.poType || row.order_type || 'Regular',
        totalQty,
        createdBy: row.initiated_by || 'admin@myvyog.com',
        currentApprover: extra.currentApprover || '-',
        referenceNo: row.reference_no || row.order_number || '-',
        customer: row.customer_name || row.supplier_name || '-',
        orderType: row.order_type || '-',
        itemCount: row.item_count || 0,
        status: row.status || 'Open',
        approvalStatus: row.approval_status || 'Pending',
        }
      })
  ), [records, status])

  const defaultColumns = [
    { key: 'documentNo', label: config.numberLabel, width: 150 },
    { key: 'documentDate', label: 'Date', width: 120 },
    { key: 'referenceNo', label: 'Reference / Order No', width: 160 },
    { key: 'customer', label: 'Customer / Supplier' },
    { key: 'orderType', label: 'Order Type', width: 130 },
    { key: 'itemCount', label: 'Items', width: 90 },
    { key: 'status', label: 'Status', width: 110, render: value => <StatusBadge status={value} /> },
    { key: 'approvalStatus', label: 'Approval', width: 120, render: value => <StatusBadge status={value} /> },
  ]
  const prColumns = [
    { key: 'documentNo', label: config.numberLabel, width: 150 },
    { key: 'documentDate', label: 'Date', width: 120 },
    { key: 'referenceNo', label: 'Reference / MRP No', width: 170 },
    { key: 'itemCount', label: 'Items', width: 90 },
    { key: 'status', label: 'Status', width: 110, render: value => <StatusBadge status={value} /> },
  ]
  const poColumns = [
    { key: 'poNumber', label: 'PO Number', width: 120 },
    { key: 'prqNo', label: 'PRQ No', width: 130 },
    { key: 'poDate', label: 'PO Date', width: 110 },
    { key: 'woOrder', label: 'WO Order', width: 130 },
    { key: 'vendor', label: 'Vendor', width: 190 },
    { key: 'inward', label: 'Inward', width: 110 },
    { key: 'poType', label: 'PO Type', width: 110 },
    { key: 'totalQty', label: 'Total Qty', width: 110, render: value => Number(value || 0).toFixed(3) },
    { key: 'createdBy', label: 'Created By', width: 170 },
    { key: 'status', label: 'Status', width: 150, render: value => <StatusBadge status={value} /> },
    { key: 'currentApprover', label: 'Current Approver', width: 150 },
    { key: 'approvalStatus', label: 'Approval Status', width: 150, render: value => <StatusBadge status={value} /> },
  ]
  const columns = processType === 'po' ? poColumns : processType === 'pr' ? prColumns : defaultColumns

  return (
    <PageContainer title={viewMode === 'schedule' ? 'PO Schedule' : `${config.title} List`} subtitle={config.subtitle} showBackButton backPath="/dashboard">
      <div className="card p-0 overflow-hidden mb-4" style={{ border: '1px solid #d7e8ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ListChecks size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', fontFamily: 'Sora, sans-serif' }}>{viewMode === 'schedule' ? 'PO Schedule' : `${config.title} List`}</div>
            <div style={{ fontSize: '12px', color: '#dbeafe', fontWeight: '600', marginTop: '2px' }}>DB linked search, create, edit and status tracking</div>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4" style={{ border: '1px solid #d7e8ff' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={15} className="text-primary-600" />
          <div className="text-sm font-bold text-slate-800">Database Search & Filter</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="form-input" value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${config.numberLabel}, reference, customer, supplier...`} />
          <select className="form-select" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">All Status</option>
            {PROCESS_STATUS.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <button className="btn-secondary" type="button" onClick={() => { setSearch(''); setStatus('') }}>Clear</button>
        </div>
      </div>

      {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
      {loading && <div className="card p-4 mb-4 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100">Loading {config.title}...</div>}
      {processType === 'pr' && notifications.length > 0 && (
        <div className="card p-4 mb-4 border border-amber-100 bg-amber-50">
          <div className="flex items-center gap-2 text-sm font-black text-amber-900 mb-3">
            <Bell size={15} /> Purchase Department Notifications
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notifications.slice(0, 4).map(note => (
              <div key={note.id} className="rounded-xl bg-white border border-amber-100 p-3">
                <div className="text-sm font-black text-slate-800">{note.title}</div>
                <div className="text-xs text-slate-600 mt-1">{note.message}</div>
                <div className="text-xs font-bold text-amber-700 mt-2">{note.ref_no} • {note.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        addPath={`/process/${processType}/new`}
        addLabel={processType === 'po' ? 'Create PO' : `Create ${config.title}`}
        rowPath={`/process/${processType}`}
      />
    </PageContainer>
  )
}
