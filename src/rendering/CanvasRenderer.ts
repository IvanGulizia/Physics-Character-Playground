/**
 * CanvasRenderer - Moteur de rendu 2D Canvas organique et découplé
 * Style visuel : tactile, épuré, vivant, "laboratoire expérimental"
 */
import { LayerId, SimLink, SimNode, SimulationSettings, Vec2 } from '../types';
import { ProceduralWalker } from '../simulation/behaviors/ProceduralWalker';
import { MetaballMath } from '../simulation/math/MetaballMath';

export interface DrawingPreview {
  tool: 'draw_freehand' | 'draw_stroke' | 'shape_box' | 'shape_circle' | 'shape_capsule';
  points: Vec2[];
  startPos?: Vec2;
  currentPos?: Vec2;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render(
    nodes: SimNode[],
    links: SimLink[],
    settings: SimulationSettings,
    mousePos: Vec2,
    grabbedNodeId: string | null,
    selectedNodeId: string | null,
    connectingFromNodeId: string | null,
    walker: ProceduralWalker | null,
    width: number,
    height: number,
    globalTime = 0,
    drawingPreview: DrawingPreview | null = null
  ) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    // 1. Fond et grille de laboratoire discrète
    this.drawBackground(width, height, settings.groundY);

    // 2. Ombres portées au sol (avec occlusion de contact)
    this.drawGroundShadows(nodes, settings.groundY);

    // 3. Rendu ordonné par Calques (Layers: back -> main -> front)
    // Assure une superposition stricte et professionnelle (membres arrière sous le corps, membres avant au-dessus)
    const layers: LayerId[] = ['back', 'main', 'front'];

    for (const layer of layers) {
      const layerLinks = links.filter((l) => (l.layer || 'main') === layer);
      const layerNodes = nodes.filter((n) => (n.layer || 'main') === layer);

      // Dessin des liaisons du calque (metaballs, capsules organiques ou squelette)
      this.drawLinks(
        nodes,
        layerLinks,
        settings.skinMode || 'organic',
        settings.showDebug,
        settings.metaballsEnabled
      );

      // Dessin des traits continus physiques (Physics Strokes) du calque
      this.drawPhysicsStrokes(layerNodes, layerLinks, layer, selectedNodeId);

      // Dessin des nœuds du calque
      this.drawNodes(
        layerNodes,
        mousePos,
        selectedNodeId,
        settings.showDebug,
        globalTime,
        settings.skinMode || 'organic',
        settings.groundY,
        walker
      );
    }

    // 4. Ligne de prévisualisation de connexion si l'outil connect est actif
    if (connectingFromNodeId) {
      const sourceNode = nodes.find((n) => n.id === connectingFromNodeId);
      if (sourceNode) {
        this.drawConnectingLine(sourceNode.position, mousePos);
      }
    }

    // 4b. Prévisualisation de dessin libre, trait physique ou forme géométrique
    if (drawingPreview) {
      this.drawDrawingPreview(drawingPreview);
    }

    // 5. Corde / Ressort virtuel de saisie sous la souris
    if (grabbedNodeId) {
      const grabbedNode = nodes.find((n) => n.id === grabbedNodeId);
      if (grabbedNode) {
        this.drawGrabTether(grabbedNode.position, mousePos, settings.showDebug);
      }
    }

    // 6. Overlays de debug si activé
    if (settings.showDebug) {
      this.drawDebugOverlay(nodes, settings, walker);
    }
  }

  private drawConnectingLine(fromPos: Vec2, toPos: Vec2) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(fromPos.x, fromPos.y);
    ctx.lineTo(toPos.x, toPos.y);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(toPos.x, toPos.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawDrawingPreview(preview: DrawingPreview) {
    const ctx = this.ctx;
    ctx.save();

    if (
      (preview.tool === 'draw_freehand' || preview.tool === 'draw_stroke') &&
      preview.points.length > 0
    ) {
      // Tracé de dessin libre ou trait physique articulé
      const isStroke = preview.tool === 'draw_stroke';
      ctx.strokeStyle = isStroke ? '#c084fc' : '#38bdf8';
      ctx.lineWidth = isStroke ? 12 : 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(isStroke ? [8, 6] : [4, 4]);

      ctx.beginPath();
      ctx.moveTo(preview.points[0].x, preview.points[0].y);
      for (let i = 1; i < preview.points.length; i++) {
        ctx.lineTo(preview.points[i].x, preview.points[i].y);
      }
      ctx.stroke();

      // Nœuds physiques potentiels échantillonnés
      ctx.fillStyle = isStroke ? 'rgba(192, 132, 252, 0.9)' : 'rgba(56, 189, 248, 0.7)';
      for (const pt of preview.points) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isStroke ? 6 : 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (preview.startPos && preview.currentPos) {
      const { startPos, currentPos } = preview;

      if (preview.tool === 'shape_box') {
        const minX = Math.min(startPos.x, currentPos.x);
        const maxX = Math.max(startPos.x, currentPos.x);
        const minY = Math.min(startPos.y, currentPos.y);
        const maxY = Math.max(startPos.y, currentPos.y);
        const w = maxX - minX;
        const h = maxY - minY;

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
        ctx.strokeRect(minX, minY, w, h);
        ctx.fillRect(minX, minY, w, h);

        // Sommets
        const corners = [
          { x: minX, y: minY },
          { x: minX + w, y: minY },
          { x: minX + w, y: minY + h },
          { x: minX, y: minY + h },
        ];
        ctx.fillStyle = '#c084fc';
        for (const c of corners) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (preview.tool === 'shape_circle') {
        const dx = currentPos.x - startPos.x;
        const dy = currentPos.y - startPos.y;
        const radius = Math.max(15, Math.hypot(dx, dy));

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.fillStyle = 'rgba(236, 72, 153, 0.12)';

        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();

        // Noyau central
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Échantillons circulaires (6 nœuds)
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const px = startPos.x + Math.cos(angle) * radius;
          const py = startPos.y + Math.sin(angle) * radius;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (preview.tool === 'shape_capsule') {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, 10, 0, Math.PI * 2);
        ctx.arc(currentPos.x, currentPos.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawBackground(width: number, height: number, groundY: number) {
    const ctx = this.ctx;

    // Dégradé de fond subtil et profond
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0f172a'); // Ardoise foncée
    bgGrad.addColorStop(1, '#020617'); // Noir bleuté profond
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Trame de repère légère (grille de travail de laboratoire)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Plan de sol (Ground)
    ctx.save();
    // Ligne lumineuse de contact
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)'; // Teinte indigo subtile
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // Zone sous le sol
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
    groundGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
    groundGrad.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.restore();
  }

  private drawGroundShadows(nodes: SimNode[], groundY: number) {
    const ctx = this.ctx;
    ctx.save();
    for (const node of nodes) {
      const heightAboveGround = groundY - (node.position.y + node.radius);
      // Dessine l'ombre si le nœud est proche du sol (< 260px)
      if (heightAboveGround < 260) {
        const factor = Math.max(0, 1 - heightAboveGround / 260);
        // 1. Pénombre douce large
        const shadowWidth = node.radius * (1.6 - factor * 0.3);
        const shadowHeight = node.radius * (0.35 - factor * 0.1);
        const alpha = 0.35 * factor;

        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(node.position.x, groundY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Occlusion de contact sombre juste au point de contact si très proche (< 20px)
        if (heightAboveGround < 20) {
          const contactFactor = 1 - Math.max(0, heightAboveGround) / 20;
          ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * contactFactor})`;
          ctx.beginPath();
          ctx.ellipse(
            node.position.x,
            groundY,
            node.radius * 0.9,
            Math.max(2, node.radius * 0.15),
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  private drawLinks(
    nodes: SimNode[],
    links: SimLink[],
    skinMode: 'organic' | 'minimal',
    showDebug: boolean,
    metaballsEnabled = true
  ) {
    const ctx = this.ctx;
    const nodeMap = new Map<string, SimNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    for (const link of links) {
      if (link.invisible && !showDebug) {
        continue; // Liaison invisible (joint / pivot physique sans trait imposé)
      }

      // Si le lien est un segment de trait continu, il est dessiné de manière unifiée par drawPhysicsStrokes
      if (link.type === 'stroke_segment' && !showDebug) {
        continue;
      }

      const a = nodeMap.get(link.nodeAId);
      const b = nodeMap.get(link.nodeBId);
      if (!a || !b) continue;

      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const stretchRatio = currentDist / Math.max(1, link.restLength);

      if (link.invisible && showDebug) {
        // En mode debug, afficher le lien invisible avec un pointillé discret
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(a.position.x, a.position.y);
        ctx.lineTo(b.position.x, b.position.y);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      // 1. Fusion Metaball : morphing géométrique fluide entre deux nœuds circulaires
      let metaballRendered = false;
      const canMetaball =
        (link.type === 'metaball' || link.renderMetaball || (metaballsEnabled && skinMode === 'organic')) &&
        !a.customPolygon &&
        !b.customPolygon;

      if (canMetaball) {
        metaballRendered = this.drawMetaballBridge(a, b, link);
      }

      if (!metaballRendered) {
        if (skinMode === 'organic') {
          this.drawOrganicCapsule(a, b, link, stretchRatio);
        } else {
          this.drawMinimalLink(a, b, link, stretchRatio);
        }
      }

      // Ligne de debug de longueur de repos
      if (showDebug) {
        ctx.save();
        ctx.strokeStyle = stretchRatio > 1.08 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(a.position.x, a.position.y);
        ctx.lineTo(b.position.x, b.position.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /**
   * Rendu vectoriel du col de fusion fluide Metaball entre 2 disques
   */
  private drawMetaballBridge(a: SimNode, b: SimNode, link: SimLink): boolean {
    const bridge = MetaballMath.getBridge(a.position, a.radius, b.position, b.radius, 2.4, 2.2);
    if (!bridge) return false;

    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bridge.p1a.x, bridge.p1a.y);
    ctx.bezierCurveTo(
      bridge.c1a.x,
      bridge.c1a.y,
      bridge.c2a.x,
      bridge.c2a.y,
      bridge.p2a.x,
      bridge.p2a.y
    );
    ctx.lineTo(bridge.p2b.x, bridge.p2b.y);
    ctx.bezierCurveTo(
      bridge.c2b.x,
      bridge.c2b.y,
      bridge.c1b.x,
      bridge.c1b.y,
      bridge.p1b.x,
      bridge.p1b.y
    );
    ctx.closePath();

    const col = link.color || a.color || '#6366f1';
    ctx.fillStyle = col;
    ctx.fill();

    // Liseré doux et fin
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
    return true;
  }

  /**
   * Rendu continu des polylignes / traits physiques (Physics Strokes)
   * Évalue les nœuds consécutifs sous forme de spline fluide avec épaisseur et reflet
   */
  private drawPhysicsStrokes(
    nodes: SimNode[],
    links: SimLink[],
    layer: LayerId,
    selectedNodeId: string | null
  ) {
    const ctx = this.ctx;
    const strokeGroups = new Map<string, SimNode[]>();

    for (const node of nodes) {
      if (node.strokeId) {
        if (!strokeGroups.has(node.strokeId)) {
          strokeGroups.set(node.strokeId, []);
        }
        strokeGroups.get(node.strokeId)!.push(node);
      }
    }

    for (const [strokeId, strokeNodes] of strokeGroups.entries()) {
      if (strokeNodes.length < 2) continue;
      // Tri des nœuds selon leur index le long du tracé
      strokeNodes.sort((a, b) => (a.strokeIndex ?? 0) - (b.strokeIndex ?? 0));

      const isAnySelected = strokeNodes.some((n) => n.id === selectedNodeId);
      const baseColor = strokeNodes[0].fillColor || strokeNodes[0].color || '#8b5cf6';
      const strokeColor = strokeNodes[0].strokeColor || 'rgba(255, 255, 255, 0.25)';
      const strokeRadius = strokeNodes[0].radius || 12;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(strokeNodes[0].position.x, strokeNodes[0].position.y);

      for (let i = 0; i < strokeNodes.length - 1; i++) {
        const p0 = strokeNodes[i].position;
        const p1 = strokeNodes[i + 1].position;
        const midX = (p0.x + p1.x) * 0.5;
        const midY = (p0.y + p1.y) * 0.5;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      const lastNode = strokeNodes[strokeNodes.length - 1];
      ctx.lineTo(lastNode.position.x, lastNode.position.y);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Trait principal plein (Flat)
      ctx.lineWidth = strokeRadius * 2;
      ctx.strokeStyle = baseColor;
      ctx.stroke();

      // Contour externe net si strokeColor défini
      if (strokeNodes[0].strokeWidth !== undefined && strokeNodes[0].strokeWidth > 0) {
        ctx.lineWidth = strokeRadius * 2 + strokeNodes[0].strokeWidth * 2;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
      }

      // Si un des nœuds du trait est sélectionné, halo de contour
      if (isAnySelected) {
        ctx.lineWidth = strokeRadius * 2 + 8;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.setLineDash([6, 6]);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawOrganicCapsule(a: SimNode, b: SimNode, link: SimLink, stretchRatio: number) {
    const ctx = this.ctx;
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;

    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    const baseRadius = (link.width || 14) * 0.5;
    const rA = Math.max(baseRadius * 0.6, Math.min(a.radius * 0.8, baseRadius * 1.5));
    const rB = Math.max(baseRadius * 0.6, Math.min(b.radius * 0.8, baseRadius * 1.5));

    // Amincissement dynamique de la taille (waist) au centre sous tension
    const stretchClamped = Math.max(0.6, Math.min(2.5, stretchRatio));
    const waistFactor = Math.max(0.35, 1 / Math.sqrt(stretchClamped));
    const midRadius = ((rA + rB) * 0.5) * waistFactor;

    const midX = (a.position.x + b.position.x) * 0.5;
    const midY = (a.position.y + b.position.y) * 0.5;

    const pA1 = { x: a.position.x + nx * rA, y: a.position.y + ny * rA };
    const pA2 = { x: a.position.x - nx * rA, y: a.position.y - ny * rA };
    const pB1 = { x: b.position.x + nx * rB, y: b.position.y + ny * rB };
    const pB2 = { x: b.position.x - nx * rB, y: b.position.y - ny * rB };

    const c1 = { x: midX + nx * midRadius, y: midY + ny * midRadius };
    const c2 = { x: midX - nx * midRadius, y: midY - ny * midRadius };

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pA1.x, pA1.y);
    ctx.quadraticCurveTo(c1.x, c1.y, pB1.x, pB1.y);
    ctx.arc(b.position.x, b.position.y, rB, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
    ctx.quadraticCurveTo(c2.x, c2.y, pA2.x, pA2.y);
    ctx.arc(a.position.x, a.position.y, rA, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
    ctx.closePath();

    // Rendu Flat propre sans dégradé volumétrique
    const col = link.fillColor || link.color || a.fillColor || a.color || '#6366f1';
    const strokeCol = link.strokeColor || a.strokeColor || 'rgba(255, 255, 255, 0.2)';
    ctx.fillStyle = col;
    ctx.fill();

    // Contour net flat
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = a.strokeWidth !== undefined ? a.strokeWidth : 1.5;
    if (ctx.lineWidth > 0) {
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawMinimalLink(a: SimNode, b: SimNode, link: SimLink, stretchRatio: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.position.x, a.position.y);
    ctx.lineTo(b.position.x, b.position.y);

    const baseWidth = link.width || 12;
    const dynamicWidth = Math.max(4, baseWidth / Math.sqrt(Math.max(0.5, stretchRatio)));
    ctx.lineWidth = dynamicWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = link.fillColor || link.color || a.fillColor || a.color || 'rgba(99, 102, 241, 0.9)';
    ctx.stroke();

    if (link.strokeColor || a.strokeColor) {
      ctx.strokeStyle = link.strokeColor || a.strokeColor || '#ffffff';
      ctx.lineWidth = Math.max(1, dynamicWidth * 0.15);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawNodes(
    nodes: SimNode[],
    mousePos: Vec2,
    selectedNodeId: string | null,
    showDebug: boolean,
    globalTime: number,
    skinMode: 'organic' | 'minimal',
    groundY: number,
    walker?: ProceduralWalker | null
  ) {
    const ctx = this.ctx;

    // Repérage des pieds, genoux et du torse
    const rootId = walker?.config.rootNodeId;
    const footIds = new Set(walker?.config.legs?.map((l) => l.footNodeId) || []);
    const kneeIds = new Set(
      walker?.config.legs?.filter((l) => !!l.kneeNodeId).map((l) => l.kneeNodeId!) || []
    );

    for (const node of nodes) {
      ctx.save();
      const { x, y } = node.position;
      const isSelected = node.id === selectedNodeId;
      const isRoot = node.id === rootId;
      const isFoot = footIds.has(node.id);
      const isKnee = kneeIds.has(node.id);

      // Calcul de squash éventuel au contact immédiat du sol
      let squashX = 1;
      let squashY = 1;
      if (skinMode === 'organic') {
        const bottom = y + node.radius;
        if (bottom >= groundY - 1) {
          const penetration = Math.max(0, bottom - groundY);
          const velSquash = Math.max(0, node.velocity.y * 0.0004);
          const factor = Math.min(0.25, penetration * 0.03 + velSquash);
          squashY = 1 - factor;
          squashX = 1 + factor * 1.2;
        }
      }

      // Halo de sélection
      if (isSelected) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y, (node.radius + 6) * squashX, (node.radius + 6) * squashY, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
      }

      // 1. Rendu du corps : polygone personnalisé dessiné ou disque doux
      if (node.customPolygon && node.customPolygon.length >= 3) {
        ctx.beginPath();
        const p0 = node.customPolygon[0];
        ctx.moveTo(x + p0.x * squashX, y + p0.y * squashY);
        for (let p = 1; p < node.customPolygon.length; p++) {
          const pt = node.customPolygon[p];
          ctx.lineTo(x + pt.x * squashX, y + pt.y * squashY);
        }
        ctx.closePath();

        const fillCol = node.fillColor || node.color || '#6366f1';
        const strokeCol = node.strokeColor || (node.isGrabbed ? '#38bdf8' : isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.4)');
        ctx.fillStyle = fillCol;
        ctx.fill();

        ctx.lineWidth = node.strokeWidth !== undefined ? node.strokeWidth : (node.isGrabbed ? 3 : isSelected ? 2.5 : 1.5);
        ctx.strokeStyle = strokeCol;
        if (ctx.lineWidth > 0) {
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.ellipse(x, y, node.radius * squashX, node.radius * squashY, 0, 0, Math.PI * 2);

        // Aplat de couleur pure (Flat look and feel)
        const fillCol = node.fillColor || node.color || '#6366f1';
        const strokeCol = node.strokeColor || (node.isGrabbed ? '#38bdf8' : isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.35)');
        ctx.fillStyle = fillCol;
        ctx.fill();

        // Contour net et défini
        ctx.lineWidth = node.strokeWidth !== undefined ? node.strokeWidth : (node.isGrabbed ? 3 : isSelected ? 2.5 : 1.8);
        ctx.strokeStyle = strokeCol;
        if (ctx.lineWidth > 0) {
          ctx.stroke();
        }
      }

      // 2. Yeux expressifs procéduraux avec clignement et réaction dynamique (style flat épuré)
      if (node.hasEye) {
        this.drawExpressiveEye(x, y, node.radius, mousePos, globalTime, node.velocity);
      }

      // 3. Badge visuel du Behavior assigné
      if (node.behavior && node.behavior.type !== 'none') {
        this.drawBehaviorBadge(x, y, node.radius, node.behavior.type);
      }

      ctx.restore();

      // Indicateur visuel si le nœud est verrouillé/ancré (Pinned)
      if (node.isPinned) {
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y - node.radius + 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Indicateur visuel si le nœud est Racine / Torse (👑)
      if (isRoot) {
        ctx.save();
        ctx.fillStyle = '#facc15'; // Jaune or
        ctx.beginPath();
        ctx.arc(x, y - node.radius - 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Indicateur visuel si le nœud est Pied marcheur (🦶)
      if (isFoot) {
        ctx.save();
        ctx.fillStyle = '#fb923c'; // Orange ambre
        ctx.beginPath();
        ctx.arc(x, y + node.radius + 6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Indicateur visuel si le nœud est Genou articulé IK (🦵)
      if (isKnee) {
        ctx.save();
        ctx.fillStyle = '#a855f7'; // Violet améthyste
        ctx.beginPath();
        ctx.arc(x + node.radius + 6, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Indicateur visuel d'articulation musculaire active (Muscle / Joint angulaire)
      if (node.angularJoint && node.angularJoint.enabled !== false) {
        const joint = node.angularJoint;
        const nodeA = nodes.find((n) => n.id === joint.nodeAId);
        const nodeC = nodes.find((n) => n.id === joint.nodeCId);

        if (nodeA && nodeC) {
          ctx.save();
          // Arc de maintien de posture d'origine et secteur angulaire
          const vBA = { x: nodeA.position.x - x, y: nodeA.position.y - y };
          const baseAngle = Math.atan2(vBA.y, vBA.x);
          const restAngle = baseAngle + joint.restAngle;
          const arcR = Math.max(12, node.radius + 8);

          // Ligne pointillée fine montrant la direction de repos idéale
          if (isSelected || showDebug) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(restAngle) * (arcR + 12), y + Math.sin(restAngle) * (arcR + 12));
            ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)'; // Rose muscle
            ctx.lineWidth = 1.5;
            ctx.setLineDash([2, 3]);
            ctx.stroke();

            // Plage angulaire autorisée (min à max)
            if (joint.minAngle !== undefined && joint.maxAngle !== undefined) {
              const startA = baseAngle + joint.minAngle;
              const endA = baseAngle + joint.maxAngle;
              ctx.beginPath();
              ctx.arc(x, y, arcR, startA, endA, false);
              ctx.strokeStyle = 'rgba(244, 114, 182, 0.4)';
              ctx.lineWidth = 3;
              ctx.setLineDash([]);
              ctx.stroke();
            }
          }

          // Badge discret de muscle sur l'articulation
          ctx.beginPath();
          ctx.arc(x, y - node.radius - 4, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ec4899';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();
        }
      }
    }
  }

  private drawBehaviorBadge(x: number, y: number, radius: number, type: string) {
    const ctx = this.ctx;
    ctx.save();
    const badgeX = x - radius * 0.7;
    const badgeY = y + radius * 0.7;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 6, 0, Math.PI * 2);

    if (type === 'jiggle') {
      ctx.fillStyle = '#ec4899'; // Rose vif
    } else if (type === 'follow_mouse') {
      ctx.fillStyle = '#06b6d4'; // Cyan
    } else if (type === 'oscillator') {
      ctx.fillStyle = '#8b5cf6'; // Violet
    } else {
      ctx.fillStyle = '#64748b';
    }

    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawExpressiveEye(
    x: number,
    y: number,
    radius: number,
    mousePos: Vec2,
    globalTime: number,
    velocity: Vec2
  ) {
    const ctx = this.ctx;
    const eyeRadius = radius * 0.33;
    const eyeOffsetX = radius * 0.22;
    const eyeOffsetY = -radius * 0.16;
    const eyeCenterX = x + eyeOffsetX;
    const eyeCenterY = y + eyeOffsetY;

    // Calcul du cycle de clignement périodique naturel (~toutes les 3.6s)
    const blinkPeriod = 3.6;
    const cycle = (globalTime + x * 0.005) % blinkPeriod;
    let eyeOpen = 1.0;
    if (cycle > 3.42) {
      const t = (cycle - 3.42) / 0.18;
      eyeOpen = 1.0 - Math.sin(t * Math.PI);
    }

    // Réaction de surprise / accélération aux mouvements vifs (vitesse > 350)
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > 350) {
      eyeOpen = 1.0; // Ne cligne pas pendant les chutes rapides ou bonds
    }

    ctx.save();

    // Si l'œil est presque fermé (clignement doux)
    if (eyeOpen < 0.22) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(eyeCenterX - eyeRadius * 0.85, eyeCenterY);
      ctx.quadraticCurveTo(eyeCenterX, eyeCenterY + eyeRadius * 0.3, eyeCenterX + eyeRadius * 0.85, eyeCenterY);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Fond blanc de la sclérotique
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(eyeCenterX, eyeCenterY, eyeRadius, Math.max(1, eyeRadius * eyeOpen), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Direction du regard vers la souris
    const toMouseX = mousePos.x - eyeCenterX;
    const toMouseY = mousePos.y - eyeCenterY;
    const distToMouse = Math.sqrt(toMouseX * toMouseX + toMouseY * toMouseY);
    const maxPupilOffset = eyeRadius * 0.45;
    const pupilDist = Math.min(maxPupilOffset, distToMouse * 0.05);
    const pupilX = distToMouse > 0 ? (toMouseX / distToMouse) * pupilDist : 0;
    const pupilY = distToMouse > 0 ? (toMouseY / distToMouse) * pupilDist : 0;

    // Dilatation pupillaire si vitesse élevée (expression excitée/surprise)
    const pupilScale = speed > 350 ? 1.25 : 1.0;
    const pupilRadius = eyeRadius * 0.45 * pupilScale;

    // Pupille
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(
      eyeCenterX + pupilX,
      eyeCenterY + pupilY * eyeOpen,
      Math.max(2, pupilRadius * eyeOpen),
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Reflet spéculaire de lumière vive (donne l'étincelle de vie !)
    if (eyeOpen > 0.6) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(
        eyeCenterX + pupilX - 1.8,
        eyeCenterY + pupilY * eyeOpen - 1.8,
        eyeRadius * 0.18,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  private drawGrabTether(nodePos: Vec2, mousePos: Vec2, showDebug: boolean) {
    const ctx = this.ctx;
    ctx.save();
    // Dessine le fil élastique sous la souris
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(nodePos.x, nodePos.y);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();

    // Petit indicateur de curseur élastique
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawDebugOverlay(
    nodes: SimNode[],
    settings: SimulationSettings,
    walker: ProceduralWalker | null
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

    for (const node of nodes) {
      // Vecteur vitesse
      const vx = node.velocity.x * 0.05;
      const vy = node.velocity.y * 0.05;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(node.position.x, node.position.y);
      ctx.lineTo(node.position.x + vx, node.position.y + vy);
      ctx.stroke();

      // Texte de nom ou vitesse
      ctx.fillText(
        `${node.name || node.id}`,
        node.position.x - 20,
        node.position.y + node.radius + 14
      );
    }

    // Affichage des Foot Targets du Walker procédural
    if (walker && walker.config.enabled) {
      for (const leg of walker.config.legs) {
        if (leg.currentTarget) {
          ctx.strokeStyle = leg.isStepping ? '#ec4899' : '#10b981';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);

          // Réticule sur la cible du pied
          ctx.beginPath();
          ctx.arc(leg.currentTarget.x, leg.currentTarget.y, 8, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = leg.isStepping ? '#ec4899' : '#10b981';
          ctx.fillText(
            `Target ${leg.id} (${leg.isStepping ? 'SWING' : 'STANCE'})`,
            leg.currentTarget.x - 30,
            leg.currentTarget.y - 12
          );
        }

        // Si en train de faire un pas, tracer l'arche balistique
        if (leg.isStepping && leg.stepFrom && leg.stepTo) {
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(leg.stepFrom.x, leg.stepFrom.y);
          const midX = (leg.stepFrom.x + leg.stepTo.x) / 2;
          const midY = (leg.stepFrom.y + leg.stepTo.y) / 2 - leg.stepHeight;
          ctx.quadraticCurveTo(midX, midY, leg.stepTo.x, leg.stepTo.y);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }
}
