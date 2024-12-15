"use client"
import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import *  as poseDetection from "@tensorflow-models/pose-detection";
import { useLeftCurl } from "@/store/useLeftCurl";
import { SquareCheck } from "lucide-react";
import Image from "next/image";
import { initializeTensorFlow } from "@/lib/tfjs-setup";

type Exercise = {
    heading: string;
    description: string;
};

export default function Home() {
    const Features = [
        {
            heading: "Instructions",
            description: "Keep your left hand inside the frame. Sit upright with your left arm horizontal, holding a weight. Curl the weight to your shoulder until your elbow is fully bent, then lower it back slowly.",
        },
    ];

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [detector, setDetector] = useState<any>(null);
    const [videoReady, setVideoReady] = useState(false);
    const [curlCount, setCurlCount] = useState(0);
    const setStageL = useLeftCurl((state: any) => state.setStageL);
    const stageL = useLeftCurl((state: any) => state.stageL);
    const [wait, setWait] = useState(1);
    const [leftAngle, setLeftAngle] = useState<number>(0);

    const rafId = useRef<number>();
    const lastFrameTime = useRef<number>(0);
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    useEffect(() => {
        const initPoseDetection = async () => {
            try {
                await initializeTensorFlow();

                const model = poseDetection.SupportedModels.BlazePose;
                const detector = await poseDetection.createDetector(model, {
                    runtime: "tfjs",
                    modelType: "lite",
                    maxPoses: 1,
                    enableSmoothing: true,
                    smoothingConfig: {
                        velocityFilter: {
                            windowSize: 3,
                            velocity: 10,
                            velocityScale: 0.4
                        }
                    }
                } as poseDetection.BlazePoseTfjsModelConfig);

                setDetector(detector);
            } catch (error) {
                console.error("Error initializing pose detector:", error);
            }
        };

        initPoseDetection();
        return () => {
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
            }
        };
    }, []);

    useEffect(() => {
        const initCamera = async () => {
            try {
                if (videoRef.current) {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: 640,
                            height: 480,
                            frameRate: { ideal: targetFPS }
                        }
                    });
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        if (videoRef.current) {
                            videoRef.current.width = 640;
                            videoRef.current.height = 480;
                            setVideoReady(true);
                        }
                    };
                }
            } catch (error) {
                console.error("Error initializing video stream:", error);
            }
        };

        initCamera();
    }, []);

    const calculateAngle = (A: any, B: any, C: any) => {
        const radians = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
        const angle = Math.abs((radians * 180) / Math.PI);
        return angle > 180 ? 360 - angle : angle;
    };

    const detectCurl = (keypoints: any) => {
        const leftWrist = keypoints.find((kp: any) => kp.name === "left_wrist");
        const leftElbow = keypoints.find((kp: any) => kp.name === "left_elbow");
        const leftShoulder = keypoints.find((kp: any) => kp.name === "left_shoulder");

        if (leftWrist?.score > 0.92 && leftElbow?.score > 0.8 && leftShoulder?.score > 0.8) {
            const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
            setLeftAngle(Math.round(angle)); // Round the angle for cleaner display

            if (angle > 90 && (useLeftCurl.getState() as any).stageL === "up") {
                (useLeftCurl.getState() as any).setStageL("down");
            }

            if (angle < 40 && (useLeftCurl.getState() as any).stageL === "down") {
                (useLeftCurl.getState() as any).setStageL("up");
                setCurlCount(prev => prev + 1);
            }
        } else {
            setWait(1);
        }
    };

    const drawKeypointsAndLines = (keypoints: any, ctx: any) => {
        const threshold = 0.8;
        const targetKeypoints = ["left_wrist", "left_elbow", "left_shoulder"];
        const leftWrist = keypoints.find((kp: any) => kp.name === "left_wrist");
        const leftElbow = keypoints.find((kp: any) => kp.name === "left_elbow");
        const leftShoulder = keypoints.find((kp: any) => kp.name === "left_shoulder");

        if (leftWrist?.score > 0.92 && leftElbow?.score > threshold && leftShoulder?.score > threshold) {
            setWait(0);

            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-ctx.canvas.width, 0);

            // Draw keypoints
            keypoints.forEach((point: any) => {
                if (targetKeypoints.includes(point.name) && point.score > threshold) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
                    ctx.fillStyle = "aqua";
                    ctx.fill();
                    ctx.strokeStyle = "white";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });

            // Draw lines
            ctx.lineWidth = 3;
            ctx.strokeStyle = "aqua";

            const connections = [
                ["left_shoulder", "left_elbow"],
                ["left_elbow", "left_wrist"]
            ];

            connections.forEach(([startName, endName]) => {
                const start = keypoints.find((kp: any) => kp.name === startName);
                const end = keypoints.find((kp: any) => kp.name === endName);

                if (start?.score > threshold && end?.score > threshold) {
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();
                }
            });

            ctx.restore();
        } else {
            setWait(1);
        }
    };

    const detectPose = async (timestamp: number) => {
        if (!detector || !videoRef.current || !canvasRef.current || !videoReady) {
            rafId.current = requestAnimationFrame(detectPose);
            return;
        }

        const elapsed = timestamp - lastFrameTime.current;
        if (elapsed < frameInterval) {
            rafId.current = requestAnimationFrame(detectPose);
            return;
        }
        lastFrameTime.current = timestamp;

        try {
            const poses = await detector.estimatePoses(videoRef.current, {
                maxPoses: 1,
                flipHorizontal: true, // Enable horizontal flip
                scoreThreshold: 0.7
            });

            if (poses.length > 0) {
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) {
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    drawKeypointsAndLines(poses[0].keypoints, ctx);
                    detectCurl(poses[0].keypoints);
                }
            }
        } catch (error) {
            console.error("Error during pose detection:", error);
        }

        rafId.current = requestAnimationFrame(detectPose);
    };

    useEffect(() => {
        if (detector && videoReady) {
            rafId.current = requestAnimationFrame(detectPose);
            return () => {
                if (rafId.current) {
                    cancelAnimationFrame(rafId.current);
                }
            };
        }
    }, [detector, videoReady]);

    return (
        <div className="flex flex-col md:flex-row gap-y-6 md:gap-x-4 mt-4 ml-4 p-4 max-w-7xl">
            <div className="webcam-container hidden md:flex relative w-full h-screen md:max-w-[640px] md:h-96 lg:h-[480px] overflow-hidden">
                <video
                    ref={videoRef}
                    className="absolute top-0 left-0 w-full h-full object-cover rounded-[12px] md:max-w-[640px] transform scale-x-[-1]"
                    autoPlay
                    muted
                    playsInline
                />
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none md:max-w-[640px]"
                />
                {wait === 1 ? (
                    <div className="text-2xl absolute top-2 left-2 text-black border-2 bg-white border-black p-2">
                        <div className="flex items-center gap-x-2 justify-center">
                            {/* <p>Detecting Plz bring your left hand inside frame.</p> */}
                            <div className="flex flex-col gap-4 p-2">
                                <div className="text-xl md:text-2xl lg:text-2xl font-bold">
                                    <span className="text-[#02a8c0]">Detecting</span>
                                </div>


                                <div className="flex gap-2">
                                    <SquareCheck size={30} className="text-green-500" />
                                    <p>Plz bring your Left Hand inside Frame</p>
                                </div>
                                <div className="flex gap-2">
                                    <SquareCheck size={30} className="text-green-500" />
                                    <p>Wrist, Elbow, Shoulder</p>
                                </div>
                                {/* <div className="flex gap-2">
                                    <SquareCheck size={30} className="text-green-500" />
                                    <p>Do not allow the wrist to rotate during the curl</p>
                                </div> */}
                            </div>
                            {/* <p className="animate-pulse text-4xl flex items-center justify-center">...</p> */}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="absolute top-2 left-2">
                            <div className="flex flex-col gap-y-4">
                                <div className="p-4 border-2 border-black bg-white rounded-[12px]">
                                    <div className="flex flex-row items-center gap-x-2">
                                        <Image
                                            src="/bicepcurlgif.gif"
                                            height={30}
                                            width={30}
                                            alt="bicep curl"
                                        />
                                        <p className="text-xl">{curlCount}</p>
                                    </div>
                                </div>
                                <div className="rounded-[12px] text-xl items-center justify-center flex p-4 border-2 border-black bg-white">
                                    {stageL}
                                </div>
                                <div className="rounded-[12px] text-xl items-center justify-center flex p-4 border-2 border-black bg-white">
                                    Angle: {leftAngle}°
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col gap-y-4 w-full justify-center">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold">
                    <span className="text-[#02a8c0]">Reference Video</span>
                </div>
                <video controls className="w-full h-auto rounded-[12px]">
                    <source src="/leftbicepcurl.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                <div className="grid gap-4 grid-cols-1 p-2 mb-4">
                    {Features.map((lang: Exercise, index: number) => (
                        <div
                            className={`border-[1px] rounded-md p-2 text-start gap-2 flex flex-col ${index % 2 === 0 ? "mr-0" : "ml-0"}`}
                            key={index}
                        >
                            <h3 className="text-lg font-semibold">{lang.heading}</h3>
                            <p>{lang.description}</p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-4 p-2">
                    <div className="text-3xl md:text-4xl lg:text-5xl font-bold">
                        <span className="text-[#02a8c0]">How to Perform the Exercise</span>
                    </div>
                    <p className="text-lg">
                        Ensure that your arm stays aligned with the body and that you move the weight only through your elbow joint for proper form.
                        Keep your movements slow and controlled, and avoid swinging the weight for maximum effectiveness.
                    </p>

                    <div className="flex gap-2">
                        <SquareCheck size={30} className="text-green-500" />
                        <p>Keep the elbow close to your body</p>
                    </div>
                    <div className="flex gap-2">
                        <SquareCheck size={30} className="text-green-500" />
                        <p>Control the descent to maximize muscle engagement</p>
                    </div>
                    <div className="flex gap-2">
                        <SquareCheck size={30} className="text-green-500" />
                        <p>Do not allow the wrist to rotate during the curl</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
