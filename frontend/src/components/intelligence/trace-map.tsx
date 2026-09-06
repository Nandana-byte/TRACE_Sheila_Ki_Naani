'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Case, Evidence, TrajectoryPoint, SearchZone } from '@/lib/types';
import { MapPin, Navigation, Info, Eye, Layers, Compass, ShieldAlert, Sparkles } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface TraceMapProps {
  caseData: Case;
  evidences: Evidence[];
  trajectory: TrajectoryPoint[];
  searchZones: SearchZone[];
  selectedEvidence?: Evidence | null;
  onSelectEvidence?: (ev: Evidence) => void;
  isPoliceView?: boolean;
}

export default function TraceMap({
  caseData,
  evidences,
  trajectory,
  searchZones,
  selectedEvidence,
  onSelectEvidence,
  isPoliceView = true
}: TraceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedZone, setSelectedZone] = useState<SearchZone | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  const isMapboxConfigured = Boolean(
    mapboxToken &&
    mapboxToken.startsWith('pk.') &&
    !mapboxToken.includes('demo_token')
  );

  const centerLat = caseData.last_seen_lat;
  const centerLng = caseData.last_seen_lng;

  // Compute dynamic bounding box for mathematically projected fallback canvas
  const projection = useMemo(() => {
    const allLats = [centerLat, ...evidences.map(e => e.latitude), ...searchZones.map(z => z.latitude)];
    const allLngs = [centerLng, ...evidences.map(e => e.longitude), ...searchZones.map(z => z.longitude)];

    const minLat = Math.min(...allLats) - 0.003;
    const maxLat = Math.max(...allLats) + 0.003;
    const minLng = Math.min(...allLngs) - 0.004;
    const maxLng = Math.max(...allLngs) + 0.004;

    const latSpan = Math.max(maxLat - minLat, 0.005);
    const lngSpan = Math.max(maxLng - minLng, 0.005);

    // Projects (lat, lng) to canvas percentages [5%..95%]
    const project = (lat: number, lng: number) => {
      const xPercent = 10 + ((lng - minLng) / lngSpan) * 80;
      const yPercent = 90 - ((lat - minLat) / latSpan) * 80; // Inverted Y for screen coordinates
      return { x: Math.max(8, Math.min(92, xPercent)), y: Math.max(8, Math.min(92, yPercent)) };
    };

    return { project, minLat, maxLat, minLng, maxLng };
  }, [centerLat, centerLng, evidences, searchZones]);

  // Attempt real Mapbox GL JS initialization if configured
  useEffect(() => {
    if (!isMapboxConfigured || !mapContainerRef.current) {
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [centerLng, centerLat],
        zoom: 15,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');

      map.on('load', () => {
        setMapLoaded(true);
        mapRef.current = map;
      });

      map.on('error', () => {
        setMapError(true);
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch {
      setMapError(true);
    }
  }, [isMapboxConfigured, mapboxToken, centerLat, centerLng]);

  // Update Mapbox Markers and Trajectory lines if Mapbox is active
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add Origin Marker
    const originEl = document.createElement('div');
    originEl.className = 'w-7 h-7 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white font-bold text-xs shadow-xl cursor-pointer';
    originEl.innerText = '1';
    const originMarker = new mapboxgl.Marker(originEl)
      .setLngLat([centerLng, centerLat])
      .addTo(map);
    markersRef.current.push(originMarker);

    // Add Evidence Markers
    evidences.forEach((ev, idx) => {
      const el = document.createElement('div');
      const isVerified = ev.verification_status === 'VERIFIED';
      const isPending = ev.verification_status === 'PENDING';
      const bgColor = isVerified ? 'bg-emerald-600' : isPending ? 'bg-amber-500' : 'bg-red-500';
      el.className = `w-6 h-6 rounded-full ${bgColor} border-2 border-white flex items-center justify-center text-white font-bold text-[10px] shadow-lg cursor-pointer transition-transform hover:scale-125`;
      el.innerText = `${idx + 2}`;
      el.onclick = () => onSelectEvidence?.(ev);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([ev.longitude, ev.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    });

    // Add Trajectory GeoJSON Line
    const verifiedEv = evidences.filter(e => e.verification_status === 'VERIFIED');
    const coordinates = [
      [centerLng, centerLat],
      ...verifiedEv.map(e => [e.longitude, e.latitude])
    ];

    const sourceId = 'trajectory-source';
    const layerId = 'trajectory-layer';

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates }
      });
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates }
        }
      });
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#10b981',
          'line-width': 4,
          'line-dasharray': [2, 2]
        }
      });
    }
  }, [mapLoaded, evidences, centerLat, centerLng, onSelectEvidence]);

  const verifiedEvidences = evidences.filter(e => e.verification_status === 'VERIFIED');

  return (
    <div className="relative w-full h-full bg-[#0a0f1d] flex flex-col justify-between overflow-hidden">
      {/* Map Header Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs shadow-xl">
        <Compass className="w-4 h-4 text-blue-400 animate-spin-slow" />
        <span className="font-semibold text-white">
          {isPoliceView ? 'TRACE Geospatial Intelligence Map' : 'Public Search Map'}
        </span>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
          {isMapboxConfigured && !mapError ? 'Mapbox GL Vector' : 'High-Precision Geographic Grid'}
        </span>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/95 border border-slate-800 backdrop-blur-md p-3 rounded-xl text-xs space-y-2 shadow-xl hidden sm:block max-w-xs">
        <div className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
          Geographic Layers
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white flex items-center justify-center text-[8px] text-white font-bold">1</span>
            <span>Last Confirmed Sighting (Origin)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white" />
            <span>Verified Clue Sighting</span>
          </div>

          {isPoliceView && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-white" />
                <span>Pending Review (Civilian Report)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-emerald-400 bg-emerald-500/20" />
                <span>TRACE Priority Search Zone</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected Search Zone Detail Modal overlay */}
      {isPoliceView && selectedZone && (
        <div className="absolute top-4 right-4 z-20 bg-slate-900/95 border border-slate-800 backdrop-blur-md p-4 rounded-xl text-xs max-w-xs shadow-2xl space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              Rank #{selectedZone.rank} Search Priority
            </span>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-slate-400 hover:text-white font-bold text-sm"
            >
              ×
            </button>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <h4 className="font-bold text-base text-white truncate max-w-[200px]">{selectedZone.name}</h4>
            <span className="text-xl font-extrabold font-mono text-emerald-400">
              {selectedZone.score}%
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed text-[11px] border-t border-slate-800/80 pt-2">
            {selectedZone.explanation}
          </p>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Coordinates: {selectedZone.latitude.toFixed(4)}, {selectedZone.longitude.toFixed(4)}</span>
            <span className="text-blue-400">Radius: {selectedZone.radius}m</span>
          </div>
        </div>
      )}

      {/* MAP VIEWPORT: Mapbox GL JS Container OR Projected Geographic Canvas */}
      {isMapboxConfigured && !mapError ? (
        <div ref={mapContainerRef} className="w-full h-full" />
      ) : (
        /* DYNAMIC GEOGRAPHICALLY-PROJECTED CANVAS (Works with ANY coordinates worldwide) */
        <div className="w-full h-full relative overflow-hidden bg-[#070b14] flex items-center justify-center select-none">
          {/* Subtle Grid Pattern */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `radial-gradient(#3b82f6 1px, transparent 1px)`,
              backgroundSize: '28px 28px'
            }}
          />

          {/* SVG Vector Overlay for Trajectory and Search Zones */}
          <svg className="w-full h-full absolute inset-0 z-10 pointer-events-none">
            <defs>
              <linearGradient id="trajectory-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Dynamic Search Priority Circles */}
            {isPoliceView && searchZones.map((zone, idx) => {
              const pt = projection.project(zone.latitude, zone.longitude);
              return (
                <g key={zone.id || idx} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedZone(zone)}>
                  <circle
                    cx={`${pt.x}%`}
                    cy={`${pt.y}%`}
                    r={35 + (zone.score * 0.25)}
                    fill={idx === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.10)'}
                    stroke={idx === 0 ? '#10b981' : '#3b82f6'}
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    className="transition-all hover:stroke-emerald-400 hover:scale-105"
                  />
                  <text
                    x={`${pt.x}%`}
                    y={`calc(${pt.y}% - 40px)`}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                    className="font-mono drop-shadow-md"
                  >
                    {zone.name} ({zone.score}%)
                  </text>
                </g>
              );
            })}

            {/* Dynamic Trajectory Polyline connecting Origin -> Verified Clues */}
            {verifiedEvidences.length > 0 && (
              <polyline
                points={[
                  projection.project(centerLat, centerLng),
                  ...verifiedEvidences.map(e => projection.project(e.latitude, e.longitude))
                ].map(p => `${p.x}%,${p.y}%`).join(' ')}
                fill="none"
                stroke="url(#trajectory-gradient)"
                strokeWidth="3.5"
                strokeDasharray="6,4"
                className="animate-pulse"
              />
            )}
          </svg>

          {/* HTML Interactive Markers positioned via dynamic projection */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* 1. Origin Marker */}
            {(() => {
              const p = projection.project(centerLat, centerLng);
              return (
                <div
                  className="absolute pointer-events-auto cursor-pointer"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="w-8 h-8 rounded-full bg-red-500/30 animate-pulse absolute" />
                    <div className="w-7 h-7 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white font-bold text-xs shadow-xl">
                      1
                    </div>
                  </div>
                  <div className="bg-slate-900/90 text-white font-mono text-[10px] px-2 py-0.5 rounded border border-slate-800 mt-1 shadow-md text-center whitespace-nowrap">
                    {caseData.last_seen_location}
                  </div>
                </div>
              );
            })()}

            {/* Evidence Markers */}
            {evidences.map((ev, idx) => {
              const p = projection.project(ev.latitude, ev.longitude);
              const isVerified = ev.verification_status === 'VERIFIED';
              const isPending = ev.verification_status === 'PENDING';
              const isSelected = selectedEvidence?.id === ev.id;

              if (!isPoliceView && !isVerified) return null;

              return (
                <div
                  key={ev.id || idx}
                  onClick={() => onSelectEvidence?.(ev)}
                  className={`absolute pointer-events-auto cursor-pointer transition-transform ${isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-20'}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="relative flex items-center justify-center">
                    {isVerified && <span className="w-7 h-7 rounded-full bg-emerald-500/30 animate-pulse absolute" />}
                    <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-xs shadow-lg ${
                      isVerified ? 'bg-emerald-600' : isPending ? 'bg-amber-500' : 'bg-red-500'
                    }`}>
                      {idx + 2}
                    </div>
                  </div>
                  <div className="bg-slate-900/90 text-slate-200 font-mono text-[9px] px-2 py-0.5 rounded border border-slate-800 mt-1 shadow-md text-center whitespace-nowrap max-w-[120px] truncate">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} {ev.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
