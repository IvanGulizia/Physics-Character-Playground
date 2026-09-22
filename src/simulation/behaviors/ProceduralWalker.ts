/**
 * ProceduralWalker.ts
 * Système de locomotion procédurale inspiré des architectures de Keijiro Takahashi.
 * Générique : gère N membres, coordination d'alternance des appuis,
 * trajectoires d'élévation balistiques et suspension dynamique du bassin.
 */
import { GaitStyle, SimNode, Vec2, WalkerConfig, WalkerLegConfig } from '../../types';
import { IKMath } from '../math/IKMath';

export interface GaitPresetData {
  name: string;
  description: string;
  walkSpeed: number;
  bodyHeightRatio: number;
  stepHeight: number;
  strideThreshold: number;
  stepDuration: number;
  hipBobbing: number;
  hipSway: number;
  hipLean: number;
}

export const GAIT_PRESETS: Record<GaitStyle, GaitPresetData> = {
  standard: {
    name: 'Standard (Neutre)',
    description: 'Foulée équilibrée et posture naturelle',
    walkSpeed: 420,
    bodyHeightRatio: 1.0,
    stepHeight: 34,
    strideThreshold: 45,
    stepDuration: 0.32,
    hipBobbing: 8,
    hipSway: 0,
    hipLean: 0.04,
  },
  strut: {
    name: 'Strut / Fier (Eran Hill)',
    description: 'Buste relevé, levée de genou exagérée et rebond royal',
    walkSpeed: 480,
    bodyHeightRatio: 1.15,
    stepHeight: 58,
    strideThreshold: 55,
    stepDuration: 0.38,
    hipBobbing: 16,
    hipSway: 8,
    hipLean: -0.06,
  },
  sneak: {
    name: 'Furtif / Ninja (Iorama)',
    description: 'Centre de gravité bas, genoux fléchis, pas rasants et doux',
    walkSpeed: 280,
    bodyHeightRatio: 0.72,
    stepHeight: 18,
    strideThreshold: 56,
    stepDuration: 0.44,
    hipBobbing: 4,
    hipSway: 3,
    hipLean: 0.14,
  },
  bouncy: {
    name: 'Joyeux / Rebondissant',
    description: 'Cadence vive, impulsion aérienne et grand ressort vertical',
    walkSpeed: 520,
    bodyHeightRatio: 1.05,
    stepHeight: 48,
    strideThreshold: 42,
    stepDuration: 0.24,
    hipBobbing: 22,
    hipSway: 10,
    hipLean: 0.08,
  },
  waddle: {
    name: 'Dandinant (Bébé / Canard)',
    description: 'Balancement latéral marqué du bassin et pas courts rapides',
    walkSpeed: 330,
    bodyHeightRatio: 0.88,
    stepHeight: 28,
    strideThreshold: 32,
    stepDuration: 0.28,
    hipBobbing: 10,
    hipSway: 20,
    hipLean: 0.02,
  },
  zombie: {
    name: 'Zombie / Traînant',
    description: 'Torse désaxé penché en avant, tempo lourd et pieds traînés',
    walkSpeed: 220,
    bodyHeightRatio: 0.85,
    stepHeight: 15,
    strideThreshold: 48,
    stepDuration: 0.52,
    hipBobbing: 6,
    hipSway: 14,
    hipLean: 0.2,
  },
};

export class ProceduralWalker {
  public config: WalkerConfig;
  public moveDirection: number = 0; // -1 (gauche), 0 (stationnaire), +1 (droite)
  public isJumping: boolean = false;
  private baseBodyHeight: number;
  private walkPhase = 0;

  constructor(config: WalkerConfig) {
    this.baseBodyHeight = config.bodyHeight || 95;
    // Clone pour conserver les états runtime
    this.config = {
      ...config,
      gaitStyle: config.gaitStyle || 'standard',
      hipBobbing: config.hipBobbing ?? 8,
      hipSway: config.hipSway ?? 0,
      hipLean: config.hipLean ?? 0.04,
      legs: config.legs.map((leg) => ({
        ...leg,
        isStepping: false,
        stepProgress: 0,
        stepFrom: { x: 0, y: 0 },
        stepTo: { x: 0, y: 0 },
        currentTarget: { x: 0, y: 0 },
      })),
    };
  }

  /**
   * Applique un style de démarche procédurale prédéfini
   */
  public applyGaitStyle(style: GaitStyle) {
    const preset = GAIT_PRESETS[style];
    if (!preset) return;

    this.config.gaitStyle = style;
    this.config.walkSpeed = preset.walkSpeed;
    this.config.bodyHeight = this.baseBodyHeight * preset.bodyHeightRatio;
    this.config.hipBobbing = preset.hipBobbing;
    this.config.hipSway = preset.hipSway;
    this.config.hipLean = preset.hipLean;

    for (const leg of this.config.legs) {
      leg.stepHeight = preset.stepHeight;
      leg.strideThreshold = preset.strideThreshold;
      leg.stepDuration = preset.stepDuration;
    }
  }

  /**
   * Réinitialise les cibles des pieds au sol sous la position actuelle du bassin
   */
  public resetToGround(nodes: SimNode[], groundY: number) {
    const root = nodes.find((n) => n.id === this.config.rootNodeId);
    if (!root) return;

    for (const leg of this.config.legs) {
      const hip = nodes.find((n) => n.id === leg.hipNodeId) || root;
      const foot = nodes.find((n) => n.id === leg.footNodeId);
      if (!foot) continue;

      const restX = hip.position.x + leg.restOffsetX;
      const targetY = groundY - foot.radius;

      leg.isStepping = false;
      leg.stepProgress = 0;
      leg.stepFrom = { x: restX, y: targetY };
      leg.stepTo = { x: restX, y: targetY };
      leg.currentTarget = { x: restX, y: targetY };

      foot.position.x = restX;
      foot.position.y = targetY;
      foot.velocity.x = 0;
      foot.velocity.y = 0;
    }
  }

  /**
   * Ajuste les paramètres de locomotion procédurale en temps réel
   */
  public setParameters(params: {
    walkSpeed?: number;
    bodyHeight?: number;
    stepHeight?: number;
    strideThreshold?: number;
    stepDuration?: number;
    kneeDirection?: 1 | -1;
  }) {
    if (params.walkSpeed !== undefined) this.config.walkSpeed = params.walkSpeed;
    if (params.bodyHeight !== undefined) this.config.bodyHeight = params.bodyHeight;
    if (params.kneeDirection !== undefined) this.config.kneeDirection = params.kneeDirection;
    for (const leg of this.config.legs) {
      if (params.stepHeight !== undefined) leg.stepHeight = params.stepHeight;
      if (params.strideThreshold !== undefined) leg.strideThreshold = params.strideThreshold;
      if (params.stepDuration !== undefined) leg.stepDuration = params.stepDuration;
      if (params.kneeDirection !== undefined) leg.kneeDirection = params.kneeDirection;
    }
  }

  /**
   * Évalue un cycle de locomotion procédurale
   */
  public update(nodes: SimNode[], dt: number, groundY: number) {
    if (!this.config.enabled) return;

    const root = nodes.find((n) => n.id === this.config.rootNodeId);
    if (!root) return;

    // 1. Commande de locomotion : propulsion horizontale du bassin
    if (this.moveDirection !== 0) {
      const driveForce = this.moveDirection * this.config.walkSpeed;
      root.velocity.x += driveForce * dt;
      // Avance la phase de marche selon la vitesse effective
      this.walkPhase += dt * Math.max(3.5, Math.abs(root.velocity.x) * 0.025);
    } else {
      // Amortit la phase de marche à l'arrêt
      this.walkPhase += dt * 0.5;
    }

    // Calcul du rebond vertical (Bobbing) et du balancement latéral (Sway)
    const isMoving = Math.abs(root.velocity.x) > 15 || this.moveDirection !== 0;
    const bobbingOffset = isMoving ? Math.sin(this.walkPhase * 2) * (this.config.hipBobbing || 8) : 0;
    const swayOffset = isMoving ? Math.cos(this.walkPhase) * (this.config.hipSway || 0) : 0;

    // 2. Suspension dynamique du bassin (Maintien de la posture au-dessus du sol)
    // Agit comme un ressort vertical virtuel par rapport au sol avec ondulation organique
    const targetRootY = groundY - this.config.bodyHeight - bobbingOffset;
    const heightDiff = targetRootY - root.position.y;
    // Poussée verticale vers la hauteur cible
    const suspensionK = 200;
    const suspensionDamping = 14;
    const suspensionForceY = heightDiff * suspensionK - root.velocity.y * suspensionDamping;
    root.acceleration.y += suspensionForceY;

    // Application du balancement latéral subtil (Sway)
    if (isMoving && Math.abs(swayOffset) > 0.1) {
      root.acceleration.x += swayOffset * 45;
    }

    // 3. Gestion du saut/impulsion si demandé
    if (this.isJumping) {
      root.velocity.y = -350;
      for (const leg of this.config.legs) {
        const foot = nodes.find((n) => n.id === leg.footNodeId);
        if (foot) {
          foot.velocity.y = -300;
        }
      }
      this.isJumping = false;
    }

    // 4. Détection du nombre de membres actuellement en vol (swing phase) par groupe
    const steppingGroups = new Set<number>();
    for (const leg of this.config.legs) {
      if (leg.isStepping) {
        steppingGroups.add(leg.groupIndex);
      }
    }

    // 5. Mise à jour de chaque jambe (Stance / Swing)
    for (const leg of this.config.legs) {
      const hip = nodes.find((n) => n.id === leg.hipNodeId) || root;
      const foot = nodes.find((n) => n.id === leg.footNodeId);
      if (!foot) continue;

      // Position idéale au repos projetée au sol avec anticipation de la vitesse
      const projectedVelocityX = hip.velocity.x * this.config.anticipation;
      const idealTargetX = hip.position.x + leg.restOffsetX + projectedVelocityX;
      const idealTargetY = groundY - foot.radius;

      if (!leg.isStepping) {
        // En appui au sol (Stance phase)
        const distFromIdeal = Math.abs(foot.position.x - idealTargetX);

        // Seuil d'élongation pour déclencher la foulée
        // Règle d'alternance : ne pas démarrer un pas si un membre du groupe adverse marche déjà
        const canStep =
          steppingGroups.size === 0 ||
          (!steppingGroups.has(1 - leg.groupIndex) && steppingGroups.size < this.config.legs.length);

        if (distFromIdeal > leg.strideThreshold && canStep) {
          // Déclenche une nouvelle foulée
          leg.isStepping = true;
          leg.stepProgress = 0;
          leg.stepFrom = { x: foot.position.x, y: foot.position.y };
          // Cible atterrissage : idéalement légèrement en avant dans le sens de la marche
          leg.stepTo = {
            x: idealTargetX + (this.moveDirection !== 0 ? this.moveDirection * 15 : 0),
            y: idealTargetY,
          };
          steppingGroups.add(leg.groupIndex);
        } else {
          // Reste fermement ancré au sol
          // Rappel doux vers la position de sol pour contrer le glissement excessif
          if (!leg.currentTarget) {
            leg.currentTarget = { x: foot.position.x, y: idealTargetY };
          }
          const holdK = 400;
          const holdDamping = 25;
          const holdFx = (leg.currentTarget.x - foot.position.x) * holdK - foot.velocity.x * holdDamping;
          const holdFy = (idealTargetY - foot.position.y) * holdK - foot.velocity.y * holdDamping;
          foot.acceleration.x += holdFx / foot.mass;
          foot.acceleration.y += holdFy / foot.mass;
        }
      }

      if (leg.isStepping) {
        // En phase de balancement aérien (Swing phase)
        leg.stepProgress = (leg.stepProgress || 0) + dt / leg.stepDuration;

        if (leg.stepProgress >= 1.0) {
          // Fin du pas : atterrissage
          leg.isStepping = false;
          leg.stepProgress = 1.0;
          leg.currentTarget = { ...leg.stepTo! };
          steppingGroups.delete(leg.groupIndex);
        } else {
          // Trajectoire balistique : interpolation X + arche d'élévation sinusoïdale sur Y
          const t = leg.stepProgress;
          // Smoothstep pour progression horizontale douce
          const smoothT = t * t * (3 - 2 * t);
          const currentX = leg.stepFrom!.x + (leg.stepTo!.x - leg.stepFrom!.x) * smoothT;

          // Arche sinusoïdale : 0 à t=0, 1 à t=0.5, 0 à t=1.0
          const elevation = Math.sin(t * Math.PI) * leg.stepHeight;
          const currentY =
            leg.stepFrom!.y + (leg.stepTo!.y - leg.stepFrom!.y) * t - elevation;

          leg.currentTarget = { x: currentX, y: currentY };

          // Force de poursuite vigoureuse vers la cible balistique en l'air
          const swingK = 500;
          const swingDamping = 22;
          const fx = (currentX - foot.position.x) * swingK - foot.velocity.x * swingDamping;
          const fy = (currentY - foot.position.y) * swingK - foot.velocity.y * swingDamping;

          foot.acceleration.x += fx / foot.mass;
          foot.acceleration.y += fy / foot.mass;
        }
      }

      // 6. Si cette patte possède un genou articulé (IK 2 segments), calcul analytique
      if (leg.kneeNodeId) {
        const knee = nodes.find((n) => n.id === leg.kneeNodeId);
        if (knee) {
          const l1 = leg.upperLegLength || 55;
          const l2 = leg.lowerLegLength || 55;
          const dir = leg.kneeDirection || (this.config.kneeDirection ?? 1);

          const targetKnee = IKMath.solve2Bone(hip.position, foot.position, l1, l2, dir);

          // Force de rappel dynamique vers la position IK idéale calculée
          const kneeK = 700;
          const kneeDamping = 26;
          const kFx = (targetKnee.x - knee.position.x) * kneeK - knee.velocity.x * kneeDamping;
          const kFy = (targetKnee.y - knee.position.y) * kneeK - knee.velocity.y * kneeDamping;
          knee.acceleration.x += kFx / knee.mass;
          knee.acceleration.y += kFy / knee.mass;
        }
      }
    }
  }
}
