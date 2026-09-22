/**
 * SimulationWorld - Moteur de simulation physique à pas fixe
 * Découplé de React et optimisé pour le calcul temps réel
 */
import { AngularJointConfig, BehaviorType, Creature, GaitStyle, LayerId, MotionFeel, SimLink, SimNode, SimulationSettings, Vec2 } from '../../types';
import { BehaviorEvaluator } from '../behaviors/BehaviorEvaluator';
import { ProceduralWalker } from '../behaviors/ProceduralWalker';
import { AngularSpringMath } from '../math/AngularSpringMath';
import { FEEL_PRESETS, SpringMath } from '../math/SpringMath';
import { Vector2 } from '../math/Vector2';

export class SimulationWorld {
  public nodes: SimNode[] = [];
  public links: SimLink[] = [];
  public settings: SimulationSettings;

  public walker: ProceduralWalker | null = null;
  public grabbedNodeId: string | null = null;
  public mousePos: Vec2 = { x: 0, y: 0 };
  public globalTime = 0;

  private accumulator = 0;
  private readonly fixedDt = 1 / 60;
  private readonly substeps = 4;
  private nextNodeIndex = 1;

  public currentCreatureId = 'custom';
  public currentCreatureName = 'Créature Personnalisée';

  constructor() {
    this.settings = {
      gravity: 750, // Gravité vers le bas (px/s²)
      groundY: 550, // Coordonnée du sol
      groundFriction: 0.88,
      airDrag: 0.996,
      stiffnessMultiplier: 1.0,
      dampingMultiplier: 0.75,
      grabSpringStiffness: 180,
      grabSpringDamping: 14,
      feel: 'organic',
      skinMode: 'flat',
      metaballsEnabled: true,
      activeLayer: 'main',
      isPaused: false,
      showDebug: false,
    };
    this.applyFeelPreset('organic');
  }

  public applyFeelPreset(feel: MotionFeel) {
    this.settings.feel = feel;
    const preset = FEEL_PRESETS[feel];
    this.settings.stiffnessMultiplier = preset.stiffnessMultiplier;
    this.settings.dampingMultiplier = preset.dampingMultiplier;
  }

  // Historique d'actions pour Undo / Redo
  private history: Creature[] = [];
  private historyIndex = -1;
  private readonly maxHistory = 40;

  public saveSnapshot() {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    const snap = this.exportCreature();
    this.history.push(snap);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  public undo(): boolean {
    if (this.canUndo) {
      this.historyIndex--;
      const snapshot = this.history[this.historyIndex];
      this.restoreSnapshot(snapshot);
      return true;
    }
    return false;
  }

  public redo(): boolean {
    if (this.canRedo) {
      this.historyIndex++;
      const snapshot = this.history[this.historyIndex];
      this.restoreSnapshot(snapshot);
      return true;
    }
    return false;
  }

  public get canUndo(): boolean {
    return this.historyIndex > 0;
  }

  public get canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  private restoreSnapshot(creature: Creature) {
    this.currentCreatureId = creature.id;
    this.currentCreatureName = creature.name;

    this.nodes = creature.nodes.map((n) => ({
      ...n,
      layer: n.layer || 'main',
      position: { ...n.position },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      customPolygon: n.customPolygon ? n.customPolygon.map((p) => ({ ...p })) : undefined,
      angularJoint: n.angularJoint ? { ...n.angularJoint } : undefined,
    }));
    this.links = creature.links.map((l) => ({ ...l, layer: l.layer || 'main' }));
    this.grabbedNodeId = null;

    if (creature.walkerConfig && creature.walkerConfig.enabled) {
      this.walker = new ProceduralWalker({
        ...creature.walkerConfig,
        legs: creature.walkerConfig.legs.map((leg) => ({ ...leg })),
      });
      this.walker.resetToGround(this.nodes, this.settings.groundY);
    } else {
      this.walker = null;
    }
  }

  public setCreature(creature: Creature, recordHistory = true) {
    this.currentCreatureId = creature.id;
    this.currentCreatureName = creature.name;

    // Clone profond pour ne pas muter les presets statiques
    this.nodes = creature.nodes.map((n) => ({
      ...n,
      layer: n.layer || 'main',
      position: { ...n.position },
      velocity: { ...n.velocity },
      acceleration: { ...n.acceleration },
      customPolygon: n.customPolygon ? n.customPolygon.map((p) => ({ ...p })) : undefined,
      angularJoint: n.angularJoint ? { ...n.angularJoint } : undefined,
    }));
    this.links = creature.links.map((l) => ({ ...l, layer: l.layer || 'main' }));
    this.grabbedNodeId = null;

    if (creature.walkerConfig && creature.walkerConfig.enabled) {
      this.walker = new ProceduralWalker({
        ...creature.walkerConfig,
        legs: creature.walkerConfig.legs.map((leg) => ({ ...leg })),
      });
      this.walker.resetToGround(this.nodes, this.settings.groundY);
    } else {
      this.walker = null;
    }

    if (recordHistory) {
      this.saveSnapshot();
    }
  }

  public exportCreature(customName?: string): Creature {
    return {
      id: this.currentCreatureId || 'custom_rig',
      name: customName || this.currentCreatureName || 'Créature Personnalisée',
      schemaVersion: 1,
      nodes: this.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        position: { x: Math.round(n.position.x * 10) / 10, y: Math.round(n.position.y * 10) / 10 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: n.mass,
        radius: n.radius,
        isPinned: n.isPinned,
        color: n.color,
        fillColor: n.fillColor,
        strokeColor: n.strokeColor,
        strokeWidth: n.strokeWidth,
        layer: n.layer || 'main',
        hasEye: n.hasEye,
        shapeType: n.shapeType,
        strokeId: n.strokeId,
        strokeIndex: n.strokeIndex,
        customPolygon: n.customPolygon ? n.customPolygon.map((p) => ({ ...p })) : undefined,
        behavior: n.behavior ? { ...n.behavior } : { type: 'none' },
        angularJoint: n.angularJoint ? { ...n.angularJoint } : undefined,
      })),
      links: this.links.map((l) => ({
        id: l.id,
        nodeAId: l.nodeAId,
        nodeBId: l.nodeBId,
        restLength: Math.round(l.restLength * 10) / 10,
        stiffness: l.stiffness,
        damping: l.damping,
        width: l.width,
        color: l.color,
        layer: l.layer || 'main',
        invisible: l.invisible,
        type: l.type,
        renderMetaball: l.renderMetaball,
      })),
      walkerConfig: this.walker ? {
        ...this.walker.config,
        legs: this.walker.config.legs.map((l) => ({ ...l })),
      } : undefined,
    };
  }

  public getNodeById(id: string): SimNode | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  public findNodeAt(point: Vec2, margin = 22): SimNode | null {
    let closestNode: SimNode | null = null;
    let closestDist = Infinity;

    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dist = Vector2.distance(node.position, point);
      const hitRadius = Math.max(node.radius + margin, 32);
      if (dist <= hitRadius && dist < closestDist) {
        closestDist = dist;
        closestNode = node;
      }
    }
    return closestNode;
  }

  public startGrabbing(nodeId: string, currentMouse: Vec2) {
    this.grabbedNodeId = nodeId;
    this.mousePos = { ...currentMouse };
    const node = this.getNodeById(nodeId);
    if (node) {
      node.isGrabbed = true;
      // En pause, annuler immédiatement l'élan pour manipulation statique
      if (this.settings.isPaused) {
        node.velocity.x = 0;
        node.velocity.y = 0;
        node.acceleration.x = 0;
        node.acceleration.y = 0;
      }
    }
  }

  public updateMousePosition(currentMouse: Vec2) {
    this.mousePos = { ...currentMouse };

    // Déplacement géométrique direct en mode Pause (Éditeur de pose / placement par défaut)
    if (this.settings.isPaused && this.grabbedNodeId) {
      const node = this.getNodeById(this.grabbedNodeId);
      if (node) {
        node.position.x = currentMouse.x;
        node.position.y = currentMouse.y;
        node.velocity.x = 0;
        node.velocity.y = 0;
        node.acceleration.x = 0;
        node.acceleration.y = 0;
      }
    }
  }

  public stopGrabbing() {
    if (this.grabbedNodeId) {
      const node = this.getNodeById(this.grabbedNodeId);
      if (node) {
        node.isGrabbed = false;
        // Si déplacé en mode Pause, adapter automatiquement les longueurs de repos des ressorts
        // pour que ce nouveau placement devienne la pose de repos naturelle (pose par défaut)
        if (this.settings.isPaused) {
          node.velocity.x = 0;
          node.velocity.y = 0;
          node.acceleration.x = 0;
          node.acceleration.y = 0;
          this.recalculateRestLengthsForNode(node.id);
          this.saveSnapshot();
        }
      }
      this.grabbedNodeId = null;
    }
  }

  /**
   * Recalcule les longueurs de repos des liens rattachés à un nœud
   * pour que son placement actuel devienne sa forme géométrique de repos naturelle.
   */
  public recalculateRestLengthsForNode(nodeId: string) {
    const targetNode = this.getNodeById(nodeId);
    if (!targetNode) return;

    for (const link of this.links) {
      if (link.nodeAId === nodeId || link.nodeBId === nodeId) {
        const a = this.getNodeById(link.nodeAId);
        const b = this.getNodeById(link.nodeBId);
        if (a && b) {
          const dist = Vector2.distance(a.position, b.position);
          link.restLength = Math.max(15, dist);
        }
      }
    }

    // Mise à jour de la configuration de marche si ce nœud fait partie du walker
    if (this.walker) {
      const leg = this.walker.config.legs.find(
        (l) => l.footNodeId === nodeId || l.hipNodeId === nodeId || l.kneeNodeId === nodeId
      );
      if (leg) {
        const hip = this.getNodeById(leg.hipNodeId);
        const foot = this.getNodeById(leg.footNodeId);
        if (hip && foot) {
          leg.restOffsetX = foot.position.x - hip.position.x;
          if (leg.kneeNodeId) {
            const knee = this.getNodeById(leg.kneeNodeId);
            if (knee) {
              leg.upperLegLength = Vector2.distance(hip.position, knee.position);
              leg.lowerLegLength = Vector2.distance(knee.position, foot.position);
            }
          }
        }
      }
    }
  }

  /**
   * Recalcule les longueurs de repos de tous les liens pour sceller la pose actuelle comme pose par défaut
   */
  public recalculateAllRestLengths() {
    for (const link of this.links) {
      const a = this.getNodeById(link.nodeAId);
      const b = this.getNodeById(link.nodeBId);
      if (a && b) {
        const dist = Vector2.distance(a.position, b.position);
        link.restLength = Math.max(15, dist);
      }
    }
  }

  /**
   * Avance la simulation en respectant le fixed timestep pour une parfaite stabilité
   */
  public step(rawDt: number) {
    if (this.settings.isPaused) return;

    // Plafonne rawDt pour éviter les sauts temporels si l'onglet perd le focus
    const safeDt = Math.min(rawDt, 0.1);
    this.accumulator += safeDt;

    while (this.accumulator >= this.fixedDt) {
      const subDt = this.fixedDt / this.substeps;
      for (let s = 0; s < this.substeps; s++) {
        this.globalTime += subDt;
        this.substep(subDt);
      }
      this.accumulator -= this.fixedDt;
    }
  }

  private substep(dt: number) {
    // 1. Réinitialiser les accélérations et appliquer la gravité
    for (const node of this.nodes) {
      if (node.isPinned) {
        node.acceleration.x = 0;
        node.acceleration.y = 0;
        node.velocity.x = 0;
        node.velocity.y = 0;
        continue;
      }
      node.acceleration.x = 0;
      node.acceleration.y = this.settings.gravity;
    }

    // 2. Évaluation des Behaviors dynamiques (Jiggle, FollowMouse, Oscillator)
    for (const node of this.nodes) {
      BehaviorEvaluator.evaluate(node, this, dt, this.globalTime);
    }

    // 2b. Évaluation de la locomotion procédurale (Walking / Stepping / Stance)
    if (this.walker) {
      this.walker.update(this.nodes, dt, this.settings.groundY);
    }

    // 3. Ressort d'attache interactif invisible à la souris
    if (this.grabbedNodeId) {
      const grabbedNode = this.getNodeById(this.grabbedNodeId);
      if (grabbedNode && !grabbedNode.isPinned) {
        const grabForce = SpringMath.computeMouseGrabForce(
          grabbedNode,
          this.mousePos,
          this.settings.grabSpringStiffness,
          this.settings.grabSpringDamping
        );
        grabbedNode.acceleration.x += grabForce.x / grabbedNode.mass;
        grabbedNode.acceleration.y += grabForce.y / grabbedNode.mass;
      }
    }

    // 4. Calcul des forces élastiques et amorties des liens
    for (const link of this.links) {
      const nodeA = this.getNodeById(link.nodeAId);
      const nodeB = this.getNodeById(link.nodeBId);
      if (!nodeA || !nodeB) continue;

      const { forceOnB } = SpringMath.computeLinkForce(
        nodeA,
        nodeB,
        link.restLength,
        link.stiffness,
        link.damping,
        this.settings.stiffnessMultiplier,
        this.settings.dampingMultiplier
      );

      if (!nodeB.isPinned) {
        nodeB.acceleration.x += forceOnB.x / nodeB.mass;
        nodeB.acceleration.y += forceOnB.y / nodeB.mass;
      }
      if (!nodeA.isPinned) {
        nodeA.acceleration.x -= forceOnB.x / nodeA.mass;
        nodeA.acceleration.y -= forceOnB.y / nodeA.mass;
      }
    }

    // 4b. Calcul des forces angulaires musculaires (Ressorts de torsion, maintien de pose & soft-limits)
    for (const node of this.nodes) {
      if (!node.angularJoint || node.angularJoint.enabled === false) continue;
      const joint = node.angularJoint;
      const nodeA = this.getNodeById(joint.nodeAId);
      const nodeB = node; // Le nœud porteur est le pivot (ex: genou / coude)
      const nodeC = this.getNodeById(joint.nodeCId);
      if (!nodeA || !nodeB || !nodeC) continue;

      const { forceA, forceB, forceC } = AngularSpringMath.computeTorqueForces(
        nodeA.position,
        nodeB.position,
        nodeC.position,
        nodeA.velocity,
        nodeB.velocity,
        nodeC.velocity,
        nodeA.mass,
        nodeB.mass,
        nodeC.mass,
        {
          ...joint,
          stiffness: joint.stiffness * this.settings.stiffnessMultiplier,
          damping: joint.damping * this.settings.dampingMultiplier,
        }
      );

      if (!nodeA.isPinned) {
        nodeA.acceleration.x += forceA.x / nodeA.mass;
        nodeA.acceleration.y += forceA.y / nodeA.mass;
      }
      if (!nodeB.isPinned) {
        nodeB.acceleration.x += forceB.x / nodeB.mass;
        nodeB.acceleration.y += forceB.y / nodeB.mass;
      }
      if (!nodeC.isPinned) {
        nodeC.acceleration.x += forceC.x / nodeC.mass;
        nodeC.acceleration.y += forceC.y / nodeC.mass;
      }
    }

    // 5. Intégration semi-implicite d'Euler
    for (const node of this.nodes) {
      if (node.isPinned) continue;

      node.velocity.x += node.acceleration.x * dt;
      node.velocity.y += node.acceleration.y * dt;

      // Traînée atmosphérique douce
      const dragFactor = Math.pow(this.settings.airDrag, dt * 60);
      node.velocity.x *= dragFactor;
      node.velocity.y *= dragFactor;

      // Bornage de sécurité sur la vitesse
      const maxSpeed = 3500;
      const speedSq = node.velocity.x * node.velocity.x + node.velocity.y * node.velocity.y;
      if (speedSq > maxSpeed * maxSpeed) {
        const speed = Math.sqrt(speedSq);
        node.velocity.x = (node.velocity.x / speed) * maxSpeed;
        node.velocity.y = (node.velocity.y / speed) * maxSpeed;
      }

      // Mise à jour de la position
      node.position.x += node.velocity.x * dt;
      node.position.y += node.velocity.y * dt;

      // 6. Contrainte du sol
      const floorLimit = this.settings.groundY - node.radius;
      if (node.position.y > floorLimit) {
        node.position.y = floorLimit;
        if (node.velocity.y > 0) {
          // Micro-restitution pour contact organique naturel (pas de balle de tennis)
          node.velocity.y = -node.velocity.y * 0.05;
        }
        // Friction au sol
        node.velocity.x *= this.settings.groundFriction;
      }
    }
  }

  // --- Méthodes d'édition directe (Direct Manipulation) ---

  public addNode(position: Vec2, options: Partial<SimNode> = {}): SimNode {
    const id = `node_${Date.now()}_${this.nextNodeIndex++}`;
    const newNode: SimNode = {
      id,
      name: options.name || `Nœud ${this.nodes.length + 1}`,
      position: { ...position },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: options.mass ?? 1.0,
      radius: options.radius ?? 24,
      isPinned: options.isPinned ?? false,
      color: options.color || '#818cf8',
      layer: options.layer || this.settings.activeLayer || 'main',
      hasEye: options.hasEye ?? (this.nodes.length === 0),
      behavior: options.behavior || { type: 'none' },
      strokeId: options.strokeId,
      strokeIndex: options.strokeIndex,
    };
    this.nodes.push(newNode);
    return newNode;
  }

  public connectNodes(
    nodeAId: string,
    nodeBId: string,
    options: Partial<SimLink> = {}
  ): SimLink | null {
    if (nodeAId === nodeBId) return null;

    // Vérifie si le lien existe déjà
    const existing = this.links.find(
      (l) =>
        (l.nodeAId === nodeAId && l.nodeBId === nodeBId) ||
        (l.nodeAId === nodeBId && l.nodeBId === nodeAId)
    );
    if (existing) return existing;

    const nodeA = this.getNodeById(nodeAId);
    const nodeB = this.getNodeById(nodeBId);
    if (!nodeA || !nodeB) return null;

    const dist = Vector2.distance(nodeA.position, nodeB.position);
    const newLink: SimLink = {
      id: `link_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      nodeAId,
      nodeBId,
      restLength: options.restLength ?? Math.max(25, dist),
      stiffness: options.stiffness ?? 120,
      damping: options.damping ?? 8,
      width: options.width ?? 12,
      color: options.color || nodeA.color || 'rgba(99, 102, 241, 0.75)',
      layer: options.layer || nodeA.layer || this.settings.activeLayer || 'main',
      invisible: options.invisible ?? false,
      type: options.type ?? 'spring',
      renderMetaball: options.renderMetaball,
    };
    this.links.push(newLink);
    return newLink;
  }

  /**
   * Bascule la visibilité graphique d'un lien (ressort ou pivot invisible)
   */
  public toggleLinkInvisible(linkId: string) {
    const link = this.links.find((l) => l.id === linkId);
    if (link) {
      link.invisible = !link.invisible;
    }
  }

  /**
   * Bascule tous les liens connectés à un nœud en mode invisible / visible
   */
  public toggleLinksInvisibleForNode(nodeId: string) {
    const connectedLinks = this.links.filter(
      (l) => l.nodeAId === nodeId || l.nodeBId === nodeId
    );
    // Si au moins un est visible, rendre tout invisible, sinon rendre tout visible
    const anyVisible = connectedLinks.some((l) => !l.invisible);
    for (const link of connectedLinks) {
      link.invisible = anyVisible;
    }
  }

  /**
   * Ajoute une patte articulée IK (Hanche -> Genou -> Pied)
   */
  public addIKLeg(
    hipNodeId: string,
    kneeDirection: 1 | -1 = 1,
    options?: { footOffsetX?: number; legLength?: number; invisibleLinks?: boolean }
  ) {
    const hip = this.getNodeById(hipNodeId);
    if (!hip) return null;

    const footOffset = options?.footOffsetX ?? (kneeDirection > 0 ? 30 : -30);
    const totalLegLength = options?.legLength ?? 110;
    const l1 = totalLegLength * 0.52; // Cuisse
    const l2 = totalLegLength * 0.48; // Mollet

    const color = hip.color || '#f59e0b';
    const groundY = this.settings.groundY;

    // Position du pied au sol
    const footPos = {
      x: hip.position.x + footOffset,
      y: groundY - 14,
    };

    // Position intermédiaire du genou (fléchi selon direction)
    const midY = (hip.position.y + footPos.y) * 0.5;
    const kneePos = {
      x: hip.position.x + (kneeDirection > 0 ? 25 : -25),
      y: midY,
    };

    const kneeNode = this.addNode(kneePos, {
      name: `Genou ${kneeDirection > 0 ? 'Droit' : 'Gauche'}`,
      radius: 14,
      mass: 0.5,
      color,
      hasEye: false,
    });

    const footNode = this.addNode(footPos, {
      name: `Pied ${kneeDirection > 0 ? 'Droit' : 'Gauche'}`,
      radius: 14,
      mass: 0.6,
      color,
      hasEye: false,
    });

    const isInvisible = options?.invisibleLinks ?? false;

    // Lien Hanche -> Genou (Cuisse)
    this.connectNodes(hip.id, kneeNode.id, {
      color,
      stiffness: 240,
      damping: 12,
      width: 14,
      restLength: l1,
      invisible: isInvisible,
    });

    // Lien Genou -> Pied (Mollet)
    this.connectNodes(kneeNode.id, footNode.id, {
      color,
      stiffness: 240,
      damping: 12,
      width: 12,
      restLength: l2,
      invisible: isInvisible,
    });

    // Enregistrement dans le walker
    if (!this.walker) {
      this.setWalkerRoot(hip.id);
    }

    if (this.walker) {
      const legCount = this.walker.config.legs.length;
      this.walker.config.legs.push({
        id: `leg_${footNode.id}`,
        name: `Jambe IK ${legCount + 1}`,
        hipNodeId: hip.id,
        kneeNodeId: kneeNode.id,
        footNodeId: footNode.id,
        kneeDirection,
        upperLegLength: l1,
        lowerLegLength: l2,
        restOffsetX: footOffset,
        strideThreshold: 45,
        stepHeight: 35,
        stepDuration: 0.3,
        groupIndex: legCount % 2,
      });
      this.walker.config.enabled = true;
      this.walker.resetToGround(this.nodes, this.settings.groundY);
    }

    return { knee: kneeNode, foot: footNode };
  }

  public deleteNode(nodeId: string) {
    this.nodes = this.nodes.filter((n) => n.id !== nodeId);
    // Supprime également tous les liens rattachés à ce nœud
    this.links = this.links.filter(
      (l) => l.nodeAId !== nodeId && l.nodeBId !== nodeId
    );
    if (this.grabbedNodeId === nodeId) {
      this.grabbedNodeId = null;
    }
    this.saveSnapshot();
  }

  public togglePin(nodeId: string) {
    const node = this.getNodeById(nodeId);
    if (node) {
      node.isPinned = !node.isPinned;
      node.velocity = { x: 0, y: 0 };
      node.acceleration = { x: 0, y: 0 };
    }
  }

  public setNodeBehavior(nodeId: string, behaviorType: BehaviorType) {
    const node = this.getNodeById(nodeId);
    if (node) {
      node.behavior = {
        type: behaviorType,
        strength: 1,
        damping: 1,
        frequency: 2.5,
        amplitude: 140,
      };
    }
  }

  public setMoveDirection(dir: number) {
    if (this.walker) {
      this.walker.moveDirection = dir;
    }
  }

  public triggerJump() {
    if (this.walker) {
      this.walker.isJumping = true;
    } else {
      for (const node of this.nodes) {
        if (!node.isPinned) {
          node.velocity.y = -350;
        }
      }
    }
  }

  public resetVelocities() {
    for (const node of this.nodes) {
      node.velocity.x = 0;
      node.velocity.y = 0;
      node.acceleration.x = 0;
      node.acceleration.y = 0;
    }
    if (this.walker) {
      this.walker.resetToGround(this.nodes, this.settings.groundY);
    }
  }

  // --- Générateurs de formes et dessin libre ---

  /**
   * Attache automatiquement les extrémités d'une nouvelle forme aux nœuds existants à proximité
   */
  public autoConnectToNearbyExisting(newNodes: SimNode[], threshold = 45, invisibleJoints = false) {
    const newNodeIds = new Set(newNodes.map((n) => n.id));
    const existingNodes = this.nodes.filter((n) => !newNodeIds.has(n.id));
    if (existingNodes.length === 0) return;

    for (const newNode of newNodes) {
      for (const exist of existingNodes) {
        const dist = Vector2.distance(newNode.position, exist.position);
        if (dist <= threshold + exist.radius + newNode.radius) {
          // Relie le nouveau nœud au nœud existant
          this.connectNodes(newNode.id, exist.id, {
            width: 14,
            color: newNode.color || exist.color,
            stiffness: 220,
            damping: 14,
            invisible: invisibleJoints,
          });
          break; // Un point d'ancrage par nœud suffit
        }
      }
    }
  }

  /**
   * Solution 1 (Plein / Corps unique avec son centre de masse) :
   * Transforme un tracé polygonal fermé en un UNIQUE nœud physique situé au centroïde géométrique,
   * avec sommets relatifs customPolygon et masse proportionnelle à la surface.
   */
  public createSolidPolygonNode(rawPoints: Vec2[], color = '#38bdf8', invisibleJoints = true): SimNode {
    const pts = [...rawPoints];
    if (pts.length >= 3 && Vector2.distance(pts[0], pts[pts.length - 1]) > 5) {
      pts.push({ ...pts[0] });
    }

    const n = pts.length - 1;
    let signedArea = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < n; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cross = p0.x * p1.y - p1.x * p0.y;
      signedArea += cross;
      cx += (p0.x + p1.x) * cross;
      cy += (p0.y + p1.y) * cross;
    }

    signedArea *= 0.5;
    const absArea = Math.abs(signedArea);

    let centroid: Vec2;
    if (absArea < 10) {
      let sumX = 0, sumY = 0;
      for (let i = 0; i < n; i++) {
        sumX += pts[i].x;
        sumY += pts[i].y;
      }
      centroid = { x: sumX / n, y: sumY / n };
    } else {
      cx = cx / (6 * signedArea);
      cy = cy / (6 * signedArea);
      centroid = { x: cx, y: cy };
    }

    // Calcul des sommets relatifs au centroïde et rayon max
    let maxDist = 18;
    const localPolygon: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const relX = pts[i].x - centroid.x;
      const relY = pts[i].y - centroid.y;
      localPolygon.push({ x: relX, y: relY });
      const dist = Math.hypot(relX, relY);
      if (dist > maxDist) maxDist = dist;
    }

    const mass = Math.max(0.6, Math.min(8, Math.round((Math.max(500, absArea) / 1800) * 10) / 10));

    const solidNode = this.addNode(centroid, {
      name: `Pièce ${this.nextNodeIndex}`,
      color,
      radius: Math.max(16, Math.min(65, Math.round(maxDist * 0.75))),
      mass,
      hasEye: true,
      customPolygon: localPolygon,
      shapeType: 'polygon',
    });

    this.autoConnectToNearbyExisting([solidNode], 50, invisibleJoints);
    this.saveSnapshot();
    return solidNode;
  }

  /**
   * Crée une boîte rectangulaire pleine sous la forme d'un nœud unique centroïde (Solution 1)
   */
  public createSolidBoxNode(start: Vec2, end: Vec2, color = '#a855f7', invisibleJoints = true): SimNode {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const w = Math.max(30, maxX - minX);
    const h = Math.max(30, maxY - minY);
    const cx = minX + w * 0.5;
    const cy = minY + h * 0.5;

    const hw = w * 0.5;
    const hh = h * 0.5;
    const localCorners: Vec2[] = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];

    const area = w * h;
    const mass = Math.max(0.6, Math.min(6, Math.round((area / 1800) * 10) / 10));

    const node = this.addNode({ x: cx, y: cy }, {
      name: `Bloc ${this.nextNodeIndex}`,
      color,
      radius: Math.max(16, Math.round(Math.hypot(hw, hh) * 0.7)),
      mass,
      hasEye: false,
      customPolygon: localCorners,
      shapeType: 'polygon',
    });

    this.autoConnectToNearbyExisting([node], 45, invisibleJoints);
    this.saveSnapshot();
    return node;
  }

  /**
   * Fusionne deux nœuds en un seul nœud (groupe de formes) avec barycentre et masse unifiés
   */
  public mergeNodes(nodeAId: string, nodeBId: string): SimNode | null {
    const a = this.getNodeById(nodeAId);
    const b = this.getNodeById(nodeBId);
    if (!a || !b || a.id === b.id) return null;

    const totalMass = a.mass + b.mass;
    const combinedPos: Vec2 = {
      x: (a.position.x * a.mass + b.position.x * b.mass) / totalMass,
      y: (a.position.y * a.mass + b.position.y * b.mass) / totalMass,
    };

    // Si les deux ont des customPolygon, on les regroupe décalés par rapport au nouveau centre
    let combinedPoly: Vec2[] | undefined;
    if (a.customPolygon && b.customPolygon) {
      const offsetA = { x: a.position.x - combinedPos.x, y: a.position.y - combinedPos.y };
      const offsetB = { x: b.position.x - combinedPos.x, y: b.position.y - combinedPos.y };
      const polyA = a.customPolygon.map((p) => ({ x: p.x + offsetA.x, y: p.y + offsetA.y }));
      const polyB = b.customPolygon.map((p) => ({ x: p.x + offsetB.x, y: p.y + offsetB.y }));
      combinedPoly = [...polyA, ...polyB];
    } else if (a.customPolygon) {
      const offsetA = { x: a.position.x - combinedPos.x, y: a.position.y - combinedPos.y };
      combinedPoly = a.customPolygon.map((p) => ({ x: p.x + offsetA.x, y: p.y + offsetA.y }));
    }

    a.position = combinedPos;
    a.mass = totalMass;
    a.radius = Math.max(a.radius, b.radius) + 4;
    if (combinedPoly) {
      a.customPolygon = combinedPoly;
      a.shapeType = 'polygon';
    }

    // Transférer les liens de B vers A (ignorer le lien interne A-B)
    for (const link of this.links) {
      if ((link.nodeAId === a.id && link.nodeBId === b.id) || (link.nodeAId === b.id && link.nodeBId === a.id)) {
        continue;
      }
      if (link.nodeAId === b.id) link.nodeAId = a.id;
      if (link.nodeBId === b.id) link.nodeBId = a.id;
    }

    // Retirer le nœud B et tout lien résiduel
    this.links = this.links.filter(
      (l) => !(l.nodeAId === a.id && l.nodeBId === a.id) && l.nodeAId !== b.id && l.nodeBId !== b.id
    );
    this.nodes = this.nodes.filter((n) => n.id !== b.id);

    this.saveSnapshot();
    return a;
  }

  public createFreehandChain(points: Vec2[], color = '#38bdf8', closeLoop = false) {
    if (points.length < 2) return [];
    const createdNodes: SimNode[] = [];
    for (let i = 0; i < points.length; i++) {
      const node = this.addNode(points[i], {
        name: `Tracé ${i + 1}`,
        radius: 16,
        color,
        hasEye: false,
      });
      createdNodes.push(node);
      if (i > 0) {
        this.connectNodes(createdNodes[i - 1].id, node.id, {
          width: 14,
          color,
          stiffness: 160,
          damping: 10,
        });
      }
    }
    if (closeLoop && createdNodes.length > 2) {
      this.connectNodes(createdNodes[createdNodes.length - 1].id, createdNodes[0].id, {
        width: 14,
        color,
        stiffness: 160,
        damping: 10,
      });
    }

    // Accroche automatique aux parties existantes proches
    this.autoConnectToNearbyExisting(createdNodes);
    this.saveSnapshot();
    return createdNodes;
  }

  public createBoxShape(start: Vec2, end: Vec2, color = '#a855f7') {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const w = Math.max(40, maxX - minX);
    const h = Math.max(40, maxY - minY);

    const p0 = { x: minX, y: minY };
    const p1 = { x: minX + w, y: minY };
    const p2 = { x: minX + w, y: minY + h };
    const p3 = { x: minX, y: minY + h };

    const n0 = this.addNode(p0, { name: 'Boîte HG', color, radius: 18 });
    const n1 = this.addNode(p1, { name: 'Boîte HD', color, radius: 18 });
    const n2 = this.addNode(p2, { name: 'Boîte BD', color, radius: 18 });
    const n3 = this.addNode(p3, { name: 'Boîte BG', color, radius: 18 });

    // Liens périphériques
    this.connectNodes(n0.id, n1.id, { color, stiffness: 220, damping: 12, width: 14 });
    this.connectNodes(n1.id, n2.id, { color, stiffness: 220, damping: 12, width: 14 });
    this.connectNodes(n2.id, n3.id, { color, stiffness: 220, damping: 12, width: 14 });
    this.connectNodes(n3.id, n0.id, { color, stiffness: 220, damping: 12, width: 14 });

    // Liens diagonaux pour la rigidité structurelle
    this.connectNodes(n0.id, n2.id, { color, stiffness: 200, damping: 12, width: 10 });
    this.connectNodes(n1.id, n3.id, { color, stiffness: 200, damping: 12, width: 10 });

    const created = [n0, n1, n2, n3];
    this.autoConnectToNearbyExisting(created);
    this.saveSnapshot();
    return created;
  }

  public createCircleShape(center: Vec2, edge: Vec2, numPoints = 6, color = '#ec4899') {
    const radius = Math.max(30, Vector2.distance(center, edge));
    const createdNodes: SimNode[] = [];

    // Nœud central (noyau souple)
    const coreNode = this.addNode(center, {
      name: 'Noyau Sphère',
      color,
      radius: 20,
      hasEye: false,
      behavior: { type: 'jiggle', strength: 1, damping: 0.6 },
    });

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const pos = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
      const node = this.addNode(pos, {
        name: `Pétale ${i + 1}`,
        color,
        radius: 16,
      });
      createdNodes.push(node);

      // Relier au cœur
      this.connectNodes(coreNode.id, node.id, {
        color,
        stiffness: 180,
        damping: 10,
        width: 10,
      });
    }

    // Relier l'anneau périphérique
    for (let i = 0; i < numPoints; i++) {
      const nextIndex = (i + 1) % numPoints;
      this.connectNodes(createdNodes[i].id, createdNodes[nextIndex].id, {
        color,
        stiffness: 180,
        damping: 10,
        width: 14,
      });
    }

    const all = [coreNode, ...createdNodes];
    this.autoConnectToNearbyExisting(all);
    this.saveSnapshot();
    return all;
  }

  public createCapsuleShape(start: Vec2, end: Vec2, color = '#10b981') {
    const dist = Vector2.distance(start, end);
    const length = Math.max(40, dist);
    const nA = this.addNode(start, {
      name: 'Capsule Tête',
      color,
      radius: 22,
      hasEye: false,
    });
    const nB = this.addNode(end, {
      name: 'Capsule Base',
      color,
      radius: 20,
    });

    this.connectNodes(nA.id, nB.id, {
      color,
      stiffness: 220,
      damping: 12,
      width: 22,
      restLength: length,
    });

    const all = [nA, nB];
    this.autoConnectToNearbyExisting(all);
    this.saveSnapshot();
    return all;
  }

  /**
   * Efface toute la scène pour démarrer une créature from scratch sur toile vierge
   */
  public clearWorld() {
    this.nodes = [];
    this.links = [];
    this.walker = null;
    this.grabbedNodeId = null;
    this.currentCreatureId = 'custom';
    this.currentCreatureName = 'Nouvelle Créature';
    this.nextNodeIndex = 1;
    this.saveSnapshot();
  }

  /**
   * Définit ou bascule le nœud désigné comme Racine / Torse de marche
   */
  public setWalkerRoot(rootNodeId: string) {
    const rootNode = this.getNodeById(rootNodeId);
    if (!rootNode) return;

    if (!this.walker) {
      this.walker = new ProceduralWalker({
        enabled: true,
        rootNodeId,
        legs: [],
        walkSpeed: 750,
        anticipation: 0.12,
        bodyHeight: Math.max(50, this.settings.groundY - rootNode.position.y),
      });
    } else {
      this.walker.config.rootNodeId = rootNodeId;
      this.walker.config.bodyHeight = Math.max(50, this.settings.groundY - rootNode.position.y);
      this.walker.config.enabled = true;
    }
  }

  /**
   * Bascule un nœud comme Patte / Pied marcheur procédural
   */
  public toggleWalkerFoot(nodeId: string) {
    const footNode = this.getNodeById(nodeId);
    if (!footNode) return;

    // Si pas de walker, choisir le nœud le plus haut comme racine
    if (!this.walker) {
      let rootCandidate = this.nodes.find((n) => n.id !== nodeId);
      if (!rootCandidate) rootCandidate = footNode;
      // Cherche le nœud le plus élevé dans les airs (Y le plus bas)
      for (const n of this.nodes) {
        if (n.id !== nodeId && n.position.y < rootCandidate.position.y) {
          rootCandidate = n;
        }
      }
      this.setWalkerRoot(rootCandidate.id);
    }

    if (!this.walker) return;

    const existingIndex = this.walker.config.legs.findIndex((l) => l.footNodeId === nodeId);
    if (existingIndex >= 0) {
      // Retire la patte
      this.walker.config.legs.splice(existingIndex, 1);
      if (this.walker.config.legs.length === 0) {
        this.walker.config.enabled = false;
      }
    } else {
      // Ajoute la patte
      const root = this.getNodeById(this.walker.config.rootNodeId) || footNode;
      const legCount = this.walker.config.legs.length;
      this.walker.config.legs.push({
        id: `leg_${nodeId}`,
        name: `Pied ${legCount + 1}`,
        hipNodeId: root.id,
        footNodeId: nodeId,
        restOffsetX: footNode.position.x - root.position.x,
        strideThreshold: 45,
        stepHeight: 35,
        stepDuration: 0.3,
        groupIndex: legCount % 2,
      });
      this.walker.config.enabled = true;
      this.walker.resetToGround(this.nodes, this.settings.groundY);
    }
  }

  public isWalkerFoot(nodeId: string): boolean {
    if (!this.walker || !this.walker.config.legs) return false;
    return this.walker.config.legs.some((l) => l.footNodeId === nodeId);
  }

  public isWalkerRoot(nodeId: string): boolean {
    if (!this.walker) return false;
    return this.walker.config.rootNodeId === nodeId;
  }

  public isWalkerKnee(nodeId: string): boolean {
    if (!this.walker || !this.walker.config.legs) return false;
    return this.walker.config.legs.some((l) => l.kneeNodeId === nodeId);
  }

  /**
   * Définit précisément un nœud en tant que Genou articulé IK.
   * Détecte automatiquement la hanche (nœud connecté plus haut ou racine du walker)
   * et le pied (nœud connecté plus bas au sol) pour enregistrer la chaîne cinématique.
   */
  public toggleWalkerKnee(nodeId: string, kneeDir: 1 | -1 = 1): { success: boolean; hipId?: string; footId?: string } {
    const kneeNode = this.getNodeById(nodeId);
    if (!kneeNode) return { success: false };

    // Si déjà genou d'une patte existante, le délier
    if (this.walker && this.isWalkerKnee(nodeId)) {
      const leg = this.walker.config.legs.find((l) => l.kneeNodeId === nodeId);
      if (leg) {
        leg.kneeNodeId = undefined;
        // Supprime l'articulation musculaire si présente
        kneeNode.angularJoint = undefined;
        return { success: true };
      }
    }

    // 1. Recherche des voisins connectés au nœud désigné comme genou
    const connectedNodeIds = new Set<string>();
    for (const link of this.links) {
      if (link.nodeAId === nodeId) connectedNodeIds.add(link.nodeBId);
      if (link.nodeBId === nodeId) connectedNodeIds.add(link.nodeAId);
    }

    const connectedNodes = Array.from(connectedNodeIds)
      .map((id) => this.getNodeById(id))
      .filter((n): n is SimNode => n !== undefined);

    let hipCandidate: SimNode | undefined;
    let footCandidate: SimNode | undefined;

    if (connectedNodes.length >= 2) {
      // Trier par position Y croissante (Y le plus bas = plus haut dans l'espace = Hanche)
      const sortedByY = [...connectedNodes].sort((a, b) => a.position.y - b.position.y);
      hipCandidate = sortedByY[0]; // Plus haut que le genou
      footCandidate = sortedByY[sortedByY.length - 1]; // Plus bas que le genou (vers le sol)
    } else if (connectedNodes.length === 1) {
      const neighbor = connectedNodes[0];
      if (neighbor.position.y < kneeNode.position.y) {
        hipCandidate = neighbor;
      } else {
        footCandidate = neighbor;
      }
    }

    // Si la hanche n'est pas trouvée via les liens, utiliser la racine du walker ou le nœud le plus haut
    if (!hipCandidate) {
      if (this.walker && this.walker.config.rootNodeId) {
        hipCandidate = this.getNodeById(this.walker.config.rootNodeId);
      }
      if (!hipCandidate) {
        let highest = this.nodes.find((n) => n.id !== nodeId);
        for (const n of this.nodes) {
          if (n.id !== nodeId && (!highest || n.position.y < highest.position.y)) {
            highest = n;
          }
        }
        hipCandidate = highest;
      }
    }

    // Si le pied n'est pas trouvé via les liens, chercher le nœud le plus bas sous le genou
    if (!footCandidate) {
      let lowest: SimNode | undefined;
      for (const n of this.nodes) {
        if (n.id !== nodeId && n.id !== hipCandidate?.id && n.position.y > kneeNode.position.y) {
          if (!lowest || n.position.y > lowest.position.y) {
            lowest = n;
          }
        }
      }
      footCandidate = lowest;
    }

    if (!hipCandidate || !footCandidate) {
      return { success: false };
    }

    // Assurer que le walker existe et a une racine
    if (!this.walker) {
      this.setWalkerRoot(hipCandidate.id);
    } else if (!this.walker.config.rootNodeId) {
      this.walker.config.rootNodeId = hipCandidate.id;
    }

    if (!this.walker) return { success: false };

    // Vérifier si une patte avec ce pied existe déjà dans le walker
    let leg = this.walker.config.legs.find((l) => l.footNodeId === footCandidate!.id);
    const l1 = Vector2.distance(hipCandidate.position, kneeNode.position) || 55;
    const l2 = Vector2.distance(kneeNode.position, footCandidate.position) || 55;

    // Calcul de l'angle initial au repos
    const restAngle = AngularSpringMath.computeAngle(
      hipCandidate.position,
      kneeNode.position,
      footCandidate.position
    );

    // Initialisation automatique du muscle angulaire (ressort de maintien de posture et limites)
    kneeNode.angularJoint = {
      id: `muscle_${kneeNode.id}`,
      nodeAId: hipCandidate.id,
      nodeBId: kneeNode.id,
      nodeCId: footCandidate.id,
      restAngle,
      stiffness: 850,
      damping: 18,
      minAngle: restAngle - 0.9,  // Marge de flexion de ~50°
      maxAngle: restAngle + 0.9,  // Marge d'extension de ~50°
      softRange: 0.35,             // Plage élastique progressive
      enabled: true,
    };

    if (leg) {
      leg.kneeNodeId = kneeNode.id;
      leg.hipNodeId = hipCandidate.id;
      leg.upperLegLength = l1;
      leg.lowerLegLength = l2;
      leg.kneeDirection = kneeDir;
    } else {
      const legCount = this.walker.config.legs.length;
      this.walker.config.legs.push({
        id: `leg_${footCandidate.id}`,
        name: `Jambe IK ${legCount + 1}`,
        hipNodeId: hipCandidate.id,
        kneeNodeId: kneeNode.id,
        footNodeId: footCandidate.id,
        kneeDirection: kneeDir,
        upperLegLength: l1,
        lowerLegLength: l2,
        restOffsetX: footCandidate.position.x - hipCandidate.position.x,
        strideThreshold: 45,
        stepHeight: 35,
        stepDuration: 0.3,
        groupIndex: legCount % 2,
      });
    }

    this.walker.config.enabled = true;
    this.walker.resetToGround(this.nodes, this.settings.groundY);
    this.saveSnapshot();

    return {
      success: true,
      hipId: hipCandidate.id,
      footId: footCandidate.id,
    };
  }

  /**
   * Configure ou met à jour le muscle / ressort de rappel angulaire d'un nœud
   */
  public updateNodeAngularJoint(
    nodeId: string,
    updates: Partial<AngularJointConfig>
  ) {
    const node = this.getNodeById(nodeId);
    if (!node) return;

    if (!node.angularJoint) {
      // Tente de créer le joint angulaire à partir des voisins
      const connected = this.links
        .filter((l) => l.nodeAId === nodeId || l.nodeBId === nodeId)
        .map((l) => (l.nodeAId === nodeId ? l.nodeBId : l.nodeAId));
      if (connected.length >= 2) {
        const nodeA = this.getNodeById(connected[0]);
        const nodeC = this.getNodeById(connected[1]);
        if (nodeA && nodeC) {
          const rest = AngularSpringMath.computeAngle(nodeA.position, node.position, nodeC.position);
          node.angularJoint = {
            id: `joint_${node.id}`,
            nodeAId: nodeA.id,
            nodeBId: node.id,
            nodeCId: nodeC.id,
            restAngle: rest,
            stiffness: 700,
            damping: 16,
            minAngle: rest - 0.8,
            maxAngle: rest + 0.8,
            softRange: 0.3,
            enabled: true,
            ...updates,
          };
        }
      }
    } else {
      node.angularJoint = {
        ...node.angularJoint,
        ...updates,
      };
    }
  }

  /**
   * Fixe l'angle géométrique actuel du nœud comme nouvel angle de repos naturel (restAngle)
   */
  public sealNodeRestAngle(nodeId: string) {
    const node = this.getNodeById(nodeId);
    if (!node || !node.angularJoint) return;
    const joint = node.angularJoint;
    const nodeA = this.getNodeById(joint.nodeAId);
    const nodeC = this.getNodeById(joint.nodeCId);
    if (!nodeA || !nodeC) return;

    const current = AngularSpringMath.computeAngle(nodeA.position, node.position, nodeC.position);
    const halfRange = (joint.maxAngle !== undefined && joint.minAngle !== undefined)
      ? (joint.maxAngle - joint.minAngle) * 0.5
      : 0.9;

    joint.restAngle = current;
    joint.minAngle = current - halfRange;
    joint.maxAngle = current + halfRange;
  }

  public updateNodeColor(nodeId: string, color: string, applyToLinks = true) {
    const node = this.getNodeById(nodeId);
    if (!node) return;
    node.color = color;
    node.fillColor = color;
    if (applyToLinks) {
      for (const link of this.links) {
        if (link.nodeAId === nodeId || link.nodeBId === nodeId) {
          link.color = color;
          link.fillColor = color;
        }
      }
    }
  }

  public updateNodeFillColor(nodeId: string, fillColor: string, applyToStroke = false) {
    const node = this.getNodeById(nodeId);
    if (!node) return;
    node.fillColor = fillColor;
    node.color = fillColor;
    if (node.strokeId && applyToStroke) {
      for (const n of this.nodes) {
        if (n.strokeId === node.strokeId) {
          n.fillColor = fillColor;
          n.color = fillColor;
        }
      }
    }
    for (const link of this.links) {
      if (link.nodeAId === nodeId || link.nodeBId === nodeId) {
        link.color = fillColor;
        link.fillColor = fillColor;
      }
    }
  }

  public updateNodeStrokeColor(nodeId: string, strokeColor: string, applyToStroke = false) {
    const node = this.getNodeById(nodeId);
    if (!node) return;
    node.strokeColor = strokeColor;
    if (node.strokeId && applyToStroke) {
      for (const n of this.nodes) {
        if (n.strokeId === node.strokeId) {
          n.strokeColor = strokeColor;
        }
      }
    }
    for (const link of this.links) {
      if (link.nodeAId === nodeId || link.nodeBId === nodeId) {
        link.strokeColor = strokeColor;
      }
    }
  }

  public updateNodeStrokeWidth(nodeId: string, strokeWidth: number) {
    const node = this.getNodeById(nodeId);
    if (!node) return;
    node.strokeWidth = Math.max(0, Math.min(24, strokeWidth));
  }

  public updateNodeRadius(nodeId: string, radius: number) {
    const node = this.getNodeById(nodeId);
    if (node) {
      node.radius = Math.max(6, Math.min(60, radius));
    }
  }

  public toggleNodeEye(nodeId: string) {
    const node = this.getNodeById(nodeId);
    if (node) {
      node.hasEye = !node.hasEye;
    }
  }

  /**
   * Définit le calque d'un nœud et propage aux liens connexes
   */
  public setNodeLayer(nodeId: string, layer: LayerId) {
    const node = this.getNodeById(nodeId);
    if (!node) return;
    node.layer = layer;
    for (const link of this.links) {
      if (link.nodeAId === nodeId || link.nodeBId === nodeId) {
        link.layer = layer;
      }
    }
  }

  /**
   * Bascule le rendu metaball sur une liaison spécifique
   */
  public toggleLinkMetaball(linkId: string) {
    const link = this.links.find((l) => l.id === linkId);
    if (link) {
      link.renderMetaball = !link.renderMetaball;
      if (link.renderMetaball) {
        link.type = 'metaball';
      }
    }
  }

  /**
   * Applique un style d'allure procédurale au marcheur
   */
  public setGaitStyle(style: GaitStyle) {
    if (this.walker) {
      this.walker.applyGaitStyle(style);
    }
  }

  /**
   * Crée un trait physique continu (Polyligne / Cordon physique articulé)
   * Génère une chaîne de nœuds reliés par des ressorts structurels et des ressorts de courbure
   */
  public createPhysicsStroke(
    rawPoints: Vec2[],
    color = '#8b5cf6',
    thickness = 16,
    layer?: LayerId
  ): SimNode[] {
    if (rawPoints.length < 2) return [];

    const effectiveLayer = layer || this.settings.activeLayer || 'main';

    // 1. Échantillonnage régulier le long du tracé (espacement de ~26px)
    const targetSpacing = 28;
    const sampledPoints: Vec2[] = [rawPoints[0]];
    let accumulatedDist = 0;

    for (let i = 1; i < rawPoints.length; i++) {
      const prev = rawPoints[i - 1];
      const curr = rawPoints[i];
      const segDist = Vector2.distance(prev, curr);
      if (segDist < 0.001) continue;

      accumulatedDist += segDist;
      if (accumulatedDist >= targetSpacing) {
        sampledPoints.push(curr);
        accumulatedDist = 0;
      }
    }

    // Assure au moins 2 points et inclut le point final si non présent
    const lastRaw = rawPoints[rawPoints.length - 1];
    if (
      sampledPoints.length < 2 ||
      Vector2.distance(sampledPoints[sampledPoints.length - 1], lastRaw) > targetSpacing * 0.5
    ) {
      sampledPoints.push(lastRaw);
    }

    const strokeId = `stroke_${Date.now()}`;
    const strokeRadius = Math.max(6, Math.min(22, thickness * 0.5));
    const strokeNodes: SimNode[] = [];

    // 2. Vérifie la proximité du point de départ avec un nœud existant pour attachement automatique
    const firstPt = sampledPoints[0];
    let startNode = this.nodes.find(
      (n) => Vector2.distance(n.position, firstPt) < n.radius + 15
    );

    // Si pas de nœud existant, créer le premier nœud
    if (!startNode) {
      startNode = this.addNode(firstPt, {
        name: 'Origine Trait',
        radius: strokeRadius,
        mass: 0.8,
        color,
        layer: effectiveLayer,
        strokeId,
        strokeIndex: 0,
      });
    }
    strokeNodes.push(startNode);

    // 3. Créer les nœuds intermédiaires
    for (let i = 1; i < sampledPoints.length; i++) {
      const isLast = i === sampledPoints.length - 1;
      const pt = sampledPoints[i];

      let node: SimNode | undefined;
      if (isLast) {
        // Vérifie si le dernier point touche un autre nœud existant
        node = this.nodes.find(
          (n) => n.id !== startNode!.id && Vector2.distance(n.position, pt) < n.radius + 15
        );
      }

      if (!node) {
        node = this.addNode(pt, {
          name: `Segment ${i}`,
          radius: strokeRadius,
          mass: 0.6,
          color,
          layer: effectiveLayer,
          strokeId,
          strokeIndex: i,
        });
      }
      strokeNodes.push(node);
    }

    // 4. Lier consécutivement les nœuds du trait (Ressorts structurels)
    for (let i = 0; i < strokeNodes.length - 1; i++) {
      const nodeA = strokeNodes[i];
      const nodeB = strokeNodes[i + 1];
      const dist = Vector2.distance(nodeA.position, nodeB.position);

      this.connectNodes(nodeA.id, nodeB.id, {
        restLength: dist,
        stiffness: 280,
        damping: 18,
        width: strokeRadius * 2,
        color,
        layer: effectiveLayer,
        type: 'stroke_segment',
      });
    }

    // 5. Ressorts de courbure / flexion (connecte le nœud i au nœud i+2)
    // Permet d'éviter l'effondrement et donne une belle tenue de corde / colonne vertébrale
    for (let i = 0; i < strokeNodes.length - 2; i++) {
      const nodeA = strokeNodes[i];
      const nodeC = strokeNodes[i + 2];
      const dist = Vector2.distance(nodeA.position, nodeC.position);

      this.connectNodes(nodeA.id, nodeC.id, {
        restLength: dist,
        stiffness: 160,
        damping: 14,
        invisible: true, // Ressort invisible de soutien géométrique
        layer: effectiveLayer,
      });
    }

    this.saveSnapshot();
    return strokeNodes;
  }

  /**
   * Insère un nouveau point / nœud dans une spline / polyligne physique existante.
   * Découpe le segment après le nœud spécifié (ou avant si spécifié),
   * positionne le nouveau point au milieu géométrique et recalcule les ressorts consécutifs et de courbure.
   */
  public insertNodeInStroke(targetNodeId: string, positionOffset: 'after' | 'before' = 'after'): SimNode | null {
    const targetNode = this.getNodeById(targetNodeId);
    if (!targetNode) return null;

    // Cas 1 : Le nœud fait partie d'une polyligne / trait strokeId
    if (targetNode.strokeId) {
      const strokeId = targetNode.strokeId;
      const strokeNodes = this.nodes
        .filter((n) => n.strokeId === strokeId)
        .sort((a, b) => (a.strokeIndex ?? 0) - (b.strokeIndex ?? 0));

      const idx = strokeNodes.findIndex((n) => n.id === targetNodeId);
      if (idx === -1) return null;

      let newPos: Vec2;
      let newIndex: number;

      if (positionOffset === 'after') {
        if (idx < strokeNodes.length - 1) {
          const nextNode = strokeNodes[idx + 1];
          newPos = {
            x: (targetNode.position.x + nextNode.position.x) * 0.5,
            y: (targetNode.position.y + nextNode.position.y) * 0.5,
          };
          newIndex = (targetNode.strokeIndex ?? idx) + 0.5;
        } else {
          // Extension en fin de spline dans la direction du dernier segment
          const prev = strokeNodes.length > 1 ? strokeNodes[strokeNodes.length - 2] : null;
          const dirX = prev ? targetNode.position.x - prev.position.x : 40;
          const dirY = prev ? targetNode.position.y - prev.position.y : 0;
          const len = Math.max(20, Math.hypot(dirX, dirY));
          newPos = {
            x: targetNode.position.x + (dirX / len) * 40,
            y: targetNode.position.y + (dirY / len) * 40,
          };
          newIndex = (targetNode.strokeIndex ?? idx) + 1;
        }
      } else {
        if (idx > 0) {
          const prevNode = strokeNodes[idx - 1];
          newPos = {
            x: (targetNode.position.x + prevNode.position.x) * 0.5,
            y: (targetNode.position.y + prevNode.position.y) * 0.5,
          };
          newIndex = (targetNode.strokeIndex ?? idx) - 0.5;
        } else {
          // Extension au début
          const next = strokeNodes.length > 1 ? strokeNodes[1] : null;
          const dirX = next ? targetNode.position.x - next.position.x : -40;
          const dirY = next ? targetNode.position.y - next.position.y : 0;
          const len = Math.max(20, Math.hypot(dirX, dirY));
          newPos = {
            x: targetNode.position.x + (dirX / len) * 40,
            y: targetNode.position.y + (dirY / len) * 40,
          };
          newIndex = (targetNode.strokeIndex ?? 0) - 1;
        }
      }

      const newNode = this.addNode(newPos, {
        name: `Point Spline ${this.nextNodeIndex}`,
        radius: targetNode.radius,
        mass: targetNode.mass,
        color: targetNode.color,
        fillColor: targetNode.fillColor,
        strokeColor: targetNode.strokeColor,
        layer: targetNode.layer,
        strokeId,
        strokeIndex: newIndex,
      });

      // Recalcule et reconstruit proprement les liaisons de la spline
      this.rebuildStrokeLinks(strokeId);
      this.saveSnapshot();
      return newNode;
    }

    // Cas 2 : Le nœud est relié par des liens classiques (ex: chaîne simple ou polygone)
    const connectedLinks = this.links.filter(
      (l) => l.nodeAId === targetNodeId || l.nodeBId === targetNodeId
    );

    if (connectedLinks.length > 0) {
      const firstLink = connectedLinks[0];
      const otherId = firstLink.nodeAId === targetNodeId ? firstLink.nodeBId : firstLink.nodeAId;
      const otherNode = this.getNodeById(otherId);

      if (otherNode) {
        const midPos = {
          x: (targetNode.position.x + otherNode.position.x) * 0.5,
          y: (targetNode.position.y + otherNode.position.y) * 0.5,
        };

        const newNode = this.addNode(midPos, {
          name: `Point ${this.nextNodeIndex}`,
          radius: targetNode.radius,
          mass: targetNode.mass,
          color: targetNode.color,
          fillColor: targetNode.fillColor,
          strokeColor: targetNode.strokeColor,
          layer: targetNode.layer,
        });

        // Supprime l'ancien lien direct et insère le nœud entre les deux
        this.links = this.links.filter((l) => l.id !== firstLink.id);
        const distA = Vector2.distance(targetNode.position, midPos);
        const distB = Vector2.distance(midPos, otherNode.position);

        this.connectNodes(targetNode.id, newNode.id, {
          restLength: distA,
          stiffness: firstLink.stiffness,
          damping: firstLink.damping,
          width: firstLink.width,
          color: firstLink.color,
          layer: firstLink.layer,
        });

        this.connectNodes(newNode.id, otherNode.id, {
          restLength: distB,
          stiffness: firstLink.stiffness,
          damping: firstLink.damping,
          width: firstLink.width,
          color: firstLink.color,
          layer: firstLink.layer,
        });

        this.saveSnapshot();
        return newNode;
      }
    }

    // Cas par défaut : ajout d'un point à côté relié
    const newNode = this.addNode(
      { x: targetNode.position.x + 40, y: targetNode.position.y },
      {
        name: `Point ${this.nextNodeIndex}`,
        radius: targetNode.radius,
        mass: targetNode.mass,
        color: targetNode.color,
        fillColor: targetNode.fillColor,
        strokeColor: targetNode.strokeColor,
        layer: targetNode.layer,
      }
    );
    this.connectNodes(targetNode.id, newNode.id, {
      restLength: 40,
      stiffness: 220,
      damping: 14,
      width: targetNode.radius * 1.5,
      color: targetNode.color,
    });
    this.saveSnapshot();
    return newNode;
  }

  /**
   * Supprime un nœud de spline tout en recousant automatiquement les nœuds adjacents
   * pour éviter de rompre le tracé ou de perdre la continuité de la chaîne.
   */
  public deleteSplineNodeAndSew(nodeId: string): boolean {
    const node = this.getNodeById(nodeId);
    if (!node) return false;

    // Si le nœud fait partie d'un stroke
    if (node.strokeId) {
      const strokeId = node.strokeId;
      const strokeNodes = this.nodes
        .filter((n) => n.strokeId === strokeId)
        .sort((a, b) => (a.strokeIndex ?? 0) - (b.strokeIndex ?? 0));

      if (strokeNodes.length <= 2) {
        // S'il ne reste que 2 nœuds, suppression normale
        this.deleteNode(nodeId);
        return true;
      }

      const idx = strokeNodes.findIndex((n) => n.id === nodeId);
      // Supprimer le nœud
      this.nodes = this.nodes.filter((n) => n.id !== nodeId);
      this.links = this.links.filter(
        (l) => l.nodeAId !== nodeId && l.nodeBId !== nodeId
      );

      // Recalcule et reconstruit la spline
      this.rebuildStrokeLinks(strokeId);
      this.saveSnapshot();
      return true;
    }

    // Si le nœud est connecté à exactement 2 voisins (ex: une chaîne ou polygone de ressorts)
    const connectedLinks = this.links.filter(
      (l) => l.nodeAId === nodeId || l.nodeBId === nodeId
    );

    if (connectedLinks.length === 2) {
      const neighborAId =
        connectedLinks[0].nodeAId === nodeId
          ? connectedLinks[0].nodeBId
          : connectedLinks[0].nodeAId;
      const neighborBId =
        connectedLinks[1].nodeAId === nodeId
          ? connectedLinks[1].nodeBId
          : connectedLinks[1].nodeAId;

      const neighborA = this.getNodeById(neighborAId);
      const neighborB = this.getNodeById(neighborBId);

      this.deleteNode(nodeId);

      if (neighborA && neighborB && neighborAId !== neighborBId) {
        const dist = Vector2.distance(neighborA.position, neighborB.position);
        this.connectNodes(neighborAId, neighborBId, {
          restLength: dist,
          stiffness: (connectedLinks[0].stiffness + connectedLinks[1].stiffness) * 0.5,
          damping: (connectedLinks[0].damping + connectedLinks[1].damping) * 0.5,
          width: connectedLinks[0].width,
          color: connectedLinks[0].color,
          layer: connectedLinks[0].layer,
        });
      }
      return true;
    }

    // Cas standard
    this.deleteNode(nodeId);
    return true;
  }

  /**
   * Reconstruit la continuité des liens d'une spline / trait physique (ressorts structurels + ressorts de flexion)
   */
  private rebuildStrokeLinks(strokeId: string) {
    const strokeNodes = this.nodes
      .filter((n) => n.strokeId === strokeId)
      .sort((a, b) => (a.strokeIndex ?? 0) - (b.strokeIndex ?? 0));

    // Réassigner des index séquentiels propres
    strokeNodes.forEach((n, idx) => {
      n.strokeIndex = idx;
    });

    const strokeNodeIds = new Set(strokeNodes.map((n) => n.id));

    // Supprimer tous les liens internes existants de ce stroke
    this.links = this.links.filter(
      (l) => !(strokeNodeIds.has(l.nodeAId) && strokeNodeIds.has(l.nodeBId))
    );

    if (strokeNodes.length < 2) return;

    const baseColor = strokeNodes[0].color || '#8b5cf6';
    const strokeRadius = strokeNodes[0].radius || 12;
    const effectiveLayer = strokeNodes[0].layer || 'main';

    // 1. Ressorts structurels consécutifs
    for (let i = 0; i < strokeNodes.length - 1; i++) {
      const nodeA = strokeNodes[i];
      const nodeB = strokeNodes[i + 1];
      const dist = Vector2.distance(nodeA.position, nodeB.position);

      this.connectNodes(nodeA.id, nodeB.id, {
        restLength: dist,
        stiffness: 280,
        damping: 18,
        width: strokeRadius * 2,
        color: baseColor,
        layer: effectiveLayer,
        type: 'stroke_segment',
      });
    }

    // 2. Ressorts de courbure / flexion (i -> i+2)
    for (let i = 0; i < strokeNodes.length - 2; i++) {
      const nodeA = strokeNodes[i];
      const nodeC = strokeNodes[i + 2];
      const dist = Vector2.distance(nodeA.position, nodeC.position);

      this.connectNodes(nodeA.id, nodeC.id, {
        restLength: dist,
        stiffness: 160,
        damping: 14,
        invisible: true,
        layer: effectiveLayer,
      });
    }
  }
}


