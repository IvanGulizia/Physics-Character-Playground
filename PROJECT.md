# PROJECT.md — Physics Character Playground

## Vision
Laboratoire interactif et expérimental de création et d'animation procédurale de personnages, créatures et objets régis par des contraintes, ressorts amortis (damped springs) et comportements dynamiques.

Le cœur du projet est :
> Créer des structures visuelles et leur attribuer des comportements dynamiques produisant des mouvements organiques, physiques ou procéduraux, sans recourir à des animations traditionnelles par keyframes.

## Principes Directeurs
1. **Relations et Comportements d'abord** : Le système est agnostique de l'anatomie (pas de présupposé humanoïde). Tout est nœud, lien, contrainte, cible et comportement.
2. **Direct Manipulation First** : L'interaction tactile directe à la souris (ressort d'accroche invisible) prime sur les formulaires complexes.
3. **Comportement Perceptuel** : Chaque paramètre mathématique répond à une intention visuelle (ferme/snappy vs gélatineux/ondulant, inertie, retard, amortissement).
4. **Simulation Indépendante de l'UI** : Le moteur de simulation fonctionne en TypeScript pur sur boucle à pas fixe (fixed timestep), découplé du cycle de vie des composants React.
5. **Rendu Découplé** : Le renderer Canvas 2D ne contient aucune logique de simulation et peut être enrichi ou remplacé sans impacter la physique.

## État Actuel (Phase 1)
- Noyau mathématique de simulation Damped Spring opérationnel.
- Rendu Canvas 2D organique avec sol et gravité orientée vers le bas.
- Interaction directe à la souris via ressort d'accroche dynamique.
- Sélecteur de "Feel" en temps réel (Gélatineux / Organique / Ferme Snappy) et sliders d'ajustement.
