import {JetBrains_Mono, Space_Grotesk} from "next/font/google";

export const aohDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--aoh-font-display"
});

export const aohMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--aoh-font-mono"
});
