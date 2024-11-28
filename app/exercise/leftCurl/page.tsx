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
            description:
                "Hold a dumbbell in your left hand with your palm facing forward. Keep your elbow close to your side and curl the weight up to shoulder height, squeezing your left bicep. Lower it slowly back down and repeat. Keep your movements controlled and avoid swinging",
        },



    ];
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [detector, setDetector] = useState<any>(null);
    const [videoReady, setVideoReady] = useState(false);

    // State to track the curl count, stage, and curling state
    const [curlCount, setCurlCount] = useState(0);

    const setStageL = useLeftCurl((state: any) => state.setStageL)
    const stageL = useLeftCurl((state: any) => state.stageL)
    const [wait, setWait] = useState(1);


    // Initialize PoseNet model
    useEffect(() => {
        const initPoseDetection = async () => {
            try {
                // Set the backend and wait for TensorFlow.js to be ready
                await tf.setBackend('webgl'); // Use 'webgl' for better performance on most devices
                await tf.ready();

                console.log('TensorFlow.js is ready.');

                const model = poseDetection.SupportedModels.BlazePose;
                const detector = await poseDetection.createDetector(model, {
                    runtime: "tfjs",
                    modelType: "lite",
                    maxPoses: 1,
                } as poseDetection.BlazePoseTfjsModelConfig);

                setDetector(detector);
                console.log("Pose detector initialized.");
            } catch (error) {
                console.error("Error initializing pose detector:", error);
            }
        };

        initPoseDetection();
    }, []);

    // Initialize camera and ensure video element is ready
    useEffect(() => {
        const initCamera = async () => {
            try {
                if (videoRef.current) {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                    });
                    videoRef.current.srcObject = stream;

                    // Wait for video to load and set size
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current!.width = videoRef.current!.videoWidth;
                        videoRef.current!.height = videoRef.current!.videoHeight;
                        setVideoReady(true); // Set video ready flag to true
                        console.log("Video stream initialized.");
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
            detectPose(); // Start pose detection once the model and video are ready
        }
    }, [detector, videoReady]);


    useEffect(() => {
        console.log("Triggering a test update to stageL.");
        setStageL("up");
    }, []);


    useEffect(() => {
        console.log("StageL Updated:", stageL);
    }, [stageL]);

    // Function to calculate the angle between three points
    const calculateAngle = (A: any, B: any, C: any) => {
        const radians =
            Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
        const angle = Math.abs((radians * 180) / Math.PI);
        return angle > 180 ? 360 - angle : angle;
    };

    // Function to detect the left arm curl and increment count
    const detectCurl = (keypoints: any) => {
        const leftWrist = keypoints.find((kp: any) => kp.name === "left_wrist");
        const leftElbow = keypoints.find((kp: any) => kp.name === "left_elbow");
        const leftShoulder = keypoints.find((kp: any) => kp.name === "left_shoulder");
        // console.log("Left Wrist:", leftWrist); // Log left wrist for debugging
        // console.log("Left Elbow:", leftElbow); // Log left elbow for debugging
        // console.log("Left Shoulder:", leftShoulder); // Log left shoulder for debugging

        // Track the left arm curl state
        if (leftWrist && leftElbow && leftShoulder) {
            const leftAngle = calculateAngle(
                leftShoulder,
                leftElbow,
                leftWrist
            );
            // console.log("Left Arm Angle:", leftAngle); // Log angle for debugging

            // When the angle is greater than 160°, set the stage to 'down'
            if (
                leftShoulder?.score > 0.8 &&
                leftElbow?.score > 0.8 &&
                leftWrist?.score > 0.8
            ) {

                if (leftAngle > 90 && (useLeftCurl.getState() as any).stageL === "up") {
                    (useLeftCurl.getState() as any).setStageL("down"); // Access Zustand's latest state
                }

                if (leftAngle < 40 && (useLeftCurl.getState() as any).stageL === "down") {
                    (useLeftCurl.getState() as any).setStageL("up"); // Access Zustand's latest state
                    setCurlCount((prevCount) => prevCount + 1); // Increment curl count
                    console.log("Left Curl Completed");
                }
            }
        }
    };

    // Function to draw keypoints and lines between them
    const drawKeypointsAndLines = (keypoints: any, ctx: any) => {
        const threshold = 0.5;

        const leftWrist = keypoints.find((kp: any) => kp.name === "left_wrist");
        const leftElbow = keypoints.find((kp: any) => kp.name === "left_elbow");
        const leftShoulder = keypoints.find((kp: any) => kp.name === "left_shoulder");

        // Define the keypoints to draw
        const targetKeypoints = ["left_wrist", "left_elbow", "left_shoulder"];
        console.log("Keypoints:", keypoints); // Log keypoints for debugging

        if (
            leftShoulder?.score > 0.8 &&
            leftElbow?.score > 0.8 &&
            leftWrist?.score > 0.8
        ) {
            setWait(0);
            // Draw keypoints
            keypoints.forEach((point: any) => {
                if (
                    targetKeypoints.includes(point.name) && // Check if the keypoint is in the target list
                    point.score > threshold &&
                    point.x !== undefined &&
                    point.y !== undefined
                ) {
                    const { x, y } = point;
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = "aqua";
                    ctx.fill();
                }
            });

            ctx.strokeStyle = "aqua";
            ctx.lineWidth = 2;

            // Define connections for left side (shoulder -> elbow, elbow -> wrist)
            const connections = [
                ["left_shoulder", "left_elbow"],
                ["left_elbow", "left_wrist"],
            ];

            connections.forEach(([startName, endName]: any) => {
                const start = keypoints.find((kp: any) => kp.name === startName);
                const end = keypoints.find((kp: any) => kp.name === endName);

                if (
                    start &&
                    end &&
                    start.score > threshold &&
                    end.score > threshold &&
                    start.x !== undefined &&
                    start.y !== undefined &&
                    end.x !== undefined &&
                    end.y !== undefined
                ) {
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();

                }
            });
        }

    };
    // Pose detection logic
    const detectPose = async () => {
        if (detector && videoRef.current && canvasRef.current && videoReady) {
            try {
                const poses = await detector.estimatePoses(videoRef.current, {
                    maxPoses: 1,
                    flipHorizontal: false,
                });

                if (poses.length > 0) {
                    const ctx = canvasRef.current.getContext("2d");
                    if (ctx) {
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        drawKeypointsAndLines(poses[0].keypoints, ctx);
                        detectCurl(poses[0].keypoints);
                    }
                } else {
                    console.warn("No poses detected.");
                }
            } catch (error) {
                console.error("Error during pose detection:", error);
            }
        }
        requestAnimationFrame(detectPose);
    };


    return (
        <div className="flex flex-col md:flex-row gap-y-6 md:gap-x-4 mt-4 ml-4 p-4 max-w-7xl ">
            <div
                className="webcam-container relative w-full  md:max-w-[640px] h-64 md:h-96 lg:h-[480px] overflow-hidden"
            >
                <video
                    ref={videoRef}
                    className="absolute top-0 left-0 w-full h-full object-cover max-w-[640px] rounded-[12px]"
                    autoPlay
                    muted
                    playsInline
                />

                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none max-w-[640px]"
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

