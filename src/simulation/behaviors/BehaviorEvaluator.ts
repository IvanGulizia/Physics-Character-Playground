/**
 * BehaviorEvaluator - Évalue les comportements dynamiques individuels des nœuds
 * (Jiggle / Secondary Motion, Follow Mouse, Oscillator)
 */
import { SimNode, Vec2 } from '../../types';
import { SimulationWorld } from '../core/SimulationWorld';
import { Vector2 } from '../math/Vector2';

export const BehaviorEvaluator = {
  evaluate(
    node: SimNode,
    world: SimulationWorld,
    dt: number,
    globalTime: number
  ) {
    if (!node.behavior || node.behavior.type === 'none' || node.isPinned) {
      return;
    }

    const { type, strength = 1, damping = 1, frequency = 2, amplitude = 120 } = node.behavior;

    switch (type) {
      case 'follow_mouse': {
        // Nœud attiré dynamiquement vers la souris (façon tentacule curieux ou tête suiveuse)
        const toMouse = Vector2.sub(world.mousePos, node.position);
        const dist = Vector2.length(toMouse);

        if (dist > 5) {
          const followK = 45 * strength;
          const followC = 8 * damping;
          const followForceX = toMouse.x * followK - node.velocity.x * followC;
          const followForceY = toMouse.y * followK - node.velocity.y * followC;

          node.acceleration.x += followForceX / node.mass;
          node.acceleration.y += followForceY / node.mass;
        }
        break;
      }

      case 'jiggle': {
        // Mouvement secondaire inertiel : réagit aux accélérations des nœuds voisins
        const neighborLinks = world.links.filter(
          (l) => l.nodeAId === node.id || l.nodeBId === node.id
        );

        for (const link of neighborLinks) {
          const neighborId = link.nodeAId === node.id ? link.nodeBId : link.nodeAId;
          const neighbor = world.getNodeById(neighborId);
          if (!neighbor) continue;

          // Force inertielle : opposée à l'accélération du parent
          const inertialFactor = 0.45 * strength;
          const inertialForceX = -neighbor.acceleration.x * node.mass * inertialFactor;
          const inertialForceY = -neighbor.acceleration.y * node.mass * inertialFactor;

          // Damping secondaire pour stabiliser
          const dampX = -node.velocity.x * 2.5 * damping;
          const dampY = -node.velocity.y * 2.5 * damping;

          node.acceleration.x += (inertialForceX + dampX) / node.mass;
          node.acceleration.y += (inertialForceY + dampY) / node.mass;
        }
        break;
      }

      case 'oscillator': {
        // Respiration / impulsion autonome périodique
        const phase = globalTime * frequency * Math.PI * 2;
        const wave = Math.sin(phase);
        const oscForceY = wave * amplitude * strength;

        node.acceleration.y += oscForceY / node.mass;
        break;
      }
    }
  },
};
