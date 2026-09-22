# CHANGELOG

## [Version 1.2.0] - 2026-09-22
### Ajouté
- **Choix d'architecture Option C enregistré :** Intégration unifiée physique Verlet + morphing géométrique analytique + ordonnancement par calques.
- **Fusion Metaballs (Morphing Organique) :** Algorithme vectoriel dans `MetaballMath.ts` calculant les tangentes externes et les arcs Bézier entre cercles de diamètres variables.
- **Outil Trait / Polyligne Physique (`draw_stroke`) :** Création de cordons souples avec ressorts de flexion angulaires et rendu spline doux.
- **Système de Calques (Layers) :** Tri par profondeur (`back`, `main`, `front`) pour les nœuds et les liaisons, avec sélecteur dans la barre d'outils et l'inspecteur.
- **Styles de Démarche Procédurale (Gait Styles) :** 6 allures paramétrables inspirées d'Eran Hill et Iorama Studio (`Standard`, `Strut`, `Sneak`, `Bouncy`, `Waddle`, `Zombie`).
- **Documentation complète :** Création du dossier `/docs` avec `DECISIONS.md`, `ARCHITECTURE.md`, `PROJECT_STATE.md`, `VISION.md`, `ROADMAP.md`, `TODO.md` et `CHANGELOG.md`.
