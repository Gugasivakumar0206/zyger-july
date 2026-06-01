import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Download, Filter, Printer } from 'lucide-react'
import { PageContainer, StatusBadge } from '../../components/ui'
import { getCrmRecords, getCrmSummary } from '../../lib/api'
import { CRM_ENTITIES, CRM_ENTITY_ORDER } from './crmConfig'

export default function CrmReportsPage() {
  const [summary, setSummary] = useState({})
  const [recentLeads, setRecentLeads] = useState([])
  const [recentQuotations, setRecentQuotations] = useState([])
  const [reportEntity, setReportEntity] = useState('leads')
  const [reportRows, setReportRows] = useState([])
  const [filters, setFilters] = useState({ status: '', stage: '', dateFrom: '', dateTo: '' })

  useEffect(() => {
    async function loadReport() {
      const result = await getCrmSummary()
      setSummary(result.summary || {})
      setRecentLeads(result.recent_leads || [])
      setRecentQuotations(result.recent_quotations || [])
    }

    loadReport()
  }, [])

  useEffect(() => {
    async function loadRows() {
      setReportRows(await getCrmRecords(reportEntity))
      setFilters({ status: '', stage: '', dateFrom: '', dateTo: '' })
    }

    loadRows()
  }, [reportEntity])

  const handlePrint = () => window.print()
  const config = CRM_ENTITIES[reportEntity]

  const statusOptions = useMemo(() => [...new Set(reportRows.map(row => row.status).filter(Boolean))], [reportRows])
  const stageOptions = useMemo(() => [...new Set(reportRows.map(row => row.stage).filter(Boolean))], [reportRows])

  const filteredRows = useMemo(() => {
    return reportRows.filter(row => {
      if (filters.status && row.status !== filters.status) return false
      if (filters.stage && row.stage !== filters.stage) return false
      const rowDate = row[config.dateField]?.slice?.(0, 10)
      if (filters.dateFrom && rowDate && rowDate < filters.dateFrom) return false
      if (filters.dateTo && rowDate && rowDate > filters.dateTo) return false
      return true
    })
  }, [config.dateField, filters, reportRows])

  return (
    <PageContainer
      title="CRM Reports"
      subtitle="Filter-wise CRM report with status, stage and date controls"
      showBackButton
      backPath="/crm/dashboard"
      actions={
        <button className="btn-primary" onClick={handlePrint}>
          <Printer size={14} /> Print Report
        </button>
      }
    >
      <style>{`
        @media print {
          .erp-header, .btn-primary, .btn-secondary { display: none !important; }
          body { background: #fff !important; }
          .card { box-shadow: none !important; border: 1px solid #dbeafe !important; }
        }
      `}</style>

      <div className="card p-5 mb-5" style={{ background: 'linear-gradient(135deg,#032d60,#0176d3)', color: '#fff' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-blue-100 font-bold">Zyger ERP</div>
            <h2 className="text-2xl font-extrabold mt-2 mb-1">CRM Activity Report</h2>
            <p className="text-sm text-blue-100 m-0">Lead, enquiry, quotation, campaign and contact overview</p>
          </div>
          <BarChart3 size={44} className="text-blue-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-5">
        {CRM_ENTITY_ORDER.map(entity => (
          <Link
            key={entity}
            to={`/crm/${entity}`}
            className="card p-4 no-underline hover:-translate-y-0.5 transition-all"
          >
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wide">{CRM_ENTITIES[entity].title}</div>
            <div className="text-3xl font-extrabold text-primary-700 mt-2">{summary[entity] || 0}</div>
          </Link>
        ))}
      </div>

      <div className="card p-4 mb-5" style={{ border: '1px solid #d7e8ff' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={15} className="text-primary-600" />
          <div className="text-sm font-bold text-slate-800">Filter Wise CRM Report</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select className="form-select" value={reportEntity} onChange={e => setReportEntity(e.target.value)}>
            {CRM_ENTITY_ORDER.map(entity => <option key={entity} value={entity}>{CRM_ENTITIES[entity].title}</option>)}
          </select>
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

      <div className="card p-0 overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="font-bold text-slate-900">{config.title} - Filtered Report</div>
          <div className="text-xs font-bold text-primary-700">{filteredRows.length} records</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {config.columns.map(column => <th key={column.key} className="table-th">{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length} className="table-td text-center text-slate-400">No records for selected filter.</td>
                </tr>
              ) : filteredRows.map(row => (
                <tr key={row.id} className="table-row">
                  {config.columns.map(column => (
                    <td key={column.key} className="table-td">
                      {column.key === 'status' ? <StatusBadge status={row[column.key] || 'Open'} /> : row[column.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900">Recent Leads</div>
          {recentLeads.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">No lead data available.</div>
          ) : recentLeads.map(row => (
            <div key={row.number} className="px-4 py-3 border-b border-slate-100 flex justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">{row.name}</div>
                <div className="text-xs text-primary-600">{row.number} - {row.stage}</div>
              </div>
              <StatusBadge status={row.status || 'Open'} />
            </div>
          ))}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900">Recent Quotations</div>
          {recentQuotations.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">No quotation data available.</div>
          ) : recentQuotations.map(row => (
            <div key={row.number} className="px-4 py-3 border-b border-slate-100 flex justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">{row.name}</div>
                <div className="text-xs text-primary-600">{row.number} - {row.status}</div>
              </div>
              <div className="text-xs font-bold text-slate-700">Rs. {row.total_amount || 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 mt-5 text-sm text-slate-500 flex items-center gap-2">
        <Download size={15} className="text-primary-600" />
        Use the print button to save this filter-wise CRM report as PDF from browser print.
      </div>
    </PageContainer>
  )
}
