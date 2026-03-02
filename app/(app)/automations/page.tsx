'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  NodeProps,
  Handle,
  Position,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Plus, Zap, GitBranch, Play, Clock, Brain } from 'lucide-react'
import { MOCK_AUTOMATIONS } from '@/lib/constants'
import StatusBadge from '@/components/cards/status-badge'
import { formatRelativeTime, cn } from '@/lib/utils'

function TriggerNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-accent rounded-xl p-4 min-w-[200px] shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center">
          <Zap className="w-3 h-3 text-accent" />
        </div>
        <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Trigger</span>
      </div>
      <p className="text-neutral-900 text-sm font-semibold">{data.label}</p>
      {data.description && <p className="text-neutral-500 text-xs mt-1">{data.description}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}

function ConditionNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-warning-700 rounded-xl p-4 min-w-[200px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-warning-700 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-warning-50 flex items-center justify-center">
          <GitBranch className="w-3 h-3 text-warning-700" />
        </div>
        <span className="text-[10px] font-semibold text-warning-700 uppercase tracking-wider">Condition</span>
      </div>
      <p className="text-neutral-900 text-sm font-semibold">{data.label}</p>
      {data.description && <p className="text-neutral-500 text-xs mt-1">{data.description}</p>}
      <div className="flex gap-6 mt-2">
        <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} className="!bg-success-700 !w-3 !h-3 !border-2 !border-white" />
        <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} className="!bg-error-700 !w-3 !h-3 !border-2 !border-white" />
      </div>
      <div className="flex justify-between mt-1 text-xs">
        <span className="text-success-700 ml-2">Yes</span>
        <span className="text-error-700 mr-2">No</span>
      </div>
    </div>
  )
}

function ActionNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-success-700 rounded-xl p-4 min-w-[200px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-success-700 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-success-50 flex items-center justify-center">
          <Play className="w-3 h-3 text-success-700" />
        </div>
        <span className="text-[10px] font-semibold text-success-700 uppercase tracking-wider">Action</span>
      </div>
      <p className="text-neutral-900 text-sm font-semibold">{data.label}</p>
      {data.description && <p className="text-neutral-500 text-xs mt-1">{data.description}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-success-700 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}

function DelayNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-neutral-300 rounded-xl p-4 min-w-[200px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-neutral-400 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center">
          <Clock className="w-3 h-3 text-neutral-500" />
        </div>
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Delay</span>
      </div>
      <p className="text-neutral-900 text-sm font-semibold">{data.label}</p>
      {data.description && <p className="text-neutral-500 text-xs mt-1">{data.description}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-neutral-400 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}

function AITaskNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-primary-500 rounded-xl p-4 min-w-[200px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-primary-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center">
          <Brain className="w-3 h-3 text-primary-500" />
        </div>
        <span className="text-[10px] font-semibold text-primary-500 uppercase tracking-wider">AI Task</span>
      </div>
      <p className="text-neutral-900 text-sm font-semibold">{data.label}</p>
      {data.description && <p className="text-neutral-500 text-xs mt-1">{data.description}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-primary-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}

const nodeTypes = { trigger: TriggerNode, condition: ConditionNode, action: ActionNode, delay: DelayNode, ai_task: AITaskNode }

const defaultNodes: Node[] = [
  { id: '1', type: 'trigger',   position: { x: 250, y: 50  }, data: { label: 'New Candidate Sourced', description: 'Via LinkedIn or GitHub' } },
  { id: '2', type: 'ai_task',   position: { x: 250, y: 220 }, data: { label: 'Calculate Match Score', description: 'AI evaluates candidate fit' } },
  { id: '3', type: 'condition', position: { x: 250, y: 400 }, data: { label: 'Match Score > 80?', description: 'High quality threshold' } },
  { id: '4', type: 'action',    position: { x: 80,  y: 600 }, data: { label: 'Send Outreach Email', description: 'Personalized intro email' } },
  { id: '5', type: 'delay',     position: { x: 80,  y: 780 }, data: { label: 'Wait 3 Days', description: 'Follow-up window' } },
  { id: '6', type: 'action',    position: { x: 80,  y: 950 }, data: { label: 'Send Follow-up', description: 'If no reply to first email' } },
  { id: '7', type: 'action',    position: { x: 430, y: 600 }, data: { label: 'Add to Nurture List', description: 'For future opportunities' } },
]

const defaultEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#E3E3E3', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#E3E3E3', strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', sourceHandle: 'true',  style: { stroke: '#15803D', strokeWidth: 2 } },
  { id: 'e3-7', source: '3', target: '7', sourceHandle: 'false', style: { stroke: '#BE123C', strokeWidth: 2 } },
  { id: 'e4-5', source: '4', target: '5', style: { stroke: '#E3E3E3', strokeWidth: 2 } },
  { id: 'e5-6', source: '5', target: '6', style: { stroke: '#E3E3E3', strokeWidth: 2 } },
]

export default function AutomationsPage() {
  const [selectedAutomation, setSelectedAutomation] = useState(MOCK_AUTOMATIONS[0])
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges)
  const [showBuilder, setShowBuilder] = useState(false)

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({ ...params, style: { stroke: '#E3E3E3', strokeWidth: 2 } }, eds)),
    [setEdges]
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-950 text-xl font-semibold">Automations</h1>
          <p className="text-neutral-400 text-sm mt-0.5">AI-powered workflow automation</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: '8' },
          { label: 'Active', value: '6' },
          { label: 'Triggers Today', value: '147' },
          { label: 'Emails Sent', value: '89' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-neutral-500 text-xs mb-1">{stat.label}</p>
            <p className="text-neutral-950 text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="space-y-2.5">
          {MOCK_AUTOMATIONS.map((automation, i) => (
            <motion.div
              key={automation.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => { setSelectedAutomation(automation); setShowBuilder(true) }}
              className={cn(
                'bg-white border rounded-xl p-4 cursor-pointer transition-all duration-150',
                selectedAutomation.id === automation.id && showBuilder
                  ? 'border-accent ring-1 ring-accent/20'
                  : 'border-neutral-200 hover:border-neutral-300'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', automation.status === 'active' ? 'bg-success-50' : 'bg-neutral-100')}>
                    <Zap className={cn('w-3.5 h-3.5', automation.status === 'active' ? 'text-success-700' : 'text-neutral-400')} />
                  </div>
                  <span className="text-neutral-900 text-sm font-semibold">{automation.name}</span>
                </div>
                <StatusBadge status={automation.status} />
              </div>
              {automation.description && <p className="text-neutral-500 text-xs mb-3">{automation.description}</p>}
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{automation.triggerCount} triggers</span>
                {automation.lastTriggered && <span>Last: {formatRelativeTime(automation.lastTriggered)}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="col-span-2">
          {showBuilder ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
              style={{ height: '620px' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-neutral-900 text-sm font-semibold">{selectedAutomation.name}</span>
                  <StatusBadge status={selectedAutomation.status} />
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-success-700 bg-success-50 border border-success-200 rounded-lg hover:bg-success-200/30 transition-colors">
                    <Play className="w-3 h-3" />Test
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors">
                    Save
                  </button>
                </div>
              </div>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#E3E3E3" variant={BackgroundVariant.Dots} gap={20} size={1} />
                <Controls />
              </ReactFlow>
            </motion.div>
          ) : (
            <div className="bg-neutral-50 border border-dashed border-neutral-300 rounded-xl flex flex-col items-center justify-center h-[620px]">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <p className="text-neutral-900 text-sm font-semibold mb-1">Select an automation to edit</p>
              <p className="text-neutral-400 text-xs">or create a new one</p>
              <button onClick={() => setShowBuilder(true)} className="mt-4 flex items-center gap-2 text-accent text-sm hover:text-primary-600 transition-colors">
                <Plus className="w-4 h-4" />Create automation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
