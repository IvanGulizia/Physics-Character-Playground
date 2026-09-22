/**
 * Vector Geometry & Metaballs Rendering
 * Algorithmes géométriques pour le rendu exact flat et les metaballs 2D
 */

import { Vec2 } from '../types';

export interface MetaballPair {
  p1: Vec2;
  r1: number;
  p2: Vec2;
  r2: number;
}

/**
 * Calcule l'enveloppe tangente tangent-arc (Metaball 2D) entre deux cercles
 * Produit l'effet de fusion liquide/graphique propre aux univers d'animation type Eran Hilleli / Iorama Studio.
 */
export function computeMetaballConnection(
  c1: Vec2,
  r1: number,
  c2: Vec2,
  r2: number,
  handleLenRate = 2.4,
  maxDistanceMultiplier = 2.5
): Vec2[] | null {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);

  const maxDist = (r1 + r2) * maxDistanceMultiplier;
  if (d <= Math.abs(r1 - r2) || d >= maxDist || d === 0) {
    return null; // Pas de metaball si les cercles sont imbriqués ou trop éloignés
  }

  let u1: number, u2: number;
  if (d < r1 + r2) {
    u1 = Math.acos((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d));
    u2 = Math.acos((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d));
  } else {
    u1 = 0;
    u2 = 0;
  }

  const angleBetweenCenters = Math.atan2(dy, dx);
  const maxSpread = Math.PI / 2.5;

  const angle1 = angleBetweenCenters + u1 + (Math.PI / 2 - u1) * (1 - d / maxDist) * 0.8;
  const angle2 = angleBetweenCenters - u1 - (Math.PI / 2 - u1) * (1 - d / maxDist) * 0.8;
  const angle3 = angleBetweenCenters + Math.PI - u2 - (Math.PI / 2 - u2) * (1 - d / maxDist) * 0.8;
  const angle4 = angleBetweenCenters - Math.PI + u2 + (Math.PI / 2 - u2) * (1 - d / maxDist) * 0.8;

  const p1 = { x: c1.x + Math.cos(angle1) * r1, y: c1.y + Math.sin(angle1) * r1 };
  const p2 = { x: c1.x + Math.cos(angle2) * r1, y: c1.y + Math.sin(angle2) * r1 };
  const p3 = { x: c2.x + Math.cos(angle3) * r2, y: c2.y + Math.sin(angle3) * r2 };
  const p4 = { x: c2.x + Math.cos(angle4) * r2, y: c2.y + Math.sin(angle4) * r2 };

  // Poignées de Bézier pour la courbure de taille élastique
  const totalRadius = r1 + r2;
  const d2 = Math.min(1, d / totalRadius);
  const handleScale = Math.min(handleLenRate, (d / totalRadius) * 1.5);
  const h1 = r1 * handleScale * (1 - d2 * 0.2);
  const h2 = r2 * handleScale * (1 - d2 * 0.2);

  const c1Angle = angle1 - Math.PI / 2;
  const c2Angle = angle2 + Math.PI / 2;
  const c3Angle = angle3 + Math.PI / 2;
  const c4Angle = angle4 - Math.PI / 2;

  const h1p = { x: p1.x + Math.cos(c1Angle) * h1, y: p1.y + Math.sin(c1Angle) * h1 };
  const h2p = { x: p3.x + Math.cos(c3Angle) * h2, y: p3.y + Math.sin(c3Angle) * h2 };
  const h3p = { x: p4.x + Math.cos(c4Angle) * h2, y: p4.y + Math.sin(c4Angle) * h2 };
  const h4p = { x: p2.x + Math.cos(c2Angle) * h1, y: p2.y + Math.sin(c2Angle) * h1 };

  return [p1, h1p, h2p, p3, p4, h3p, h4p, p2];
}
