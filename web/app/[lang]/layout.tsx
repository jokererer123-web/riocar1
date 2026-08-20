import type { ReactNode } from "react";
import { isLocale } from "@/lib/i18n";

export default function LangLayout({ children, params }: { children: ReactNode; params: { lang: string } }) {
  const lang = isLocale(params.lang) ? params.lang : "ky";
  return <div lang={lang}>{children}</div>;
}
