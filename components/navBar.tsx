
"use client"
import { cn } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
    {
        name: 'Dashboard',
        href: '/admin',
    },

]

const NavBar = (email: {
    email: string
}) => {
    const pathname = usePathname();

    // console.log('Admin Email:', process.env.ADMIN_EMAIL);
    return (
        <>
            {
                email.email === "anurag2025mishra@gmail.com" || email.email === "arrymed2@gmail.com" &&

                LINKS.map(link => (
                    <Link key={link.href} href={link.href} className={cn(link.href === pathname ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        {link.name}
                    </Link>
                ))
            }
        </>
    )
}

export default NavBar