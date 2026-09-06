'use client';

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { IntelligenceGraph } from '@/lib/types';
import { Network, Eye } from 'lucide-react';

interface EvidenceGraphProps {
  graphData: IntelligenceGraph | null;
  onNodeClick?: (nodeId: string) => void;
}

export default function EvidenceGraph({ graphData, onNodeClick }: EvidenceGraphProps) {
  // Convert API graph response to React Flow initial nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      // Default Demo Graph Nodes
      const demoNodes: Node[] = [
        {
          id: 'origin',
          position: { x: 50, y: 120 },
          data: { label: 'Origin: Vellore Bus Stand (17:45)' },
          style: { background: '#991b1b', color: '#ffffff', border: '1px solid #f87171', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', padding: '10px' }
        },
        {
          id: 'ev_cctv_1',
          position: { x: 280, y: 50 },
          data: { label: 'CCTV #04 — Bus Stand Rd (18:03)\nBlue Clothing Match' },
          style: { background: '#1e293b', color: '#ffffff', border: '1px solid #3b82f6', borderRadius: '8px', fontSize: '11px', padding: '10px' }
        },
        {
          id: 'ev_witness_1',
          position: { x: 480, y: 120 },
          data: { label: 'Witness Report — Railway Rd (18:08)\nHeading to Station' },
          style: { background: '#1e293b', color: '#ffffff', border: '1px solid #3b82f6', borderRadius: '8px', fontSize: '11px', padding: '10px' }
        },
        {
          id: 'ev_photo_1',
          position: { x: 480, y: 240 },
          data: { label: 'Social Media Photo (18:14)\nCorroborates Witness' },
          style: { background: '#1e293b', color: '#ffffff', border: '1px solid #8b5cf6', borderRadius: '8px', fontSize: '11px', padding: '10px' }
        },
        {
          id: 'ev_witness_2',
          position: { x: 720, y: 120 },
          data: { label: 'Witness — Railway Station (18:19)\nPlatform Entrance #1' },
          style: { background: '#064e3b', color: '#34d399', border: '1px solid #10b981', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', padding: '10px' }
        }
      ];

      const demoEdges: Edge[] = [
        { id: 'e1', source: 'origin', target: 'ev_cctv_1', label: 'SPATIALLY_FOLLOWS', animated: true, style: { stroke: '#3b82f6' } },
        { id: 'e2', source: 'ev_cctv_1', target: 'ev_witness_1', label: 'TEMPORALLY_FOLLOWS', animated: true, style: { stroke: '#3b82f6' } },
        { id: 'e3', source: 'ev_witness_1', target: 'ev_photo_1', label: 'CORROBORATES', style: { stroke: '#10b981', strokeWidth: 2 } },
        { id: 'e4', source: 'ev_witness_1', target: 'ev_witness_2', label: 'SPATIALLY_FOLLOWS', animated: true, style: { stroke: '#3b82f6' } },
        { id: 'e5', source: 'ev_photo_1', target: 'ev_witness_2', label: 'SUPPORTS', style: { stroke: '#10b981' } }
      ];

      return { initialNodes: demoNodes, initialEdges: demoEdges };
    }

    const flowNodes: Node[] = graphData.nodes.map((n, idx) => ({
      id: n.id,
      position: { x: 80 + (idx % 4) * 220, y: 80 + Math.floor(idx / 4) * 140 },
      data: { label: n.label },
      style: {
        background: n.type === 'origin' ? '#991b1b' : '#1e293b',
        color: '#ffffff',
        border: `1px solid ${n.type === 'origin' ? '#ef4444' : '#3b82f6'}`,
        borderRadius: '8px',
        fontSize: '11px',
        padding: '10px'
      }
    }));

    const flowEdges: Edge[] = graphData.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.type.includes('FOLLOWS'),
      style: { stroke: e.type.includes('CORROBORATES') ? '#10b981' : '#3b82f6' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
    }));

    return { initialNodes: flowNodes, initialEdges: flowEdges };
  }, [graphData]);

  return (
    <div className="w-full h-72 bg-[#090d16] border-t border-slate-800 relative flex flex-col">
      {/* Header Bar */}
      <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between z-10 text-xs">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-white">Interactive Evidence Graph (React Flow)</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Sequence</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Corroborates</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> Supports</span>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          fitView
          attributionPosition="bottom-right"
          onNodeClick={(_, node) => onNodeClick?.(node.id)}
        >
          <Background color="#334155" gap={16} size={1} />
          <Controls className="bg-slate-900 border-slate-800 fill-white text-white" />
        </ReactFlow>
      </div>
    </div>
  );
}
