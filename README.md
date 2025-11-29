# 🌐 README / Lisez-moi
- 🇬🇧 [English Version](#english-version)
- 🇫🇷 [Version Française](#version-française)

<a name="english-version"></a>
# 🇫🇷 English Version — 🟦 Impact Identity

### *A decentralized reputation system rewarding real-world social & environmental actions using XRPL NFTs + MPTokens.*

---

## 🌍 Overview

**Impact Identity** is a blockchain-based system that transforms real-world positive actions into **verifiable digital proofs**, using the **XRPL Testnet**.

Each validated action (environmental, social, educational…) becomes:

* **A Proof-of-Impact NFT**, minted on the XRPL
* **ImpactPoints** (MPTokens), credited to the user’s wallet
* **A public reputation profile**, showing badges + scores

Our goal is to **make good deeds visible, verifiable, and valuable**—for students, volunteers, NGOs, and communities.

This project was created for the **Hack4Good 2025 – XRPL & ECE Paris** hackathon.

---

# 📌 Table of Contents

* [🎯 Problem Statement](#-problem-statement)
* [💡 Solution](#-solution)
* [🔍 Use Cases](#-use-cases)
* [⚙️ Features (MVP Scope)](#️-features-mvp-scope)
* [🏗 Architecture](#-architecture)
* [🔧 Technical Breakdown](#-technical-breakdown)

  * [XRPL Integration](#xrpl-integration)
  * [NFT Structure](#nft-structure)
  * [MPToken Structure](#mptoken-structure)
* [🧩 API Structure](#-api-structure)
* [🗄 Database Schema](#-database-schema)
* [🔁 End-to-End Flow](#-end-to-end-flow)
* [⚙️ Installation & Setup](#️-installation--setup)
* [🧪 Future Improvements](#-future-improvements)
* [📈 Scalability & Potential Transactions](#-scalability--potential-transactions)
* [📜 License](#-license)

---

# 🎯 Problem Statement

Millions of people perform social or environmental actions daily:

* volunteering
* waste cleanup
* blood donation
* educational workshops
* support to vulnerable populations

Yet **none of these actions leave a certified, portable, verifiable trace**.

👉 No way to prove it to employers.
👉 No recognition in academic paths.
👉 No unified identity of impact.

Impact today is **invisible**.

---

# 💡 Solution

**Impact Identity** creates a **verifiable impact identity** for every user.

### Every validated action becomes:

1. **An on-chain NFT badge**
2. **A reward in MPTokens (ImpactPoints)**
3. **A public profile aggregating all actions**

### Benefits

* immutable proof of contributions
* universal “impact passport” for students & volunteers
* transparency for NGOs & institutions
* scalable infrastructure for future integrations

---

# 🔍 Use Cases

### ✔ Students

Prove soft skills, engagement, and social contributions.

### ✔ Nonprofits / NGOs

Certify volunteer hours with tamper-proof receipts.

### ✔ Municipalities

Reward eco-actions (trash collection, bike usage, events).

### ✔ Hiring / HR

Evaluate candidates beyond academic achievements.

---

# ⚙️ Features (MVP Scope)

### ✅ **1. User Action Submission**

* Title, category, description
* Optional image
* Stored off-chain (DB)

### ✅ **2. Admin Validation Dashboard**

* List pending actions
* Approve / reject
* One click → NFT minted + tokens sent

### ✅ **3. On-chain Proof System**

* Mint NFT (XRPL NFTs)
* Send 1 MPToken = 1 ImpactPoint

### ✅ **4. Public User Profile**

* List all Proof-of-Impact NFTs
* Display score (on-chain MPToken balance)

### ✅ **5. XRPL Testnet Integration**

Mandatory for hackathon rules.

---

# 🏗 Architecture

```
                  ┌──────────────────────────┐
                  │        FRONTEND           │
                  │  Next.js (React) UI       │
                  └──────────────┬───────────┘
                                 │
                               REST API
                                 │
                  ┌──────────────┴─────────────┐
                  │           BACKEND           │
                  │ Node.js + Express           │
                  │ - Validation logic          │
                  │ - XRPL service (xrpl.js)    │
                  │ - NFT minting               │
                  │ - MPToken transfers         │
                  └──────────────┬─────────────┘
                                 │
                                 ▼
                        XRPL TESTNET L1
                  (NFTs + MPTokens + explorer)
                                 │
                                 ▼
                       ┌──────────────────┐
                       │     DATABASE     │
                       │  Postgres/Supa   │
                       └──────────────────┘
```

---

# 🔧 Technical Breakdown

## XRPL Integration

We use **xrpl.js 4.x** — the official XRPL library.

### Main XRPL operations:

* **NFTokenMint** → Mint NFT badges
* **Payment** (MPToken transfer) → Issue ImpactPoints
* **AccountLines / Balances** → Fetch user score
* **Ledger queries** → Fetch NFT metadata

---

## NFT Structure

Each NFT represents **a validated action**.

**Metadata JSON (off-chain)**:

```json
{
  "name": "Eco-Cleanup Bronze",
  "description": "Collected 2kg of waste during a cleanup event.",
  "category": "environment",
  "date": "2025-11-29",
  "proof_url": "https://impactidentity.app/proofs/12345.png"
}
```

**On-chain URIs** reference the metadata:
→ Only lightweight hash + URL stored on XRPL.

---

## MPToken Structure

ImpactPoints follow:

* **1 action = 1 token**
* **Issuer: ImpactIdentity Admin Wallet**
* **Token code: IPT** (Impact Token)

These points:

* are non-transferable (logic enforced off-chain)
* represent the user’s cumulative impact score
* are visible directly on XRPL

---

# 🧩 API Structure

### `POST /actions`

Submit a new action.

### `GET /admin/actions`

List pending actions.

### `POST /admin/actions/:id/validate`

Validate action → triggers:

* NFT mint
* Token send
* DB update

### `GET /profile/:wallet`

Fetch:

* NFTs minted to the wallet
* ImpactPoints balance
* Action history

---

# 🗄 Database Schema

### `users`

| field      | type      |
| ---------- | --------- |
| id         | uuid      |
| wallet     | string    |
| created_at | timestamp |

### `actions`

| field           | type                             |
| --------------- | -------------------------------- |
| id              | uuid                             |
| user_id         | uuid                             |
| title           | string                           |
| category        | string                           |
| description     | text                             |
| proof_image_url | string                           |
| status          | enum(pending/validated/rejected) |
| nft_id          | string                           |
| created_at      | timestamp                        |

### `scores` (optional)

Used for cached leaderboard.

| field        | type |
| ------------ | ---- |
| user_id      | uuid |
| total_points | int  |

---

# 🔁 End-to-End Flow

### **1. User submits action**

`POST /actions`

→ stored as `pending`

### **2. Admin validates**

Click “Validate” in dashboard.

### **3. Backend mints NFT**

Using `NFTokenMint` on XRPL.

### **4. Backend sends 1 ImpactPoint**

Using `Payment` with MPToken.

### **5. DB updated**

`status = validated`, `nft_id = ...`

### **6. Profile displays NFTs**

Frontend fetches nft list for the user wallet.

---

# ⚙️ Installation & Setup

### 1. Clone repo

```bash
git clone https://github.com/<yourrepo>/impact-identity.git
cd impact-identity
```

### 2. Install backend

```bash
cd backend
npm install
```

### 3. Install frontend

```bash
cd frontend
npm install
```

### 4. Environment variables

#### Backend `.env`

```
XRPL_RPC=wss://s.altnet.rippletest.net:51233
ADMIN_WALLET_SEED=sn...
DATABASE_URL=postgres://...
```

#### Frontend `.env`

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Run

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

---

# 📈 Scalability & Potential Transactions

If deployed at scale:

### Example scenarios:

* 10k students generating 3 actions/month
* 30k NFTs + 30k token transfers
* Total: 60k XRPL transactions monthly

2025 XRPL TPS → 1500+
Your system scales comfortably.

---

# 🧪 Future Improvements

* On-chain reputation score
* Multi-org validator system
* QR code validation at events
* Soulbound NFTs
* Zero-knowledge proofs for privacy
* NGO dashboards
* Leaderboards with MPToken staking

---

# 📜 License

MIT – free to use, replicate, expand.

---

<a name="version-française"></a>
# 🇫🇷 Version Française — 🟦 Impact Identity

### *Un système de réputation décentralisé qui transforme chaque action sociale ou environnementale en preuve vérifiable sur XRPL.*

---

## 🌍 Présentation

**Impact Identity** est une plateforme qui transforme les actions positives réalisées dans le monde réel en **preuves numériques vérifiables**, grâce à la blockchain **XRPL (Testnet)**.

Chaque action validée (écologie, social, éducation…) devient :

* **Un NFT “preuve d’impact”** émis sur XRPL
* **Des ImpactPoints** (MPTokens) envoyés au portefeuille XRPL de l’utilisateur
* **Un profil public d’impact**, regroupant badges + score

L’objectif : **rendre visibles, vérifiables et valorisables les bonnes actions**, pour les citoyens, les étudiants, les bénévoles et les communautés.

Projet développé pour le **Hack4Good 2025 – XRPL & ECE Paris**.

---

# 📌 Sommaire

* [🎯 Problème](#-problème)
* [💡 Solution](#-solution)
* [🔍 Cas d’usage](#-cas-dusage)
* [⚙️ Fonctionnalités (MVP)](#️-fonctionnalités-mvp)
* [🏗 Architecture](#-architecture)
* [🔧 Détails techniques](#-détails-techniques)

  * [Intégration XRPL](#intégration-xrpl)
  * [Structure NFT](#structure-nft)
  * [Structure MPToken](#structure-mptoken)
* [🧩 API](#-api)
* [🗄 Base de données](#-base-de-données)
* [🔁 Déroulé complet](#-déroulé-complet)
* [⚙️ Installation & configuration](#️-installation--configuration)
* [🧪 Améliorations futures](#-améliorations-futures)
* [📈 Scalabilité & volume de transactions](#-scalabilité--volume-de-transactions)
* [📜 Licence](#-licence)

---

# 🎯 Problème

Des millions de personnes effectuent chaque jour des actions positives :

* bénévolat
* ramassage de déchets
* dons de sang
* tutorat et aide aux devoirs
* participation à des événements solidaires ou écologiques

👉 Mais **aucune preuve certifiée** n’existe.
👉 Les actions sont invisibles pour le CV, Parcoursup, les recruteurs.
👉 Les associations ne peuvent pas valoriser l’engagement réel.

Aujourd’hui, **l’impact n’a pas d’identité numérique**.

---

# 💡 Solution

Impact Identity crée une **identité d’impact vérifiable** pour chaque citoyen.

⚡ **Chaque action validée =**

1. Un **NFT** représentant une preuve d’action
2. Un **ImpactPoint** crédité en MPToken
3. Un **profil public** visible et partageable

## Avantages

* Preuves immuables pour étudiants & bénévoles
* Transparence totale pour les ONG & institutions
* Réputation sociale vérifiable
* Infrastructure réutilisable à grande échelle

---

# 🔍 Cas d’usage

### ✔ Étudiants

Justifier l’engagement citoyen pour Parcoursup / CV.

### ✔ Associations / ONG

Valider officiellement les heures de bénévolat.

### ✔ Villes / Collectivités

Valoriser les initiatives écologiques locales.

### ✔ Entreprises

Évaluer l’impact social des candidats.

---

# ⚙️ Fonctionnalités (MVP)

### ✅ Soumission d’actions

* Titre, catégorie, description
* Image facultative
* Stockage hors chaîne (DB)

### ✅ Validation côté admin

* Dashboard
* Acceptation/refus
* Validation déclenche le mint NFT + token

### ✅ Preuves on-chain

* Mint XRPL NFT
* Crédit MPToken (ImpactPoints)

### ✅ Profil public

* Liste des badges NFT
* Score global basé sur le solde MPToken

### ✅ XRPL Testnet

Toutes les transactions respectent les exigences du hackathon.

---

# 🏗 Architecture

```
                  ┌──────────────────────────┐
                  │        FRONTEND           │
                  │  Next.js (React) UI       │
                  └──────────────┬───────────┘
                                 │
                               REST API
                                 │
                  ┌──────────────┴─────────────┐
                  │           BACKEND           │
                  │ Node.js + Express           │
                  │ - Logique de validation     │
                  │ - Service XRPL (xrpl.js)    │
                  │ - Mint NFT                  │
                  │ - Transfert MPTokens        │
                  └──────────────┬─────────────┘
                                 │
                                 ▼
                        XRPL TESTNET L1
                  (NFTs + MPTokens + explorer)
                                 │
                                 ▼
                       ┌──────────────────┐
                       │     DATABASE     │
                       │  Postgres/Supa   │
                       └──────────────────┘
```

---

# 🔧 Détails techniques

## Intégration XRPL

Librairie utilisée : **xrpl.js v4**.

### Opérations XRPL utilisées

* `NFTokenMint` → création des badges
* `Payment` (MPToken) → ImpactPoints
* `AccountNFTs` → affichage des badges
* `AccountLines` / `Balances` → score on-chain

---

## Structure NFT

Un NFT représente une action validée.

**Metadata JSON (hors chaîne)** :

```json
{
  "name": "Eco-Cleanup Bronze",
  "description": "Participation à un nettoyage de plage.",
  "category": "environment",
  "date": "2025-11-29",
  "proof_url": "https://impactidentity.app/proofs/12345.png"
}
```

On ne stocke **que l’URI** et les informations minimales sur XRPL.

---

## Structure MPToken (ImpactPoints)

* 1 action validée = **1 IPT**
* Token émis par le wallet admin
* Utilisé pour :

  * mesurer l’impact
  * générer un classement
  * débloquer badges spéciaux (future feature)

---

# 🧩 API

## `POST /actions`

Créer une nouvelle action.

## `GET /admin/actions`

Lister les actions en attente.

## `POST /admin/actions/:id/validate`

Valider → mint NFT + envoyer 1 IPT.

## `GET /profile/:wallet`

Retourne :

* liste des NFTs
* score MPToken
* historique d’actions

---

# 🗄 Base de données

### `users`

| Champ      | Type      |
| ---------- | --------- |
| id         | uuid      |
| wallet     | string    |
| created_at | timestamp |

### `actions`

| Champ           | Type                           |
| --------------- | ------------------------------ |
| id              | uuid                           |
| user_id         | uuid                           |
| title           | string                         |
| category        | string                         |
| description     | text                           |
| proof_image_url | string                         |
| status          | pending / validated / rejected |
| nft_id          | string                         |
| created_at      | timestamp                      |

### `scores` (optionnel)

Cache pour les leaderboards.

---

# 🔁 Déroulé complet

### 1️⃣ L’utilisateur déclare une action

→ enregistré en DB en `pending`

### 2️⃣ L’admin valide l’action

→ clique “Valider”

### 3️⃣ Le backend mint le NFT

→ Transaction `NFTokenMint` sur XRPL

### 4️⃣ Le backend envoie un ImpactPoint

→ Transaction MPToken vers le wallet utilisateur

### 5️⃣ La DB est mise à jour

### 6️⃣ Le frontend affiche le badge + score

---

# ⚙️ Installation & configuration

### Cloner le projet

```bash
git clone https://github.com/<repo>/impact-identity.git
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Variables d’environnement

#### Backend `.env`

```
XRPL_RPC=wss://s.altnet.rippletest.net:51233
ADMIN_WALLET_SEED=sn...
DATABASE_URL=postgres://...
```

#### Frontend `.env`

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

# 🧪 Améliorations futures

* Système de réputation avancé
* Actions validées via QR Codes
* Proof-of-location (GPS + hash)
* NFT soulbound
* DAO d’associations locales
* Zero-knowledge proofs pour confidentialité
* Marketplace d’initiatives citoyennes

---

# 📈 Scalabilité & volume de transactions

### Exemple d’adoption :

* 10 000 utilisateurs
* 3 actions / mois
* = 30 000 NFTs + 30 000 MPTokens
* = 60 000 transactions XRPL / mois

Avec 1500+ TPS → XRPL supporte largement.

---

# 📜 Licence

MIT — libre d’utilisation et de modification.