# DECISIONS.md — Architecture & Technical Records

### Decision 001: Moteur physique maison léger vs moteur physique tiers
- **Context** : Nécessité de simuler des liaisons élastiques, damped springs et secondary motion organiques.
- **Chosen approach** : Moteur maison en TypeScript pur (solveur semi-implicite harmonique amorti avec intégration Verlet/Euler pour les contraintes).
- **Alternatives** : Matter.js, Rapier2D, Box2D.
- **Reason** : Les moteurs 2D rigides imposent des formes géométriques de collision et un comportement rigide qui s'opposent à l'élasticité fluide et consomment inutilement des ressources. Une implémentation légère offre un contrôle total sur l'overshoot, l'amortissement et la locomotion procédurale.
- **Date** : 2026-09-21
- **Impact** : Zéro dépendance physique externe, performance maximale, code hautement lisible et ajustable.

### Decision 002: Rendu Canvas 2D découplé de la simulation
- **Context** : Affichage temps réel à 60 FPS des créatures avec réactivité tactile.
- **Chosen approach** : Canvas 2D natif avec pattern Renderer découplé (SimulationWorld -> CanvasRenderer).
- **Alternatives** : Three.js, Pixi.js, SVG manipulé par React.
- **Reason** : Canvas 2D est instantané, sans overhead de bundle, et permet de dessiner des capsules souples, des yeux et des liaisons élastiques avec une grande liberté visuelle.
- **Date** : 2026-09-21
- **Impact** : Boucle de rendu fluide, indépendante du cycle de vie React.

### Decision 003: Interaction souris par ressort invisible (Grab Spring)
- **Context** : Préhension des nœuds à la souris.
- **Chosen approach** : Quand l'utilisateur clique et glisse un nœud, ce dernier n'est pas téléporté rigide sous le curseur, mais relié par un ressort virtuel amorti.
- **Alternatives** : Téléportation rigide (pin direct).
- **Reason** : Conforme au retour du directeur créatif ; préserve l'inertie, la masse et la sensation élastique même pendant la manipulation active.
- **Date** : 2026-09-21
- **Impact** : Ressenti tactile beaucoup plus organique et vivant.

### Decision 004: Réglage perceptuel continu du Feel (Gélatineux <-> Ferme Snappy)
- **Context** : Besoin de pouvoir faire varier le comportement dynamique des ressorts.
- **Chosen approach** : Modèle basé sur la fréquence naturelle ($\omega$) et le rapport d'amortissement ($\zeta$). Un preset ou slider ajuste conjointement ces variables pour offrir une palette immédiate allant d'oscillations résiduelles ("gélatineux") à un retour vif stabilisé sans oscillation résiduelle ("ferme dynamique").
- **Date** : 2026-09-21
- **Impact** : Vocabulaire intuitif pour l'utilisateur sans jargon physique opaque.

### Decision 005: Architecture modulaire des Behaviors
- **Context** : Permettre à n'importe quel nœud d'adopter des comportements variés (jiggle secondaire, follow mouse, oscillation) sans créer des classes de créatures spécifiques.
- **Chosen approach** : Interface `NodeBehavior` composable (`evaluate(node, world, dt)`) évaluée dans la boucle à chaque frame.
- **Alternatives** : Héritage dur (ex: `JiggleNode extends SimNode`).
- **Reason** : La composition permet d'ajouter ou retirer des comportements dynamiquement en temps réel.
- **Date** : 2026-09-21
- **Impact** : Rigs polymorphiques et extensibilité sans régression.

### Decision 006: Direct Manipulation & Outils de Canevas Minimaux
- **Context** : Permettre la création de nouveaux nœuds et liens sans alourdir l'interface avec des fenêtres modales.
- **Chosen approach** : 3 modes légers accessibles via palette flottante ou raccourcis clavier :
  - `interact` : attraper, secouer, sélectionner
  - `add_node` : poser un nœud au clic sur le canevas
  - `connect` : glisser d'un nœud à un autre pour créer un ressort
  + Mini-menu contextuel radial/pillule sur le nœud sélectionné (Pin, Behavior, Delete).
- **Date** : 2026-09-21
- **Impact** : "Direct Manipulation First" respecté scrupuleusement.

### Decision 007: Locomotion Procédurale basée sur Cibles Balistiques et Coordination d'Alternance
- **Context** : Transposer les principes de `keijiro/CharacterRigTest` dans un environnement 2D à base de ressorts amortis pour $N$ membres sans rigide humanoïde forcé.
- **Chosen approach** :
  - Chaque jambe possède un point d'ancrage sur le corps (`hipNodeId`) et un nœud terminal (`footNodeId`).
  - La position cible d'équilibre au sol est calculée dynamiquement : $P_{\text{rest}} = (P_{\text{hip}} + \text{offset}) + V_{\text{body}} \times \text{anticipation}$.
  - Quand la distance au pied posé excède le seuil de foulée (`strideThreshold`) et que le membre opposé est au sol, le pas se déclenche.
  - La trajectoire du pas suit une interpolation balistique : horizontale douce + arche verticale $y = \sin(\pi \cdot t) \times \text{stepHeight}$.
  - Le nœud de pied est attiré vers cette cible mobile par un ressort de rappel vigoureux, générant l'impact, le soulèvement et le transfert de masse naturel sur le corps via les liaisons élastiques.
- **Date** : 2026-09-21
- **Impact** : Marche organique réactive aussi bien aux touches de déplacement qu'au glisser-déposer de la souris.
