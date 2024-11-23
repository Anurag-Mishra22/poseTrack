import React from 'react'
import { Hero } from './hero'
import { Features } from './features'

const Landing = () => {
    return (
        <div className="flex flex-col min-h-screen">
            <main className={` flex-1 m-2 md:m-0`} >
                <Hero />
                {/* <LanguageSectionLanding/> */}
                <Features />
                {/* <HowItWork/>
         <CTA/> */}
            </main>
        </div>
    )
}

export default Landing