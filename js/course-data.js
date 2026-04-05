// StudyOS — Pre-loaded Course Data (Semester 2)

export const COURSES = {
  MAT1272: {
    code: 'MAT1272',
    name: 'Computational Mathematics-II',
    credits: '3 1 0 4',
    creditBreakdown: { L: 3, T: 1, P: 0, C: 4 },
    chapters: [
      {
        id: 'mat-ch1',
        name: 'Partial Differentiation',
        topics: [
          'Continuity of functions of two variables',
          'Definition of partial derivative',
          "Euler's theorem on homogeneous functions",
          'Total derivative & derivatives of composite/implicit functions',
          'Errors and approximations',
          "Taylor's theorem for functions of two variables",
          'Maxima and Minima',
          "Lagrange's method of undetermined multipliers",
          'Linear Regression Models',
        ],
      },
      {
        id: 'mat-ch2',
        name: 'Multiple Integrals',
        topics: [
          'Definitions of Double and Triple integrals',
          'Change of order of integration',
          'Change of variables & Jacobians',
          'Applications to areas and volumes',
          'Beta and Gamma functions',
        ],
      },
      {
        id: 'mat-ch3',
        name: 'Sequences & Series',
        topics: [
          'Convergent sequences and sequence limits',
          'Convergence and divergence of infinite series',
          "Comparison test, Ratio test, Cauchy's root test, Raabe's test, Integral test",
          "Alternating series & Leibnitz's theorem",
          'Absolute and conditional convergence',
          'Power series',
        ],
      },
      {
        id: 'mat-ch4',
        name: 'Efficient Computing Techniques',
        topics: [
          'Modular Arithmetic & Exponentiation by Repeated Squaring',
          'Modular Multiplicative Inverse',
          'Lucas Theorem to compute nCr',
          'Primality Tests',
          'Sieve of Eratosthenes',
          'Recurrent Problems (Tower of Hanoi, Lines in the Plane, The Josephus Problem)',
        ],
      },
      {
        id: 'mat-ch5',
        name: 'Laplace Transforms',
        topics: [
          'Transforms of elementary functions',
          'Shifting theorems',
          'Transforms of periodic functions & Unit step function',
          'Inverse Laplace transforms',
          'Convolution and Applications',
        ],
      },
    ],
  },

  PHY1072: {
    code: 'PHY1072',
    name: 'Applied Physics for Engineers',
    credits: '3 0 0 3',
    creditBreakdown: { L: 3, T: 0, P: 0, C: 3 },
    chapters: [
      {
        id: 'phy-ch1',
        name: 'Lasers',
        topics: [
          "Spontaneous and Stimulated emission, Einstein's coefficients",
          'Population Inversion',
          'He-Ne Laser, Ruby Laser, Semiconductor Laser',
        ],
      },
      {
        id: 'phy-ch2',
        name: 'Optical Fibres',
        topics: [
          'Principle of optical fibre, acceptance angle & acceptance cone',
          'Numerical aperture',
          'Step-index and Graded index fibre, single mode and multi-mode fibres',
          'Attenuation and distortion in optical fibres',
        ],
      },
      {
        id: 'phy-ch3',
        name: 'Modern Physics',
        topics: [
          "Black body radiation laws, Planck's hypothesis",
          'Overview of photoelectric effect',
          'The Compton effect & derivation of Compton shift equation',
          'Wave particle duality, Davisson and Germer Experiment',
          'Quantum particle, wave packet, phase speed and group speed',
          'Double-slit experiment revisited, Uncertainty principle',
        ],
      },
      {
        id: 'phy-ch4',
        name: 'Quantum Mechanics',
        topics: [
          'The Schrödinger equation',
          'Quantum particle under boundary conditions',
          'Particle in a box, Particle in a well of finite height',
          'Tunnelling through a potential barrier and its applications',
          'Dirac ket notation, Postulates of quantum mechanics',
        ],
      },
      {
        id: 'phy-ch5',
        name: 'Quantum Computing',
        topics: [
          'Moore\'s law, Single particle quantum interference',
          'Classical & quantum information comparison',
          'Quantum superposition and the concept of qubit',
          'Mathematical representation of a qubit, Summation of probabilities',
          'Representation of qubit by Bloch sphere',
          'Single Qubit Gates: Quantum Not Gate, Pauli-Z Gate, Hadamard Gate, Pauli Matrices, Phase Gate, T Gate',
          'Multiple Qubit Gates: Controlled gate, CNOT Gate (4 input states)',
          'Swap gate, Controlled-Z gate, Toffoli gate',
        ],
      },
    ],
  },

  ECE1072: {
    code: 'ECE1072',
    name: 'Fundamentals of Electronics',
    credits: '3 0 0 3',
    creditBreakdown: { L: 3, T: 0, P: 0, C: 3 },
    chapters: [
      {
        id: 'ece-ch1',
        name: 'Analog Electronics',
        topics: [
          'Rectifiers using diode, Rectifier Capacitor Filter',
          'Zener Regulator',
          'MOSFET amplifiers',
          'Block diagram representation of Op-Amp, Op-Amp parameters',
          'Linear and non-linear applications of Op-Amp',
        ],
      },
      {
        id: 'ece-ch2',
        name: 'Number Systems & Codes',
        topics: [
          'Number system classification',
          "One's and Two's complements",
          'Weighted and non-weighted codes',
          'Self-complementing codes',
          'Error detecting and correcting codes',
        ],
      },
      {
        id: 'ece-ch3',
        name: 'Boolean Algebra & Logic Gates',
        topics: [
          'Boolean algebraic theorems and simplification of Boolean expressions',
          'Basic and Universal logic gates',
          'Implementation of Boolean expressions using logic gates',
          'Standard form of Boolean expression',
          'Simplification of Boolean expressions using K-map',
          'Multiplexers and Demultiplexers',
        ],
      },
      {
        id: 'ece-ch4',
        name: 'Sequential Circuits',
        topics: [
          'JK, SR, D and T Flip-flops',
          'Binary counters',
          'Shift registers',
          'Finite State Machines',
          "Moore's and Mealy model",
        ],
      },
    ],
  },

  MIE1072: {
    code: 'MIE1072',
    name: 'Basic Mechanical Engineering Science',
    credits: '3 0 0 3',
    creditBreakdown: { L: 3, T: 0, P: 0, C: 3 },
    chapters: [
      {
        id: 'mie-ch1',
        name: 'Thermodynamics & Heat Transfer',
        topics: [
          'Principles and Laws of Thermodynamics',
          'Principles and modes of heat transfer (Numerical)',
          'Properties of Steam: Formation of steam at constant pressure (Numerical)',
        ],
      },
      {
        id: 'mie-ch2',
        name: 'Refrigeration & Air Conditioning',
        topics: [
          'Refrigeration: Principle and working of vapour compression refrigeration system',
          'Concepts and types of Air conditioning system (Numerical)',
        ],
      },
      {
        id: 'mie-ch3',
        name: 'I.C. Engines',
        topics: [
          'Classification of IC Engines',
          '4-stroke CI and SI Engines (Numerical)',
        ],
      },
      {
        id: 'mie-ch4',
        name: 'Power Transmission & Manufacturing',
        topics: [
          'Belt drives, Gear Drives (Numerical)',
          'Manufacturing Process: Introduction to Lathe, Drilling Machine and operations (Numerical)',
        ],
      },
      {
        id: 'mie-ch5',
        name: 'Automation, CAD & Robotics',
        topics: [
          'Computer-Aided Design (CAD) Basics — Introduction to CAD',
          'Introduction to automation, CNC machines',
          'Robotics: robot configuration, application of robotics, additive manufacturing',
        ],
      },
      {
        id: 'mie-ch6',
        name: 'IoT in Mechanical Systems',
        topics: [
          'Basics of IoT',
          'IoT Applications in Mechanical Engineering',
        ],
      },
    ],
  },

  ICT1271: {
    code: 'ICT1271',
    name: 'Introduction to Object Oriented Programming (Java)',
    credits: '2 1 0 3',
    creditBreakdown: { L: 2, T: 1, P: 0, C: 3 },
    chapters: [
      {
        id: 'ict-ch1',
        name: 'OOP Concepts & Paradigms',
        topics: [
          'Programming paradigms, Complexity of software, Bringing order to chaos',
          'Object model, Object oriented design, Object oriented analysis',
          'Abstraction, Encapsulation, Modularity, Typing, Concurrency',
          'Applying the object model',
        ],
      },
      {
        id: 'ict-ch2',
        name: 'Classes & Objects',
        topics: [
          'The nature of a class, Simple relationships among classes',
          'Classes, Objects, State behavior',
          'Simple relationships among objects',
          'The interplay of classes and objects',
          'Building quality classes and objects, Classification',
        ],
      },
      {
        id: 'ict-ch3',
        name: 'Java Fundamentals & Advanced OOP',
        topics: [
          'Introduction to I/O statements in Java',
          'Data types, Classes, Objects in Java',
          'Member function overloading',
          'Array of objects',
          'Passing objects to functions',
          'Composition',
        ],
      },
    ],
  },

  DSE1271: {
    code: 'DSE1271',
    name: 'Data Visualization (Python)',
    credits: '1 0 3 2',
    creditBreakdown: { L: 1, T: 0, P: 3, C: 2 },
    chapters: [
      {
        id: 'dse-ch1',
        name: 'Intro to Data Science & EDA',
        topics: [
          'Introduction to Data Science',
          'Exploratory Data Analysis and Data Science Process',
          'Tools for Data Analysis',
          'Summarizing and Computing Descriptive Statistics',
        ],
      },
      {
        id: 'dse-ch2',
        name: 'Data Handling',
        topics: [
          'Arrays and vectorized computation',
          'Data Loading, Storage and File Formats',
        ],
      },
      {
        id: 'dse-ch3',
        name: 'Data Wrangling',
        topics: [
          'Hierarchical Indexing',
          'Combining and Merging Data Sets',
          'Reshaping and Pivoting',
        ],
      },
      {
        id: 'dse-ch4',
        name: 'Data Visualization & Aggregation',
        topics: [
          'Data Visualization: plots',
          'Data Aggregation and Group operations: Group by Mechanics',
          'General split-apply-combine',
          'Pivot tables and cross tabulation',
        ],
      },
      {
        id: 'dse-ch5',
        name: 'Time Series Analysis',
        topics: [
          'Date and Time Data Types and Tools',
          'Time series Basics, Date Ranges, Frequencies and Shifting, Time Zone',
          'Handling Periods and Periods Arithmetic',
          'Resampling and Frequency conversion',
          'Moving Window Functions',
        ],
      },
    ],
  },
};

/**
 * Initialize courses in the store if not already present
 */
export function initializeCourses(store) {
  const existing = store.get('courses');
  if (existing && Object.keys(existing).length > 0) return;

  const courses = {};
  for (const [code, course] of Object.entries(COURSES)) {
    courses[code] = {
      ...course,
      chapters: course.chapters.map(ch => ({
        ...ch,
        topics: ch.topics.map(topicName => ({
          name: topicName,
          status: 'not-started', // 'not-started' | 'in-progress' | 'studied'
          studiedDate: null,
          lastReviewedDate: null,
        })),
      })),
    };
  }
  store.set('courses', courses);
}

/**
 * Get total topic counts for a course
 */
export function getCourseStats(courseData) {
  let total = 0;
  let studied = 0;
  let inProgress = 0;

  courseData.chapters.forEach(ch => {
    ch.topics.forEach(t => {
      total++;
      if (t.status === 'studied') studied++;
      else if (t.status === 'in-progress') inProgress++;
    });
  });

  return {
    total,
    studied,
    inProgress,
    notStarted: total - studied - inProgress,
    completionPercent: total > 0 ? Math.round((studied / total) * 100) : 0,
  };
}

export default COURSES;
