"use client";

/*

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SeatMapConfig,
  MapElement,
  Point,
  SeatCategory,
  createDefaultConfig,
  createSeatRow,
  createSeat,
  createWall,
  createWalkway,
  createEntrance,
  createGap,
  generateId,
} from "@/lib/seat-map-types";
import {
  MousePointer2,
  Square,
  Minus,
  DoorOpen,
  Type,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Save,
  Trash2,
  Move,
  LayoutGrid,
  Armchair,
} from "lucide-react";

interface SeatMapEditorProps {
  initialConfig?: SeatMapConfig;
  onSave: (config: SeatMapConfig) => void;
  venueId: string;
}
type SimpleTool = 'select' | 'pan' | 'seat' | 'wall' | 'walkway' | 'entrance' | 'label' | 'gap' | 'stage';


type SimpleTool = 'select' | 'pan' | 'seat' | 'wall' | 'walkway' | 'entrance' | 'label' | 'gap' | 'stage';

const GRID_SIZE = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

const ensureSeatMapConfig = (config?: SeatMapConfig | null): SeatMapConfig => {
  const defaults = createDefaultConfig();
  if (!config) {
    return defaults;
  }

  const partial = config as Partial<SeatMapConfig>;

  const elements = Array.isArray(partial.elements) ? [...partial.elements] : [...defaults.elements];
  const sections = Array.isArray(partial.sections) && partial.sections.length > 0
    ? [...partial.sections]
    : [...defaults.sections];

  return {
    ...defaults,
    ...config,
    version: 3,
    canvasWidth: partial.canvasWidth ?? defaults.canvasWidth,
    canvasHeight: partial.canvasHeight ?? defaults.canvasHeight,
    gridSize: partial.gridSize ?? defaults.gridSize,
    seatSize: partial.seatSize ?? defaults.seatSize,
    elements,
    sections,
  };
};

const TOOL_ICONS: Record<SimpleTool, React.ReactNode> = {
  select: <MousePointer2 className="h-4 w-4" />,
  pan: <Move className="h-4 w-4" />,
  seat: <Armchair className="h-4 w-4" />,
  wall: <Square className="h-4 w-4" />,
  walkway: <Minus className="h-4 w-4" />,
  entrance: <DoorOpen className="h-4 w-4" />,
  label: <Type className="h-4 w-4" />,
  gap: <Grid3X3 className="h-4 w-4" />,
  stage: <LayoutGrid className="h-4 w-4" />,
};

const TOOL_LABELS: Record<SimpleTool, string> = {
  select: "Velg",
  pan: "Flytt",
  seat: "Sete",
  wall: "Vegg",
  walkway: "Gangvei",
  entrance: "Inngang",
  label: "Tekst",
  gap: "Gap",
  stage: "Scene",
};

// placeholder
export function SeatMapEditor({ initialConfig, onSave, venueId }: SeatMapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [config, setConfig] = useState<SeatMapConfig>(() => 
    ensureSeatMapConfig(initialConfig)
  );
  const [tool, setTool] = useState<SimpleTool>("select");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSection, setSelectedSection] = useState<string>("main");
  const [selectedCategory, setSelectedCategory] = useState<SeatCategory>("standard");
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState<SeatMapConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  
  const [rowInput, setRowInput] = useState({ count: 10, startLabel: "A", rowNum: 1 });

  const saveToHistory = useCallback((newConfig: SeatMapConfig) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newConfig)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);

  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - offset.x) / zoom,
      y: (screenY - rect.top - offset.y) / zoom,
    };
  }, [offset, zoom]);

  const snapToGrid = useCallback((point: Point): Point => ({
    x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
  }), []);

  const getElementBounds = useCallback((el: MapElement): { x: number, y: number, w: number, h: number } => {
    if (el.type === 'seat') {
      const size = config.seatSize || 28;
      return { x: el.x, y: el.y, w: size, h: size };
    }
    if (el.type === 'label') {
      return { x: el.x, y: el.y, w: 60, h: 20 };
    }
    return { x: el.x, y: el.y, w: el.width, h: el.height };
  }, [config.seatSize]);

  const findElementAt = useCallback((point: Point): MapElement | null => {
    for (let i = config.elements.length - 1; i >= 0; i--) {
      const el = config.elements[i];
      const bounds = getElementBounds(el);
      if (point.x >= bounds.x - bounds.w/2 && point.x <= bounds.x + bounds.w/2 &&
          point.y >= bounds.y - bounds.h/2 && point.y <= bounds.y + bounds.h/2) {
        return el;
      }
    }
    return null;
  }, [config.elements, getElementBounds]);

  const addElement = useCallback((element: MapElement) => {
    const newConfig = { ...config, elements: [...config.elements, element] };
    setConfig(newConfig);
    saveToHistory(newConfig);
  }, [config, saveToHistory]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const newConfig = {
      ...config,
      elements: config.elements.filter((el) => !selectedIds.has(el.id)),
    };
    setConfig(newConfig);
    saveToHistory(newConfig);
    setSelectedIds(new Set());
  }, [config, selectedIds, saveToHistory]);

  const addSeatRowHandler = useCallback(() => {
    const { count, startLabel, rowNum } = rowInput;
    const existingSeats = config.elements.filter(e => e.type === "seat");
    const maxY = existingSeats.length > 0 
      ? Math.max(...existingSeats.map(s => s.y)) + (config.seatSize || 28) + 12
      : 180;
    
    const newSeats = createSeatRow(
      50,
      maxY,
      count,
      startLabel,
      selectedSection,
      config.seatSize || 28,
      4,
      1,
      selectedCategory
    );
    
    const newConfig = { ...config, elements: [...config.elements, ...newSeats] };
    setConfig(newConfig);
    saveToHistory(newConfig);
    setRowInput({ 
      ...rowInput, 
      rowNum: rowNum + 1, 
      startLabel: String.fromCharCode(startLabel.charCodeAt(0) + 1) 
    });
  }, [config, rowInput, selectedSection, selectedCategory, saveToHistory]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const point = screenToWorld(e.clientX, e.clientY);
    const snapped = snapToGrid(point);
    
    if (tool === "pan" || e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }
    
    if (tool === "select") {
      const el = findElementAt(point);
      if (el) {
        if (e.shiftKey) {
          const newSet = new Set(selectedIds);
          if (newSet.has(el.id)) newSet.delete(el.id);
          else newSet.add(el.id);
          setSelectedIds(newSet);
        } else {
          setSelectedIds(new Set([el.id]));
        }
        setIsDragging(true);
        setDragStart(point);
      } else {
        setSelectedIds(new Set());
        setIsDragging(true);
        setDragStart(point);
        setDragCurrent(point);
      }
      return;
    }
    
    if (["wall", "walkway", "stage"].includes(tool)) {
      setIsDragging(true);
      setDragStart(snapped);
      setDragCurrent(snapped);
      return;
    }
    
    if (tool === "seat") {
      const seatCount = config.elements.filter(e => e.type === "seat").length;
      addElement(createSeat(snapped.x, snapped.y, "A", seatCount + 1, selectedSection, selectedCategory));
      return;
    }
    
    if (tool === "entrance") {
      addElement(createEntrance(snapped.x, snapped.y, 60, 30, 'main'));
      return;
    }
    
    if (tool === "label") {
      const labelText = prompt("Skriv inn tekst:");
      if (labelText) {
        addElement({
          type: 'label',
          id: generateId('label'),
          x: snapped.x,
          y: snapped.y,
          text: labelText,
          fontSize: 14,
        });
      }
      return;
    }
    
    if (tool === "gap") {
      addElement(createGap(snapped.x, snapped.y, 40, 40));
    }
  }, [tool, screenToWorld, snapToGrid, offset, selectedIds, findElementAt, addElement, selectedSection, selectedCategory, config.elements]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStart) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    
    if (isDragging && dragStart) {
      const point = screenToWorld(e.clientX, e.clientY);
      const snapped = snapToGrid(point);
      
      if (["wall", "walkway", "stage"].includes(tool)) {
        setDragCurrent(snapped);
        return;
      }
      
      if (tool === "select" && selectedIds.size > 0) {
        const dx = point.x - dragStart.x;
        const dy = point.y - dragStart.y;
        setConfig(prev => ({
          ...prev,
          elements: prev.elements.map(el => 
            selectedIds.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el
          ),
        }));
        setDragStart(point);
        return;
      }
      setDragCurrent(point);
    }
  }, [isPanning, panStart, isDragging, dragStart, tool, selectedIds, screenToWorld, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    
    if (isDragging && dragStart && dragCurrent) {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const width = Math.abs(dragCurrent.x - dragStart.x);
      const height = Math.abs(dragCurrent.y - dragStart.y);
      
      if (width > 10 || height > 10) {
        if (tool === "wall") {
          addElement(createWall(x + width/2, y + height/2, width, height));
        } else if (tool === "walkway") {
          addElement(createWalkway(x + width/2, y + height/2, width, height));
        } else if (tool === "stage") {
          addElement({
            type: 'stage',
            id: generateId('stage'),
            x: x + width/2,
            y: y + height/2,
            width,
            height,
            shape: 'rectangle',
            label: 'SCENE',
          });
        }
      }
      
      if (tool === "select" && selectedIds.size === 0) {
        const x1 = Math.min(dragStart.x, dragCurrent.x);
        const y1 = Math.min(dragStart.y, dragCurrent.y);
        const x2 = Math.max(dragStart.x, dragCurrent.x);
        const y2 = Math.max(dragStart.y, dragCurrent.y);
        
        const selected = new Set<string>();
        config.elements.forEach(el => {
          if (el.x >= x1 && el.x <= x2 && el.y >= y1 && el.y <= y2) selected.add(el.id);
        });
        setSelectedIds(selected);
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  }, [isPanning, isDragging, dragStart, dragCurrent, tool, addElement, config.elements, selectedIds.size]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * delta)));
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 0.5;
      const startX = Math.floor(-offset.x / zoom / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
      const startY = Math.floor(-offset.y / zoom / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
      const endX = startX + rect.width / zoom + GRID_SIZE * 2;
      const endY = startY + rect.height / zoom + GRID_SIZE * 2;
      
      for (let x = startX; x <= endX; x += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
      }
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
      }
    }
    
    // Draw elements
    config.elements.forEach(el => {
      const isSelected = selectedIds.has(el.id);
      const section = config.sections.find(s => el.type === 'seat' && s.id === el.section);
      ctx.save();
      
      if (el.type === "seat") {
        const size = config.seatSize || 28;
        ctx.fillStyle = section?.color || "#3b82f6";
        ctx.strokeStyle = isSelected ? "#000" : "#1d4ed8";
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.beginPath();
        ctx.roundRect(el.x - size/2, el.y - size/2, size, size, 4);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.row + el.number, el.x, el.y);
      }
      
      if (el.type === "wall") {
        ctx.fillStyle = "#374151";
        ctx.strokeStyle = isSelected ? "#000" : "#1f2937";
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.fillRect(el.x - el.width/2, el.y - el.height/2, el.width, el.height);
        ctx.strokeRect(el.x - el.width/2, el.y - el.height/2, el.width, el.height);
      }
      
      if (el.type === "walkway") {
        ctx.fillStyle = "#fef3c7";
        ctx.strokeStyle = isSelected ? "#000" : "#f59e0b";
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.setLineDash([5, 5]);
        ctx.fillRect(el.x - el.width/2, el.y - el.height/2, el.width, el.height);
        ctx.strokeRect(el.x - el.width/2, el.y - el.height/2, el.width, el.height);
        ctx.setLineDash([]);
      }
      
      if (el.type === "entrance") {
        ctx.fillStyle = "#dcfce7";
        ctx.strokeStyle = isSelected ? "#000" : "#22c55e";
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.beginPath();
        ctx.roundRect(el.x - el.width/2, el.y - el.height/2, el.width, el.height, 8);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#166534";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.label || "Inngang", el.x, el.y);
      }
      
      if (el.type === "stage") {
        ctx.fillStyle = "#ddd6fe";
        ctx.strokeStyle = isSelected ? "#000" : "#7c3aed";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(el.x - el.width/2, el.y - el.height/2, el.width, el.height, 8);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#5b21b6";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.label || "SCENE", el.x, el.y);
      }
      
      if (el.type === "label") {
        ctx.fillStyle = isSelected ? "#000" : "#374151";
        ctx.font = `bold ${el.fontSize || 14}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.text, el.x, el.y);
      }
      
      if (el.type === "gap") {
        ctx.fillStyle = "#f3f4f6";
        ctx.strokeStyle = isSelected ? "#000" : "#9ca3af";
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.setLineDash([3, 3]);
        ctx.fillRect(el.x - el.width/2, el.y - el.height/2, el.width, el.height);
        ctx.strokeRect(el.x - el.width/2, el.y - el.height/2, el.width, el.height);
        ctx.setLineDash([]);
      }
      
      ctx.restore();
    });
    
    // Draw drag preview
    if (isDragging && dragStart && dragCurrent && ["wall", "walkway", "stage"].includes(tool)) {
      ctx.save();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
    
    // Draw selection rectangle
    if (isDragging && dragStart && dragCurrent && tool === "select" && selectedIds.size === 0) {
      ctx.save();
      ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1;
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
    
    ctx.restore();
  }, [config, zoom, offset, showGrid, selectedIds, isDragging, dragStart, dragCurrent, tool]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement?.tagName !== "INPUT") {
        deleteSelected();
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setTool("select");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, undo, redo]);

  // Initialize history
  useEffect(() => {
    if (history.length === 0) saveToHistory(config);
  }, []);

  const seatCount = useMemo(() => config.elements.filter(e => e.type === "seat").length, [config.elements]);

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[600px] gap-4">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
          <TooltipProvider>
            {(Object.keys(TOOL_ICONS) as SimpleTool[]).map((t) => (
              <Tooltip key={t}>
                <TooltipTrigger asChild>
                  <Button variant={tool === t ? "default" : "ghost"} size="sm" onClick={() => setTool(t)}>
                    {TOOL_ICONS[t]}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{TOOL_LABELS[t]}</TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(MAX_ZOOM, z * 1.2))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom inn</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(MIN_ZOOM, z / 1.2))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom ut</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0}>
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Angre</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Gjør om</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={showGrid ? "secondary" : "ghost"} size="sm" onClick={() => setShowGrid(!showGrid)}>
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rutenett</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex-1" />
          
          <span className="text-sm text-muted-foreground">{seatCount} seter | {selectedIds.size} valgt</span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={deleteSelected} disabled={selectedIds.size === 0}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Slett</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div ref={containerRef} className="flex-1 overflow-hidden bg-white"
          style={{ cursor: tool === "pan" ? "grab" : isPanning ? "grabbing" : "crosshair" }}>
          <canvas ref={canvasRef} className="w-full h-full"
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()} />
        </div>
      </Card>
      
      <Card className="w-72 p-4 space-y-4 overflow-y-auto">
        <div>
          <h3 className="font-semibold mb-3">Legg til rad</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Antall seter</Label>
              <Input type="number" min={1} max={50} value={rowInput.count}
                onChange={(e) => setRowInput({ ...rowInput, count: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Rad</Label>
                <Input value={rowInput.startLabel} maxLength={2}
                  onChange={(e) => setRowInput({ ...rowInput, startLabel: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Radnr</Label>
                <Input type="number" min={1} value={rowInput.rowNum}
                  onChange={(e) => setRowInput({ ...rowInput, rowNum: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Seksjon</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {config.sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: sec.color }} />
                        {sec.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addSeatRowHandler} className="w-full">Legg til rad</Button>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Seksjoner</h3>
          <div className="space-y-2">
            {config.sections.map((sec) => (
              <div key={sec.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: sec.color }} />
                <span className="flex-1 text-sm">{sec.name}</span>
                <span className="text-xs text-muted-foreground">{sec.priceMultiplier}x</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Hurtigtaster</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><kbd className="px-1 bg-muted rounded">Alt</kbd> + dra = Flytt</p>
            <p><kbd className="px-1 bg-muted rounded">Shift</kbd> + klikk = Multi-velg</p>
            <p><kbd className="px-1 bg-muted rounded">Delete</kbd> = Slett</p>
            <p><kbd className="px-1 bg-muted rounded">Cmd+Z</kbd> = Angre</p>
            <p><kbd className="px-1 bg-muted rounded">Esc</kbd> = Avbryt</p>
            <p>Scroll = Zoom</p>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <Button onClick={() => onSave(config)} className="w-full">
            <Save className="h-4 w-4 mr-2" />Lagre setekart
          </Button>
        </div>
      </Card>
    </div>
  );
}

*/

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SeatMapConfig,
  type SeatElement,
  type GridCellConfig,
  createDefaultConfig,
} from "@/lib/seat-map-types";

interface SeatMapEditorProps {
  initialConfig?: SeatMapConfig;
  onSave: (config: SeatMapConfig) => void;
  venueId?: string;
}

const DEFAULT_ROWS = 12;
const DEFAULT_COLS = 20;
const MIN_ROWS = 1;
const MAX_ROWS = 40;
const MIN_COLS = 1;
const MAX_COLS = 60;
const CELL_SIZE = 32;
const CELL_GAP = 4;

type CellState = "empty" | "seat" | "handicap";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const clampDimension = (value: number | null | undefined, min: number, max: number) => {
  if (!Number.isFinite(value as number)) return min;
  return clamp((value as number) || min, min, max);
};

const createEmptyGrid = (rows: number, cols: number): CellState[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => "empty" as CellState));

const resizeGrid = (prev: CellState[][], rows: number, cols: number): CellState[][] => {
  const next = createEmptyGrid(rows, cols);
  for (let r = 0; r < Math.min(prev.length, rows); r++) {
    for (let c = 0; c < Math.min(prev[r].length, cols); c++) {
      next[r][c] = prev[r][c];
    }
  }
  return next;
};

const rowIndexToLabel = (index: number): string => {
  let i = index;
  let label = "";
  while (i >= 0) {
    label = String.fromCharCode((i % 26) + 65) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
};

const rowLabelToIndex = (label: string | number | undefined): number => {
  if (label === undefined || label === null) return -1;
  if (typeof label === "number") return label - 1;
  const trimmed = label.trim();
  if (!trimmed) return -1;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10) - 1;
  let index = 0;
  for (const ch of trimmed.toUpperCase()) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) return -1;
    index = index * 26 + (code - 64);
  }
  return index - 1;
};

const normalizeGrid = (config?: SeatMapConfig | null): { rows: number; cols: number; cells: CellState[][] } => {
  if (!config) {
    const rows = DEFAULT_ROWS;
    const cols = DEFAULT_COLS;
    return { rows, cols, cells: createEmptyGrid(rows, cols) };
  }

  const gridRows = clampDimension((config as any).gridRows ?? undefined, MIN_ROWS, MAX_ROWS);
  const gridCols = clampDimension((config as any).gridCols ?? undefined, MIN_COLS, MAX_COLS);
  const hasCells = Array.isArray((config as any).cells) && (config as any).cells.length > 0;
  const seatElements = Array.isArray(config.elements)
    ? (config.elements.filter((el) => el.type === "seat") as SeatElement[])
    : [];

  if (hasCells) {
    const source = (config as any).cells as GridCellConfig[][];
    const rows = clampDimension(gridRows || source.length, MIN_ROWS, MAX_ROWS);
    const cols = clampDimension(
      Math.max(...source.map((row) => (Array.isArray(row) ? row.length : 0)), MIN_COLS),
      MIN_COLS,
      MAX_COLS
    );
    const cells = createEmptyGrid(rows, cols);

    source.forEach((row, rIdx) => {
      row?.forEach((cell, cIdx) => {
        if (rIdx < rows && cIdx < cols) {
          if (cell?.type === "handicap") {
            cells[rIdx][cIdx] = "handicap";
          } else if (cell?.type === "seat") {
            cells[rIdx][cIdx] = "seat";
          }
        }
      });
    });
    return { rows, cols, cells };
  }

  if (seatElements.length > 0) {
    const rowIndices = seatElements
      .map((seat) => rowLabelToIndex(seat.row))
      .filter((value) => value >= 0);
    const maxRow = rowIndices.length > 0 ? Math.max(...rowIndices) + 1 : DEFAULT_ROWS;
    const maxNumber = seatElements.length > 0 ? Math.max(...seatElements.map((seat) => seat.number || 0)) : DEFAULT_COLS;

    const rows = clampDimension(gridRows || maxRow, MIN_ROWS, MAX_ROWS);
    const cols = clampDimension(gridCols || maxNumber, MIN_COLS, MAX_COLS);
    const cells = createEmptyGrid(rows, cols);

    seatElements.forEach((seat) => {
      const rIdx = rowLabelToIndex(seat.row);
      const cIdx = (seat.number || 1) - 1;
      if (rIdx >= 0 && rIdx < rows && cIdx >= 0 && cIdx < cols) {
        cells[rIdx][cIdx] = seat.isHandicap ? "handicap" : "seat";
      }
    });

    return { rows, cols, cells };
  }

  const rows = clampDimension(gridRows || DEFAULT_ROWS, MIN_ROWS, MAX_ROWS);
  const cols = clampDimension(gridCols || DEFAULT_COLS, MIN_COLS, MAX_COLS);
  return { rows, cols, cells: createEmptyGrid(rows, cols) };
};

const buildConfigFromGrid = (rows: number, cols: number, cells: CellState[][]): SeatMapConfig => {
  const defaults = createDefaultConfig();

  const seatElements: SeatElement[] = [];
  const cellMatrix: GridCellConfig[][] = [];

  for (let r = 0; r < rows; r++) {
    const rowLabel = rowIndexToLabel(r);
    const cellRow: GridCellConfig[] = [];
    let seatCounter = 0; // Counter for sequential seat numbering per row
    
    for (let c = 0; c < cols; c++) {
      const state = cells[r]?.[c] ?? "empty";
      
      // Count only active seats for numbering
      let seatNumber = c + 1; // fallback to column number
      if (state !== "empty") {
        seatCounter++;
        seatNumber = seatCounter;
      }
      
      if (state !== "empty") {
        const isHandicap = state === "handicap";
        const seat: SeatElement = {
          type: "seat",
          id: `seat-${r}-${c}`,
          x: c * (CELL_SIZE + CELL_GAP) + 80,
          y: r * (CELL_SIZE + CELL_GAP) + 160,
          row: rowLabel,
          number: seatNumber,
          section: "main",
          category: isHandicap ? "handicap" : "standard",
          isBlocked: false,
          isHandicap,
        };
        seatElements.push(seat);
      }
      cellRow.push({
        type: state === "empty" ? "empty" : state === "handicap" ? "handicap" : "seat",
        section: "Sal",
        row: rowLabel,
        number: state !== "empty" ? seatNumber : c + 1,
      });
    }
    cellMatrix.push(cellRow);
  }

  const stage = defaults.elements.find((el) => el.type === "stage");
  const elements = stage ? [stage, ...seatElements] : seatElements;

  return {
    ...defaults,
    version: 3,
    canvasWidth: Math.max(defaults.canvasWidth, cols * (CELL_SIZE + CELL_GAP) + 160),
    canvasHeight: Math.max(defaults.canvasHeight, rows * (CELL_SIZE + CELL_GAP) + 220),
    gridSize: CELL_SIZE + CELL_GAP,
    seatSize: CELL_SIZE,
    elements,
    sections: [
      { id: "main", name: "Sal", color: "#22C55E", priceMultiplier: 1 },
    ],
    gridRows: rows,
    gridCols: cols,
    cells: cellMatrix,
    notes: "Grid-based seat map",
  };
};

export function SeatMapEditor({ initialConfig, onSave, venueId }: SeatMapEditorProps) {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [cells, setCells] = useState<CellState[][]>(() => createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS));

  useEffect(() => {
    const normalized = normalizeGrid(initialConfig);
    setRows(normalized.rows);
    setCols(normalized.cols);
    setCells(normalized.cells);
  }, [initialConfig]);

  const updateGridDimensions = useCallback((nextRows: number, nextCols: number) => {
    setCells((prev) => resizeGrid(prev, nextRows, nextCols));
    setRows(nextRows);
    setCols(nextCols);
  }, []);

  const handleRowsChange = useCallback((value: number) => {
    updateGridDimensions(clampDimension(value, MIN_ROWS, MAX_ROWS), cols);
  }, [cols, updateGridDimensions]);

  const handleColsChange = useCallback((value: number) => {
    updateGridDimensions(rows, clampDimension(value, MIN_COLS, MAX_COLS));
  }, [rows, updateGridDimensions]);

  const handleCellClick = useCallback((row: number, col: number) => {
    setCells((prev) => {
      const next = prev.map((r) => [...r]);
      const current = next[row][col];
      next[row][col] = current === "empty" ? "seat" : current === "handicap" ? "seat" : "empty";
      return next;
    });
  }, []);

  const handleCellRightClick = useCallback((event: MouseEvent<HTMLButtonElement>, row: number, col: number) => {
    event.preventDefault();
    setCells((prev) => {
      const next = prev.map((r) => [...r]);
      const current = next[row][col];
      next[row][col] = current === "handicap" ? "empty" : "handicap";
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setCells(createEmptyGrid(rows, cols));
  }, [rows, cols]);

  const seatCount = useMemo(() => {
    return cells.reduce((total, row) => total + row.filter((state) => state !== "empty").length, 0);
  }, [cells]);

  const handicapCount = useMemo(() => {
    return cells.reduce((total, row) => total + row.filter((state) => state === "handicap").length, 0);
  }, [cells]);

  const handleSave = useCallback(() => {
    const config = buildConfigFromGrid(rows, cols, cells);
    console.log("Saving seat map config:", config);
    onSave(config);
    console.log("Save function called successfully");
  }, [cells, cols, onSave, rows]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Rader</Label>
            <Input
              type="number"
              min={MIN_ROWS}
              max={MAX_ROWS}
              value={rows}
              onChange={(event) => handleRowsChange(parseInt(event.target.value, 10))}
              className="w-24"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Seter per rad</Label>
            <Input
              type="number"
              min={MIN_COLS}
              max={MAX_COLS}
              value={cols}
              onChange={(event) => handleColsChange(parseInt(event.target.value, 10))}
              className="w-24"
            />
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
            Nullstill
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            {seatCount} seter totalt · {handicapCount} HC-plasser
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="rounded-b-lg bg-gradient-to-b from-purple-100 to-purple-50 px-12 py-2 text-sm font-semibold text-purple-700 shadow">
              SCENE
            </div>
          </div>

          <div 
            onContextMenu={(event) => event.preventDefault()} 
            className="inline-grid gap-1"
            style={{
              gridTemplateColumns: `2rem repeat(${cols}, 2rem) 2rem`,
              gridTemplateRows: `1.5rem repeat(${rows}, 2rem) 1.5rem`
            }}
          >
            {/* Top-left corner */}
            <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
              #
            </div>

            {/* Column headers */}
            {Array.from({ length: cols }).map((_, index) => (
              <div key={`col-top-${index}`} className="flex items-center justify-center text-xs font-medium text-muted-foreground">
                {index + 1}
              </div>
            ))}

            {/* Top-right corner */}
            <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
              #
            </div>

            {/* Seat grid with row labels */}
            {cells.map((rowCells, rowIndex) => {
              const label = rowIndexToLabel(rowIndex);
              // Count only active seats (not empty) for numbering
              let seatCounter = 0;
              
              return [
                // Left row label
                <div key={`row-left-${label}`} className="flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {label}
                </div>,
                // Seat buttons
                ...rowCells.map((state, colIndex) => {
                  // Increment counter for active seats
                  if (state !== "empty") {
                    seatCounter++;
                  }
                  const seatNumber = state !== "empty" ? seatCounter : colIndex + 1;
                  
                  return (
                    <button
                      key={`cell-${rowIndex}-${colIndex}`}
                      type="button"
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onContextMenu={(event) => handleCellRightClick(event, rowIndex, colIndex)}
                      className={cn(
                        "flex h-6 w-6 m-1 items-center justify-center rounded border text-xs font-semibold transition-colors",
                        state === "empty" && "border-transparent bg-slate-200 text-transparent hover:bg-slate-300",
                        state === "seat" && "border-emerald-500/70 bg-emerald-500 text-white hover:bg-emerald-600",
                        state === "handicap" && "border-sky-500/60 bg-sky-500 text-white hover:bg-sky-600"
                      )}
                    >
                      {state !== "empty" ? seatNumber : ""}
                    </button>
                  );
                }),
                // Right row label
                <div key={`row-right-${label}`} className="flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {label}
                </div>
              ];
            }).flat()}

            {/* Bottom-left corner */}
            <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
              #
            </div>

            {/* Column footers */}
            {Array.from({ length: cols }).map((_, index) => (
              <div key={`col-bottom-${index}`} className="flex items-center justify-center text-xs font-medium text-muted-foreground">
                {index + 1}
              </div>
            ))}

            {/* Bottom-right corner */}
            <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
              #
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Kort forklart</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Venstreklikk aktiverer eller fjerner et sete. Høyreklikk markerer HC-plass.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Forklaring</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-slate-200" />
              <span>Tom plass</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-emerald-500" />
              <span>Aktivt sete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-sky-500" />
              <span>HC-sete</span>
            </div>
          </div>
        </div>

        <Button type="button" className="w-full gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Lagre setekart
        </Button>
      </div>
    </div>
  );
}
