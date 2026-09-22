# ÉTAT ACTUEL DU PROJET (PROJECT_STATE)

## Fonctionnalités Complétées
- [x] **Fusion Metaballs (Morphing Organique) :** Algorithme géométrique de pont tangentiel entre disques de rayons variables avec courbure paramétrable.
- [x] **Polylignes & Traits Physiques (Spline Physics) :** Outil `draw_stroke` permettant de tracer des cordons continus dotés de ressorts de distance et de flexion angulaire.
- [x] **Gestion des Calques (Layers) :** Découpage en 3 plans de profondeur (`back`, `main`, `front`) pour ordonner visuellement les parties du corps, membres et accessoires.
- [x] **Démarches Procédurales Avancées (Gait Styles) :** 6 allures paramétrées (Standard, Strut façon Eran Hill, Sneak façon Iorama Studio, Bouncy, Waddle, Zombie) avec oscillations du bassin et interpolation dynamique.
- [x] **Détection Dédiée du Genou (IK Auto-Wiring) :** Bouton dans l'inspecteur pour désigner un nœud en tant que genou, avec détection automatique de la hanche parente et du pied enfant pour construire la chaîne cinématique.
- [x] **Musculature Angulaire & Maintien de Posture d'Origine :** Moteur de couple angulaire (`AngularSpringMath`) avec réglage direct de la raideur (stiffness), amortissement (damping), tolérance d'élasticité limite (soft limits) et bouton de scellement de la pose de repos.
- [x] **Feedback Visuel Canvas :** Arc de visée de l'angle de repos naturel et secteur de tolérance angulaire rendus en direct sur le canevas en mode debug/sélection.
- [x] **Option C Enregistrée :** Architecture unifiée physique + morphing analytique + calques validée et active.
