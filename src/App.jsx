import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import { clearAuth, getCurrentUser, getStoredToken } from './lib/api'

import DashboardPage         from './pages/dashboard/DashboardPage'
import ItemsPage             from './pages/items/ItemsPage'
import ItemFormPage          from './pages/items/ItemFormPage'
import PurchaseItemPage      from './pages/items/PurchaseItemPage'
import PurchaseItemFormPage  from './pages/items/PurchaseItemFormPage'
import CustomerSuppliedPage  from './pages/items/CustomerSuppliedPage'
import CustomerSuppliedFormPage from './pages/items/CustomerSuppliedFormPage'
import PurchasePage          from './pages/purchase/PurchasePage'
import PurchaseFormPage      from './pages/purchase/PurchaseFormPage'
import PurchaseReturnPage    from './pages/purchase/PurchaseReturnPage'
import PurchaseReturnFormPage from './pages/purchase/PurchaseReturnFormPage'
import ManufacturingPage     from './pages/manufacturing/ManufacturingPage'
import ManufacturingFormPage from './pages/manufacturing/ManufacturingFormPage'
import CustomerPage          from './pages/customer/CustomerPage'
import CustomerFormPage      from './pages/customer/CustomerFormPage'
import SupplierPage          from './pages/supplier/SupplierPage'
import ManufacturingDCPage   from './pages/dc/ManufacturingDCPage'
import LabourDCPage          from './pages/dc/LabourDCPage'
import SalesDCPage           from './pages/dc/SalesDCPage'
import DCFormPage            from './pages/dc/DCFormPage'
import SalesDCPrintPage      from './pages/dc/SalesDCPrintPage'
import LabourDCPrintPage     from './pages/dc/LabourDCPrintPage'
import TaxInvoicePage        from './pages/invoice/TaxInvoicePage'
import SaleInvoicePage       from './pages/invoice/SaleInvoicePage'
import LabourInvoicePage     from './pages/invoice/LabourInvoicePage'
import InvoiceFormPage       from './pages/invoice/InvoiceFormPage'
import TaxInvoicePrintPage   from './pages/invoice/TaxInvoicePrintPage'
import SaleInvoicePrintPage  from './pages/invoice/SaleInvoicePrintPage'
import SubcontractorPage     from './pages/subcontractor/SubcontractorPage'
import SubcontractorFormPage from './pages/subcontractor/SubcontractorFormPage'
import SubcontractorDCPage   from './pages/subcontractor/SubcontractorDCPage'
import SubcontractorDCFormPage from './pages/subcontractor/SubcontractorDCFormPage'
import RejectionReportPage   from './pages/rejection/RejectionReportPage'
import RejectionFormPage     from './pages/rejection/RejectionFormPage'
import UOMPage               from './pages/planning/UOMPage'
import ItemGroupPage         from './pages/quality/ItemGroupPage'
import InwardInspectionPage  from './pages/quality/InwardInspectionPage'
import InwardInspectionFormPage from './pages/quality/InwardInspectionFormPage'
import InwardInspectionDetailPage from './pages/quality/InwardInspectionDetailPage'
import RackPage              from './pages/maintenance/RackPage'
import BinPage               from './pages/maintenance/BinPage'
import StoreMasterPage       from './pages/maintenance/StoreMasterPage'
import ReportsPage           from './pages/reports/ReportsPage'
import InventoryReportPage   from './pages/reports/InventoryReportPage'
import BusinessReportPage    from './pages/reports/BusinessReportPage'
import SettingsPage          from './pages/settings/SettingsPage'
import CrmDashboardPage      from './pages/crm/CrmDashboardPage'
import CrmListPage           from './pages/crm/CrmListPage'
import CrmFormPage           from './pages/crm/CrmFormPage'
import CrmReportsPage        from './pages/crm/CrmReportsPage'
import ProcessListPage       from './pages/process/ProcessListPage'
import ProcessFormPage       from './pages/process/ProcessFormPage'
import ProcessMasterPage     from './pages/process/ProcessMasterPage'
import ProcessFlowPage       from './pages/process/ProcessFlowPage'
import CompanyInfoPage       from './pages/company/CompanyInfoPage'
import CustomerCreationPage  from './pages/master/CustomerPage'
import SupplierCreationPage  from './pages/master/SupplierPage'
import UserManagementPage    from './pages/master/UserManagementPage'
import ComingSoon            from './pages/ComingSoon'

export default function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function bootstrapAuth() {
      const token = getStoredToken()

      if (!token) {
        setAuthLoading(false)
        return
      }

      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch {
        clearAuth()
        setUser(null)
      } finally {
        setAuthLoading(false)
      }
    }

    bootstrapAuth()
  }, [])

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#eef4ff', color: '#032d60', fontFamily: 'DM Sans, sans-serif', fontSize: '18px', fontWeight: '700' }}>
        Loading Zyger ERP...
      </div>
    )
  }

  if (!user) {
    return <LoginPage onAuthenticated={setUser} />
  }

  const processTypes = [
    'so',
    'wo',
    'po',
    'pr',
    'bom',
    'mrp',
    'production',
    'routesheet',
    'raw-material-issue',
    'fg-stock',
    'general-dc',
    'iar',
    'rai',
    'jo-inward',
    'supplier-invoice',
  ]

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="inventory/items" element={<ItemsPage />} />
        <Route path="inventory/items/new" element={<ItemFormPage />} />
        <Route path="inventory/items/:id" element={<ItemFormPage />} />
        <Route path="inventory/items/purchase" element={<PurchaseItemPage />} />
        <Route path="inventory/items/purchase/new" element={<PurchaseItemFormPage />} />
        <Route path="inventory/items/purchase/:id" element={<PurchaseItemFormPage />} />
        <Route path="inventory/items/customer-supplied" element={<CustomerSuppliedPage />} />
        <Route path="inventory/items/customer-supplied/new" element={<CustomerSuppliedFormPage />} />
        <Route path="inventory/items/customer-supplied/:id" element={<CustomerSuppliedFormPage />} />
        <Route path="inventory/items/manufacturing" element={<ManufacturingPage />} />
        <Route path="inventory/items/manufacturing/new" element={<ManufacturingFormPage />} />
        <Route path="inventory/items/manufacturing/:id" element={<ManufacturingFormPage />} />

        <Route path="inventory/purchase" element={<PurchasePage inwardType="GRN" title="Purchase Inward" subtitle="Manage GRN purchase inward and stock updates" addLabel="Add Purchase Inward" basePath="/inventory/purchase" />} />
        <Route path="inventory/purchase/new" element={<PurchaseFormPage inwardType="GRN" title="Purchase Inward" subtitle="Inventory -> Purchase -> Stock inward entry" saveLabel="Save Purchase Inward" cancelPath="/inventory/purchase" numberPrefix="PIN" />} />
        <Route path="inventory/purchase/:id" element={<PurchaseFormPage inwardType="GRN" title="Purchase Inward" subtitle="Inventory -> Purchase -> Stock inward entry" saveLabel="Save Purchase Inward" cancelPath="/inventory/purchase" numberPrefix="PIN" />} />
        <Route path="inventory/inward/grn" element={<PurchasePage inwardType="GRN" title="GRN / Purchase Inward" subtitle="Manage goods receipt and purchase inward stock updates" addLabel="Add GRN / Purchase Inward" basePath="/inventory/inward/grn" />} />
        <Route path="inventory/inward/grn/new" element={<PurchaseFormPage inwardType="GRN" title="GRN / Purchase Inward" subtitle="Inventory -> Inward -> GRN / Purchase Inward" saveLabel="Save GRN / Purchase Inward" cancelPath="/inventory/inward/grn" numberPrefix="GRN" />} />
        <Route path="inventory/inward/grn/:id" element={<PurchaseFormPage inwardType="GRN" title="GRN / Purchase Inward" subtitle="Inventory -> Inward -> GRN / Purchase Inward" saveLabel="Save GRN / Purchase Inward" cancelPath="/inventory/inward/grn" numberPrefix="GRN" />} />
        <Route path="quality/inward-process" element={<PurchasePage inwardType="PO" title="Inward List" subtitle="Quality -> Inward Process -> Inward List" addLabel="Create Inward" basePath="/quality/inward-process" />} />
        <Route path="quality/inward-process/new" element={<PurchaseFormPage inwardType="PO" title="Create Inward" subtitle="Quality -> Inward Process -> Create Inward" saveLabel="Save Inward" cancelPath="/quality/inward-process" numberPrefix="INW" />} />
        <Route path="quality/inward-process/:id" element={<PurchaseFormPage inwardType="PO" title="Edit Inward" subtitle="Quality -> Inward Process -> Edit Inward" saveLabel="Save Inward" cancelPath="/quality/inward-process" numberPrefix="INW" />} />
        <Route path="inventory/inward-process/*" element={<Navigate to="/quality/inward-process" replace />} />
        <Route path="inventory/inward/po" element={<PurchasePage inwardType="PO" title="PO Inward" subtitle="Manage purchase order inward entries and stock updates" addLabel="Add PO Inward" basePath="/inventory/inward/po" />} />
        <Route path="inventory/inward/po/new" element={<PurchaseFormPage inwardType="PO" title="PO Inward" subtitle="Inventory -> Inward -> PO Inward" saveLabel="Save PO Inward" cancelPath="/inventory/inward/po" numberPrefix="POI" />} />
        <Route path="inventory/inward/po/:id" element={<PurchaseFormPage inwardType="PO" title="PO Inward" subtitle="Inventory -> Inward -> PO Inward" saveLabel="Save PO Inward" cancelPath="/inventory/inward/po" numberPrefix="POI" />} />
        <Route path="inventory/inward/lo" element={<PurchasePage inwardType="LO" title="LO Inward" subtitle="Manage LO inward entries and stock updates" addLabel="Add LO Inward" basePath="/inventory/inward/lo" />} />
        <Route path="inventory/inward/lo/new" element={<PurchaseFormPage inwardType="LO" title="LO Inward" subtitle="Inventory -> Inward -> LO Inward" saveLabel="Save LO Inward" cancelPath="/inventory/inward/lo" numberPrefix="LOI" />} />
        <Route path="inventory/inward/lo/:id" element={<PurchaseFormPage inwardType="LO" title="LO Inward" subtitle="Inventory -> Inward -> LO Inward" saveLabel="Save LO Inward" cancelPath="/inventory/inward/lo" numberPrefix="LOI" />} />
        <Route path="inventory/inward/jo" element={<PurchasePage inwardType="JO" title="JO Inward" subtitle="Manage JO inward entries and stock updates" addLabel="Add JO Inward" basePath="/inventory/inward/jo" />} />
        <Route path="inventory/inward/jo/new" element={<PurchaseFormPage inwardType="JO" title="JO Inward" subtitle="Inventory -> Inward -> JO Inward" saveLabel="Save JO Inward" cancelPath="/inventory/inward/jo" numberPrefix="JOI" />} />
        <Route path="inventory/inward/jo/:id" element={<PurchaseFormPage inwardType="JO" title="JO Inward" subtitle="Inventory -> Inward -> JO Inward" saveLabel="Save JO Inward" cancelPath="/inventory/inward/jo" numberPrefix="JOI" />} />
        <Route path="inventory/inward-adjustment" element={<PurchaseFormPage inwardType="GRN" title="Inward Adjustment" subtitle="Quality -> Inward Adjustment" saveLabel="Save Inward Adjustment" cancelPath="/quality/inward-inspection" numberPrefix="IAD" />} />
        <Route path="inventory/return/po-dc" element={<PurchaseReturnPage returnType="PO_DC_RETURN" title="PO DC Return" subtitle="Manage DC/VIN and PO inward material returns" addLabel="Create New" basePath="/inventory/return/po-dc" />} />
        <Route path="inventory/return/po-dc/new" element={<PurchaseReturnFormPage returnType="PO_DC_RETURN" title="PO DC Return" subtitle="Inventory -> Return -> PO DC Return" saveLabel="Save PO DC Return" cancelPath="/inventory/return/po-dc" />} />
        <Route path="inventory/return/po-dc/:id" element={<PurchaseReturnFormPage returnType="PO_DC_RETURN" title="PO DC Return" subtitle="Inventory -> Return -> PO DC Return" saveLabel="Save PO DC Return" cancelPath="/inventory/return/po-dc" />} />
        <Route path="inventory/return/po-invoice" element={<PurchaseReturnPage returnType="PO_INVOICE_RETURN" title="PO Invoice Return" subtitle="Manage purchase invoice returns and tax reversal" addLabel="Create New" basePath="/inventory/return/po-invoice" />} />
        <Route path="inventory/return/po-invoice/new" element={<PurchaseReturnFormPage returnType="PO_INVOICE_RETURN" title="PO Invoice Return" subtitle="Inventory -> Return -> PO Invoice Return" saveLabel="Save PO Invoice Return" cancelPath="/inventory/return/po-invoice" />} />
        <Route path="inventory/return/po-invoice/:id" element={<PurchaseReturnFormPage returnType="PO_INVOICE_RETURN" title="PO Invoice Return" subtitle="Inventory -> Return -> PO Invoice Return" saveLabel="Save PO Invoice Return" cancelPath="/inventory/return/po-invoice" />} />
        <Route path="inventory/manufacturing" element={<ManufacturingPage />} />
        <Route path="inventory/manufacturing/new" element={<ManufacturingFormPage />} />
        <Route path="inventory/manufacturing/:id" element={<ManufacturingFormPage />} />
        <Route path="inventory/customer" element={<CustomerSuppliedPage />} />
        <Route path="inventory/customer/new" element={<CustomerSuppliedFormPage />} />
        <Route path="inventory/customer/:id" element={<CustomerSuppliedFormPage />} />

        <Route path="sales/dc" element={<SalesDCPage />} />
        <Route path="sales/dc/new" element={<DCFormPage type="Sales DC" />} />
        <Route path="sales/dc/:id" element={<DCFormPage type="Sales DC" />} />
        <Route path="sales/dc/:id/print" element={<SalesDCPrintPage />} />
        <Route path="sales/tax-invoice" element={<ComingSoon title="Tax Invoice (Sales)" />} />
        <Route path="sales/sale-invoice" element={<ComingSoon title="Sale Invoice" />} />

        <Route path="subcontractor" element={<SubcontractorPage />} />
        <Route path="subcontractor/new" element={<SubcontractorFormPage />} />
        <Route path="subcontractor/:id" element={<SubcontractorFormPage />} />
        <Route path="subcontractor/dc" element={<SubcontractorDCPage />} />
        <Route path="subcontractor/dc/new" element={<SubcontractorDCFormPage />} />
        <Route path="subcontractor/dc/:id" element={<SubcontractorDCFormPage />} />

        <Route path="purchase/jobwork/jodc" element={<ComingSoon title="Job Work - JODC" />} />
        <Route path="purchase/labour-invoice" element={<ComingSoon title="Labour Invoice (Purchase)" />} />

        <Route path="dc/manufacturing" element={<ManufacturingDCPage />} />
        <Route path="dc/manufacturing/new" element={<DCFormPage type="Manufacturing DC" />} />
        <Route path="dc/manufacturing/:id" element={<DCFormPage type="Manufacturing DC" />} />
        <Route path="dc/labour" element={<LabourDCPage />} />
        <Route path="dc/labour/new" element={<DCFormPage type="Labour DC" />} />
        <Route path="dc/labour/:id" element={<DCFormPage type="Labour DC" />} />
        <Route path="dc/labour/:id/print" element={<LabourDCPrintPage />} />

        <Route path="invoice/tax" element={<TaxInvoicePage />} />
        <Route path="invoice/tax/new" element={<InvoiceFormPage type="Tax Invoice" />} />
        <Route path="invoice/tax/:id" element={<InvoiceFormPage type="Tax Invoice" />} />
        <Route path="invoice/tax/:id/print" element={<TaxInvoicePrintPage />} />
        <Route path="invoice/sale" element={<SaleInvoicePage />} />
        <Route path="invoice/sale/new" element={<InvoiceFormPage type="Sale Invoice" />} />
        <Route path="invoice/sale/:id" element={<InvoiceFormPage type="Sale Invoice" />} />
        <Route path="invoice/sale/:id/print" element={<SaleInvoicePrintPage />} />
        <Route path="invoice/labour" element={<LabourInvoicePage />} />
        <Route path="invoice/labour/new" element={<InvoiceFormPage type="Labour Invoice" />} />
        <Route path="invoice/labour/:id" element={<InvoiceFormPage type="Labour Invoice" />} />

        <Route path="rejection" element={<RejectionReportPage />} />
        <Route path="rejection/new" element={<RejectionFormPage />} />
        <Route path="rejection/:id" element={<RejectionFormPage />} />

        <Route path="planning/uom" element={<UOMPage />} />
        <Route path="master/product-items" element={<ManufacturingPage />} />
        <Route path="master/product-items/new" element={<ManufacturingFormPage />} />
        <Route path="master/product-items/:id" element={<ManufacturingFormPage />} />
        <Route path="master/item-catalog" element={<ProcessMasterPage masterType="item-catalog" />} />
        <Route path="master/item-catalog/new" element={<ProcessMasterPage masterType="item-catalog" mode="form" />} />
        <Route path="master/item-catalog/:id" element={<ProcessMasterPage masterType="item-catalog" mode="form" />} />
        <Route path="master/process" element={<ProcessMasterPage masterType="process" />} />
        <Route path="master/process/new" element={<ProcessMasterPage masterType="process" mode="form" />} />
        <Route path="master/process/:id" element={<ProcessMasterPage masterType="process" mode="form" />} />
        <Route path="master/process-group" element={<ProcessMasterPage masterType="process-group" />} />
        <Route path="master/process-group/new" element={<ProcessMasterPage masterType="process-group" mode="form" />} />
        <Route path="master/process-group/:id" element={<ProcessMasterPage masterType="process-group" mode="form" />} />
        <Route path="process-flow" element={<ProcessFlowPage />} />
        {processTypes.map((processType) => (
          <Route key={`${processType}-list`} path={`process/${processType}`} element={<ProcessListPage processType={processType} />} />
        ))}
        {processTypes.map((processType) => (
          <Route key={`${processType}-new`} path={`process/${processType}/new`} element={<ProcessFormPage processType={processType} />} />
        ))}
        <Route path="process/po/with-pr" element={<Navigate to="/process/po/new" replace />} />
        <Route path="process/po/without-pr" element={<Navigate to="/process/po/new" replace />} />
        <Route path="process/po/schedule" element={<ProcessListPage processType="po" viewMode="schedule" />} />
        {processTypes.map((processType) => (
          <Route key={`${processType}-edit`} path={`process/${processType}/:id`} element={<ProcessFormPage processType={processType} />} />
        ))}
        <Route path="master/item-group" element={<ItemGroupPage />} />
        <Route path="master/item-group/new" element={<ItemGroupPage mode="form" />} />
        <Route path="master/store" element={<StoreMasterPage />} />
        <Route path="quality/item-group/*" element={<Navigate to="/master/item-group" replace />} />
        <Route path="quality/inward-inspection" element={<InwardInspectionPage />} />
        <Route path="quality/inward-inspection/new" element={<InwardInspectionFormPage />} />
        <Route path="quality/inward-inspection/:id" element={<InwardInspectionDetailPage />} />
        <Route path="maintenance/rack" element={<RackPage />} />
        <Route path="maintenance/bin" element={<BinPage />} />

        <Route path="payroll/employee" element={<ComingSoon title="Employee (Payroll)" />} />
        <Route path="user/employee" element={<ComingSoon title="Employee (Users)" />} />

        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/inventory" element={<InventoryReportPage />} />
        <Route path="reports/inward" element={<BusinessReportPage reportKey="inward" />} />
        <Route path="reports/lo-inward" element={<BusinessReportPage reportKey="lo-inward" />} />
        <Route path="reports/purchase" element={<BusinessReportPage reportKey="purchase" />} />
        <Route path="reports/manufacturing" element={<BusinessReportPage reportKey="manufacturing" />} />
        <Route path="reports/sales" element={<BusinessReportPage reportKey="sales" />} />
        <Route path="reports/dc-summary" element={<BusinessReportPage reportKey="dc-summary" />} />
        <Route path="reports/invoice" element={<BusinessReportPage reportKey="invoice" />} />
        <Route path="reports/rejection" element={<BusinessReportPage reportKey="rejection" />} />
        <Route path="reports/supplier-performance" element={<BusinessReportPage reportKey="supplier-performance" />} />
        <Route path="reports/customer-supplied" element={<BusinessReportPage reportKey="customer-supplied" />} />
        <Route path="reports/inward-inspection" element={<BusinessReportPage reportKey="inward-inspection" />} />
        <Route path="crm/dashboard" element={<CrmDashboardPage />} />
        <Route path="crm/leads" element={<CrmListPage entity="leads" />} />
        <Route path="crm/leads/new" element={<CrmFormPage entity="leads" />} />
        <Route path="crm/leads/:id" element={<CrmFormPage entity="leads" />} />
        <Route path="crm/enquiries" element={<CrmListPage entity="enquiries" />} />
        <Route path="crm/enquiries/new" element={<CrmFormPage entity="enquiries" />} />
        <Route path="crm/enquiries/:id" element={<CrmFormPage entity="enquiries" />} />
        <Route path="crm/quotations" element={<CrmListPage entity="quotations" />} />
        <Route path="crm/quotations/new" element={<CrmFormPage entity="quotations" />} />
        <Route path="crm/quotations/:id" element={<CrmFormPage entity="quotations" />} />
        <Route path="crm/campaigns" element={<CrmListPage entity="campaigns" />} />
        <Route path="crm/campaigns/new" element={<CrmFormPage entity="campaigns" />} />
        <Route path="crm/campaigns/:id" element={<CrmFormPage entity="campaigns" />} />
        <Route path="crm/contacts" element={<CrmListPage entity="contacts" />} />
        <Route path="crm/contacts/new" element={<CrmFormPage entity="contacts" />} />
        <Route path="crm/contacts/:id" element={<CrmFormPage entity="contacts" />} />
        <Route path="crm/reports" element={<CrmReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="company-info" element={<CompanyInfoPage />} />
        <Route path="master/users" element={<UserManagementPage />} />
        <Route path="master/customer" element={<CustomerCreationPage />} />
        <Route path="master/customer/:id" element={<CustomerCreationPage />} />
        <Route path="master/customer/view" element={<CustomerPage mode="customer" />} />
        <Route path="master/supplier" element={<SupplierCreationPage />} />
        <Route path="master/supplier/:id" element={<SupplierCreationPage />} />
        <Route path="master/supplier/view" element={<SupplierPage />} />
      </Route>
    </Routes>
  )
}
