/**
 * ControlOverlay - HUD de laboratoire tactile et fenêtres déplaçables (Draggable)
 * Interface fluide pour le studio d'animation et de création de créatures physiques
 */
import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Bug,
  Sparkles,
  MousePointer,
  PlusCircle,
  Link as LinkIcon,
  Pin,
  Trash2,
  Activity,
  Compass,
  Radio,
  Footprints,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Download,
  Upload,
  Palette,
  Pencil,
  Square,
  Circle,
  Pill,
  Crown,
  Eye,
  Sliders,
  Ghost,
  SquareSlash,
  Settings2,
  Undo2,
  Redo2,
  Layers,
  Spline,
} from 'lucide-react';
import {
  AngularJointConfig,
  BehaviorType,
  DrawingShapeMode,
  EditorTool,
  GaitStyle,
  LayerId,
  MotionFeel,
  SimNode,
  SimulationSettings,
  WalkerConfig,
} from '../types';
import { DraggableWindow } from './DraggableWindow';

export const CREATURE_COLORS = [
  { name: 'Cyan Néon', value: '#38bdf8' },
  { name: 'Rose Pop', value: '#ec4899' },
  { name: 'Émeraude Vif', value: '#10b981' },
  { name: 'Violet Mystique', value: '#a855f7' },
  { name: 'Ambre Chaud', value: '#f59e0b' },
  { name: 'Teinte Chair / Pêche', value: '#fca5a5' },
  { name: 'Blanc Pur', value: '#f8fafc' },
  { name: 'Carbone Ardoise', value: '#334155' },
];

interface ControlOverlayProps {
  settings: SimulationSettings;
  activePresetId: string;
  activeTool: EditorTool;
  activeColor: string;
  drawingShapeMode?: DrawingShapeMode;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleDrawingShapeMode?: (mode: DrawingShapeMode) => void;
  onMergeWithNearby?: (nodeId: string) => void;
  moveDirection?: number;
  selectedNode: SimNode | null;
  walkerConfig?: WalkerConfig | null;
  isWalkerActive?: boolean;
  isWalkerFoot?: boolean;
  isWalkerRoot?: boolean;
  isWalkerKnee?: boolean;
  onSelectColor: (color: string) => void;
  onClearWorld: () => void;
  onWalkerMove?: (direction: number) => void;
  onWalkerJump?: () => void;
  onFeelChange: (feel: MotionFeel) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onToggleDebug: () => void;
  onSelectPreset: (presetId: string) => void;
  onUpdateSetting: <K extends keyof SimulationSettings>(key: K, value: SimulationSettings[K]) => void;
  onSelectTool: (tool: EditorTool) => void;
  onTogglePinNode: (nodeId: string) => void;
  onSetNodeBehavior: (nodeId: string, behavior: BehaviorType) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateNodeMass: (nodeId: string, mass: number) => void;
  onUpdateNodeColor?: (nodeId: string, color: string) => void;
  onUpdateNodeRadius?: (nodeId: string, radius: number) => void;
  onToggleNodeEye?: (nodeId: string) => void;
  onSetWalkerRoot?: (nodeId: string) => void;
  onToggleWalkerFoot?: (nodeId: string) => void;
  onToggleWalkerKnee?: (nodeId: string, kneeDir: 1 | -1) => void;
  onUpdateNodeAngularJoint?: (nodeId: string, updates: Partial<AngularJointConfig>) => void;
  onSealNodeRestAngle?: (nodeId: string) => void;
  onAddIKLeg?: (hipNodeId: string, kneeDir: 1 | -1) => void;
  onToggleInvisibleLinks?: (nodeId: string) => void;
  onRecalculateRestLengths?: () => void;
  onUpdateWalkerParams?: (params: {
    walkSpeed?: number;
    bodyHeight?: number;
    stepHeight?: number;
    strideThreshold?: number;
    stepDuration?: number;
    kneeDirection?: 1 | -1;
  }) => void;
  onDeselectNode: () => void;
  onToggleSkinMode?: () => void;
  onExportJson?: () => void;
  onImportJson?: (file: File) => void;
  onSetNodeLayer?: (nodeId: string, layer: LayerId) => void;
  onSetActiveLayer?: (layer: LayerId) => void;
  onToggleMetaballs?: () => void;
  onSetGaitStyle?: (style: GaitStyle) => void;
  gaitStyle?: GaitStyle;
}

export const ControlOverlay: React.FC<ControlOverlayProps> = ({
  settings,
  activePresetId,
  activeTool,
  activeColor,
  drawingShapeMode = 'solid',
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onToggleDrawingShapeMode,
  onMergeWithNearby,
  moveDirection = 0,
  selectedNode,
  walkerConfig,
  isWalkerActive = false,
  isWalkerFoot = false,
  isWalkerRoot = false,
  isWalkerKnee = false,
  onSelectColor,
  onClearWorld,
  onWalkerMove,
  onWalkerJump,
  onFeelChange,
  onTogglePlay,
  onReset,
  onToggleDebug,
  onSelectPreset,
  onUpdateSetting,
  onSelectTool,
  onTogglePinNode,
  onSetNodeBehavior,
  onDeleteNode,
  onUpdateNodeMass,
  onUpdateNodeColor,
  onUpdateNodeRadius,
  onToggleNodeEye,
  onSetWalkerRoot,
  onToggleWalkerFoot,
  onToggleWalkerKnee,
  onUpdateNodeAngularJoint,
  onSealNodeRestAngle,
  onAddIKLeg,
  onToggleInvisibleLinks,
  onRecalculateRestLengths,
  onUpdateWalkerParams,
  onDeselectNode,
  onToggleSkinMode,
  onExportJson,
  onImportJson,
  onSetNodeLayer,
  onSetActiveLayer,
  onToggleMetaballs,
  onSetGaitStyle,
  gaitStyle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettingsWindow, setShowSettingsWindow] = useState<boolean>(false);
  const [kneeDirection, setKneeDirection] = useState<1 | -1>(1);

  // Positionnement par défaut de l'inspecteur à droite
  const defaultInspectorPos = {
    x: Math.max(10, window.innerWidth - 340),
    y: 70,
  };

  const defaultSettingsPos = {
    x: Math.max(10, window.innerWidth / 2 - 160),
    y: 75,
  };

  const defaultLocomotionPos = {
    x: 80,
    y: Math.max(80, window.innerHeight - 260),
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none font-sans">
      {/* Input de fichier caché pour Import JSON */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImportJson?.(file);
            e.target.value = '';
          }
        }}
        accept=".json"
        className="hidden"
      />

      {/* --- 1. BARRE SUPÉRIEURE (HEADER) --- */}
      <header className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Titre et Presets */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl px-3 py-2 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
            <h1 className="text-xs sm:text-sm font-bold text-slate-100 tracking-wide">
              Creature Studio
            </h1>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Bouton Toile Vierge */}
          <button
            id="btn-clear-world"
            onClick={onClearWorld}
            title="Effacer tout et créer une nouvelle créature from scratch"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-300" />
            <span>Toile Vierge</span>
          </button>

          {/* Sélecteur de Presets */}
          <select
            id="preset-selector"
            value={activePresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-slate-950/80 text-slate-200 border border-slate-700/80 rounded-xl px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
          >
            <option value="bipedSimple">Bipède Simple (2 Pattes)</option>
            <option value="bipedWalker">Bipède Articulé IK (Genoux)</option>
            <option value="quadrupedWalker">Quadrupède (4 Pattes Trot)</option>
            <option value="threeNodes">Trio Organique (Test)</option>
            <option value="chainWorm">Chenille Ondulante</option>
            <option value="jellyBlob">Blob Mou (Jelly)</option>
            <option value="custom">Créature Personnalisée</option>
          </select>
        </div>

        {/* Boutons d'actions rapides & Paramètres */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-xl">
          {/* Bouton Rendu Peau (Skin Mode) */}
          <button
            id="btn-skin-mode"
            onClick={onToggleSkinMode}
            title="Basculer entre style Organique (volumes sculptés) et Minimaliste"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              settings.skinMode === 'organic'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Peau: {settings.skinMode === 'organic' ? 'Organique' : 'Minimal'}</span>
          </button>

          {/* Bouton Ouvrir/Fermer Fenêtre Settings (Paramètres & Feel) */}
          <button
            id="btn-settings-toggle"
            onClick={() => setShowSettingsWindow(!showSettingsWindow)}
            title="Paramètres physiques, Dynamique (Feel) et Gravité"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              showSettingsWindow
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Réglages & Feel</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Export JSON */}
          <button
            id="btn-export-json"
            onClick={onExportJson}
            title="Exporter la créature en JSON"
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Import JSON */}
          <button
            id="btn-import-json"
            onClick={() => fileInputRef.current?.click()}
            title="Importer une créature JSON"
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Upload className="w-4 h-4 text-sky-400" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Undo / Annuler */}
          <button
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-xl transition-all ${
              canUndo
                ? 'hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer active:scale-95'
                : 'text-slate-600 opacity-40 cursor-not-allowed'
            }`}
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Redo / Rétablir */}
          <button
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-xl transition-all ${
              canRedo
                ? 'hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer active:scale-95'
                : 'text-slate-600 opacity-40 cursor-not-allowed'
            }`}
            title="Rétablir (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4 text-cyan-400" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Play / Pause */}
          <button
            id="btn-play-pause"
            onClick={onTogglePlay}
            className={`p-1.5 rounded-xl transition-all ${
              settings.isPaused
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={settings.isPaused ? 'Reprendre la physique' : 'Mettre en pause'}
          >
            {settings.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Reset Position */}
          <button
            id="btn-reset"
            onClick={onReset}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            title="Réinitialiser la position du preset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Debug Overlay */}
          <button
            id="btn-toggle-debug"
            onClick={onToggleDebug}
            className={`p-1.5 rounded-xl transition-all ${
              settings.showDebug
                ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/50'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Afficher les liaisons invisibles, vecteurs et cibles de pas"
          >
            <Bug className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* --- 2. BARRE LATÉRALE D'OUTILS DE DESSIN ET CRÉATION (GAUCHE) --- */}
      <aside className="absolute left-3 sm:left-5 top-20 flex flex-col gap-3 pointer-events-auto">
        {/* Boîte à outils de composition */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 w-11 items-center">
          {/* 1. Interagir */}
          <button
            id="tool-interact"
            onClick={() => onSelectTool('interact')}
            title="Interagir / Saisir / Sélectionner (Touche 1)"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'interact'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md ring-2 ring-cyan-300 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>

          {/* 2. Ajouter Nœud */}
          <button
            id="tool-add-node"
            onClick={() => onSelectTool('add_node')}
            title="Ajouter un Nœud simple (Touche 2)"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'add_node'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md ring-2 ring-cyan-300 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
          </button>

          {/* 3. Relier / Ressort */}
          <button
            id="tool-connect"
            onClick={() => onSelectTool('connect')}
            title="Relier deux nœuds avec un ressort (Touche 3)"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'connect'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md ring-2 ring-cyan-300 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-slate-800 my-0.5" />

          {/* 4. Dessin Libre */}
          <button
            id="tool-draw-freehand"
            onClick={() => onSelectTool('draw_freehand')}
            title="Dessin libre : tracez à la souris pour créer un membre articulé (Touche 4)"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'draw_freehand'
                ? 'bg-pink-500 text-white font-bold shadow-md ring-2 ring-pink-300 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* 4b. Trait / Cordon Physique Articulé (Polyligne avec physique & ressorts de flexion) */}
          <button
            id="tool-draw-stroke"
            onClick={() => onSelectTool('draw_stroke')}
            title="Trait physique articulé : tracez un cordon/polyligne avec ressorts de flexion intégrés"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'draw_stroke'
                ? 'bg-purple-600 text-white font-bold shadow-md ring-2 ring-purple-300 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Spline className="w-4 h-4" />
          </button>

          {/* 5. Boîte / Rectangle */}
          <button
            id="tool-shape-box"
            onClick={() => onSelectTool('shape_box')}
            title="Forme Rectangle élastique contreventé (Touche 5)"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'shape_box'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md ring-2 ring-amber-300 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Square className="w-4 h-4" />
          </button>

          {/* 6. Cercle / Blob */}
          <button
            id="tool-shape-circle"
            onClick={() => onSelectTool('shape_circle')}
            title="Forme Cercle / Sphère déformable (Touche 6)"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'shape_circle'
                ? 'bg-purple-500 text-white font-bold shadow-md ring-2 ring-purple-300 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Circle className="w-4 h-4" />
          </button>

          {/* 7. Capsule */}
          <button
            id="tool-shape-capsule"
            onClick={() => onSelectTool('shape_capsule')}
            title="Forme Capsule dense (Touche 7)"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'shape_capsule'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md ring-2 ring-emerald-300 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Pill className="w-4 h-4" />
          </button>
        </div>

        {/* Sélecteur de mode de dessin : Plein (Solution 1) vs Mou/Squelette (Solution 2) */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1 shadow-2xl flex flex-col gap-1 w-11 items-center">
          <button
            onClick={() => onToggleDrawingShapeMode?.('solid')}
            title="Mode Forme : Corps Unique Plein avec centre de masse (Solution 1 - Prio)"
            className={`w-9 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all ${
              drawingShapeMode === 'solid'
                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm ring-1 ring-cyan-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            Plein
          </button>
          <button
            onClick={() => onToggleDrawingShapeMode?.('skeleton')}
            title="Mode Forme : Maillage souple articulé de ressorts (Solution 2)"
            className={`w-9 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all ${
              drawingShapeMode === 'skeleton'
                ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-sm ring-1 ring-pink-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            Mou
          </button>
        </div>

        {/* Sélecteur de Calque Actif : Arrière / Corps / Avant */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1 shadow-2xl flex flex-col gap-1 w-11 items-center">
          <div className="text-[7px] font-bold text-slate-500 uppercase tracking-tight">Calque</div>
          <button
            onClick={() => onSetActiveLayer?.('front')}
            title="Calque Avant-plan (membres avant, yeux, détails au 1er plan)"
            className={`w-9 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold transition-all ${
              (settings.activeLayer || 'main') === 'front'
                ? 'bg-cyan-500 text-slate-950 ring-1 ring-cyan-300 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            Avt
          </button>
          <button
            onClick={() => onSetActiveLayer?.('main')}
            title="Calque Corps (tronc, tête, structure médiane)"
            className={`w-9 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold transition-all ${
              (settings.activeLayer || 'main') === 'main'
                ? 'bg-indigo-500 text-white ring-1 ring-indigo-300 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            Corps
          </button>
          <button
            onClick={() => onSetActiveLayer?.('back')}
            title="Calque Arrière-plan (jambes arrière, bras arrière en retrait)"
            className={`w-9 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold transition-all ${
              (settings.activeLayer || 'main') === 'back'
                ? 'bg-slate-600 text-white ring-1 ring-slate-400 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            Arr
          </button>
        </div>

        {/* Nuancier de couleur active de tracé */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1.5 w-11 items-center">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          {CREATURE_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onSelectColor(c.value)}
              title={`Tracer en ${c.name}`}
              className={`w-6 h-6 rounded-full transition-all ${
                activeColor === c.value
                  ? 'ring-2 ring-white scale-110 shadow-md'
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </aside>

      {/* --- 3. FENÊTRE FLOTTANTE DÉPLAÇABLE : INSPECTEUR DE NŒUD / PARTIE (DROITE PAR DÉFAUT) --- */}
      {selectedNode && (
        <DraggableWindow
          id="node-inspector"
          title={selectedNode.name || 'Membre Sélectionné'}
          icon={<Sliders className="w-3.5 h-3.5 text-cyan-400" />}
          initialPosition={defaultInspectorPos}
          onClose={onDeselectNode}
          className="w-80 pointer-events-auto"
        >
          <div className="flex flex-col gap-3 text-xs">
            {/* Rôles Anatomiques & Rigging */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Rôle Anatomique
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {/* 👑 Torse / Racine */}
                <button
                  id="btn-role-root"
                  onClick={() => onSetWalkerRoot?.(selectedNode.id)}
                  title="Définit ce nœud comme le Torse / Racine de marche"
                  className={`px-2 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isWalkerRoot
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-md font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Torse / Centre</span>
                </button>

                {/* 🦶 Patte / Pied */}
                <button
                  id="btn-role-foot"
                  onClick={() => onToggleWalkerFoot?.(selectedNode.id)}
                  title="Bascule ce nœud comme patte procédurale active"
                  className={`px-2 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isWalkerFoot
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-md font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pied Marcheur</span>
                </button>

                {/* 🦵 Genou Articulé IK (Détection auto hanche et pied) */}
                <button
                  id="btn-role-knee"
                  onClick={() => onToggleWalkerKnee?.(selectedNode.id, kneeDirection)}
                  title="Désigne ce nœud comme Genou : détecte automatiquement la hanche au-dessus et le pied en dessous pour créer la chaîne IK et le muscle"
                  className={`px-2 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isWalkerKnee
                      ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-md font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-purple-300'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>{isWalkerKnee ? 'Genou IK Actif' : 'Définir en Genou'}</span>
                </button>

                {/* 👁️ Regard vivant */}
                <button
                  id="btn-toggle-eye"
                  onClick={() => onToggleNodeEye?.(selectedNode.id)}
                  title="Active ou désactive un regard expressif réactif"
                  className={`px-2 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    selectedNode.hasEye
                      ? 'bg-sky-600 text-white ring-2 ring-sky-300 shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>Œil Vivant</span>
                </button>

                {/* 📌 Ancrer (Pin) */}
                <button
                  id="btn-toggle-pin"
                  onClick={() => onTogglePinNode(selectedNode.id)}
                  title="Fixe ce point dans l'espace"
                  className={`px-2 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    selectedNode.isPinned
                      ? 'bg-amber-600 text-white ring-2 ring-amber-300 shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{selectedNode.isPinned ? 'Ancré' : 'Libre'}</span>
                </button>
              </div>
            </div>

            {/* Muscle & Force de Rappel Angulaire (Maintien de posture d'origine, raideur, damping, limites élastiques) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-pink-400 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-pink-400" /> Muscle & Force de Posture
                </span>
                <button
                  id="btn-toggle-muscle"
                  onClick={() => {
                    const isEnabled = selectedNode.angularJoint?.enabled ?? false;
                    onUpdateNodeAngularJoint?.(selectedNode.id, { enabled: !isEnabled });
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    selectedNode.angularJoint && selectedNode.angularJoint.enabled !== false
                      ? 'bg-pink-600 text-white ring-1 ring-pink-300'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {selectedNode.angularJoint && selectedNode.angularJoint.enabled !== false
                    ? 'Actif'
                    : 'Activer'}
                </button>
              </div>

              {selectedNode.angularJoint && selectedNode.angularJoint.enabled !== false && (
                <div className="flex flex-col gap-2 bg-slate-950/70 p-2 rounded-xl border border-pink-500/20">
                  {/* Curseur Force de maintien (Stiffness) */}
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="text-slate-400">Force / Raideur :</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="100"
                        max="3500"
                        step="50"
                        value={selectedNode.angularJoint.stiffness}
                        onChange={(e) =>
                          onUpdateNodeAngularJoint?.(selectedNode.id, {
                            stiffness: parseFloat(e.target.value),
                          })
                        }
                        className="w-24 accent-pink-500 cursor-pointer"
                      />
                      <span className="font-mono text-pink-300 w-10 text-right font-bold">
                        {Math.round(selectedNode.angularJoint.stiffness)}
                      </span>
                    </div>
                  </div>

                  {/* Curseur Amortissement (Damping) */}
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="text-slate-400">Amortissement :</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="2"
                        max="60"
                        step="1"
                        value={selectedNode.angularJoint.damping}
                        onChange={(e) =>
                          onUpdateNodeAngularJoint?.(selectedNode.id, {
                            damping: parseFloat(e.target.value),
                          })
                        }
                        className="w-24 accent-pink-500 cursor-pointer"
                      />
                      <span className="font-mono text-pink-300 w-10 text-right font-bold">
                        {Math.round(selectedNode.angularJoint.damping)}
                      </span>
                    </div>
                  </div>

                  {/* Curseur Plage de tolérance élastique (Soft limits) */}
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="text-slate-400">Élasticité limite :</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        value={selectedNode.angularJoint.softRange ?? 0.35}
                        onChange={(e) =>
                          onUpdateNodeAngularJoint?.(selectedNode.id, {
                            softRange: parseFloat(e.target.value),
                          })
                        }
                        className="w-24 accent-pink-500 cursor-pointer"
                      />
                      <span className="font-mono text-pink-300 w-10 text-right font-bold">
                        {Math.round(((selectedNode.angularJoint.softRange ?? 0.35) * 180) / Math.PI)}°
                      </span>
                    </div>
                  </div>

                  {/* Bouton Fixer l'angle actuel comme repos naturel */}
                  <button
                    id="btn-seal-rest-angle"
                    onClick={() => onSealNodeRestAngle?.(selectedNode.id)}
                    title="Mémorise l'angle actuel comme posture d'origine que le muscle va chercher à maintenir"
                    className="py-1 px-2 mt-0.5 bg-pink-950/60 hover:bg-pink-900/60 text-pink-200 border border-pink-500/40 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-semibold transition-all active:scale-95"
                  >
                    <span>📐 Fixer posture actuelle comme repos d'origine</span>
                  </button>
                </div>
              )}
            </div>

            {/* Outil Spécial : Ajouter Jambe IK avec Genou articulé */}
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Cinématique Inverse (IK)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-add-ik-leg"
                  onClick={() => onAddIKLeg?.(selectedNode.id, kneeDirection)}
                  title="Crée automatiquement une cuisse, un genou articulé et un pied"
                  className="flex-1 py-1.5 px-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>+ Jambe IK (Genou)</span>
                </button>

                {/* Bascule direction du pli du genou (Avant / Arrière) */}
                <button
                  onClick={() => setKneeDirection((d) => (d === 1 ? -1 : 1))}
                  title="Changer l'orientation du pli du genou"
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-[11px] font-mono text-purple-300 border border-purple-500/30"
                >
                  {kneeDirection === 1 ? 'Genou Avant' : 'Genou Arrière'}
                </button>
              </div>
            </div>

            {/* Masquage de trait & Sceller pose de repos */}
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">Traits de liaison :</span>
                <button
                  id="btn-toggle-invisible-links"
                  onClick={() => onToggleInvisibleLinks?.(selectedNode.id)}
                  title="Masque ou affiche les traits filaires reliés à cette partie"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1.5 text-[11px] font-medium transition-all"
                >
                  <Ghost className="w-3.5 h-3.5 text-purple-400" />
                  <span>Basculer Invisible</span>
                </button>
              </div>

              {/* Bouton pour sceller la disposition actuelle comme pose par défaut */}
              <button
                id="btn-fix-rest-pose"
                onClick={() => onRecalculateRestLengths?.()}
                title="Ajuste tous les ressorts pour que la position actuelle devienne la nouvelle forme naturelle au repos"
                className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-all active:scale-95"
              >
                <span>📐 Fixer cette pose comme repos par défaut</span>
              </button>

              {/* Bouton pour fusionner / grouper cette pièce avec le voisin le plus proche */}
              {onMergeWithNearby && (
                <button
                  id="btn-merge-nearby"
                  onClick={() => onMergeWithNearby(selectedNode.id)}
                  title="Fusionne cette pièce avec la partie voisine la plus proche (crée un corps unique avec centre de masse unifié)"
                  className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-all active:scale-95"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>🔗 Fusionner / Grouper avec voisin</span>
                </button>
              )}
            </div>

            {/* Calque d'affichage du membre sélectionné */}
            <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Calque d'affichage (Layer)
              </span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  id="btn-layer-back"
                  onClick={() => onSetNodeLayer?.(selectedNode.id, 'back')}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    (selectedNode.layer || 'main') === 'back'
                      ? 'bg-slate-600 text-white font-bold ring-1 ring-slate-300'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Arrière
                </button>
                <button
                  id="btn-layer-main"
                  onClick={() => onSetNodeLayer?.(selectedNode.id, 'main')}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    (selectedNode.layer || 'main') === 'main'
                      ? 'bg-indigo-600 text-white font-bold ring-1 ring-indigo-300'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Corps
                </button>
                <button
                  id="btn-layer-front"
                  onClick={() => onSetNodeLayer?.(selectedNode.id, 'front')}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    (selectedNode.layer || 'main') === 'front'
                      ? 'bg-cyan-500 text-slate-950 font-bold ring-1 ring-cyan-300'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Avant
                </button>
              </div>
            </div>

            {/* Nuancier individuel de la pièce */}
            <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Couleur de la pièce
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {CREATURE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onUpdateNodeColor?.(selectedNode.id, c.value)}
                    title={`Colorer en ${c.name}`}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      selectedNode.color === c.value
                        ? 'ring-2 ring-white scale-125 shadow-sm'
                        : 'opacity-70 hover:opacity-100 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {/* Curseur Rayon / Taille du nœud en direct */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300">
              <span className="text-slate-400">Taille (Rayon) :</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="8"
                  max="45"
                  step="1"
                  value={selectedNode.radius}
                  onChange={(e) =>
                    onUpdateNodeRadius?.(selectedNode.id, parseFloat(e.target.value))
                  }
                  className="w-24 accent-cyan-500 cursor-pointer"
                />
                <span className="font-mono text-cyan-300 w-9 text-right font-bold">
                  {Math.round(selectedNode.radius)}px
                </span>
              </div>
            </div>

            {/* Curseur Masse en direct */}
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="text-slate-400">Masse (Inertie) :</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={selectedNode.mass}
                  onChange={(e) =>
                    onUpdateNodeMass(selectedNode.id, parseFloat(e.target.value))
                  }
                  className="w-24 accent-cyan-500 cursor-pointer"
                />
                <span className="font-mono text-cyan-300 w-9 text-right font-bold">
                  {selectedNode.mass.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Sélecteur de Comportement (Behavior) */}
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Comportement
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onSetNodeBehavior(selectedNode.id, 'none')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium text-left transition-all ${
                    !selectedNode.behavior || selectedNode.behavior.type === 'none'
                      ? 'bg-slate-700 text-white font-semibold ring-1 ring-slate-400'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => onSetNodeBehavior(selectedNode.id, 'jiggle')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium text-left transition-all flex items-center gap-1.5 ${
                    selectedNode.behavior?.type === 'jiggle'
                      ? 'bg-pink-600 text-white font-semibold ring-2 ring-pink-300'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3 h-3 text-pink-300" /> Jiggle
                </button>
                <button
                  onClick={() => onSetNodeBehavior(selectedNode.id, 'follow_mouse')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium text-left transition-all flex items-center gap-1.5 ${
                    selectedNode.behavior?.type === 'follow_mouse'
                      ? 'bg-sky-600 text-white font-semibold ring-2 ring-sky-300'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-3 h-3 text-sky-300" /> Suivre Souris
                </button>
                <button
                  onClick={() => onSetNodeBehavior(selectedNode.id, 'oscillator')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium text-left transition-all flex items-center gap-1.5 ${
                    selectedNode.behavior?.type === 'oscillator'
                      ? 'bg-purple-600 text-white font-semibold ring-2 ring-purple-300'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-3 h-3 text-purple-300" /> Oscillation
                </button>
              </div>
            </div>

            {/* Bouton Supprimer */}
            <button
              onClick={() => onDeleteNode(selectedNode.id)}
              className="mt-1 w-full py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer ce membre
            </button>
          </div>
        </DraggableWindow>
      )}

      {/* --- 4. FENÊTRE FLOTTANTE DÉPLAÇABLE : PARAMÈTRES PHYSIQUES & FEEL (SETTINGS) --- */}
      {showSettingsWindow && (
        <DraggableWindow
          id="physics-settings"
          title="Paramètres Physiques & Dynamique"
          icon={<Settings2 className="w-3.5 h-3.5 text-indigo-400" />}
          initialPosition={defaultSettingsPos}
          onClose={() => setShowSettingsWindow(false)}
          className="w-80 pointer-events-auto"
        >
          <div className="flex flex-col gap-3 text-xs">
            {/* Presets de Dynamique (Feel) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Preset de Mouvement (Feel)
              </span>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/60">
                <button
                  onClick={() => onFeelChange('jelly')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    settings.feel === 'jelly'
                      ? 'bg-pink-600 text-white ring-2 ring-pink-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Gélatineux
                </button>
                <button
                  onClick={() => onFeelChange('organic')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    settings.feel === 'organic'
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Organique
                </button>
                <button
                  onClick={() => onFeelChange('snappy')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    settings.feel === 'snappy'
                      ? 'bg-amber-600 text-white ring-2 ring-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ferme
                </button>
              </div>
            </div>

            {/* Curseur Rigidité & Amortissement */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Rigidité (k)</span>
                  <span className="text-indigo-300 font-mono font-bold">
                    {settings.stiffnessMultiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={settings.stiffnessMultiplier}
                  onChange={(e) =>
                    onUpdateSetting('stiffnessMultiplier', parseFloat(e.target.value))
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Amortissement</span>
                  <span className="text-indigo-300 font-mono font-bold">
                    {settings.dampingMultiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.05"
                  value={settings.dampingMultiplier}
                  onChange={(e) =>
                    onUpdateSetting('dampingMultiplier', parseFloat(e.target.value))
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Gravité & Friction du sol */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Gravité</span>
                  <span className="text-indigo-300 font-mono font-bold">
                    {Math.round(settings.gravity)}
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1500"
                  step="50"
                  value={settings.gravity}
                  onChange={(e) =>
                    onUpdateSetting('gravity', parseFloat(e.target.value))
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Friction Sol</span>
                  <span className="text-indigo-300 font-mono font-bold">
                    {settings.groundFriction.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.99"
                  step="0.02"
                  value={settings.groundFriction}
                  onChange={(e) =>
                    onUpdateSetting('groundFriction', parseFloat(e.target.value))
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Morphing Metaball (Fusion organique de cercles) */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="flex flex-col">
                <span className="text-slate-200 font-semibold text-[11px]">Fusion Metaballs</span>
                <span className="text-[10px] text-slate-400">Morphing organique fluide entre disques</span>
              </div>
              <button
                id="btn-toggle-metaballs"
                onClick={onToggleMetaballs}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  settings.metaballsEnabled
                    ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {settings.metaballsEnabled ? 'ACTIF' : 'INACTIF'}
              </button>
            </div>
          </div>
        </DraggableWindow>
      )}

      {/* --- 5. FENÊTRE FLOTTANTE DÉPLAÇABLE : LOCOMOTION & IK (SI MARCHEUR ACTIF) --- */}
      {isWalkerActive && (
        <DraggableWindow
          id="locomotion-panel"
          title="Locomotion & Allure IK"
          icon={<Footprints className="w-3.5 h-3.5 text-amber-400" />}
          initialPosition={defaultLocomotionPos}
          className="w-80 pointer-events-auto"
        >
          <div className="flex flex-col gap-2.5 text-xs">
            {/* Commandes tactiles de marche */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn-walk-left"
                onPointerDown={() => onWalkerMove?.(-1)}
                onPointerUp={() => onWalkerMove?.(0)}
                onPointerLeave={() => onWalkerMove?.(0)}
                className={`flex-1 py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1 font-semibold transition-all select-none ${
                  moveDirection === -1
                    ? 'bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-300 shadow-md scale-95'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Reculer (A)
              </button>

              {moveDirection !== 0 && (
                <button
                  id="btn-walk-stop"
                  onClick={() => onWalkerMove?.(0)}
                  title="Stopper la marche"
                  className="py-2 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-rose-300 flex items-center justify-center transition-colors"
                >
                  <SquareSlash className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                id="btn-walk-jump"
                onClick={() => onWalkerJump?.()}
                className="py-2 px-3 bg-amber-600/30 hover:bg-amber-600/50 active:bg-amber-600 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center justify-center gap-1 font-semibold transition-all active:scale-95"
              >
                <ArrowUp className="w-3.5 h-3.5" /> Sauter (W)
              </button>

              <button
                id="btn-walk-right"
                onPointerDown={() => onWalkerMove?.(1)}
                onPointerUp={() => onWalkerMove?.(0)}
                onPointerLeave={() => onWalkerMove?.(0)}
                className={`flex-1 py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1 font-semibold transition-all select-none ${
                  moveDirection === 1
                    ? 'bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-300 shadow-md scale-95'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                Avancer (D) <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Presets de Démarche Procédurale (Inspirés Iorama Studio & Eran Hill) */}
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-amber-400/90 flex items-center justify-between">
                <span>Styles de Démarche (Allure)</span>
                <span className="text-[9px] font-normal text-slate-400">Inspi Iorama / Eran Hill</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'standard', name: 'Standard', desc: 'Bipède naturel' },
                  { id: 'strut', name: 'Strut', desc: 'Fier & cadencé (Eran Hill)' },
                  { id: 'sneak', name: 'Sneak', desc: 'Furtif & accroupi (Iorama)' },
                  { id: 'bouncy', name: 'Bouncy', desc: 'Rebondissant & énergique' },
                  { id: 'waddle', name: 'Waddle', desc: 'Dandinant de gauche à droite' },
                  { id: 'zombie', name: 'Zombie', desc: 'Lourd & asymétrique' },
                ].map((gait) => (
                  <button
                    key={gait.id}
                    id={`btn-gait-${gait.id}`}
                    onClick={() => onSetGaitStyle?.(gait.id as GaitStyle)}
                    title={gait.desc}
                    className={`px-1.5 py-1.5 rounded-xl text-[10px] font-semibold text-center transition-all ${
                      (gaitStyle || settings.gaitStyle || 'standard') === gait.id
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold ring-2 ring-amber-300 shadow-md scale-102'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {gait.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders avancés de locomotion IK */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
              {/* Hauteur du bassin */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Hauteur Bassin</span>
                  <span className="text-amber-300 font-mono font-bold">
                    {Math.round(walkerConfig?.bodyHeight ?? 110)}px
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="200"
                  step="5"
                  value={walkerConfig?.bodyHeight ?? 110}
                  onChange={(e) =>
                    onUpdateWalkerParams?.({ bodyHeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Hauteur de levée du pas */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Levée du Pas</span>
                  <span className="text-amber-300 font-mono font-bold">
                    {Math.round(walkerConfig?.legs?.[0]?.stepHeight ?? 32)}px
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="2"
                  value={walkerConfig?.legs?.[0]?.stepHeight ?? 32}
                  onChange={(e) =>
                    onUpdateWalkerParams?.({ stepHeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Longueur de foulée (Seuil) */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Foulée (Stride)</span>
                  <span className="text-amber-300 font-mono font-bold">
                    {Math.round(walkerConfig?.legs?.[0]?.strideThreshold ?? 40)}px
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="2"
                  value={walkerConfig?.legs?.[0]?.strideThreshold ?? 40}
                  onChange={(e) =>
                    onUpdateWalkerParams?.({ strideThreshold: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Vitesse de marche */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vitesse Propulsion</span>
                  <span className="text-amber-300 font-mono font-bold">
                    {Math.round(walkerConfig?.walkSpeed ?? 600)}
                  </span>
                </div>
                <input
                  type="range"
                  min="250"
                  max="1000"
                  step="25"
                  value={walkerConfig?.walkSpeed ?? 600}
                  onChange={(e) =>
                    onUpdateWalkerParams?.({ walkSpeed: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </DraggableWindow>
      )}

      {/* --- 6. BAS D'ÉCRAN DÉGAGÉ AVEC INDICATION SUBTILE --- */}
      <footer className="w-full flex items-center justify-center pointer-events-none pb-2">
        {!selectedNode && !isWalkerActive && (
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl px-4 py-2 text-xs text-slate-300 shadow-xl flex items-center gap-2 pointer-events-auto">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Sélectionnez un nœud pour ouvrir l'inspecteur, le colorer, lui ajouter une jambe IK ou masquer ses liaisons.
            </span>
          </div>
        )}
      </footer>
    </div>
  );
};
