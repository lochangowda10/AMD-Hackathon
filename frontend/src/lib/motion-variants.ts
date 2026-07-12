// Motion variants for common animations
export const motionVariants = {
  // Container variants
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },

  // Item variants
  item: {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  },

  // Fade variants
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  },

  // Scale variants
  scaleIn: {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    }
  },

  // Slide variants
  slideInFromLeft: {
    hidden: { x: -100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    }
  },

  slideInFromRight: {
    hidden: { x: 100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    }
  },

  slideInFromTop: {
    hidden: { y: -100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    }
  },

  slideInFromBottom: {
    hidden: { y: 100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    }
  },

  // 3D Flip variants (NEW)
  flipX: {
    hidden: { rotateX: -90, opacity: 0 },
    visible: {
      rotateX: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  },

  flipY: {
    hidden: { rotateY: -90, opacity: 0 },
    visible: {
      rotateY: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  },

  // 3D Rotation variants (NEW)
  rotate3d: {
    hidden: { rotate: 0, rotateX: 0, rotateY: 0, opacity: 0 },
    visible: {
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      opacity: 1,
      transition: {
        duration: 1.5,
        ease: "anticipate"
      }
    },
    hover: {
      rotate: 0,
      rotateX: 10,
      rotateY: 10,
      transition: { duration: 0.5 }
    }
  },

  // 3D Tilt effect (NEW)
  tilt: {
    hover: {
      rotateX: 10,
      rotateY: -10,
      scale: 1.02
    },
    tap: {
      rotateX: 5,
      rotateY: -5,
      scale: 0.98
    },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },

  // 3D Pop effect (NEW)
  pop3d: {
    hover: {
      scale: 1.05,
      rotateY: 5
    },
    tap: {
      scale: 0.95,
      rotateY: 2
    },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },

  // Stagger variants
  staggerContainer: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },

  // Hover variants
  hoverScale: {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },

  hoverLift: {
    hover: { y: -2 },
    tap: { y: 0 },
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },

  // Pulse variants
  pulse: {
    hidden: { scale: 1 },
    visible: { 
      scale: [1, 1.05, 1],
      transition: { repeat: Infinity, duration: 2 }
    }
  },

  // 3D Pulse (NEW)
  pulse3d: {
    hover: {
      scale: [1, 1.07, 1],
      rotateY: [0, 5, 0]
    },
    transition: {
      repeat: Infinity,
      duration: 3,
      ease: "easeInOut"
    }
  },

  // Page transition variants (NEW)
  pageEnter: {
    initial: {
      opacity: 0,
      y: 20,
      rotateX: 10
    },
    animate: {
      opacity: 1,
      y: 0,
      rotateX: 0
    },
    exit: {
      opacity: 0,
      y: -20,
      rotateX: -10
    },
    transition: {
      duration: 0.5,
      ease: "anticipate"
    }
  },

  // Card hover 3D effect (NEW)
  cardHover: {
    hover: {
      rotateY: 8,
      rotateX: -5,
      scale: 1.02,
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
    },
    tap: {
      scale: 0.98
    },
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20
    }
  }
};