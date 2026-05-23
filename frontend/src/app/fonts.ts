import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "600"],
  variable: "--font-plus-jakarta-sans",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jetbrains-mono",
});
