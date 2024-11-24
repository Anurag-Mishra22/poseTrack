
import React from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CircleUser, MenuIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster } from 'sonner'

import { redirect } from "next/navigation";
import DashBoardNavigation from "./components/dashBoardNavigation";
import { currentUser } from "@clerk/nextjs/server";


export default async function AdminDashBoardLayout({ children }: { children: React.ReactNode }) {
    const user = await currentUser();

    // const { getUser } = getKindeServerSession();
    // const user = await getUser();

    if (!user || user.emailAddresses[0].emailAddress !== process.env.ADMIN_EMAIL) {
        return redirect("/");
    }

    return (
        <div className="flex w-full flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Toaster />
            <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-white">
                <nav className="hidden font-medium md:flex md:items-center md:gap-5 md:text-sm lg:gap-6">
                    <DashBoardNavigation />
                </nav>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button className="shrink-0 md:hidden" variant="outline" size="icon">
                            <MenuIcon className="w-5 h-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left">
                        <nav className="flex flex-col gap-6 text-lg font-medium mt-5">
                            <DashBoardNavigation />
                        </nav>
                    </SheetContent>
                </Sheet>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                            <CircleUser className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                            My Account
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            {/* <LogoutLink>Sign out</LogoutLink> */}
                        </DropdownMenuItem>

                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
            <main className="my-5">
                {children}
            </main>
        </div>
    )
}