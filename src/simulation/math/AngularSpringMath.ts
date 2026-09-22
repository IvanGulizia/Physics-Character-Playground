/**
 * AngularSpringMath.ts
 * Contrainte angulaire avec ressort de torsion (muscle), amortissement et plage élastique non-linéaire (soft-limits).
 * 
 * Permet à un membre ou une articulation (A - B - C) de maintenir activement
 * sa posture d'origine (restAngle) avec une force réglable, et d'opposer
 * une résistance élastique progressive à mesure qu'on approche des limites de flexion.
 */
import { Vec2 } from '../../types';
import { Vector2 } from './Vector2';

export interface AngularSpringConfig {
  id: string;
  nodeAId: string;       // Nœud parent (ex: Hanche ou épaule)
  nodeBId: string;       // Nœud pivot / articulation (ex: Genou ou coude)
  nodeCId: string;       // Nœud enfant / extrémité (ex: Pied ou main)
  restAngle: number;     // Angle de repos naturel en radians (entre BA et BC)
  stiffness: number;     // Force du muscle / ressort de torsion (ex: 150 - 2500)
  damping: number;       // Amortissement pour stabiliser (ex: 5 - 40)
  minAngle?: number;     // Angle minimum permis (radians)
  maxAngle?: number;     // Angle maximum permis (radians)
  softRange?: number;    // Plage d'élasticité progressive près des bornes (radians, ex: 0.3 rad ~ 17°)
  enabled?: boolean;
}

export const AngularSpringMath = {
  /**
   * Normalise un angle entre -PI et +PI
   */
  normalizeAngle(angle: number): number {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  },

  /**
   * Calcule l'angle orienté entre BA et BC (sommet en B)
   * Retourne une valeur dans ]-PI, PI]
   */
  computeAngle(posA: Vec2, posB: Vec2, posC: Vec2): number {
    const vBA = Vector2.sub(posA, posB);
    const vBC = Vector2.sub(posC, posB);

    const angleBA = Math.atan2(vBA.y, vBA.x);
    const angleBC = Math.atan2(vBC.y, vBC.x);

    return this.normalizeAngle(angleBC - angleBA);
  },

  /**
   * Calcule les forces de correction (sur A, B, C) pour un ressort angulaire
   * avec résistance progressive aux limites (soft-limits).
   */
  computeTorqueForces(
    posA: Vec2,
    posB: Vec2,
    posC: Vec2,
    velA: Vec2,
    velB: Vec2,
    velC: Vec2,
    massA: number,
    massB: number,
    massC: number,
    config: AngularSpringConfig
  ): { forceA: Vec2; forceB: Vec2; forceC: Vec2; currentAngle: number; torque: number } {
    const vBA = Vector2.sub(posA, posB);
    const vBC = Vector2.sub(posC, posB);

    const lenBA = Math.max(1, Vector2.length(vBA));
    const lenBC = Math.max(1, Vector2.length(vBC));

    const currentAngle = this.computeAngle(posA, posB, posC);

    // Écart par rapport à l'angle de repos
    const deltaRest = this.normalizeAngle(currentAngle - config.restAngle);

    // 1. Couple de rappel de base proportionnel à l'écart du repos (Loi de Hooke angulaire)
    let torque = -config.stiffness * deltaRest;

    // 2. Gestion de la plage angulaire et de la force progressive (Soft Limits)
    const softZone = config.softRange ?? 0.35; // ~20 degrés de zone progressive élastique
    const minLimit = config.minAngle;
    const maxLimit = config.maxAngle;

    if (minLimit !== undefined && currentAngle < minLimit + softZone) {
      // Approche ou dépassement de la borne minimale
      const penetration = (minLimit + softZone) - currentAngle;
      if (penetration > 0) {
        // Force de répulsion quadratique exponentielle à mesure qu'on s'approche de la butée
        const normalizedPen = penetration / softZone;
        const limitStiffness = config.stiffness * (1.5 + 4.0 * normalizedPen * normalizedPen);
        torque += limitStiffness * penetration;
      }
    }

    if (maxLimit !== undefined && currentAngle > maxLimit - softZone) {
      // Approche ou dépassement de la borne maximale
      const penetration = currentAngle - (maxLimit - softZone);
      if (penetration > 0) {
        const normalizedPen = penetration / softZone;
        const limitStiffness = config.stiffness * (1.5 + 4.0 * normalizedPen * normalizedPen);
        torque -= limitStiffness * penetration;
      }
    }

    // 3. Vitesse angulaire relative pour l'amortissement (Damping)
    // omega = (vBC_tangent / lenBC) - (vBA_tangent / lenBA)
    const uBA = { x: vBA.x / lenBA, y: vBA.y / lenBA };
    const uBC = { x: vBC.x / lenBC, y: vBC.y / lenBC };

    // Vecteurs perpendiculaires dans le sens trigonométrique
    const perpBA = { x: -uBA.y, y: uBA.x };
    const perpBC = { x: -uBC.y, y: uBC.x };

    const relVelBA = Vector2.sub(velA, velB);
    const relVelBC = Vector2.sub(velC, velB);

    const omegaBA = Vector2.dot(relVelBA, perpBA) / lenBA;
    const omegaBC = Vector2.dot(relVelBC, perpBC) / lenBC;
    const relOmega = omegaBC - omegaBA;

    // Amortissement du couple
    torque -= config.damping * relOmega * Math.min(lenBA, lenBC);

    // Borne de sécurité pour stabilité numérique
    const maxTorque = 40000;
    torque = Math.max(-maxTorque, Math.min(maxTorque, torque));

    // 4. Conversion du couple scalaire (torque) en forces perpendiculaires sur A et C
    // torque = F_tangent * bras_de_levier => F_tangent = torque / length
    const fMagA = -torque / lenBA;
    const fMagC = torque / lenBC;

    const forceA: Vec2 = {
      x: perpBA.x * fMagA,
      y: perpBA.y * fMagA,
    };

    const forceC: Vec2 = {
      x: perpBC.x * fMagC,
      y: perpBC.y * fMagC,
    };

    // La troisième loi de Newton : force sur le pivot B = - (forceA + forceC)
    const forceB: Vec2 = {
      x: -(forceA.x + forceC.x),
      y: -(forceA.y + forceC.y),
    };

    return { forceA, forceB, forceC, currentAngle, torque };
  },
};
