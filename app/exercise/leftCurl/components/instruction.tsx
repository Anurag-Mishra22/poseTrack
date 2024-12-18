"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
} from "@/components/ui/dialog"
import { SquareCheck } from "lucide-react"
import { DialogTitle } from "@radix-ui/react-dialog"
import Image from "next/image"

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

const Instructions = () => {
    const [open, setOpen] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isInstructionPlaying, setIsInstructionPlaying] = useState(false)
    const [currentMusic, setCurrentMusic] = useState<string>("")
    const [isAudioLoaded, setIsAudioLoaded] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const recognitionRef = useRef<any>(null)
    const musicRef = useRef<HTMLAudioElement | null>(null)

    const musicFiles: { [key: string]: string } = {
        "music": '/music.mp3',
        "music2": "/music2.mp3",
        "music3": "/music3.mp3"
    }

    const playInstructionAudio = useCallback(async () => {
        if (audioRef.current && !isInstructionPlaying) {
            try {
                setIsInstructionPlaying(true)
                await audioRef.current.play()
            } catch (error) {
                console.error("Error playing instruction audio:", error)
                setIsInstructionPlaying(false)
            }
        }
    }, [isInstructionPlaying])

    const stopInstructionAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            setIsInstructionPlaying(false)
        }
    }

    const playMusic = useCallback(async (musicName: string) => {
        if (!musicFiles[musicName]) {
            console.error("Music file not found:", musicName)
            return
        }

        if (musicRef.current && !isPlaying) {
            try {
                musicRef.current.src = musicFiles[musicName]
                const playPromise = musicRef.current.play()
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log(`${musicName} started playing`)
                            setIsPlaying(true)
                            setCurrentMusic(musicName)
                        })
                        .catch(error => {
                            console.error("Error playing music:", error)
                            setIsPlaying(false)
                        })
                }
            } catch (error) {
                console.error("Error initiating music playback:", error)
                setIsPlaying(false)
            }
        }
    }, [isPlaying, musicFiles, playInstructionAudio])

    const stopMusic = () => {
        console.log("Attempting to stop music...");
        if (musicRef.current) {
            try {
                console.log("Music ref exists, stopping...");
                musicRef.current.pause();
                musicRef.current.currentTime = 0;
                setIsPlaying(false);
                setCurrentMusic("");
                console.log("Music stopped successfully");
            } catch (error) {
                console.error("Error stopping music:", error);
            }
        } else {
            console.log("Music ref is null");
        }
    }

    useEffect(() => {
        // Initialize audio elements
        audioRef.current = new Audio("/bicepInstruction.m4a")
        musicRef.current = new Audio()

        // Handle audio loading
        const handleAudioLoaded = () => {
            setIsAudioLoaded(true)
            setOpen(true)
            playInstructionAudio()
        }

        if (audioRef.current) {
            audioRef.current.addEventListener("loadeddata", handleAudioLoaded)
        }

        // Create event handler functions
        const handleInstructionEnded = () => {
            setIsInstructionPlaying(false)
            setOpen(false)
        }

        const handleMusicEnded = () => {
            setIsPlaying(false)
            setCurrentMusic("")
        }

        // Add event listeners
        if (audioRef.current) {
            audioRef.current.addEventListener("ended", handleInstructionEnded)
        }

        if (musicRef.current) {
            musicRef.current.addEventListener("ended", handleMusicEnded)
        }

        // Setup speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = false

            recognitionRef.current.onresult = (event: any) => {
                const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
                console.log("Recognized command:", command);

                if (command.includes("stop") || command.includes("pause")) {
                    console.log("Stop command detected, isPlaying:", isPlaying);
                    stopMusic();
                } else if (command.includes("hey play")) {
                    const musicName = command.replace("hey play", "").trim();
                    if (musicName && musicFiles[musicName]) {
                        if (isPlaying) {
                            stopMusic();
                        }
                        playMusic(musicName);
                    }
                }
            }

            recognitionRef.current.onend = () => {
                console.log("Speech recognition ended, restarting...")
                recognitionRef.current.start()
            }

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error)
                recognitionRef.current.start()
            }

            recognitionRef.current.start()
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener("loadeddata", handleAudioLoaded)
                audioRef.current.removeEventListener("ended", handleInstructionEnded)
                audioRef.current.pause()
            }
            if (musicRef.current) {
                musicRef.current.removeEventListener("ended", handleMusicEnded)
                musicRef.current.pause()
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            stopInstructionAudio()
            stopMusic()
        }
    }, [])

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            stopInstructionAudio()
        }
    }

    if (!isAudioLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#02a8c0]"></div>
            </div>
        )
    }

    return (
        <Dialog open={open && isAudioLoaded} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogTitle>
                    <div className="text-3xl items-center md:text-3xl lg:text-3xl font-bold">
                        <span className="text-[#02a8c0]">How to Perform the Exercise</span>
                    </div>
                </DialogTitle>
                <DialogHeader>
                    <div className="flex flex-col gap-4 p-2">
                        <div className="flex flex-col gap-4 p-2">
                            <p className="text-lg">
                                Now you will see how to do a perfect bicep curl.
                                {currentMusic && <span> Currently playing: {currentMusic}</span>}
                            </p>

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
    )
}

export default Instructions