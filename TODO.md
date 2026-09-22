# TODO.md — Tâches concrètes actuelles

## Phase 1 — Simulation Core & Test Rig 3 Nœuds [x]
- [x] Écrire `src/simulation/math/Vector2.ts`
- [x] Écrire `src/simulation/math/SpringMath.ts` (modèle amorti semi-implicite stable)
- [x] Définir les types dans `src/types.ts` (Node, Link, SimulationParams, Creature)
- [x] Développer `src/simulation/core/SimulationWorld.ts` (fixed timestep, gravité, sol, grab spring)
- [x] Développer `src/rendering/CanvasRenderer.ts` (dessin organique, liaisons élastiques, sol, ombres, debug)
- [x] Configurer le Rig Preset de test (Racine + Appendice élastique + Queue / 3 nœuds)
- [x] Développer l'interface HUD tactile `src/ui/ControlOverlay.tsx` (sélecteur Feel + transport Play/Pause + debug)
- [x] Intégrer dans `src/App.tsx` et valider compilation
- [x] Validation du ressenti par l'utilisateur

## Phase 2 — Direct Manipulation & Secondary Motion [x]
- [x] Moteur de comportements modulaires `BehaviorEvaluator` (jiggle, follow_mouse, oscillator)
- [x] Outils canevas : Interact, Add Node, Connect
- [x] Inspecteur contextuel de nœud (Pin, Behavior, Mass, Delete)
- [x] Preset Mobile Jiggle

## Phase 4 & 5 — Locomotion Procédurale [x]
- [x] Architecture `ProceduralWalker` (Foot targets, seuil de foulée, arcs balistiques)
- [x] Coordination d'allure (Gait alternation par groupe d'appuis)
- [x] Commandes de propulsion et saut (Clavier A/D/W/Flèches et boutons tactiles)
- [x] Presets Bipède 2 Pattes et Quadrupède 4 Pattes (trot diagonal)
- [x] Visualisation debug des cibles de pas et trajectoires

## Phase 6 — Visual System [x]
- [x] Primitives graphiques avancées (capsules sculptées avec waist variable selon tension)
- [x] Squash & stretch dynamique des nœuds lors des impacts sol et accélérations
- [x] Regard vivant et expressif (clignements périodiques avec globalTime, dilatation selon vitesse)
- [x] Ombres de contact au sol avec occlusion douce
- [x] Sélecteur de style de rendu (Organique vs Minimaliste)
- [x] Nouveau preset corps souple « Blob Mou » (Jelly Blob)

## Phase 7 — Persistance & Sérialisation [x]
- [x] Sérialisation normalisée de créature (nœuds, liaisons, walker, métadonnées)
- [x] Bouton d'export JSON avec téléchargement immédiat
- [x] Bouton d'import JSON avec sélecteur de fichier
- [x] Support glisser-déposer (Drag & Drop) de fichiers `.json` directement sur le canevas

## Phase 8 — Outils de Dessin Libre & Formes de Base [x]
- [x] Outil Dessin Libre (`draw_freehand` / Touche 4) avec génération de chaînes articulées
- [x] Outil Boîte / Rectangle (`shape_box` / Touche 5) avec contreventement diagonal
- [x] Outil Cercle / Blob (`shape_circle` / Touche 6) avec couronne élastique
- [x] Outil Capsule (`shape_capsule` / Touche 7) avec segment dense
- [x] Prévisualisation dynamique en temps réel du tracé
- [x] Bouton Skin Mode avec visibilité renforcée

## Phase 9 — Création From Scratch, Rôles Anatomiques & Ergonomie [x]
- [x] Bouton Toile Vierge (`clearWorld`) pour créer n'importe quoi de zéro
- [x] Auto-connexion magnétique aux structures existantes (< 45px)
- [x] Nuancier de couleurs personnalisé (8 teintes vibrantes pour le dessin et les parties du corps)
- [x] Assignation dynamique des rôles (Torse/Racine 👑, Patte/Pied 🦶, Regard vivant 👁️)
- [x] Rétroaction visuelle systématique sur tous les états d'interface activés (anneaux, surbrillances, badges)
- [x] Rehaussement du sol physique au-dessus de l'interface inférieure

## Prochaine étape : Phase 10 — Multi-Créatures & Partage [ ]
- [x] Export / Import JSON fonctionnel
- [ ] Support simultané de plusieurs créatures autonomes dans la même scène
- [ ] Galerie de créatures de la communauté pré-enregistrées

