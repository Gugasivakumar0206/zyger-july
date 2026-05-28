import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNavbar from './TopNavbar'
import { NAV_MENU } from '../../data/navConfig'

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

  return matched?.[1] || 'Dashboard'
}

export default function MainLayout() {
  const location = useLocation()

  useEffect(() => {
    document.title = getPageTitle(location.pathname)
  }, [location.pathname])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F3EBF4', display: 'flex', flexDirection: 'column' }}>
      <TopNavbar />
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '28px 24px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
