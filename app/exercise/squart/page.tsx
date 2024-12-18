"use client";
import { useEffect, useRef, useState } from "react";


import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { useSquat } from "@/store/useSquart";
import { SquareCheck } from "lucide-react";
import Image from "next/image";
import { initializeTensorFlow } from "@/lib/tfjs-setup";
import { Maximize2, Minimize2 } from "lucide-react";



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

    const [leftKneeAngle, setLeftKneeAngle] = useState(180);
    const [rightKneeAngle, setRightKneeAngle] = useState(180);
    const [backAngle, setBackAngle] = useState(0);
    const [backPosture, setBackPosture] = useState(false);

    const [squatCount, setSquatCount] = useState(0);

    const [wait, setWait] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);



    const speakNumber = (number: number) => {
        const utterance = new SpeechSynthesisUtterance(number.toString());
        speechSynthesis.speak(utterance);
    };


    useEffect(() => {
        // Speak the count whenever it changes
        if (squatCount > 0) {
            speakNumber(squatCount);
        }
    }, [squatCount]); // Trigger when count changes




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

    // Initialize PoseNet model
    useEffect(() => {
        let isSubscribed = true;

        const initPoseDetection = async () => {
            try {
                await initializeTensorFlow(); // Use the singleton initialization

                const model = poseDetection.SupportedModels.BlazePose;
                const detector = await poseDetection.createDetector(model, {
                    runtime: "tfjs",
                    modelType: "lite",
                    maxPoses: 1,
                    flipHorizontal: true // Add this line
                } as poseDetection.BlazePoseTfjsModelConfig);

                if (isSubscribed) {
                    setDetector(detector);
                }
            } catch (error) {
                console.error("Error initializing pose detector:", error);
            }
        };

        initPoseDetection();

        return () => {
            isSubscribed = false;
        };
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
                        // console.log("Video stream initialized.");
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
                    // console.log("Squat count incremented.");
                }

                if (leftKneeAngle > 110 && rightKneeAngle > 110 && (useSquat.getState() as any).stageS === "up") {

                    (useSquat.getState() as any).setStageS("down");

                }
            } else {
                console.warn("Some keypoints are missing.");
            }
        } else if (leftHip?.score > 0.7 &&
            leftKnee?.score > 0.7 &&
            leftAnkle?.score > 0.7
        ) {
            if (leftHip && leftKnee && leftAnkle) {
                const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
                // const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
                // Validate back posture
                const { backAngle, isGoodPosture } = validateBackPosture(keypoints);
                setBackAngle(backAngle || 0);
                setBackPosture(isGoodPosture);


                if (leftKneeAngle < 110 && (useSquat.getState() as any).stageS === "down") {
                    (useSquat.getState() as any).setStageS("up");
                    setSquatCount((count) => count + 1);
                    // console.log("Squat count incremented.");
                }

                if (leftKneeAngle > 110 && (useSquat.getState() as any).stageS === "up") {

                    (useSquat.getState() as any).setStageS("down");

                }
            } else {
                console.warn("Some keypoints are missing.");
            }

        } else if (
            rightHip?.score > 0.7 &&
            rightKnee?.score > 0.7 &&
            rightAnkle?.score > 0.7) {
            if (rightHip && rightKnee && rightAnkle) {
                // const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
                const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
                // Validate back posture
                const { backAngle, isGoodPosture } = validateBackPosture(keypoints);
                setBackAngle(backAngle || 0);
                setBackPosture(isGoodPosture);


                if (rightKneeAngle < 110 && (useSquat.getState() as any).stageS === "down") {
                    (useSquat.getState() as any).setStageS("up");
                    setSquatCount((count) => count + 1);
                    // console.log("Squat count incremented.");
                }

                if (rightKneeAngle > 110 && (useSquat.getState() as any).stageS === "up") {

                    (useSquat.getState() as any).setStageS("down");

                }
            } else {
                console.warn("Some keypoints are missing.");
            }

        } else {
            setWait(1);
        }
    };

    // Function to draw keypoints and lines between them
    const drawKeypointsAndLines = (keypoints: any, ctx: any) => {

        const leftHip = keypoints.find((kp: any) => kp.name === "left_hip");
        const leftKnee = keypoints.find((kp: any) => kp.name === "left_knee");
        const leftAnkle = keypoints.find((kp: any) => kp.name === "left_ankle");
        const rightHip = keypoints.find((kp: any) => kp.name === "right_hip");
        const rightKnee = keypoints.find((kp: any) => kp.name === "right_knee");
        const rightAnkle = keypoints.find((kp: any) => kp.name === "right_ankle");
        const threshold = 0.5;
        // console.log("keypoints", keypoints);



        // Define body segments for drawing
        const segments = [
            // Face
            {
                points: ['nose', 'left_eye', 'right_eye'],
                color: '#55ff00'
            },
            {
                points: ['left_eye', 'left_ear'],
                color: '#55ff00'
            },
            {
                points: ['right_eye', 'right_ear'],
                color: '#55ff00'
            },
            {
                points: ['left_shoulder', 'mouth_left'],
                color: '#55ff00'
            },
            {
                points: ['right_shoulder', 'mouth_right'],
                color: '#55ff00'
            },

            {
                points: ['right_mouth', 'left_mouth'],
                color: '#55ff00'
            },

            // Arms (detailed)
            {
                points: ['left_shoulder', 'left_elbow', 'left_wrist'],
                color: '#55ff00'
            },
            {
                points: ['right_shoulder', 'right_elbow', 'right_wrist'],
                color: '#55ff00'
            },

            // Hands
            {
                points: ['left_wrist', 'left_pinky', 'left_index', 'left_thumb'],
                color: '#55ff00'
            },
            {
                points: ['right_wrist', 'right_pinky', 'right_index', 'right_thumb'],
                color: '#55ff00'
            },

            // Torso (detailed)
            {
                points: ['left_shoulder', 'right_shoulder'],
                color: '#55ff00'
            },
            {
                points: ['left_shoulder', 'left_hip'],
                color: '#55ff00'
            },
            {
                points: ['right_shoulder', 'right_hip'],
                color: '#55ff00'
            },
            {
                points: ['left_hip', 'right_hip'],
                color: '#55ff00'
            },

            // Legs (detailed)
            {
                points: ['left_hip', 'left_knee', 'left_ankle'],
                color: '#55ff00'
            },
            {
                points: ['right_hip', 'right_knee', 'right_ankle'],
                color: '#55ff00'
            },

            // Feet
            {
                points: ['left_ankle', 'left_heel', 'left_foot_index'],
                color: '#55ff00'
            },
            {
                points: ['right_ankle', 'right_heel', 'right_foot_index'],
                color: '#55ff00'
            }
        ];

        // Helper function to draw a point
        if (
            (leftHip?.score > 0.7 &&
                leftKnee?.score > 0.7 &&
                leftAnkle?.score > 0.7) ||
            (rightHip?.score > 0.7 &&
                rightKnee?.score > 0.7 &&
                rightAnkle?.score > 0.7)
        ) {
            const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
            setLeftKneeAngle(leftKneeAngle);
            const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
            setRightKneeAngle(rightKneeAngle);
            const drawPoint = (x: number, y: number, color: string = '#FF0000') => {
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.stroke();
            };

            // Helper function to draw a line
            const drawLine = (start: any, end: any, color: string) => {
                if (start && end && start.score > threshold && end.score > threshold) {
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
            };

            // Draw segments
            segments.forEach(segment => {
                for (let i = 0; i < segment.points.length - 1; i++) {
                    const point1 = keypoints.find((kp: any) => kp.name === segment.points[i]);
                    const point2 = keypoints.find((kp: any) => kp.name === segment.points[i + 1]);

                    if (point1 && point2) {
                        drawLine(point1, point2, segment.color);
                    }
                }
            });

            // Draw all keypoints
            keypoints.forEach((keypoint: any) => {
                if (keypoint.score > threshold) {
                    drawPoint(keypoint.x, keypoint.y);
                }
            });

            setWait(0);
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
        <div className="flex flex-col md:flex-row gap-y-6 md:gap-x-4 mt-4 ml-4 p-4 max-w-7xl">
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
                {
                    wait === 1 ? (<div className="text-2xl absolute top-2 left-2 text-black border-2 bg-white border-black p-2">
                        <div className="flex items-center gap-x-2 justify-center">
                            {/* <p>Detecting Plz bring your left hand inside frame.</p> */}
                            <div className="flex flex-col gap-4 p-2">
                                <div className="text-xl md:text-2xl lg:text-2xl font-bold">
                                    <span className="text-[#02a8c0]">Detecting</span>
                                </div>


                                <div className="flex gap-2">
                                    <SquareCheck size={30} className="text-green-500" />
                                    <p>Plz bring your Full Body inside Frame</p>
                                </div>
                                {/* <div className="flex gap-2">
                                        <SquareCheck size={30} className="text-green-500" />
                                        <p>Wrist, Elbow, Shoulder</p>
                                    </div> */}
                                {/* <div className="flex gap-2">
                                    <SquareCheck size={30} className="text-green-500" />
                                    <p>Do not allow the wrist to rotate during the curl</p>
                                </div> */}
                            </div>
                            {/* <p className="animate-pulse text-4xl flex items-center justify-center">...</p> */}
                        </div>
                    </div>) : <>

                        <div className={`flex flex-col absolute top-2 left-2 gap-y-2 ${isFullscreen ? 'scale-125 translate-x-12 translate-y-12' : 'text-sm'}`}>
                            <div className="flex flex-col gap-y-3">
                                <div className={`p-3 border-2 border-black bg-white flex items-center justify-center rounded-[12px] ${isFullscreen ? 'p-4' : ''}`}>
                                    <div className="flex flex-row items-center gap-x-2">
                                        <Image
                                            src="/squatgi.gif"
                                            height={isFullscreen ? 40 : 30}
                                            width={isFullscreen ? 40 : 30}
                                            alt="squat"
                                        />
                                        <p className={`${isFullscreen ? 'text-2xl' : 'text-xl'}`}>{squatCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className={`bg-white rounded-[12px] flex items-center justify-center border-black border-2 ${isFullscreen ? 'p-4' : 'p-3'}`}>
                                <div className="flex flex-row items-center gap-x-2">
                                    <Image
                                        src="/angle.png"
                                        height={isFullscreen ? 40 : 30}
                                        width={isFullscreen ? 40 : 30}
                                        alt="angle"
                                    />
                                    <p className={`${isFullscreen ? 'text-2xl' : 'text-xl'}`}>{Math.round(leftKneeAngle)}°</p>
                                </div>
                            </div>

                            <div className={`bg-white rounded-[12px] border-black border-2 ${isFullscreen ? 'p-4' : 'p-3'}`}>
                                <p className={`${isFullscreen ? 'text-2xl' : 'text-xl'}`}>Back Angle: {Math.round(backAngle)}°</p>
                            </div>

                            {rightKneeAngle < 110 && leftKneeAngle < 110 && rightKneeAngle > 80 && leftKneeAngle > 80 && (
                                <div className={`bg-green-400 rounded-[12px] border-black border-2 p-2 ${isFullscreen ? 'w-52' : 'w-40'} mt-2 flex items-center justify-center`}>
                                    <p className={`text-black p-2 rounded-md ${isFullscreen ? 'text-xl' : ''}`}>Good Squart</p>
                                </div>
                            )}

                            {(rightKneeAngle > 110 || leftKneeAngle > 110) && (
                                <div className={`bg-white rounded-[12px] border-black border-2 p-2 ${isFullscreen ? 'w-44' : 'w-32'} mt-2 flex items-center justify-center`}>
                                    <p className={`text-black p-2 rounded-md ${isFullscreen ? 'text-xl' : ''}`}>Relax</p>
                                </div>
                            )}

                            {(rightKneeAngle < 80 || leftKneeAngle < 80) && (
                                <div className={`bg-red-600 rounded-[12px] border-black border-2 p-2 ${isFullscreen ? 'w-52' : 'w-44'} mt-2 flex items-center justify-center`}>
                                    <p className={`text-white ${isFullscreen ? 'text-xl' : ''}`}>Squart too deep</p>
                                </div>
                            )}
                        </div>



                    </>
                }


            </div>



            {/* Video................... */}

            <div className="flex flex-col gap-y-4 w-full  justify-center">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold">
                    <span className="text-[#02a8c0]">Reference Video</span>
                </div>
                <video controls className="w-full h-auto rounded-[12px]">
                    <source src="/squat.mp4" type="video/mp4" />
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
