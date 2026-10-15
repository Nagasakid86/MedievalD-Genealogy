# 🏰 Généalogie — Medieval Dynasty

Un utilitaire **local**, **léger** et **simple** pour gérer la généalogie de votre dynastie dans *Medieval Dynasty*.

## Utilisation

1. Double-cliquez sur **`index.html`** → l'application s'ouvre dans votre navigateur (aucun serveur, aucune connexion internet nécessaire).
2. Cliquez sur **＋ Ajouter un villageois** (ou **📜 Exemple** pour charger une famille d'exemple).

> Astuce : vous pouvez créer un raccourci vers le fichier, ou l'ouvrir directement depuis VS Code avec le bouton "Go Live" / "Open in default browser".

## Fonctionnalités

- **Liste des villageois** : recherche, filtre par statut (vivant/décédé), **tri** (défaut par génération, nom A→Z / Z→A, génération 1→N / N→1, vivants/décédés en premier, naissance, mariage), colonnes **Âge**, **Décès**, **Conjoint(e)** (avec année de mariage)
- **Fiche complète** : nom, sexe, statut, **date de naissance** (année), **année de mort**, notes
- **💍 Année de mariage** : renseignée sur la fiche, **synchronisée automatiquement entre les deux conjoints** ; affichée dans la liste `(m. 1478)`, dans l'arbre `⚭ 1478` et dans les Stats (panneau **Mariages**)
- **📅 Année actuelle du jeu** : champ dans l'en-tête, défaut **1500** (année de départ du jeu) — les âges sont calculés automatiquement (vivants → année courante ; défunts → entre naissance et mort)
- **🎨 Thèmes de couleurs** : 6 presets inclus — 📜 Parchemin (défaut), 🌑 Château nuit, 🌲 Forêt, 🌊 Océan, 🍂 Automne, 🪨 Pierre — commutables depuis l'en-tête et mémorisés
- **Cohérence automatique** : une année de mort force le statut « Décédé » ; un « Vivant » n'a pas de date de mort ; naissance après mort refusée ; année de mariage effacée sans conjoint
- **Liens familiaux** : père, mère, conjoint, enfants — les champs père/mère/conjoint acceptent la **saisie directe du nom** (insensible à la casse) ou le choix dans une **liste de suggestions** filtrée par sexe (Père : hommes, Mère : femmes) ; choisir un parent fait proposer son **co-parent en premier** dans l'autre champ ; un nom inconnu ou de mauvais genre est refusé avec un message
- **Arbre généalogique** : visualisation par générations, avec possibilité d'afficher le sous-arbre d'une seule personne
- **Statistiques** : villageois, vivants/décédés, couples, familles, générations, année du jeu, liste des mariages
- **Protections** : impossible de créer un cycle (fils désigné comme père), liens cassés automatiquement réparés

## Sauvegarde des données

- Sauvegarde **automatique** dans le navigateur (`localStorage`) à chaque modification
- **⬇ Exporter** : télécharge toutes les données au format JSON (à faire régulièrement pour sécuriser votre arbre)
- **⬆ Importer** : restaure un fichier JSON exporté précédemment
- **♻ Réinitialiser** : efface tout
- **Compatibilité** : les anciennes sauvegardes sont migrées automatiquement (`born` → `birth`) ; l'ancien champ `profession` est simplement ignoré

> ⚠️ Les données sont stockées dans le navigateur de cet ordinateur uniquement. Si vous changez de navigateur ou videz les données du site, seuls les fichiers JSON exportés vous serviront de sauvegarde.

## Fichier de données

Format exporté :

```json
{
  "app": "medieval-dynasty-genealogie",
  "version": 1,
  "exported": "2026-10-08T12:00:00.000Z",
  "persons": [
    {
      "id": "s1",
      "name": "Guillaume",
      "gender": "M",
      "status": "dead",
      "birth": "1434",
      "death": "1502",
      "marriage": "1454",
      "notes": "Fondateur du domaine.",
      "father": null,
      "mother": null,
      "spouse": "s2"
    }
  ]
}
```

## Technique

- **Un seul fichier** `index.html` (HTML + CSS + JavaScript vanilla)
- Zéro dépendance, zéro framework, zéro build
- Poids : quelques dizaines de Ko

## Tests (optionnel)

`test.js` est un harness de validation qui exécute la logique de l'outil sous Node (avec un mock DOM) :

```
node test.js
```

Node n'est **pas** nécessaire pour utiliser l'outil, uniquement pour relancer ces tests.
