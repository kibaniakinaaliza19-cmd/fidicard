# FidiCard Studio

Éditeur de cartes de fidélité digitales : bibliothèque de modèles, personnalisation en temps réel (fond, logo, couleurs, système de fidélité, récompense, infos), aperçu téléphone 3D (iPhone / Android / Wallet), assistant Fidi AI, publication avec QR code.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) — redirige vers `/carte`.

## Structure

- `src/app` — pages (Accueil, Clients, Carte, Scanner, Analyse, Notifications, Réglages)
- `src/components/editor` — éditeur de carte (modèles, outils, aperçu téléphone, panneau de propriétés, Fidi AI, publication)
- `src/store` — état global (Zustand) : design de la carte et état de l'UI
- `src/data/templates.ts` — bibliothèque de modèles (JSON, extensible sans toucher au code)
- `src/lib/ai-heuristic.ts` — génération de design à partir d'un prompt texte
- `db/schema.sql` — schéma PostgreSQL/Supabase (users, templates, cards, clients)
- `src/lib/supabase.ts` — client Supabase, inactif tant que `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` ne sont pas définis (voir `.env.local.example`)

## État du projet

Le frontend est entièrement fonctionnel avec état local (aucune donnée n'est perdue pendant l'édition, "Enregistrer" persiste dans `localStorage`). Le backend (Supabase) et les intégrations Apple/Google Wallet réelles sont scaffoldées mais nécessitent des identifiants pour être activées.
