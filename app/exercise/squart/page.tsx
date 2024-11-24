"use client";
import { useEffect, useRef, useState } from "react";

import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { useSquat } from "@/store/useSquart";
import { SquareCheck } from "lucide-react";

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
type Exercise = {
    heading: string;
    description: string;

};

export default function Home() {
    const Features = [
        {
            heading: "Instructions",
            description:
                "Stand with feet shoulder-width apart, chest up, and back straight. Lower into a squat by bending your knees and pushing your hips back, then rise back up through your heels. Repeat.",
        },



    ];
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [detector, setDetector] = useState<any>(null);
    const [videoReady, setVideoReady] = useState(false);
    const [isBeginnerMode, setIsBeginnerMode] = useState(true);

    const [leftKneeAngle, setLeftKneeAngle] = useState(0);
    const [rightKneeAngle, setRightKneeAngle] = useState(0);
    const [backAngle, setBackAngle] = useState(0);
    const [backPosture, setBackPosture] = useState(false);

    const [squatCount, setSquatCount] = useState(0);

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

    // Function to calculate back posture angle
    const validateBackPosture = (keypoints: any) => {
        const leftShoulder = keypoints.find((kp: any) => kp.name === "left_shoulder");
        const rightShoulder = keypoints.find((kp: any) => kp.name === "right_shoulder");
        const leftHip = keypoints.find((kp: any) => kp.name === "left_hip");
        const rightHip = keypoints.find((kp: any) => kp.name === "right_hip");

        if (
            leftShoulder?.score > 0.7 &&
            rightShoulder?.score > 0.7 &&
            leftHip?.score > 0.7 &&
            rightHip?.score > 0.7
        ) {
            // Average positions for midpoints
            const shoulderMid = {
                x: (leftShoulder.x + rightShoulder.x) / 2,
                y: (leftShoulder.y + rightShoulder.y) / 2,
            };
            const hipMid = {
                x: (leftHip.x + rightHip.x) / 2,
                y: (leftHip.y + rightHip.y) / 2,
            };
            const verticalLine = { x: hipMid.x, y: 0 }; // Vertical reference

            // Calculate back angle
            const backAngle = calculateAngle(shoulderMid, hipMid, verticalLine);
            const isGoodPosture = true // Adjustable threshold
            // Check if back angle is within the good posture range
            // const isGoodPosture = backAngle >= 10 && backAngle <= 18; // Adjustable threshold
            return { backAngle, isGoodPosture };  // bend forward  45 bend backward 
        }

        return { backAngle: null, isGoodPosture: false };
    };

    const detectSquat = (keypoints: any) => {
        const leftHip = keypoints.find((kp: any) => kp.name === "left_hip");
        const leftKnee = keypoints.find((kp: any) => kp.name === "left_knee");
        const leftAnkle = keypoints.find((kp: any) => kp.name === "left_ankle");
        const rightHip = keypoints.find((kp: any) => kp.name === "right_hip");
        const rightKnee = keypoints.find((kp: any) => kp.name === "right_knee");
        const rightAnkle = keypoints.find((kp: any) => kp.name === "right_ankle");

        if (
            leftHip?.score > 0.7 &&
            leftKnee?.score > 0.7 &&
            leftAnkle?.score > 0.7 &&
            rightHip?.score > 0.7 &&
            rightKnee?.score > 0.7 &&
            rightAnkle?.score > 0.7
        ) {

            if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
                const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
                const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
                // Validate back posture
                const { backAngle, isGoodPosture } = validateBackPosture(keypoints);
                setBackAngle(backAngle || 0);
                setBackPosture(isGoodPosture);


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

        // Find keypoints for back posture
        const leftShoulder = keypoints.find((kp: any) => kp.name === "left_shoulder" && kp.score > threshold);
        const rightShoulder = keypoints.find((kp: any) => kp.name === "right_shoulder" && kp.score > threshold);

        // console.log("Keypoints:", leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle);
        const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        setLeftKneeAngle(leftKneeAngle);
        const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        setRightKneeAngle(rightKneeAngle);

        if (
            leftHip?.score > 0.7 &&
            leftKnee?.score > 0.7 &&
            leftAnkle?.score > 0.7 &&
            rightHip?.score > 0.7 &&
            rightKnee?.score > 0.7 &&
            rightAnkle?.score > 0.7 &&
            leftShoulder?.score > 0.7 &&
            rightShoulder?.score > 0.7

        ) {
            setWait(0);
            // Ensure all keypoints are valid before drawing
            if (
                leftHip && leftKnee && leftAnkle &&
                rightHip && rightKnee && rightAnkle &&
                leftShoulder && rightShoulder
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

                // Draw back posture (shoulders to hips)
                ctx.moveTo(leftShoulder.x, leftShoulder.y);
                ctx.lineTo(leftHip.x, leftHip.y);

                ctx.moveTo(rightShoulder.x, rightShoulder.y);
                ctx.lineTo(rightHip.x, rightHip.y);

                // Set styling for the lines
                ctx.strokeStyle = "aqua";
                ctx.lineWidth = 2;
                ctx.stroke();



                // Draw dots at each keypoint
                const drawDot = (x: number, y: number) => {
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, 2 * Math.PI);
                    ctx.fillStyle = "red";
                    ctx.fill();
                };

                drawDot(leftHip.x, leftHip.y);
                drawDot(leftKnee.x, leftKnee.y);
                drawDot(leftAnkle.x, leftAnkle.y);
                drawDot(rightHip.x, rightHip.y);
                drawDot(rightKnee.x, rightKnee.y);
                drawDot(rightAnkle.x, rightAnkle.y);

                // Draw dots for back posture
                drawDot(leftShoulder.x, leftShoulder.y);
                drawDot(rightShoulder.x, rightShoulder.y);
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
        <div className="flex flex-col md:flex-row gap-y-6 md:gap-x-4 mt-4 ml-4">
            <div
                className="webcam-container"
                style={{
                    position: "relative",
                    width: "640px", // Full width
                    height: "480px", // Full height
                    overflow: "hidden", // Hide any overflow
                }}
            >
                {/* <button onClick={() => setIsBeginnerMode(!isBeginnerMode)}>
                Toggle Mode ({isBeginnerMode ? "Beginner" : "Pro"})
            </button> */}
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
                    className="absolute top-2 left-2 gap-x-6 "

                >
                    {
                        wait === 1 ? <div className="text-2xl text-black border-2 bg-white border-black p-2">Please wait...</div> : <>

                            <div className="flex flex-col gap-y-2 text-sm">
                                <div className="bg-white rounded-[12px] border-black border-2 p-4">
                                    <p>Count: {squatCount}</p>

                                </div>
                                <div className="bg-white rounded-[12px] border-black border-2 p-4">
                                    <p>Left Knee Angle: {Math.round(leftKneeAngle)}°</p>

                                </div>
                                <div className="bg-white rounded-[12px] border-black border-2 p-4">
                                    <p>Right Knee Angle: {Math.round(rightKneeAngle)}°</p>
                                </div>
                                {/* // const isGoodPosture = backAngle >= 10 && backAngle <= 18; // Adjustable threshold
            return { backAngle, isGoodPosture };  // bend forward  45 bend backward  */}

                                <div className="bg-white rounded-[12px] border-black border-2 p-4">
                                    <p>Back Angle: {Math.round(backAngle)}°</p>
                                </div>
                                <div className="bg-white rounded-[12px] border-black border-2 p-4">
                                    <p>{
                                        backAngle >= 10 && backAngle <= 18 ? "Bend Backword" : backAngle > 18 && backAngle < 45 ? "Good Posture" : "Bend Forward"


                                    }</p>
                                </div>

                            </div>


                            {
                                rightKneeAngle < 110 && leftKneeAngle < 110 && rightKneeAngle > 80 && leftKneeAngle > 80 &&
                                <div className="bg-green-400 rounded-[12px] border-black border-2 p-2 w-40 mt-2 flex items-center justify-center">
                                    <p className="text-black p-2 rounded-md"> Good Squart</p>
                                </div>

                            }
                            {
                                (rightKneeAngle > 110 || leftKneeAngle > 110) &&
                                <div className="bg-white rounded-[12px] border-black border-2 p-2 w-32 mt-2 flex items-center justify-center">
                                    <p className="text-black p-2 rounded-md">Relax</p>
                                </div>
                            }
                            {
                                (rightKneeAngle < 80 || leftKneeAngle < 80) &&
                                <div className="bg-red-600 rounded-[12px] border-black border-2 p-2 w-44 mt-2 flex items-center justify-center">
                                    <p className="text-white ">Squart too deep</p>
                                </div>
                            }


                        </>
                    }
                </div>


            </div>



            {/* Video................... */}

            <div className="flex flex-col gap-y-4 w-[500px]">
                <div className="text-5xl font-bold">
                    <span className="text-[#f08b02]">Reference Video</span>
                </div>
                <video controls width="500" height="360">
                    <source src="/squat.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>

                <div className="grid gap-4 grid-cols-1  p-2 mb-4">
                    {Features.map((lang: Exercise, index: number) => (

                        <div
                            className={`border-[1px] rounded-md p-2 text-start gap-2 flex flex-col  ${index % 2 === 0 ? "mr-0" : "ml-0"
                                }`}
                            key={index}

                        >
                            <div className="flex gap-2 items-center">
                                <div>
                                    <SquareCheck className="w-5 h-5 text-[#f08b02]" />
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
