const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function normalizeYoutubeInput(value) {
  const raw = value.trim();

  if (!raw) {
    return { isValid: false, reason: 'Paste a YouTube link or video ID.' };
  }

  if (YOUTUBE_ID_REGEX.test(raw)) {
    return {
      isValid: true,
      videoId: raw,
      canonicalUrl: `https://www.youtube.com/watch?v=${raw}`,
    };
  }

  try {
    const url = new URL(raw);
    const host = url.hostname.replace('www.', '');

    if (host === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      if (YOUTUBE_ID_REGEX.test(videoId)) {
        return {
          isValid: true,
          videoId,
          canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const watchId = url.searchParams.get('v');
      if (YOUTUBE_ID_REGEX.test(watchId ?? '')) {
        return {
          isValid: true,
          videoId: watchId,
          canonicalUrl: `https://www.youtube.com/watch?v=${watchId}`,
        };
      }

      const segments = url.pathname.split('/').filter(Boolean);
      const candidate = segments[1] ?? segments[0];
      if (
        ['shorts', 'embed', 'live'].includes(segments[0]) &&
        YOUTUBE_ID_REGEX.test(candidate ?? '')
      ) {
        return {
          isValid: true,
          videoId: candidate,
          canonicalUrl: `https://www.youtube.com/watch?v=${candidate}`,
        };
      }
    }
  } catch {
    return { isValid: false, reason: 'That does not look like a valid YouTube URL or ID.' };
  }

  return { isValid: false, reason: 'Unsupported YouTube link. Try a full URL, share URL, Shorts URL, or video ID.' };
}

export function formatDate(isoString) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}
