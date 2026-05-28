import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Download, Printer } from 'lucide-react'
import { PageContainer } from '../../components/ui'
import { getCrmSummary } from '../../lib/api'
import { CRM_ENTITIES, CRM_ENTITY_ORDER } from './crmConfig'

export default function CrmReportsPage() {
  const [summary, setSummary] = useState({})
  const [recentLeads, setRecentLeads] = useState([])
  const [recentQuotations, setRecentQuotations] = useState([])

  useEffect(() => {
    async function loadReport() {
      const result = await getCrmSummary()
      setSummary(result.summary || {})
      setRecentLeads(result.recent_leads || [])
      setRecentQuotations(result.recent_quotations || [])
    }

    loadReport()
  }, [])

  const handlePrint = () => window.print()

  return (
    <PageContainer
      title="CRM Reports"
      subtitle="CRM pipeline count, recent leads and recent quotation value summary"
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
            <p className="text-sm text-blue-100 m-0">Lead to enquiry, quotation and campaign overview</p>
          </div>
          <BarChart3 size={44} className="text-blue-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-5">
        {CRM_ENTITY_ORDER.map(entity => (
          <Link
            key={entity}
            to={`/crm/${entity}`}
            target="_blank"
            rel="noreferrer"
            className="card p-4 no-underline hover:-translate-y-0.5 transition-all"
          >
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wide">{CRM_ENTITIES[entity].title}</div>
            <div className="text-3xl font-extrabold text-primary-700 mt-2">{summary[entity] || 0}</div>
          </Link>
        ))}
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
                <div className="text-xs text-primary-600">{row.number} • {row.stage}</div>
              </div>
              <div className="text-xs font-bold text-slate-500">{row.status}</div>
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
                <div className="text-xs text-primary-600">{row.number} • {row.status}</div>
              </div>
              <div className="text-xs font-bold text-slate-700">₹ {row.total_amount || 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 mt-5 text-sm text-slate-500 flex items-center gap-2">
        <Download size={15} className="text-primary-600" />
        Export can be added next as CSV/PDF once the final CRM report format is approved.
      </div>
    </PageContainer>
  )
}
