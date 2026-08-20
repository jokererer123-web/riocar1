import { dict, type Locale } from "../../web/lib/i18n";
export type { Locale };
export { dict };
export function t(lang: Locale) {
  return dict[lang];
}
