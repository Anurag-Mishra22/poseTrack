"use client";
import { useEffect, useRef, useState } from "react";

import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { useLeftCurl } from "@/store/useLeftCurl";

export default function Home() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [detector, setDetector] = useState<any>(null);
    const [videoReady, setVideoReady] = useState(false);

    // State to track the curl count, stage, and curling state
    const [curlCount, setCurlCount] = useState(0);

    const setStageL = useLeftCurl((state: any) => state.setStageL)
    const stageL = useLeftCurl((state: any) => state.stageL)


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
                leftShoulder?.score > 0.97 &&
                leftElbow?.score > 0.97 &&
                leftWrist?.score > 0.97
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
            leftShoulder?.score > 0.97 &&
            leftElbow?.score > 0.97 &&
            leftWrist?.score > 0.97
        ) {

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
        <div
            className="webcam-container"
            style={{
                position: "relative",
                width: "100vw", // Full width
                height: "100vh", // Full height
                overflow: "hidden", // Hide any overflow
            }}
        >
            <video
                ref={videoRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%", // Fill the entire container
                    height: "100%", // Maintain aspect ratio by stretching
                    objectFit: "cover", // Adjust video scaling
                }}
                autoPlay
                muted
                playsInline
            />

            <canvas
                ref={canvasRef}
                width={640}
                height={480}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                }}
            />
            <div
                className="absolute top-2 left-2 p-4 border-2 border-black bg-white"

            >
                <p

                >Bicep Curl Count: {curlCount}</p>
            </div>
            <div

                style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "10px",
                    color: "white",
                }}
            >
                {stageL}
            </div>
        </div>
    );
}
