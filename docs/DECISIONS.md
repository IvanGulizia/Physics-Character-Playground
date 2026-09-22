# DECISIONS ARCHITECTURALES (ADR)

## DECISION-001 : Choix de l'Architecture Physique & Morphing (Option C)
- **Contexte :** Le projet requiert à la fois des simulations physiques de créatures articulées, la fusion/morphing organique entre formes (cercles de diamètres différents type metaballs), des polylignes/cordons déformables à ressorts de flexion, ainsi qu'une séparation par calques (fond, corps, premier plan).
- **Décision (Option C) :**
  1. **Noyau Physique Hybride :** Moteur Verlet à pas de temps fixe déterministe avec contraintes de distance, contraintes angulaires pour la flexion (cordons/polylignes), et contraintes de plancher avec friction réglable.
  2. **Morphing Metaballs Analytique :** Calcul géométrique vectoriel exact des tangentes et des ponts d'intersection (`MetaballMath.ts`) reliant deux cercles de rayons quelconques $r_1, r_2$ avec courbure adaptative et raccord tangentiel parfait en Bézier cubique.
  3. **Traits Physiques Spline-Based :** Interpolation par courbes quadratiques/Catmull-Rom sur les nœuds ordonnés du trait (`strokeId`, `strokeIndex`), produisant un rendu vectoriel plat continu avec biseaux, contours d'ombrage et volume interne.
  4. **Architecture par Calques (Layers) :** Pipeline multi-passe ordonné (`back` -> `main` -> `front`) pour les nœuds et les liens, garantissant une profondeur claire (membres arrière en retrait, corps central, membres avant et yeux au premier plan).
  5. **Locomotion Procédurale Bipède Stylisée (Inspiration Iorama Studio & Eran Hill) :** Cinématique inverse (IK analytique 2 segments) combinée à des profils d'oscillation procédurale de la hanche (bobbing, sway, lean) et des poses de pas interpolées (Standard, Strut, Sneak, Bouncy, Waddle, Zombie).

## DECISION-002 : Rendu 2D Flat & Organique Minimaliste
- **Style visuel :** Flat design soigné avec contrastes nets, ombrages directionnels doux, yeux expressifs interactifs, et suppression des effets de gradient ou de flous non physiques.

## DECISION-003 : Détection Dédiée du Genou & Musculature Angulaire à Rappel de Posture
- **Contexte :** Permettre à l'utilisateur de désigner explicitement un nœud quelconque comme genou, d'en déduire automatiquement la hanche et le pied connectés, et d'attribuer une "force musculaire" interne aux membres pour qu'ils cherchent à maintenir leur position/angle d'origine face aux forces extérieures.
- **Décision :**
  1. **Détection Spatiale & Topologique du Genou (`toggleWalkerKnee`) :** Analyse les nœuds adjacents reliés par des liens. Le voisin situé le plus haut ($y$ minimal) est automatiquement assigné comme Hanche/Torse, et le voisin situé le plus bas ($y$ maximal) est promu en Pied Marcheur IK. La chaîne articulée à 2 segments est immédiatement opérationnelle.
  2. **Ressorts Angulaires Torque-Based (`AngularSpringMath.ts`) :** Modèle physique calculant le couple de torsion angulaire $\tau = -k \cdot \Delta\theta - c \cdot \dot\theta$ exercé au sommet de l'articulation ($B$) entre deux segments voisins ($A-B-C$), converti en forces linéaires orthogonales $\vec{F}_A = \frac{\tau}{d_A}\hat{n}_A$, $\vec{F}_C = -\frac{\tau}{d_C}\hat{n}_C$, $\vec{F}_B = -(\vec{F}_A + \vec{F}_C)$ garantissant la conservation de quantité de mouvement.
  3. **Limites Élastiques Amorties (Soft Limits) :** Application d'une raideur progressive et non linéaire lorsque l'articulation s'approche des bornes autorisées (`softRange`), évitant les blocages rigides non naturels tout en maintenant une biomécanique organique fluide.
  4. **Scellement de Posture de Repos (`sealNodeRestAngle`) :** Capture instantanée de l'angle courant de la créature en tant que nouvelle position d'équilibre au repos.
