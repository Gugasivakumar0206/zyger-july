import { BarChart2, Factory, FileText, Package, ShoppingCart, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageContainer } from '../../components/ui/index'

const REPORTS = [
  { icon: Package, label: 'Inventory Report', description: 'Current stock levels and valuations', path: '/reports/inventory' },
  { icon: Package, label: 'Inward Report', description: 'All GRN, PO, LO, and JO inward entries with values', path: '/reports/inward' },
  { icon: Package, label: 'LO Inward Report', description: 'LO inward entries with customer and value details', path: '/reports/lo-inward' },
  { icon: BarChart2, label: 'Inward Inspection Report', description: 'Accepted, rejected, and rework inward inspection quantities', path: '/reports/inward-inspection' },
  { icon: ShoppingCart, label: 'Purchase Report', description: 'Purchase order summary and trends', path: '/reports/purchase' },
  { icon: Factory, label: 'Manufacturing Report', description: 'Production output and efficiency', path: '/reports/manufacturing' },
  { icon: TrendingUp, label: 'Sales Report', description: 'Sales performance and customer analysis', path: '/reports/sales' },
  { icon: FileText, label: 'DC Summary Report', description: 'Delivery challan summary', path: '/reports/dc-summary' },
  { icon: FileText, label: 'Invoice Report', description: 'Invoice and payment status', path: '/reports/invoice' },
  { icon: BarChart2, label: 'Rejection Analysis', description: 'Quality rejection trends', path: '/reports/rejection' },
  { icon: BarChart2, label: 'Supplier Performance', description: 'Supplier delivery and quality metrics', path: '/reports/supplier-performance' },
  { icon: Package, label: 'Customer Supplied', description: 'Customer supplied item quantity and value details', path: '/reports/customer-supplied' },
]

export default function ReportsPage() {
  return (
    <PageContainer title="Reports" subtitle="Business intelligence and reporting" showBackButton>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORTS.map((report) => (
          <Link
            key={report.label}
            className="card text-left hover:shadow-card-hover transition-shadow duration-200 group"
            to={report.path}
            target="_blank"
            rel="noreferrer"
          >
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
              <report.icon size={20} className="text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1 font-display">{report.label}</p>
            <p className="text-xs text-slate-500">{report.description}</p>
          </Link>
        ))}
      </div>
    </PageContainer>
  )
}
