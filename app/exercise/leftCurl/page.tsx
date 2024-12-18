"use client"
import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import *  as poseDetection from "@tensorflow-models/pose-detection";
import { useLeftCurl } from "@/store/useLeftCurl";
import { SquareCheck } from "lucide-react";
import Image from "next/image";
import { initializeTensorFlow } from "@/lib/tfjs-setup";
import { Maximize2, Minimize2 } from "lucide-react";
import Instructions from "./components/instruction";
// import Instructions from "./components/instruction";

type Exercise = {
    heading: string;
    description: string;
};

// At top of file, update loadAudio function
// const loadAudio = (url: string) => {
//     const audio = new Audio();
//     audio.preload = 'auto';

//     return new Promise<HTMLAudioElement>((resolve, reject) => {
//         audio.addEventListener('canplaythrough', () => {
//             // console.log(`Audio loaded successfully: ${url}`);
//             resolve(audio);
//         });

//         audio.addEventListener('error', (e) => {
//             console.error(`Audio load error for ${url}:`, e);
//             reject(new Error(`Failed to load audio file ${url}: ${e.message}`));
//         });

//         // console.log(`Attempting to load audio from: ${url}`);
//         audio.src = url;
//     });
// };


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

    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    // Add new state for audio permission
    // const [audioEnabled, setAudioEnabled] = useState(false);

    const rafId = useRef<number>();
    const lastFrameTime = useRef<number>(0);
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const glowOpacityRef = useRef(0.3);
    const glowAnimationRef = useRef<number>();

    const hasInteractedRef = useRef(false);
    // const [upSound, setUpSound] = useState<HTMLAudioElement | null>(null);
    // const [downSound, setDownSound] = useState<HTMLAudioElement | null>(null);


    // const speakNumber = (number: number) => {
    //     const utterance = new SpeechSynthesisUtterance(number.toString());
    //     speechSynthesis.speak(utterance);
    // };

    // useEffect(() => {
    //     // Speak the count whenever it changes
    //     if (curlCount > 0) {
    //         speakNumber(curlCount);
    //     }
    // }, [curlCount]); // Trigger when count changes


    // Add click handler to enable audio
    // useEffect(() => {
    //     const enableAudio = () => {
    //         hasInteractedRef.current = true;
    //     };

    //     document.addEventListener('click', enableAudio);
    //     return () => document.removeEventListener('click', enableAudio);
    // }, []);

    // // Load audio files when component mounts
    // useEffect(() => {
    //     const loadSounds = async () => {
    //         try {
    //             // console.log('Starting to load audio files...');
    //             const upPath = '/up.m4a';
    //             const downPath = '/down.m4a';

    //             // console.log(`Loading from paths: ${upPath}, ${downPath}`);

    //             const [up, down] = await Promise.all([
    //                 loadAudio(upPath),
    //                 loadAudio(downPath)
    //             ]);

    //             // console.log('Audio files loaded successfully');
    //             setUpSound(up);
    //             setDownSound(down);
    //         } catch (error) {
    //             const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    //             console.error("Failed to load audio files:", errorMessage);
    //         }
    //     };
    //     loadSounds();
    // }, []);

    // Update sound effect logic
    // useEffect(() => {
    //     const playSound = async (audio: HTMLAudioElement) => {
    //         try {
    //             if (!hasInteractedRef.current) return; // Only play if user has interacted
    //             audio.currentTime = 0;
    //             await audio.play();
    //         } catch (error) {
    //             if (error instanceof Error) {
    //                 // console.log("Audio play error:", error.message);
    //             }
    //         }
    //     };

    //     if (stageL === 'up') {
    //         if (upSound) playSound(upSound);
    //     } else if (stageL === 'down') {
    //         if (downSound) playSound(downSound);
    //     }
    // }, [stageL]);

    // Keep cleanup effect
    // useEffect(() => {
    //     return () => {
    //         if (upSound) {
    //             upSound.pause();
    //             upSound.currentTime = 0;
    //         }
    //         if (downSound) {
    //             downSound.pause();
    //             downSound.currentTime = 0;
    //         }
    //     };
    // }, []);

    // const requestAudioPermission = async () => {
    //     try {
    //         if (!upSound || !downSound) {
    //             throw new Error("Audio files not loaded");
    //         }
    //         await upSound.play();
    //         await upSound.pause();
    //         upSound.currentTime = 0;
    //         setAudioEnabled(true);
    //         hasInteractedRef.current = true;
    //     } catch (error) {
    //         console.error("Failed to enable audio:", error);
    //     }
    // };


    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!isFullscreen) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        setIsFullscreen(!isFullscreen);
    };

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

        if (leftWrist?.score > 0.7 && leftElbow?.score > 0.7 && leftShoulder?.score > 0.7) {
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
    // Color configuration
    // Update COLORS object
    const COLORS = {
        primary: '#0068FF',
        secondary: '#ffffff',
        glow: () => `rgba(0, 255, 255, ${glowOpacityRef.current})`,
        line: {
            gradient1: '#00ffff',
            gradient2: '#0099ff'
        }
    };

    const STYLES = {
        keypoint: {
            radius: 6,
            glowSize: 15,
            lineWidth: 2
        },
        connection: {
            lineWidth: 2
        }
    };

    // Add animation setup in useEffect
    useEffect(() => {
        // Setup glow animation
        glowAnimationRef.current = window.setInterval(() => {
            glowOpacityRef.current = 0.3 + Math.abs(Math.sin(Date.now() / 1000)) * 0.4;
        }, 16); // ~60fps

        return () => {
            if (glowAnimationRef.current) {
                clearInterval(glowAnimationRef.current);
            }
        };
    }, []);

    const drawKeypointsAndLines = (keypoints: any, ctx: any) => {
        const threshold = 0.7;
        const targetKeypoints = ["left_wrist", "left_elbow", "left_shoulder"];

        ctx.save();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw keypoints with glow effect
        keypoints.forEach((point: any) => {
            if (targetKeypoints.includes(point.name) && point.score > threshold) {
                // Animated glow effect
                ctx.beginPath();
                ctx.arc(point.x, point.y, STYLES.keypoint.glowSize, 0, 2 * Math.PI);
                ctx.fillStyle = COLORS.glow();
                ctx.fill();

                // Main keypoint
                ctx.beginPath();
                ctx.arc(point.x, point.y, STYLES.keypoint.radius, 0, 2 * Math.PI);
                ctx.fillStyle = COLORS.primary;
                ctx.fill();
                ctx.strokeStyle = COLORS.secondary;
                ctx.lineWidth = STYLES.keypoint.lineWidth;
                ctx.stroke();
            }
        });

        // Draw lines
        ctx.lineWidth = STYLES.connection.lineWidth;
        ctx.lineCap = 'round';

        const connections = [
            ["left_shoulder", "left_elbow"],
            ["left_elbow", "left_wrist"]
        ];

        connections.forEach(([startName, endName]) => {
            const start = keypoints.find((kp: any) => kp.name === startName);
            const end = keypoints.find((kp: any) => kp.name === endName);

            if (start?.score > threshold && end?.score > threshold) {
                ctx.beginPath();
                ctx.strokeStyle = COLORS.primary;
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        });

        // Draw angle arc and text
        const shoulder = keypoints.find((kp: any) => kp.name === "left_shoulder");
        const elbow = keypoints.find((kp: any) => kp.name === "left_elbow");
        const wrist = keypoints.find((kp: any) => kp.name === "left_wrist");

        if (shoulder?.score > threshold && elbow?.score > threshold && wrist?.score > threshold) {
            // Calculate angle
            const angle1 = Math.atan2(shoulder.y - elbow.y, shoulder.x - elbow.x);
            const angle2 = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
            let angle = Math.abs((angle2 - angle1) * 180 / Math.PI);
            if (angle > 180) angle = 360 - angle;

            // Draw arc
            const radius = 30;
            ctx.beginPath();
            ctx.arc(elbow.x, elbow.y, radius, angle1, angle2);
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw angle text with background
            ctx.save();
            const textRadius = radius + 20;
            const midAngle = (angle1 + angle2) / 2;
            const textX = elbow.x + textRadius * Math.cos(midAngle);
            const textY = elbow.y + textRadius * Math.sin(midAngle);

            ctx.translate(textX, textY);
            ctx.scale(-1, 1);
            let rotation = midAngle;
            if (rotation > Math.PI / 2 || rotation < -Math.PI / 2) {
                rotation += Math.PI;
            }
            ctx.rotate(rotation);

            // Add background rectangle with rounded corners
            const padding = 8;
            const borderRadius = 4;
            ctx.font = "16px Arial";
            const textMetrics = ctx.measureText(`${Math.round(angle)}°`);
            ctx.fillStyle = 'white';

            ctx.beginPath();
            ctx.roundRect(
                -textMetrics.width / 2 - padding / 2,
                -10 - padding / 2,
                textMetrics.width + padding,
                20 + padding,
                borderRadius
            );
            ctx.fill();

            // Draw text
            ctx.fillStyle = COLORS.primary;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${Math.round(angle)}°`, 0, 0);
            ctx.restore();
        }

        setWait(0);
        ctx.restore();
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
                flipHorizontal: true,
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
            {/* {!audioEnabled && (
                <button
                    onClick={requestAudioPermission}
                    className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md z-50"
                >
                    Enable Sound
                </button>
            )} */}
            <div
                ref={containerRef}
                className={`webcam-container hidden md:flex relative ${isFullscreen
                    ? "fixed inset-0 z-50 bg-black w-screen h-screen"
                    : "w-full h-[calc(100vh-2rem)] md:max-w-[640px] md:h-96 lg:h-[480px]"
                    } overflow-hidden`}
            >
                <video
                    ref={videoRef}
                    className={`absolute top-0 left-0 w-full h-full ${isFullscreen ? "object-cover md:object-contain" : "object-cover"
                        } rounded-[12px] transform scale-x-[-1]`}
                    autoPlay
                    muted
                    playsInline
                />

                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className={`absolute top-0 left-0 w-full h-full ${isFullscreen ? "object-cover md:object-contain" : "object-cover"
                        } pointer-events-none transform scale-x-[-1]`}
                />

                <button
                    onClick={toggleFullscreen}
                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 z-10"
                >
                    {isFullscreen ? (
                        <Minimize2 className="w-6 h-6" />
                    ) : (
                        <Maximize2 className="w-6 h-6" />
                    )}
                </button>
                <Instructions />
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


            </div>
        </div>
    );
}
