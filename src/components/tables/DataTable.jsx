import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Edit2, Trash2, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

export default function DataTable({
  title,
  columns,
  data = [],
  onAdd,
  addPath,
  addLabel = 'Add New',
  rowPath,      // function(row) => path for view/edit
  onDelete,
  rowActions,
  extraActions,
}) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(v => v === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(row =>
      columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(q))
    )
  }, [data, search, columns])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="card p-0 overflow-hidden">
      {/* Table header bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">{sorted.length} records</span>
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          {(onAdd || addPath) && (
            addPath ? (
              <Link to={addPath} target="_blank" rel="noreferrer" className="btn-primary">
                <Plus size={14} /> {addLabel}
              </Link>
            ) : (
              <button className="btn-primary" onClick={onAdd}>
                <Plus size={14} /> {addLabel}
              </button>
            )
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={clsx('table-th', col.sortable !== false && 'cursor-pointer select-none hover:bg-slate-100 transition-colors')}
                  style={{ width: col.width }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && (
                      <span className="flex flex-col">
                        <ChevronUp size={9} className={clsx(sortKey === col.key && sortDir === 'asc' ? 'text-primary-500' : 'text-slate-300')} />
                        <ChevronDown size={9} className={clsx(sortKey === col.key && sortDir === 'desc' ? 'text-primary-500' : 'text-slate-300')} />
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="table-th w-32 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-12 text-slate-400 text-sm">
                  No records found
                </td>
              </tr>
            ) : paginated.map((row, i) => (
              <tr key={row.id || i} className="table-row">
                {columns.map(col => (
                  <td key={col.key} className="table-td">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
                <td className="table-td">
                  <div className="flex items-center gap-1 justify-center">
                    {rowPath && (
                      <Link to={`${rowPath}/${row.id}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors">
                        <Edit2 size={13} />
                      </Link>
                    )}
                    {rowActions?.map((action) => {
                      const icon = action.icon
                      const Icon = icon
                      const classes = action.className || 'p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors'

                      if (action.to) {
                        return (
                          <Link
                            key={action.key}
                            to={typeof action.to === 'function' ? action.to(row) : action.to}
                            target={action.target || '_blank'}
                            rel="noreferrer"
                            className={classes}
                            title={action.label}
                          >
                            <Icon size={13} />
                          </Link>
                        )
                      }

                      return (
                        <button
                          key={action.key}
                          onClick={() => action.onClick?.(row)}
                          className={classes}
                          title={action.label}
                        >
                          <Icon size={13} />
                        </button>
                      )
                    })}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
        <span className="text-xs text-slate-500">
          Showing {Math.min((page - 1) * pageSize + 1, sorted.length)}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md hover:bg-white border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} className="text-slate-500" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) => p === '...' ? (
              <span key={`e${i}`} className="px-1 text-slate-400 text-xs">...</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={clsx(
                  'w-7 h-7 text-xs rounded-md border transition-colors',
                  p === page
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-primary-50'
                )}
              >{p}</button>
            ))
          }
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-md hover:bg-white border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} className="text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  )
}
