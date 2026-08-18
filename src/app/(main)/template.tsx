"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TemplateProps {
  children: React.ReactNode;
}

export default function Template({ children }: TemplateProps) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const userEmail = sessionStorage.getItem("userEmail");
    const adminEmail = sessionStorage.getItem("Admin");
    const superAdminEmail = sessionStorage.getItem("SuperAdmin");

    if (!userEmail && !adminEmail && !superAdminEmail) {
      router.replace("/login");
      return;
    }

    setCheckingAuth(false);
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#120000] text-white">
        <p className="px-4 text-center text-base font-bold sm:text-lg">
          Checking login...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
