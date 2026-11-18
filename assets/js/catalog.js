/*
 * Site catalog — the single place that lists classes and their resources.
 * To add a class or a resource, add an entry here (see README.md).
 * Quizzes: `quiz` is the slug of classes/<id>/quizzes/<slug>.yml (shown by the shared quiz.html).
 * Flashcard decks: `href` is relative to the class folder: classes/<id>/
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
          meta: "100 questions · hints",
          quiz: "enduring-vision"
        },
        {
          title: "Early Republic Quiz",
          description: "The Constitution, the Early Republic, and the Age of Jackson. Pick topics and review what you missed.",
          meta: "171 questions · hints",
          quiz: "early-republic"
        },
        {
          title: "Road to the Civil War Quiz",
          description: "Texas and the Mexican-American War, the Compromise of 1850, Kansas, secession, and the Civil War. Pick topics and review what you missed.",
          meta: "74 questions · hints",
          quiz: "road-to-civil-war"
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
    },
    {
      id: "calculus-ab",
      title: "Calculus AB",
      subtitle: "Thomas' Calculus: Early Transcendentals, 11th ed.",
      quizzes: [
        {
          title: "Chapter 1: Functions",
          description: "Sections 1.1–1.6: Functions and their graphs, combining and transforming functions, exponentials, inverses and logarithms.",
          meta: "119 questions · hints",
          quiz: "chapter-01"
        },
        {
          title: "Chapter 2: Limits and Continuity",
          description: "Sections 2.1–2.7: Rates of change, limit laws, the epsilon-delta definition, one-sided and infinite limits, continuity, and tangents.",
          meta: "139 questions · hints",
          quiz: "chapter-02"
        },
        {
          title: "Chapter 3: Differentiation",
          description: "Sections 3.1–3.10: The derivative as a function, differentiation rules, rates of change, trig/chain/implicit/inverse derivatives, related rates, and linearization.",
          meta: "242 questions · hints",
          quiz: "chapter-03"
        },
        {
          title: "Chapter 4: Applications of Derivatives",
          description: "Sections 4.1–4.8: Extreme values, the Mean Value Theorem, monotonicity, concavity, optimization, L'Hôpital's Rule, Newton's method, and antiderivatives.",
          meta: "249 questions · hints",
          quiz: "chapter-04"
        },
        {
          title: "Chapter 5: Integration",
          description: "Sections 5.1–5.6: Estimating with finite sums, sigma notation, the definite integral, the Fundamental Theorem of Calculus, substitution, and area between curves.",
          meta: "269 questions · hints",
          quiz: "chapter-05"
        },
        {
          title: "Chapter 6: Applications of Definite Integrals",
          description: "Sections 6.1–6.7: Volumes by slicing, disks, washers and shells; lengths of curves; centers of mass; surface area and Pappus; work; fluid forces.",
          meta: "208 questions · hints",
          quiz: "chapter-06"
        },
        {
          title: "Chapter 7: Integrals and Transcendental Functions",
          description: "Sections 7.1–7.4: Integrals of logarithmic and exponential expressions, exponential growth and decay, relative rates of growth, and hyperbolic functions.",
          meta: "213 questions · hints",
          quiz: "chapter-07"
        },
        {
          title: "Chapter 8: Techniques of Integration",
          description: "Sections 8.1–8.8: Basic integration formulas, integration by parts, partial fractions, trigonometric integrals and substitutions, integral tables, numerical integration, and improper integrals.",
          meta: "465 questions · hints",
          quiz: "chapter-08"
        },
        {
          title: "Chapter 9: Further Applications of Integration",
          description: "Sections 9.1–9.5: Slope fields and separable equations, first-order linear equations, Euler's method, autonomous equations and phase lines, and applications of first-order equations.",
          meta: "172 questions · hints",
          quiz: "chapter-09"
        },
        {
          title: "Chapter 10: Conic Sections and Polar Coordinates",
          description: "Sections 10.1–10.8: Parabolas, ellipses and hyperbolas, eccentricity and directrices, rotation of axes, parametrized conics and the cycloid, polar coordinates and graphs, areas and lengths in polar coordinates, and conics in polar form.",
          meta: "411 questions · hints",
          quiz: "chapter-10"
        },
        {
          title: "Chapter 11: Infinite Sequences and Series",
          description: "Sections 11.1–11.11: Sequences and their limits, infinite series, the integral, comparison, ratio and root tests, alternating series and absolute convergence, power series, Taylor and Maclaurin series, error estimates, binomial series and applications, and Fourier series.",
          meta: "618 questions · hints",
          quiz: "chapter-11"
        },
        {
          title: "Chapter 12: Vectors and the Geometry of Space",
          description: "Sections 12.1–12.6: Three-dimensional coordinates, vectors, the dot and cross products, lines and planes in space, and cylinders and quadric surfaces.",
          meta: "405 questions · hints",
          quiz: "chapter-12"
        }
      ],
      flashcards: []
    }
  ]
};
