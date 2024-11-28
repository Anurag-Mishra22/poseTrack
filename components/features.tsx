import { SquareCheck } from "lucide-react";

export function Features() {
    const Features = [
        {
            heading: "AI-Powered Exercise Tracking",
            description:
                "Count your repetitions and ensure accurate form with advanced BlazePose technology.",
        },
        {
            heading: "Guided Workouts",
            description:
                "Follow step-by-step instructions tailored to your physiotherapy needs.",
        },
        {
            heading: "Real-Time Feedback",
            description:
                "Receive immediate feedback on posture and alignment for optimal results.",
        },
        {
            heading: "Progress Tracking",
            description:
                "Monitor your exercise counts and improvements over time.",
        },
        {
            heading: "Customizable Plans",
            description:
                "Create personalized exercise routines designed for your recovery and fitness goals.",
        },
        {
            heading: "Smart Exercise Tracking",
            description:
                "Effortlessly track your repetitions, perfect your form, and enhance your recovery journey with AI-driven precision.",
        },

    ];

    return (
        <section
            className="bg-white dark:bg-[#020817] py-6 md:py-10 "
            id="features"
        >
            <div className="flex flex-col items-center m-auto text-center gap-4 max-w-[1024px]">
                <div className="text-5xl font-bold">
                    Platform <span className="text-[#02a8c0]">Features</span>
                </div>
                <div className="text-sm text-gray-500 w-full md:w-2/3">
                    Unlock the Full Potential of  Programming with These Key
                    Features
                </div>
                <div className="grid gap-2 grid-cols-1 md:grid-cols-2 p-2 ">
                    {Features.map((lang: any, index: number) => (
                        <div
                            className={`border-[1px] rounded-md p-2 text-start gap-2 flex flex-col  ${index % 2 === 0 ? "mr-0" : "ml-0"
                                }`}
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
        </section>
    );
}
