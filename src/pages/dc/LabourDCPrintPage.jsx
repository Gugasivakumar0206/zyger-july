import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import logo from '../../assets/zyger-logo.svg'
import { MOCK_DC } from '../../data/mockData'
import { COMPANY_PROFILE } from '../print/companyProfile'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

export default function LabourDCPrintPage() {
  const { id } = useParams()

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(timer)
  }, [])

  const record = useMemo(() => {
    return MOCK_DC.find((row) => String(row.id) === String(id)) || MOCK_DC[0]
  }, [id])

  const company = COMPANY_PROFILE
  const itemRows = [
    {
      itemCode: record.referenceNumber || record.dcNumber,
      itemName: record.itemName || record.referenceNumber || record.dcNumber,
      hsn: record.hsnCode || '998898',
      sac: '',
      refDc: record.referenceNumber || '-',
      qty: record.qty || '1.00',
      uom: record.uom || 'NOS',
      remarks: record.modeOfTransport || 'BY ROAD',
    },
  ]
  const totalQty = itemRows.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const copyLabels = ['ORIGINAL COPY', 'DUPLICATE FOR TRANSPORTER']

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        body { margin: 0; background: #f3f4f6; font-family: Arial, sans-serif; }
        @media print {
          body { background: white; }
          .print-toolbar { display: none !important; }
          .print-shell { margin: 0 !important; box-shadow: none !important; }
          .print-copy + .print-copy { break-before: page; page-break-before: always; }
        }
      `}</style>

      <div className="print-toolbar" style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '16px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
          Print / Save PDF
        </button>
      </div>

      {copyLabels.map((copyLabel) => (
      <div key={copyLabel} className="print-shell print-copy" style={{ width: '840px', margin: '0 auto 24px', background: 'white', boxShadow: '0 12px 40px rgba(15,23,42,0.15)', border: '1px solid #d1d5db' }}>
        <div style={{ padding: '18px 22px' }}>
          <div style={{ textAlign: 'right', fontSize: '14px', marginBottom: '8px', fontWeight: 800 }}>{copyLabel}</div>
          <div style={{ border: '1px solid #111827', color: '#111827' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px', alignItems: 'center', padding: '10px 12px 14px', minHeight: '118px', borderBottom: '1px solid #111827' }}>
              <div style={{ width: '112px', height: '92px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logo} alt={company.logoAlt} style={{ width: '104px', height: '88px', objectFit: 'contain' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '0.4px' }}>{company.name}</div>
                <div style={{ fontSize: '13px', marginTop: '4px', lineHeight: 1.35 }}>{company.address}</div>
                <div style={{ fontSize: '14px', marginTop: '6px', fontWeight: 800 }}>
                  PAN No: {company.pan} , GSTIN: {company.gstin}
                </div>
                <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: 700 }}>
                  Email id : {company.email} &nbsp;&nbsp; Phone No : {company.phone}
                </div>
              </div>
              <div />
            </div>
            <div style={{ background: '#bde7f3', borderBottom: '1px solid #111827', textAlign: 'center', fontSize: '20px', fontWeight: 900, padding: '4px 0' }}>
              LABOUR DC
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', borderBottom: '1px solid #111827' }}>
              <div style={{ borderRight: '1px solid #111827', padding: '8px 10px', minHeight: '140px', fontSize: '14px', lineHeight: 1.35 }}>
                <div style={{ fontSize: '15px', fontWeight: 900 }}>To</div>
                <div style={{ marginTop: '2px' }}>
                  <strong>M/s. {record.customer || '-'}</strong>
                </div>
                <div style={{ marginTop: '6px' }}>{record.address || '#31-C1, Veerasandra Industrial Area, Hosur Road, Attibele Hobli, Anekal Taluk, Bengaluru, Karnataka - 560100'}</div>
                <div style={{ marginTop: '8px' }}><strong>Vendor Code :</strong> {record.vendorCode || '-'}</div>
                <div><strong>e-way Bill-No :</strong> {record.ewayBillNo || '-'}</div>
              </div>
              <div style={{ padding: 0 }}>
                {[
                  ['DC No.', record.dcNumber],
                  ['DC Date', formatDate(record.dcDate)],
                  ['Ref Po No', record.referenceNumber || '-'],
                  ['Ref Po Date', formatDate(record.dcDate)],
                  ['Mode of Transport', 'By Road'],
                  ['Vehicle No', '-'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #111827' }}>
                    <div style={{ padding: '7px 9px', fontWeight: 700, borderRight: '1px solid #111827' }}>{label}</div>
                    <div style={{ padding: '7px 9px', fontWeight: 800, color: label === 'DC No.' || label === 'DC Date' ? '#dc2626' : '#111827' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#bde7f3' }}>
                  <th style={{ border: '1px solid #111827', padding: '8px 6px', fontSize: '13px', fontWeight: 900, width: '62px' }}>S.No</th>
                  <th style={{ border: '1px solid #111827', padding: '8px 6px', fontSize: '13px', fontWeight: 900 }}>Particulars</th>
                  <th style={{ border: '1px solid #111827', padding: '8px 6px', fontSize: '13px', fontWeight: 900, width: '92px' }}>HSN</th>
                  <th style={{ border: '1px solid #111827', padding: '8px 6px', fontSize: '13px', fontWeight: 900, width: '92px' }}>SAC</th>
                  <th style={{ border: '1px solid #111827', padding: '8px 6px', fontSize: '13px', fontWeight: 900, width: '130px' }}>Ref<br />DC(Qty):Dt.</th>
                  <th style={{ border: '1px solid #111827', padding: '8px 6px', fontSize: '13px', fontWeight: 900, width: '110px' }}>Qty</th>
                  <th style={{ border: '1px solid #111827', padding: '8px 6px', fontSize: '13px', fontWeight: 900, width: '190px' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map((item, index) => (
                  <tr key={`${item.itemCode}-${index}`}>
                    <td style={{ border: '1px solid #111827', padding: '8px 6px', textAlign: 'center', verticalAlign: 'top' }}>{index + 1}</td>
                    <td style={{ border: '1px solid #111827', padding: '8px 6px', verticalAlign: 'top' }}>
                      <strong>{item.itemCode}</strong> - {item.itemName}
                    </td>
                    <td style={{ border: '1px solid #111827', padding: '8px 6px', textAlign: 'center', verticalAlign: 'top' }}>{item.hsn}</td>
                    <td style={{ border: '1px solid #111827', padding: '8px 6px', textAlign: 'center', verticalAlign: 'top' }}>{item.sac || '-'}</td>
                    <td style={{ border: '1px solid #111827', padding: '8px 6px', textAlign: 'center', verticalAlign: 'top' }}>{item.refDc}</td>
                    <td style={{ border: '1px solid #111827', padding: '8px 6px', textAlign: 'right', verticalAlign: 'top' }}>{Number(item.qty || 0).toFixed(2)} {item.uom}</td>
                    <td style={{ border: '1px solid #111827', padding: '8px 6px', verticalAlign: 'top' }}>{item.remarks}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ borderLeft: '1px solid #111827', borderRight: '1px solid #111827', height: '520px' }} />
                  <td style={{ borderRight: '1px solid #111827' }} />
                  <td style={{ borderRight: '1px solid #111827' }} />
                  <td style={{ borderRight: '1px solid #111827' }} />
                  <td style={{ borderRight: '1px solid #111827' }} />
                  <td style={{ borderRight: '1px solid #111827' }} />
                  <td style={{ borderRight: '1px solid #111827' }} />
                </tr>
                <tr>
                  <td colSpan="5" style={{ border: '1px solid #111827', padding: '8px 6px', textAlign: 'right', fontWeight: 900 }}>Total Qty</td>
                  <td style={{ border: '1px solid #111827', padding: '8px 6px', textAlign: 'right', fontWeight: 900 }}>{totalQty.toFixed(2)}</td>
                  <td style={{ border: '1px solid #111827' }} />
                </tr>
              </tbody>
            </table>
            <div style={{ borderBottom: '1px solid #111827', minHeight: '120px', padding: '8px 10px' }}>
              <div style={{ fontWeight: 900 }}>Terms and Conditions:</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', minHeight: '150px' }}>
              <div style={{ borderRight: '1px solid #111827', padding: '8px 10px', fontSize: '13px', lineHeight: 1.55 }}>
                <div><strong>OUR GSTIN :</strong> {company.gstin}</div>
                <div><strong>OUR PAN :</strong> {company.pan}</div>
                <div><strong>Party&apos;s GSTIN :</strong> -</div>
                <div><strong>Party&apos;s PAN :</strong> -</div>
              </div>
              <div style={{ borderRight: '1px solid #111827', padding: '8px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 900 }}>Received Items in Good Condition</div>
                <div>
                  <div style={{ fontWeight: 800 }}>Receiver&apos;s Signature</div>
                  <div style={{ marginTop: '10px', fontSize: '12px' }}>This is Computer Generated DC</div>
                </div>
              </div>
              <div style={{ padding: '10px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 900 }}>for {company.name}</div>
                <div style={{ fontWeight: 800 }}>Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ))}
    </>
  )
}
