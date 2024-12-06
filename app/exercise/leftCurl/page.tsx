"use client";
import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { useLeftCurl } from "@/store/useLeftCurl";
import { SquareCheck } from "lucide-react";
import Image from "next/image";

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

    // Performance optimization refs
    const rafId = useRef<number>();
    const lastFrameTime = useRef<number>(0);
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    useEffect(() => {
        const initPoseDetection = async () => {
            try {
                await tf.setBackend('webgl');
                await tf.ready();

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

        if (leftWrist?.score > 0.7 && leftElbow?.score > 0.7 && leftShoulder?.score > 0.7) {
            const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);

            if (leftAngle > 90 && (useLeftCurl.getState() as any).stageL === "up") {
                (useLeftCurl.getState() as any).setStageL("down");
            }

            if (leftAngle < 40 && (useLeftCurl.getState() as any).stageL === "down") {
                (useLeftCurl.getState() as any).setStageL("up");
                setCurlCount(prev => prev + 1);
            }
        }
    };

    const drawKeypointsAndLines = (keypoints: any, ctx: any) => {
        const threshold = 0.7;
        const targetKeypoints = ["left_wrist", "left_elbow", "left_shoulder"];
        const leftWrist = keypoints.find((kp: any) => kp.name === "left_wrist");
        const leftElbow = keypoints.find((kp: any) => kp.name === "left_elbow");
        const leftShoulder = keypoints.find((kp: any) => kp.name === "left_shoulder");

        if (leftWrist?.score > threshold && leftElbow?.score > threshold && leftShoulder?.score > threshold) {
            setWait(0);

            // Draw keypoints
            keypoints.forEach((point: any) => {
                if (targetKeypoints.includes(point.name) && point.score > threshold) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = "aqua";
                    ctx.fill();
                }
            });

            // Draw lines
            ctx.strokeStyle = "aqua";
            ctx.lineWidth = 2;
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
                flipHorizontal: false,
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
            <div
                className="webcam-container hidden md:flex relative w-full h-screen md:max-w-[640px] md:h-96 lg:h-[480px] overflow-hidden"
            >
                <video
                    ref={videoRef}
                    className="absolute top-0 left-0 w-full h-full object-cover rounded-[12px] md:max-w-[640px]"
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
                            <p>Detecting</p>
                            <p className="animate-pulse text-4xl flex items-center justify-center">...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="absolute top-2 left-2">
                            <div className="flex flex-col gap-y-4">
                                <div className=" p-4 border-2 border-black bg-white rounded-[12px]">
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
                                <div className=" rounded-[12px] text-xl items-center justify-center flex p-4 border-2 border-black bg-white">
                                    {stageL}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col gap-y-4 w-full  justify-center">
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
                            <div className="flex gap-2 items-center">
                                <div>
                                    <SquareCheck className="w-5 h-5 text-[#02a8c0]" />
                                </div>
                                <div className="font-bold">{lang.heading}</div>
                            </div>
                            <div className="text-gray-500">{lang.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

}




