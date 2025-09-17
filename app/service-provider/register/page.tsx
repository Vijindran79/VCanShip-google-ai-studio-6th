// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/service-provider/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Provider Registration",
  description: "Join our network of trusted logistics partners.",
};

export default function ServiceProviderRegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">
            Register as a Service Provider
          </CardTitle>
          <CardDescription>
            Join our network of logistics partners. Fill out the form below to
            get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}