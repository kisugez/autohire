'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragOverlay, pointerWithin,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import Link from 'next/link'
import { MapPin, Loader2, AlertCircle, Filter, RefreshCw } from 'lucide-react'
import { useJobsContext } from '@/lib/jobs-context'
import { get, patch } from '@/lib/api'
import { getInitials, getMatchScoreBg, cn } from '@/lib/utils'
import type { ApiCandidate, CandidateStage } from '@/types/candidate'
import type { ApiApplication } from '@/types/job'

const STAGES: { id: CandidateStage; label: string; dot: string }[] = [
  { id: 'sourced',   label: 'Sourced',   dot: 'bg-neutral-400' },
  { id: 'screening', label: 'Screening', dot: 'bg-blue-500'    },
  { id: 'interview', label: 'Interview', dot: 'bg-indigo-500'  },
  { id: 'offer',     label: 'Offer',     dot: 'bg-amber-500'   },
  { id: 'hired',     label: 'Hired',     dot: 'bg-green-500'   },
  { id: 'rejected',  label: 'Rejected',  dot: 'bg-red-400'     },
]

const STAGE_IDS = new Set(STAGES.map(s => s.id as string))

interface PipelineCard {
  applicationId: string
  candidateId: string
  name: string
  title: string
  location: string
  skills: string[]
  aiScore: number | null
  stage: CandidateStage
  jobTitle: string | null
  jobId: string
}

// ── Droppable column ──────────────────────────────────────────────
function DroppableColumn({
  stageId, isOver, children,
}: {
  stageId: string
  isOver: boolean
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: stageId })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl p-2.5 min-h-[200px] flex flex-col gap-2 transition-colors duration-150 border',
        isOver ? 'border-indigo-300 bg-indigo-50/50' : 'border-neutral-200 bg-neutral-50',
      )}
    >
      {children}
    </div>
  )
}

// ── Draggable card (plain useDraggable — no sortable version conflict) ──
function DraggableCard({ card }: { card: PipelineCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.applicationId })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white border border-neutral-200 rounded-xl p-3.5 cursor-grab active:cursor-grabbing',
        'hover:border-neutral-300 hover:shadow-sm transition-colors duration-150',
        isDragging && 'opacity-40 z-50 relative',
      )}
    >
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {getInitials(card.name)}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/candidates/${card.candidateId}`}
            onClick={e => e.stopPropagation()}
            className="block"
          >
            <h3 className="text-neutral-900 text-xs font-semibold truncate hover:text-indigo-600 transition-colors">
              {card.name}
            </h3>
          </Link>
          <p className="text-neutral-400 text-xs truncate">{card.title}</p>
        </div>
        {card.aiScore !== null && (
          <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded border flex-shrink-0', getMatchScoreBg(card.aiScore))}>
            {card.aiScore}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{card.location}</span>
      </div>
      {card.jobTitle && (
        <p className="text-[10px] text-indigo-500 font-medium truncate mb-1">{card.jobTitle}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {card.skills.slice(0, 2).map(skill => (
          <span key={skill} className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-500 border border-neutral-200">
            {skill}
          </span>
        ))}
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

  // ── fetch ─────────────────────────────────────────────────────
  const fetchPipeline = useCallback(async () => {
    setLoading(true)
    setError(null)
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
          stage,
          jobTitle:      (app as any)._jobTitle ?? app.job_title ?? null,
          jobId:         app.job_id,
        })
      }
      setCards(grouped)
    } catch {
      setError('Failed to load pipeline.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPipeline() }, [fetchPipeline])

  // ── helpers ───────────────────────────────────────────────────
  const findCardStage = useCallback(
    (appId: string): CandidateStage | null => {
      for (const s of STAGES) {
        if ((cards[s.id] ?? []).some(c => c.applicationId === appId)) return s.id
      }
      return null
    },
    [cards],
  )

  const resolveToStage = useCallback(
    (overId: string): CandidateStage | null => {
      if (STAGE_IDS.has(overId)) return overId as CandidateStage
      return findCardStage(overId)
    },
    [findCardStage],
  )

  // ── sensors ───────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  // ── drag handlers ─────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    const stage = findCardStage(active.id as string)
    if (!stage) return
    setActiveCard((cards[stage] ?? []).find(c => c.applicationId === active.id) ?? null)
  }, [cards, findCardStage])

  const handleDragOver = useCallback(({ over }: DragOverEvent) => {
    setOverStageId(over ? resolveToStage(over.id as string) : null)
  }, [resolveToStage])

  const handleDragEnd = useCallback(async ({ active, over }: DragEndEvent) => {
    setActiveCard(null)
    setOverStageId(null)
    if (!over) return

    const fromStage = findCardStage(active.id as string)
    const toStage   = resolveToStage(over.id as string)
    if (!fromStage || !toStage || fromStage === toStage) return

    // 1. Optimistic update — move card immediately in local state
    setCards(prev => {
      const from = [...(prev[fromStage] ?? [])]
      const to   = [...(prev[toStage]   ?? [])]
      const idx  = from.findIndex(c => c.applicationId === active.id)
      if (idx === -1) return prev
      const [moved] = from.splice(idx, 1)
      to.unshift({ ...moved, stage: toStage })
      return { ...prev, [fromStage]: from, [toStage]: to }
    })

    // 2. Persist to backend via the new PATCH endpoint
    try {
      await patch(`/api/v1/applications/${active.id}`, { current_stage: toStage })
    } catch {
      // Only rollback if the API actually fails
      await fetchPipeline()
    }
  }, [findCardStage, resolveToStage, fetchPipeline])

  // ── filtered view ─────────────────────────────────────────────
  const displayCards = jobFilter
    ? Object.fromEntries(
        Object.entries(cards).map(([stage, list]) => [
          stage, list.filter(c => c.jobId === jobFilter),
        ]),
      )
    : cards

  const totalCount = Object.values(displayCards).reduce((s, l) => s + l.length, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Pipeline</h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${totalCount} candidate${totalCount !== 1 ? 's' : ''} across all stages`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={jobFilter}
              onChange={e => setJobFilter(e.target.value)}
              className="bg-transparent text-sm text-neutral-700 outline-none cursor-pointer"
            >
              <option value="">All Jobs</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchPipeline}
            className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={fetchPipeline} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-neutral-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading pipeline…
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map(stage => {
              const stageCandidates = displayCards[stage.id] ?? []
              const isOver = overStageId === stage.id && activeCard?.stage !== stage.id

              return (
                <div key={stage.id} className="flex-shrink-0 w-64">
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', stage.dot)} />
                    <span className="text-neutral-700 text-sm font-medium">{stage.label}</span>
                    <span className="text-xs bg-neutral-100 text-neutral-500 border border-neutral-200 rounded-full px-2 py-0.5">
                      {stageCandidates.length}
                    </span>
                  </div>

                  {/* Droppable zone */}
                  <DroppableColumn stageId={stage.id} isOver={isOver}>
                    {stageCandidates.length === 0 ? (
                      <div className={cn(
                        'flex items-center justify-center h-24 rounded-lg border border-dashed text-xs transition-colors',
                        isOver
                          ? 'border-indigo-300 text-indigo-400 bg-indigo-50'
                          : 'border-neutral-300 text-neutral-400',
                      )}>
                        {isOver ? 'Release to move here' : 'Drop here'}
                      </div>
                    ) : (
                      stageCandidates.map(card => (
                        <DraggableCard key={card.applicationId} card={card} />
                      ))
                    )}
                  </DroppableColumn>
                </div>
              )
            })}
          </div>

          {/* Ghost card that follows the cursor */}
          <DragOverlay dropAnimation={null}>
            {activeCard && (
              <div className="bg-white border-2 border-indigo-400 rounded-xl p-3.5 shadow-2xl w-64 rotate-1 opacity-95 pointer-events-none">
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {getInitials(activeCard.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-900 text-xs font-semibold truncate">{activeCard.name}</p>
                    <p className="text-neutral-400 text-xs truncate">{activeCard.title}</p>
                  </div>
                  {activeCard.aiScore !== null && (
                    <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded border flex-shrink-0', getMatchScoreBg(activeCard.aiScore))}>
                      {activeCard.aiScore}%
                    </span>
                  )}
                </div>
                {activeCard.jobTitle && (
                  <p className="text-[10px] text-indigo-500 font-medium truncate">{activeCard.jobTitle}</p>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
