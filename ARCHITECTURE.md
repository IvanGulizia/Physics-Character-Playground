# ARCHITECTURE.md — Physics Character Playground

## Architecture Globale

```
+-------------------------------------------------------------+
|                        React 19 UI                          |
|         (Floating HUD, Feel Presets, Fine-tune Sliders)     |
+------------------------------+------------------------------+
                               | Dispatches events & updates
                               v
+-------------------------------------------------------------+
|                      SimulationWorld                        |
|  - Fixed Timestep Loop (60Hz / Substepping)                 |
|  - Gravity (0, g) & Ground Plane Constraint                 |
|  - Nodes (Pos, Vel, Accel, Mass, Radius)                    |
|  - Links (Rest Length, Stiffness, Damping)                  |
|  - Behaviors (DampedSpring, FollowMouse, SecondaryMotion)   |
|  - Interactive Mouse Grab Spring (Invisible soft link)      |
+------------------------------+------------------------------+
                               | Reads transforms
                               v
+-------------------------------------------------------------+
|                      CanvasRenderer                         |
|  - 2D Canvas rendering                                      |
|  - Organic body capsules & soft articulated segments        |
|  - Ground shadow & floor line                               |
|  - Debug overlay (bones, targets, grab spring, velocities)  |
+-------------------------------------------------------------+
```

## Modules et Responsabilités

1. **`src/simulation/math/`**
   - `Vector2.ts` : Fonctions vectorielles pures 2D.
   - `SpringMath.ts` : Modèle d'oscillateur harmonique amorti d'ordre 2 stable avec contrôle de fréquence angulaire $\omega$ et taux d'amortissement $\zeta$ (permettant de passer continûment de sous-amorti "gélatineux" à amorti critique "ferme").

2. **`src/simulation/core/`**
   - `SimulationWorld.ts` : Chef d'orchestre de la physique. Maintient l'état des nœuds, résout les liaisons, applique la gravité, les limites du sol et l'attachement à la souris.

3. **`src/rendering/`**
   - `CanvasRenderer.ts` : Traduit visuellement la structure du rig (nœuds, liens, volume organique, indicateurs d'orientation, ombres portées, visualiseur de contraintes).

4. **`src/rig/`**
   - `RigPresets.ts` : Rigs d'expérimentation (Créature test 3 nœuds, vers 5 nœuds, créature quadrupède primitive).

5. **`src/ui/`**
   - `ControlOverlay.tsx` : Interface minimale et tactile (boutons de transport Play/Pause, sélecteur de dynamique de mouvement, mode debug).
