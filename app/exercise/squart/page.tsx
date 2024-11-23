"use client";
import { useEffect, useRef, useState } from "react";

import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { useSquat } from "@/store/useSquart";

// Define threshold constants
const getThresholds = (isBeginner: boolean) => ({
    HIP_KNEE_VERT: isBeginner
        ? { NORMAL: [0, 32], TRANS: [35, 65], PASS: [70, 95] }
        : { NORMAL: [0, 32], TRANS: [35, 65], PASS: [80, 95] },
    HIP_THRESH: isBeginner ? [10, 50] : [15, 50],
    ANKLE_THRESH: isBeginner ? 45 : 30,
    KNEE_THRESH: isBeginner ? [50, 70, 95] : [50, 80, 95],
    OFFSET_THRESH: 35.0,
    INACTIVE_THRESH: 15.0,
    CNT_FRAME_THRESH: 50,
});

export default function Home() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [detector, setDetector] = useState<any>(null);
    const [videoReady, setVideoReady] = useState(false);
    const [isBeginnerMode, setIsBeginnerMode] = useState(true);
    const thresholds = getThresholds(isBeginnerMode);

    const [squatCount, setSquatCount] = useState(0);
    const [frameCount, setFrameCount] = useState(0);
    const setStageS = useSquat((state: any) => state.setStageS);
    const stageS = useSquat((state: any) => state.stageS);

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

    // Initialize camera
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
            detectPose(); // Start pose detection once ready
        }
    }, [detector, videoReady]);

    // Calculate angle between three points
    const calculateAngle = (A: any, B: any, C: any) => {
        const radians =
            Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
        const angle = Math.abs((radians * 180) / Math.PI);
        return angle > 180 ? 360 - angle : angle;
    };

    const detectSquat = (keypoints: any) => {
        const leftHip = keypoints.find((kp: any) => kp.name === "left_hip");
        const leftKnee = keypoints.find((kp: any) => kp.name === "left_knee");
        const leftAnkle = keypoints.find((kp: any) => kp.name === "left_ankle");
        const rightHip = keypoints.find((kp: any) => kp.name === "right_hip");
        const rightKnee = keypoints.find((kp: any) => kp.name === "right_knee");
        const rightAnkle = keypoints.find((kp: any) => kp.name === "right_ankle");

        if (
            leftHip?.score > 0.8 &&
            leftKnee?.score > 0.8 &&
            leftAnkle?.score > 0.8 &&
            rightHip?.score > 0.8 &&
            rightKnee?.score > 0.8 &&
            rightAnkle?.score > 0.8
        ) {

            if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
                const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
                const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);


                if (leftKneeAngle < 110 && rightKneeAngle < 110 && (useSquat.getState() as any).stageS === "down") {
                    (useSquat.getState() as any).setStageS("up");
                    setSquatCount((count) => count + 1);
                    console.log("Squat count incremented.");
                }

                if (leftKneeAngle > 110 && rightKneeAngle > 110 && (useSquat.getState() as any).stageS === "up") {

                    (useSquat.getState() as any).setStageS("down");

                }
            } else {
                console.warn("Some keypoints are missing.");
            }
        }
    };

    // Function to draw keypoints and lines between them
    const drawKeypointsAndLines = (keypoints: any, ctx: any) => {
        const threshold = 0.5;



        // Find the target keypoints
        const leftHip = keypoints.find((kp: any) => kp.name === "left_hip" && kp.score > threshold);
        const leftKnee = keypoints.find((kp: any) => kp.name === "left_knee" && kp.score > threshold);
        const leftAnkle = keypoints.find((kp: any) => kp.name === "left_ankle" && kp.score > threshold);
        const rightHip = keypoints.find((kp: any) => kp.name === "right_hip" && kp.score > threshold);
        const rightKnee = keypoints.find((kp: any) => kp.name === "right_knee" && kp.score > threshold);
        const rightAnkle = keypoints.find((kp: any) => kp.name === "right_ankle" && kp.score > threshold);

        console.log("Keypoints:", leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle);

        if (
            leftHip?.score > 0.8 &&
            leftKnee?.score > 0.8 &&
            leftAnkle?.score > 0.8 &&
            rightHip?.score > 0.8 &&
            rightKnee?.score > 0.8 &&
            rightAnkle?.score > 0.8
        ) {

            // Ensure all keypoints are valid before drawing
            if (
                leftHip && leftKnee && leftAnkle &&
                rightHip && rightKnee && rightAnkle
            ) {
                ctx.beginPath();

                // Draw the left side (hip -> knee -> ankle)
                ctx.moveTo(leftHip.x, leftHip.y);
                ctx.lineTo(leftKnee.x, leftKnee.y);
                ctx.lineTo(leftAnkle.x, leftAnkle.y);

                // Draw the right side (hip -> knee -> ankle)
                ctx.moveTo(rightHip.x, rightHip.y);
                ctx.lineTo(rightKnee.x, rightKnee.y);
                ctx.lineTo(rightAnkle.x, rightAnkle.y);

                // Set styling for the lines
                ctx.strokeStyle = "aqua";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw dots at each keypoint
                const drawDot = (x: number, y: number) => {
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    ctx.fillStyle = "red";
                    ctx.fill();
                };

                drawDot(leftHip.x, leftHip.y);
                drawDot(leftKnee.x, leftKnee.y);
                drawDot(leftAnkle.x, leftAnkle.y);
                drawDot(rightHip.x, rightHip.y);
                drawDot(rightKnee.x, rightKnee.y);
                drawDot(rightAnkle.x, rightAnkle.y);
            } else {
                console.warn("Some keypoints are missing or below the threshold score.");
            }

        }
    };



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
                        detectSquat(poses[0].keypoints);
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
                width: "640px", // Full width
                height: "480px", // Full height
                overflow: "hidden", // Hide any overflow
            }}
        >
            <button onClick={() => setIsBeginnerMode(!isBeginnerMode)}>
                Toggle Mode ({isBeginnerMode ? "Beginner" : "Pro"})
            </button>
            <video
                ref={videoRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "640px", // Fill the entire container
                    height: "480px", // Maintain aspect ratio by stretching
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
                <p>Squart Count: {squatCount}</p>
            </div>


        </div>
    );
}
