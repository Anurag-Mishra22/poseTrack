import React from 'react'
import { Hero } from './hero'
import { Features } from './features'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SheetContent, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { MenuIcon } from 'lucide-react';
import DashBoardNavigation from '@/app/(admin)/admin/components/dashBoardNavigation';

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