import { Linking } from 'react-native';

const HOST_SWAP_SCHEMES: Record<string, string> = {
  prime: 'primevideo',
  hbo: 'hbomax',
  paramount: 'paramountplus',
  hulu: 'hulu',
  peacock: 'peacocktv',
  starz: 'starz',
  mubi: 'mubi',
  youtube: 'vnd.youtube',
};

const CUSTOM_APP_LINKS: Record<string, (webLink: string) => string | null> = {
  crunchyroll: (webLink) => {
    const match = webLink.match(/crunchyroll\.com\/series\/([A-Z0-9]+)/);
    return match ? `crunchyroll://series/${match[1]}` : null;
  },
};

export function toAppLink(serviceId: string, webLink: string) {
  const custom = CUSTOM_APP_LINKS[serviceId];
  if (custom) return custom(webLink);

  const scheme = HOST_SWAP_SCHEMES[serviceId];
  if (!scheme || !/^https?:\/\//.test(webLink)) return null;
  return webLink.replace(/^https?:\/\//, `${scheme}://`);
}

export async function openStreamingLink(serviceId: string, webLink: string) {
  const appLink = toAppLink(serviceId, webLink);
  if (appLink) {
    try {
      await Linking.openURL(appLink);
      return;
    } catch {}
  }
  await Linking.openURL(webLink);
}
