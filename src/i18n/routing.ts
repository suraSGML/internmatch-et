import { defineRouting } from 'next-intl/routing';

/**
 * Defines supported locales and routing config for next-intl.
 * Adding Afaan Oromo ('om') or Tigrinya ('ti') later just requires
 * adding to this array and creating the messages file.
 */
export const routing = defineRouting({
  locales: ['en', 'am'],
  defaultLocale: 'en',
});
