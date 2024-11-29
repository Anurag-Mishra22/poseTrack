
import Landing from "@/components/landing";
import NavBar from "@/components/navBar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { currentUser } from "@clerk/nextjs/server";
import { MenuIcon } from "lucide-react";
import Image from "next/image";

export default async function Home() {
  const user = await currentUser();

  const email = user ? user.emailAddresses[0].emailAddress : '';
  // console.log('Admin Email:', email);
  return (
    <div>
      <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-white">
        <nav className="hidden font-medium md:flex md:items-center md:gap-5 md:text-sm lg:gap-6">
          <NavBar email={email} />
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="shrink-0 md:hidden" variant="outline" size="icon">
              <MenuIcon className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="flex flex-col gap-6 text-lg font-medium mt-5">
              <NavBar email={email} />
            </nav>
          </SheetContent>
        </Sheet>

        <Image
          src={user?.imageUrl || "/default-image.png"}
          alt="Logo"
          width={100}
          height={100}
          className="rounded-full w-10 h-10 cursor-pointer"

        />
      </header>
      <Landing />
    </div>
  );
}
