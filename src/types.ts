/**
 * Types & Schemas - Physics Character Playground
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type MotionFeel = 'jelly' | 'organic' | 'snappy';

export type BehaviorType = 'none' | 'jiggle' | 'follow_mouse' | 'oscillator';

export type LayerId = 'back' | 'main' | 'front';

export type GaitStyle = 'standard' | 'strut' | 'sneak' | 'bouncy' | 'waddle' | 'zombie';

export type EditorTool =
  | 'interact'
  | 'add_node'
  | 'connect'
  | 'draw_freehand'
  | 'draw_stroke'
  | 'shape_box'
  | 'shape_circle'
  | 'shape_capsule';

export type DrawingShapeMode = 'solid' | 'skeleton';

export interface NodeBehaviorConfig {
  type: BehaviorType;
  strength?: number;   // Intensité du comportement
  damping?: number;    // Facteur d'amortissement
  frequency?: number;  // Fréquence (pour oscillator)
  amplitude?: number;  // Amplitude (pour oscillator)
}

export interface WalkerLegConfig {
  id: string;
  name?: string;
  hipNodeId: string;
  footNodeId: string;
  kneeNodeId?: string;    // Nœud intermédiaire de genou articulé (IK 2 segments)
  kneeDirection?: 1 | -1; // +1 = genou plié vers l'avant (humanoïde), -1 = genou vers l'arrière (digitigrade/oiseau)
  upperLegLength?: number;// Longueur cuisse (Hanche -> Genou)
  lowerLegLength?: number;// Longueur mollet (Genou -> Pied)
  restOffsetX: number;    // Décalage horizontal au repos par rapport à la hanche
  strideThreshold: number;// Distance d'élongation déclenchant un pas
  stepHeight: number;     // Hauteur maximale de l'arche de foulée
  stepDuration: number;   // Durée d'un pas (s)
  groupIndex: number;     // Groupe de phase (0 ou 1 pour alternance stricte)

  // État runtime (calculé)
  isStepping?: boolean;
  stepProgress?: number;  // 0 -> 1
  stepFrom?: Vec2;
  stepTo?: Vec2;
  currentTarget?: Vec2;
}

export interface WalkerConfig {
  enabled: boolean;
  rootNodeId: string;
  legs: WalkerLegConfig[];
  walkSpeed: number;      // Vitesse / force de propulsion horizontale
  anticipation: number;   // Coefficient d'anticipation de placement du pied (secondes)
  bodyHeight: number;     // Hauteur cible de maintien de la hanche
  gaitStyle?: GaitStyle;  // Style d'allure (standard, strut, sneak, bouncy, waddle, zombie)
  hipBobbing?: number;    // Amplitude d'ondulation verticale du bassin (rebond)
  hipSway?: number;       // Amplitude de balancement latéral du bassin
  hipLean?: number;       // Inclinaison angulaire vers l'avant selon la vitesse
  footRoll?: number;      // Facteur d'amorti/rotation du pied au contact
  stepHeightMultiplier?: number;
  strideMultiplier?: number;
  kneeDirection?: 1 | -1;
}

export interface AngularJointConfig {
  id: string;
  nodeAId: string;       // Nœud parent (ex: Hanche ou épaule)
  nodeBId: string;       // Nœud pivot / articulation (ex: Genou ou coude)
  nodeCId: string;       // Nœud enfant / extrémité (ex: Pied ou main)
  restAngle: number;     // Angle de repos naturel en radians (entre BA et BC)
  stiffness: number;     // Force de maintien de la posture d'origine
  damping: number;       // Amortissement de la rotation
  minAngle?: number;     // Angle minimum permis (radians)
  maxAngle?: number;     // Angle maximum permis (radians)
  softRange?: number;    // Plage d'élasticité progressive près des limites
  enabled?: boolean;
}

export interface SimNode {
  id: string;
  name?: string;
  position: Vec2;
  velocity: Vec2;
  acceleration: Vec2;
  previousAcceleration?: Vec2;
  mass: number;
  radius: number;
  isPinned: boolean;
  color?: string;
  fillColor?: string;     // Couleur de remplissage flat personnalisée
  strokeColor?: string;   // Couleur du contour (stroke)
  strokeWidth?: number;   // Épaisseur de contour flat
  layer?: LayerId;        // Calque d'affichage (arrière-plan, corps principal, premier plan)
  isGrabbed?: boolean;
  hasEye?: boolean;
  behavior?: NodeBehaviorConfig;
  angularJoint?: AngularJointConfig; // Articulation musculaire avec maintien de pose et limites
  customPolygon?: Vec2[]; // Polygone fermé relatif au centre du nœud
  shapeType?: 'circle' | 'polygon' | 'capsule';
  strokeId?: string;      // Identifiant de regroupement si ce nœud fait partie d'une polyligne/trait physique
  strokeIndex?: number;   // Index le long de la polyligne
}

export interface SimLink {
  id: string;
  nodeAId: string;
  nodeBId: string;
  restLength: number;
  stiffness: number; // Force de rappel du ressort
  damping: number;   // Amortissement des oscillations
  width?: number;
  color?: string;
  fillColor?: string;
  strokeColor?: string;
  layer?: LayerId;   // Calque d'affichage hérité ou propre
  invisible?: boolean; // Si vrai, liaison active physiquement mais non dessinée (invisible joint)
  type?: 'spring' | 'rigid_joint' | 'metaball' | 'stroke_segment';
  renderMetaball?: boolean; // Si vrai, génère un pont fluide metaball continu entre les 2 nœuds
}

export type SkinMode = 'flat' | 'organic' | 'minimal';

export interface SimulationSettings {
  gravity: number;             // Force gravitationnelle vers le bas (px/s²)
  groundY: number;             // Coordonnée Y du plan de sol
  groundFriction: number;      // Friction au contact du sol (0 = patinoire, 1 = arrêt direct)
  airDrag: number;             // Résistance de l'air
  stiffnessMultiplier: number; // Multiplicateur global de rigidité
  dampingMultiplier: number;   // Multiplicateur global d'amortissement
  grabSpringStiffness: number; // Raideur du ressort d'attache à la souris
  grabSpringDamping: number;   // Amortissement du ressort d'attache
  feel: MotionFeel;            // Preset perceptuel global
  skinMode: SkinMode;          // Style de rendu (Organique / Minimaliste)
  metaballsEnabled: boolean;   // Fusion metaballs organique active entre nœuds circulaires reliés
  activeLayer: LayerId;        // Calque actif d'édition et création
  gaitStyle?: GaitStyle;       // Style d'allure de marche sélectionné
  isPaused: boolean;           // État pause/play
  showDebug: boolean;          // Affichage des squelettes, vecteurs et cibles
}

export interface Creature {
  id: string;
  name: string;
  schemaVersion: number;
  nodes: SimNode[];
  links: SimLink[];
  walkerConfig?: WalkerConfig;
}
