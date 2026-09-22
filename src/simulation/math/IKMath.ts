/**
 * IKMath.ts - Solveur de cinématique inverse 2D analytique (2 Segments)
 * Calcul ultrarapide sans approximations numériques :
 * Hanche (Root) -> Genou (Knee) -> Pied (Effector/Target)
 */
import { Vec2 } from '../../types';

export const IKMath = {
  /**
   * Résout la position du genou pour atteindre la cible avec des segments de longueurs fixes
   * @param root Position de l'attache supérieure (Hanche / Pelvis)
   * @param target Position de la cible inférieure (Pied / Target)
   * @param length1 Longueur du premier membre (Cuisse)
   * @param length2 Longueur du second membre (Mollet)
   * @param direction Orientation du pli du genou (+1 = avant/humain, -1 = arrière/oiseau)
   */
  solve2Bone(
    root: Vec2,
    target: Vec2,
    length1: number,
    length2: number,
    direction: 1 | -1 = 1
  ): Vec2 {
    const dx = target.x - root.x;
    const dy = target.y - root.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    // Si les points sont confondus ou trop proches
    if (dist < 0.001) {
      return {
        x: root.x + (direction > 0 ? length1 * 0.5 : -length1 * 0.5),
        y: root.y + length1 * 0.866,
      };
    }

    // Vecteur unitaire le long de la ligne Hanche -> Pied
    const ux = dx / dist;
    const uy = dy / dist;

    // Vecteur normal perpendiculaire
    const nx = -uy * direction;
    const ny = ux * direction;

    // Cas d'extension maximale (cible hors de portée)
    const maxReach = length1 + length2;
    if (dist >= maxReach) {
      return {
        x: root.x + ux * length1,
        y: root.y + uy * length1,
      };
    }

    // Cas de repli extrême
    const minReach = Math.abs(length1 - length2);
    if (dist <= minReach) {
      return {
        x: root.x + ux * length1,
        y: root.y + uy * length1,
      };
    }

    // Loi des cosinus pour la projection sur la ligne et l'élévation normale
    // L2^2 = L1^2 + D^2 - 2 * L1 * D * cos(alpha)
    // cos(alpha) = (L1^2 + D^2 - L2^2) / (2 * L1 * D)
    const cosAlpha = (length1 * length1 + distSq - length2 * length2) / (2 * length1 * dist);
    const clampedCos = Math.max(-1, Math.min(1, cosAlpha));
    const sinAlpha = Math.sqrt(1 - clampedCos * clampedCos);

    const dParallel = length1 * clampedCos;
    const dPerpendicular = length1 * sinAlpha;

    return {
      x: root.x + ux * dParallel + nx * dPerpendicular,
      y: root.y + uy * dParallel + ny * dPerpendicular,
    };
  },
};
