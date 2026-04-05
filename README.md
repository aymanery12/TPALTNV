# TPALT_Backend
Backend du projet pour TPALT


#To run this project, you need to have Java and Maven installed on your machine. You can use the following command to build and run the application:

```bash
mvn spring-boot:run
```
# 📚 BookStore — Guide de démarrage

## Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et lancé
- Git

---

## 🚀 Démarrage rapide (tout en une commande)

### 1. Copie le fichier d'environnement
```bash
cp .env.example .env
```
Ouvre `.env` et colle ta clé Gemini :
```
GEMINI_API_KEY=ta_vraie_cle_ici
```

### 2. Lance tout avec Docker
```bash
docker-compose up --build
```

C'est tout ! Docker va :
- Créer la base de données MySQL
- Initialiser automatiquement la base avec `bookstore_db.sql` (tables + données)
- Builder et lancer le Spring Boot

> **Note :** Le script SQL ne s'exécute qu'au **premier démarrage** (volume vide).  
> Pour repartir de zéro : `docker-compose down -v` puis `docker-compose up --build`

---

## 🌐 Accès aux services

| Service         | URL                          | Identifiants              |
|-----------------|------------------------------|---------------------------|
| API Spring Boot | http://localhost:8080        | —                         |
| phpMyAdmin      | http://localhost:8081        | root / root1234           |

---

## 🔑 Compte admin par défaut

| Champ    | Valeur             |
|----------|--------------------|
| username | admin              |
| password | admin123           |
| role     | ADMIN              |

---

## 📡 Endpoints principaux

### Auth
```
POST /api/auth/signup     { "username":"...", "email":"...", "password":"..." }
POST /api/auth/login      { "username":"...", "password":"..." }  → retourne { "token": "..." }
```

### Livres
```
GET  /api/books                    Liste tous les livres
GET  /api/books/{id}               Détail d'un livre
GET  /api/books/search?keyword=…   Recherche par mot-clé
GET  /api/books/category/{cat}     Filtrer par catégorie
POST /api/books                    Ajouter un livre (ADMIN)
DELETE /api/books/{id}             Supprimer (ADMIN)
```

### Commandes (token requis)
```
POST  /api/orders              Passer une commande (paiement COD automatique)
GET   /api/orders/my           Historique des commandes du client
PATCH /api/orders/{id}/status  Changer le statut (ADMIN)
```

### Avis (token requis)
```
GET  /api/books/{bookId}/reviews   Lire les avis
POST /api/books/{bookId}/reviews   Poster un avis { "rating": 4, "comment": "..." }
```

### IA Chatbot (token requis)
```
GET /api/chat/ask?message=Je cherche un roman d'aventure
GET /api/chat/summary/{bookId}
```

---

## 🔐 Utiliser le token JWT

Après le login, ajoute ce header à toutes tes requêtes protégées :
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

---

## 🛑 Arrêter les conteneurs
```bash
docker-compose down
```

Pour tout supprimer (y compris la base de données) :
```bash
docker-compose down -v
```

---

## 💻 Développement en local (sans Docker)

Si tu veux lancer le Spring Boot directement avec IntelliJ :
1. Lance uniquement MySQL et phpMyAdmin : `docker-compose up mysql phpmyadmin`
2. Lance le Spring Boot depuis ton IDE normalement
3. La connexion `localhost:3306` dans `application.properties` fonctionnera directement
