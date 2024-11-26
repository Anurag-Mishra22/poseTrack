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
            img: "/bicepcurl.png"
        },
        {
            heading: "Squats",
            description:
                "Follow step-by-step instructions tailored to your physiotherapy needs.",
            href: "/exercise/squart",
            img: "/Squat-lady-at-home.png"
        },
        {
            heading: "Seated Knee Flexion & Extension",
            description:
                "Follow step-by-step instructions tailored to your physiotherapy needs.",
            href: "/exercise/squart",
            img: "/seatedKnee.png"
        },
        {
            heading: "Standing Quad Stretch",
            description:
                "Follow step-by-step instructions tailored to your physiotherapy needs.",
            href: "/exercise/squart",
            img: "/standingQuadStretch.png"
        },
        {
            heading: "Tree Pose",
            description:
                "Follow step-by-step instructions tailored to your physiotherapy needs.",
            href: "/exercise/squart",
            img: "/treePose.png"
        },
        {
            heading: "Traingle Pose",
            description:
                "Follow step-by-step instructions tailored to your physiotherapy needs.",
            href: "/exercise/squart",
            img: "/trainglePose.png"
        },


    ];
    return (
        <div className='mx-auto px-4 md:px-6 flex flex-col justify-center items-center gap-0 mt-6'>
            <div className="flex flex-col items-center m-auto text-center gap-4 max-w-[1024px]">
                <div className="text-5xl font-bold">
                    <span className="text-[#f08b02]">Exercise</span>
                </div>
                <div className="text-sm text-gray-500 w-full md:w-2/3">
                    Unlock the Full Potential of  Programming with These Key
                    Features
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 p-2 mb-4">
                    {Features.map((lang: Exercise, index: number) => (
                        <Link
                            href={lang.href}
                            key={index}
                        >
                            <div
                                className={`border-[1px] rounded-md p-2 text-start gap-2 flex flex-col  ${index % 2 === 0 ? "mr-0" : "ml-0"
                                    }`}

                            >
                                <div className="flex gap-2 items-center">
                                    <div>
                                        <SquareCheck className="w-5 h-5 text-[#f08b02]" />
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
                                <div className="text-gray-500">{lang.description}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ExercisePage