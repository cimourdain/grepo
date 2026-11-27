# Licence

## Animonitor source code — ISC License

Copyright (c) 2026, Gabriel Oger

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

## Third-party services and data

The ISC License above covers Animonitor's own source code only. It grants no
right over the data or services of the third parties below, which remain
subject to their own terms. Animonitor is not affiliated with, endorsed by or
sponsored by any of them; their names are used only to identify the services
Animonitor connects to, and may be trademarks of their respective owners.

### AniList

Animonitor uses the [AniList API](https://docs.anilist.co/) under the
[AniList API Terms of Use](https://docs.anilist.co/guide/terms-of-use), as a
**complementary, non-commercial** application:

- it is not an anime or manga list or tracker service competing with AniList:
  it never replaces the user's AniList lists and does not read or write AniList
  user data; it only reads public media metadata (titles, synopsis, cover,
  score, genres, airing dates and status) to describe the series of the user's
  own library, gathered from their streaming/media services, and links back to
  each corresponding AniList entry;
- it does not use the AniList API as a backup or data storage service, nor
  collect AniList data in bulk: only the series of the user's own library are
  requested, and the results are kept on the user's computer only as those
  series' metadata, refreshed on demand or on the user's schedule;
- every AniList request goes through a single rate-limited queue, so the
  application stays within the
  [AniList rate limits](https://docs.anilist.co/guide/rate-limiting);
- it does not use "AniList" or "AniChart" in its name.

AniList data remains the property of AniList and its contributors. Anyone
redistributing, modifying or running Animonitor commercially is responsible for
their own compliance with the AniList API Terms of Use (including their
commercial-usage terms).

### MangaDex

Animonitor uses the [MangaDex API](https://api.mangadex.org/docs/) under
MangaDex's acceptable use policy (in its
[API specification](https://api.mangadex.org/docs/static/api.yaml)), as a
**non-commercial** application:

- it is non-commercial and shows no ad; it credits MangaDex in the manga pages
  and links each chapter to its page on [mangadex.org](https://mangadex.org),
  where the chapters are read and where their scanlation groups are credited;
- it reads manga metadata (titles, synopsis, cover, tags, status, authors),
  chapter lists and read markers of the user's own account; it requests a
  chapter's pages and images only to download chapters for the user's own
  reading on their computer (the user's download, or the automatic download of
  the next chapters of the manga they read), crediting MangaDex and the
  scanlation groups in the reader, and never shares, exports or serves the
  downloaded files;
- every MangaDex request carries Animonitor's User-Agent, and the requests stay
  within MangaDex's rate limits (a 429 response is honoured, never retried in a
  loop);
- it does not use "MangaDex" in its name.

MangaDex data remains the property of MangaDex and of the scanlation groups who
produced the chapters. Anyone redistributing, modifying or running Animonitor
commercially is responsible for their own compliance with MangaDex's terms.

### anime-offline-database (ID mapping)

To link the series of the user's library to their AniList entries without
querying AniList, Animonitor downloads the
[anime-offline-database](https://github.com/manami-project/anime-offline-database)
by manami-project onto the user's computer and uses it locally. That dataset is
made available under the
[Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/),
and its contents under the
[Database Contents License (DbCL) v1.0](https://opendatacommons.org/licenses/dbcl/1-0/).
Animonitor does not redistribute it; any copy or adaptation of it remains
subject to those licences.

### Fribb/anime-lists (ID mapping)

To link series to their AniList entries through their TVDB, TMDB and IMDb ids,
Animonitor downloads the
[anime-lists](https://github.com/Fribb/anime-lists) mapping by Fribb onto the
user's computer and uses it locally. The project states no licence of its own;
its lists are generated from the anime-offline-database and from
[Anime-Lists/anime-lists](https://github.com/Anime-Lists/anime-lists).
Animonitor does not redistribute it.

### Plex and Crunchyroll

Animonitor connects to the user's own Plex and Crunchyroll accounts, at the
user's request, to read their library, watchlist and watch progress. Its use of
these services is subject to their respective terms of service, which the user
accepts with their own account. Crunchyroll offers no public API: Animonitor
calls the website's own API with the session of the user's in-app login, which
may stop working without notice.
