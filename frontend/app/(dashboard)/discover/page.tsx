'use client'

import { useEffect, useMemo, useState } from 'react'
import { getDiscoverColleges, getDiscoverCollegeDetail, type DiscoverCollegeListItem, type DiscoverCollegeDetail } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, GraduationCap, DollarSign, Users, ArrowLeft, ExternalLink, Loader2, X, Info } from 'lucide-react'

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

const SELECTIVITY = [
  { value: 'very_selective', label: 'Very Selective' },
  { value: 'selective', label: 'Selective' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'open', label: 'Open' },
]

const SIZE = [
  { value: 'small', label: 'Small (<3k)' },
  { value: 'medium', label: 'Medium (3k–15k)' },
  { value: 'large', label: 'Large (>15k)' },
]

const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'admission_rate', label: 'Admit rate' },
  { value: 'net_price', label: 'Net price' },
  { value: 'earnings', label: 'Median earnings' },
  { value: 'size', label: 'Size' },
]

function formatPct(v?: number | null) {
  if (v === null || v === undefined) return 'Not reported'
  return `${Math.round(v * 100)}%`
}

function formatMoney(v?: number | null) {
  if (v === null || v === undefined) return 'Not reported'
  return `$${Number(v).toLocaleString()}`
}

function Card({ college, onSelect }: { college: DiscoverCollegeListItem; onSelect: (id: number) => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative bg-[#0f172a] border border-white/5 rounded-xl overflow-hidden shadow-lg cursor-pointer"
      onClick={() => onSelect(college.id)}
    >
      <div className="h-32 w-full bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
        {college.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={college.image_url} alt={college.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900" />
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{college.name}</h3>
            <p className="text-sm text-slate-300 flex items-center gap-1"><MapPin className="w-4 h-4" /> {college.city}, {college.state}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-slate-200">{college.selectivity_label}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
          <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-emerald-300" /> Admit: {formatPct(college.admission_rate)}</div>
          <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-300" /> Net: {formatMoney(college.net_price)}</div>
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-sky-300" /> Size: {college.student_size ? college.student_size.toLocaleString() : 'Not reported'}</div>
          <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-300" /> Earnings: {formatMoney(college.earnings_10yr)}</div>
        </div>
      </div>
    </motion.div>
  )
}

function DetailModal({ data, onClose }: { data: DiscoverCollegeDetail; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="bg-[#0b1220] border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        >
          <div className="relative">
            <div className="h-56 w-full bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden rounded-t-2xl">
              {data.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.image_url} alt={data.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900" />
              )}
            </div>
            <button className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">{data.name}</h2>
                <p className="text-slate-300 flex items-center gap-1"><MapPin className="w-4 h-4" /> {data.city}, {data.state}</p>
              </div>
              {data.school_url && (
                <a href={data.school_url.startsWith('http') ? data.school_url : `https://${data.school_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200">
                  Visit site <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-slate-200">
              <Stat label="Selectivity" value={data.selectivity_label} />
              <Stat label="Admission rate" value={formatPct(data.admission_rate)} />
              <Stat label="Size" value={data.student_size ? data.student_size.toLocaleString() : 'Not reported'} />
              <Stat label="Net price" value={formatMoney(data.net_price)} />
              <Stat label="Tuition (in)" value={formatMoney(data.tuition_in_state)} />
              <Stat label="Tuition (out)" value={formatMoney(data.tuition_out_of_state)} />
              <Stat label="Cost of attendance" value={formatMoney(data.cost_attendance)} />
              <Stat label="Completion rate" value={formatPct(data.completion_rate)} />
              <Stat label="Median earnings (10y)" value={formatMoney(data.earnings_10yr)} />
              <Stat label="Repayment (3y)" value={formatPct(data.repayment_3yr)} />
              <Stat label="SAT avg" value={data.sat_avg ? Math.round(data.sat_avg).toString() : 'Not reported'} />
              <Stat label="ACT midpoint" value={data.act_mid ? Math.round(data.act_mid).toString() : 'Not reported'} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-white mt-1">{value}</p>
    </div>
  )
}

export default function DiscoverPage() {
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [selectivity, setSelectivity] = useState('')
  const [size, setSize] = useState('')
  const [maxNetPrice, setMaxNetPrice] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<DiscoverCollegeListItem[]>([])
  const [meta, setMeta] = useState<{ total: number; total_pages: number }>({ total: 0, total_pages: 0 })
  const [detail, setDetail] = useState<DiscoverCollegeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getDiscoverColleges({
        q,
        state: state || undefined,
        selectivity: selectivity || undefined,
        size: size || undefined,
        max_net_price: maxNetPrice,
        sort,
        order,
        page,
        page_size: pageSize,
      })
      setItems(res.data)
      setMeta({ total: res.meta.total, total_pages: res.meta.total_pages })
    } catch (e: any) {
      setError(e?.message || 'Failed to load colleges')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, order])

  const onSearch = () => {
    setPage(1)
    fetchData()
  }

  const onSelectCollege = async (id: number) => {
    setDetailLoading(true)
    try {
      const res = await getDiscoverCollegeDetail(id)
      setDetail(res.data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load college')
    } finally {
      setDetailLoading(false)
    }
  }

  const totalPages = useMemo(() => meta.total_pages || 0, [meta])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Discover Colleges</h1>
          <p className="text-slate-300 text-sm">Browse Scorecard data with filters, images, and quick detail.</p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <Info className="w-4 h-4" /> Data from U.S. College Scorecard; images via Google Places.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-[#0b1220] border border-white/5 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Search by name or city" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex gap-2">
              <select className="w-full rounded-md bg-slate-900 border border-white/10 px-3 py-2 text-white" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">All states</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="w-full rounded-md bg-slate-900 border border-white/10 px-3 py-2 text-white" value={selectivity} onChange={(e) => setSelectivity(e.target.value)}>
                <option value="">Selectivity</option>
                {SELECTIVITY.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <select className="w-full rounded-md bg-slate-900 border border-white/10 px-3 py-2 text-white" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">Size</option>
                {SIZE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <Input type="number" placeholder="Max net price" value={maxNetPrice ?? ''} onChange={(e) => setMaxNetPrice(e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select className="rounded-md bg-slate-900 border border-white/10 px-3 py-2 text-white" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="rounded-md bg-slate-900 border border-white/10 px-3 py-2 text-white" value={order} onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
            <Button onClick={onSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
        </div>
        <div className="bg-[#0b1220] border border-white/5 rounded-xl p-4 space-y-2 text-sm text-slate-200">
          <p className="font-semibold text-white">Tips</p>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li>Use state + selectivity to narrow quickly.</li>
            <li>Net price is overall average; tuition shown too.</li>
            <li>Click a card for full details and link out.</li>
          </ul>
        </div>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-900/30 border border-red-700/50 rounded-md p-3">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-10 text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading colleges...
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-full text-slate-300">No colleges found. Try adjusting filters.</div>
        ) : (
          items.map((c) => <Card key={c.id} college={c} onSelect={onSelectCollege} />)
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-slate-300 text-sm">Page {page} / {totalPages || 1} • {meta.total} results</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>Prev</Button>
          <Button variant="secondary" onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))} disabled={totalPages ? page >= totalPages : loading}>Next</Button>
        </div>
      </div>

      {detailLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 text-white">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading college...
        </div>
      )}

      {detail && <DetailModal data={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
