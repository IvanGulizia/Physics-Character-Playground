/**
 * App.tsx - Point d'entrée de l'application Physics Character Playground
 * Intégration Canvas 2D + Moteur de simulation autonome + Direct Manipulation
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationWorld } from './simulation/core/SimulationWorld';
import { CanvasRenderer, DrawingPreview } from './rendering/CanvasRenderer';
import { RIG_PRESETS } from './rig/RigPresets';
import { ControlOverlay } from './ui/ControlOverlay';
import { Vector2 } from './simulation/math/Vector2';
import {
  BehaviorType,
  DrawingShapeMode,
  EditorTool,
  GaitStyle,
  LayerId,
  MotionFeel,
  SimNode,
  SimulationSettings,
  Vec2,
} from './types';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Instance stable du monde de simulation physique
  const worldRef = useRef<SimulationWorld>(new SimulationWorld());
  const rendererRef = useRef<CanvasRenderer | null>(null);

  // Synchronisation UI & Outils
  const [activePresetId, setActivePresetId] = useState<string>('threeNodes');
  const [activeTool, setActiveTool] = useState<EditorTool>('interact');
  const [drawingShapeMode, setDrawingShapeMode] = useState<DrawingShapeMode>('solid');
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [activeColor, setActiveColor] = useState<string>('#38bdf8');
  const [moveDirection, setMoveDirection] = useState<number>(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
  const [drawingPreview, setDrawingPreview] = useState<DrawingPreview | null>(null);
  const [settings, setSettings] = useState<SimulationSettings>(() => ({
    ...worldRef.current.settings,
  }));

  // Initialisation de la créature de départ
  useEffect(() => {
    worldRef.current.setCreature(RIG_PRESETS.threeNodes);
  }, []);

  // Gestion du redimensionnement haute-définition (Retina DPR)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.resetTransform?.();
          ctx.scale(dpr, dpr);
          if (!rendererRef.current) {
            rendererRef.current = new CanvasRenderer(ctx);
          } else {
            rendererRef.current.setContext(ctx);
          }
        }

        // Calcule la position du sol de manière surélevée (250px au-dessus du bas) pour ne pas être masqué par l'UI
        const newGroundY = Math.max(180, height - 250);
        worldRef.current.settings.groundY = newGroundY;
        setSettings((prev) => ({ ...prev, groundY: newGroundY }));
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Boucle principale d'animation et de simulation (60 FPS découplée)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const world = worldRef.current;
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;

      if (world && renderer && canvas) {
        // Avance la physique
        world.step(dt);

        const width = parseFloat(canvas.style.width) || canvas.width;
        const height = parseFloat(canvas.style.height) || canvas.height;

        // Rendu graphique
        renderer.render(
          world.nodes,
          world.links,
          world.settings,
          world.mousePos,
          world.grabbedNodeId,
          selectedNodeId,
          connectingFromNodeId,
          world.walker,
          width,
          height,
          world.globalTime,
          drawingPreview
        );
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedNodeId, connectingFromNodeId, drawingPreview]);

  // Extraction des coordonnées souris dans l'espace canevas
  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const [syncTick, setSyncTick] = useState<number>(0);
  const triggerSync = useCallback(() => setSyncTick((t) => t + 1), []);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(worldRef.current.canUndo);
    setCanRedo(worldRef.current.canRedo);
  }, []);

  const handleUndo = useCallback(() => {
    if (worldRef.current.undo()) {
      setSelectedNodeId(null);
      triggerSync();
      updateUndoRedoState();
    }
  }, [triggerSync, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    if (worldRef.current.redo()) {
      setSelectedNodeId(null);
      triggerSync();
      updateUndoRedoState();
    }
  }, [triggerSync, updateUndoRedoState]);

  // Événements pointeurs pour l'interaction directe, les outils et les formes de dessin
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      const world = worldRef.current;
      const targetNode = world.findNodeAt(coords, 18);

      if (activeTool === 'interact') {
        if (targetNode) {
          world.startGrabbing(targetNode.id, coords);
          setSelectedNodeId(targetNode.id);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } else {
          setSelectedNodeId(null);
        }
      } else if (activeTool === 'add_node') {
        // Crée un nœud immédiatement sous le clic
        const newNode = world.addNode(coords);
        setSelectedNodeId(newNode.id);
        // Bascule en interact pour manipuler le nouveau nœud
        setActiveTool('interact');
      } else if (activeTool === 'connect') {
        if (targetNode) {
          setConnectingFromNodeId(targetNode.id);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
      } else if (activeTool === 'draw_freehand' || activeTool === 'draw_stroke') {
        setDrawingPreview({
          tool: activeTool,
          points: [coords],
        });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else if (
        activeTool === 'shape_box' ||
        activeTool === 'shape_circle' ||
        activeTool === 'shape_capsule'
      ) {
        setDrawingPreview({
          tool: activeTool,
          points: [],
          startPos: coords,
          currentPos: coords,
        });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [activeTool, getCanvasCoords]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      worldRef.current.updateMousePosition(coords);

      if (drawingPreview) {
        if (drawingPreview.tool === 'draw_freehand' || drawingPreview.tool === 'draw_stroke') {
          const pts = drawingPreview.points;
          const lastPt = pts[pts.length - 1];
          const distThreshold = drawingPreview.tool === 'draw_stroke' ? 24 : 35;
          // Échantillonne les points pour former une chaîne physique harmonieuse
          if (!lastPt || Vector2.distance(lastPt, coords) >= distThreshold) {
            setDrawingPreview({
              ...drawingPreview,
              points: [...pts, coords],
            });
          }
        } else {
          setDrawingPreview({
            ...drawingPreview,
            currentPos: coords,
          });
        }
      }
    },
    [getCanvasCoords, drawingPreview]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const world = worldRef.current;

      if (activeTool === 'interact') {
        world.stopGrabbing();
        triggerSync();
        updateUndoRedoState();
      } else if (activeTool === 'connect' && connectingFromNodeId) {
        const coords = getCanvasCoords(e);
        const targetNode = world.findNodeAt(coords, 20);
        if (targetNode && targetNode.id !== connectingFromNodeId) {
          world.connectNodes(connectingFromNodeId, targetNode.id);
          updateUndoRedoState();
        }
        setConnectingFromNodeId(null);
      } else if (drawingPreview) {
        const coords = getCanvasCoords(e);

        if (drawingPreview.tool === 'draw_stroke') {
          // POLYLIGNE / TRAIT PHYSIQUE ARTICULÉ
          const finalPoints = [...drawingPreview.points];
          const lastPt = finalPoints[finalPoints.length - 1];
          if (!lastPt || Vector2.distance(lastPt, coords) >= 15) {
            finalPoints.push(coords);
          }
          if (finalPoints.length >= 2) {
            const created = world.createPhysicsStroke(
              finalPoints,
              activeColor,
              14,
              world.settings.activeLayer || 'main'
            );
            if (created.length > 0) {
              setSelectedNodeId(created[0].id);
            }
          }
        } else if (drawingPreview.tool === 'draw_freehand') {
          const finalPoints = [...drawingPreview.points];
          const lastPt = finalPoints[finalPoints.length - 1];
          if (!lastPt || Vector2.distance(lastPt, coords) >= 20) {
            finalPoints.push(coords);
          }
          if (finalPoints.length >= 2) {
            // Vérifie si la boucle se referme sur elle-même (proche du départ)
            const isLoop = Vector2.distance(finalPoints[0], finalPoints[finalPoints.length - 1]) < 50 && finalPoints.length >= 4;
            if (drawingShapeMode === 'solid' && (isLoop || finalPoints.length >= 4)) {
              // SOLUTION 1 : Plein / Corps unique avec son centre de masse (centroïde)
              const solid = world.createSolidPolygonNode(finalPoints, activeColor, true);
              setSelectedNodeId(solid.id);
            } else {
              // SOLUTION 2 : Maillage souple articulé de ressorts
              const created = world.createFreehandChain(finalPoints, activeColor, isLoop);
              if (created.length > 0) {
                setSelectedNodeId(created[0].id);
              }
            }
          }
        } else if (drawingPreview.startPos) {
          const start = drawingPreview.startPos;
          const end = coords;

          if (drawingPreview.tool === 'shape_box') {
            if (drawingShapeMode === 'solid') {
              const solid = world.createSolidBoxNode(start, end, activeColor, true);
              setSelectedNodeId(solid.id);
            } else {
              const created = world.createBoxShape(start, end, activeColor);
              if (created.length > 0) setSelectedNodeId(created[0].id);
            }
          } else if (drawingPreview.tool === 'shape_circle') {
            const created = world.createCircleShape(start, end, 6, activeColor);
            if (created.length > 0) setSelectedNodeId(created[0].id);
          } else if (drawingPreview.tool === 'shape_capsule') {
            const created = world.createCapsuleShape(start, end, activeColor);
            if (created.length > 0) setSelectedNodeId(created[0].id);
          }
        }

        setDrawingPreview(null);
        setActiveTool('interact');
        triggerSync();
        updateUndoRedoState();
      }

      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe catch
      }
    },
    [
      activeColor,
      activeTool,
      connectingFromNodeId,
      drawingPreview,
      drawingShapeMode,
      getCanvasCoords,
      triggerSync,
      updateUndoRedoState,
    ]
  );

  // Raccourcis clavier (Space pour pause, Delete pour supprimer, 1-7 pour outils, A/D pour marcher)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        worldRef.current.settings.isPaused = !worldRef.current.settings.isPaused;
        setSettings((prev) => ({ ...prev, isPaused: worldRef.current.settings.isPaused }));
      } else if (e.code === 'KeyD' && e.ctrlKey) {
        e.preventDefault();
        worldRef.current.settings.showDebug = !worldRef.current.settings.showDebug;
        setSettings((prev) => ({ ...prev, showDebug: worldRef.current.settings.showDebug }));
      } else if (e.key === 'a' || e.key === 'A' || e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        worldRef.current.setMoveDirection(-1);
        setMoveDirection(-1);
      } else if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !e.ctrlKey) {
        worldRef.current.setMoveDirection(1);
        setMoveDirection(1);
      } else if (e.key === 'w' || e.key === 'W' || e.key === 'z' || e.key === 'Z' || e.key === 'ArrowUp') {
        worldRef.current.triggerJump();
      } else if (e.key === '1') {
        setActiveTool('interact');
      } else if (e.key === '2') {
        setActiveTool('add_node');
      } else if (e.key === '3') {
        setActiveTool('connect');
      } else if (e.key === '4') {
        setActiveTool('draw_freehand');
      } else if (e.key === '5') {
        setActiveTool('shape_box');
      } else if (e.key === '6') {
        setActiveTool('shape_circle');
      } else if (e.key === '7') {
        setActiveTool('shape_capsule');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          worldRef.current.deleteNode(selectedNodeId);
          setSelectedNodeId(null);
        }
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setConnectingFromNodeId(null);
        setActiveTool('interact');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === 'a' ||
        e.key === 'A' ||
        e.key === 'q' ||
        e.key === 'Q' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        worldRef.current.setMoveDirection(0);
        setMoveDirection(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeId, handleUndo, handleRedo]);

  // Contrôles UI
  const handleFeelChange = useCallback((feel: MotionFeel) => {
    worldRef.current.applyFeelPreset(feel);
    setSettings({ ...worldRef.current.settings });
  }, []);

  const handleTogglePlay = useCallback(() => {
    worldRef.current.settings.isPaused = !worldRef.current.settings.isPaused;
    setSettings((prev) => ({ ...prev, isPaused: worldRef.current.settings.isPaused }));
  }, []);

  const handleReset = useCallback(() => {
    const preset = RIG_PRESETS[activePresetId] || RIG_PRESETS.threeNodes;
    worldRef.current.setCreature(preset);
    setSelectedNodeId(null);
    updateUndoRedoState();
  }, [activePresetId, updateUndoRedoState]);

  const handleClearWorld = useCallback(() => {
    worldRef.current.clearWorld();
    setSelectedNodeId(null);
    setActivePresetId('empty');
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const handleToggleDebug = useCallback(() => {
    worldRef.current.settings.showDebug = !worldRef.current.settings.showDebug;
    setSettings((prev) => ({ ...prev, showDebug: worldRef.current.settings.showDebug }));
  }, []);

  const handleSelectPreset = useCallback((presetId: string) => {
    const preset = RIG_PRESETS[presetId];
    if (preset) {
      setActivePresetId(presetId);
      worldRef.current.setCreature(preset);
      setSelectedNodeId(null);
      updateUndoRedoState();
    }
  }, [updateUndoRedoState]);

  const handleUpdateSetting = useCallback(
    <K extends keyof SimulationSettings>(key: K, value: SimulationSettings[K]) => {
      worldRef.current.settings[key] = value;
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleTogglePinNode = useCallback((nodeId: string) => {
    worldRef.current.togglePin(nodeId);
    triggerSync();
  }, [triggerSync]);

  const handleSetNodeBehavior = useCallback((nodeId: string, behavior: BehaviorType) => {
    worldRef.current.setNodeBehavior(nodeId, behavior);
    triggerSync();
  }, [triggerSync]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    worldRef.current.deleteNode(nodeId);
    setSelectedNodeId(null);
    triggerSync();
    updateUndoRedoState();
  }, [triggerSync, updateUndoRedoState]);

  const handleUpdateNodeMass = useCallback((nodeId: string, mass: number) => {
    const node = worldRef.current.getNodeById(nodeId);
    if (node) {
      node.mass = mass;
      triggerSync();
    }
  }, [triggerSync]);

  const handleUpdateNodeColor = useCallback((nodeId: string, color: string) => {
    worldRef.current.updateNodeColor(nodeId, color, true);
    triggerSync();
  }, [triggerSync]);

  const handleUpdateNodeRadius = useCallback((nodeId: string, radius: number) => {
    worldRef.current.updateNodeRadius(nodeId, radius);
    triggerSync();
  }, [triggerSync]);

  const handleToggleNodeEye = useCallback((nodeId: string) => {
    worldRef.current.toggleNodeEye(nodeId);
    triggerSync();
  }, [triggerSync]);

  const handleSetWalkerRoot = useCallback((nodeId: string) => {
    worldRef.current.setWalkerRoot(nodeId);
    triggerSync();
  }, [triggerSync]);

  const handleToggleWalkerFoot = useCallback((nodeId: string) => {
    worldRef.current.toggleWalkerFoot(nodeId);
    triggerSync();
  }, [triggerSync]);

  const handleToggleWalkerKnee = useCallback((nodeId: string, kneeDir: 1 | -1) => {
    worldRef.current.toggleWalkerKnee(nodeId, kneeDir);
    triggerSync();
    updateUndoRedoState();
  }, [triggerSync, updateUndoRedoState]);

  const handleUpdateNodeAngularJoint = useCallback(
    (nodeId: string, updates: any) => {
      worldRef.current.updateNodeAngularJoint(nodeId, updates);
      triggerSync();
    },
    [triggerSync]
  );

  const handleSealNodeRestAngle = useCallback(
    (nodeId: string) => {
      worldRef.current.sealNodeRestAngle(nodeId);
      triggerSync();
    },
    [triggerSync]
  );

  const handleAddIKLeg = useCallback((hipNodeId: string, kneeDir: 1 | -1) => {
    worldRef.current.addIKLeg(hipNodeId, kneeDir);
    triggerSync();
    updateUndoRedoState();
  }, [triggerSync, updateUndoRedoState]);

  const handleToggleInvisibleLinks = useCallback((nodeId: string) => {
    worldRef.current.toggleLinksInvisibleForNode(nodeId);
    triggerSync();
  }, [triggerSync]);

  const handleRecalculateRestLengths = useCallback(() => {
    worldRef.current.recalculateAllRestLengths();
    triggerSync();
  }, [triggerSync]);

  const handleMergeWithNearby = useCallback(
    (nodeId: string) => {
      const world = worldRef.current;
      const selected = world.getNodeById(nodeId);
      if (!selected) return;

      let closest: SimNode | null = null;
      let closestDist = Infinity;
      for (const n of world.nodes) {
        if (n.id === nodeId) continue;
        const d = Vector2.distance(selected.position, n.position);
        if (d < closestDist) {
          closestDist = d;
          closest = n;
        }
      }

      if (closest) {
        const merged = world.mergeNodes(selected.id, closest.id);
        if (merged) {
          setSelectedNodeId(merged.id);
          triggerSync();
          updateUndoRedoState();
        }
      }
    },
    [triggerSync, updateUndoRedoState]
  );

  const handleUpdateWalkerParams = useCallback((params: {
    walkSpeed?: number;
    bodyHeight?: number;
    stepHeight?: number;
    strideThreshold?: number;
    stepDuration?: number;
    kneeDirection?: 1 | -1;
  }) => {
    if (worldRef.current.walker) {
      worldRef.current.walker.setParameters(params);
      triggerSync();
    }
  }, [triggerSync]);

  const handleWalkerMove = useCallback((dir: number) => {
    worldRef.current.setMoveDirection(dir);
    setMoveDirection(dir);
  }, []);

  const handleToggleSkinMode = useCallback(() => {
    const currentMode = worldRef.current.settings.skinMode || 'organic';
    const nextMode = currentMode === 'organic' ? 'minimal' : 'organic';
    worldRef.current.settings.skinMode = nextMode;
    setSettings((prev) => ({ ...prev, skinMode: nextMode }));
  }, []);

  const handleExportJson = useCallback(() => {
    const creature = worldRef.current.exportCreature();
    const jsonStr = JSON.stringify(creature, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (creature.name || 'creature').toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.download = `${safeName}_rig.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.links)) {
          console.error('Fichier JSON invalide : nodes et links requis');
          return;
        }
        worldRef.current.setCreature(parsed);
        setSelectedNodeId(null);
        setActivePresetId('custom');
        updateUndoRedoState();
      } catch (err) {
        console.error('Erreur lors de la lecture du fichier JSON', err);
      }
    };
    reader.readAsText(file);
  }, [updateUndoRedoState]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleSetNodeLayer = useCallback(
    (nodeId: string, layer: LayerId) => {
      worldRef.current.setNodeLayer(nodeId, layer);
      triggerSync();
      updateUndoRedoState();
    },
    [triggerSync, updateUndoRedoState]
  );

  const handleSetActiveLayer = useCallback((layer: LayerId) => {
    worldRef.current.settings.activeLayer = layer;
    setSettings((prev) => ({ ...prev, activeLayer: layer }));
  }, []);

  const handleToggleMetaballs = useCallback(() => {
    const next = !worldRef.current.settings.metaballsEnabled;
    worldRef.current.settings.metaballsEnabled = next;
    setSettings((prev) => ({ ...prev, metaballsEnabled: next }));
  }, []);

  const handleSetGaitStyle = useCallback(
    (style: GaitStyle) => {
      worldRef.current.setGaitStyle(style);
      setSettings((prev) => ({ ...prev, gaitStyle: style }));
      triggerSync();
    },
    [triggerSync]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.name.endsWith('.json')) {
        handleImportJson(file);
      }
    },
    [handleImportJson]
  );

  // Nœud actuellement sélectionné pour l'inspecteur (cloné frais pour réactivité immédiate)
  const rawNode = selectedNodeId ? worldRef.current.getNodeById(selectedNodeId) : null;
  const selectedNode: SimNode | null = rawNode ? { ...rawNode } : null;

  const isWalkerFoot = selectedNodeId ? worldRef.current.isWalkerFoot(selectedNodeId) : false;
  const isWalkerRoot = selectedNodeId ? worldRef.current.isWalkerRoot(selectedNodeId) : false;
  const isWalkerKnee = selectedNodeId ? worldRef.current.isWalkerKnee(selectedNodeId) : false;
  const walkerConfig = worldRef.current.walker?.config || null;

  return (
    <main
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none touch-none"
    >
      {/* Canevas de simulation physique */}
      <canvas
        id="physics-canvas"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute inset-0 ${
          activeTool === 'interact'
            ? 'cursor-grab active:cursor-grabbing'
            : activeTool === 'add_node'
            ? 'cursor-crosshair'
            : 'cursor-cell'
        }`}
      />

      {/* Interface utilisateur contextuelle */}
      <ControlOverlay
        settings={settings}
        activePresetId={activePresetId}
        activeTool={activeTool}
        drawingShapeMode={drawingShapeMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleDrawingShapeMode={setDrawingShapeMode}
        onMergeWithNearby={handleMergeWithNearby}
        activeColor={activeColor}
        moveDirection={moveDirection}
        selectedNode={selectedNode}
        walkerConfig={walkerConfig}
        isWalkerActive={!!worldRef.current.walker}
        isWalkerFoot={isWalkerFoot}
        isWalkerRoot={isWalkerRoot}
        isWalkerKnee={isWalkerKnee}
        onSelectColor={setActiveColor}
        onClearWorld={handleClearWorld}
        onWalkerMove={handleWalkerMove}
        onWalkerJump={() => worldRef.current.triggerJump()}
        onFeelChange={handleFeelChange}
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        onToggleDebug={handleToggleDebug}
        onSelectPreset={handleSelectPreset}
        onUpdateSetting={handleUpdateSetting}
        onSelectTool={setActiveTool}
        onTogglePinNode={handleTogglePinNode}
        onSetNodeBehavior={handleSetNodeBehavior}
        onDeleteNode={handleDeleteNode}
        onUpdateNodeMass={handleUpdateNodeMass}
        onUpdateNodeColor={handleUpdateNodeColor}
        onUpdateNodeRadius={handleUpdateNodeRadius}
        onToggleNodeEye={handleToggleNodeEye}
        onSetWalkerRoot={handleSetWalkerRoot}
        onToggleWalkerFoot={handleToggleWalkerFoot}
        onToggleWalkerKnee={handleToggleWalkerKnee}
        onUpdateNodeAngularJoint={handleUpdateNodeAngularJoint}
        onSealNodeRestAngle={handleSealNodeRestAngle}
        onAddIKLeg={handleAddIKLeg}
        onToggleInvisibleLinks={handleToggleInvisibleLinks}
        onRecalculateRestLengths={handleRecalculateRestLengths}
        onUpdateWalkerParams={handleUpdateWalkerParams}
        onDeselectNode={() => setSelectedNodeId(null)}
        onToggleSkinMode={handleToggleSkinMode}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onSetNodeLayer={handleSetNodeLayer}
        onSetActiveLayer={handleSetActiveLayer}
        onToggleMetaballs={handleToggleMetaballs}
        onSetGaitStyle={handleSetGaitStyle}
        gaitStyle={settings.gaitStyle || 'standard'}
      />
    </main>
  );
}
