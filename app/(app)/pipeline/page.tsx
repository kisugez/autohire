'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { Plus, MapPin } from 'lucide-react'
import { Candidate, CandidateStage } from '@/types/candidate'
import { MOCK_CANDIDATES } from '@/lib/constants'
import { getInitials, getMatchScoreBg, cn } from '@/lib/utils'

const STAGES: { id: CandidateStage; label: string; dot: string }[] = [
  { id: 'sourced',   label: 'Sourced',   dot: 'bg-neutral-400' },
  { id: 'screening', label: 'Screening', dot: 'bg-info-700' },
  { id: 'interview', label: 'Interview', dot: 'bg-accent' },
  { id: 'offer',     label: 'Offer',     dot: 'bg-warning-700' },
  { id: 'hired',     label: 'Hired',     dot: 'bg-success-700' },
  { id: 'rejected',  label: 'Rejected',  dot: 'bg-error-700' },
]

function SortableCandidateCard({ candidate }: { candidate: Candidate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidate.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className={cn(
        'bg-white border border-neutral-200 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-neutral-300 hover:shadow-sm transition-all duration-150 group',
        isDragging && 'opacity-30'
      )}>
        <div className="flex items-start gap-2.5 mb-2.5">
          <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {getInitials(candidate.name)}
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/candidates/${candidate.id}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-neutral-900 text-xs font-semibold truncate hover:text-accent transition-colors">{candidate.name}</h3>
            </Link>
            <p className="text-neutral-400 text-xs truncate">{candidate.title}</p>
          </div>
          <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded border', getMatchScoreBg(candidate.matchScore))}>
            {candidate.matchScore}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{candidate.location}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {candidate.skills.slice(0, 2).map(skill => (
            <span key={skill} className="px-1.5 py-0.5 rounded text-xs bg-neutral-100 text-neutral-500 border border-neutral-200">{skill}</span>
          ))}
        </div>
        {candidate.tags.length > 0 && (
          <div className="mt-2">
            <span className="text-xs text-accent font-medium">{candidate.tags[0]}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const [candidates, setCandidates] = useState<Record<CandidateStage, Candidate[]>>(() => {
    const map: Record<string, Candidate[]> = {}
    STAGES.forEach(s => { map[s.id] = [] })
    MOCK_CANDIDATES.forEach(c => { if (map[c.stage]) map[c.stage].push(c) })
    return map as Record<CandidateStage, Candidate[]>
  })
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const findStageForCandidate = (id: string): CandidateStage | null => {
    for (const stage of STAGES) {
      if (candidates[stage.id].some(c => c.id === id)) return stage.id
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    const stage = findStageForCandidate(event.active.id as string)
    if (stage) setActiveCandidate(candidates[stage].find(c => c.id === event.active.id) || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCandidate(null)
    if (!over) return
    const activeStage = findStageForCandidate(active.id as string)
    const overStage = STAGES.find(s => s.id === over.id)?.id
    if (activeStage && overStage && activeStage !== overStage) {
      setCandidates(prev => {
        const activeItems = [...prev[activeStage]]
        const overItems = [...prev[overStage]]
        const idx = activeItems.findIndex(c => c.id === active.id)
        const [moved] = activeItems.splice(idx, 1)
        overItems.push({ ...moved, stage: overStage })
        return { ...prev, [activeStage]: activeItems, [overStage]: overItems }
      })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Pipeline</h1>
          <p className="text-neutral-400 text-sm mt-0.5">Drag and drop candidates between stages</p>
        </div>
        <button className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Candidate
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageCandidates = candidates[stage.id]
            return (
              <div key={stage.id} className="flex-shrink-0 w-64" id={stage.id}>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', stage.dot)} />
                    <span className="text-neutral-700 text-sm font-medium">{stage.label}</span>
                    <span className="text-xs bg-neutral-100 text-neutral-500 border border-neutral-200 rounded-full px-2 py-0.5">
                      {stageCandidates.length}
                    </span>
                  </div>
                  <button className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <SortableContext items={stageCandidates.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div id={stage.id} className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 space-y-2 min-h-[200px]">
                    {stageCandidates.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-neutral-400 text-xs border border-dashed border-neutral-300 rounded-lg">
                        Drop here
                      </div>
                    ) : (
                      stageCandidates.map(candidate => (
                        <SortableCandidateCard key={candidate.id} candidate={candidate} />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeCandidate && (
            <div className="bg-white border border-accent/30 rounded-xl p-3.5 shadow-lg rotate-1 scale-105 w-64">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center text-white text-[10px] font-bold">
                  {getInitials(activeCandidate.name)}
                </div>
                <div>
                  <h3 className="text-neutral-900 text-xs font-semibold">{activeCandidate.name}</h3>
                  <p className="text-neutral-400 text-xs">{activeCandidate.title}</p>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
