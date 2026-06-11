import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionButtons, FormGrid, FormInput, PageContainer, SectionCard, SelectDropdown, Textarea } from '../../components/ui/index'
import { createPurchaseInward, getCustomers, getItems, getNextPurchaseInwardNumber, getPurchaseInvoiceNos, getSuppliers } from '../../lib/api'

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

export default function PurchaseFormPage({
  inwardType = 'GRN',
  title = 'Purchase Inward',
  subtitle = 'Inventory -> Purchase -> Stock inward entry',
  saveLabel = 'Save Purchase Inward',
  cancelPath = '/inventory/purchase',
  numberPrefix = 'PIN',
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [invoiceSuggestions, setInvoiceSuggestions] = useState([])
  const showCustomerField = inwardType !== 'PO'
  const isLoInward = inwardType === 'LO'
  const supplierRequired = !isLoInward
  const customerRequired = isLoInward

  const [form, setForm] = useState({
    inwardNo: '',
    inwardDate: todayValue(),
    inwardTypeLabel: '',
    referenceType: '',
    referenceNumber: '',
    salesOrder: '',
    vehicleTrackNo: '',
    weighmentNo: '',
    emptyWeight: '',
    totalWeight: '',
    netWeight: '',
    materialReceiver: '',
    indentNo: '',
    visibleTo: '',
    supplierId: '',
    customerId: '',
    invoiceNo: '',
    vehicleNo: '',
    itemId: '',
    qty: '',
    rate: '',
    remarks: '',
  })

  useEffect(() => {
    async function loadMasters() {
      try {
        setBootLoading(true)
        setError('')
        const [supplierResult, customerResult, itemResult] = await Promise.all([
          getSuppliers(),
          getCustomers(),
          getItems(),
        ])
        setSuppliers(supplierResult)
        setCustomers(customerResult)
        setItems(itemResult)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load purchase master data.')
      } finally {
        setBootLoading(false)
      }
    }

    loadMasters()
  }, [])

  useEffect(() => {
    if (id) return

    async function loadNextNumber() {
      try {
        const result = await getNextPurchaseInwardNumber(inwardType)
        setForm((current) => current.inwardNo ? current : { ...current, inwardNo: result.nextNumber || `${numberPrefix}-0001` })
      } catch {
        setForm((current) => current.inwardNo ? current : { ...current, inwardNo: `${numberPrefix}-0001` })
      }
    }

    loadNextNumber()
  }, [id, inwardType, numberPrefix])

  useEffect(() => {
    async function loadInvoiceSuggestions() {
      try {
        const result = await getPurchaseInvoiceNos({
          inwardType,
          supplierId: form.supplierId,
          query: form.invoiceNo,
        })
        setInvoiceSuggestions(Array.isArray(result) ? result : [])
      } catch {
        setInvoiceSuggestions([])
      }
    }

    if (!form.invoiceNo && !form.supplierId) {
      setInvoiceSuggestions([])
      return
    }

    loadInvoiceSuggestions()
  }, [form.invoiceNo, form.supplierId, inwardType])

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: String(supplier.id),
        label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
      })),
    [suppliers]
  )

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: String(customer.id),
        label: `${customer.customer_code} - ${customer.customer_name}`,
      })),
    [customers]
  )

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: String(item.id),
        label: `${item.item_code} - ${item.item_name}`,
      })),
    [items]
  )

  const selectedItem = items.find((item) => String(item.id) === form.itemId)
  const computedAmount =
    form.qty && form.rate ? (Number(form.qty || 0) * Number(form.rate || 0)).toFixed(2) : '0.00'

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    if (!form.inwardNo || !form.itemId || !form.qty || (supplierRequired && !form.supplierId) || (customerRequired && !form.customerId)) {
      setSuccess('')
      setError(isLoInward ? 'Inward No, Customer, Item, and Qty are required for LO inward.' : 'Inward No, Supplier, Item, and Qty are required.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const result = await createPurchaseInward({
        inwardType,
        inwardNo: form.inwardNo,
        inwardDate: form.inwardDate,
        inwardTypeLabel: form.inwardTypeLabel,
        referenceType: form.referenceType,
        referenceNumber: form.referenceNumber,
        salesOrder: form.salesOrder,
        vehicleTrackNo: form.vehicleTrackNo,
        weighmentNo: form.weighmentNo,
        emptyWeight: form.emptyWeight,
        totalWeight: form.totalWeight,
        netWeight: form.netWeight,
        materialReceiver: form.materialReceiver,
        indentNo: form.indentNo,
        visibleTo: form.visibleTo,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        customerId: showCustomerField && form.customerId ? Number(form.customerId) : null,
        invoiceNo: form.invoiceNo,
        vehicleNo: form.vehicleNo,
        itemId: Number(form.itemId),
        qty: form.qty,
        rate: form.rate || '0',
        remarks: form.remarks,
      })
      setSuccess(`${title} saved. ID: ${result.purchase?.id ?? '-'} | New Stock: ${result.stock?.new_balance ?? '-'}`)
      setForm({
        inwardNo: '',
        inwardDate: todayValue(),
        inwardTypeLabel: '',
        referenceType: '',
        referenceNumber: '',
        salesOrder: '',
        vehicleTrackNo: '',
        weighmentNo: '',
        emptyWeight: '',
        totalWeight: '',
        netWeight: '',
        materialReceiver: '',
        indentNo: '',
        visibleTo: '',
        supplierId: '',
        customerId: '',
        invoiceNo: '',
        vehicleNo: '',
        itemId: '',
        qty: '',
        rate: '',
        remarks: '',
      })
      try {
        const nextResult = await getNextPurchaseInwardNumber(inwardType)
        setForm((current) => ({ ...current, inwardNo: nextResult.nextNumber || `${numberPrefix}-0001` }))
      } catch {
      }
    } catch (saveError) {
      setError(saveError.message || `Unable to save ${title.toLowerCase()}.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer
      title={id ? `Edit ${title}` : `New ${title}`}
      subtitle={subtitle}
      actions={<ActionButtons onSave={handleSave} onCancel={() => navigate(cancelPath)} saveLabel={saveLabel} loading={loading} />}
    >
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontSize: '13px', fontWeight: '700' }}>
          {success}
        </div>
      )}
      {bootLoading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading supplier, customer, and item masters...
        </div>
      )}

      <SectionCard title="Inward Information" defaultOpen>
        <FormGrid cols={2}>
          <SelectDropdown label="Inward Type" required value={form.inwardTypeLabel} onChange={(e) => updateField('inwardTypeLabel', e.target.value)} options={['PO Inward', 'LO Inward', 'JO Inward', 'Customer Job Work', 'General Inward']} placeholder="Please Select" />
          <FormInput label="Inward No" required value={form.inwardNo} onChange={(e) => updateField('inwardNo', e.target.value)} placeholder={`${numberPrefix}-0001`} />
          <FormInput label="Inward Date" required type="date" value={form.inwardDate} onChange={(e) => updateField('inwardDate', e.target.value)} />
          <FormInput label="Vehicle Track No" value={form.vehicleTrackNo} onChange={(e) => updateField('vehicleTrackNo', e.target.value)} placeholder="Please Select / Track No" />
          <SelectDropdown label="Reference Type" required value={form.referenceType} onChange={(e) => updateField('referenceType', e.target.value)} options={['Sales Order', 'Purchase Order', 'Job Work', 'Manual', 'Return']} placeholder="Please Select" />
          <FormInput label="Reference Number" value={form.referenceNumber} onChange={(e) => updateField('referenceNumber', e.target.value)} />
          <FormInput label="Sales Order" value={form.salesOrder} onChange={(e) => updateField('salesOrder', e.target.value)} placeholder="Please Select" />
          <FormInput label="Weighment Number" value={form.weighmentNo} onChange={(e) => updateField('weighmentNo', e.target.value)} placeholder="Enter Weighment No" />
          <FormInput label="Empty Weight" type="number" value={form.emptyWeight} onChange={(e) => updateField('emptyWeight', e.target.value)} placeholder="Enter Empty Weight" />
          <FormInput label="Total Weight" type="number" value={form.totalWeight} onChange={(e) => updateField('totalWeight', e.target.value)} placeholder="Enter Total Weight" />
          <FormInput label="Net Weight" type="number" value={form.netWeight} onChange={(e) => updateField('netWeight', e.target.value)} placeholder="Enter Net Weight" />
          <FormInput label="Material Receiver" value={form.materialReceiver} onChange={(e) => updateField('materialReceiver', e.target.value)} placeholder="Employee Name" />
          <FormInput label="Indent No." value={form.indentNo} onChange={(e) => updateField('indentNo', e.target.value)} />
          <FormInput label="Visible To" value={form.visibleTo} onChange={(e) => updateField('visibleTo', e.target.value)} placeholder="Please Select" />
          <SelectDropdown label="Supplier" required={supplierRequired} value={form.supplierId} onChange={(e) => updateField('supplierId', e.target.value)} options={supplierOptions} placeholder={supplierRequired ? 'Select supplier' : 'Select supplier (optional)'} />
          {showCustomerField && (
            <SelectDropdown label={customerRequired ? 'Customer' : 'Customer (Optional)'} required={customerRequired} value={form.customerId} onChange={(e) => updateField('customerId', e.target.value)} options={customerOptions} placeholder="Select customer" />
          )}
          <div>
            <label className="form-label">Supplier Invoice</label>
            <input
              className="form-input"
              value={form.invoiceNo}
              onChange={(e) => updateField('invoiceNo', e.target.value)}
              placeholder="Supplier invoice no"
              list="supplier-invoice-suggestions"
            />
            <datalist id="supplier-invoice-suggestions">
              {invoiceSuggestions.map((invoiceNo) => (
                <option key={invoiceNo} value={invoiceNo} />
              ))}
            </datalist>
          </div>
          <FormInput label="Vehicle No" value={form.vehicleNo} onChange={(e) => updateField('vehicleNo', e.target.value)} placeholder="TN-00-AB-1234" />
        </FormGrid>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
          Supplier Invoice field shows matching invoice numbers already saved in the database while typing.
        </div>
      </SectionCard>

      <SectionCard title="Item and Quantity" defaultOpen>
        <FormGrid cols={2}>
          <SelectDropdown label="Item" required value={form.itemId} onChange={(e) => updateField('itemId', e.target.value)} options={itemOptions} placeholder="Select item" />
          <FormInput label="Qty" required type="number" min="0" step="0.01" value={form.qty} onChange={(e) => updateField('qty', e.target.value)} placeholder="0.00" />
          <FormInput label="Rate" type="number" min="0" step="0.01" value={form.rate} onChange={(e) => updateField('rate', e.target.value)} placeholder="0.00" />
          <FormInput label="Amount" value={computedAmount} readOnly />
          <FormInput label="Selected Item Code" value={selectedItem?.item_code || ''} readOnly />
          <FormInput label="Selected Item Name" value={selectedItem?.item_name || ''} readOnly />
        </FormGrid>
        <div style={{ marginTop: '16px' }}>
          <Textarea label="Remarks" rows={3} value={form.remarks} onChange={(e) => updateField('remarks', e.target.value)} placeholder="Optional inward note, customer reference, transport note..." />
        </div>
      </SectionCard>
    </PageContainer>
  )
}
