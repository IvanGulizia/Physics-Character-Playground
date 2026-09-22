/**
 * MetaballMath.ts - Calcul géométrique analytique 2D de metaballs vectoriels
 * Permet de morpher et fusionner deux cercles de rayons identiques ou différents
 * avec un col fluide, organique et lisse, sans artefacts de pixels ni surcoût de shader.
 */
import { Vec2 } from '../../types';
import { Vector2 } from './Vector2';

export interface MetaballBridge {
  p1a: Vec2; // Point tangent supérieur sur cercle 1
  p1b: Vec2; // Point tangent inférieur sur cercle 1
  p2a: Vec2; // Point tangent supérieur sur cercle 2
  p2b: Vec2; // Point tangent inférieur sur cercle 2
  c1a: Vec2; // Point de contrôle Bézier pour la courbure supérieure
  c2a: Vec2;
  c1b: Vec2; // Point de contrôle Bézier pour la courbure inférieure
  c2b: Vec2;
}

export const MetaballMath = {
  /**
   * Calcule le pont de fusion géométrique metaball entre deux cercles
   * @param center1 Centre du premier cercle
   * @param radius1 Rayon du premier cercle
   * @param center2 Centre du second cercle
   * @param radius2 Rayon du second cercle
   * @param v Facteur d'étirement / portée maximale (default 2.4)
   * @param handleRate Facteur de courbure des tangentes (default 2.2)
   */
  getBridge(
    center1: Vec2,
    radius1: number,
    center2: Vec2,
    radius2: number,
    v = 2.4,
    handleRate = 2.2
  ): MetaballBridge | null {
    const d = Vector2.distance(center1, center2);
    const maxDist = (radius1 + radius2) * v;

    // Si les cercles sont trop distants ou de rayon nul, rupture du pont
    if (radius1 <= 0 || radius2 <= 0 || d >= maxDist || d <= Math.abs(radius1 - radius2)) {
      return null;
    }

    // Angle entre les deux centres
    const angle1 = Math.atan2(center2.y - center1.y, center2.x - center1.x);

    // Calcul de l'écartement des tangentes selon la distance
    let u1 = 0;
    let u2 = 0;
    if (d < radius1 + radius2) {
      // Les cercles se chevauchent déjà partiellement
      u1 = Math.acos((radius1 * radius1 + d * d - radius2 * radius2) / (2 * radius1 * d));
      u2 = Math.acos((radius2 * radius2 + d * d - radius1 * radius1) / (2 * radius2 * d));
    } else {
      // Les cercles sont séparés mais proches
      u1 = 0;
      u2 = 0;
    }

    // Angle d'ouverture des points de contact
    const spread = Math.acos(Math.max(-1, Math.min(1, (radius1 - radius2) / d)));
    const angleSpread = Math.PI / 2;

    const angleA = angle1 + u1 + (spread - u1) * 0.55;
    const angleB = angle1 - u1 - (spread - u1) * 0.55;
    const angleC = angle1 + Math.PI - u2 - (Math.PI - u2 - spread) * 0.55;
    const angleD = angle1 - Math.PI + u2 + (Math.PI - u2 - spread) * 0.55;

    // Points de contact sur cercle 1
    const p1a = {
      x: center1.x + Math.cos(angleA) * radius1,
      y: center1.y + Math.sin(angleA) * radius1,
    };
    const p1b = {
      x: center1.x + Math.cos(angleB) * radius1,
      y: center1.y + Math.sin(angleB) * radius1,
    };

    // Points de contact sur cercle 2
    const p2a = {
      x: center2.x + Math.cos(angleC) * radius2,
      y: center2.y + Math.sin(angleC) * radius2,
    };
    const p2b = {
      x: center2.x + Math.cos(angleD) * radius2,
      y: center2.y + Math.sin(angleD) * radius2,
    };

    // Distance relative pour le pincement du col (waist)
    const totalRadius = radius1 + radius2;
    const dFactor = Math.min(1, d / totalRadius);

    // Poignées de contrôle pour la courbure de Bézier cubique
    const handleLen = Math.min(radius1, radius2) * handleRate * (1 - dFactor * 0.5);

    const c1a = {
      x: p1a.x + Math.cos(angleA - angleSpread) * handleLen,
      y: p1a.y + Math.sin(angleA - angleSpread) * handleLen,
    };
    const c2a = {
      x: p2a.x + Math.cos(angleC + angleSpread) * handleLen,
      y: p2a.y + Math.sin(angleC + angleSpread) * handleLen,
    };

    const c1b = {
      x: p1b.x + Math.cos(angleB + angleSpread) * handleLen,
      y: p1b.y + Math.sin(angleB + angleSpread) * handleLen,
    };
    const c2b = {
      x: p2b.x + Math.cos(angleD - angleSpread) * handleLen,
      y: p2b.y + Math.sin(angleD - angleSpread) * handleLen,
    };

    return {
      p1a,
      p1b,
      p2a,
      p2b,
      c1a,
      c2a,
      c1b,
      c2b,
    };
  },
};
