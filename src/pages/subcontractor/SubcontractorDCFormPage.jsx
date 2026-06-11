import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Package, Plus, Save, Trash2, Truck } from 'lucide-react'
import { ActionButtons, FormGrid, FormInput, PageContainer, SectionCard, SelectDropdown, Textarea } from '../../components/ui'
import {
  createSubcontractorDC,
  getItems,
  getNextSubcontractorDCNumber,
  getProcessDocuments,
  getSubcontractorDCById,
  getSubcontractors,
  updateSubcontractorDC,
} from '../../lib/api'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function blankRow() {
  return {
    itemId: '',
    itemCode: '',
    itemName: '',
    uom: '',
    availableStock: '0',
    issueQty: '',
    returnedQty: '0',
    acceptedQty: '0',
    rejectedQty: '0',
    pendingQty: '0',
    rate: '0',
    amount: '0',
    batchNo: '',
    location: '',
    remarks: '',
  }
}

export default function SubcontractorDCFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [subcontractors, setSubcontractors] = useState([])
  const [items, setItems] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [rows, setRows] = useState([blankRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    dcNo: '',
    dcDate: today(),
    dcType: 'Returnable',
    subcontractorId: '',
    workOrderNo: '',
    processName: '',
    referenceNo: '',
    vehicleNo: '',
    transportMode: '',
    returnDate: '',
    ewayBillNo: '',
    status: 'Open',
    remarks: '',
  })

  useEffect(() => {
    async function loadMasters() {
      try {
        const [subRows, itemRows, woRows] = await Promise.all([
          getSubcontractors().catch(() => []),
          getItems().catch(() => []),
          getProcessDocuments('wo').catch(() => []),
        ])
        setSubcontractors(subRows || [])
        setItems(itemRows || [])
        setWorkOrders(woRows || [])
      } catch (err) {
        setError(err.message || 'Unable to load SubContractor DC masters.')
      }
    }
    loadMasters()
  }, [])

  useEffect(() => {
    async function load() {
      try {
        setError('')
        if (isEdit) {
          const row = await getSubcontractorDCById(id)
          setForm({
            dcNo: row.dcNo || '',
            dcDate: row.dcDate || today(),
            dcType: row.dcType || 'Returnable',
            subcontractorId: row.subcontractorId ? String(row.subcontractorId) : '',
            workOrderNo: row.workOrderNo || '',
            processName: row.processName || '',
            referenceNo: row.referenceNo || '',
            vehicleNo: row.vehicleNo || '',
            transportMode: row.transportMode || '',
            returnDate: row.returnDate || '',
            ewayBillNo: row.ewayBillNo || '',
            status: row.status || 'Open',
            remarks: row.remarks || '',
          })
          setRows(row.items?.length ? row.items.map(item => ({ ...blankRow(), ...item, itemId: String(item.itemId || '') })) : [blankRow()])
          return
        }
        const next = await getNextSubcontractorDCNumber()
        setForm(current => ({ ...current, dcNo: next.nextNumber || 'SCDC-0001' }))
      } catch (err) {
        setError(err.message || 'Unable to load SubContractor DC.')
      }
    }
    load()
  }, [id, isEdit])

  const subcontractorOptions = useMemo(() => subcontractors.map(row => ({
    value: String(row.id),
    label: `${row.code} - ${row.name}`,
  })), [subcontractors])

  const itemOptions = useMemo(() => items.map(item => ({
    value: String(item.id),
    label: `${item.item_code || 'ITM'} - ${item.item_name}`,
  })), [items])

  const workOrderOptions = useMemo(() => workOrders.map(row => ({
    value: row.document_no,
    label: `${row.document_no} - ${row.order_number || row.status || ''}`,
  })), [workOrders])

  const processOptions = useMemo(() => {
    const selectedWorkOrder = workOrders.find(row => row.document_no === form.workOrderNo)
    const names = new Set()
    ;(selectedWorkOrder?.items || []).forEach(item => {
      if (item.processName) names.add(item.processName)
      if (item.process_name) names.add(item.process_name)
      if (item.remarks) names.add(item.remarks)
    })
    ;(selectedWorkOrder?.extra_data?.processFlow || []).forEach(row => {
      if (row.processName) names.add(row.processName)
    })
    return Array.from(names).filter(Boolean)
  }, [form.workOrderNo, workOrders])

  const totalIssueQty = rows.reduce((sum, row) => sum + Number(row.issueQty || 0), 0)
  const totalReturnedQty = rows.reduce((sum, row) => sum + Number(row.returnedQty || 0), 0)
  const totalPendingQty = rows.reduce((sum, row) => sum + Number(row.pendingQty || 0), 0)
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  function loadDemoFlow() {
    const firstSubcontractor = subcontractors[0]
    const firstWorkOrder = workOrders[0]
    const firstItem = items[0]
    const secondItem = items[1] || items[0]

    setForm(current => ({
      ...current,
      dcType: 'Returnable',
      subcontractorId: firstSubcontractor ? String(firstSubcontractor.id) : current.subcontractorId,
      workOrderNo: firstWorkOrder?.document_no || current.workOrderNo || 'WO-DEMO-001',
      processName: 'Machining',
      referenceNo: 'JOBWORK-DEMO-001',
      vehicleNo: 'TN38AB1234',
      transportMode: 'Own Vehicle',
      ewayBillNo: 'EWB-DEMO-001',
      status: 'Open',
      remarks: 'Demo flow: material issued to subcontractor for machining and return tracking.',
    }))

    const demoRows = [
      {
        ...blankRow(),
        itemId: firstItem ? String(firstItem.id) : '',
        itemCode: firstItem?.item_code || 'RM-DEMO-001',
        itemName: firstItem?.item_name || 'Raw Material Demo Item',
        uom: firstItem?.uom || 'NOS',
        availableStock: firstItem?.current_stock || firstItem?.opening_stock || '100',
        issueQty: '10',
        returnedQty: '4',
        acceptedQty: '4',
        rejectedQty: '0',
        pendingQty: '6.000',
        rate: firstItem?.purchase_rate || firstItem?.sales_rate || '50',
        amount: String((10 * Number(firstItem?.purchase_rate || firstItem?.sales_rate || 50)).toFixed(2)),
        batchNo: 'BATCH-DEMO-01',
        location: 'Store 1 / Rack A',
        remarks: 'Issued for outside machining',
      },
      {
        ...blankRow(),
        itemId: secondItem ? String(secondItem.id) : '',
        itemCode: secondItem?.item_code || 'RM-DEMO-002',
        itemName: secondItem?.item_name || 'Component Demo Item',
        uom: secondItem?.uom || 'KG',
        availableStock: secondItem?.current_stock || secondItem?.opening_stock || '250',
        issueQty: '5',
        returnedQty: '0',
        acceptedQty: '0',
        rejectedQty: '0',
        pendingQty: '5.000',
        rate: secondItem?.purchase_rate || secondItem?.sales_rate || '120',
        amount: String((5 * Number(secondItem?.purchase_rate || secondItem?.sales_rate || 120)).toFixed(2)),
        batchNo: 'BATCH-DEMO-02',
        location: 'Store 2 / Rack B',
        remarks: 'Pending return from subcontractor',
      },
    ].filter(row => row.itemId)

    setRows(demoRows.length ? demoRows : [blankRow()])
    setSuccess('Demo SubContractor DC flow loaded. Review quantities and save to post stock movement.')
    setError('')
  }

  function updateRow(index, key, value) {
    setRows(current => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      const next = { ...row, [key]: value }
      if (key === 'itemId') {
        const item = items.find(entry => String(entry.id) === String(value))
        next.itemCode = item?.item_code || ''
        next.itemName = item?.item_name || ''
        next.uom = item?.uom || ''
        next.availableStock = item?.current_stock || item?.opening_stock || '0'
        next.rate = item?.purchase_rate || item?.sales_rate || '0'
      }
      if (['issueQty', 'returnedQty', 'rate', 'itemId'].includes(key)) {
        const issue = Number(next.issueQty || 0)
        const returned = Number(next.returnedQty || 0)
        next.pendingQty = String(Math.max(issue - returned, 0).toFixed(3))
        next.amount = String((issue * Number(next.rate || 0)).toFixed(2))
      }
      return next
    }))
  }

  async function handleSave() {
    const cleanRows = rows.filter(row => row.itemId && Number(row.issueQty || 0) > 0)
    if (!form.dcNo || !form.dcDate || !form.subcontractorId || cleanRows.length === 0) {
      setError('DC No, DC Date, SubContractor, and at least one issue item are required.')
      setSuccess('')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const payload = {
        ...form,
        subcontractorId: Number(form.subcontractorId),
        items: cleanRows.map(row => ({
          ...row,
          itemId: Number(row.itemId),
          acceptedQty: row.returnedQty || '0',
          rejectedQty: '0',
        })),
      }
      const result = isEdit ? await updateSubcontractorDC(id, payload) : await createSubcontractorDC(payload)
      setSuccess(result.message || 'SubContractor DC saved successfully.')
      if (!isEdit) navigate(`/subcontractor/dc/${result.dc.id}`)
    } catch (err) {
      setError(err.message || 'Unable to save SubContractor DC.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer
      title={isEdit ? `Edit ${form.dcNo}` : 'Create SubContractor DC'}
      subtitle="WO based material issue, return tracking and stock movement"
      showBackButton
      backPath="/subcontractor/dc"
      actions={(
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="btn-secondary" onClick={loadDemoFlow}>Load Demo Flow</button>
          <ActionButtons onSave={handleSave} onCancel={() => navigate('/subcontractor/dc')} saveLabel={saving ? 'Saving...' : isEdit ? 'Update DC' : 'Save DC'} loading={saving} />
        </div>
      )}
    >
      {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
      {success && <div className="card p-3 mb-4 text-sm font-bold text-green-700 bg-green-50 border border-green-100">{success}</div>}

      <SectionCard title="DC Information" icon={Truck}>
        <FormGrid cols={2}>
          <FormInput label="DC No" required value={form.dcNo} onChange={event => set('dcNo', event.target.value.toUpperCase())} />
          <FormInput label="DC Date" required type="date" value={form.dcDate} onChange={event => set('dcDate', event.target.value)} />
          <SelectDropdown label="DC Type" value={form.dcType} onChange={event => set('dcType', event.target.value)} options={['Returnable', 'Non Returnable', 'Job Work']} />
          <SelectDropdown label="SubContractor" required value={form.subcontractorId} onChange={event => set('subcontractorId', event.target.value)} options={subcontractorOptions} placeholder="Select SubContractor" />
          <SelectDropdown label="Work Order" value={form.workOrderNo} onChange={event => set('workOrderNo', event.target.value)} options={workOrderOptions} placeholder="Select WO" />
          <SelectDropdown label="Process" value={form.processName} onChange={event => set('processName', event.target.value)} options={processOptions} placeholder="Select WO process" />
          <FormInput label="Reference Type / No" value={form.referenceNo} onChange={event => set('referenceNo', event.target.value)} placeholder="Type reference" />
          <FormInput label="Vehicle No" value={form.vehicleNo} onChange={event => set('vehicleNo', event.target.value.toUpperCase())} />
          <SelectDropdown label="Transport Mode" value={form.transportMode} onChange={event => set('transportMode', event.target.value)} options={['Road', 'Courier', 'Own Vehicle', 'Vendor Vehicle']} />
          <FormInput label="Return Date" type="date" value={form.returnDate} onChange={event => set('returnDate', event.target.value)} />
          <FormInput label="E-Way Bill No" value={form.ewayBillNo} onChange={event => set('ewayBillNo', event.target.value)} />
          <SelectDropdown label="Status" value={form.status} onChange={event => set('status', event.target.value)} options={['Open', 'Pending', 'Completed']} />
        </FormGrid>
      </SectionCard>

      <SectionCard title="Item Issue and Return Details" icon={Package}>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr>
                {['Item', 'UOM', 'Avail Stock', 'Issue Qty', 'Returned', 'Pending', 'Rate', 'Amount', 'Batch', 'Location', 'Remarks', 'Action'].map(header => (
                  <th key={header} className="table-th" style={{ minWidth: header === 'Item' ? 230 : 110 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="table-row">
                  <td className="table-td">
                    <select className="form-select" value={row.itemId} onChange={event => updateRow(index, 'itemId', event.target.value)}>
                      <option value="">Select Item</option>
                      {itemOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </td>
                  {[
                    ['uom', 'text', true],
                    ['availableStock', 'number', true],
                    ['issueQty', 'number'],
                    ['returnedQty', 'number'],
                    ['pendingQty', 'number', true],
                    ['rate', 'number'],
                    ['amount', 'number', true],
                    ['batchNo', 'text'],
                    ['location', 'text'],
                    ['remarks', 'text'],
                  ].map(([key, type, readOnly]) => (
                    <td key={key} className="table-td">
                      <input className="form-input" type={type} value={row[key] || ''} readOnly={readOnly} onChange={event => updateRow(index, key, event.target.value)} />
                    </td>
                  ))}
                  <td className="table-td">
                    <button type="button" className="btn-danger" style={{ padding: '7px 9px' }} onClick={() => setRows(current => current.length === 1 ? [blankRow()] : current.filter((_, rowIndex) => rowIndex !== index))}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn-primary mt-3" onClick={() => setRows(current => [...current, blankRow()])}>
          <Plus size={14} /> Add Item
        </button>
      </SectionCard>

      <SectionCard title="Summary and Remarks" icon={Save}>
        <FormGrid cols={2}>
          <FormInput label="Total Issue Qty" value={totalIssueQty.toFixed(3)} readOnly />
          <FormInput label="Total Returned Qty" value={totalReturnedQty.toFixed(3)} readOnly />
          <FormInput label="Total Pending Qty" value={totalPendingQty.toFixed(3)} readOnly />
          <FormInput label="Total Amount" value={totalAmount.toFixed(2)} readOnly />
        </FormGrid>
        <div className="mt-4">
          <Textarea label="Remarks" rows={3} value={form.remarks} onChange={event => set('remarks', event.target.value)} placeholder="Subcontractor DC instruction, return note, inspection note..." />
        </div>
      </SectionCard>
    </PageContainer>
  )
}
