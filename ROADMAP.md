# ROADMAP.md — Physics Character Playground

## Status Legend
- [x] DONE
- [~] IN PROGRESS
- [ ] TODO
- [!] BLOCKED
- [>] DEFERRED

---

## Phases

### Phase 0 — Discovery [x]
- [x] Inspection du workspace existant
- [x] Analyse conceptuelle du projet `keijiro/CharacterRigTest`
- [x] Définition de l'architecture, du stack et du pipeline mathématique
- [x] Clarification des choix de ressenti (Feel gélatineux vs ferme, ressort d'accroche invisible, vue profil avec gravité)

### Phase 1 — Simulation Core & Damped Spring [x]
- [x] Modèle mathématique Vector2 et Damped Spring stable (Euler semi-implicite avec bornage d'énergie)
- [x] SimulationWorld avec pas de temps fixe (fixed dt = 1/60s) et gestion de sous-étapes (substeps)
- [x] Gestion de la gravité et plan de sol avec friction
- [x] Interaction tactile souris par ressort élastique invisible
- [x] Validation du comportement de ressort amorti sur le rig test à 3 nœuds (validé par le directeur créatif)

### Phase 2 — Interaction, Direct Editing & Secondary Motion [x]
- [x] Création directe de nœuds par clic sur le canevas
- [x] Connexion intuitive entre nœuds (création de liens élastiques)
- [x] Épinglage / Dé-épinglage de nœud (Pin / Unpin pour tests de suspensions ou pendules)
- [x] Comportement de Secondary Motion (Jiggle inertiel / réaction aux accélérations)
- [x] Comportement Follow Mouse (un nœud traque activement le curseur)

### Phase 4 & 5 — Rig Générique & Locomotion Procédurale [x]
- [x] Système de Foot Targets avec seuil de foulée (Stride Threshold)
- [x] Trajectoire balistique d'élévation du pas (Arc sinusoïdal / smoothstep)
- [x] Alternance stricte des appuis (Gait phase coordination par groupes d'appuis)
- [x] Contrôle de déplacement au clavier (A/D ou Flèches gauche/droite, W/Haut pour impulsion) et boutons tactiles
- [x] Presets de locomotion : Bipède procédural (2 jambes) et Quadrupède (4 jambes en trot diagonal)
- [x] Support générique N membres arbitraires
- [x] Visualisation overlay debug des cibles de pas et trajectoires balistiques

### Phase 6 — Visual System [x]
- [x] Primitives graphiques avancées (capsules organiques à étranglement dynamique sous tension)
- [x] Déformation squash & stretch sur impact au sol et vitesse
- [x] Regard expressif vivant (clignements spontanés, dilatation des pupilles selon vélocité)
- [x] Ombres de contact au sol avec occlusion douce
- [x] Mode de bascule d'habillage (Skin Mode : Organique vs Minimaliste)
- [x] Preset corps souple « Blob Mou » (Jelly Blob)

### Phase 7 — Persistance & Sérialisation [x]
- [x] Schéma JSON normalisé pour rigs, liaisons et configurations de marcheur
- [x] Export de créatures en fichier `.json`
- [x] Import via sélecteur de fichier et glisser-déposer (Drag & Drop) sur le canevas
- [x] Préservation des métadonnées, paramètres physiques et comportements

### Phase 8 — Galerie & Créativité [ ]
- [ ] Bibliothèque de créatures procédurales et presets étendus
- [ ] Partage et duplication de créatures customisées
