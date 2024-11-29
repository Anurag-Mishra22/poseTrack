"use client";
import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";

const KEYBOARD_LAYOUT = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
    ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
    ["BS", "SPACE"]
];

export default function VirtualKeyboard() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [detector, setDetector] = useState<handpose.HandPose | null>(null);
    const [videoReady, setVideoReady] = useState(false);
    const [outputText, setOutputText] = useState("");
    const [isCooldownActive, setCooldownActive] = useState(false);
    const [pressedKey, setPressedKey] = useState<string | null>(null);
    const [wait, setWait] = useState(1);

    const cooldownTime = 1000;
    const lastKeyPressed = useRef<string | null>(null);
    const previousKeypoints = useRef<any[]>([]);
    const smoothingFactor = 0.7;

    useEffect(() => {
        const initHandPose = async () => {
            try {
                await tf.setBackend("webgl");
                await tf.ready();
                const model = await handpose.load();
                setDetector(model);
            } catch (error) {
                console.error("Error initializing handpose model:", error);
            }
        };
        initHandPose();
    }, []);

    useEffect(() => {
        const initCamera = async () => {
            if (videoRef.current) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: 640,
                            height: 480
                        }
                    });
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => setVideoReady(true);
                } catch (error) {
                    console.error("Error initializing camera:", error);
                }
            }
        };
        initCamera();
    }, []);

    const smoothPositions = (currentPoints: any[], previousPoints: any[]) => {
        if (!previousPoints.length) return currentPoints;
        return currentPoints.map((point, index) => {
            const prev = previousPoints[index];
            if (!prev) return point;
            return [
                prev[0] * smoothingFactor + point[0] * (1 - smoothingFactor),
                prev[1] * smoothingFactor + point[1] * (1 - smoothingFactor),
                prev[2] * smoothingFactor + point[2] * (1 - smoothingFactor)
            ];
        });
    };

    useEffect(() => {
        const detectHand = async () => {
            if (detector && videoRef.current && canvasRef.current && videoReady) {
                try {
                    const predictions = await detector.estimateHands(videoRef.current);
                    const ctx = canvasRef.current.getContext("2d");

                    if (predictions.length > 0 && ctx) {
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                        const currentKeypoints = predictions[0].landmarks;
                        const smoothedKeypoints = smoothPositions(currentKeypoints, previousKeypoints.current);
                        previousKeypoints.current = smoothedKeypoints;

                        drawKeyboard(ctx, smoothedKeypoints);
                        drawHandPoints(ctx, smoothedKeypoints);
                    }
                } catch (error) {
                    console.error("Error during hand detection:", error);
                }
                requestAnimationFrame(detectHand);
            }
        };
        detectHand();
    }, [detector, videoReady]);

    const drawKeyboard = (ctx: CanvasRenderingContext2D, keypoints: number[][]) => {
        const indexTip = keypoints[8];
        const thumbTip = keypoints[4];
        const pinchDistance = Math.sqrt(
            Math.pow(indexTip[0] - thumbTip[0], 2) +
            Math.pow(indexTip[1] - thumbTip[1], 2)
        );
        setWait(0);

        KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
            row.forEach((key, colIndex) => {
                const x = 50 + colIndex * 60;
                const y = 50 + rowIndex * 60;
                const width = 50;
                const height = 50;

                // Change color based on pressed state
                ctx.fillStyle = key === pressedKey ? "#4CAF50" : "#333";
                ctx.fillRect(x, y, width, height);

                // Add key highlight effect
                if (key === pressedKey) {
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, width, height);
                }

                ctx.fillStyle = "#fff";
                ctx.font = "20px Arial";
                ctx.fillText(key, x + 10, y + 30);

                const keyCenter = {
                    x: x + width / 2,
                    y: y + height / 2
                };

                const fingerDistance = Math.sqrt(
                    Math.pow(indexTip[0] - keyCenter.x, 2) +
                    Math.pow(indexTip[1] - keyCenter.y, 2)
                );

                if (fingerDistance < 25 && pinchDistance < 40 && !isCooldownActive) {
                    handleKeyPress(key);
                }
            });
        });
    };

    const drawHandPoints = (ctx: CanvasRenderingContext2D, keypoints: number[][]) => {
        const indexTip = keypoints[8];
        const thumbTip = keypoints[4];

        [indexTip, thumbTip].forEach((point, i) => {
            ctx.beginPath();
            ctx.arc(point[0], point[1], 5, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? "#00ff00" : "#ff0000";
            ctx.fill();
        });

        ctx.beginPath();
        ctx.moveTo(indexTip[0], indexTip[1]);
        ctx.lineTo(thumbTip[0], thumbTip[1]);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    const handleKeyPress = (key: string) => {
        if (isCooldownActive || lastKeyPressed.current === key) return;

        setPressedKey(key);

        switch (key) {
            case "SPACE":
                setOutputText(prev => prev + " ");
                break;
            case "BS":
                setOutputText(prev => prev.slice(0, -1));
                break;
            default:
                setOutputText(prev => prev + key);
        }

        lastKeyPressed.current = key;
        setCooldownActive(true);
        setTimeout(() => {
            setCooldownActive(false);
            lastKeyPressed.current = null;
            setPressedKey(null);
        }, cooldownTime);
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 p-4">
            <div className="relative w-full md:w-[640px] aspect-video hidden md:flex">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                    autoPlay
                    playsInline
                    muted
                />
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute inset-0 w-full h-full"
                />
                <div
                    className="absolute top-2 left-2 gap-x-6 "

                >
                    {
                        wait === 1 ? <div className="text-2xl text-black border-2 rounded-[12px] bg-white border-black p-2">Detecting...</div> : null
                    }
                </div>

            </div>
            <div className="flex-1 p-4 bg-gray-800  rounded-lg">
                <h2 className="text-xl text-white mb-4 ">Output Text:</h2>
                <div className="bg-white p-4 rounded min-h-[400px] text-lg max-w-[480px]">
                    {outputText || "Start typing..."}
                </div>
            </div>
        </div>
    );
}