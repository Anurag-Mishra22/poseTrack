"use client";
import React, { useEffect, useRef, useState } from "react";

interface SkeletonConfig {
    circleBackgroundColor: string;
    circleRadius: number;
    circleStrokeColor: string;
    circleStrokeSize: number;
    lineStrokeColor: string;
    lineStrokeSize: number;
}

// BlazePose-inspired skeleton connections
const POSE_CONNECTIONS = [
    // Face
    [0, 1], [0, 2],           // Nose to eyes
    [1, 3], [2, 4],           // Eyes to ears
    [5, 6],                   // Mouth

    // Torso
    [7, 8],                   // Shoulders
    [7, 13], [8, 13],         // Shoulders to center
    [13, 14], [13, 15],       // Center to hips
    [14, 15],                 // Hip connection

    // Arms
    [7, 9], [9, 11],         // Left arm
    [8, 10], [10, 12],       // Right arm

    // Legs
    [14, 16], [16, 18],      // Left leg
    [15, 17], [17, 19],      // Right leg

    // Feet
    [18, 20],                // Left ankle to foot
    [19, 21]                 // Right ankle to foot
];
const Skeleton: React.FC<{
    keypoints: Array<{ x: number; y: number }>;
    config: SkeletonConfig;
    width: number;
    height: number;
}> = ({ keypoints, config, width, height }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const drawSkeleton = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Enable line smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw connections (lines) with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.strokeStyle = config.lineStrokeColor;
        ctx.lineWidth = config.lineStrokeSize;

        POSE_CONNECTIONS.forEach(([start, end]) => {
            if (keypoints[start] && keypoints[end]) {
                // Create gradient for lines
                const gradient = ctx.createLinearGradient(
                    keypoints[start].x,
                    keypoints[start].y,
                    keypoints[end].x,
                    keypoints[end].y
                );
                gradient.addColorStop(0, config.lineStrokeColor);
                gradient.addColorStop(1, adjustColor(config.lineStrokeColor, -20));

                ctx.beginPath();
                ctx.strokeStyle = gradient;
                ctx.moveTo(keypoints[start].x, keypoints[start].y);
                ctx.lineTo(keypoints[end].x, keypoints[end].y);
                ctx.stroke();
            }
        });

        // Reset shadow for circles
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Draw keypoints (circles) with gradient
        keypoints.forEach((point) => {
            // Create radial gradient
            const gradient = ctx.createRadialGradient(
                point.x - config.circleRadius / 3,
                point.y - config.circleRadius / 3,
                0,
                point.x,
                point.y,
                config.circleRadius
            );
            gradient.addColorStop(0, lightenColor(config.circleBackgroundColor, 30));
            gradient.addColorStop(1, config.circleBackgroundColor);

            ctx.beginPath();
            ctx.arc(point.x, point.y, config.circleRadius, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Add highlight effect
            ctx.strokeStyle = config.circleStrokeColor;
            ctx.lineWidth = config.circleStrokeSize;
            ctx.stroke();

            // Add small highlight dot
            ctx.beginPath();
            ctx.arc(
                point.x - config.circleRadius / 3,
                point.y - config.circleRadius / 3,
                config.circleRadius / 4,
                0,
                2 * Math.PI
            );
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
        });
    };

    // Helper functions for color manipulation
    const adjustColor = (color: string, amount: number): string => {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    };

    const lightenColor = (color: string, percent: number): string => {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const amt = Math.round(2.55 * percent);
        const r = Math.min(255, Math.max(0, (num >> 16) + amt));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    };

    useEffect(() => {
        drawSkeleton();
    }, [keypoints, config]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ border: "1px solid #000" }}
        />
    );
};

// Example usage
const Skeletons = () => {
    const [circleBackground, setCircleBackground] = useState("#FF0000");
    const [circleStroke, setCircleStroke] = useState("#0000FF");
    const [lineStroke, setLineStroke] = useState("#0000FF");
    const [circleRadius, setCircleRadius] = useState(4);
    const [circleStrokeSize, setCircleStrokeSize] = useState(1);
    const [lineStrokeSize, setLineStrokeSize] = useState(2);

    const sampleKeypoints = [
        // Head and face (0-6)
        { x: 320, y: 100 },  // 0: Nose
        { x: 310, y: 90 },   // 1: Left eye
        { x: 330, y: 90 },   // 2: Right eye
        { x: 300, y: 95 },   // 3: Left ear
        { x: 340, y: 95 },   // 4: Right ear
        { x: 310, y: 110 },  // 5: Mouth left
        { x: 330, y: 110 },  // 6: Mouth right

        // Upper body (7-12)
        { x: 290, y: 150 },  // 7: Left shoulder
        { x: 350, y: 150 },  // 8: Right shoulder
        { x: 260, y: 200 },  // 9: Left elbow
        { x: 380, y: 200 },  // 10: Right elbow
        { x: 240, y: 250 },  // 11: Left wrist
        { x: 400, y: 250 },  // 12: Right wrist

        // Torso and hips (13-15)
        { x: 320, y: 220 },  // 13: Body center
        { x: 300, y: 280 },  // 14: Left hip
        { x: 340, y: 280 },  // 15: Right hip

        // Legs (16-19)
        { x: 290, y: 350 },  // 16: Left knee
        { x: 350, y: 350 },  // 17: Right knee
        { x: 285, y: 430 },  // 18: Left ankle
        { x: 355, y: 430 },  // 19: Right ankle

        // Feet (20-21)
        { x: 275, y: 440 },  // 20: Left foot
        { x: 365, y: 440 }   // 21: Right foot
    ];

    const config: SkeletonConfig = {
        circleBackgroundColor: circleBackground,
        circleRadius,
        circleStrokeColor: circleStroke,
        circleStrokeSize,
        lineStrokeColor: lineStroke,
        lineStrokeSize
    };
    return (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "20px", padding: "20px" }}>
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "20px",
                padding: "15px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
                {/* Color Controls */}
                <div>
                    <label className="mb-5 text-sm">
                        Circle Background
                    </label>
                    <input
                        type="color"
                        value={circleBackground}
                        onChange={(e) => setCircleBackground(e.target.value)}
                    />
                </div>
                <div>
                    <label className="mb-5 text-sm">
                        Circle Stroke Color
                    </label>
                    <input
                        type="color"
                        value={circleStroke}
                        onChange={(e) => setCircleStroke(e.target.value)}
                    />
                </div>
                <div>
                    <label className="mb-5 text-sm">
                        Skeleton Line Color
                    </label>
                    <input
                        type="color"
                        value={lineStroke}
                        onChange={(e) => setLineStroke(e.target.value)}
                    />
                </div>

                {/* Size Controls */}
                <div>
                    <label className="mb-5 text-sm">
                        Circle Radius
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={circleRadius}
                        onChange={(e) => setCircleRadius(Number(e.target.value))}
                        style={{ width: "100%" }}
                    />
                    <span>{circleRadius}px</span>
                </div>
                <div>
                    <label className="mb-5 text-sm">
                        Circle Stroke Size
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="5"
                        value={circleStrokeSize}
                        onChange={(e) => setCircleStrokeSize(Number(e.target.value))}
                        style={{ width: "100%" }}
                    />
                    <span>{circleStrokeSize}px</span>
                </div>
                <div>
                    <label className="mb-5 text-sm">
                        Line Stroke Size
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="5"
                        value={lineStrokeSize}
                        onChange={(e) => setLineStrokeSize(Number(e.target.value))}
                        style={{ width: "100%" }}
                    />
                    <span>{lineStrokeSize}px</span>
                </div>
            </div>

            <Skeleton
                keypoints={sampleKeypoints}
                config={config}
                width={640}
                height={480}
            />
        </div>
    );
};

export default Skeletons;
