"use client";

import React, { useEffect } from "react";
import styles from "./EngineeringDrawing.module.css";

interface Props {
    onClose: () => void;
}

type GeomBox = { x: number, y: number, z: number, w: number, h: number, d: number, class: string };
type GeomCyl = { x: number, y: number, z: number, r: number, h: number, axis: 'X' | 'Y' | 'Z', class: string };
type GeomLine = { pts: [number, number, number][], r: number, class: string };

const boxes: GeomBox[] = [];
const cyls: GeomCyl[] = [];
const lines: GeomLine[] = [];

// Base Cabinet setup matching GeometryBuilder exactly
boxes.push({ x: 0, y: 500, z: -50, w: 600, h: 1000, d: 100, class: 'med' }); // wallFrame
boxes.push({ x: 0, y: 500, z: 1225, w: 700, h: 1100, d: 50, class: 'thick fill-solid' }); // farWall
boxes.push({ x: -325, y: 500, z: 575, w: 50, h: 1100, d: 1350, class: 'thick fill-solid' }); // leftWall
boxes.push({ x: 0, y: 1025, z: 575, w: 700, h: 50, d: 1350, class: 'thick fill-solid' }); // roof
boxes.push({ x: 0, y: -25, z: 575, w: 700, h: 50, d: 1350, class: 'thick fill-solid' }); // floor

// Intake Plenums & Ducting
boxes.push({ x: -220, y: 950, z: -50, w: 60, h: 60, d: 75, class: 'hidden' });
boxes.push({ x: 220, y: 950, z: -50, w: 60, h: 60, d: 75, class: 'hidden' });
cyls.push({ x: -220, y: 950, z: -109.5, r: 24, h: 40, axis: 'Z', class: 'med' });
cyls.push({ x: 220, y: 950, z: -109.5, r: 24, h: 40, axis: 'Z', class: 'med' });
cyls.push({ x: -220, y: 950, z: -52, r: 18, h: 60, axis: 'Z', class: 'hidden' });
cyls.push({ x: 220, y: 950, z: -52, r: 18, h: 60, axis: 'Z', class: 'hidden' });

// Humidifier / Heater (in AHU space)
boxes.push({ x: 0, y: 825, z: -50, w: 50, h: 50, d: 50, class: 'med' });
boxes.push({ x: 40, y: 625, z: -50, w: 50, h: 50, d: 50, class: 'med' });

// Compartments
[250, 750].forEach(y => {
    // Structural layers of compartment
    boxes.push({ x: 0, y: y - 187.5, z: 600, w: 600, h: 4, d: 1200, class: 'thick' });
    boxes.push({ x: 0, y: y + 187.5, z: 600, w: 600, h: 4, d: 1200, class: 'thick' });
    boxes.push({ x: -298, y, z: 600, w: 4, h: 375, d: 1200, class: 'thick' });
    boxes.push({ x: 0, y, z: 1198, w: 600, h: 375, d: 4, class: 'med' });

    // Front Doors (Right side +X)
    boxes.push({ x: 300, y, z: 600, w: 10, h: 375, d: 1200, class: 'med' });
    boxes.push({ x: 298, y, z: 600, w: 4, h: 335, d: 1160, class: 'thin' });

    // Roller racks and egg elements
    for (let r = 0; r < 6; r++) {
        const rZ = 125 + r * 190;
        const rY = y - 167.5;
        boxes.push({ x: 0, y: rY, z: rZ, w: 540, h: 5, d: 40, class: 'thin' });
        for (let e = 0; e < 5; e++) {
            const ex = -240 + e * 120;
            cyls.push({ x: ex, y: rY + 5, z: rZ, r: 20, h: 10, axis: 'Y', class: 'thin' });
            boxes.push({ x: ex, y: rY + 18, z: rZ, w: 40, h: 55, d: 40, class: 'thin' }); // Simplified egg bound
        }
    }
});

// Exhaust
boxes.push({ x: -220, y: 100, z: 1250, w: 60, h: 60, d: 50, class: 'hidden' });
boxes.push({ x: 220, y: 100, z: 1250, w: 60, h: 60, d: 50, class: 'hidden' });
cyls.push({ x: -220, y: 100, z: 1280, r: 20, h: 40, axis: 'Z', class: 'med' });
cyls.push({ x: 220, y: 100, z: 1280, r: 20, h: 40, axis: 'Z', class: 'med' });
cyls.push({ x: 0, y: 450, z: 1250, r: 10, h: 700, axis: 'Y', class: 'thick' });


export function EngineeringDrawing({ onClose }: Props) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // A dim line generic component rendering standard drafting arrows
    const DimLine = ({ x1, y1, x2, y2, label, offset = 0, axis = 'X' }: any) => {
        const dx = axis === 'X' ? 0 : offset;
        const dy = axis === 'Y' ? 0 : offset;

        return (
            <g className="dim" transform={`translate(${dx}, ${dy})`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth="2" />
                <polygon points={`${x1},${y1} ${x1 + (axis === 'X' ? 15 : 0)},${y1 + (axis === 'Y' ? 15 : 0)} ${x1 + (axis === 'X' ? 15 : -5)},${y1 + (axis === 'Y' ? 15 : -5)}`} fill="#000" />
                <polygon points={`${x2},${y2} ${x2 - (axis === 'X' ? 15 : 0)},${y2 - (axis === 'Y' ? 15 : 0)} ${x2 - (axis === 'X' ? 15 : -5)},${y2 - (axis === 'Y' ? 15 : -5)}`} fill="#000" />

                <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 10} textAnchor="middle" className="text-dim">
                    {label}
                </text>

                <line x1={x1 - dx * 1.5} y1={y1 - dy * 1.5} x2={x1} y2={y1} stroke="#000" strokeWidth="1" />
                <line x1={x2 - dx * 1.5} y1={y2 - dy * 1.5} x2={x2} y2={y2} stroke="#000" strokeWidth="1" />
            </g>
        );
    }

    const renderFront = () => (
        <g transform="translate(450, 1850) scale(1, -1)">
            {/* Outline bounds */}
            {boxes.map((b, i) => <rect key={`f-b-${i}`} x={b.z - b.d / 2} y={b.y - b.h / 2} width={b.d} height={b.h} className={b.class} rx={0} />)}
            {cyls.map((c, i) => {
                if (c.axis === 'X') return <circle key={`f-cx-${i}`} cx={c.z} cy={c.y} r={c.r} className={c.class} />;
                if (c.axis === 'Y') return <rect key={`f-cy-${i}`} x={c.z - c.r} y={c.y - c.h / 2} width={c.r * 2} height={c.h} className={c.class} />;
                if (c.axis === 'Z') return <rect key={`f-cz-${i}`} x={c.z - c.h / 2} y={c.y - c.r} width={c.h} height={c.r * 2} className={c.class} />;
            })}
        </g>
    );

    const renderTop = () => (
        <g transform="translate(450, 600) scale(1, 1)">
            {/* Outline bounds */}
            {boxes.map((b, i) => <rect key={`t-b-${i}`} x={b.z - b.d / 2} y={b.x - b.w / 2} width={b.d} height={b.w} className={b.class} />)}
            {cyls.map((c, i) => {
                if (c.axis === 'Y') return <circle key={`t-cy-${i}`} cx={c.z} cy={c.x} r={c.r} className={c.class} />;
                if (c.axis === 'X') return <rect key={`t-cx-${i}`} x={c.z - c.r} y={c.x - c.h / 2} width={c.r * 2} height={c.h} className={c.class} />;
                if (c.axis === 'Z') return <rect key={`t-cz-${i}`} x={c.z - c.h / 2} y={c.x - c.r} width={c.h} height={c.r * 2} className={c.class} />;
            })}
        </g>
    );

    const renderSide = () => (
        <g transform="translate(2400, 1850) scale(1, -1)">
            {/* Outline bounds */}
            {boxes.map((b, i) => <rect key={`s-b-${i}`} x={b.x - b.w / 2} y={b.y - b.h / 2} width={b.w} height={b.h} className={b.class} />)}
            {cyls.map((c, i) => {
                if (c.axis === 'Z') return <circle key={`s-cz-${i}`} cx={c.x} cy={c.y} r={c.r} className={c.class} />;
                if (c.axis === 'Y') return <rect key={`s-cy-${i}`} x={c.x - c.r} y={c.y - c.h / 2} width={c.r * 2} height={c.h} className={c.class} />;
                if (c.axis === 'X') return <rect key={`s-cx-${i}`} x={c.x - c.h / 2} y={c.y - c.r} width={c.h} height={c.r * 2} className={c.class} />;
            })}
        </g>
    );

    return (
        <div className={styles.overlay}>
            <div className={styles.blueprintContainer}>
                <button className={styles.closeBtn} onClick={onClose}>
                    CLOSE DRAWING [ESC]
                </button>

                <svg viewBox="0 0 2970 2100" className={styles.svgDrawing} xmlns="http://www.w3.org/2000/svg">
                    <style>
                        {`
                          .thick { stroke: #000; stroke-width: 4px; fill: none; }
                          .med { stroke: #000; stroke-width: 2px; fill: none; }
                          .thin { stroke: #000; stroke-width: 1px; fill: none; }
                          .hidden { stroke: #000; stroke-width: 1px; stroke-dasharray: 10,10; fill: none; }
                          .dashed { stroke: #000; stroke-width: 2px; stroke-dasharray: 20,10; fill: none; }
                          .fill-solid { fill: rgba(0,0,0,0.03); }
                          .text { fill: #000; font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; }
                          .text-small { fill: #000; font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; }
                          .text-dim { fill: #000; font-family: 'Courier New', monospace; font-size: 24px; }
                          .bg-paper { fill: #ffffff; }
                        `}
                    </style>

                    {/* Outer frame matching ISO standards */}
                    <rect x="50" y="50" width="2870" height="2000" className="thick" />
                    <rect x="65" y="65" width="2840" height="1970" className="thin" />

                    {/* FRONT VIEW (Z-Y Plane, mapped as if looking at +X facing origin) */}
                    <g id="V-FRONT">
                        {renderFront()}
                        <text x="1100" y="1950" className="text" textAnchor="middle">FRONT ELEVATION</text>
                        <text x="1100" y="1980" className="text-small" textAnchor="middle">SCALE 1:4 • LOOKING FROM +X (DOORS END)</text>

                        {/* Overall Dimensions mapping based on translation: Z to right, Y up */}
                        <DimLine x1={450 - 50} y1={1850 + 50} x2={450 + 1225} y2={1850 + 50} label="1275 mm" offset={100} axis="X" />
                        <DimLine x1={450 - 150} y1={1850 + 50} x2={450 - 150} y2={1850 - 1050} label="1100 mm" offset={-100} axis="Y" />
                    </g>

                    {/* TOP VIEW (Z-X Plane) */}
                    <g id="V-TOP">
                        {renderTop()}
                        <text x="1100" y="1050" className="text" textAnchor="middle">PLAN VIEW</text>
                        <text x="1100" y="1080" className="text-small" textAnchor="middle">SCALE 1:4 • LOOKING FROM +Y (ROOF REMOVED)</text>

                        {/* Top view dimensions */}
                        <DimLine x1={450 - 150} y1={600 - 325} x2={450 - 150} y2={600 + 350} label="675 mm" offset={-100} axis="Y" />
                    </g>

                    {/* SIDE VIEW (X-Y Plane) */}
                    <g id="V-SIDE">
                        {renderSide()}
                        <text x="2400" y="1950" className="text" textAnchor="middle">END ELEVATION</text>
                        <text x="2400" y="1980" className="text-small" textAnchor="middle">SCALE 1:4 • LOOKING FROM +Z (EXHAUST VIEW)</text>

                        {/* Side view dimensions */}
                        <DimLine x1={2400 - 325} y1={1850 + 50} x2={2400 + 350} y2={1850 + 50} label="675 mm" offset={100} axis="X" />
                    </g>

                    {/* TITLE BLOCK */}
                    <g transform="translate(1905, 1735)">
                        <rect x="0" y="0" width="1000" height="300" className="thick bg-paper" />

                        {/* Grid Lines */}
                        <line x1="0" y1="50" x2="1000" y2="50" className="med" />
                        <line x1="0" y1="100" x2="1000" y2="100" className="med" />
                        <line x1="0" y1="200" x2="1000" y2="200" className="med" />
                        <line x1="600" y1="0" x2="600" y2="200" className="med" />
                        <line x1="800" y1="0" x2="800" y2="200" className="med" />
                        <line x1="600" y1="150" x2="1000" y2="150" className="thin" />

                        {/* Title Block Content */}
                        <text x="20" y="35" className="text-small">DRAWING TITLE:</text>
                        <text x="300" y="80" className="text" textAnchor="middle">DETAILED INCUBATOR GEOMETRY</text>
                        <text x="300" y="120" className="text" textAnchor="middle">ORTHOGRAPHIC PROJECTIONS v4.0</text>

                        <text x="610" y="35" className="text-small">DRAWN BY:</text>
                        <text x="700" y="80" className="text" textAnchor="middle">Isaac Muigai</text>

                        <text x="810" y="35" className="text-small">DATE:</text>
                        <text x="900" y="80" className="text" textAnchor="middle">{new Date().toLocaleDateString()}</text>

                        <text x="610" y="135" className="text-small">CHECKED:</text>
                        <text x="700" y="185" className="text" textAnchor="middle">AI SYS</text>

                        <text x="810" y="135" className="text-small">APPROVED:</text>
                        <text x="900" y="185" className="text" textAnchor="middle">IM</text>

                        <text x="20" y="230" className="text-small">GENERAL TOLERANCES ISO 2768-mH</text>
                        <text x="20" y="260" className="text-small">MATERIAL: STAINLESS STEEL 304 / INSULATION</text>
                        <text x="20" y="290" className="text-small">DIMENSIONS IN MILLIMETERS UNLESS SPECIFIED</text>

                        <text x="800" y="260" className="text" textAnchor="middle" fontSize="48px">A1</text>
                    </g>
                </svg>
            </div>
        </div>
    );
}
