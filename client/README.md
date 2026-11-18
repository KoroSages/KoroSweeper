# Client

`index.html` affiche une grille décorative de 3 × 3 cases fermées avec un cadre composé de tuiles deux fois plus petites et une section supérieure portant le titre « KoroSweeper », sans visage ni compteurs, dans le skin gris d'origine. Les cases s'assombrissent pendant l'appui sans se révéler ni recevoir de drapeau. La case supérieure gauche montre la tortue et ouvre `page.html` ; les autres cases ne sont pas jouables.

La zone à gauche de la grille est vide au départ. Pour afficher ou modifier sa description sans outil supplémentaire, ouvrir `description.js` dans un éditeur de texte et écrire entre les deux accents graves. Les retours à la ligne sont conservés. Après publication des fichiers, le nouveau texte est visible par tous les visiteurs.

`page.html` contient un démineur jouable de 9 × 9 cases avec 10 mines sur le premier layer et une tortue de 2 × 2 cases sur le second. Le thème jungle est actif au chargement ; le skin d'origine reste disponible. Le premier clic est sûr, les zones vides s'ouvrent automatiquement, une mine révélée fait perdre et toutes les cases sûres révélées font gagner. Le compteur supérieur droit démarre à l'ouverture de la première case et s'arrête à la fin de la partie. Le temps de résolution s'affiche au format `m:ss:ms` dans le message de victoire.

La tortue compte une fois pour chacun des chiffres situés dans sa zone d'influence, même lorsqu'elle touche plusieurs cases voisines du même chiffre. Les deux boutons sous la grille sélectionnent le drapeau ou la marque de tortue. En mode drapeau, le clic droit ou l'appui long pose un drapeau. En mode tortue, la prévisualisation suit le bloc de quatre cases le plus proche du curseur partout dans la grille ; un clic gauche ou un appui pose la tortue sur le bloc prévisualisé, ou y déplace la marque déjà posée. La touche F pose un drapeau et la touche T pose une marque de tortue sur la case sélectionnée comme coin supérieur gauche. Le visage lance une nouvelle partie.

Cliquer sur une case numérotée déjà révélée ouvre ses voisins non marqués lorsque le nombre de drapeaux voisins et de marques de tortue dont la zone touche ce chiffre correspond au chiffre. Une mauvaise marque peut alors faire perdre la partie.

Le thème jungle est affiché par défaut, sans bouton de changement de thème. Le skin d'origine reste dans le projet. Le cadre est d'un vert plus foncé que les cases et les chiffres gardent leurs couleurs.

La zone de règles à droite de la grille est vide au départ ; sur écran étroit, elle passe sous la grille. Pour écrire ou modifier les règles, ouvrir `rules.js` et écrire entre les deux accents graves. Les retours à la ligne sont conservés. Le classement manuel apparaît sous cette zone. Pour le remplir, ouvrir `leaderboard.js` et ajouter une ligne par joueur sous la forme `Nom | m:ss:ms`. L'ordre des lignes définit le classement.

Après une victoire, un message avec le temps de résolution apparaît sous les règles.

Cette version fonctionne entièrement dans le navigateur. Les comptes, le classement et le solveur ne sont pas intégrés.

Pour l'essayer localement, ouvrir `client/index.html` directement dans un navigateur. Un serveur local peut aussi être utilisé avec `python -m http.server 8000` à la racine du projet, puis `http://localhost:8000/client/index.html`.
