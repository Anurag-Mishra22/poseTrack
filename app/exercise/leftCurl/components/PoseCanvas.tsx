// PoseCanvas.tsx
import React, { useEffect, useRef } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useLeftCurl } from "@/store/useLeftCurl";

interface PoseCanvasProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    detector: any;
    videoReady: boolean;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
    wait: number;
    setWait: React.Dispatch<React.SetStateAction<number>>;
    setLeftAngle: React.Dispatch<React.SetStateAction<number>>;
    setCurlCount: React.Dispatch<React.SetStateAction<number>>;
}

const PoseCanvas: React.FC<PoseCanvasProps> = React.memo((props) => {
    const {
        videoRef,
        canvasRef,
        detector,
        videoReady,
        isFullscreen,
        toggleFullscreen,
        wait,
        setWait,
        setLeftAngle,
        setCurlCount,
    } = props;

    const rafId = useRef<number>();
    const lastFrameTime = useRef<number>(0);
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const glowOpacityRef = useRef(0.3);
    const glowAnimationRef = useRef<number>();


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




    useEffect(() => {
        // Setup glow animation
        const glowAnimationId = window.setInterval(() => {
            glowOpacityRef.current = 0.3 + Math.abs(Math.sin(Date.now() / 1000)) * 0.4;
        }, 16); // ~60fps

        return () => {
            clearInterval(glowAnimationId);
        };
    }, []);

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
                scoreThreshold: 0.7,
            });

            if (poses.length > 0) {
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) {
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    drawKeypointsAndLines(poses[0].keypoints, ctx); // Include your drawing function
                    detectCurl(poses[0].keypoints); // Include your curl detection logic
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
    }, [detector, videoReady]); // Only depends on detector and videoReady

    return (
        <div
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
                {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
            </button>

            {/* Add any additional overlays if needed */}
        </div>
    );
});

export default PoseCanvas;