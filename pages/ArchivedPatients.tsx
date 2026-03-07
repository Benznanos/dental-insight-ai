import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search, Trash2, RefreshCw, ChevronRight, ChevronLeft,
  AlertTriangle, Download, Filter, SortAsc, SortDesc,
  ArrowUpDown, X, History, ArchiveRestore, Archive, Calendar,
} from 'lucide-react'
import { api } from '@/services/api'
import { Patient } from '@/types'
import { useToast } from '@/components/ui/use-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = 'name' | 'age' | 'total_treatments' | 'last_visit' | 'archived_at'
type SortDir   = 'asc' | 'desc'
type GenderFilter = 'all' | 'M' | 'F'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const exportToCSV = (patients: Patient[]) => {
  const headers = ['Patient Code', 'First Name', 'Last Name', 'Age', 'Gender', 'Contact', 'Email', 'Treatments', 'Last Visit', 'Archived At']
  const rows = patients.map(p => [
    p.patient_code, p.first_name, p.last_name, p.age,
    p.gender === 'M' ? 'Male' : 'Female',
    p.contact_number || '', p.email || '',
    p.total_treatments || 0,
    p.last_visit_date || '',
    p.archived_at || '',
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'archived_patients.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ArchivedPatients() {
  const navigate  = useNavigate()
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)

  const [patients,      setPatients]      = useState<Patient[]>([])
  const [loading,       setLoading]       = useState(true)
  const [totalArchived, setTotalArchived] = useState(0)

  const [searchInput,       setSearchInput]       = useState('')
  const [search,            setSearch]            = useState('')
  const [recentSearches,    setRecentSearches]    = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('archived_searches') || '[]') } catch { return [] }
  })
  const [showSearchHistory, setShowSearchHistory] = useState(false)
  const [genderFilter,      setGenderFilter]      = useState<GenderFilter>('all')
  const [showFilters,       setShowFilters]       = useState(false)

  const [sortField, setSortField] = useState<SortField>('archived_at')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')

  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [selected,          setSelected]          = useState<Set<number>>(new Set())
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [deleteDialogOpen,  setDeleteDialogOpen]  = useState(false)
  const [bulkRestoreOpen,   setBulkRestoreOpen]   = useState(false)
  const [bulkDeleteOpen,    setBulkDeleteOpen]    = useState(false)
  const [patientToRestore,  setPatientToRestore]  = useState<Patient | null>(null)
  const [patientToDelete,   setPatientToDelete]   = useState<Patient | null>(null)

  const PAGE_SIZE = 15

  // / key focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault(); searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => { loadPatients() }, [page, search, genderFilter, sortField, sortDir])

  const loadPatients = async () => {
    try {
      setLoading(true)
      const response = await api.get<Patient[]>('/patients/read_archived.php', {
        page, limit: PAGE_SIZE, search,
        gender: genderFilter !== 'all' ? genderFilter : '',
        sort: sortField, dir: sortDir,
      })
      if (response.success && response.data) {
        setPatients(response.data)
        setTotalPages(response.pagination?.total_pages || 1)
        setTotalArchived(response.pagination?.total || 0)
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load archived patients', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortBtn = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <button onClick={() => handleSort(field)} className="sort-btn">
      {children}
      {sortField === field
        ? sortDir === 'asc' ? <SortAsc size={12} className="sort-icon active" /> : <SortDesc size={12} className="sort-icon active" />
        : <ArrowUpDown size={12} className="sort-icon muted" />}
    </button>
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchInput.trim()
    setSearch(q); setPage(1)
    if (q && !recentSearches.includes(q)) {
      const updated = [q, ...recentSearches].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('archived_searches', JSON.stringify(updated))
    }
    setShowSearchHistory(false)
  }

  const toggleSelect  = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () =>
    setSelected(prev => prev.size === patients.length ? new Set() : new Set(patients.map(p => p.id)))
  const allSelected = patients.length > 0 && selected.size === patients.length

  // ── Restore ───────────────────────────────────────────────────────────────
  const handleRestoreClick   = (p: Patient) => { setPatientToRestore(p); setRestoreDialogOpen(true) }
  const handleRestoreConfirm = async () => {
    if (!patientToRestore) return
    try {
      const res = await api.post('/patients/restore.php', { id: patientToRestore.id })
      if (res.success) {
        setPatients(prev => prev.filter(p => p.id !== patientToRestore.id))
        setTotalArchived(n => n - 1)
        toast({ title: 'Patient restored', description: `${patientToRestore.first_name} ${patientToRestore.last_name} is now active.` })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to restore patient.', variant: 'destructive' })
    } finally { setRestoreDialogOpen(false); setPatientToRestore(null) }
  }

  const handleBulkRestore = async () => {
    try {
      await Promise.all([...selected].map(id => api.post('/patients/restore.php', { id })))
      toast({ title: 'Restored', description: `${selected.size} patient(s) restored.` })
      setSelected(new Set()); loadPatients()
    } catch {
      toast({ title: 'Error', description: 'Bulk restore failed.', variant: 'destructive' })
    } finally { setBulkRestoreOpen(false) }
  }

  // ── Permanent delete ──────────────────────────────────────────────────────
  const handleDeleteClick   = (p: Patient) => { setPatientToDelete(p); setDeleteDialogOpen(true) }
  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return
    try {
      const res = await api.delete('/patients/delete_archived.php', { id: patientToDelete.id })
      if (res.success) {
        setPatients(prev => prev.filter(p => p.id !== patientToDelete.id))
        setTotalArchived(n => n - 1)
        toast({ title: 'Permanently deleted', description: `${patientToDelete.first_name} ${patientToDelete.last_name} has been removed.` })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete patient.', variant: 'destructive' })
    } finally { setDeleteDialogOpen(false); setPatientToDelete(null) }
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selected].map(id => api.delete('/patients/delete_archived.php', { id })))
      toast({ title: 'Deleted', description: `${selected.size} patient(s) permanently removed.` })
      setSelected(new Set()); loadPatients()
    } catch {
      toast({ title: 'Error', description: 'Bulk delete failed.', variant: 'destructive' })
    } finally { setBulkDeleteOpen(false) }
  }

  const activeFilters = [genderFilter !== 'all'].filter(Boolean).length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="pg">

        {/* Header */}
        <div className="flex items-center justify-between w-full mb-6">
          <div>
            <div className="arc-breadcrumb">
              <button className="arc-bc-link" onClick={() => navigate('/patients')}>Patient Records</button>
              <span className="arc-bc-sep">/</span>
              <span className="arc-bc-cur">Archived</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground" style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
              <Archive size={28} style={{ color:'#d97706' }} />
              Archived Patients
            </h1>
            <p className="text-md text-muted-foreground mt-1">
              {totalArchived > 0
                ? <><strong>{totalArchived}</strong> archived records</>
                : 'No archived patients'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={loadPatients} disabled={loading}>
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button variant="outline" onClick={() => navigate('/patients')}>
              ← Back to Active Patients
            </Button>
          </div>
        </div>

        {/* Archive notice banner */}
        <div className="arc-banner">
          <Archive size={15} />
          <span>Archived patients are hidden from active lists. Restore them to make them active again, or permanently delete to remove all data.</span>
        </div>

        {/* Toolbar */}
        <div className="pg-toolbar">
          <div className="search-wrap">
            <form onSubmit={handleSearchSubmit}>
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input
                  ref={searchRef}
                  className="search-input"
                  placeholder="Search archived patients… press / to focus"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onFocus={() => setShowSearchHistory(true)}
                  onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                />
                {searchInput && (
                  <button type="button" className="search-clear"
                    onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            </form>
            {showSearchHistory && recentSearches.length > 0 && (
              <div className="search-history">
                <div className="sh-label"><History size={11} />Recent</div>
                {recentSearches.map(q => (
                  <button key={q} className="sh-item"
                    onClick={() => { setSearchInput(q); setSearch(q); setPage(1); setShowSearchHistory(false) }}>
                    <Search size={11} />{q}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="toolbar-right">
            <button className={`btn-outline ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(v => !v)}>
              <Filter size={13} />Filters
              {activeFilters > 0 && <span className="filter-badge">{activeFilters}</span>}
            </button>
            <button className="btn-outline" onClick={() => exportToCSV(patients)}>
              <Download size={13} />Export
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filter-row">
              <span className="filter-label">Gender</span>
              <Select value={genderFilter} onValueChange={v => { setGenderFilter(v as GenderFilter); setPage(1) }}>
                <SelectTrigger className="filter-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeFilters > 0 && (
              <button className="clear-filters" onClick={() => { setGenderFilter('all'); setPage(1) }}>
                <X size={11} />Clear
              </button>
            )}
          </div>
        )}

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="bulk-bar arc-bulk">
            <span className="bulk-count">{selected.size} selected</span>
            <button className="bulk-btn restore" onClick={() => setBulkRestoreOpen(true)}><ArchiveRestore size={13} />Restore</button>
            <button className="bulk-btn danger"   onClick={() => setBulkDeleteOpen(true)}><Trash2 size={13} />Delete Permanently</button>
            <button className="bulk-btn"          onClick={() => exportToCSV(patients.filter(p => selected.has(p.id)))}><Download size={13} />Export</button>
            <button className="bulk-close" onClick={() => setSelected(new Set())}><X size={13} /></button>
          </div>
        )}

        {/* Table */}
        <div className="table-card">
          <div className="table-meta">
            <span className="meta-text">
              Showing <strong>{patients.length}</strong> of <strong>{totalArchived}</strong> archived
              &nbsp;·&nbsp; {PAGE_SIZE} per page
            </span>
          </div>

          {loading ? (
            <div className="state-center">
              <div className="spinner" />
              <span>Loading archived records…</span>
            </div>
          ) : patients.length === 0 ? (
            <div className="state-center empty">
              <div className="empty-icon"><Archive size={26} /></div>
              <h3>{search ? `No archived results for "${search}"` : 'No archived patients'}</h3>
              <p>{search ? 'Try a different search term.' : 'Archived patients will appear here.'}</p>
              {search && (
                <button className="btn-outline" onClick={() => { setSearch(''); setSearchInput('') }}>
                  <X size={13} />Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <Table className="data-table">
                <TableHeader>
                  <TableRow className="thead-row">
                    <TableHead className="th col-check">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead className="th col-patient"><SortBtn field="name">Patient</SortBtn></TableHead>
                    <TableHead className="th col-contact">Contact</TableHead>
                    <TableHead className="th col-tx"><SortBtn field="total_treatments">Treatments</SortBtn></TableHead>
                    <TableHead className="th col-visit"><SortBtn field="last_visit">Last Visit</SortBtn></TableHead>
                    <TableHead className="th col-archived"><SortBtn field="archived_at">Archived On</SortBtn></TableHead>
                    <TableHead className="th col-actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient, index) => {
                    const isSelected = selected.has(patient.id)
                    return (
                      <TableRow
                        key={patient.id}
                        className={`data-row arc-row ${isSelected ? 'row-selected' : ''}`}
                        style={{ animationDelay: `${index * 0.025}s` }}
                      >
                        {/* Check */}
                        <TableCell className="td col-check">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(patient.id)} />
                        </TableCell>

                        {/* Patient */}
                        <TableCell className="td col-patient">
                          <div className="patient-cell">
                            <div className={`av arc-av ${patient.gender === 'M' ? 'av-blue' : 'av-pink'}`}>
                              {patient.first_name[0]}{patient.last_name[0]}
                            </div>
                            <div className="patient-info">
                              <span className="patient-name">{patient.first_name} {patient.last_name}</span>
                              <span className="patient-meta">
                                <span className="mono">#{patient.patient_code}</span>
                                <span className="sep">·</span>
                                <span>{patient.age}y · {patient.gender}</span>
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact */}
                        <TableCell className="td col-contact">
                          <div className="contact-info">
                            {patient.contact_number
                              ? <span className="contact-num">{patient.contact_number}</span>
                              : <span className="contact-none">—</span>}
                            {patient.email && <span className="contact-email">{patient.email}</span>}
                          </div>
                        </TableCell>

                        {/* Treatments */}
                        <TableCell className="td col-tx">
                          <span className={`tx-pill ${(patient.total_treatments || 0) > 0 ? 'tx-has' : 'tx-zero'}`}>
                            {patient.total_treatments || 0}
                          </span>
                        </TableCell>

                        {/* Last Visit */}
                        <TableCell className="td col-visit">
                          <span className="visit-date">{formatDate(patient.last_visit_date)}</span>
                        </TableCell>

                        {/* Archived On */}
                        <TableCell className="td col-archived">
                          <div className="arc-date-cell">
                            <Calendar size={12} className="arc-date-icon" />
                            <span className="visit-date">{formatDate(patient.archived_at)}</span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="td col-actions">
                          <div className="row-actions">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="action-btn restore" onClick={() => handleRestoreClick(patient)}>
                                  <ArchiveRestore size={14} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Restore</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="action-btn del" onClick={() => handleDeleteClick(patient)}>
                                  <Trash2 size={14} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Permanently</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <span className="pg-info">Page {page} of {totalPages} · {totalArchived} archived</span>
                  <div className="pg-btns">
                    <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      const n = page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                      if (n < 1 || n > totalPages) return null
                      return <button key={n} className={`pg-btn ${page === n ? 'pg-active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                    })}
                    <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Restore single */}
        <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <ArchiveRestore className="h-5 w-5 text-green-600" />
                </div>
                <AlertDialogTitle className="text-xl">Restore Patient</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base pt-3">
                Restore{' '}
                <span className="font-semibold text-foreground">
                  {patientToRestore?.first_name} {patientToRestore?.last_name}
                </span>{' '}
                to the active patient list? They will appear in all regular searches and reports again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-2">
              <AlertDialogCancel onClick={() => setRestoreDialogOpen(false)}
                className="mt-0 border-gray-300 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleRestoreConfirm}
                className="bg-green-600 hover:bg-green-700 text-white border-0 transition-all duration-200 hover:scale-105">
                <ArchiveRestore className="h-4 w-4 mr-2" />Restore Patient
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permanent delete single */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <AlertDialogTitle className="text-xl">Permanently Delete Patient</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base pt-3">
                This will <span className="font-semibold text-red-600">permanently remove</span>{' '}
                <span className="font-semibold text-foreground">
                  {patientToDelete?.first_name} {patientToDelete?.last_name}
                </span>{' '}
                and all associated data including treatments, dental charts, and medical records. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-2">
              <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}
                className="mt-0 border-gray-300 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white border-0 transition-all duration-200 hover:scale-105">
                <Trash2 className="h-4 w-4 mr-2" />Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk restore */}
        <AlertDialog open={bulkRestoreOpen} onOpenChange={setBulkRestoreOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <ArchiveRestore className="h-5 w-5 text-green-600" />
                </div>
                <AlertDialogTitle className="text-xl">Restore {selected.size} Patients</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base pt-3">
                Restore <span className="font-semibold text-foreground">{selected.size} patient {selected.size === 1 ? 'record' : 'records'}</span> to the active list?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-2">
              <AlertDialogCancel onClick={() => setBulkRestoreOpen(false)}
                className="mt-0 border-gray-300 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkRestore}
                className="bg-green-600 hover:bg-green-700 text-white border-0 transition-all duration-200 hover:scale-105">
                <ArchiveRestore className="h-4 w-4 mr-2" />Restore {selected.size} {selected.size === 1 ? 'Patient' : 'Patients'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk permanent delete */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <AlertDialogTitle className="text-xl">Permanently Delete {selected.size} Patients</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base pt-3">
                This will <span className="font-semibold text-red-600">permanently remove</span>{' '}
                <span className="font-semibold text-foreground">{selected.size} patient {selected.size === 1 ? 'record' : 'records'}</span>{' '}
                and all associated data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-2">
              <AlertDialogCancel onClick={() => setBulkDeleteOpen(false)}
                className="mt-0 border-gray-300 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white border-0 transition-all duration-200 hover:scale-105">
                <Trash2 className="h-4 w-4 mr-2" />Delete {selected.size} Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <style>{`
          .pg { font-family:inherit; display:flex; flex-direction:column; gap:1.1rem; color:#1e293b; }

          /* Breadcrumb */
          .arc-breadcrumb { display:flex; align-items:center; gap:0.4rem; font-size:0.8rem; color:#9ca3af; margin-bottom:0.3rem; }
          .arc-bc-link { background:none; border:none; color:#6b7280; cursor:pointer; font-family:inherit; font-size:inherit; padding:0; }
          .arc-bc-link:hover { color:#d97706; }
          .arc-bc-sep { color:#d1d5db; }
          .arc-bc-cur { color:#d97706; font-weight:500; }

          /* Archive banner */
          .arc-banner { display:flex; align-items:center; gap:0.6rem; padding:0.75rem 1rem; background:#fffbeb; border:1px solid #fcd34d; border-radius:9px; font-size:0.82rem; color:#92400e; }

          /* Buttons */
          .btn-outline { display:inline-flex; align-items:center; gap:5px; height:36px; padding:0 0.85rem; border:1px solid #e5e7eb; border-radius:8px; background:#fff; font-size:0.83rem; font-weight:500; color:#6b7280; cursor:pointer; font-family:inherit; transition:all 0.15s; white-space:nowrap; }
          .btn-outline:hover,.btn-outline.active { background:#fffbeb; border-color:#fcd34d; color:#d97706; }
          .filter-badge { background:#d97706; color:#fff; font-size:0.68rem; font-weight:600; padding:1px 6px; border-radius:20px; margin-left:2px; }

          /* Toolbar */
          .pg-toolbar { display:flex; align-items:center; gap:0.65rem; }
          .search-wrap { flex:1; position:relative; min-width:0; }
          .search-box { position:relative; display:flex; align-items:center; }
          .search-icon { position:absolute; left:11px; color:#9ca3af; pointer-events:none; flex-shrink:0; }
          .search-input { width:100%; height:36px; padding:0 2rem 0 2.2rem; border:1px solid #e5e7eb; border-radius:8px; font-size:0.84rem; font-family:inherit; color:#1e293b; background:#fff; outline:none; transition:border-color 0.15s,box-shadow 0.15s; }
          .search-input:focus { border-color:#fcd34d; box-shadow:0 0 0 3px rgba(251,191,36,.15); }
          .search-input::placeholder { color:#9ca3af; }
          .search-clear { position:absolute; right:9px; background:none; border:none; cursor:pointer; color:#9ca3af; display:flex; padding:2px; }
          .search-history { position:absolute; top:calc(100%+5px); left:0; right:0; background:#fff; border:1px solid #e5e7eb; border-radius:9px; box-shadow:0 8px 24px rgba(0,0,0,.07); z-index:50; overflow:hidden; }
          .sh-label { display:flex; align-items:center; gap:5px; padding:7px 11px; font-size:0.7rem; color:#9ca3af; font-weight:500; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid #f3f4f6; }
          .sh-item { display:flex; align-items:center; gap:7px; width:100%; text-align:left; padding:8px 11px; font-size:0.82rem; color:#6b7280; background:none; border:none; cursor:pointer; font-family:inherit; transition:background .1s; }
          .sh-item:hover { background:#f9fafb; }
          .toolbar-right { display:flex; gap:0.5rem; flex-shrink:0; }

          /* Filters */
          .filters-panel { display:flex; align-items:center; gap:0.85rem; padding:0.8rem 1rem; background:#f9fafb; border:1px solid #e5e7eb; border-radius:9px; flex-wrap:wrap; }
          .filter-row { display:flex; align-items:center; gap:0.45rem; }
          .filter-label { font-size:0.78rem; color:#6b7280; font-weight:500; white-space:nowrap; }
          .filter-select { height:30px !important; font-size:0.8rem !important; width:115px; }
          .clear-filters { display:flex; align-items:center; gap:4px; padding:0 0.7rem; height:30px; background:none; border:1px solid #fca5a5; border-radius:6px; color:#ef4444; font-size:0.78rem; cursor:pointer; font-family:inherit; margin-left:auto; }
          .clear-filters:hover { background:#fef2f2; }

          /* Bulk bar */
          .bulk-bar { display:flex; align-items:center; gap:0.5rem; padding:0.55rem 1rem; background:#fffbeb; border:1px solid #fcd34d; border-radius:9px; }
          .arc-bulk .bulk-count { color:#d97706; }
          .bulk-btn { display:flex; align-items:center; gap:4px; height:28px; padding:0 0.7rem; background:#fff; border:1px solid #e5e7eb; border-radius:6px; font-size:0.78rem; font-weight:500; color:#6b7280; cursor:pointer; font-family:inherit; transition:all .15s; }
          .bulk-btn.restore { color:#059669; border-color:#a7f3d0; }
          .bulk-btn.danger  { color:#ef4444; border-color:#fca5a5; }
          .bulk-close { display:flex; align-items:center; justify-content:center; width:26px; height:26px; background:none; border:none; cursor:pointer; color:#6b7280; border-radius:5px; margin-left:auto; }
          .bulk-close:hover { background:#fef3c7; }

          /* Table */
          .table-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
          .table-meta { display:flex; align-items:center; justify-content:flex-end; padding:0.75rem 1.15rem; border-bottom:1px solid #f3f4f6; }
          .meta-text { font-size:0.78rem; color:#9ca3af; }
          .meta-text strong { color:#6b7280; font-weight:500; }
          .data-table { width:100%; table-layout:fixed; border-collapse:collapse; }
          .thead-row { background:#fffbeb; }
          .th { padding:0.65rem 0.85rem; font-size:0.78rem; font-weight:600; color:#92400e; border-bottom:1px solid #fde68a; white-space:nowrap; overflow:hidden; }
          .td { padding:0.8rem 0.85rem; vertical-align:middle; overflow:hidden; }

          .col-check    { width:38px; }
          .col-patient  { width:24%; }
          .col-contact  { width:18%; }
          .col-tx       { width:10%; text-align:center; }
          .col-visit    { width:12%; }
          .col-archived { width:13%; }
          .col-actions  { width:72px; text-align:right; }

          .sort-btn { display:inline-flex; align-items:center; gap:3px; background:none; border:none; cursor:pointer; font-size:inherit; font-weight:inherit; color:inherit; font-family:inherit; padding:0; }
          .sort-btn:hover { color:#d97706; }
          .sort-icon { color:#d1d5db; }
          .sort-icon.active { color:#d97706; }
          .sort-icon.muted { opacity:.5; }

          .data-row { border-bottom:1px solid #f3f4f6; transition:background 0.1s; animation:fadeUp 0.3s ease both; }
          .arc-row { cursor:default; }
          .arc-row:hover { background:#fffbeb; }
          .data-row:last-child { border-bottom:none; }
          .row-selected { background:#fef3c7 !important; }

          /* Avatar — slightly muted for archived */
          .arc-av { opacity:0.75; }
          .av { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; flex-shrink:0; }
          .av-blue { background:#d1fae5; color:#065f46; }
          .av-pink { background:#fce7f3; color:#be185d; }
          .patient-cell { display:flex; align-items:center; gap:0.6rem; }
          .patient-info { min-width:0; display:flex; flex-direction:column; }
          .patient-name { font-size:0.875rem; font-weight:500; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .patient-meta { display:flex; align-items:center; gap:3px; font-size:0.72rem; color:#9ca3af; margin-top:1px; white-space:nowrap; }
          .mono { font-size:0.68rem; }
          .sep { color:#d1d5db; }

          .contact-info { min-width:0; }
          .contact-num   { display:block; font-size:0.82rem; color:#374151; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .contact-none  { font-size:0.82rem; color:#d1d5db; }
          .contact-email { display:block; font-size:0.7rem; color:#9ca3af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

          .tx-pill { display:inline-flex; align-items:center; justify-content:center; min-width:32px; height:22px; border-radius:6px; font-size:0.78rem; font-weight:600; padding:0 8px; }
          .tx-has  { background:#d1fae5; color:#065f46; }
          .tx-zero { background:#f3f4f6; color:#9ca3af; }

          .visit-date { display:block; font-size:0.8rem; color:#374151; white-space:nowrap; }

          /* Archived date */
          .arc-date-cell { display:flex; align-items:center; gap:5px; }
          .arc-date-icon { color:#d97706; flex-shrink:0; }

          /* Actions */
          .row-actions { display:flex; align-items:center; justify-content:flex-end; gap:2px; }
          .action-btn { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border:none; background:none; cursor:pointer; color:#9ca3af; border-radius:6px; transition:all .15s; }
          .action-btn.restore:hover { background:#ecfdf5; color:#059669; }
          .action-btn.del:hover     { background:#fef2f2; color:#dc2626; }

          /* States */
          .state-center { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.65rem; padding:3.5rem 2rem; color:#9ca3af; font-size:0.84rem; }
          .spinner { width:34px; height:34px; border:3px solid #f3f4f6; border-top-color:#d97706; border-radius:50%; animation:spin .75s linear infinite; }
          .empty { text-align:center; }
          .empty-icon { width:52px; height:52px; background:#fffbeb; border-radius:14px; display:flex; align-items:center; justify-content:center; color:#d97706; margin-bottom:0.5rem; }
          .empty h3 { font-size:0.95rem; font-weight:600; color:#111827; margin:0 0 0.3rem; }
          .empty p  { font-size:0.82rem; color:#9ca3af; margin:0 0 1rem; }

          /* Pagination */
          .pagination { display:flex; align-items:center; justify-content:space-between; padding:0.8rem 1.15rem; border-top:1px solid #f3f4f6; }
          .pg-info { font-size:0.78rem; color:#9ca3af; }
          .pg-btns { display:flex; align-items:center; gap:3px; }
          .pg-btn { display:flex; align-items:center; justify-content:center; min-width:30px; height:30px; padding:0 5px; border:1px solid #e5e7eb; border-radius:6px; background:#fff; font-size:0.8rem; font-weight:500; color:#6b7280; cursor:pointer; font-family:inherit; transition:all .15s; }
          .pg-btn:hover:not(:disabled) { background:#fffbeb; border-color:#fcd34d; color:#d97706; }
          .pg-btn.pg-active { background:#d97706; border-color:#d97706; color:#fff; }
          .pg-btn:disabled { opacity:.35; cursor:not-allowed; }

          @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin   { to { transform:rotate(360deg); } }
        `}</style>

      </div>
    </TooltipProvider>
  )
}