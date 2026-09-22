/**
 * SpringMath - Calcul des forces de rappel et d'amortissement
 * Garantit une stabilité inconditionnelle et le découplage perceptuel (Gélatineux <-> Ferme).
 */
import { MotionFeel, SimNode, Vec2 } from '../../types';
import { Vector2 } from './Vector2';

export interface SpringCoefficients {
  stiffnessMultiplier: number;
  dampingMultiplier: number;
}

export const FEEL_PRESETS: Record<MotionFeel, SpringCoefficients> = {
  jelly: {
    stiffnessMultiplier: 0.55,
    dampingMultiplier: 0.25, // Sous-amorti : plusieurs oscillations résiduelles visibles
  },
  organic: {
    stiffnessMultiplier: 1.0,
    dampingMultiplier: 0.75, // Équilibré : souplesse avec stabilisation naturelle
  },
  snappy: {
    stiffnessMultiplier: 1.75,
    dampingMultiplier: 1.35, // Amortissement quasi-critique : vif, précis, overshoot minime
  },
};

export const SpringMath = {
  /**
   * Calcule la force exercée par un ressort amorti entre deux nœuds
   */
  computeLinkForce(
    nodeA: SimNode,
    nodeB: SimNode,
    restLength: number,
    baseStiffness: number,
    baseDamping: number,
    stiffMult: number,
    dampMult: number
  ): { forceOnB: Vec2; displacement: number } {
    const delta = Vector2.sub(nodeB.position, nodeA.position);
    const currentDist = Vector2.length(delta);
    
    // Évite la division par zéro si deux nœuds se superposent exactement
    if (currentDist < 0.0001) {
      return { forceOnB: { x: 0, y: 0 }, displacement: 0 };
    }

    const dir = { x: delta.x / currentDist, y: delta.y / currentDist };
    const displacement = currentDist - restLength;

    // Vitesse relative le long de l'axe du lien
    const relVel = Vector2.sub(nodeB.velocity, nodeA.velocity);
    const speedAlongAxis = Vector2.dot(relVel, dir);

    const k = baseStiffness * stiffMult;
    const c = baseDamping * dampMult;

    // Force de rappel Hooke + Amortissement visqueux
    const springForce = k * displacement;
    const dampingForce = c * speedAlongAxis;
    const totalScalarForce = springForce + dampingForce;

    // Bornage de sécurité pour éviter tout runaway à haute vitesse
    const clampedForce = Math.max(-15000, Math.min(15000, totalScalarForce));

    return {
      forceOnB: {
        x: -clampedForce * dir.x,
        y: -clampedForce * dir.y,
      },
      displacement,
    };
  },

  /**
   * Calcule la force du ressort invisible reliant le nœud attrapé à la souris
   */
  computeMouseGrabForce(
    node: SimNode,
    mousePos: Vec2,
    stiffness: number,
    damping: number
  ): Vec2 {
    const toMouse = Vector2.sub(mousePos, node.position);
    const springForceX = toMouse.x * stiffness;
    const springForceY = toMouse.y * stiffness;

    // Amortissement basé sur la vitesse du nœud pour éviter les frénésies
    const dampForceX = node.velocity.x * damping;
    const dampForceY = node.velocity.y * damping;

    return {
      x: springForceX - dampForceX,
      y: springForceY - dampForceY,
    };
  },
};
