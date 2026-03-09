export const mockTemperatureData = Array.from({ length: 24 }).map((_, i) => ({
    time: `${(i + 10) % 24}:00`,
    actual: 37.5 + (Math.random() * 0.4 - 0.2), // Target: 37.5
    optimal: 37.5,
}));

export const mockHumidityData = Array.from({ length: 24 }).map((_, i) => ({
    time: `${(i + 10) % 24}:00`,
    actual: 55 + (Math.random() * 5 - 2.5), // Target: 55%
    optimal: 55,
}));

export const mockOperationalMetrics = {
    eggTilts: 48,
    tiltFailures: 0,
    valvesOpen: 2,
    totalValves: 4,
    fanSpeedLeft: 100, // %
    fanSpeedRight: 100, // %
    heaterStatus: "Pulsing Active",
    mistifierStatus: "Idle",
    doorStatus: "Locked",
};

export const incubatorModels = [
    {
        id: "main",
        title: "Full Incubator System",
        description: "Complete 3D view of the dual-zone incubator with airflow simulation.",
        status: "Active",
    },
    {
        id: "ahu",
        title: "Air Handling Unit",
        description: "Detailed view of the thermal processing and humidification core.",
        status: "Available",
    },
    {
        id: "tilting",
        title: "Mechanical Tilting Rack",
        description: "Simulation of the stepper motor and egg roller mechanisms.",
        status: "Available",
    },
    {
        id: "humidification",
        title: "Humidification Chamber",
        description: "Simulation of the mist generation and mixing process.",
        status: "Available",
    },
];
