import {
  LayoutDashboard, Package, BarChart3, Settings,
  Building2, BookOpen, ShoppingCart, TrendingUp, Hammer,
  Users, Truck, PhoneCall, Target, Send, Megaphone,
  ClipboardList, Factory, FileStack, GitBranch,
} from 'lucide-react'

export const NAV_MENU = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },

  {
    label: 'Master',
    icon: BookOpen,
    children: [
      {
        label: 'Inventory',
        icon: Package,
        children: [
          {
            label: 'Items',
            path: '/inventory/items',
            children: [
              { label: 'Purchasable Item', path: '/inventory/items/purchase' },
              { label: 'Customer Supplied', path: '/inventory/items/customer-supplied' },
              { label: 'Manufacturing Item', path: '/inventory/items/manufacturing' },
            ],
          },
          { label: 'Item Group Master', path: '/master/item-group' },
          { label: 'Store Master', path: '/master/store' },
          {
            label: 'Configurations',
            children: [
              { label: 'Process', path: '/master/process' },
              { label: 'Process Group', path: '/master/process-group' },
            ],
          },
        ],
      },
      {
        label: 'Planning',
        icon: BarChart3,
        children: [
          { label: 'UOM', path: '/planning/uom' },
        ],
      },
      {
        label: 'Bill of Material (BOM)',
        icon: FileStack,
        path: '/process/bom',
      },
      {
        label: 'Customer List',
        icon: Users,
        path: '/master/customer/view',
      },
      {
        label: 'Supplier',
        icon: Truck,
        path: '/master/supplier/view',
      },
      {
        label: 'Subcontractor List',
        icon: Hammer,
        path: '/subcontractor',
      },
      {
        label: 'Users',
        icon: Users,
        path: '/master/users',
      },
      { label: 'Company Info', icon: Building2, path: '/company-info' },
    ],
  },

  {
    label: 'CRM',
    icon: Target,
    children: [
      { label: 'CRM Dashboard', icon: LayoutDashboard, path: '/crm/dashboard' },
      { label: 'Leads', icon: Target, path: '/crm/leads' },
      { label: 'Enquiries', icon: PhoneCall, path: '/crm/enquiries' },
      { label: 'Quotations', icon: Send, path: '/crm/quotations' },
      { label: 'Campaigns', icon: Megaphone, path: '/crm/campaigns' },
      { label: 'Contacts', icon: Users, path: '/crm/contacts' },
      { label: 'CRM Reports', icon: BarChart3, path: '/crm/reports' },
    ],
  },

  {
    label: 'Sales',
    icon: TrendingUp,
    children: [
      { label: 'Sales Order (SO)', path: '/process/so' },
      { label: 'Sales DC', path: '/sales/dc' },
      { label: 'Tax Invoice', path: '/invoice/tax' },
      { label: 'Sale Invoice', path: '/invoice/sale' },
    ],
  },

  {
    label: 'Purchase',
    icon: ShoppingCart,
    children: [
      { label: 'Purchase Request (PR)', path: '/process/pr' },
      { label: 'Purchase Order (PO)', path: '/process/po' },
      { label: 'Labour Invoice', path: '/purchase/labour-invoice' },
    ],
  },

  {
    label: 'Inventory',
    icon: Package,
    children: [
      {
        label: 'Inward Types',
        path: '/inventory/inward',
        children: [
          { label: 'PO Inward', path: '/inventory/inward/po' },
          { label: 'LO Inward', path: '/inventory/inward/lo' },
          { label: 'JO Inward', path: '/inventory/inward/jo' },
        ],
      },
      { label: 'Inward Adjustment', path: '/inventory/inward-adjustment' },
      { label: 'Raw Material Issue', path: '/process/raw-material-issue' },
      { label: 'Stock', icon: Package, path: '/reports/inventory' },
    ],
  },

  {
    label: 'Production',
    icon: Factory,
    children: [
      { label: 'Work Order (WO)', icon: GitBranch, path: '/process/wo' },
      { label: 'Production Entry', icon: Factory, path: '/process/production' },
    ],
  },

  {
    label: 'Quality',
    icon: ClipboardList,
    children: [
      { label: 'Inward Inspection', path: '/quality/inward-inspection' },
    ],
  },

  {
    label: 'Sub Contractor',
    icon: Hammer,
    children: [
      { label: 'Subcontractor DC', path: '/subcontractor/dc' },
    ],
  },

  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'Settings', path: '/settings' },
      { label: 'ERP Process Flow', icon: GitBranch, path: '/process-flow' },
    ],
  },
]
