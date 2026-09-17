import type { Metadata } from "next";
import Home from "@/components/marketing/Home";

export const metadata: Metadata = {
  title: { absolute: "Chat IR — AI agents for investor relations" },
  description:
    "Help investors explore your public company information with AI voice and chat agents built for investor relations teams.",
  alternates: { canonical: "/" },
};

export default Home;
