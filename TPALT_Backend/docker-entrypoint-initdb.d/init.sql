-- Ce fichier est exécuté automatiquement au premier démarrage du conteneur MySQL
-- Il insère des données de départ pour tester l'application

USE bookstore_db;

-- ─── Utilisateur ADMIN par défaut ───
-- Mot de passe : admin123  (hashé avec BCrypt)
INSERT IGNORE INTO user (username, email, password, role)
VALUES (
    'admin',
    'admin@bookstore.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhy8',
    'ADMIN'
);

-- ─── Quelques livres de départ ───
INSERT IGNORE INTO book (title, description, price, image_url, category, rating)
VALUES
(
    'Le Seigneur des Anneaux',
    'Dans un monde fantastique appelé la Terre du Milieu, un jeune hobbit nommé Frodon hérite d''un anneau magique et maléfique. Accompagné d''une Communauté de neuf compagnons, il doit traverser des terres dangereuses pour détruire cet anneau dans les feux de la Montagne du Destin.',
    18.90,
    'https://covers.openlibrary.org/b/id/8406786-L.jpg',
    'Fantasy',
    4.9
),
(
    'Dune',
    'Sur la planète désertique Arrakis, seule source de l''Épice, la substance la plus précieuse de l''univers, Paul Atréides se retrouve au cœur d''un complot galactique. Une saga épique de politique, de religion et de survie.',
    16.50,
    'https://covers.openlibrary.org/b/id/8325918-L.jpg',
    'Science-Fiction',
    4.8
),
(
    'Harry Potter à l''école des sorciers',
    'Harry Potter, un jeune orphelin élevé par son oncle et sa tante, découvre le jour de ses 11 ans qu''il est un sorcier. Il intègre l''école de magie Poudlard où il découvrira son héritage et affrontera les forces des ténèbres.',
    12.90,
    'https://covers.openlibrary.org/b/id/10110415-L.jpg',
    'Fantasy',
    4.7
),
(
    'L''Alchimiste',
    'Santiago, un jeune berger andalou, rêve de trouver un trésor enfoui près des Pyramides d''Égypte. Son voyage initiatique à travers le monde arabe lui apprendra que le vrai trésor se trouve là où il est.',
    9.90,
    'https://covers.openlibrary.org/b/id/8231856-L.jpg',
    'Roman',
    4.6
),
(
    '1984',
    'Dans un futur totalitaire, Winston Smith vit sous la surveillance permanente du Grand Frère. Alors qu''il commence à douter du régime, il entame une liaison dangereuse avec Julia. Un roman visionnaire sur la tyrannie et la résistance.',
    10.50,
    'https://covers.openlibrary.org/b/id/7222246-L.jpg',
    'Dystopie',
    4.8
),
(
    'Le Petit Prince',
    'Un aviateur en panne dans le désert rencontre un petit prince venu d''une autre planète. À travers ses aventures sur différentes planètes, le Petit Prince nous enseigne des leçons profondes sur l''amitié, l''amour et le sens de la vie.',
    8.90,
    'https://covers.openlibrary.org/b/id/8739161-L.jpg',
    'Conte',
    4.9
),
(
    'Fondation',
    'Hari Seldon, mathématicien de génie, prédit la chute de l''Empire Galactique. Pour réduire la période de barbarie qui s''ensuivra, il crée la Fondation, une encyclopédie vivante destinée à préserver le savoir de l''humanité.',
    14.90,
    'https://covers.openlibrary.org/b/id/8190594-L.jpg',
    'Science-Fiction',
    4.7
),
(
    'Les Misérables',
    'Jean Valjean, ancien forçat, cherche à se racheter dans une France du XIXe siècle marquée par les inégalités sociales. Poursuivi par l''inspecteur Javert, il protège la jeune Cosette dans une France en pleine révolution.',
    15.90,
    'https://covers.openlibrary.org/b/id/8739580-L.jpg',
    'Classique',
    4.6
);

-- ─── Auteurs des livres de départ ───
INSERT IGNORE INTO book_author (book_id, author)
SELECT id, 'J.R.R. Tolkien' FROM book WHERE title = 'Le Seigneur des Anneaux';

INSERT IGNORE INTO book_author (book_id, author)
SELECT id, 'Frank Herbert' FROM book WHERE title = 'Dune';

INSERT IGNORE INTO book_author (book_id, author)
SELECT id, 'J.K. Rowling' FROM book WHERE title = 'Harry Potter à l''école des sorciers';

INSERT IGNORE INTO book_author (book_id, author)
SELECT id, 'Paulo Coelho' FROM book WHERE title = 'L''Alchimiste';

INSERT IGNORE INTO book_author (book_id, author)
SELECT id, 'George Orwell' FROM book WHERE title = '1984';

INSERT IGNORE INTO book_author (book_id, author)
SELECT id, 'Antoine de Saint-Exupéry' FROM book WHERE title = 'Le Petit Prince';

INSERT IGNORE INTO book_author (book_id, author)
SELECT id, 'Isaac Asimov' FROM book WHERE title = 'Fondation';

INSERT IGNORE INTO book_author (book_id, author)
SELECT id, 'Victor Hugo' FROM book WHERE title = 'Les Misérables';