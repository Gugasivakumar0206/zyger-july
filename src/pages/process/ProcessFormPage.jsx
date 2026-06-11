import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipboardList, Factory, GitBranch, Plus, Save, Trash2 } from 'lucide-react'
import { ActionButtons, FormGrid, FormInput, PageContainer, SectionCard, SelectDropdown, Textarea } from '../../components/ui'
import {
  createProcessDocument,
  getCustomers,
  getItems,
  getNextProcessNumber,
  getProcessDocumentById,
  getProcessSourceOptions,
  getProcessDocuments,
  getSuppliers,
  generateWorkOrderFromBom,
  generateWorkOrderFromMrp,
  generateWorkOrderFromSalesOrder,
  runSalesOrderMrp,
  updateProcessDocument,
} from '../../lib/api'
import { PO_TYPES, PROCESS_APPROVAL_STATUS, PROCESS_CONFIG, PROCESS_DEPARTMENTS, PROCESS_ORDER_TYPES, PROCESS_STATUS, TAX_NAMES } from './processConfig'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function blankItem() {
  return {
    itemId: '',
    itemCode: '',
    itemName: '',
    description: '',
    quantity: '',
    uom: '',
    weight: '',
    totalWeight: '',
    reservationQty: '',
    reservedQty: '',
    availableStockQty: '',
    locationQty: '',
    unitPrice: '',
    discountType: 'Amount',
    discountValue: '0',
    taxName: 'CGST',
    taxPercent: '',
    taxValue: '',
    amount: '',
    totalAmount: '',
    dueDate: today(),
    remarks: '',
    status: 'Open',
  }
}

function demoBomRows() {
  return [
    { ...blankItem(), itemCode: 'RM-FRAME', itemName: 'Frame Assembly', description: 'Main cycle frame', quantity: '1', uom: 'NOS', status: 'Open' },
    { ...blankItem(), itemCode: 'RM-WHEEL', itemName: 'Wheel Assembly', description: 'Front and rear wheel set', quantity: '2', uom: 'NOS', status: 'Open' },
    { ...blankItem(), itemCode: 'RM-HANDLE', itemName: 'Handlebar Assembly', description: 'Handlebar with grip', quantity: '1', uom: 'NOS', status: 'Open' },
    { ...blankItem(), itemCode: 'RM-SEAT', itemName: 'Seat Assembly', description: 'Seat and seat post', quantity: '1', uom: 'NOS', status: 'Open' },
    { ...blankItem(), itemCode: 'RM-BRAKE', itemName: 'Brake Kit', description: 'Brake lever, cable and pads', quantity: '1', uom: 'SET', status: 'Open' },
    { ...blankItem(), itemCode: 'RM-CHAIN', itemName: 'Chain Drive Kit', description: 'Chain, crank, pedal and sprocket', quantity: '1', uom: 'SET', status: 'Open' },
  ]
}

function BomFlowDiagram({ finishedGood, rows }) {
  const componentRows = rows.filter(row => row.itemName || row.itemCode)
  if (!finishedGood && componentRows.length === 0) return null

  return (
    <SectionCard title="BOM Cycle Diagram" icon={GitBranch}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: '760px', padding: '24px', borderRadius: '18px', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 80px 1fr', gap: '18px', alignItems: 'center' }}>
            <div style={{ borderRadius: '18px', background: '#075a9f', color: '#fff', padding: '18px', boxShadow: '0 12px 28px rgba(7,90,159,0.22)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>Level 0 - Finished Good</div>
              <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '8px' }}>{finishedGood || 'Finished Product'}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: 900, color: '#0f5cab' }}>--&gt;</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', gap: '12px' }}>
              {componentRows.map((row, index) => (
                <div key={`${row.itemCode || row.itemName}-${index}`} style={{ borderRadius: '14px', background: '#fff', border: '1px solid #dbeafe', padding: '12px', boxShadow: '0 8px 20px rgba(15, 92, 171, 0.08)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 900, color: '#2563eb', textTransform: 'uppercase' }}>Level 1 - RM / Component</div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{row.itemName || row.itemCode}</div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Qty: {row.quantity || 0} {row.uom || ''}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '18px', padding: '12px 14px', borderRadius: '12px', background: '#e0f2fe', color: '#075985', fontSize: '12px', fontWeight: 800 }}>
            MRP logic: Sales Order Qty x BOM component Qty - Available Stock = Shortage Qty. Shortage Qty becomes Purchase Request.
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export default function ProcessFormPage({ processType, poMode = '' }) {
  const config = PROCESS_CONFIG[processType]
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const storeProcessTypes = ['general-dc', 'iar', 'rai', 'jo-inward', 'supplier-invoice']
  const isStoreDocument = storeProcessTypes.includes(processType)
  const isSalesOrder = processType === 'so'
  const isPurchaseRequest = processType === 'pr'
  const isPurchaseOrder = processType === 'po'
  const [poCreationType, setPoCreationType] = useState(poMode === 'without-pr' ? 'without-pr' : 'with-pr')
  const isPoWithPr = isPurchaseOrder && poCreationType === 'with-pr'
  const isPoWithoutPr = isPurchaseOrder && poCreationType === 'without-pr'
  const isFinancialItemTable = processType === 'po' || isStoreDocument
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])
  const [sources, setSources] = useState([])
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [saving, setSaving] = useState(false)
  const [flowLoading, setFlowLoading] = useState(false)
  const [flowResult, setFlowResult] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    documentNo: '',
    documentDate: today(),
    referenceNo: '',
    referenceDate: '',
    customerId: '',
    supplierId: '',
    orderNumber: '',
    orderType: processType === 'po' || processType === 'pr' ? 'Purchase Order' : '',
    department: '',
    budgetHead: '',
    materialPlanning: '',
    planningQuantity: false,
    initiatedBy: '',
    targetDate: today(),
    status: 'Open',
    approvalStatus: 'Pending',
    remarks: '',
    poType: 'Regular',
    financialYear: 'April-2025-March-2026',
    internalPONumber: '',
    contactPerson: '',
    deliveryAddress: '',
    discountAmount: '0',
    conversionRate: '1.000000',
    additionalAmount: '0',
    roundOff: '0',
    termsAndConditions: '',
    selectedPrIds: [],
    bomItemId: '',
    bomItemCode: '',
    bomItemName: '',
    schedule: '',
    billingBreakup: '',
    drawingNo: '',
    specification: '',
    revision: '',
  })
  const [rows, setRows] = useState([blankItem()])

  useEffect(() => {
    async function loadMasters() {
      const itemTypeFilter = isSalesOrder ? 'Manufacturing Item' : ''
      const [customerRows, supplierRows, itemRows, sourceRows, prRows] = await Promise.all([
        getCustomers().catch(() => []),
        getSuppliers().catch(() => []),
        getItems(itemTypeFilter).catch(() => []),
        getProcessSourceOptions(processType).catch(() => []),
        isPurchaseOrder ? getProcessDocuments('pr').catch(() => []) : Promise.resolve([]),
      ])
      setCustomers(customerRows || [])
      setSuppliers(supplierRows || [])
      setItems(itemRows || [])
      setSources(sourceRows || [])
      setPurchaseRequests(prRows || [])
    }

    loadMasters()
  }, [isPurchaseOrder, isSalesOrder, processType])

  useEffect(() => {
    async function loadDocument() {
      try {
        setError('')
        if (isEdit) {
          const row = await getProcessDocumentById(processType, id)
          if (processType === 'po') {
            setPoCreationType(row.extra_data?.selectedPrIds?.length ? 'with-pr' : 'without-pr')
          }
          setForm({
            documentNo: row.document_no || '',
            documentDate: row.document_date || today(),
            referenceNo: row.reference_no || '',
            referenceDate: row.reference_date || '',
            customerId: row.customer_id || '',
            supplierId: row.supplier_id || '',
            orderNumber: row.order_number || '',
            orderType: row.order_type || '',
            department: row.department || '',
            budgetHead: row.budget_head || '',
            materialPlanning: row.material_planning || '',
            planningQuantity: Boolean(row.planning_quantity),
            initiatedBy: row.initiated_by || '',
            targetDate: row.target_date || today(),
            status: row.status || 'Open',
            approvalStatus: row.approval_status || 'Pending',
            remarks: row.remarks || '',
            poType: row.extra_data?.poType || row.order_type || 'Regular',
            financialYear: row.extra_data?.financialYear || 'April-2025-March-2026',
            internalPONumber: row.extra_data?.internalPONumber || '',
            contactPerson: row.extra_data?.contactPerson || '',
            deliveryAddress: row.extra_data?.deliveryAddress || '',
            discountAmount: row.extra_data?.discountAmount || '0',
            conversionRate: row.extra_data?.conversionRate || '1.000000',
            additionalAmount: row.extra_data?.additionalAmount || '0',
            roundOff: row.extra_data?.roundOff || '0',
            termsAndConditions: row.extra_data?.termsAndConditions || '',
            selectedPrIds: row.extra_data?.selectedPrIds || [],
            bomItemId: row.extra_data?.bomItemId || '',
            bomItemCode: row.extra_data?.bomItemCode || '',
            bomItemName: row.extra_data?.bomItemName || '',
            schedule: row.extra_data?.schedule || '',
            billingBreakup: row.extra_data?.billingBreakup || '',
            drawingNo: row.extra_data?.drawingNo || '',
            specification: row.extra_data?.specification || '',
            revision: row.extra_data?.revision || '',
          })
          setRows(row.items?.length ? row.items.map(item => ({ ...blankItem(), ...item, itemId: item.itemId || '' })) : [blankItem()])
          return
        }

        const next = await getNextProcessNumber(processType)
        setForm(current => ({ ...current, documentNo: next.nextNumber || '' }))
      } catch (err) {
        setError(err.message || `Unable to load ${config.title}.`)
      }
    }

    loadDocument()
  }, [config.title, id, isEdit, processType])

  const customerOptions = customers.map(customer => ({ value: customer.id, label: `${customer.customer_code || 'CUS'} - ${customer.customer_name}` }))
  const supplierOptions = suppliers.map(supplier => ({ value: supplier.id, label: `${supplier.supplier_code || 'SUP'} - ${supplier.supplier_name}` }))
  const itemOptions = items.map(item => ({ value: item.id, label: `${item.item_code || 'ITM'} - ${item.item_name}` }))
  const sourceOptions = sources.map(source => ({ value: source.document_no, label: `${String(source.process_type || '').toUpperCase()} - ${source.document_no}` }))

  const openPurchaseRequests = purchaseRequests.filter(pr => String(pr.status || 'Open').toLowerCase() !== 'closed')
  const selectedPrRecords = openPurchaseRequests.filter(pr => form.selectedPrIds.includes(String(pr.id)))
  const selectedPrKey = form.selectedPrIds.join('|')
  const totalQty = useMemo(() => rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0), [rows])
  const totalWeight = useMemo(() => rows.reduce((sum, row) => sum + Number(row.totalWeight || 0), 0), [rows])
  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0) - Number(form.discountAmount || 0), [form.discountAmount, rows])

  useEffect(() => {
    if (!isPoWithPr || isEdit) return
    if (selectedPrRecords.length === 0) {
      setRows([blankItem()])
      return
    }

    const prItems = selectedPrRecords.flatMap(pr => (
      (pr.items || []).map(item => ({
        ...blankItem(),
        itemId: item.itemId || item.item_id || '',
        itemCode: item.itemCode || item.item_code || '',
        itemName: item.itemName || item.item_name || '',
        description: item.description || '',
        quantity: item.quantity || '',
        uom: item.uom || '',
        remarks: `From ${pr.document_no}`,
      }))
    ))

    if (prItems.length) setRows(prItems)
  }, [isEdit, isPoWithPr, selectedPrKey])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const changePoCreationType = (value) => {
    setPoCreationType(value)
    setForm(current => ({ ...current, selectedPrIds: [] }))
    setRows([blankItem()])
  }

  const updateRow = (index, key, value) => {
    setRows(current => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      const next = { ...row, [key]: value }
      if (key === 'itemId') {
        const selected = items.find(item => String(item.id) === String(value))
        if (selected) {
          next.itemCode = selected.item_code || ''
          next.itemName = selected.item_name || ''
          next.uom = selected.uom || ''
          next.availableStockQty = selected.current_stock || selected.opening_stock || '0'
        }
      }
      if (key === 'quantity' || key === 'weight') {
        next.totalWeight = String((Number(next.quantity || 0) * Number(next.weight || 0)).toFixed(3))
      }
      if (['quantity', 'unitPrice', 'discountType', 'discountValue', 'taxPercent'].includes(key)) {
        const qty = Number(next.quantity || 0)
        const price = Number(next.unitPrice || 0)
        const discount = Number(next.discountValue || 0)
        const taxPercent = Number(next.taxPercent || 0)
        let amount = qty * price
        amount = next.discountType === 'Percentage' ? amount - ((amount * discount) / 100) : amount - discount
        const taxValue = (amount * taxPercent) / 100
        next.amount = amount.toFixed(2)
        next.taxValue = taxValue.toFixed(2)
        next.totalAmount = (amount + taxValue).toFixed(2)
      }
      return next
    }))
  }

  const addRow = () => setRows(current => [...current, blankItem()])
  const removeRow = index => setRows(current => current.length === 1 ? [blankItem()] : current.filter((_, rowIndex) => rowIndex !== index))

  const selectBomFinishedGood = (value) => {
    const selected = items.find(item => String(item.id) === String(value))
    setForm(current => ({
      ...current,
      bomItemId: value,
      bomItemCode: selected?.item_code || '',
      bomItemName: selected?.item_name || current.bomItemName,
    }))
  }

  const loadDemoBom = () => {
    setForm(current => ({
      ...current,
      bomItemName: current.bomItemName || 'FG-BICYCLE / Bicycle Assembly',
      department: current.department || 'Production',
      specification: current.specification || 'Demo FG to RM BOM cycle for MRP testing',
    }))
    setRows(demoBomRows())
  }

  const handleSave = async () => {
    if (!form.documentNo || !form.documentDate) {
      setError(`${config.numberLabel} and Date are required.`)
      return
    }
    if (isPoWithPr && form.selectedPrIds.length === 0) {
      setError('Select at least one open Purchase Request.')
      return
    }
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const payload = {
        ...form,
        orderType: isPurchaseOrder ? form.poType : isPurchaseRequest ? '' : form.orderType,
        supplierId: isSalesOrder || isPurchaseRequest ? '' : form.supplierId,
        customerId: isPurchaseRequest ? '' : form.customerId,
        status: isPurchaseRequest && !isEdit ? 'Open' : form.status,
        approvalStatus: isPurchaseRequest ? '' : form.approvalStatus,
        planningQuantity: isPurchaseRequest ? false : form.planningQuantity,
        extraData: {
          financialYear: form.financialYear,
          poType: form.poType,
          poCreationType,
          internalPONumber: form.internalPONumber,
          contactPerson: form.contactPerson,
          deliveryAddress: form.deliveryAddress,
          discountAmount: form.discountAmount,
          conversionRate: form.conversionRate,
          additionalAmount: form.additionalAmount,
          roundOff: form.roundOff,
          termsAndConditions: form.termsAndConditions,
          selectedPrIds: form.selectedPrIds,
          prNumbers: selectedPrRecords.map(pr => pr.document_no),
          bomItemId: form.bomItemId,
          bomItemCode: form.bomItemCode,
          bomItemName: form.bomItemName,
          finishedItemName: form.bomItemName,
          schedule: form.schedule,
          billingBreakup: form.billingBreakup,
          drawingNo: form.drawingNo,
          specification: form.specification,
          revision: form.revision,
        },
        items: rows,
      }
      const result = isEdit
        ? await updateProcessDocument(processType, id, payload)
        : await createProcessDocument(processType, payload)
      setSuccess(result.message || 'Saved successfully.')
      if (!isEdit) navigate(`/process/${processType}/${result.document.id}`)
    } catch (err) {
      setError(err.message || `Unable to save ${config.title}.`)
    } finally {
      setSaving(false)
    }
  }

  const handleRunMrp = async () => {
    try {
      setFlowLoading(true)
      setError('')
      setSuccess('')
      const result = await runSalesOrderMrp(id)
      setFlowResult(result)
      const prText = result.purchaseRequest ? ` and PR ${result.purchaseRequest.document_no}` : ''
      setSuccess(`MRP ${result.mrp?.document_no || ''}${prText} generated successfully.`)
    } catch (err) {
      setError(err.message || 'Unable to run MRP for this Sales Order.')
    } finally {
      setFlowLoading(false)
    }
  }

  const handleGenerateWorkOrder = async () => {
    try {
      setFlowLoading(true)
      setError('')
      setSuccess('')
      const result = processType === 'so'
        ? await generateWorkOrderFromSalesOrder(id)
        : processType === 'bom'
          ? await generateWorkOrderFromBom(id)
          : await generateWorkOrderFromMrp(id)
      setFlowResult(result)
      setSuccess(`Work Order ${result.workOrder?.document_no || ''} generated successfully.`)
    } catch (err) {
      setError(err.message || 'Unable to generate Work Order.')
    } finally {
      setFlowLoading(false)
    }
  }

  const flowActions = (
    <>
      {isEdit && processType === 'so' && (
        <button type="button" className="btn-primary" onClick={handleRunMrp} disabled={flowLoading}>
          <GitBranch size={14} /> {flowLoading ? 'Running MRP...' : 'Run MRP'}
        </button>
      )}
      {isEdit && ['so', 'bom', 'mrp'].includes(processType) && (
        <button type="button" className="btn-primary" onClick={handleGenerateWorkOrder} disabled={flowLoading}>
          <Factory size={14} /> {flowLoading ? 'Generating WO...' : 'Generate Work Order'}
        </button>
      )}
      <ActionButtons
        onSave={handleSave}
        onCancel={() => navigate(`/process/${processType}`)}
        saveLabel={saving ? 'Saving...' : `Save ${config.title}`}
        loading={saving}
      />
    </>
  )

  return (
    <PageContainer
      title={isEdit ? `Edit ${config.title}` : config.createTitle}
      subtitle={config.subtitle}
      showBackButton
      backPath={`/process/${processType}`}
      actions={flowActions}
    >
      <div className="card p-0 overflow-hidden mb-4" style={{ border: '1px solid #d7e8ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', fontFamily: 'Sora, sans-serif' }}>{config.createTitle}</div>
            <div style={{ fontSize: '12px', color: '#dbeafe', fontWeight: '600', marginTop: '2px' }}>Auto number, DB linked source selection, item planning and status flow</div>
          </div>
        </div>
      </div>

      {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
      {success && <div className="card p-3 mb-4 text-sm font-bold text-green-700 bg-green-50 border border-green-100">{success}</div>}
      {flowResult && (
        <div className="card p-4 mb-4 border border-blue-100 bg-blue-50">
          <div className="text-sm font-black text-blue-900 mb-2">Generated ERP Flow</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {flowResult.mrp && <div><b>MRP:</b> {flowResult.mrp.document_no}</div>}
            {flowResult.purchaseRequest && <div><b>Purchase Request:</b> {flowResult.purchaseRequest.document_no}</div>}
            {flowResult.workOrder && <div><b>Work Order:</b> {flowResult.workOrder.document_no}</div>}
            {flowResult.analysis && <div><b>Material Lines:</b> {flowResult.analysis.length}</div>}
          </div>
        </div>
      )}

      {isPurchaseOrder && (
        <SectionCard title="Purchase Order Creation Type" icon={ClipboardList}>
          <FormGrid cols={2}>
            <SelectDropdown
              label="Create PO"
              required
              value={poCreationType}
              onChange={event => changePoCreationType(event.target.value)}
              options={[
                { value: 'with-pr', label: 'With Purchase Request' },
                { value: 'without-pr', label: 'Without Purchase Request' },
              ]}
              disabled={isEdit}
            />
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-800">
              {isPoWithPr
                ? 'Select an open PR. Item and quantity details load automatically.'
                : 'Enter supplier, item, quantity, price and tax details manually.'}
            </div>
          </FormGrid>
        </SectionCard>
      )}

      {!isPoWithoutPr && (
      <SectionCard title={processType === 'po' ? 'Purchase Order Selection' : processType === 'bom' ? 'BOM Information' : isSalesOrder ? 'Sales Order Reference' : 'Order / MRP Information'} icon={ClipboardList}>
        <FormGrid cols={2}>
          {isStoreDocument ? (
            <>
              <SelectDropdown label="Entry Type" value={form.orderType} onChange={event => set('orderType', event.target.value)} options={PROCESS_ORDER_TYPES} placeholder="Please Select" />
              <FormInput label="Conversion Rate" type="number" value={form.conversionRate} onChange={event => set('conversionRate', event.target.value)} />
              <SelectDropdown label={config.sourceLabel} value={form.orderNumber} onChange={event => set('orderNumber', event.target.value)} options={sourceOptions} placeholder="Search pending reference" />
              <FormInput label="Reference No" value={form.referenceNo} onChange={event => set('referenceNo', event.target.value)} />
              <FormInput label="Reference Date" type="date" value={form.referenceDate} onChange={event => set('referenceDate', event.target.value)} />
            </>
          ) : processType === 'bom' ? (
            <>
              <SelectDropdown label="Order Number" value={form.orderNumber} onChange={event => set('orderNumber', event.target.value)} options={sourceOptions} placeholder="Please Select" />
              <FormInput label="BOM FG Item Code" value={form.bomItemCode} onChange={event => set('bomItemCode', event.target.value)} placeholder="Auto from selected FG item" />
              <SelectDropdown label="Item" value={form.bomItemId} onChange={event => selectBomFinishedGood(event.target.value)} options={itemOptions} placeholder="Select finished product from item master" />
              <FormInput label="BOM Item Name" required value={form.bomItemName} onChange={event => set('bomItemName', event.target.value)} placeholder="Finished product / assembly name" />
              <FormInput label="Schedule" value={form.schedule} onChange={event => set('schedule', event.target.value)} placeholder="Please Select" />
              <SelectDropdown label="Department" value={form.department} onChange={event => set('department', event.target.value)} options={PROCESS_DEPARTMENTS} placeholder="Please Select" />
              <FormInput label="Billing Breakup" value={form.billingBreakup} onChange={event => set('billingBreakup', event.target.value)} placeholder="Please Select" />
              <FormInput label="Drawing Number" value={form.drawingNo} onChange={event => set('drawingNo', event.target.value)} />
              <FormInput label="Specification" value={form.specification} onChange={event => set('specification', event.target.value)} />
              <FormInput label="Revision" value={form.revision} onChange={event => set('revision', event.target.value)} />
              <button type="button" className="btn-secondary self-end" onClick={loadDemoBom}>
                <GitBranch size={14} /> Load Demo BOM
              </button>
            </>
          ) : isPurchaseOrder ? (
            <>
              <SelectDropdown label="Financial Year" value={form.financialYear} onChange={event => set('financialYear', event.target.value)} options={['April-2025-March-2026', 'April-2026-March-2027']} />
              <SelectDropdown label="PO Type" value={form.poType} onChange={event => set('poType', event.target.value)} options={PO_TYPES} />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 pt-6">
                <input
                  type="checkbox"
                  checked={openPurchaseRequests.length > 0 && form.selectedPrIds.length === openPurchaseRequests.length}
                  onChange={event => set('selectedPrIds', event.target.checked ? openPurchaseRequests.map(pr => String(pr.id)) : [])}
                />
                To Select All
              </label>
            </>
          ) : (
            <>
              <SelectDropdown label={config.sourceLabel} value={form.orderNumber} onChange={event => set('orderNumber', event.target.value)} options={sourceOptions} placeholder="Please Select" />
              <FormInput label="Budget Head" value={form.budgetHead} onChange={event => set('budgetHead', event.target.value)} placeholder="Please Select" />
              {!isSalesOrder && <FormInput label="Material Planning" value={form.materialPlanning} onChange={event => set('materialPlanning', event.target.value)} placeholder="Please Select" />}
            </>
          )}
        </FormGrid>
        {isPoWithPr && (
          <div className="mt-6">
            {['Other', 'Common'].map((group, groupIndex) => (
              <div key={group} className="mb-4">
                <div className="px-4 py-3 text-sm font-bold text-green-700" style={{ background: '#dff3d8' }}>{group}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-2">
                  {openPurchaseRequests.slice(groupIndex === 0 ? 0 : 1, groupIndex === 0 ? 1 : 13).map((pr) => {
                    const selected = form.selectedPrIds.includes(String(pr.id))
                    return (
                      <label key={pr.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                        <span>{pr.document_no} /UNIT-1/ {pr.reference_no || ''}</span>
                        <span className="flex items-center gap-2">
                          <span className="rounded bg-blue-500 px-2 py-0.5 text-xs font-black text-white">{pr.item_count || 1}</span>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={event => set('selectedPrIds', event.target.checked ? [...form.selectedPrIds, String(pr.id)] : form.selectedPrIds.filter(value => value !== String(pr.id)))}
                          />
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      )}

      <SectionCard title={`${config.title} Information`} icon={Save}>
        <FormGrid cols={2}>
          <FormInput label={config.numberLabel} required value={form.documentNo} onChange={event => set('documentNo', event.target.value)} />
          <FormInput label="Date" required type="date" value={form.documentDate} onChange={event => set('documentDate', event.target.value)} />
          {!isPurchaseRequest && <SelectDropdown label={isPurchaseOrder ? 'Vendor' : 'Customer'} value={isPurchaseOrder ? form.supplierId : form.customerId} onChange={event => isPurchaseOrder ? set('supplierId', event.target.value) : set('customerId', event.target.value)} options={isPurchaseOrder ? supplierOptions : customerOptions} placeholder={isPurchaseOrder ? 'Enter Vendor Name' : 'Please Select'} required={isPurchaseOrder} />}
          {!isPurchaseOrder && !isSalesOrder && !isPurchaseRequest && <SelectDropdown label="Supplier" value={form.supplierId} onChange={event => set('supplierId', event.target.value)} options={supplierOptions} placeholder="Please Select" />}
          {isPoWithoutPr && <SelectDropdown label="PO Type" value={form.poType} onChange={event => set('poType', event.target.value)} options={PO_TYPES} />}
          {isPurchaseOrder && <FormInput label="Internal PO Number" value={form.internalPONumber} onChange={event => set('internalPONumber', event.target.value)} placeholder="Enter Internal PO Number" />}
          {isPurchaseOrder && <FormInput label="Contact Person" value={form.contactPerson} onChange={event => set('contactPerson', event.target.value)} placeholder="Employee Name" />}
          {isPurchaseOrder && <SelectDropdown label="Delivery Address" value={form.deliveryAddress} onChange={event => set('deliveryAddress', event.target.value)} options={['Factory', 'Stores', 'Vendor Direct', 'Customer Site']} placeholder="Please Select" />}
          <FormInput label={isSalesOrder ? 'Customer PO Number' : 'Reference No'} value={form.referenceNo} onChange={event => set('referenceNo', event.target.value)} />
          <FormInput label={isSalesOrder ? 'Customer PO Date' : 'Reference Date'} type="date" value={form.referenceDate} onChange={event => set('referenceDate', event.target.value)} />
          <SelectDropdown label="Department" value={form.department} onChange={event => set('department', event.target.value)} options={PROCESS_DEPARTMENTS} placeholder="Please Select" />
          {!isPurchaseOrder && !isPurchaseRequest && <SelectDropdown label="Order Type" value={form.orderType} onChange={event => set('orderType', event.target.value)} options={PROCESS_ORDER_TYPES} placeholder="Please Select" />}
          <FormInput label="Initiated By" value={form.initiatedBy} onChange={event => set('initiatedBy', event.target.value)} />
          <FormInput label="Target Date" type="date" value={form.targetDate} onChange={event => set('targetDate', event.target.value)} />
          {!isPurchaseRequest && <SelectDropdown label="Status" value={form.status} onChange={event => set('status', event.target.value)} options={PROCESS_STATUS} />}
          {!isPurchaseRequest && <SelectDropdown label="Approval Status" value={form.approvalStatus} onChange={event => set('approvalStatus', event.target.value)} options={PROCESS_APPROVAL_STATUS} />}
          {!isPurchaseRequest && <label className="flex items-center gap-2 text-sm font-bold text-slate-700 pt-6">
            <input type="checkbox" checked={form.planningQuantity} onChange={event => set('planningQuantity', event.target.checked)} />
            Planning Quantity
          </label>}
        </FormGrid>
      </SectionCard>

      <SectionCard title="Product / Material Information" icon={ClipboardList}>
        <div className="overflow-x-auto">
          <table className="w-full border border-blue-100 rounded-xl overflow-hidden">
            <thead>
              <tr style={{ background: '#075a9f', color: '#fff' }}>
                {(isFinancialItemTable
                  ? ['S.No', 'Item', 'Item Description', 'Qty', 'UoM', 'Unit Price', 'Discount Type', 'Discount Value', 'Tax Name', 'Tax %', 'Tax Value', 'Amount', 'Total Amount', 'Remarks', '-']
                  : ['S.No', 'Material Item', 'Description', 'Quantity', 'UoM', 'Weight', 'Total Weight', 'Reservation Qty', ...(!isSalesOrder ? ['Location / Qty', 'Available Stock Qty'] : []), 'Due Date', ...(!isSalesOrder ? ['Status'] : []), 'Remarks', '-']
                ).map(head => (
                  <th key={head} className="text-left text-xs font-black p-3 border-r border-blue-200">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-blue-50 align-top">
                  <td className="p-2 text-sm">{index + 1}</td>
                  <td className="p-2 min-w-64">
                    <select className="form-select" value={row.itemId || ''} onChange={event => updateRow(index, 'itemId', event.target.value)} disabled={isPoWithPr}>
                      <option value="">Enter / Select Material Item</option>
                      {itemOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <input className="form-input mt-2" value={row.itemName || ''} onChange={event => updateRow(index, 'itemName', event.target.value)} placeholder="Manual item name" readOnly={isPoWithPr} />
                  </td>
                  <td className="p-2 min-w-44"><input className="form-input" value={row.description || ''} onChange={event => updateRow(index, 'description', event.target.value)} readOnly={isPoWithPr} /></td>
                  <td className="p-2 min-w-28"><input className="form-input" type="number" value={row.quantity || ''} onChange={event => updateRow(index, 'quantity', event.target.value)} readOnly={isPoWithPr} /></td>
                  <td className="p-2 min-w-24"><input className="form-input" value={row.uom || ''} onChange={event => updateRow(index, 'uom', event.target.value)} readOnly={isPoWithPr} /></td>
                  {isFinancialItemTable ? (
                    <>
                      <td className="p-2 min-w-28"><input className="form-input" type="number" value={row.unitPrice || ''} onChange={event => updateRow(index, 'unitPrice', event.target.value)} /></td>
                      <td className="p-2 min-w-32"><select className="form-select" value={row.discountType || 'Amount'} onChange={event => updateRow(index, 'discountType', event.target.value)}><option>Amount</option><option>Percentage</option></select></td>
                      <td className="p-2 min-w-28"><input className="form-input" type="number" value={row.discountValue || ''} onChange={event => updateRow(index, 'discountValue', event.target.value)} /></td>
                      <td className="p-2 min-w-32"><select className="form-select" value={row.taxName || 'CGST'} onChange={event => updateRow(index, 'taxName', event.target.value)}>{TAX_NAMES.map(tax => <option key={tax}>{tax}</option>)}</select></td>
                      <td className="p-2 min-w-24"><input className="form-input" type="number" value={row.taxPercent || ''} onChange={event => updateRow(index, 'taxPercent', event.target.value)} /></td>
                      <td className="p-2 min-w-28"><input className="form-input" value={row.taxValue || ''} readOnly /></td>
                      <td className="p-2 min-w-28"><input className="form-input" value={row.amount || ''} readOnly /></td>
                      <td className="p-2 min-w-32"><input className="form-input" value={row.totalAmount || ''} readOnly /></td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 min-w-24"><input className="form-input" type="number" value={row.weight || ''} onChange={event => updateRow(index, 'weight', event.target.value)} /></td>
                      <td className="p-2 min-w-28"><input className="form-input" value={row.totalWeight || ''} readOnly /></td>
                      <td className="p-2 min-w-32"><input className="form-input" type="number" value={row.reservationQty || ''} onChange={event => updateRow(index, 'reservationQty', event.target.value)} /></td>
                      {!isSalesOrder && <td className="p-2 min-w-40"><input className="form-input" value={row.locationQty || ''} onChange={event => updateRow(index, 'locationQty', event.target.value)} placeholder="Store 2 / Qty" /></td>}
                      {!isSalesOrder && <td className="p-2 min-w-28"><input className="form-input" value={row.availableStockQty || ''} onChange={event => updateRow(index, 'availableStockQty', event.target.value)} /></td>}
                      <td className="p-2 min-w-36"><input className="form-input" type="date" value={row.dueDate || ''} onChange={event => updateRow(index, 'dueDate', event.target.value)} /></td>
                      {!isSalesOrder && <td className="p-2 min-w-32">
                        <select className="form-select" value={row.status || 'Open'} onChange={event => updateRow(index, 'status', event.target.value)}>
                          {PROCESS_STATUS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </td>}
                    </>
                  )}
                  <td className="p-2 min-w-40"><input className="form-input" value={row.remarks || ''} onChange={event => updateRow(index, 'remarks', event.target.value)} /></td>
                  <td className="p-2">
                    {!isPoWithPr && <button type="button" className="btn-danger" onClick={() => removeRow(index)}><Trash2 size={13} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 font-black">
                <td className="p-3" colSpan={3}>Total</td>
                <td className="p-3">{totalQty.toFixed(2)}</td>
                <td className="p-3" colSpan={2}></td>
            <td className="p-3">{isFinancialItemTable ? `Rs.${totalAmount.toFixed(2)}` : totalWeight.toFixed(3)}</td>
                <td className="p-3" colSpan={7}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!isPoWithPr && <button type="button" className="btn-secondary mt-4" onClick={addRow}><Plus size={14} /> Add Material Item</button>}
        {isFinancialItemTable && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl ml-auto">
            <FormInput label="Discount (Amt)" type="number" value={form.discountAmount} onChange={event => set('discountAmount', event.target.value)} />
            <FormInput label="Additional Amount" type="number" value={form.additionalAmount} onChange={event => set('additionalAmount', event.target.value)} />
            <FormInput label="Round Off" type="number" value={form.roundOff} onChange={event => set('roundOff', event.target.value)} />
            <FormInput label="Net Amount" value={(totalAmount + Number(form.additionalAmount || 0) + Number(form.roundOff || 0)).toFixed(2)} readOnly />
          </div>
        )}
      </SectionCard>

      {processType === 'bom' && (
        <BomFlowDiagram finishedGood={form.bomItemName} rows={rows} />
      )}

      <SectionCard title="Remarks" icon={ClipboardList}>
        <Textarea rows={4} value={form.remarks} onChange={event => set('remarks', event.target.value)} placeholder="General remark / approval note / production instruction..." />
        {isFinancialItemTable && (
          <div className="mt-4">
            <Textarea rows={4} value={form.termsAndConditions} onChange={event => set('termsAndConditions', event.target.value)} placeholder="Terms and conditions / delivery schedule / supplier note..." />
          </div>
        )}
      </SectionCard>
    </PageContainer>
  )
}
