import { STREAMING_AVAILABILITY_API_KEY } from '../constants/env';

const HOST = 'streaming-availability.p.rapidapi.com';

export type StreamingOption = {
  service: { id: string; name: string };
  type: string;
  link: string;
  audios?: { language: string }[];
  subtitles?: { locale: { language: string } }[];
};

export type StreamingShow = {
  title: string;
  streamingOptions: Record<string, StreamingOption[]>;
};

export async function getShowByTmdbId(kind: 'movie' | 'tv', tmdbId: number, country = 'fr'): Promise<StreamingShow> {
  const url = new URL(`https://${HOST}/shows/${kind}/${tmdbId}`);
  url.searchParams.set('country', country);

  const response = await fetch(url.toString(), {
    headers: { 'X-RapidAPI-Key': STREAMING_AVAILABILITY_API_KEY, 'X-RapidAPI-Host': HOST },
  });
  if (!response.ok) {
    throw new Error(`Erreur Streaming Availability (${response.status}) sur ${kind}/${tmdbId}`);
  }
  return (await response.json()) as StreamingShow;
}
