import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import TopNavbar from './TopNavbar'
import { NAV_MENU } from '../../data/navConfig'

const ERP_TABS_STORAGE_KEY = 'zyger_erp_open_tabs'

const PAGE_TITLE_OVERRIDES = [
  ['/sales/dc', 'Sales DC'],
  ['/invoice/tax', 'Tax Invoice'],
  ['/invoice/sale', 'Sale Invoice'],
  ['/quality/inward-inspection', 'Inward Inspection'],
  ['/quality/item-group', 'Item Group'],
  ['/reports/inventory', 'Stock Details'],
  ['/inventory/items/purchase', 'Purchase Item'],
  ['/inventory/items/customer-supplied', 'Customer Supplied'],
  ['/inventory/items/manufacturing', 'Manufacturing Item'],
  ['/inventory/items', 'Items'],
  ['/inventory/inward/po', 'PO Inward'],
  ['/inventory/inward/lo', 'LO Inward'],
  ['/inventory/inward/jo', 'JO Inward'],
  ['/inventory/return/po-dc', 'PO DC Return'],
  ['/inventory/return/po-invoice', 'PO Invoice Return'],
  ['/master/customer/view', 'Customer'],
  ['/master/supplier/view', 'Supplier'],
  ['/master/users', 'Users'],
  ['/maintenance/rack', 'Rack'],
  ['/maintenance/bin', 'Bin'],
  ['/planning/uom', 'UOM'],
  ['/company-info', 'Company Info'],
  ['/reports', 'Reports'],
  ['/settings', 'Settings'],
  ['/dashboard', 'Dashboard'],
]

const ROUTE_ACTION_LABELS = [
  ['/print', 'Print'],
  ['/new', 'New'],
]

function collectNavTitles(items, result = []) {
  items.forEach((item) => {
    if (item.path) result.push([item.path, item.label])
    if (item.children) collectNavTitles(item.children, result)
  })
  return result
}

function getPageTitle(pathname) {
  const allRoutes = [...PAGE_TITLE_OVERRIDES, ...collectNavTitles(NAV_MENU)]
  const matched = allRoutes
    .filter(([path]) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b[0].length - a[0].length)[0]

  const baseTitle = matched?.[1] || 'Dashboard'
  const action = ROUTE_ACTION_LABELS.find(([segment]) => pathname.includes(segment))?.[1]
  if (action && !baseTitle.includes(action)) return `${action} ${baseTitle}`
  if (/\/\d+(\/)?$/.test(pathname) && !pathname.includes('/dashboard')) return `Edit ${baseTitle}`
  return baseTitle
}

function readStoredTabs() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ERP_TABS_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizePath(pathname) {
  return pathname || '/dashboard'
}

function SubTabBar({ tabs, activePath, onClose }) {
  if (!tabs.length) return null

  return (
    <div style={{
      background: '#eaf3ff',
      borderBottom: '1px solid #cfe4fb',
      boxShadow: '0 8px 22px rgba(3,45,96,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '8px 24px 0',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
      }}>
        {tabs.map((tab) => {
          const active = tab.path === activePath
          const isDashboard = tab.path === '/dashboard'
          return (
            <div
              key={tab.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                minWidth: 'fit-content',
                borderRadius: '12px 12px 0 0',
                border: active ? '1px solid #0b5cab' : '1px solid #cfe4fb',
                borderBottomColor: active ? '#fff' : '#cfe4fb',
                background: active ? '#fff' : '#f7fbff',
                color: active ? '#032d60' : '#47627d',
                boxShadow: active ? '0 -2px 14px rgba(3,45,96,0.08)' : 'none',
              }}
            >
              <Link
                to={tab.path}
                style={{
                  display: 'block',
                  padding: '9px 10px 8px 12px',
                  color: 'inherit',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: active ? 800 : 700,
                  whiteSpace: 'nowrap',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {tab.title}
              </Link>
              {!isDashboard && (
                <button
                  type="button"
                  onClick={() => onClose(tab.path)}
                  title={`Close ${tab.title}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    marginRight: '5px',
                    border: 'none',
                    borderRadius: '8px',
                    background: active ? '#eff6ff' : 'transparent',
                    color: active ? '#0b5cab' : '#7b93aa',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const activePath = normalizePath(location.pathname)
  const activeTitle = useMemo(() => getPageTitle(activePath), [activePath])
  const [tabs, setTabs] = useState(() => {
    const storedTabs = readStoredTabs()
    return storedTabs.length ? storedTabs : [{ path: '/dashboard', title: 'Dashboard' }]
  })

  useEffect(() => {
    document.title = activeTitle
  }, [activeTitle])

  useEffect(() => {
    setTabs((currentTabs) => {
      const nextTab = { path: activePath, title: activeTitle }
      const exists = currentTabs.some((tab) => tab.path === activePath)
      const nextTabs = exists
        ? currentTabs.map((tab) => (tab.path === activePath ? nextTab : tab))
        : [...currentTabs, nextTab]
      sessionStorage.setItem(ERP_TABS_STORAGE_KEY, JSON.stringify(nextTabs))
      return nextTabs
    })
  }, [activePath, activeTitle])

  const closeTab = (pathToClose) => {
    setTabs((currentTabs) => {
      const closingIndex = currentTabs.findIndex((tab) => tab.path === pathToClose)
      const nextTabs = currentTabs.filter((tab) => tab.path !== pathToClose)
      const safeTabs = nextTabs.length ? nextTabs : [{ path: '/dashboard', title: 'Dashboard' }]
      sessionStorage.setItem(ERP_TABS_STORAGE_KEY, JSON.stringify(safeTabs))

      if (pathToClose === activePath) {
        const fallback = safeTabs[Math.max(0, closingIndex - 1)] || safeTabs[safeTabs.length - 1]
        navigate(fallback.path)
      }

      return safeTabs
    })
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F3EBF4', display: 'flex', flexDirection: 'column' }}>
      <TopNavbar />
      <SubTabBar tabs={tabs} activePath={activePath} onClose={closeTab} />
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '28px 24px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
