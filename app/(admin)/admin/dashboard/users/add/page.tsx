"use client"
import {
    useState
} from "react"
import {
    toast
} from "sonner"
import {
    useForm
} from "react-hook-form"
import {
    zodResolver
} from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    cn
} from "@/lib/utils"
import {
    Button
} from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Input
} from "@/components/ui/input"

import axios from 'axios';

const formSchema = z.object({
    email: z.string()
});

export default function MyForm() {

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),

    })
    async function createUser(values: z.infer<typeof formSchema>) {
        try {
            const response = await axios.post('/api/create-user', values);
            return response.data;
        } catch (error) {
            throw new Error('Error creating user');
        }
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            // console.log(values);
            createUser(values)
                .then(() => {
                    toast(
                        <p className="text-sm">User Added</p>
                    );
                })
                .catch((error) => {
                    console.error("Form submission error", error);
                    toast.error("Failed to submit the form. Please try again.");
                });
        } catch (error) {
            console.error("Form submission error", error);
            toast.error("Failed to submit the form. Please try again.");
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto py-10">

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="abc@gmail.com"

                                    type=""
                                    {...field} />
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">Add</Button>
            </form>
        </Form>
    )
}