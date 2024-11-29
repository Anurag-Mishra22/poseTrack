import { SquareCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react'

type Exercise = {
    heading: string;
    description: string;
    href: string;
    img: string;
};

const ExercisePage = () => {
    const Features = [
        {
            heading: "Left Bicep Curl",
            description:
                "Follow step-by-step instructions tailored to your physiotherapy needs.",

            href: "/exercise/leftCurl",
            img: "/bicepcurl.gif"
        },
        {
            heading: "Squats",
            description:
                "Follow step-by-step instructions tailored to your physiotherapy needs.",
            href: "/exercise/squart",
            img: "/squatgif.gif"
        },
        {
            heading: "Virtual Keyboard",
            description:
                "Follow step-by-step instructions tailored to your physiotherapy needs.",
            href: "/virtualkeyboard",
            img: "/virtualkeyboard.gif"
        },
        // {
        //     heading: "Standing Quad Stretch",
        //     description:
        //         "Follow step-by-step instructions tailored to your physiotherapy needs.",
        //     href: "/exercise/squart",
        //     img: "/standingQuadStretch.png"
        // },
        // {
        //     heading: "Tree Pose",
        //     description:
        //         "Follow step-by-step instructions tailored to your physiotherapy needs.",
        //     href: "/exercise/squart",
        //     img: "/treePose.png"
        // },
        // {
        //     heading: "Traingle Pose",
        //     description:
        //         "Follow step-by-step instructions tailored to your physiotherapy needs.",
        //     href: "/exercise/squart",
        //     img: "/trainglePose.png"
        // },


    ];
    return (
        <div className='mx-auto px-4 md:px-6 flex flex-col justify-center items-center gap-0 mt-6'>
            <div className="flex flex-col items-center m-auto text-center gap-4 max-w-[1024px]">
                <div className="text-5xl font-bold">
                    <span className="text-[#02a8c0]">EXERCISE LIBRARY</span>
                </div>
                <div className="text-sm text-gray-500 w-full md:w-2/3">
                    Unlock the Full Potential of Workout with These Key Features
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 p-2 mb-4">
                    {Features.map((lang: Exercise, index: number) => (
                        <Link
                            href={lang.href}
                            key={index}
                        >
                            <div
                                className={`border-[1px] rounded-md p-2 text-start gap-2 flex flex-col shadow-sm ${index % 2 === 0 ? "mr-0" : "ml-0"
                                    }`}

                            >
                                <div className="flex gap-2 items-center">
                                    <div>
                                        <SquareCheck className="w-5 h-5 text-[#02a8c0]" />
                                    </div>
                                    <div className="font-bold">{lang.heading}</div>
                                </div>
                                <div className='relative h-78'>
                                    <Image
                                        src={lang.img}
                                        alt='exercise'
                                        width={300}
                                        height={200}
                                        className='flex object-cover w-full  '
                                    />
                                </div>
                                {/* <div className="text-gray-500">{lang.description}</div> */}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ExercisePage