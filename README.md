<div align="center">
<img src="assets/images/v1.png" alt="AniWatch Order" width="120" height="120">

# AniWatch Order

**A free, ad-free anime watch order guide**

</div>

## Contributing

Want to help add a new series? A tutorial will be added soon and Wiki.

## About

AniWatch Order helps anime fans find the correct watch order for complex franchises — covering seasons, OVAs, OADs, movies, specials, and spin-offs. We provide curated **recommended**, **chronological**, and **release** orders.

- 🎯 Completely **ad-free**
- 🌙 Dark & light theme
- 📱 Responsive (mobile & desktop)
- ✅ Cookie-based progress tracking per series
- 🔍 Search across all series
- 📦 No frameworks — vanilla JS, HTML, CSS
- 📊 Google Analytics is used to check which anime is popular and how users find this page. Data is collected anonymously only for counting purpose.

### Data Structure

Each anime lives in `data/<guid>/` with two files:

- **`info.json`** — Series metadata (title, studio, genre, description, etc.)
- **`order.json`** — Watch order entries for recommended, chronological, and release tabs

Register new entries in `data/index.json`.

## Deployment

The site is deployed to GitHub Pages automatically on push to `main` via the workflow in `.github/workflows/`.

## Note

The original images under assets/images were created and under CC BY 4.0.
If all images have been replaced with custom ones, no attribution is required for the images.

As for all images that are not in assets/images were created by their original artist or studio, and are used under fair use for the purpose of review and commentary. 
No copyright infringement is intended. If you are the original creator of any of the images used on this site and have concerns about their use, please contact us to discuss further.
This site is not for commercial use and does not generate revenue, and all images are used solely for the purpose of providing information and entertainment to the communities.

## Credits

Originally forked from [Shinei Nouzen's AniList](https://github.com/Shineii86/AniList).

