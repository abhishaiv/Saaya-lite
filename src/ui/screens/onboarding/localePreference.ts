import type { OnboardingRepository } from "../../../data/repository/onboardingRepository";
import type { SaayaLocale } from "../../copy/strings";

/** Persists presentation preference only; it does not touch a live session. */
export async function resolveAppLocale(
  repository: OnboardingRepository,
  urlLocale: SaayaLocale,
): Promise<SaayaLocale> {
  return (await repository.loadLanguage()) ?? urlLocale;
}

export async function saveAppLocale(
  repository: OnboardingRepository,
  locale: SaayaLocale,
): Promise<void> {
  await repository.saveLanguage(locale);
}
