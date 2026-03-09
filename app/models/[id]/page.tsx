"use client";

import { use } from "react";
import { IncubatorApp } from "@/components/incubator/IncubatorApp";
import { HeatingSystemModel } from "@/components/incubator/HeatingSystemModel";
import { TiltingMechanismModel } from "@/components/incubator/TiltingMechanismModel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ModelPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    // In a real application, we might pass the `id` down to `IncubatorApp` 
    // to load different configurations (e.g., AHU only, Tilting Rack, etc.).
    // For now, we'll render the main IncubatorApp for all IDs, 
    // or log which ID is being accessed.

    return (
        <div className="relative w-full h-screen bg-neutral-950">
            <div className="absolute top-6 left-[300px] z-50">
                <Link
                    href="/"
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-700/50 backdrop-blur-md transition-all group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </Link>
            </div>

            {/* Render the core IncubatorApp component - we can pass `modelId={id}` later if needed to customize the 3D scene */}
            {id === "ahu" ? <HeatingSystemModel /> : id === "tilting" ? <TiltingMechanismModel /> : <IncubatorApp />}
        </div>
    );
}
