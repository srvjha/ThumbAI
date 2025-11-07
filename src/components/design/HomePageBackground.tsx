"use client";
import React from "react";
import { motion, Variants } from "framer-motion";

type Beam = {
  start: [number, number];
  end: [number, number];
  corners?: [number, number][];
};

const beamVariants: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: [0, 0.8, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      repeatDelay: 1,
      ease: "easeInOut" as const,
    },
  },
};

export const HomePageBackground = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-full bg-neutral-950 overflow-hidden -z-10">
      <GridBeams />
    </div>
  );
};

const GridBeams: React.FC = () => {
  const gridSize = 55;
  const rows = 12;
  const cols = 20;

  const beamPaths: Beam[] = [
    // Corner to center beams
    // { start: [0, 0], end: [10, 6] }, // Top-left to center
    // { start: [19, 0], end: [9, 6] }, // Top-right to center
    // { start: [0, 11], end: [10, 5] }, // Bottom-left to center
    // { start: [19, 11], end: [9, 5] }, // Bottom-right to center

    // Corner to opposite corner beams
    // { start: [0, 0], corners: [[5, 0], [5, 5], [14, 5]], end: [19, 11] },
    // { start: [19, 0], corners: [[14, 0], [14, 6], [5, 6]], end: [0, 11] },

    // // Corner-based L-shaped beams
    {
      start: [0, 0],
      corners: [
        [0, 4],
        [8, 4],
      ],
      end: [8, 4],
    },
    {
      start: [19, 0],
      corners: [
        [19, 3],
        [11, 3],
      ],
      end: [11, 3],
    },
    {
      start: [0, 11],
      corners: [
        [0, 8],
        [7, 8],
      ],
      end: [7, 8],
    },
    {
      start: [19, 11],
      corners: [
        [19, 8],
        [12, 8],
      ],
      end: [12, 8],
    },

    // // Edge-based beams from corners
    // { start: [0, 2], corners: [[6, 2], [6, 9]], end: [6, 11] },
    // { start: [19, 3], corners: [[13, 3], [13, 1]], end: [13, 0] },
    // { start: [2, 0], corners: [[2, 5], [16, 5]], end: [19, 5] },
    // { start: [17, 11], corners: [[17, 7], [3, 7]], end: [0, 7] },

    // // Diagonal-style corner beams
    // { start: [0, 1], corners: [[3, 1], [3, 4], [15, 4], [15, 10]], end: [18, 10] },
    // { start: [19, 2], corners: [[16, 2], [16, 9], [4, 9], [4, 1]], end: [1, 1] },
  ];

  const createPath = (beam: Beam): string => {
    const { start, end, corners = [] } = beam;
    let pathData = `M ${start[0] * gridSize + gridSize / 2} ${
      start[1] * gridSize + gridSize / 2
    }`;

    corners.forEach((corner: [number, number]) => {
      pathData += ` L ${corner[0] * gridSize + gridSize / 2} ${
        corner[1] * gridSize + gridSize / 2
      }`;
    });

    pathData += ` L ${end[0] * gridSize + gridSize / 2} ${
      end[1] * gridSize + gridSize / 2
    }`;
    return pathData;
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${cols * gridSize} ${rows * gridSize}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0"
    >
      {/* Grid lines */}
      <defs>
        <pattern
          id="grid"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="rgb(200 200 200)"
            strokeWidth="0.3"
            opacity="0.1"
          />
        </pattern>

        {/* Enhanced gradient for corner beams */}
        <linearGradient id="beamGradient" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0" />
          <stop offset="15%" stopColor="rgb(79 70 229)" stopOpacity="0.4" />
          <stop offset="50%" stopColor="rgb(139 92 246)" stopOpacity="1" />
          <stop offset="85%" stopColor="rgb(79 70 229)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0" />
        </linearGradient>

        {/* Corner highlight gradient */}
        <radialGradient id="cornerGlow" gradientUnits="userSpaceOnUse" r="30">
          <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0.8" />
          <stop offset="50%" stopColor="rgb(79 70 229)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Grid background */}
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Corner glow effects */}
      <circle cx="0" cy="0" r="30" fill="url(#cornerGlow)" opacity="0.3" />
      <circle
        cx={cols * gridSize}
        cy="0"
        r="30"
        fill="url(#cornerGlow)"
        opacity="0.3"
      />
      <circle
        cx="0"
        cy={rows * gridSize}
        r="30"
        fill="url(#cornerGlow)"
        opacity="0.3"
      />
      <circle
        cx={cols * gridSize}
        cy={rows * gridSize}
        r="30"
        fill="url(#cornerGlow)"
        opacity="0.3"
      />

      {/* Animated beams */}
      {beamPaths.map((beam, index) => (
        <motion.path
          key={index}
          d={createPath(beam)}
          fill="none"
          stroke="gray"
          strokeWidth="0.2"
          strokeLinecap="round"
          variants={beamVariants}
          initial="initial"
          animate="animate"
          style={{
            filter: "drop-shadow(0 0 6px rgba(139, 92, 246, 0.6))",
          }}
        />
      ))}

      {/* Grid intersection dots */}
      {Array.from({ length: rows + 1 }, (_, row) =>
        Array.from({ length: cols + 1 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={col * gridSize}
            cy={row * gridSize}
            r="1"
            fill="rgb(113 113 122)"
            opacity="0.4"
          />
        )),
      )}

      {/* Corner indicator dots */}
      <circle cx="0" cy="0" r="2" fill="rgb(139 92 246)" opacity="0.8" />
      <circle
        cx={cols * gridSize}
        cy="0"
        r="2"
        fill="rgb(139 92 246)"
        opacity="0.8"
      />
      <circle
        cx="0"
        cy={rows * gridSize}
        r="2"
        fill="rgb(139 92 246)"
        opacity="0.8"
      />
      <circle
        cx={cols * gridSize}
        cy={rows * gridSize}
        r="2"
        fill="rgb(139 92 246)"
        opacity="0.8"
      />
    </svg>
  );
};
