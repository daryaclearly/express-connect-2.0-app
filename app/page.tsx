"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      switch (session.user.role) {
        case "HOST_ADMIN":
        case "HOST_TEAM_MEMBER":
          router.replace(`/host/${session.user.hostId}/dashboard`);
          break;
        case "ATTENDEE":
          router.replace("/attendee");
          break;
        case "ADMIN":
          router.replace("/admin/me");
          break;
        default:
          // Handle other roles or default behavior
          router.replace("/auth/unauthorized");
          break;
      }
    } else if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [session, status, router]);

  // Show a loading message while checking authentication status
  if (status === "loading") {
    return <div>Loading...</div>;
  }

  // This should rarely be seen, as the middleware should handle most cases
  return <div>Welcome to Express Connect</div>;
}