import Link from "next/link";
export function Hero() {
    return (
        <section className="bg-white dark:bg-[#020817] m-4 md:m-0 py-4 md:py-6">
            <div className="mx-auto px-4 md:px-6 flex flex-col justify-center items-center gap-0">
                <div className="flex flex-col justify-center text-center gap-3 ">
                    <div className="text-6xl font-bold">Your Personalized Physiotherapy</div>
                    <div className="text-6xl text-[#f08b02] font-bold">
                        Assistant
                    </div>
                    <div className="text-sm text-gray-600">
                        Track Your Movements, Perfect Your Form, and Achieve Your Goals{" "}
                    </div>
                    <div className="flex justify-center flex-col md:flex-row gap-4 mt-4">
                        <Link
                            href={"/exercise"}
                            className=" text-white font-semibold border-gray-600 px-4 py-2 rounded-[12px]  bg-[#f08b02]"
                        >
                            Get Started{" "}
                        </Link>
                        <Link
                            href={"/#features"}
                            className="border-[1px] border-gray-600 px-4 py-2 rounded-sm"
                        >
                            Explore Features
                        </Link>
                    </div>
                </div>
                <div className="mt-6">
                    {/* Light Mode Image */}
                    <img
                        className="block dark:hidden "
                        src="/TF_image_4.jpeg"
                        alt="Light mode hero image"
                    />
                    {/* Dark Mode Image */}
                    <img
                        className="hidden dark:block "
                        src="/HeroSectionDarkImage.svg"
                        alt="Dark mode hero image"
                    />
                </div>
            </div>
        </section>
    );
}