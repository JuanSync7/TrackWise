
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { Briefcase, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/auth-context";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const signupFormSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().optional(), // Made optional for mock signup
  password: z.string().optional(), // Made optional for mock signup
  confirmPassword: z.string().optional(), // Made optional
}).refine((data) => data.password === data.confirmPassword || (!data.password && !data.confirmPassword), { // Adjusted refine for optional fields
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const { signupWithEmail, loading, user } = useAuth();
  const router = useRouter();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      displayName: "Mock User",
      email: "mock@example.com",
      password: "password",
      confirmPassword: "password",
    },
  });

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const onSubmit = async (data: SignupFormValues) => {
    await signupWithEmail({
        displayName: data.displayName || "Mock User",
        email: data.email || "mockuser@example.com",
        password: data.password || "mockpassword"
    });
  };
  
  if (user && !loading) { // Check loading state as well
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Redirecting...</p>
      </div>
    );
  }


  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Briefcase className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">{APP_NAME}</h1>
        </div>
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>Enter any details or just click (mock mode)</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name (Optional for Mock)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional for Mock)</FormLabel>
                  <FormControl>
                    <Input placeholder="m@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (Optional for Mock)</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password (Optional for Mock)</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>
          </CardContent>
        </form>
      </Form>
       <CardFooter className="flex flex-col space-y-2 text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
