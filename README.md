# TorrentLab

Search and downaload movies with torrent

## TODO

- [x] Refactor to TypeScript and Tailwind
- [x] Refactor to use app routes from Next13
- [x] Remove TYS API and add Jackett trackers
- [ ] Create configuration, with a page to tweek it and a local storage for permanence
- [ ] Create categories for tvshows and animes

# How to use

**Dependencies**

- (Jackett)[https://github.com/Jackett/Jackett]

Get a local instance of Jackett, it is used to fetch torrent magnet links. You must create a OMBdAPI key and paste it in the configuration of Jackett.

```bash
git clone git@repository
cd ./TorrentLab
yarn
yarn dev
```

This should get you service running on your localhost.

