# CHANGELOG.md — Historique des évolutions

## [Phase 9 - 2026-09-21] — Création from Scratch, Rôles Anatomiques, Palette Libre & Ergonomie
### Ajouté
- **Toile Vierge & Création From Scratch (`clearWorld`)** :
  - Bouton mis en valeur dans la barre supérieure pour repartir d'un monde vierge et concevoir n'importe quelle créature sans dépendre d'un preset.
- **Système d'Auto-Connexion Magnétique** :
  - Quand on dessine ou ajoute une nouvelle forme (dessin libre, boîte, cercle, capsule) à proximité d'un nœud existant (< 45px), des ressorts d'attache structurels sont créés automatiquement pour fusionner les membres en une créature unifiée.
- **Nuancier & Peinture de Créature Personnalisée** :
  - Choix de couleur direct dans la barre latérale pour dessiner avec n'importe quelle teinte (Cyan, Rose, Émeraude, Violet, Ambre, Chair/Pêche, Blanc, Ardoise).
  - Inspecteur de nœud enrichi avec application de couleur immédiate sur la partie sélectionnée.
- **Assignation Dynamique des Rôles Anatomiques (Rigging)** :
  - Bouton **👑 Torse / Racine** : assigne n'importe quel nœud comme centre de gravité du marcheur avec badge visuel couronne.
  - Bouton **🦶 Patte / Pied** : bascule n'importe quel nœud comme patte procédurale active (marche et foulée) avec badge visuel empreinte.
  - Bouton **👁️ Œil Expressif** : active ou désactive un regard vivant interactif sur n'importe quel nœud.
  - Curseur de rayon et taille de membre en temps réel (8px à 45px).
- **Rétroaction Visuelle Complète de l'Interface** :
  - Tous les boutons actifs (outils, presets, modes de peau, boutons de marche A/D, comportements) disposent désormais d'un indicateur de sélection contrasté (anneaux lumineux, fonds éclatants, badges).
- **Sol Élevé & Ergonomie de Navigation** :
  - Rehaussement du sol physique (`canvas.height - 250`) pour que les créatures évoluent bien au-dessus de la barre de contrôle inférieure sans masquer leurs pieds.

## [Phase 8 - 2026-09-21] — Outils de Dessin Libre & Formes de Base (Creature Painter)
### Ajouté
- **Visibilité renforcée du « Skin Mode »** :
  - Bouton avec étiquette explicite `Peau : Organique / Minimal` et dégradé contrasté dans la barre supérieure.
  - Raccourci dédié à la palette de peau dans la barre d'outils flottante.
- **Outil Dessin Libre (`draw_freehand` / Touche 4)** :
  - Permet de dessiner librement au pointeur sur le canevas ; génère une chaîne articulée élastique douce échantillonnée avec fermeture automatique si la boucle est fermée.
- **Formes de Base Procédurales** :
  - **Rectangle / Boîte (`shape_box` / Touche 5)** : glisser-déposer pour créer un rectangle souple avec 4 sommets reliés et contreventement diagonal élastique.
  - **Cercle / Blob (`shape_circle` / Touche 6)** : glisser depuis le centre vers l'extérieur pour générer un blob circulaire à noyau central vibrant et couronne périphérique articulée.
  - **Capsule (`shape_capsule` / Touche 7)** : glisser pour tracer un os ou membre charnu dense à deux têtes.
- **Prévisualisation en Temps Réel** :
  - Retour visuel dynamique sur le canevas pendant le tracé (traits pointillés, sommets anticipés, prévisualisation de volume).

## [Phase 7 - 2026-09-21] — Persistance, Export/Import JSON & Drag-and-Drop
### Ajouté
- **Exportation JSON de Créatures** :
  - Génération d'un fichier `.json` structuré contenant tous les nœuds (positions, vitesses, masses, états épinglés, comportements), les liaisons élastiques (raideurs, amortissements, longueurs de repos), la configuration de locomotion procédurale (`ProceduralWalkerConfig`) et les métadonnées de version.
- **Importation JSON polyvalente** :
  - Bouton Import avec explorateur de fichiers.
  - Glisser-déposer (**Drag & Drop**) direct de n'importe quel fichier `.json` de créature sur le canevas de simulation physique.
  - Instanciation immédiate sans rechargement de page.

## [Phase 6 - 2026-09-21] — Système Visuel Organique & Expressivité
### Ajouté
- **Capsules Organiques Dynamiques** :
  - Remplacement des segments filaires par des capsules lissées à géométrie dynamique (courbes de Bézier quadratiques tangentes).
  - Étranglement central (« waist ») proportionnel à l'étirement sous tension du ressort pour traduire la déformation de masse.
- **Squash & Stretch Réactif** :
  - Écrasement élastique des nœuds lors des impacts au sol et étirement selon la composante verticale de vélocité.
- **Regard Vivant & Expressif** :
  - Clignements spontanés pseudo-périodiques des yeux avec micro-saccades basées sur le temps global.
  - Dilatation et rétractation des pupilles couplées à l'accélération et à la vitesse du personnage.
- **Ombrage de Contact** :
  - Ombres portées au sol avec occlusion douce et atténuation selon la hauteur au sol.
- **Bascule de Mode de Peau (Skin Mode)** :
  - Sélecteur direct permettant d'alterner entre l'habillage **Organique** et le rendu technique **Minimal**.
- **Nouveau Preset « Blob Mou » (Jelly Blob)** :
  - Structure en polygone souple déformable avec masse centrale suspendue, mettant en valeur le système visuel organique.

## [Phase 4 & 5 - 2026-09-21] — Locomotion Procédurale (Foot Targets, Allures & Saut)
### Ajouté
- **Moteur de Locomotion Procédurale** (`ProceduralWalker`) :
  - Calcul dynamique des cibles de pas d'après la position et la vélocité du bassin (anticipation du mouvement).
  - Détection automatique de dépassement de foulée (`strideThreshold`).
  - Trajectoire balistique de swing de pied par interpolation cubique (smoothstep horizontal) et élévation parabolique en cloche (`Math.sin(t * Math.PI)`).
  - Maintien d'appui solide (`stance phase`) via ressort d'ancrage dynamique au sol.
  - Coordination de démarche (`gait alternation`) avec partitionnement par groupes d'appuis (permettant la marche bipède et le trot diagonal quadrupède).
  - Propulsion horizontale et élévation/suspension du bassin (`bodyHeight`).
  - Système d'impulsion de saut vertical (`triggerJump`) avec rétractation aérienne naturelle des pattes.
- **Nouveaux Presets de Créatures** :
  - **Bipède Procédural (2 Pattes)** : bassin expressif, tête curieuse suivant la souris, 2 membres oscillant en opposition de phase.
  - **Quadrupède Procédural (4 Pattes)** : poitrail et bassin reliés par une colonne élastique, queue vive avec jiggle réactif, 4 pattes en coordination diagonale de trot (Avant-Gauche + Arrière-Droit vs Avant-Droit + Arrière-Gauche).
- **Contrôles de Locomotion Interactifs** :
  - Clavier : touches `A` / `D` (ou `Q` / `D` ou flèches gauche/droite) pour avancer/reculer, touche `W` / `Z` / flèche haut pour sauter.
  - Boutons tactiles HUD : Reculer, Sauter, Avancer.
  - Conduite directe par la souris : déplacer le corps de la créature à la souris force le système de pas procéduraux à s'adapter en temps réel.
- **Visualisation Debug** :
  - Tracé des Foot Targets en mode debug (vert = Stance, rose = Swing).
  - Tracé en pointillés de la trajectoire parabolique du pas en cours.

## [Phase 2 - 2026-09-21] — Direct Manipulation, Comportements Dynamiques & Jiggle
### Ajouté
- **Système de Behaviors modulaires** (`BehaviorEvaluator`) :
  - `jiggle` : mouvement secondaire réagissant aux accélérations des nœuds voisins pour un wobble organique.
  - `follow_mouse` : nœud attiré magnétiquement vers le curseur pour simuler une tête curieuse ou une antenne.
  - `oscillator` : pulsation / respiration autonome sinusoïdale périodique.
- **Outils d'édition directe (Direct Manipulation)** :
  - Outil **Interact** (saisie, secousse, sélection d'un nœud).
  - Outil **Add Node** (création immédiate d'un nœud au clic sur le canevas).
  - Outil **Connect** (création d'un ressort élastique en glissant d'un nœud à un autre avec ligne en pointillés).
- **Inspecteur contextuel de nœud** :
  - Ancrage dans l'espace (**Pin / Unpin**).
  - Sélecteur de Behavior en 1 clic.
  - Curseur de réglage de masse.
  - Suppression de nœud.
- **Nouveau Preset** :
  - *Mobile Jiggle* : structure suspendue avec point fixe et deux appendices réagissant en jiggle secondaire.
- Raccourcis clavier (Espace pour Play/Pause, Suppr pour effacer, 1-3 pour changer d'outil).

## [Phase 1 - 2026-09-21] — Initialisation du moteur et premier MVP 3 nœuds
### Ajouté
- Structure de documentation vivante (`PROJECT.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `DECISIONS.md`, `TODO.md`, `TESTING.md`, `CHANGELOG.md`).
- Module mathématique `Vector2` et solveur de ressort amorti `SpringMath`.
- Moteur de simulation à pas fixe `SimulationWorld` avec intégration de la gravité, plan de sol et ressort d'accroche souris virtuel.
- Rendu Canvas 2D organique avec ombrage de sol, capsules articulées, regard interactif et overlay de debug.
- Interface tactile de laboratoire avec sélecteur de dynamique de mouvement (Gélatineux, Organique, Ferme Dynamique) et contrôles de simulation.
- Créature de référence 3 nœuds pour calibrer le ressenti perceptuel.
