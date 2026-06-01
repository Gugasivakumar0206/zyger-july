import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Filter, ListChecks } from 'lucide-react'
import DataTable from '../../components/tables/DataTable'
import { PageContainer, StatusBadge } from '../../components/ui'
import { deleteCrmRecord, getCrmRecords } from '../../lib/api'
import { CRM_ENTITIES } from './crmConfig'

export default function CrmListPage({ entity }) {
  const config = CRM_ENTITIES[entity]
  const [records, setRecords] = useState([])
  const [filters, setFilters] = useState({ status: '', stage: '', dateFrom: '', dateTo: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRecords() {
      try {
        setError('')
        setLoading(true)
        setRecords(await getCrmRecords(entity))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadRecords()
  }, [entity])

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete this ${config.singular.toLowerCase()}?`)) return
    await deleteCrmRecord(entity, row.id)
    setRecords(records.filter(record => record.id !== row.id))
  }

  const columns = config.columns.map(column => (
    column.key === 'status'
      ? { ...column, render: value => <StatusBadge status={value || 'Open'} /> }
      : column
  ))

  const statusOptions = useMemo(() => {
    const configured = config.fields.find(field => field.name === 'status')?.options || []
    const fromRecords = records.map(record => record.status).filter(Boolean)
    return [...new Set([...configured, ...fromRecords])]
  }, [config.fields, records])

  const stageOptions = useMemo(() => {
    const configured = config.fields.find(field => field.name === 'stage')?.options || []
    const fromRecords = records.map(record => record.stage).filter(Boolean)
    return [...new Set([...configured, ...fromRecords])]
  }, [config.fields, records])

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (filters.status && record.status !== filters.status) return false
      if (filters.stage && record.stage !== filters.stage) return false
      const recordDate = record[config.dateField]?.slice?.(0, 10)
      if (filters.dateFrom && recordDate && recordDate < filters.dateFrom) return false
      if (filters.dateTo && recordDate && recordDate > filters.dateTo) return false
      return true
    })
  }, [config.dateField, filters, records])

  return (
    <PageContainer
      title={config.title}
      subtitle={`CRM -> ${config.singular} list`}
      showBackButton
      backPath="/crm/dashboard"
    >
      <div className="card p-0 overflow-hidden mb-4" style={{ border: '1px solid #d7e8ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ListChecks size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', fontFamily: 'Sora, sans-serif' }}>{config.title}</div>
            <div style={{ fontSize: '12px', color: '#dbeafe', fontWeight: '600', marginTop: '2px' }}>{config.subtitle}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#0f4c81' }}>Total Records</div>
            <div className="text-2xl font-extrabold mt-1" style={{ color: '#0f5cab' }}>{filteredRecords.length}</div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-white p-3">
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#0f4c81' }}>Module</div>
            <div className="text-sm font-bold text-slate-700 mt-2">{config.singular}</div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-white p-3">
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#0f4c81' }}>Flow</div>
            <div className="text-sm font-bold text-slate-700 mt-2">Create, edit, delete and report</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-3 mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      <div className="card p-4 mb-4" style={{ border: '1px solid #d7e8ff' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={15} className="text-primary-600" />
          <div className="text-sm font-bold text-slate-800">Filter {config.singular} Records</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="form-select" value={filters.status} onChange={e => setFilters(current => ({ ...current, status: e.target.value }))}>
            <option value="">All Status</option>
            {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          <select className="form-select" value={filters.stage} onChange={e => setFilters(current => ({ ...current, stage: e.target.value }))} disabled={!stageOptions.length}>
            <option value="">All Stage</option>
            {stageOptions.map(stage => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          <input className="form-input" type="date" value={filters.dateFrom} onChange={e => setFilters(current => ({ ...current, dateFrom: e.target.value }))} />
          <input className="form-input" type="date" value={filters.dateTo} onChange={e => setFilters(current => ({ ...current, dateTo: e.target.value }))} />
        </div>
        <button className="btn-secondary mt-3" onClick={() => setFilters({ status: '', stage: '', dateFrom: '', dateTo: '' })}>
          Clear Filters
        </button>
      </div>
      {loading ? (
        <div className="card p-8 text-center text-slate-400">Loading {config.title.toLowerCase()}...</div>
      ) : (
        <DataTable
          title={config.title}
          columns={columns}
          data={filteredRecords}
          addPath={`/crm/${entity}/new`}
          addLabel={`New ${config.singular}`}
          rowPath={`/crm/${entity}`}
          onDelete={handleDelete}
        />
      )}
    </PageContainer>
  )
}
