'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext, DragOverlay, pointerWithin,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import Link from 'next/link'
import {
  MapPin, Loader2, AlertCircle, Filter, RefreshCw,
  Briefcase, Zap, MoreHorizontal, X, ChevronRight, Trash2,
} from 'lucide-react'
import { useJobsContext } from '@/lib/jobs-context'
import { get, patch, delete as del } from '@/lib/api'
import { getInitials, getMatchScoreBg, getAvatarUrl, cn } from '@/lib/utils'
import type { ApiCandidate, CandidateStage } from '@/types/candidate'
import type { ApiApplication } from '@/types/job'

const STAGES: {
  id: CandidateStage
  label: string
  headerBg: string
  headerBorder: string
  headerText: string
  badgeBg: string
  colBg: string
}[] = [
  {
    id: 'sourced',
    label: 'Sourced',
    headerBg: 'bg-slate-50',
    headerBorder: 'border-l-slate-400',
    headerText: 'text-slate-700',
    badgeBg: 'bg-slate-100 text-slate-500 border-slate-200',
    colBg: 'bg-slate-50/60',
  },
  {
    id: 'screening',
    label: 'Screening',
    headerBg: 'bg-blue-50',
    headerBorder: 'border-l-blue-400',
    headerText: 'text-blue-800',
    badgeBg: 'bg-blue-100 text-blue-600 border-blue-200',
    colBg: 'bg-blue-50/40',
  },
  {
    id: 'interview',
    label: 'Interview',
    headerBg: 'bg-violet-50',
    headerBorder: 'border-l-violet-400',
    headerText: 'text-violet-800',
    badgeBg: 'bg-violet-100 text-violet-600 border-violet-200',
    colBg: 'bg-violet-50/40',
  },
  {
    id: 'offer',
    label: 'Offer',
    headerBg: 'bg-amber-50',
    headerBorder: 'border-l-amber-400',
    headerText: 'text-amber-800',
    badgeBg: 'bg-amber-100 text-amber-600 border-amber-200',
    colBg: 'bg-amber-50/40',
  },
  {
    id: 'hired',
    label: 'Hired',
    headerBg: 'bg-emerald-50',
    headerBorder: 'border-l-emerald-400',
    headerText: 'text-emerald-800',
    badgeBg: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    colBg: 'bg-emerald-50/40',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    headerBg: 'bg-red-50',
    headerBorder: 'border-l-red-400',
    headerText: 'text-red-800',
    badgeBg: 'bg-red-100 text-red-500 border-red-200',
    colBg: 'bg-red-50/30',
  },
]

const STAGE_IDS = new Set(STAGES.map(s => s.id as string))

const NEXT_STAGE: Partial<Record<CandidateStage, string>> = {
  sourced:   'Move to Screening',
  screening: 'Move to Interview',
  interview: 'Send Offer',
  offer:     'Mark Hired',
}

const NEXT_STAGE_ID: Partial<Record<CandidateStage, CandidateStage>> = {
  sourced:   'screening',
  screening: 'interview',
  interview: 'offer',
  offer:     'hired',
}

interface PipelineCard {
  applicationId: string
  candidateId: string
  name: string
  title: string
  location: string
  skills: string[]
  aiScore: number | null
  avatarUrl: string | null
  stage: CandidateStage
  jobTitle: string | null
  jobId: string
}

// ── Droppable column ──────────────────────────────────────────────
function DroppableColumn({ stageId, isOver, colBg, children }: {
  stageId: string; isOver: boolean; colBg: string; children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: stageId })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg p-1.5 min-h-[160px] flex flex-col gap-2 transition-colors duration-150 border',
        isOver ? 'border-indigo-300 bg-indigo-50/60' : `border-neutral-200/70 ${colBg}`,
      )}
    >
      {children}
    </div>
  )
}

// ── Info row ──────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <Icon className="w-3 h-3 text-neutral-400 flex-shrink-0" />
      <span className="text-neutral-400 w-14 flex-shrink-0 leading-none">{label}</span>
      <span className="text-neutral-700 font-medium truncate leading-none">{value}</span>
    </div>
  )
}

// ── Draggable card ────────────────────────────────────────────────
function DraggableCard({
  card,
  onMoveNext,
  onDelete,
}: {
  card: PipelineCard
  onMoveNext: (card: PipelineCard) => void
  onDelete: (card: PipelineCard) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.applicationId })

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const nextLabel = NEXT_STAGE[card.stage]

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white border border-neutral-200 rounded-lg overflow-hidden',
        'hover:border-neutral-300 hover:shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40 z-50 relative',
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 p-2.5 pb-2">
        <div className="w-7 h-7 rounded-full flex-shrink-0 ring-2 ring-white overflow-hidden bg-neutral-900 flex items-center justify-center">
          {card.avatarUrl
            ? <img src={card.avatarUrl} alt={card.name} className="w-full h-full object-cover" />
            : <span className="text-white text-[10px] font-bold">{getInitials(card.name)}</span>}
        </div>
        <div className="flex-1 min-w-0 pt-px">
          <Link
            href={`/candidates/${card.candidateId}`}
            onClick={e => e.stopPropagation()}
            className="block"
          >
            <h3 className="text-neutral-900 text-[11px] font-semibold leading-tight hover:text-indigo-600 transition-colors truncate">
              {card.name}
            </h3>
          </Link>
          <p className="text-neutral-400 text-[10px] truncate mt-0.5">{card.title || '—'}</p>
        </div>
        {/* … menu */}
        <div className="flex items-center gap-1 flex-shrink-0 relative" ref={menuRef}>
          {card.aiScore !== null && (
            <span className={cn('text-[10px] font-bold px-1 py-0.5 rounded border', getMatchScoreBg(card.aiScore))}>
              {card.aiScore}%
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
          {menuOpen && (
            <div className="absolute top-6 right-0 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 w-36">
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(card) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete Candidate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-100 mx-2.5" />

      {/* Info rows */}
      <div className="px-2.5 py-2 space-y-1.5">
        {card.jobTitle && <InfoRow icon={Briefcase} label="Role"     value={card.jobTitle} />}
        <InfoRow                   icon={MapPin}     label="Location" value={card.location} />
        {card.skills.length > 0 && (
          <InfoRow icon={Zap} label="Skills" value={card.skills.slice(0, 2).join(', ')} />
        )}
      </div>

      {/* Footer — only the Next Stage button, no X */}
      <div className="flex items-center px-2.5 pb-2.5">
        {nextLabel ? (
          <button
            onClick={e => { e.stopPropagation(); e.preventDefault(); onMoveNext(card) }}
            className="flex-1 flex items-center justify-center gap-1 h-6 rounded-md bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-neutral-600 text-[10px] font-medium border border-neutral-200 transition-colors"
          >
            {nextLabel}
            <ChevronRight className="w-2.5 h-2.5" />
          </button>
        ) : (
          <div className="flex-1 h-6 rounded-md bg-neutral-50 border border-neutral-200 flex items-center justify-center text-[10px] text-neutral-400">
            Final stage
          </div>
        )}
      </div>
    </div>
  )
}

// ── Delete confirmation modal ─────────────────────────────────────
function DeleteCandidateModal({
  candidate,
  onConfirm,
  onClose,
  deleting,
}: {
  candidate: PipelineCard | null
  onConfirm: () => void
  onClose: () => void
  deleting: boolean
}) {
  if (!candidate) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-neutral-900 text-base font-semibold mb-1">Delete Candidate</h2>
        <p className="text-neutral-500 text-sm mb-6">
          Are you sure you want to permanently delete{' '}
          <strong className="text-neutral-800">{candidate.name}</strong>?{' '}
          This will remove all their data and cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {deleting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
              : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { jobs } = useJobsContext()
  const [jobFilter, setJobFilter]     = useState<string>('')
  const [cards, setCards]             = useState<Record<string, PipelineCard[]>>({})
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [activeCard, setActiveCard]   = useState<PipelineCard | null>(null)
  const [overStageId, setOverStageId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PipelineCard | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const fetchPipeline = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [allCandidates, allJobs] = await Promise.all([
        get<ApiCandidate[]>('/api/v1/candidates'),
        get<{ items: import('@/types/job').ApiJob[] }>('/api/v1/jobs?page=1&page_size=100'),
      ])
      const appResults = await Promise.all(
        allJobs.items.map(j =>
          get<ApiApplication[]>(`/api/v1/applications/job/${j.id}`)
            .then(apps => apps.map(a => ({ ...a, _jobTitle: j.title })))
            .catch(() => [] as (ApiApplication & { _jobTitle: string })[])
        )
      )
      const allApps      = appResults.flat()
      const candidateMap = Object.fromEntries(allCandidates.map(c => [c.id, c]))
      const grouped: Record<string, PipelineCard[]> = {}
      STAGES.forEach(s => { grouped[s.id] = [] })
      for (const app of allApps) {
        const c = candidateMap[app.candidate_id]
        if (!c) continue
        const stage = (app.current_stage as CandidateStage) || 'sourced'
        if (!grouped[stage]) grouped[stage] = []
        grouped[stage].push({
          applicationId: app.id,
          candidateId:   c.id,
          name:          c.name,
          title:         c.title ?? '',
          location:      c.location ?? '',
          skills:        Array.isArray(c.skills) ? c.skills : [],
          aiScore:       app.ai_score,
          avatarUrl:     getAvatarUrl(c.avatar_url, c.github_url),
          stage,
          jobTitle:      (app as any)._jobTitle ?? app.job_title ?? null,
          jobId:         app.job_id,
        })
      }
      setCards(grouped)
    } catch { setError('Failed to load pipeline.') }
    finally   { setLoading(false) }
  }, [])

  useEffect(() => { fetchPipeline() }, [fetchPipeline])

  const findCardStage = useCallback((appId: string): CandidateStage | null => {
    for (const s of STAGES) {
      if ((cards[s.id] ?? []).some(c => c.applicationId === appId)) return s.id
    }
    return null
  }, [cards])

  const resolveToStage = useCallback((overId: string): CandidateStage | null => {
    if (STAGE_IDS.has(overId)) return overId as CandidateStage
    return findCardStage(overId)
  }, [findCardStage])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    const stage = findCardStage(active.id as string)
    if (!stage) return
    setActiveCard((cards[stage] ?? []).find(c => c.applicationId === active.id) ?? null)
  }, [cards, findCardStage])

  const handleDragOver = useCallback(({ over }: DragOverEvent) => {
    setOverStageId(over ? resolveToStage(over.id as string) : null)
  }, [resolveToStage])

  const handleDragEnd = useCallback(async ({ active, over }: DragEndEvent) => {
    setActiveCard(null); setOverStageId(null)
    if (!over) return
    const fromStage = findCardStage(active.id as string)
    const toStage   = resolveToStage(over.id as string)
    if (!fromStage || !toStage || fromStage === toStage) return
    setCards(prev => {
      const from = [...(prev[fromStage] ?? [])]
      const to   = [...(prev[toStage]   ?? [])]
      const idx  = from.findIndex(c => c.applicationId === active.id)
      if (idx === -1) return prev
      const [moved] = from.splice(idx, 1)
      to.unshift({ ...moved, stage: toStage })
      return { ...prev, [fromStage]: from, [toStage]: to }
    })
    try {
      await patch(`/api/v1/applications/${active.id}`, { current_stage: toStage })
    } catch {
      await fetchPipeline()
    }
  }, [findCardStage, resolveToStage, fetchPipeline])

  const handleMoveNext = useCallback(async (card: PipelineCard) => {
    const toStage = NEXT_STAGE_ID[card.stage]
    if (!toStage) return
    setCards(prev => {
      const from = [...(prev[card.stage] ?? [])]
      const to   = [...(prev[toStage]    ?? [])]
      const idx  = from.findIndex(c => c.applicationId === card.applicationId)
      if (idx === -1) return prev
      const [moved] = from.splice(idx, 1)
      to.unshift({ ...moved, stage: toStage })
      return { ...prev, [card.stage]: from, [toStage]: to }
    })
    try {
      await patch(`/api/v1/applications/${card.applicationId}`, { current_stage: toStage })
    } catch {
      await fetchPipeline()
    }
  }, [fetchPipeline])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await del(`/api/v1/candidates/${deleteTarget.candidateId}`)
      setCards(prev => {
        const updated = { ...prev }
        for (const s of STAGES) {
          updated[s.id] = (updated[s.id] ?? []).filter(c => c.candidateId !== deleteTarget.candidateId)
        }
        return updated
      })
      setDeleteTarget(null)
    } catch { /* keep modal open on error */ }
    finally { setDeleting(false) }
  }, [deleteTarget])

  const displayCards = jobFilter
    ? Object.fromEntries(Object.entries(cards).map(([s, l]) => [s, l.filter(c => c.jobId === jobFilter)]))
    : cards

  const totalCount = Object.values(displayCards).reduce((s, l) => s + l.length, 0)

  return (
    <div className="space-y-4 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-lg font-semibold">Pipeline</h1>
          <p className="text-neutral-400 text-xs mt-0.5">
            {loading ? 'Loading…' : `${totalCount} candidate${totalCount !== 1 ? 's' : ''} across all stages`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-neutral-200 rounded-md px-2.5 py-1.5 bg-white">
            <Filter className="w-3 h-3 text-neutral-400" />
            <select
              value={jobFilter}
              onChange={e => setJobFilter(e.target.value)}
              className="bg-transparent text-xs text-neutral-700 outline-none cursor-pointer"
            >
              <option value="">All Jobs</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <button
            onClick={fetchPipeline}
            className="flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
          <button onClick={fetchPipeline} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-neutral-400 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading pipeline…
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-5">
            {STAGES.map(stage => {
              const stageCandidates = displayCards[stage.id] ?? []
              const isOver = overStageId === stage.id && activeCard?.stage !== stage.id

              return (
                <div key={stage.id} className="flex-shrink-0 w-[220px]">
                  <div className={cn(
                    'flex items-center gap-2 mb-2 px-2.5 py-2 rounded-md border border-l-4 border-neutral-200/60',
                    stage.headerBg,
                    stage.headerBorder,
                  )}>
                    <span className={cn('text-xs font-semibold flex-1', stage.headerText)}>
                      {stage.label}
                    </span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', stage.badgeBg)}>
                      {stageCandidates.length}
                    </span>
                  </div>

                  <DroppableColumn stageId={stage.id} isOver={isOver} colBg={stage.colBg}>
                    {stageCandidates.length === 0 ? (
                      <div className={cn(
                        'flex items-center justify-center h-16 rounded-md border border-dashed text-[10px] transition-colors',
                        isOver
                          ? 'border-indigo-300 text-indigo-400 bg-indigo-50'
                          : 'border-neutral-300 text-neutral-400',
                      )}>
                        {isOver ? 'Release to move' : 'Drop here'}
                      </div>
                    ) : (
                      stageCandidates.map(card => (
                        <DraggableCard
                          key={card.applicationId}
                          card={card}
                          onMoveNext={handleMoveNext}
                          onDelete={setDeleteTarget}
                        />
                      ))
                    )}
                  </DroppableColumn>
                </div>
              )
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard && (
              <div className="bg-white border-2 border-indigo-400 rounded-lg p-2.5 shadow-2xl w-[220px] rotate-1 opacity-95 pointer-events-none">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden bg-neutral-900 flex items-center justify-center">
                    {activeCard.avatarUrl
                      ? <img src={activeCard.avatarUrl} alt={activeCard.name} className="w-full h-full object-cover" />
                      : <span className="text-white text-[10px] font-bold">{getInitials(activeCard.name)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-900 text-[11px] font-semibold truncate">{activeCard.name}</p>
                    <p className="text-neutral-400 text-[10px] truncate">{activeCard.title}</p>
                  </div>
                  {activeCard.aiScore !== null && (
                    <span className={cn('text-[10px] font-bold px-1 py-0.5 rounded border flex-shrink-0', getMatchScoreBg(activeCard.aiScore))}>
                      {activeCard.aiScore}%
                    </span>
                  )}
                </div>
                {activeCard.jobTitle && (
                  <p className="text-[10px] text-indigo-500 font-medium truncate mt-1.5">{activeCard.jobTitle}</p>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Delete modal — rendered at page level so it's always in scope */}
      <DeleteCandidateModal
        candidate={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        deleting={deleting}
      />
    </div>
  )
}
