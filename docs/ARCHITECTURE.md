# ARCHITECTURE TECHNIQUE

## Vue d'ensemble du système

```
[ Canvas Interaction / UI React ]
              │
              ▼
    [ SimulationWorld ] (État maître de simulation)
      ├── Verlet Integrator (Pas fixe dt=1/60s)
      ├── Distance Constraints & Bending Springs
      ├── Procedural Walker (IK analytique 2 segments)
      └── History Manager (Undo / Redo 30 snapshots)
              │
              ▼
    [ CanvasRenderer ] (Pipeline Multi-Pass par Calques)
      ├── Passe 1 : Ombre projetée dynamique au sol
      ├── Passe 2 : Calque 'back' (Liaisons, Metaballs, Traits physiques, Nœuds)
      ├── Passe 3 : Calque 'main' (Corps, Squelette, Polygones, Traits)
      ├── Passe 4 : Calque 'front' (Membres avant, Tête, Yeux expressifs)
      ├── Passe 5 : Preview de tracé temps réel
      └── Passe 6 : Debug overlays (IK targets, pivots, vélocités)
```

## Modules Clés
1. `src/simulation/math/MetaballMath.ts` : Calcul analytique vectoriel des ponts de fusion entre cercles.
2. `src/simulation/ik/TwoBoneIK.ts` : Résolveur IK analytique avec contrôle de pliure du genou.
3. `src/simulation/locomotion/ProceduralWalker.ts` : Moteur de marche avec gestion des styles de démarche (Strut, Sneak, Bouncy, etc.).
4. `src/rendering/CanvasRenderer.ts` : Moteur de rendu canvas performant 60 FPS avec support des calques et des polylignes physiques.
5. `src/ui/ControlOverlay.tsx` : Interface modulaire déplaçable avec fenêtres contextuelles non-intrusives.
