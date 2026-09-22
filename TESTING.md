# TESTING.md — Procédures de test et validation

## Procédure de test — Phase 1 (Noyau Damped Spring)
1. **Démarrage de la simulation** :
   - Observer la créature de 3 nœuds (Corps, Tête/Appendice supérieur, Queue traînante).
   - Constater la retombée sous l'effet de la gravité et la stabilisation sur le plan de sol sans rebonds infinis ou enfoncement aberrant.
2. **Interaction directe à la souris (Grab Spring)** :
   - Cliquer sur le nœud central (Corps) et déplacer la souris rapidement.
   - Constater le ressort élastique invisible : le corps suit le curseur avec une souplesse dynamique et un léger retard d'inertie.
   - Les nœuds secondaires (appendice et queue) doivent suivre avec overshoot et oscillation amortie.
3. **Variation du "Feel" (Gélatineux vs Ferme)** :
   - Passer sur le mode **Gélatineux (Jelly)** : les oscillations doivent être amples et durer plusieurs cycles avant stabilisation.
   - Passer sur le mode **Ferme (Snappy)** : la créature doit réagir vivement et s'arrêter presque instantanément après l'overshoot (amortissement critique).
   - Passer sur le mode **Organique** : compromis naturel entre souplesse et tenue de corps.
4. **Stabilité numérique** :
   - Secouer violemment la souris : aucun nœud ne doit partir à l'infini (`NaN`) ni faire exploser le rig.
