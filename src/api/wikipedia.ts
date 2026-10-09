export type WikipediaIntro = { text: string; url: string };

export async function getWikipediaIntro(language: 'fr' | 'en', title: string): Promise<WikipediaIntro | null> {
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  url.searchParams.set('action', 'query');
  url.searchParams.set('prop', 'extracts');
  url.searchParams.set('exintro', '1');
  url.searchParams.set('explaintext', '1');
  url.searchParams.set('redirects', '1');
  url.searchParams.set('titles', title);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur Wikipedia (${response.status}) sur ${title}`);
  }
  const json = (await response.json()) as {
    query?: { pages?: Record<string, { extract?: string; title?: string }> };
  };
  const page = Object.values(json.query?.pages ?? {})[0];
  const text = page?.extract?.trim();
  if (!text) return null;
  return {
    text,
    url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent((page.title ?? title).replace(/ /g, '_'))}`,
  };
}
