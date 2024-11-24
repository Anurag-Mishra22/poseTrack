"use client"
import { cn } from "@/lib/utils";
import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
    {
        name: 'Dashboard',
        href: '/admin',
    },
    {
        name: 'Users',
        href: '/admin/dashboard/users',
    },

]

const DashBoardNavigation = () => {
    const pathname = usePathname();
    return (
        <>
            {
                LINKS.map(link => (
                    <Link key={link.href} href={link.href} className={cn(link.href === pathname ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        {link.name}
                    </Link>
                ))
            }
        </>
    )
}

export default DashBoardNavigation