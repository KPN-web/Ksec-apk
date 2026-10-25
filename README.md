# Ksec

**Le secrétariat, sans la paperasse. Plus de temps pour les gens.**

Ksec est une application Android de secrétaire assistée par intelligence artificielle. Elle accompagne celles et ceux qui animent des réunions : elle écoute, retient, puis rédige à leur place, pour qu'ils puissent rester présents dans la conversation plutôt que le nez dans leurs notes.

---

## Pourquoi Ksec existe

Une réunion, c'est avant tout des personnes qui se parlent, s'écoutent et décident ensemble. Pourtant, une grande partie de l'énergie part ailleurs : prendre des notes en urgence, tout retranscrire le soir, rédiger le compte rendu, mettre en forme la lettre, le rapport, le tableau de suivi.

Ksec part d'une idée simple : **la technologie doit prendre en charge la tâche répétitive, et laisser à l'humain ce qui compte, c'est-à-dire le dialogue, le jugement et la décision.**

## Ce que Ksec fait pour vous

- **Préparer** une réunion : le thème, la date, le lieu, les points à aborder, les participants.
- **Enregistrer** la discussion si vous le souhaitez, puis la transcrire.
- **Rédiger** pour vous le document dont vous avez besoin : compte rendu, lettre, rapport ou tableau. C'est vous qui choisissez, Ksec ne décide jamais à votre place.
- **Retrouver** vos réunions et l'historique des documents générés.
- **Exporter** vos documents pour les partager.

## Une application qui respecte votre vie privée

Ce qui se dit en réunion est parfois sensible. Ksec a donc été pensée pour ne rien garder qui ne vous appartienne :

- **Pas de serveur.** Ksec ne collecte rien, ne stocke rien chez nous.
- **Vos données restent sur votre téléphone** : réunions, transcriptions, documents et clé d'accès. Désinstaller l'application les efface définitivement.
- **Aucun cookie, aucun traceur.**
- **Transparence sur l'IA.** Pour transcrire et rédiger, le contenu nécessaire est envoyé au service Gemini de Google, uniquement au moment où vous le demandez. L'application intègre une politique de confidentialité qui détaille précisément ce qui part, et quand.

## Une IA qui assiste, pas qui remplace

L'IA peut se tromper. Un document généré est un **brouillon de qualité**, pas une vérité : relisez-le, corrigez-le, signez-le. C'est vous qui en portez la responsabilité, et c'est ce que précisent les conditions d'utilisation de l'application.

---

## Installer l'application

1. Rendez-vous dans la section **[Releases](../../releases)** de ce dépôt et téléchargez le fichier `.apk`.
2. Sur votre téléphone Android, autorisez l'installation depuis des sources inconnues quand il vous le propose.
3. Ouvrez le fichier téléchargé et installez Ksec.
4. Dans les **Paramètres** de l'application, renseignez votre propre clé d'accès Gemini (gratuite à créer sur [Google AI Studio](https://aistudio.google.com/apikey)). Elle reste sur votre téléphone.

Une connexion Internet est nécessaire pour la transcription et la rédaction. Le modèle Gemini utilisé est un réglage que vous pouvez modifier dans l'application.

> **Conseil de prudence** : ne partagez jamais votre clé d'accès, et ne la laissez pas visible sur une capture d'écran. Si cela arrive, révoquez-la aussitôt depuis Google AI Studio.

## Pour les développeurs

Ksec est construite avec **Angular** et **Capacitor** pour Android, avec une base **SQLite** locale et l'API **Gemini** pour l'IA.

```bash
npm install
ng serve
```

Pour générer l'application Android :

```bash
ng build
npx cap sync android
npx cap open android
```

## Où en est le projet

Ksec est un projet vivant, en amélioration continue. Les prochaines étapes sont l'adaptation tactile de l'interface et les tests sur appareils réels. Vos retours sont les bienvenus : ouvrez une *issue* pour signaler un défaut ou proposer une idée.

---

*Fait avec soin par KPN, pour que le temps passé en réunion serve d'abord les personnes qui s'y trouvent.*
