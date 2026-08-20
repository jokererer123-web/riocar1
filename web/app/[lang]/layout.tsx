import type { ReactNode } from "react";
import { isLocale, locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const dynamicParams = false;

export default function LangLayout({ children, params }: { children: ReactNode; params: { lang: string } }) {
  const lang = isLocale(params.lang) ? params.lang : "ky";
  return <div lang={lang}>{children}</div>;
}
