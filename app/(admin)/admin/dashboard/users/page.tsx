"use client"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { MoreHorizontal, PlusCircle, User } from "lucide-react";

import Link from "next/link";
import { toast } from 'sonner';





async function deleteUser(userId: string) {
    try {
        const response = await fetch('http://localhost:3000/api/user', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
        });
        if (response.ok) {
            toast.success('User deleted successfully');
            // Optionally, you can refresh the user list or update the state here
        } else {
            toast.error('Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Error deleting user');
    }
}

export default function UsersPage() {

    const { data, refetch } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            try {
                const response = await fetch('/api/user');
                if (!response.ok) {
                    const errorMessage = `Error fetching data: ${response.statusText}`;
                    console.error(errorMessage);
                    throw new Error(errorMessage);
                }
                const data = await response.json();
                if (!data?.users?.data) {
                    throw new Error('Invalid response structure');
                }
                console.log(data?.users?.data);
                return data?.users?.data;
            } catch (error: any) {
                console.error('Error fetching data:', error.message);
                return [];
            }
        }
    })

    // const data = await getData();
    // console.log(data);
    return (
        <>
            <div className="flex items-center justify-end">
                <Button asChild className="flex items-center justify-end gap-x-2">
                    <Link href="/admin/dashboard/users/add">
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add User</span>
                    </Link>
                </Button>
            </div>

            <Card className="mt-5">
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                        Manage your users here
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>

                                <TableHead >Email</TableHead>


                                <TableHead >Date</TableHead>
                                <TableHead className="text-right" >Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {
                                data?.map((item: any) => (
                                    <TableRow key={item.id}>



                                        <TableCell>{item?.emailAddresses[0]?.emailAddress
                                        }</TableCell>
                                        <TableCell>{
                                            new Date(item.createdAt).toLocaleDateString()
                                        }</TableCell>
                                        <TableCell className="text-end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />

                                                    <DropdownMenuItem
                                                        onClick={() => deleteUser(item.id)}
                                                    >Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    )
}