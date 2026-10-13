/*
 * Site catalog — the single place that lists classes and their resources.
 * To add a class or a resource, add an entry here (see README.md).
 * `href` values are relative to the class folder: classes/<id>/
 */
window.CATALOG = {
  classes: [
    {
      id: "apush-williams",
      title: "APUSH – Williams",
      subtitle: "AP U.S. History · Mr. Williams",
      quizzes: [
        {
          title: "Enduring Vision Quiz",
          description: "The Enduring Vision, Ch. 2–6: colonization through the Constitution.",
          meta: "100 questions",
          href: "quizzes/enduring-vision.html"
        },
        {
          title: "Early Republic Quiz",
          description: "The Constitution, the Early Republic, and the Age of Jackson. Pick topics and review what you missed.",
          meta: "171 questions",
          href: "quizzes/early-republic.html"
        }
      ],
      flashcards: [
        {
          title: "Terms quiz flashcards",
          description: "Mr. Williams’ APUSH terms in order. Flip cards, quiz yourself with fuzzy search, or reverse the deck.",
          meta: "230 terms",
          href: "flashcards/terms/"
        },
        {
          title: "Enduring Vision flashcards",
          description: "Key terms and people from The Enduring Vision, Ch. 2–6. Study one chapter at a time with the card range.",
          meta: "111 cards",
          href: "flashcards/enduring-vision/"
        }
      ]
    }
  ]
};
