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
    const [micPermissionGranted, setMicPermissionGranted] = useState(false)
    const [permissionError, setPermissionError] = useState("")
    const [hasSeenInstructions, setHasSeenInstructions] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const recognitionRef = useRef<any>(null)
    const musicRef = useRef<HTMLAudioElement | null>(null)

    const musicFiles: { [key: string]: string } = {
        'music': '/music.mp3',
        'music2': '/music2.mp3',
        'music3': '/music3.mp3'
    }

    const requestMicrophonePermission = useCallback(async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true })
            setMicPermissionGranted(true)
            setPermissionError("")
            return true
        } catch (error) {
            setMicPermissionGranted(false)
            setPermissionError("Microphone access denied. Please enable it in your browser settings.")
            return false
        }
    }, [])

    const stopMusic = useCallback(() => {
        if (musicRef.current) {
            try {
                musicRef.current.pause()
                musicRef.current.currentTime = 0
                setIsPlaying(false)
                setCurrentMusic("")
            } catch (error) {
                console.error('Error stopping music:', error)
            }
        }
    }, [])

    const playMusic = useCallback(async (musicName: string) => {
        if (!musicFiles[musicName]) {
            console.error('Music file not found:', musicName)
            return
        }

        if (musicRef.current && !isPlaying) {
            try {
                musicRef.current.src = musicFiles[musicName]
                const playPromise = musicRef.current.play()
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            setIsPlaying(true)
                            setCurrentMusic(musicName)
                        })
                        .catch(error => {
                            console.error('Error playing music:', error)
                            setIsPlaying(false)
                        })
                }
            } catch (error) {
                console.error('Error initiating music playback:', error)
                setIsPlaying(false)
            }
        }
    }, [isPlaying, musicFiles])

    const initializeSpeechRecognition = useCallback(async () => {
        const hasPermission = await requestMicrophonePermission()
        if (!hasPermission) return

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition && micPermissionGranted) {
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = false

            recognitionRef.current.onresult = (event: any) => {
                const command = event.results[event.results.length - 1][0].transcript.toLowerCase()
                if (command.includes('stop') || command.includes('pause')) {
                    stopMusic()
                } else if (command.includes('hey play')) {
                    const musicName = command.replace('hey play', '').trim()
                    if (musicName && musicFiles[musicName]) {
                        if (isPlaying) {
                            stopMusic()
                        }
                        playMusic(musicName)
                    }
                }
            }

            recognitionRef.current.onend = () => {
                if (micPermissionGranted) {
                    recognitionRef.current?.start()
                }
            }

            recognitionRef.current.onerror = (event: any) => {
                if (event.error === 'not-allowed') {
                    setMicPermissionGranted(false)
                    setPermissionError("Microphone access denied. Please enable it in your browser settings.")
                } else if (micPermissionGranted) {
                    recognitionRef.current?.start()
                }
            }

            try {
                recognitionRef.current.start()
            } catch (error) {
                console.error('Failed to start speech recognition:', error)
            }
        }
    }, [micPermissionGranted, musicFiles, playMusic, requestMicrophonePermission, stopMusic])

    const playInstructionAudio = useCallback(async () => {
        if (audioRef.current && !isInstructionPlaying) {
            try {
                setIsInstructionPlaying(true)
                await audioRef.current.play()
            } catch (error) {
                console.error('Error playing instruction audio:', error)
                setIsInstructionPlaying(false)
            }
        }
    }, [isInstructionPlaying])

    const stopInstructionAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            setIsInstructionPlaying(false)
        }
    }, [])

    useEffect(() => {
        const hasVisited = localStorage.getItem('hasSeenInstructions')
        setHasSeenInstructions(!!hasVisited)

        audioRef.current = new Audio('/bicepInstruction.m4a')
        musicRef.current = new Audio()

        const handleAudioLoaded = () => {
            setIsAudioLoaded(true)
            if (!hasVisited) {
                setOpen(true)
                playInstructionAudio()
            }
        }

        const handleInstructionEnded = () => {
            setIsInstructionPlaying(false)
            setOpen(false)
            localStorage.setItem('hasSeenInstructions', 'true')
            setHasSeenInstructions(true)
        }

        const handleMusicEnded = () => {
            setIsPlaying(false)
            setCurrentMusic("")
        }

        if (audioRef.current) {
            audioRef.current.addEventListener('loadeddata', handleAudioLoaded)
            audioRef.current.addEventListener('ended', handleInstructionEnded)
        }

        if (musicRef.current) {
            musicRef.current.addEventListener('ended', handleMusicEnded)
        }

        initializeSpeechRecognition()

        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('loadeddata', handleAudioLoaded)
                audioRef.current.removeEventListener('ended', handleInstructionEnded)
                audioRef.current.pause()
            }
            if (musicRef.current) {
                musicRef.current.removeEventListener('ended', handleMusicEnded)
                musicRef.current.pause()
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            stopInstructionAudio()
            stopMusic()
        }
    }, [initializeSpeechRecognition, playInstructionAudio, stopInstructionAudio, stopMusic])

    const handleOpenChange = useCallback((newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            stopInstructionAudio()
        }
    }, [stopInstructionAudio])

    if (!isAudioLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#02a8c0]"></div>
            </div>
        )
    }

    return (
        <Dialog open={!hasSeenInstructions && open && isAudioLoaded} onOpenChange={handleOpenChange}>
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
                                Now you&apos;ll see how to do a perfect bicep curl.
                                {currentMusic && <span> Currently playing: {currentMusic}</span>}
                            </p>
                            {permissionError && (
                                <p className="text-red-500">{permissionError}</p>
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
    )
}

export default Instructions