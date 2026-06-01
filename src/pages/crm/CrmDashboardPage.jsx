import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Bell, Megaphone, PhoneCall, Send, Target, Users } from 'lucide-react'
import { PageContainer, StatusBadge } from '../../components/ui'
import { getCrmSummary } from '../../lib/api'

const cards = [
  { key: 'leads', label: 'Leads', path: '/crm/leads', icon: Target },
  { key: 'enquiries', label: 'Enquiries', path: '/crm/enquiries', icon: PhoneCall },
  { key: 'quotations', label: 'Quotations', path: '/crm/quotations', icon: Send },
  { key: 'campaigns', label: 'Campaigns', path: '/crm/campaigns', icon: Megaphone },
  { key: 'contacts', label: 'Contacts', path: '/crm/contacts', icon: Users },
]

export default function CrmDashboardPage() {
  const [summary, setSummary] = useState({})
  const [recentLeads, setRecentLeads] = useState([])
  const [recentQuotations, setRecentQuotations] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCrm() {
      try {
        const result = await getCrmSummary()
        setSummary(result.summary || {})
        setRecentLeads(result.recent_leads || [])
        setRecentQuotations(result.recent_quotations || [])
        setNotifications(result.notifications || [])
      } finally {
        setLoading(false)
      }
    }

    loadCrm()
  }, [])

  return (
    <PageContainer
      title="CRM Dashboard"
      subtitle="CRM -> Leads, enquiries, quotations, campaigns and contacts"
    >
      <div className="card p-0 overflow-hidden mb-5" style={{ border: '1px solid #d7e8ff' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)', padding: '18px 22px', color: '#fff' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center' }}>
                <Target size={22} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold m-0" style={{ fontFamily: 'Sora, sans-serif' }}>CRM Workspace</h2>
                <p className="text-sm m-0 mt-1" style={{ color: '#dbeafe', fontWeight: 600 }}>
                  Track customer pipeline from first lead to quotation follow-up.
                </p>
              </div>
            </div>
            <Link to="/crm/leads/new" className="btn-secondary" style={{ background: '#fff', color: '#0f5cab', borderColor: '#bfdbfe' }}>
              New Lead
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <Link
              key={card.key}
              to={card.path}
              className="card p-4 no-underline hover:-translate-y-0.5 transition-all"
              style={{ border: '1px solid #d7e8ff', boxShadow: '0 4px 20px rgba(59,130,246,0.10)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#0f4c81' }}>{card.label}</div>
                  <div className="text-3xl font-extrabold mt-1" style={{ color: '#0f5cab' }}>{loading ? '...' : summary[card.key] || 0}</div>
                </div>
                <div className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', color: '#0f5cab' }}>
                  <Icon size={20} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-0 overflow-hidden xl:col-span-2" style={{ border: '1px solid #d7e8ff' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)' }}>
            <Bell size={16} color="#fff" />
            <h3 className="text-sm font-bold m-0 text-white">Follow-up Notifications</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 p-4">
            {notifications.length === 0 ? (
              <div className="text-sm text-slate-400">No upcoming CRM follow-ups.</div>
            ) : notifications.slice(0, 8).map(notification => (
              <Link
                key={`${notification.entity}-${notification.record_id}-${notification.followup_date}-${notification.task}`}
                to={`/crm/${notification.entity}/${notification.record_id}`}
                className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 no-underline hover:bg-blue-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-primary-700">{notification.number}</div>
                  <StatusBadge status={notification.status} />
                </div>
                <div className="text-sm font-bold text-slate-800 mt-2">{notification.name}</div>
                <div className="text-xs text-slate-500 mt-1">{notification.task} - {notification.followup_date}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-0 overflow-hidden" style={{ border: '1px solid #d7e8ff' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)' }}>
            <Target size={16} color="#fff" />
            <h3 className="text-sm font-bold m-0 text-white">Recent Leads</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLeads.length === 0 ? (
              <div className="p-6 text-sm text-slate-400">No CRM leads yet.</div>
            ) : recentLeads.map(lead => (
              <div key={lead.number} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{lead.name}</div>
                  <div className="text-xs text-primary-600 mt-1">{lead.number} - {lead.stage || 'New'}</div>
                </div>
                <StatusBadge status={lead.status || 'Open'} />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-0 overflow-hidden" style={{ border: '1px solid #d7e8ff' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)' }}>
            <BarChart3 size={16} color="#fff" />
            <h3 className="text-sm font-bold m-0 text-white">Recent Quotations</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentQuotations.length === 0 ? (
              <div className="p-6 text-sm text-slate-400">No CRM quotations yet.</div>
            ) : recentQuotations.map(quotation => (
              <div key={quotation.number} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{quotation.name}</div>
                  <div className="text-xs text-primary-600 mt-1">{quotation.number} - Rs. {quotation.total_amount || 0}</div>
                </div>
                <StatusBadge status={quotation.status || 'Draft'} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
