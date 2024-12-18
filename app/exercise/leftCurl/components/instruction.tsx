"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

interface InstructionsProps {
    autoOpen?: boolean;
}

const Instructions = ({ autoOpen = true }: InstructionsProps) => {
    const [open, setOpen] = useState(autoOpen);
    const [audioLoaded, setAudioLoaded] = useState(false);
    const [audioError, setAudioError] = useState<string>("");
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio with error handling
    useEffect(() => {
        const audio = new Audio('/bicepInstruction.m4a');

        audio.addEventListener('loadeddata', () => {
            setAudioLoaded(true);
            audio.volume = 1.0; // Ensure volume is up
            console.log('Audio loaded successfully');
        });

        audio.addEventListener('error', (e) => {
            setAudioError("Error loading audio file");
            console.error('Audio loading error:', e);
        });

        audioRef.current = audio;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.remove();
            }
        };
    }, []);

    // Watch dialog state and play/pause audio with better error handling
    useEffect(() => {
        if (open && audioRef.current && audioLoaded) {
            const playAudio = async () => {
                try {
                    await audioRef.current?.play();
                    console.log('Audio playing');
                } catch (error) {
                    if (error instanceof Error) {
                        setAudioError(
                            error.name === 'NotAllowedError'
                                ? "Please enable autoplay in your browser settings"
                                : "Error playing audio"
                        );
                        console.error('Playback error:', error);
                    }
                }
            };
            playAudio();
        } else if (!open && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [open, audioLoaded]);

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogTitle>
                        <div className="text-3xl items-center md:text-3xl lg:text-3xl font-bold">
                            <span className="text-[#02a8c0]">How to Perform the Exercise</span>
                        </div>
                    </DialogTitle>
                    <DialogHeader>
                        <div className="flex flex-col gap-4 p-2">
                            <div className="flex flex-col gap-4 p-2">
                                {audioError && (
                                    <p className="text-red-500">{audioError}</p>
                                )}
                                <div className="relative h-78">
                                    <Image
                                        src="/bicepcurldemo.gif"
                                        alt="exercise"
                                        width={300}
                                        height={200}
                                        className="flex object-cover w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default Instructions