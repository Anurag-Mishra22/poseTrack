"use client";
import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import { useLeftCurl } from "@/store/useLeftCurl";

const keys = [
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
    const setStageL = useLeftCurl((state: any) => state.setStageL);
    const stageL = useLeftCurl((state: any) => state.stageL);

    const [isCooldownActive, setCooldownActive] = useState(false);
    const cooldownTime = 3000;
    const lastKeyPressed = useRef<string | null>(null);

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
            try {
                if (videoRef.current) {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true
                    });
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current!.width = videoRef.current!.videoWidth;
                        videoRef.current!.height = videoRef.current!.videoHeight;
                        setVideoReady(true);
                    };
                }
            } catch (error) {
                console.error("Error initializing video stream:", error);
            }
        };

        initCamera();
    }, []);

    useEffect(() => {
        if (detector && videoReady) {
            detectHand();
        }
    }, [detector, videoReady]);

    const detectHand = async () => {
        if (detector && videoRef.current && canvasRef.current && videoReady) {
            try {
                const predictions = await detector.estimateHands(videoRef.current);
                if (predictions.length > 0) {
                    const ctx = canvasRef.current.getContext("2d");
                    if (ctx) {
                        ctx.clearRect(
                            0,
                            0,
                            canvasRef.current.width,
                            canvasRef.current.height
                        );
                        const keypoints = predictions[0].landmarks;
                        detectPinchGesture(keypoints);
                        drawKeyboard(keypoints);
                        drawDotsAndLines(ctx, keypoints);
                    }
                }
            } catch (error) {
                console.error("Error during hand detection:", error);
            }
        }
        requestAnimationFrame(detectHand);
    };

    const detectPinchGesture = (keypoints: any) => {
        const indexTip = keypoints[8];
        const thumbTip = keypoints[4];
        const distance = Math.sqrt(
            Math.pow(indexTip[0] - thumbTip[0], 2) +
            Math.pow(indexTip[1] - thumbTip[1], 2)
        );

        if (distance < 10) {
            console.log("Pinch gesture detected.");
        }
    };

    const drawDotsAndLines = (ctx: CanvasRenderingContext2D, keypoints: any) => {
        const indexTip = keypoints[8]; // Index finger tip
        const thumbTip = keypoints[4]; // Thumb tip

        console.log("Index tip:", indexTip);

        // Draw dot on index tip
        ctx.beginPath();
        ctx.arc(indexTip[0], indexTip[1], 5, 0, Math.PI * 2);
        ctx.fillStyle = "red";
        ctx.fill();

        // Draw dot on thumb tip
        ctx.beginPath();
        ctx.arc(thumbTip[0], thumbTip[1], 5, 0, Math.PI * 2);
        ctx.fillStyle = "blue";
        ctx.fill();

        // Draw line between index and thumb
        ctx.beginPath();
        ctx.moveTo(indexTip[0], indexTip[1]);
        ctx.lineTo(thumbTip[0], thumbTip[1]);
        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    const drawKeyboard = (keypoints: any) => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
                ctx.clearRect(
                    0,
                    0,
                    canvasRef.current.width,
                    canvasRef.current.height
                );
            }

            keys.forEach((row, rowIndex) => {
                row.forEach((key, colIndex) => {
                    const x = 50 + colIndex * 100;
                    const y = 50 + rowIndex * 100;
                    const width = 40;
                    const height = 40;

                    if (ctx) {
                        ctx.fillStyle = "#fff";
                        ctx.font = "30px Arial";
                        ctx.fillText(key, x + 10, y + 40);

                        const indexTip = keypoints[8];
                        const thumbTip = keypoints[4];

                        const distance = Math.sqrt(
                            Math.pow(indexTip[0] - (x + width / 2), 2) +
                            Math.pow(indexTip[1] - (y + height / 2), 2)
                        );

                        const pinchDistance = Math.sqrt(
                            Math.pow(indexTip[0] - thumbTip[0], 2) +
                            Math.pow(indexTip[1] - thumbTip[1], 2)
                        );

                        if (distance < 30 && pinchDistance < 30) {
                            ctx.fillStyle = "#2ecc71";
                            ctx.fillRect(x, y, width, height);
                            ctx.fillStyle = "#fff";
                            ctx.fillText(key, x + 20, y + 50);

                            handleButtonClick(key);
                        }
                    }
                });
            });
        }
    };

    const handleButtonClick = (key: string) => {
        if (isCooldownActive || lastKeyPressed.current === key) return;

        if (key === "SPACE") {
            setOutputText((prev) => prev + " ");
        } else if (key === "BS") {
            setOutputText((prev) => prev.slice(0, -1));
        } else {
            setOutputText((prev) => prev + key);
        }

        lastKeyPressed.current = key;
        setCooldownActive(true);
        setTimeout(() => {
            setCooldownActive(false);
            lastKeyPressed.current = null;
        }, cooldownTime);
    };

    return (
        <div className="flex flex-col md:flex-row gap-y-6 md:gap-x-4 mt-4 ml-4 p-4 max-w-7xl">
            <div className="webcam-container relative w-full h-screen md:max-w-[640px] md:h-96 lg:h-[480px] overflow-hidden">
                {/* Overlay Background */}
                <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50 z-10"></div>

                <video
                    ref={videoRef}
                    className="absolute top-0 left-0 w-full h-full object-cover rounded-[12px] z-0"
                    autoPlay
                    muted
                    playsInline
                />
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none z-20"
                />
            </div>

            <div className="flex flex-col gap-y-4 w-full justify-center max-w-[400px]">
                <h2 className="max-w-[400px] text-xl">Output Text: {outputText}</h2>
            </div>
        </div>
    );
}
