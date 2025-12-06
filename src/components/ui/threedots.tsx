import React from 'react';

const ThreeDotsMoveIcon = ({
  size = 48,
  color = '#000000',
  strokeWidth = undefined,
  background = 'transparent',
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0
}) => {
  const transforms = [];
  if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
  if (flipHorizontal) transforms.push('scaleX(-1)');
  if (flipVertical) transforms.push('scaleY(-1)');

  const viewBoxSize = 24 + (padding * 2);
  const viewBoxOffset = -padding;
  const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        opacity,
        transform: transforms.join(' ') || undefined,
        filter: shadow > 0 ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))` : undefined,
        backgroundColor: background !== 'transparent' ? background : undefined
      }}
    >
      <circle cx="4" cy="12" r="0" fill="currentColor"><animate fill="freeze" attributeName="r" begin="0;SVGUppsBdVN.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3"/><animate fill="freeze" attributeName="cx" begin="SVGqCgsydxJ.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12"/><animate fill="freeze" attributeName="cx" begin="SVG3PwDNd6F.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20"/><animate id="SVG3V8yEdYE" fill="freeze" attributeName="r" begin="SVG6wCQhd9Q.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0"/><animate id="SVGUppsBdVN" fill="freeze" attributeName="cx" begin="SVG3V8yEdYE.end" dur="0.001s" values="20;4"/></circle><circle cx="4" cy="12" r="3" fill="currentColor"><animate fill="freeze" attributeName="cx" begin="0;SVGUppsBdVN.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12"/><animate fill="freeze" attributeName="cx" begin="SVGqCgsydxJ.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20"/><animate id="SVG4PgJdbds" fill="freeze" attributeName="r" begin="SVG3PwDNd6F.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0"/><animate id="SVG6wCQhd9Q" fill="freeze" attributeName="cx" begin="SVG4PgJdbds.end" dur="0.001s" values="20;4"/><animate fill="freeze" attributeName="r" begin="SVG6wCQhd9Q.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3"/></circle><circle cx="12" cy="12" r="3" fill="currentColor"><animate fill="freeze" attributeName="cx" begin="0;SVGUppsBdVN.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20"/><animate id="SVG38aCdcdI" fill="freeze" attributeName="r" begin="SVGqCgsydxJ.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0"/><animate id="SVG3PwDNd6F" fill="freeze" attributeName="cx" begin="SVG38aCdcdI.end" dur="0.001s" values="20;4"/><animate fill="freeze" attributeName="r" begin="SVG3PwDNd6F.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3"/><animate fill="freeze" attributeName="cx" begin="SVG6wCQhd9Q.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12"/></circle><circle cx="20" cy="12" r="3" fill="currentColor"><animate id="SVGwaWzveSq" fill="freeze" attributeName="r" begin="0;SVGUppsBdVN.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="3;0"/><animate id="SVGqCgsydxJ" fill="freeze" attributeName="cx" begin="SVGwaWzveSq.end" dur="0.001s" values="20;4"/><animate fill="freeze" attributeName="r" begin="SVGqCgsydxJ.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="0;3"/><animate fill="freeze" attributeName="cx" begin="SVG3PwDNd6F.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="4;12"/><animate fill="freeze" attributeName="cx" begin="SVG6wCQhd9Q.end" calcMode="spline" dur="0.5s" keySplines=".36,.6,.31,1" values="12;20"/></circle>
    </svg>
  );
};

export default ThreeDotsMoveIcon;